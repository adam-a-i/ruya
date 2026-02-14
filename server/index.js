import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import twilio from "twilio";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../frontend/.env") });

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const ELEVENLABS_API_KEY = process.env.el_api || process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Rachel
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_STUDIO_FLOW_SID = process.env.TWILIO_STUDIO_FLOW_SID || "FW35738efb54f4d25b57fc45201610068d";
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER || "+18452535921";
const DEMO_TO_NUMBER = "+971566616884";

// Start real call to +971 56 661 6884 via Twilio Studio flow
app.post("/api/demo/start-call", async (req, res) => {
  try {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      return res.status(503).json({
        ok: false,
        error: "Twilio not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in frontend/.env",
      });
    }
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    const execution = await client.studio.v2
      .flows(TWILIO_STUDIO_FLOW_SID)
      .executions.create({
        to: DEMO_TO_NUMBER,
        from: TWILIO_FROM_NUMBER,
      });
    return res.json({
      ok: true,
      executionSid: execution.sid,
      to: DEMO_TO_NUMBER,
      from: TWILIO_FROM_NUMBER,
    });
  } catch (e) {
    const isAuthError = e.status === 401 || e.code === 20003;
    if (isAuthError) {
      console.warn("Twilio 401: Invalid Account SID or Auth Token. Set TWILIO_AUTH_TOKEN in frontend/.env to your real token from https://console.twilio.com");
    } else {
      console.error("Twilio start-call error:", e);
    }
    const message = isAuthError
      ? "Invalid Twilio credentials. Put your real Auth Token in frontend/.env as TWILIO_AUTH_TOKEN (get it from Twilio Console)."
      : (e.message || String(e));
    return res.status(500).json({
      ok: false,
      error: message,
    });
  }
});

const supabaseUrl =
  process.env.SUPABASE_URL ||
  (() => {
    try {
      const payload = JSON.parse(
        Buffer.from(
          (process.env.service_role_key || "").split(".")[1],
          "base64"
        ).toString()
      );
      return `https://${payload.ref}.supabase.co`;
    } catch {
      return null;
    }
  })();

const supabase =
  supabaseUrl && process.env.service_role_key
    ? createClient(supabaseUrl, process.env.service_role_key)
    : null;

// ----- Prompts (baseline = 1, refined = 2) -----
app.get("/api/demo/prompt", async (req, res) => {
  try {
    const version = Math.max(1, Math.min(2, parseInt(req.query.version, 10) || 1));
    if (!supabase) {
      const fallback = version === 1
        ? "Real estate agent for Binghatti. Pitch Binghatti off-plan Dubai. Short replies. No thanks → acknowledge once, offer one insight. No again → Have a good day, [END_CALL]."
        : "Consultative real estate advisor. Greet, one-line pitch. Listen. Not interested → acknowledge, low-commitment follow-up. No again → Have a good day, [END_CALL].";
      return res.json({ version, body: fallback, fromDb: false });
    }
    const { data, error } = await supabase.from("prompts").select("version, body").eq("version", version).single();
    if (error || !data) {
      const fallback = version === 1
        ? "Real estate. Pitch Dubai. [END_CALL] when done."
        : "Real estate. Consultative. [END_CALL] when done.";
      return res.json({ version, body: fallback, fromDb: false });
    }
    return res.json({ version: data.version, body: data.body, fromDb: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e.message) });
  }
});

// ----- Call session: start (creates session, optional VAPI ring) -----
app.post("/api/demo/session/start", async (req, res) => {
  try {
    const { promptVersion = 1, ring = false, contact } = req.body || {};
    const version = promptVersion === 2 ? 2 : 1;
    if (!supabase) {
      return res.status(503).json({ error: "Supabase not configured" });
    }
    const payload = {
      prompt_version: version,
      contact_name: contact?.name ?? null,
      contact_phone: contact?.phone ?? contact?.fromNumber ?? null,
      contact_age: contact?.age ?? null,
      contact_region: contact?.region ?? null,
      contact_city: contact?.city ?? null,
      contact_street: contact?.street ?? null,
      contact_country: contact?.country ?? null,
    };
    const { data: session, error: sessionError } = await supabase
      .from("call_sessions")
      .insert(payload)
      .select("id")
      .single();
    if (sessionError || !session) {
      console.error("session insert", sessionError);
      return res.status(500).json({ error: "Failed to create session", detail: sessionError?.message });
    }
    let ringResult = { ok: false };
    if (ring && process.env.serversideAPIVapi && process.env.VAPI_PHONE_NUMBER_ID) {
      try {
        const r = await fetch("https://api.vapi.ai/call/phone", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.serversideAPIVapi}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            assistantId: process.env.assistant_id,
            phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
            customer: { number: DEMO_TO_NUMBER },
          }),
        });
        const d = await r.json().catch(() => ({}));
        ringResult = { ok: r.ok, callId: d.id, error: d.message || d.error };
      } catch (e) {
        ringResult = { ok: false, error: e.message };
      }
    }
    return res.json({ sessionId: session.id, promptVersion: version, ring: ringResult });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e.message) });
  }
});

app.post("/api/demo/session/:id/end", async (req, res) => {
  try {
    const { id } = req.params;
    if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
    const { error } = await supabase.from("call_sessions").update({ ended_at: new Date().toISOString() }).eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: String(e.message) });
  }
});

// ----- Save transcript (with session_id) -----
app.post("/api/demo/save-transcript", async (req, res) => {
  try {
    const { sessionId, lines } = req.body || {};
    const list = Array.isArray(lines) ? lines : [];
    if (!supabase) {
      return res.status(503).json({ error: "Supabase not configured", saved: false });
    }
    const rows = list.map((l) => ({
      role: (typeof l === "object" && (l.role === "agent" || l.role === "user")) ? l.role : (String(l.text || l).startsWith("[Agent]") ? "agent" : "user"),
      content: typeof l === "object" && l.text != null ? l.text : String(l).replace(/^\[Agent\] |^\[Client\] /, ""),
    }));
    if (sessionId) {
      const insertPayload = rows.map((r) => ({ session_id: sessionId, role: r.role, content: r.content }));
      const { data, error } = await supabase.from("call_transcripts").insert(insertPayload).select("id");
      if (error) {
        console.warn("Supabase save-transcript:", error.message);
        return res.status(200).json({ saved: false, error: error.message });
      }
      const { error: flowErr } = await supabase.from("demo_flow_events").insert({ session_id: sessionId, step: "transcript_saved", detail: `${rows.length} lines` }).select();
      if (flowErr) console.warn("demo_flow_events insert:", flowErr.message);
      return res.json({ saved: true, ids: data?.map((d) => d.id) || [] });
    }
    return res.status(400).json({ error: "sessionId required for save-transcript", saved: false });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e.message), saved: false });
  }
});

// ----- AI evaluator: analyze transcript → sentiment, objections, drop-off, engagement, outcome; store in call_insights -----
app.post("/api/demo/evaluate", async (req, res) => {
  try {
    const { sessionId } = req.body || {};
    if (!sessionId || !supabase) {
      return res.status(400).json({ error: "sessionId required and Supabase must be configured" });
    }
    const { data: messages, error: fetchErr } = await supabase
      .from("call_transcripts")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    if (fetchErr || !messages?.length) {
      return res.status(400).json({ error: "No transcript for this session", detail: fetchErr?.message });
    }
    const transcriptText = messages.map((m) => `${m.role}: ${m.content}`).join("\n");
    const key = process.env.AZURE_OPENAI_API_KEY;
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT?.replace(/\/$/, "");
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4o";
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-02-15-preview";
    if (!key || !endpoint) {
      return res.status(503).json({ error: "Azure OpenAI not configured" });
    }
    const systemPrompt = `You are an AI evaluator for sales calls. Analyze the transcript and return a JSON object only (no markdown) with these keys:
- sentiment_changes: Brief note on how the lead's sentiment changed during the call (e.g. "Started neutral, became hesitant after pitch").
- objections: Main objections the lead raised (one short sentence).
- drop_off_point: Where interest dropped or the call went wrong (one short sentence).
- engagement_score: Integer 1-10 (10 = highly engaged).
- outcome: One sentence: did the call end positively, neutrally, or negatively; what next step if any.`;
    const response = await fetch(`${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": key },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Transcript:\n${transcriptText}` },
        ],
        response_format: { type: "json_object" },
        max_tokens: 350,
      }),
    });
    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: "OpenAI failed", detail: err });
    }
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || "{}";
    let parsed = {};
    try {
      parsed = JSON.parse(content);
    } catch (_) {}
    const sentiment_changes = parsed.sentiment_changes ?? "";
    const objections = parsed.objections ?? "";
    const drop_off_point = parsed.drop_off_point ?? "";
    const engagement_score = Math.min(10, Math.max(1, parseInt(parsed.engagement_score, 10) || 5));
    const outcome = parsed.outcome ?? "";
    const { error: insertErr } = await supabase.from("call_insights").upsert(
      [{ session_id: sessionId, sentiment_changes, objections, drop_off_point, engagement_score, outcome }],
      { onConflict: "session_id" }
    );
    if (insertErr) {
      console.warn("call_insights upsert:", insertErr.message);
      return res.status(500).json({ error: "Failed to store insights", detail: insertErr.message });
    }
    try {
      await supabase.from("demo_flow_events").insert({ session_id: sessionId, step: "insights_stored", detail: "evaluator" }).select();
    } catch (_) {}
    return res.json({
      ok: true,
      insights: { sentiment_changes, objections, drop_off_point, engagement_score, outcome },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e.message) });
  }
});

// ----- Refine prompt from transcript + insights and save to DB (version 2) -----
app.post("/api/demo/refine-and-save", async (req, res) => {
  try {
    const { sessionId } = req.body || {};
    if (!sessionId || !supabase) {
      return res.status(400).json({ error: "sessionId required and Supabase must be configured" });
    }
    const { data: messages, error: fetchErr } = await supabase
      .from("call_transcripts")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    if (fetchErr || !messages?.length) {
      return res.status(400).json({ error: "No transcript for this session", detail: fetchErr?.message });
    }
    const transcriptText = messages.map((m) => `${m.role}: ${m.content}`).join("\n");
    const { data: insightRow } = await supabase.from("call_insights").select("sentiment_changes, objections, drop_off_point, engagement_score, outcome").eq("session_id", sessionId).single();
    const key = process.env.AZURE_OPENAI_API_KEY;
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT?.replace(/\/$/, "");
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4o";
    const version = process.env.AZURE_OPENAI_API_VERSION || "2024-02-15-preview";
    if (!key || !endpoint) {
      return res.status(503).json({ error: "Azure OpenAI not configured" });
    }
    const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${version}`;
    const systemPrompt = `You are an expert sales coach for a real estate voice AI. Given a call transcript and (optional) AI evaluation (sentiment, objections, drop-off point, engagement, outcome), respond with a JSON object only (no markdown) with one key:
- "improvedPrompt": A short system prompt (2-4 sentences) for the next outbound real estate call. Address the objections and drop-off; improve engagement. Keep it consultative: greet, one-line pitch, listen, acknowledge, offer low-commitment follow-up. End with "Have a good day" and [END_CALL] when the lead declines again.`;
    const insightBlob = insightRow
      ? `Evaluation: Sentiment: ${insightRow.sentiment_changes}. Objections: ${insightRow.objections}. Drop-off: ${insightRow.drop_off_point}. Engagement: ${insightRow.engagement_score}/10. Outcome: ${insightRow.outcome}.`
      : "";
    const userContent = `Transcript:\n${transcriptText}\n\n${insightBlob}`.trim();
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": key },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
        max_tokens: 300,
      }),
    });
    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: "OpenAI failed", detail: err });
    }
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || "{}";
    let parsed = {};
    try {
      parsed = JSON.parse(content);
    } catch (_) {}
    const improvedPrompt = parsed.improvedPrompt || "Binghatti real estate agent. Greet by name, one-line pitch. Listen. Not interested → acknowledge, offer one market insight by email. No again → Have a good day, [END_CALL].";
    const { error: updateErr } = await supabase.from("prompts").update({ body: improvedPrompt, updated_at: new Date().toISOString() }).eq("version", 2);
    if (updateErr) {
      console.error("prompts update", updateErr);
      return res.status(500).json({ error: "Failed to save refined prompt", detail: updateErr.message });
    }
    const { error: flowErr } = await supabase.from("demo_flow_events").insert({ session_id: sessionId, step: "prompt_refined", detail: "version 2 updated" }).select();
    if (flowErr) console.warn("demo_flow_events insert:", flowErr.message);
    return res.json({ ok: true, improvedPrompt });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e.message) });
  }
});

// ----- Agent: next message using prompt from DB; supports opening (speak first) and endCall -----
app.post("/api/demo/agent", async (req, res) => {
  try {
    const { message, history = [], promptVersion = 1, sessionId } = req.body || {};
    const userMessage = typeof message === "string" ? message : "";
    const isOpening = userMessage.trim() === "__OPENING__" && (!history || history.length === 0);
    if (!userMessage.trim() && !isOpening) {
      return res.status(400).json({ error: "message required" });
    }
    let systemPrompt = "Real estate agent for Binghatti. Pitch Binghatti off-plan Dubai. Short replies. [END_CALL] when done.";
    if (supabase) {
      const { data } = await supabase.from("prompts").select("body").eq("version", promptVersion === 2 ? 2 : 1).single();
      if (data?.body) systemPrompt = data.body;
    }
    systemPrompt += "\n\nSTRICT: Reply in ONE short sentence only. No paragraphs, no elaboration.";
    if (sessionId && supabase) {
      const { data: session } = await supabase.from("call_sessions").select("contact_name, contact_phone, contact_age, contact_region, contact_city, contact_street, contact_country").eq("id", sessionId).single();
      if (session && (session.contact_name || session.contact_phone || session.contact_region || session.contact_city)) {
        const parts = [];
        if (session.contact_name) parts.push(`Name: ${session.contact_name}`);
        if (session.contact_phone) parts.push(`Phone: ${session.contact_phone}`);
        if (session.contact_age) parts.push(`Age: ${session.contact_age}`);
        if (session.contact_region) parts.push(`Region: ${session.contact_region}`);
        if (session.contact_city) parts.push(`City: ${session.contact_city}`);
        if (session.contact_street) parts.push(`Street: ${session.contact_street}`);
        if (session.contact_country) parts.push(`Country: ${session.contact_country}`);
        if (parts.length) systemPrompt += "\n\nLead: " + parts.join(", ") + ".";
      }
    }
    const key = process.env.AZURE_OPENAI_API_KEY;
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT?.replace(/\/$/, "");
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4o";
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-02-15-preview";
    if (!key || !endpoint) {
      return res.status(503).json({ error: "Azure OpenAI not configured" });
    }
    const effectiveUserMessage = isOpening
      ? "[Call just connected. Say ONLY one short sentence: greet the lead by name (Adam) and give a one-line pitch for Binghatti off-plan Dubai. No other text.]"
      : userMessage;
    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map((h) => ({ role: h.role === "agent" ? "assistant" : "user", content: h.content })),
      { role: "user", content: effectiveUserMessage },
    ];
    const response = await fetch(`${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": key },
      body: JSON.stringify({ messages, max_tokens: 80 }),
    });
    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: "OpenAI failed", detail: err });
    }
    const data = await response.json();
    let text = data?.choices?.[0]?.message?.content?.trim() || (isOpening ? "Hi Adam, this is Natiq. Quick call about Binghatti off-plan in Dubai—interested in a short overview?" : "Sorry?");
    const endCall = text.includes("[END_CALL]");
    if (endCall) text = text.replace(/\s*\[END_CALL\]\s*$/i, "").trim();
    return res.json({ text, endCall: endCall || undefined });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e.message) });
  }
});

// ----- ElevenLabs TTS (laptop output) -----
app.post("/api/demo/tts", async (req, res) => {
  try {
    const { text } = req.body || {};
    const toSpeak = typeof text === "string" ? text.trim() : "";
    if (!toSpeak) {
      return res.status(400).json({ error: "text required" });
    }
    if (!ELEVENLABS_API_KEY) {
      return res.status(503).json({ error: "ElevenLabs not configured. Set el_api or ELEVENLABS_API_KEY in .env" });
    }
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: toSpeak.slice(0, 2500),
        model_id: "eleven_multilingual_v2",
      }),
    });
    if (!response.ok) {
      const err = await response.text();
      console.error("ElevenLabs TTS", response.status, err);
      return res.status(response.status).json({ error: "TTS failed", detail: err });
    }
    const audioBuffer = await response.arrayBuffer();
    res.setHeader("Content-Type", "audio/mpeg");
    res.send(Buffer.from(audioBuffer));
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e.message) });
  }
});

// Improve prompt with Azure OpenAI and return agent feedback + improved pitch (legacy)
app.post("/api/demo/improve-prompt", async (req, res) => {
  try {
    const { agentScript, clientResponse } = req.body || {};
    const script = agentScript || "";
    const client = clientResponse || "";
    if (!script && !client) {
      return res.status(400).json({ error: "agentScript and clientResponse required" });
    }

    const key = process.env.AZURE_OPENAI_API_KEY;
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT?.replace(/\/$/, "");
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4o";
    const version = process.env.AZURE_OPENAI_API_VERSION || "2024-02-15-preview";

    if (!key || !endpoint) {
      return res.status(503).json({
        error: "Azure OpenAI not configured",
        improvedPrompt: "Acknowledge timing; offer one short market insight with no commitment. Ask for email or WhatsApp.",
        agentFeedback: "Demo mode: Azure OpenAI not configured. Configure AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT for real improvements.",
        nextPitchSummary: "The agent will acknowledge the client's timing, offer a single non-committal market insight, and ask for preferred channel (email or WhatsApp).",
      });
    }

    const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${version}`;
    const systemPrompt = `You are an expert sales coach for a voice AI that pitches real estate. Given a short conversation:
- Agent said: (the pitch)
- Client said: (their response, often an objection or rejection)

Respond with a JSON object only (no markdown, no code block), with exactly these keys:
- "agentFeedback": 2-3 sentences of direct feedback TO THE AGENT on what went wrong and what to do better next time (e.g. "You led with product instead of need. Next time acknowledge their timeline first and offer one lightweight follow-up option.")
- "improvedPrompt": A short, concrete prompt update for the next call (1-3 sentences) the agent should follow.
- "nextPitchSummary": A detailed 2-4 sentence summary of exactly how the next pitch should go: opening line, how to handle the objection, and clear CTA.`;

    const userContent = `Agent said: "${script}"\nClient said: "${client}"`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": key,
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Azure OpenAI error:", response.status, err);
      return res.status(response.status).json({
        error: "OpenAI request failed",
        improvedPrompt: "",
        agentFeedback: "",
        nextPitchSummary: "",
      });
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || "{}";
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {
        agentFeedback: content.slice(0, 300),
        improvedPrompt: "",
        nextPitchSummary: "",
      };
    }

    return res.json({
      improvedPrompt: parsed.improvedPrompt || "",
      agentFeedback: parsed.agentFeedback || "",
      nextPitchSummary: parsed.nextPitchSummary || "",
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      error: String(e.message),
      improvedPrompt: "",
      agentFeedback: "",
      nextPitchSummary: "",
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
