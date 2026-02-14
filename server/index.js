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
app.use(express.json());

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

// Save transcript to Supabase
app.post("/api/demo/save-transcript", async (req, res) => {
  try {
    const { lines } = req.body || {};
    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: "lines array required" });
    }
    if (!supabase) {
      return res.status(503).json({
        error: "Supabase not configured",
        saved: false,
        mock: true,
      });
    }
    const rows = lines.map((l) => ({
      role: (typeof l === "object" && l.role) || (String(l.text || l).startsWith("[Agent]") ? "agent" : "client"),
      content: typeof l === "object" && l.text != null ? l.text : String(l).replace(/^\[Agent\] |^\[Client\] /, ""),
    }));
    const { data, error } = await supabase
      .from("call_transcripts")
      .insert(rows.map((r) => ({ role: r.role, content: r.content })))
      .select("id");
    if (error) {
      const tableMissing = error.code === "PGRST205";
      if (tableMissing) {
        console.warn("Supabase: table 'call_transcripts' not found. Run server/supabase-call_transcripts.sql in your Supabase SQL editor.");
      } else {
        console.error("Supabase insert error:", error);
      }
      return res.status(200).json({
        saved: false,
        error: tableMissing ? "Table call_transcripts not created yet" : error.message,
      });
    }
    return res.json({ saved: true, ids: data?.map((d) => d.id) || [] });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e.message), saved: false });
  }
});

// Improve prompt with Azure OpenAI and return agent feedback + improved pitch
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
