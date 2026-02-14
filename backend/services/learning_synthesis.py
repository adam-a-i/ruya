"""Learning synthesis service - agentic synthesis of all learnings into actionable insights."""
import json
from collections import Counter
from typing import Dict, List

from openai import AzureOpenAI
from supabase import Client


def synthesize_all_learnings(supabase: Client, openai_client: AzureOpenAI) -> Dict:
    """
    Synthesize all historical learnings into comprehensive insights.
    This is the most agentic function - it reasons about all past data.
    """
    # Get all relevant data
    all_learnings = (
        supabase.table("call_learnings")
        .select("*")
        .order("created_at", desc=True)
        .limit(100)
        .execute()
    )

    all_patterns = (
        supabase.table("learning_patterns")
        .select("*")
        .eq("is_active", True)
        .order("confidence_score", desc=True)
        .execute()
    )

    all_calls = (
        supabase.table("calls")
        .select("outcome, transcript, created_at")
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )

    version_history = (
        supabase.table("agent_versions")
        .select("version, conversion_rate, total_calls, created_at")
        .order("created_at", desc=True)
        .execute()
    )

    # Analyze patterns
    successful_learnings = [l for l in (all_learnings.data or []) if l.get("outcome") == "booked"]
    failed_learnings = [l for l in (all_learnings.data or []) if l.get("outcome") == "not_booked"]

    # Extract common themes
    worked_phrases = [l.get("what_worked", "") for l in successful_learnings if l.get("what_worked")]
    failed_phrases = [l.get("what_failed", "") for l in failed_learnings if l.get("what_failed")]

    worked_counter = Counter(worked_phrases)
    failed_counter = Counter(failed_phrases)

    # Extract objection patterns
    all_objections = []
    for learning in all_learnings.data or []:
        all_objections.extend(learning.get("objection_types", []))

    objection_counter = Counter(all_objections)

    # Calculate conversion by engagement level
    engagement_conversion = {}
    for learning in all_learnings.data or []:
        level = learning.get("engagement_level", "medium")
        if level not in engagement_conversion:
            engagement_conversion[level] = {"total": 0, "booked": 0}
        engagement_conversion[level]["total"] += 1
        if learning.get("outcome") == "booked":
            engagement_conversion[level]["booked"] += 1

    # Build synthesis prompt for AI
    synthesis_prompt = f"""Synthesize all learnings from {len(all_learnings.data or [])} analyzed calls.

SUCCESSFUL CALLS ({len(successful_learnings)}):
Top patterns that worked (frequency):
{chr(10).join(f"- {phrase} (appeared {count} times)" for phrase, count in worked_counter.most_common(10))}

FAILED CALLS ({len(failed_learnings)}):
Top patterns that failed (frequency):
{chr(10).join(f"- {phrase} (appeared {count} times)" for phrase, count in failed_counter.most_common(10))}

OBJECTION PATTERNS:
{chr(10).join(f"- {obj}: {count} occurrences" for obj, count in objection_counter.most_common(10))}

ENGAGEMENT LEVEL CONVERSION:
{chr(10).join(f"- {level}: {data['booked']}/{data['total']} = {data['booked']/data['total']:.1%}" for level, data in engagement_conversion.items())}

IDENTIFIED PATTERNS ({len(all_patterns.data or [])}):
{chr(10).join(f"- {p.get('pattern_type')}: {p.get('pattern_description')} (confidence: {p.get('confidence_score', 0):.2f}, success rate: {p.get('success_rate', 0):.1%})" for p in (all_patterns.data or [])[:15])}

VERSION HISTORY:
{chr(10).join(f"- {v.get('version')}: {v.get('conversion_rate', 0):.1%} conversion ({v.get('total_calls', 0)} calls)" for v in (version_history.data or [])[:5])}

Synthesize this into actionable insights. Return JSON:
{{
  "key_insights": [
    "insight 1",
    "insight 2",
    ...
  ],
  "most_effective_approaches": [
    {{
      "approach": "description",
      "evidence": "why it works",
      "confidence": "high/medium/low"
    }}
  ],
  "most_common_mistakes": [
    {{
      "mistake": "description",
      "impact": "why it fails",
      "frequency": "how often"
    }}
  ],
  "objection_handling_insights": {{
    "top_objections": ["list"],
    "effective_responses": ["what worked"],
    "ineffective_responses": ["what failed"]
  }},
  "recommendations": [
    {{
      "recommendation": "specific action",
      "priority": "high/medium/low",
      "expected_impact": "description"
    }}
  ],
  "evolution_trend": "how the agent has improved over time"
}}"""

    response = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": "You synthesize sales call learnings into actionable insights. Return detailed JSON only.",
            },
            {"role": "user", "content": synthesis_prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.7,
        max_tokens=3000,
    )

    content = response.choices[0].message.content or "{}"
    synthesis = json.loads(content)

    # Add raw statistics
    synthesis["statistics"] = {
        "total_calls_analyzed": len(all_learnings.data or []),
        "successful_calls": len(successful_learnings),
        "failed_calls": len(failed_learnings),
        "overall_conversion": len(successful_learnings) / len(all_learnings.data) if all_learnings.data else 0,
        "patterns_identified": len(all_patterns.data or []),
        "high_confidence_patterns": len([p for p in (all_patterns.data or []) if p.get("confidence_score", 0) > 0.5]),
    }

    return synthesis


def get_learning_summary(supabase: Client) -> Dict:
    """Get a quick summary of all learnings for dashboard/API."""
    from .analyzer import get_learnings, detect_trends

    learnings = get_learnings(supabase, limit=10)
    trends = detect_trends(supabase)

    # Get pattern counts
    patterns = (
        supabase.table("learning_patterns")
        .select("pattern_type, confidence_score")
        .eq("is_active", True)
        .execute()
    )

    high_conf_success = len(
        [p for p in (patterns.data or []) if p.get("pattern_type") == "success_pattern" and p.get("confidence_score", 0) > 0.5]
    )
    high_conf_failure = len(
        [p for p in (patterns.data or []) if p.get("pattern_type") == "failure_pattern" and p.get("confidence_score", 0) > 0.5]
    )

    return {
        "trends": trends,
        "learnings_count": {
            "what_worked": len(learnings.get("what_worked", [])),
            "what_failed": len(learnings.get("what_failed", [])),
        },
        "patterns": {
            "high_confidence_success": high_conf_success,
            "high_confidence_failure": high_conf_failure,
            "total": len(patterns.data or []),
        },
        "top_learnings": {
            "worked": learnings.get("what_worked", [])[:5],
            "failed": learnings.get("what_failed", [])[:5],
        },
    }
