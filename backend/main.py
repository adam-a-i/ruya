import json
import os
from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx
from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import AzureOpenAI
from pydantic import BaseModel
from supabase import Client, create_client

load_dotenv()

PORT = int(os.getenv("PORT", "3000"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("service_role_key")

AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION", "2025-01-01-preview")
AZURE_OPENAI_DEPLOYMENT_NAME = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4o")

VAPI_API_KEY = os.getenv("VAPI_API_KEY") or os.getenv("serversideAPIVapi")
VAPI_ASSISTANT_ID = os.getenv("VAPI_ASSISTANT_ID") or os.getenv("assistant_id")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY/service_role_key")
if not AZURE_OPENAI_API_KEY or not AZURE_OPENAI_ENDPOINT:
    raise RuntimeError("Missing Azure OpenAI configuration")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

openai_client = AzureOpenAI(
    api_key=AZURE_OPENAI_API_KEY,
    api_version=AZURE_OPENAI_API_VERSION,
    azure_endpoint=AZURE_OPENAI_ENDPOINT,
)

app = FastAPI(title="Ruya Self-Improving Voice Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class WebhookPayload(BaseModel):
    call: Dict[str, Any]


class OutcomePayload(BaseModel):
    outcome: str


class AnalyzePayload(BaseModel):
    call_id: str
    transcript: str
    outcome: str


def get_current_agent_version() -> Optional[Dict[str, Any]]:
    result = (
        supabase.table("agent_versions")
        .select("*")
        .eq("is_active", True)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not result.data:
        return None
    return result.data[0]


def analyze_call(transcript: str, outcome: str) -> Dict[str, Any]:
    analysis_prompt = f"""You are an expert sales call analyst. Analyze this real estate sales call transcript and provide structured insights.

TRANSCRIPT:
{transcript}

OUTCOME: {outcome}

Provide a detailed JSON analysis with this structure:
{{
  "objections": ["list of objections raised"],
  "emotional_tone": "skeptical/interested/neutral/hostile",
  "engagement_score": 1-10,
  "conversion_probability": 0.0-1.0,
  "strengths": ["what agent did well"],
  "weaknesses": ["what to improve"],
  "key_moments": ["critical moments"],
  "improvement_suggestions": ["specific improvements"]
}}

Return valid JSON only."""

    response = openai_client.chat.completions.create(
        model=AZURE_OPENAI_DEPLOYMENT_NAME,
        messages=[
            {"role": "system", "content": "You are an expert sales call analyst. Return JSON only."},
            {"role": "user", "content": analysis_prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.7,
        max_tokens=1800,
    )
    content = response.choices[0].message.content or "{}"
    return json.loads(content)


def generate_strategy_mutation(
    current_strategy: Dict[str, Any], recent_analyses: List[Dict[str, Any]], conversion_rate: float
) -> Dict[str, Any]:
    mutation_prompt = f"""You optimize conversion for a real-estate phone sales agent.

CURRENT STRATEGY:
{json.dumps(current_strategy.get("strategy_json", {}), indent=2)}

CURRENT CONVERSION RATE: {conversion_rate:.2%}
TOTAL CALLS: {current_strategy.get("total_calls", 0)}

RECENT CALL ANALYSES:
{json.dumps(recent_analyses, indent=2)}

Make 2-3 focused improvements and keep what already works.
Return JSON:
{{
  "changes_made": ["..."],
  "reasoning": "...",
  "new_strategy": {{ ... full strategy object ... }}
}}

Return valid JSON only."""

    response = openai_client.chat.completions.create(
        model=AZURE_OPENAI_DEPLOYMENT_NAME,
        messages=[
            {"role": "system", "content": "You optimize sales call strategy. Return JSON only."},
            {"role": "user", "content": mutation_prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.8,
        max_tokens=2600,
    )
    content = response.choices[0].message.content or "{}"
    return json.loads(content)


def convert_strategy_to_prompt(strategy_json: Dict[str, Any]) -> str:
    opening = strategy_json.get("opening", {})
    qualification = strategy_json.get("qualification", {})
    objection_handling = strategy_json.get("objection_handling", {})
    call_to_action = strategy_json.get("call_to_action", {})
    tone = strategy_json.get("tone", {})
    questions = qualification.get("questions", [])
    q_text = "\n".join([f"{i + 1}. {q}" for i, q in enumerate(questions)])

    return f"""You are a professional real estate sales agent. Your goal is to book property viewing appointments.

OPENING:
{opening.get("greeting", "")}
{opening.get("intro", "")}

QUALIFICATION QUESTIONS:
{q_text}

OBJECTION HANDLING:
- Price concerns: {objection_handling.get("price", "")}
- Timing concerns: {objection_handling.get("timing", "")}
- Not interested: {objection_handling.get("not_interested", "")}

CALL TO ACTION:
Primary: {call_to_action.get("main_cta", "")}
Alternative: {call_to_action.get("alternative_cta", "")}

TONE GUIDELINES:
- Style: {tone.get("style", "")}
- Pace: {tone.get("pace", "")}
- Empathy: {tone.get("empathy", "")}

Be natural, concise, and conversion-focused."""


async def update_vapi_assistant(strategy: Dict[str, Any]) -> Dict[str, Any]:
    if not VAPI_API_KEY or not VAPI_ASSISTANT_ID:
        raise RuntimeError("Missing VAPI_API_KEY or VAPI_ASSISTANT_ID/assistant_id")

    system_prompt = convert_strategy_to_prompt(strategy)
    url = f"https://api.vapi.ai/assistant/{VAPI_ASSISTANT_ID}"
    payload = {
        "model": {
            "provider": "openai",
            "model": "gpt-4",
            "messages": [{"role": "system", "content": system_prompt}],
        }
    }
    headers = {"Authorization": f"Bearer {VAPI_API_KEY}", "Content-Type": "application/json"}

    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.patch(url, json=payload, headers=headers)
        res.raise_for_status()
        return res.json()


def increment_version(version: str) -> str:
    if not version.startswith("v") or "." not in version:
        return "v1.1"
    try:
        major, minor = version[1:].split(".")
        return f"v{int(major)}.{int(minor) + 1}"
    except Exception:
        return "v1.1"


async def check_and_mutate_strategy() -> None:
    current_version = get_current_agent_version()
    if not current_version:
        return

    threshold = 5
    total_calls = current_version.get("total_calls", 0)
    if total_calls <= 0 or total_calls % threshold != 0:
        return

    recent_calls = (
        supabase.table("calls")
        .select("analysis_json,outcome")
        .eq("agent_version", current_version["version"])
        .not_.is_("analysis_json", "null")
        .order("created_at", desc=True)
        .limit(10)
        .execute()
    )
    analyses = [row["analysis_json"] for row in (recent_calls.data or []) if row.get("analysis_json")]
    if not analyses:
        return

    mutation = generate_strategy_mutation(
        current_version,
        analyses,
        float(current_version.get("conversion_rate", 0)),
    )
    new_version = increment_version(current_version["version"])
    new_strategy = mutation.get("new_strategy", {})
    if not new_strategy:
        return

    insert_res = (
        supabase.table("agent_versions")
        .insert({"version": new_version, "strategy_json": new_strategy, "is_active": True})
        .execute()
    )
    if not insert_res.data:
        return

    supabase.table("agent_versions").update({"is_active": False}).eq("version", current_version["version"]).execute()
    await update_vapi_assistant(new_strategy)


async def analyze_call_async(call_id: str, transcript: str) -> None:
    # For demo, default outcome until external system sets it.
    outcome = "not_booked"
    
    # Use advanced context-aware analysis
    from services.analyzer import analyze_call_with_context
    
    learning = analyze_call_with_context(
        transcript=transcript,
        outcome=outcome,
        openai_client=openai_client,
        supabase=supabase,
        call_id=call_id,
        model_name=AZURE_OPENAI_DEPLOYMENT_NAME,
    )
    
    # Update call with outcome and store analysis
    (
        supabase.table("calls")
        .update({"outcome": outcome, "analysis_json": learning})
        .eq("id", call_id)
        .execute()
    )
    
    # Check if we should auto-optimize strategy (every 3 calls with outcomes)
    current_version = get_current_agent_version()
    if current_version:
        total_calls = current_version.get("total_calls", 0)
        # Auto-optimize every 3 calls if we have enough learnings
        if total_calls > 0 and total_calls % 3 == 0:
            # Check if we have enough learnings (get all and count)
            learnings_result = (
                supabase.table("call_learnings")
                .select("id")
                .execute()
            )
            learnings_count = len(learnings_result.data or [])
            if learnings_count >= 3:
                try:
                    from services.strategy_optimizer import optimize_strategy_from_learnings
                    result = await optimize_strategy_from_learnings(supabase, openai_client, AZURE_OPENAI_DEPLOYMENT_NAME)
                    print(f"✨ Auto-optimized strategy: {result['old_version']} -> {result['new_version']}")
                except Exception as e:
                    print(f"⚠️ Auto-optimization failed: {e}")
    
    await check_and_mutate_strategy()


@app.get("/health")
def health() -> Dict[str, str]:
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "Ruya Self-Improving Voice Agent (FastAPI)",
    }


@app.post("/webhook/call-completed")
async def webhook_call_completed(payload: WebhookPayload, background_tasks: BackgroundTasks) -> Dict[str, Any]:
    call = payload.call
    vapi_call_id = call.get("id")
    transcript = call.get("transcript", "")
    duration = 0
    started_at = call.get("startedAt")
    ended_at = call.get("endedAt")
    if started_at and ended_at:
        try:
            start_dt = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
            end_dt = datetime.fromisoformat(ended_at.replace("Z", "+00:00"))
            duration = int((end_dt - start_dt).total_seconds())
        except Exception:
            duration = 0

    current_version = get_current_agent_version()
    if not current_version:
        raise HTTPException(status_code=500, detail="No active agent version found")

    insert_res = (
        supabase.table("calls")
        .insert(
            {
                "vapi_call_id": vapi_call_id,
                "agent_version": current_version["version"],
                "transcript": transcript,
                "outcome": "pending",
                "duration_seconds": duration,
                "call_metadata": call,
            }
        )
        .execute()
    )
    if not insert_res.data:
        raise HTTPException(status_code=500, detail="Failed to insert call")

    record = insert_res.data[0]
    background_tasks.add_task(analyze_call_async, record["id"], transcript)

    return {"success": True, "message": "Call received and queued for analysis", "callId": record["id"]}


@app.get("/api/stats/overall")
def stats_overall() -> Dict[str, Any]:
    result = supabase.table("agent_versions").select("*").order("created_at", desc=True).execute()
    versions = result.data or []
    total_calls = sum(v.get("total_calls", 0) for v in versions)
    total_bookings = sum(v.get("total_bookings", 0) for v in versions)
    conversion = (total_bookings / total_calls) if total_calls else 0.0
    current = next((v for v in versions if v.get("is_active")), None)
    return {
        "total_calls": total_calls,
        "total_bookings": total_bookings,
        "overall_conversion_rate": conversion,
        "versions_created": len(versions),
        "current_version": current["version"] if current else "none",
    }


@app.get("/api/stats/versions")
def stats_versions() -> Dict[str, Any]:
    result = supabase.table("agent_versions").select("*").order("created_at", desc=True).execute()
    return {"versions": result.data or []}


@app.get("/api/calls/recent")
def calls_recent(limit: int = 20) -> Dict[str, Any]:
    result = supabase.table("calls").select("*").order("created_at", desc=True).limit(limit).execute()
    return {"calls": result.data or []}


@app.get("/api/strategy/current")
def strategy_current() -> Dict[str, Any]:
    current = get_current_agent_version()
    if not current:
        raise HTTPException(status_code=404, detail="No active strategy found")
    return current


@app.post("/api/strategy/mutate")
async def strategy_mutate() -> Dict[str, Any]:
    await check_and_mutate_strategy()
    return {"success": True, "message": "Strategy mutation triggered"}


@app.patch("/api/calls/{call_id}/outcome")
def update_outcome(call_id: str, payload: OutcomePayload) -> Dict[str, Any]:
    if payload.outcome not in {"booked", "not_booked"}:
        raise HTTPException(status_code=400, detail='Invalid outcome. Must be "booked" or "not_booked"')
    result = supabase.table("calls").update({"outcome": payload.outcome}).eq("id", call_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Call not found")
    return {"success": True, "call": result.data[0]}


@app.post("/api/analyze")
def analyze_call_endpoint(payload: AnalyzePayload) -> Dict[str, Any]:
    """Analyze a call with full historical context and store learning."""
    from services.analyzer import analyze_call_with_context

    if payload.outcome not in {"booked", "not_booked"}:
        raise HTTPException(status_code=400, detail='Invalid outcome. Must be "booked" or "not_booked"')

    try:
        learning = analyze_call_with_context(
            transcript=payload.transcript,
            outcome=payload.outcome,
            openai_client=openai_client,
            supabase=supabase,
            call_id=payload.call_id,
            model_name=AZURE_OPENAI_DEPLOYMENT_NAME,
        )
        return {"success": True, "learning": learning}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.get("/api/prompt/current")
def get_current_prompt() -> Dict[str, Any]:
    """Get highly optimized prompt with all historical learnings for next call."""
    from services.prompt_builder import build_optimized_prompt

    try:
        prompt = build_optimized_prompt(supabase, openai_client)
        return {"success": True, "prompt": prompt}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to build prompt: {str(e)}")


@app.get("/api/prompt/suggestions")
def get_prompt_suggestions() -> Dict[str, Any]:
    """Get AI-generated suggestions for prompt improvements."""
    from services.prompt_builder import get_prompt_improvement_suggestions

    try:
        suggestions = get_prompt_improvement_suggestions(supabase, openai_client)
        return {"success": True, "suggestions": suggestions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get suggestions: {str(e)}")


@app.get("/api/learnings/trends")
def get_trends() -> Dict[str, Any]:
    """Get trend analysis across all calls."""
    from services.analyzer import detect_trends

    try:
        trends = detect_trends(supabase)
        return {"success": True, "trends": trends}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to detect trends: {str(e)}")


@app.get("/api/learnings/synthesis")
def get_learning_synthesis() -> Dict[str, Any]:
    """Get comprehensive synthesis of all learnings - most agentic endpoint."""
    from services.learning_synthesis import synthesize_all_learnings

    try:
        synthesis = synthesize_all_learnings(supabase, openai_client)
        return {"success": True, "synthesis": synthesis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to synthesize learnings: {str(e)}")


@app.get("/api/learnings/summary")
def get_learning_summary() -> Dict[str, Any]:
    """Get quick summary of learnings for dashboard."""
    from services.learning_synthesis import get_learning_summary

    try:
        summary = get_learning_summary(supabase)
        return {"success": True, "summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get summary: {str(e)}")


@app.post("/api/strategy/optimize")
async def optimize_strategy() -> Dict[str, Any]:
    """
    Agentic endpoint: Analyzes all learnings and creates improved strategy version in database.
    This actually updates agent_versions table with new optimized version.
    """
    from services.strategy_optimizer import optimize_strategy_from_learnings

    try:
        result = await optimize_strategy_from_learnings(supabase, openai_client, AZURE_OPENAI_DEPLOYMENT_NAME)
        return {
            "success": True,
            "message": f"Strategy optimized: {result['old_version']} -> {result['new_version']}",
            "old_version": result["old_version"],
            "new_version": result["new_version"],
            "changes_made": result["changes_made"],
            "reasoning": result["reasoning"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Strategy optimization failed: {str(e)}")


@app.get("/api/strategy/compare")
def compare_strategies(version1: str, version2: str) -> Dict[str, Any]:
    """Compare two strategy versions."""
    from services.strategy_optimizer import get_strategy_comparison

    try:
        comparison = get_strategy_comparison(supabase, version1, version2)
        return {"success": True, "comparison": comparison}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")
