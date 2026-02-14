"""Strategy optimizer - agentic function that updates strategy_json in database based on all learnings."""
import json
from typing import Dict, Any

from openai import AzureOpenAI
from supabase import Client


async def optimize_strategy_from_learnings(
    supabase: Client, openai_client: AzureOpenAI, model_name: str = "gpt-4o"
) -> Dict[str, Any]:
    """
    Agentic function that analyzes all learnings and creates an improved strategy.
    This actually updates the agent_versions table with a new version.
    """
    # Get current active version
    current_version = (
        supabase.table("agent_versions")
        .select("*")
        .eq("is_active", True)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    if not current_version.data:
        raise ValueError("No active agent version found")

    current = current_version.data[0]
    current_strategy = current.get("strategy_json", {})
    current_version_num = current.get("version", "v1.0")

    # Get all learnings
    from .analyzer import get_learnings, detect_trends, get_historical_context

    learnings = get_learnings(supabase, limit=20)
    trends = detect_trends(supabase)
    history = get_historical_context(supabase, limit=30)

    # Get high-confidence patterns
    patterns = (
        supabase.table("learning_patterns")
        .select("*")
        .eq("is_active", True)
        .gte("confidence_score", 0.4)
        .order("confidence_score", desc=True)
        .order("success_rate", desc=True)
        .limit(15)
        .execute()
    )

    # Get recent call performance
    recent_calls = (
        supabase.table("calls")
        .select("outcome, transcript")
        .eq("agent_version", current_version_num)
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )

    # Build comprehensive optimization prompt
    success_patterns = [p for p in (patterns.data or []) if p.get("pattern_type") == "success_pattern"]
    failure_patterns = [p for p in (patterns.data or []) if p.get("pattern_type") == "failure_pattern"]

    optimization_prompt = f"""You are optimizing a real estate sales agent's strategy based on comprehensive data analysis.

CURRENT STRATEGY (Version {current_version_num}):
{json.dumps(current_strategy, indent=2)}

CURRENT PERFORMANCE:
- Conversion Rate: {current.get('conversion_rate', 0):.1%}
- Total Calls: {current.get('total_calls', 0)}
- Total Bookings: {current.get('total_bookings', 0)}
- Trend: {trends.get('trend', 'unknown')}

LEARNINGS FROM {len(learnings.get('what_worked', []))} SUCCESSFUL CALLS:
{chr(10).join(f"- {item}" for item in learnings.get('what_worked', [])[:15])}

FAILURES FROM {len(learnings.get('what_failed', []))} FAILED CALLS:
{chr(10).join(f"- {item}" for item in learnings.get('what_failed', [])[:15])}

HIGH-CONFIDENCE SUCCESS PATTERNS ({len(success_patterns)}):
{chr(10).join(f"- {p.get('pattern_description')} (confidence: {p.get('confidence_score', 0):.2f}, success rate: {p.get('success_rate', 0):.1%})" for p in success_patterns[:10])}

HIGH-CONFIDENCE FAILURE PATTERNS ({len(failure_patterns)}):
{chr(10).join(f"- {p.get('pattern_description')} (confidence: {p.get('confidence_score', 0):.2f})" for p in failure_patterns[:10])}

RECENT CALL OUTCOMES:
- Successful: {sum(1 for c in (recent_calls.data or []) if c.get('outcome') == 'booked')}
- Failed: {sum(1 for c in (recent_calls.data or []) if c.get('outcome') == 'not_booked')}

Analyze this data and create an IMPROVED strategy. Make specific, actionable changes to:
1. Opening (greeting, intro)
2. Qualification questions
3. Objection handling (price, timing, not_interested)
4. Call-to-action (main_cta, alternative_cta)
5. Tone guidelines

Return JSON with the complete new strategy:
{{
  "version": "vX.Y (increment from {current_version_num})",
  "description": "brief description of improvements",
  "changes_made": [
    "specific change 1",
    "specific change 2",
    ...
  ],
  "reasoning": "why these changes will improve conversion",
  "opening": {{
    "greeting": "improved greeting",
    "intro": "improved intro"
  }},
  "qualification": {{
    "questions": ["question 1", "question 2", "question 3"]
  }},
  "objection_handling": {{
    "price": "improved price objection response",
    "timing": "improved timing objection response",
    "not_interested": "improved not interested response"
  }},
  "call_to_action": {{
    "main_cta": "improved main CTA",
    "alternative_cta": "improved alternative CTA"
  }},
  "tone": {{
    "style": "improved style description",
    "pace": "improved pace description",
    "empathy": "improved empathy description"
  }}
}}

Make changes based on what actually worked in successful calls and what failed in unsuccessful calls.
Be specific and actionable. Keep what works, improve what doesn't."""

    response = openai_client.chat.completions.create(
        model=model_name,
        messages=[
            {
                "role": "system",
                "content": "You optimize sales strategies based on real data. Return complete JSON only.",
            },
            {"role": "user", "content": optimization_prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.8,
        max_tokens=4000,
    )

    content = response.choices[0].message.content or "{}"
    improved_strategy = json.loads(content)

    # Extract the strategy_json (everything except version, description, changes_made, reasoning)
    strategy_json = {
        "version": improved_strategy.get("version", increment_version(current_version_num)),
        "description": improved_strategy.get("description", "Improved based on learnings"),
        "opening": improved_strategy.get("opening", {}),
        "qualification": improved_strategy.get("qualification", {}),
        "objection_handling": improved_strategy.get("objection_handling", {}),
        "call_to_action": improved_strategy.get("call_to_action", {}),
        "tone": improved_strategy.get("tone", {}),
    }

    new_version = improved_strategy.get("version", increment_version(current_version_num))

    # Deactivate current version
    supabase.table("agent_versions").update({"is_active": False}).eq("version", current_version_num).execute()

    # Create new version
    insert_result = (
        supabase.table("agent_versions")
        .insert(
            {
                "version": new_version,
                "strategy_json": strategy_json,
                "is_active": True,
                "total_calls": 0,
                "total_bookings": 0,
                "conversion_rate": 0.0,
            }
        )
        .execute()
    )

    if not insert_result.data:
        raise ValueError("Failed to create new version")

    # Store prompt snapshot
    from .prompt_builder import build_optimized_prompt, store_prompt_snapshot

    new_prompt = build_optimized_prompt(supabase)
    store_prompt_snapshot(supabase, new_version, new_prompt)

    return {
        "success": True,
        "old_version": current_version_num,
        "new_version": new_version,
        "changes_made": improved_strategy.get("changes_made", []),
        "reasoning": improved_strategy.get("reasoning", ""),
        "strategy": strategy_json,
    }


def increment_version(version: str) -> str:
    """Increment version number (e.g., v1.0 -> v1.1, v1.9 -> v2.0)."""
    if not version.startswith("v") or "." not in version:
        return "v1.1"

    try:
        major, minor = version[1:].split(".")
        minor_int = int(minor)
        major_int = int(major)

        if minor_int >= 9:
            # Increment major version
            return f"v{major_int + 1}.0"
        else:
            # Increment minor version
            return f"v{major_int}.{minor_int + 1}"
    except Exception:
        return "v1.1"


def get_strategy_comparison(supabase: Client, version1: str, version2: str) -> Dict[str, Any]:
    """Compare two strategy versions."""
    v1 = (
        supabase.table("agent_versions")
        .select("*")
        .eq("version", version1)
        .limit(1)
        .execute()
    )

    v2 = (
        supabase.table("agent_versions")
        .select("*")
        .eq("version", version2)
        .limit(1)
        .execute()
    )

    if not v1.data or not v2.data:
        raise ValueError("One or both versions not found")

    v1_data = v1.data[0]
    v2_data = v2.data[0]

    return {
        "version1": {
            "version": v1_data.get("version"),
            "conversion_rate": v1_data.get("conversion_rate", 0),
            "total_calls": v1_data.get("total_calls", 0),
            "strategy": v1_data.get("strategy_json", {}),
        },
        "version2": {
            "version": v2_data.get("version"),
            "conversion_rate": v2_data.get("conversion_rate", 0),
            "total_calls": v2_data.get("total_calls", 0),
            "strategy": v2_data.get("strategy_json", {}),
        },
        "improvement": v2_data.get("conversion_rate", 0) - v1_data.get("conversion_rate", 0),
    }
