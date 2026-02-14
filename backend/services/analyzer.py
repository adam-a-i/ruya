"""Advanced call analysis service - agentic learning from historical patterns."""
import json
from collections import Counter
from typing import Dict, List, Optional

from openai import AzureOpenAI
from supabase import Client


def get_historical_context(supabase: Client, limit: int = 20) -> Dict:
    """Get historical context from past calls for comparative analysis."""
    # Get recent successful calls
    successful_calls = (
        supabase.table("calls")
        .select("transcript, outcome, created_at")
        .eq("outcome", "booked")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )

    # Get recent failed calls
    failed_calls = (
        supabase.table("calls")
        .select("transcript, outcome, created_at")
        .eq("outcome", "not_booked")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )

    # Get existing patterns
    patterns = (
        supabase.table("learning_patterns")
        .select("*")
        .eq("is_active", True)
        .order("confidence_score", desc=True)
        .limit(10)
        .execute()
    )

    # Get historical learnings
    learnings = (
        supabase.table("call_learnings")
        .select("what_worked, what_failed, key_phrase, objection_types, engagement_level")
        .order("created_at", desc=True)
        .limit(30)
        .execute()
    )

    return {
        "successful_calls": successful_calls.data or [],
        "failed_calls": failed_calls.data or [],
        "patterns": patterns.data or [],
        "learnings": learnings.data or [],
    }


def analyze_call_with_context(
    transcript: str,
    outcome: str,
    openai_client: AzureOpenAI,
    supabase: Client,
    call_id: str,
    model_name: str = "gpt-4o",
) -> Dict:
    """
    Analyze call with full historical context - compares against past patterns.
    This is the agentic, self-improving analysis that learns from all previous calls.
    """
    # Get historical context
    history = get_historical_context(supabase, limit=15)

    # Build context summary for GPT
    successful_examples = "\n".join(
        [f"SUCCESS {i+1}: {call.get('transcript', '')[:200]}..." for i, call in enumerate(history["successful_calls"][:5])]
    )
    failed_examples = "\n".join(
        [f"FAILED {i+1}: {call.get('transcript', '')[:200]}..." for i, call in enumerate(history["failed_calls"][:5])]
    )

    # Extract common patterns from learnings
    what_worked_list = [l.get("what_worked", "") for l in history["learnings"] if l.get("what_worked")]
    what_failed_list = [l.get("what_failed", "") for l in history["learnings"] if l.get("what_failed")]

    # Count frequencies
    worked_counter = Counter(what_worked_list)
    failed_counter = Counter(what_failed_list)

    top_worked = [item for item, count in worked_counter.most_common(5)]
    top_failed = [item for item, count in failed_counter.most_common(5)]

    # Build patterns summary
    patterns_summary = ""
    for pattern in history["patterns"][:5]:
        patterns_summary += f"\n- {pattern.get('pattern_type')}: {pattern.get('pattern_description')} (confidence: {pattern.get('confidence_score', 0):.2f})"

    analysis_prompt = f"""You are an advanced sales call analyst with access to historical data. Analyze this call in context of all previous calls.

OBJECTIVE: Book property viewing appointment
OUTCOME: {outcome}

CURRENT CALL TRANSCRIPT:
{transcript}

HISTORICAL CONTEXT:
Successful calls (last 5):
{successful_examples}

Failed calls (last 5):
{failed_examples}

Common patterns that worked (from {len(what_worked_list)} past calls):
{chr(10).join(f"- {item}" for item in top_worked)}

Common patterns that failed (from {len(what_failed_list)} past calls):
{chr(10).join(f"- {item}" for item in top_failed)}

Identified patterns in database:
{patterns_summary}

Analyze this call considering:
1. How does it compare to successful calls?
2. How does it compare to failed calls?
3. What new patterns emerge?
4. What confirms existing patterns?
5. What contradicts existing patterns?

Return detailed JSON:
{{
  "what_worked": "specific phrase/approach that worked in THIS call",
  "what_failed": "specific phrase/approach that failed in THIS call",
  "key_phrase": "the phrase that determined the outcome",
  "objection_types": ["price", "timing", etc],
  "engagement_level": "high/medium/low",
  "comparison_to_successful": "how this call compares to successful ones",
  "comparison_to_failed": "how this call compares to failed ones",
  "new_insights": "any new patterns or insights discovered",
  "confirms_patterns": ["which existing patterns this confirms"],
  "contradicts_patterns": ["which existing patterns this contradicts"],
  "conversion_factors": {{
    "positive": ["factors that helped conversion"],
    "negative": ["factors that hurt conversion"]
  }}
}}

Be specific and reference historical patterns."""

    response = openai_client.chat.completions.create(
        model=model_name,
        messages=[
            {
                "role": "system",
                "content": "You are an advanced sales call analyst that learns from historical patterns. Return detailed JSON only.",
            },
            {"role": "user", "content": analysis_prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.7,
        max_tokens=2000,
    )

    content = response.choices[0].message.content or "{}"
    learning = json.loads(content)

    # Store detailed learning
    supabase.table("call_learnings").insert(
        {
            "call_id": call_id,
            "outcome": outcome,
            "what_worked": learning.get("what_worked", ""),
            "what_failed": learning.get("what_failed", ""),
            "key_phrase": learning.get("key_phrase", ""),
            "objection_types": learning.get("objection_types", []),
            "engagement_level": learning.get("engagement_level", "medium"),
            "conversion_factors": learning.get("conversion_factors", {}),
        }
    ).execute()

    # Update or create patterns based on this learning
    update_patterns_from_learning(supabase, learning, outcome)

    return learning


def update_patterns_from_learning(supabase: Client, learning: Dict, outcome: str) -> None:
    """Update learning patterns database based on new call analysis."""
    what_worked = learning.get("what_worked", "")
    what_failed = learning.get("what_failed", "")
    confirms = learning.get("confirms_patterns", [])
    contradicts = learning.get("contradicts_patterns", [])

    # Update confirmed patterns (increase confidence)
    for pattern_desc in confirms:
        existing = (
            supabase.table("learning_patterns")
            .select("*")
            .eq("pattern_description", pattern_desc)
            .eq("is_active", True)
            .limit(1)
            .execute()
        )

        if existing.data:
            pattern = existing.data[0]
            new_frequency = pattern.get("frequency", 1) + 1
            # Update confidence based on frequency and outcome
            confidence_boost = 0.1 if outcome == "booked" else 0.05
            new_confidence = min(1.0, pattern.get("confidence_score", 0) + confidence_boost)

            supabase.table("learning_patterns").update(
                {
                    "frequency": new_frequency,
                    "confidence_score": new_confidence,
                    "last_seen_at": "now()",
                    "updated_at": "now()",
                }
            ).eq("id", pattern["id"]).execute()

    # Create new pattern if what_worked is significant
    if what_worked and outcome == "booked":
        # Check if similar pattern exists
        similar = (
            supabase.table("learning_patterns")
            .select("*")
            .ilike("pattern_description", f"%{what_worked[:50]}%")
            .eq("pattern_type", "success_pattern")
            .limit(1)
            .execute()
        )

        if not similar.data:
            # Calculate success rate for this pattern
            similar_learnings = (
                supabase.table("call_learnings")
                .select("outcome")
                .ilike("what_worked", f"%{what_worked[:50]}%")
                .execute()
            )
            similar_outcomes = [l.get("outcome") for l in (similar_learnings.data or [])]
            success_rate = sum(1 for o in similar_outcomes if o == "booked") / len(similar_outcomes) if similar_outcomes else 0.5

            supabase.table("learning_patterns").insert(
                {
                    "pattern_type": "success_pattern",
                    "pattern_description": what_worked,
                    "pattern_data": {"source": "call_analysis", "key_phrase": learning.get("key_phrase", "")},
                    "frequency": 1,
                    "success_rate": success_rate,
                    "confidence_score": 0.3,  # Start with low confidence, increases with confirmations
                }
            ).execute()

    # Create failure pattern
    if what_failed and outcome == "not_booked":
        similar = (
            supabase.table("learning_patterns")
            .select("*")
            .ilike("pattern_description", f"%{what_failed[:50]}%")
            .eq("pattern_type", "failure_pattern")
            .limit(1)
            .execute()
        )

        if not similar.data:
            supabase.table("learning_patterns").insert(
                {
                    "pattern_type": "failure_pattern",
                    "pattern_description": what_failed,
                    "pattern_data": {"source": "call_analysis"},
                    "frequency": 1,
                    "success_rate": 0.0,
                    "confidence_score": 0.3,
                }
            ).execute()


def get_learnings(supabase: Client, limit: int = 10) -> Dict[str, List[str]]:
    """
    Get comprehensive learnings from historical data, weighted by confidence.
    """
    # Get high-confidence patterns
    patterns = (
        supabase.table("learning_patterns")
        .select("*")
        .eq("is_active", True)
        .order("confidence_score", desc=True)
        .order("frequency", desc=True)
        .limit(20)
        .execute()
    )

    success_patterns = [
        p.get("pattern_description", "")
        for p in (patterns.data or [])
        if p.get("pattern_type") == "success_pattern" and p.get("confidence_score", 0) > 0.4
    ]

    failure_patterns = [
        p.get("pattern_description", "")
        for p in (patterns.data or [])
        if p.get("pattern_type") == "failure_pattern" and p.get("confidence_score", 0) > 0.4
    ]

    # Also get recent learnings as fallback
    recent_learnings = (
        supabase.table("call_learnings")
        .select("what_worked, what_failed")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )

    what_worked = [l.get("what_worked", "") for l in (recent_learnings.data or []) if l.get("what_worked")]
    what_failed = [l.get("what_failed", "") for l in (recent_learnings.data or []) if l.get("what_failed")]

    # Combine patterns (high confidence) with recent learnings
    combined_worked = list(dict.fromkeys(success_patterns + what_worked))  # Remove duplicates, preserve order
    combined_failed = list(dict.fromkeys(failure_patterns + what_failed))

    return {
        "what_worked": combined_worked[:limit],
        "what_failed": combined_failed[:limit],
        "patterns": {
            "success": success_patterns,
            "failure": failure_patterns,
        },
    }


def detect_trends(supabase: Client) -> Dict:
    """Detect trends across multiple calls - agentic pattern detection."""
    # Get conversion rates by time period
    recent_calls = (
        supabase.table("calls")
        .select("outcome, created_at")
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )

    if not recent_calls.data or len(recent_calls.data) < 10:
        return {"trend": "insufficient_data", "message": "Need at least 10 calls to detect trends"}

    # Analyze objection trends
    recent_learnings = (
        supabase.table("call_learnings")
        .select("objection_types, outcome")
        .order("created_at", desc=True)
        .limit(30)
        .execute()
    )

    objection_counter = Counter()
    for learning in recent_learnings.data or []:
        for obj_type in learning.get("objection_types", []):
            objection_counter[obj_type] += 1

    # Calculate recent conversion rate
    recent_outcomes = [call.get("outcome") for call in recent_calls.data[:20]]
    recent_conversion = sum(1 for o in recent_outcomes if o == "booked") / len(recent_outcomes) if recent_outcomes else 0

    # Compare to older calls
    older_outcomes = [call.get("outcome") for call in recent_calls.data[20:40]]
    older_conversion = sum(1 for o in older_outcomes if o == "booked") / len(older_outcomes) if older_outcomes else 0

    trend_direction = "improving" if recent_conversion > older_conversion else "declining" if recent_conversion < older_conversion else "stable"

    return {
        "trend": trend_direction,
        "recent_conversion_rate": recent_conversion,
        "previous_conversion_rate": older_conversion,
        "top_objections": [obj for obj, count in objection_counter.most_common(5)],
        "total_calls_analyzed": len(recent_calls.data),
    }
