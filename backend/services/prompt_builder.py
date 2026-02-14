"""Advanced prompt builder - agentic prompt optimization using all historical data."""
import json
from typing import Any, Dict, List, Optional

from supabase import Client


def build_optimized_prompt(supabase: Client, openai_client=None) -> str:
    """
    Build highly optimized prompt using all historical learnings, patterns, and trends.
    This is the agentic, self-improving prompt builder that learns from everything.
    """
    # Get current strategy
    current_version = (
        supabase.table("agent_versions")
        .select("*")
        .eq("is_active", True)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    if not current_version.data:
        return "You are a real estate sales agent. Book property viewing appointments."

    strategy = current_version.data[0].get("strategy_json", {})
    version_info = current_version.data[0]

    # Get comprehensive learnings
    from .analyzer import get_learnings, detect_trends

    learnings = get_learnings(supabase, limit=15)
    trends = detect_trends(supabase)

    # Get high-confidence patterns
    high_confidence_patterns = (
        supabase.table("learning_patterns")
        .select("*")
        .eq("is_active", True)
        .gte("confidence_score", 0.5)
        .order("confidence_score", desc=True)
        .order("success_rate", desc=True)
        .limit(10)
        .execute()
    )

    # Get prompt evolution history
    prompt_history = (
        supabase.table("prompt_evolution")
        .select("*")
        .order("created_at", desc=True)
        .limit(5)
        .execute()
    )

    # Extract strategy components
    opening = strategy.get("opening", {})
    objection_handling = strategy.get("objection_handling", {})
    call_to_action = strategy.get("call_to_action", {})
    tone = strategy.get("tone", {})

    # Build sophisticated prompt with all learnings
    prompt_parts = [
        "OBJECTIVE: Book property viewing appointment",
        "",
        "=== CURRENT PERFORMANCE ===",
        f"Conversion Rate: {version_info.get('conversion_rate', 0):.1%}",
        f"Total Calls: {version_info.get('total_calls', 0)}",
        f"Trend: {trends.get('trend', 'unknown')}",
        "",
    ]

    # Add trend insights
    if trends.get("trend") == "improving":
        prompt_parts.append("✓ Recent calls are performing better - continue current approach")
    elif trends.get("trend") == "declining":
        prompt_parts.append("⚠ Recent calls declining - adjust approach based on learnings below")
    if trends.get("top_objections"):
        prompt_parts.append(f"Most common objections: {', '.join(trends['top_objections'][:3])}")
    prompt_parts.append("")

    # Add opening with learnings
    prompt_parts.extend(
        [
            "=== OPENING ===",
            opening.get("greeting", ""),
            opening.get("intro", ""),
            "",
        ]
    )

    # Add high-confidence success patterns
    success_patterns = [p for p in (high_confidence_patterns.data or []) if p.get("pattern_type") == "success_pattern"]
    if success_patterns:
        prompt_parts.append("=== PROVEN SUCCESS PATTERNS (High Confidence) ===")
        for i, pattern in enumerate(success_patterns[:5], 1):
            confidence = pattern.get("confidence_score", 0)
            success_rate = pattern.get("success_rate", 0)
            prompt_parts.append(
                f"{i}. {pattern.get('pattern_description', '')} "
                f"(confidence: {confidence:.0%}, success rate: {success_rate:.0%})"
            )
        prompt_parts.append("")

    # Add learnings from successful calls
    what_worked = learnings.get("what_worked", [])
    if what_worked:
        prompt_parts.append("=== LEARNED FROM SUCCESSFUL CALLS ===")
        for i, item in enumerate(what_worked[:8], 1):  # Top 8
            if item:
                prompt_parts.append(f"{i}. {item}")
        prompt_parts.append("")

    # Add failure patterns to avoid
    failure_patterns = [p for p in (high_confidence_patterns.data or []) if p.get("pattern_type") == "failure_pattern"]
    if failure_patterns:
        prompt_parts.append("=== PATTERNS TO AVOID (High Confidence) ===")
        for i, pattern in enumerate(failure_patterns[:5], 1):
            confidence = pattern.get("confidence_score", 0)
            prompt_parts.append(f"{i}. DO NOT: {pattern.get('pattern_description', '')} (confidence: {confidence:.0%})")
        prompt_parts.append("")

    # Add what to avoid from failed calls
    what_failed = learnings.get("what_failed", [])
    if what_failed:
        prompt_parts.append("=== AVOID (from failed calls) ===")
        for i, item in enumerate(what_failed[:8], 1):  # Top 8
            if item:
                prompt_parts.append(f"{i}. DO NOT: {item}")
        prompt_parts.append("")

    # Enhanced objection handling with learnings
    prompt_parts.extend(
        [
            "=== OBJECTION HANDLING ===",
            "Price concerns:",
            objection_handling.get("price", ""),
            "",
            "Timing concerns:",
            objection_handling.get("timing", ""),
            "",
            "Not interested:",
            objection_handling.get("not_interested", ""),
            "",
        ]
    )

    # Add CTA with context
    prompt_parts.extend(
        [
            "=== CALL TO ACTION ===",
            "Primary:",
            call_to_action.get("main_cta", ""),
            "",
            "Alternative:",
            call_to_action.get("alternative_cta", ""),
            "",
        ]
    )

    # Add tone guidelines
    prompt_parts.extend(
        [
            "=== TONE GUIDELINES ===",
            f"Style: {tone.get('style', '')}",
            f"Pace: {tone.get('pace', '')}",
            f"Empathy: {tone.get('empathy', '')}",
            "",
        ]
    )

    # Add iterative improvement notes
    if prompt_history.data:
        last_prompt = prompt_history.data[0]
        if last_prompt.get("changes_made"):
            prompt_parts.append("=== RECENT IMPROVEMENTS ===")
            for change in last_prompt.get("changes_made", [])[:3]:
                prompt_parts.append(f"- {change}")
            prompt_parts.append("")

    # Final instructions
    prompt_parts.extend(
        [
            "=== EXECUTION GUIDELINES ===",
            "1. Apply proven success patterns from above",
            "2. Avoid identified failure patterns",
            "3. Adapt based on prospect's specific objections",
            "4. Use learnings from similar past successful calls",
            "5. Be natural, consultative, and conversion-focused",
            "",
            "Remember: Every call teaches us something. Apply what worked, avoid what failed.",
        ]
    )

    final_prompt = "\n".join(prompt_parts)

    # Store this prompt version for tracking
    store_prompt_snapshot(supabase, version_info.get("version", "unknown"), final_prompt)

    return final_prompt


def store_prompt_snapshot(supabase: Client, version: str, prompt: str) -> None:
    """Store prompt snapshot for evolution tracking."""
    # Get current stats
    current_version = (
        supabase.table("agent_versions")
        .select("total_calls, conversion_rate")
        .eq("version", version)
        .limit(1)
        .execute()
    )

    if current_version.data:
        stats = current_version.data[0]
        # Check if this prompt version already exists
        existing = (
            supabase.table("prompt_evolution")
            .select("*")
            .eq("version", version)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )

        changes = []
        if existing.data:
            # Compare to previous version
            prev_prompt = existing.data[0].get("prompt_snapshot", "")
            if prev_prompt != prompt:
                changes = ["Prompt updated with latest learnings"]

        supabase.table("prompt_evolution").insert(
            {
                "version": version,
                "prompt_snapshot": prompt,
                "changes_made": changes,
                "calls_count": stats.get("total_calls", 0),
                "conversion_rate": stats.get("conversion_rate", 0.0),
            }
        ).execute()


def get_prompt_improvement_suggestions(supabase: Client, openai_client=None) -> Dict:
    """
    Use AI to suggest prompt improvements based on all historical data.
    This is the most agentic function - it reasons about what to improve.
    """
    from .analyzer import get_learnings, detect_trends

    learnings = get_learnings(supabase, limit=20)
    trends = detect_trends(supabase)

    # Get recent performance
    current_version = (
        supabase.table("agent_versions")
        .select("*")
        .eq("is_active", True)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    if not current_version.data:
        return {"suggestions": [], "reasoning": "No active version"}

    version_info = current_version.data[0]
    strategy = version_info.get("strategy_json", {})

    # Get patterns
    patterns = (
        supabase.table("learning_patterns")
        .select("*")
        .eq("is_active", True)
        .order("confidence_score", desc=True)
        .limit(15)
        .execute()
    )

    improvement_prompt = f"""You are an expert at optimizing sales prompts based on data.

CURRENT PERFORMANCE:
- Conversion Rate: {version_info.get('conversion_rate', 0):.1%}
- Total Calls: {version_info.get('total_calls', 0)}
- Trend: {trends.get('trend', 'unknown')}

CURRENT STRATEGY:
{json.dumps(strategy, indent=2)}

LEARNINGS FROM {len(learnings.get('what_worked', []))} SUCCESSFUL CALLS:
{chr(10).join(f"- {item}" for item in learnings.get('what_worked', [])[:10])}

FAILURES FROM {len(learnings.get('what_failed', []))} FAILED CALLS:
{chr(10).join(f"- {item}" for item in learnings.get('what_failed', [])[:10])}

IDENTIFIED PATTERNS:
{chr(10).join(f"- {p.get('pattern_type')}: {p.get('pattern_description')} (confidence: {p.get('confidence_score', 0):.2f})" for p in (patterns.data or [])[:10])}

Analyze and suggest 3-5 specific, actionable improvements to the prompt/strategy.
Focus on:
1. What's working (keep/amplify)
2. What's failing (remove/change)
3. New patterns to incorporate
4. Trends to address

Return JSON:
{{
  "suggestions": [
    {{
      "area": "opening/objection_handling/cta/tone",
      "current": "what we're doing now",
      "suggested_change": "specific improvement",
      "reasoning": "why this will help",
      "expected_impact": "low/medium/high"
    }}
  ],
  "priority_order": ["suggestion 1", "suggestion 2", ...],
  "reasoning": "overall analysis"
}}"""

    response = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You optimize sales prompts based on data. Return JSON only."},
            {"role": "user", "content": improvement_prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.8,
        max_tokens=2000,
    )

    content = response.choices[0].message.content or "{}"
    return json.loads(content)
