# Demo pipeline API

Backend for the real demo: VAPI (optional ring), ElevenLabs TTS, Supabase (prompts, sessions, transcripts), Azure OpenAI (agent + refine).

## Setup

1. **Env**: Uses `../frontend/.env`. Ensure it has:
   - **Azure OpenAI:** `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT_NAME`, `AZURE_OPENAI_API_VERSION`
   - **Supabase:** `service_role_key`. Optional: `SUPABASE_URL` (e.g. `https://YOUR_REF.supabase.co`); if omitted, URL is derived from the JWT.
   - **ElevenLabs:** `el_api` or `ELEVENLABS_API_KEY`. Optional: `ELEVENLABS_VOICE_ID` (default: Rachel).
   - **VAPI (optional ring):** `serversideAPIVapi`, `VAPI_PHONE_NUMBER_ID`, `assistant_id`.
   - **Twilio (optional):** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, etc. for real outbound call.

2. **Supabase schema**: In [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**, run **`server/supabase-schema.sql`**. This creates:
   - Full step-by-step: see **`docs/SUPABASE-SETUP.md`**.
   - `prompts` (version 1 = baseline, version 2 = refined) with seed rows
   - `call_sessions` (id, prompt_version, started_at, ended_at)
   - `call_transcripts` (session_id, role, content)
   Without this, session/start, save-transcript, refine-and-save and prompt (from DB) will fail or fall back.

3. **Install and run** (from repo root):
   ```powershell
   cd server
   npm install
   npm run dev
   ```
   Server runs on port 3001. Frontend proxies `/api` to it.

## Endpoints

- **`GET /api/demo/prompt?version=1|2`** — Returns prompt body for baseline (1) or refined (2) from DB (or fallback).
- **`POST /api/demo/session/start`** — Body: `{ promptVersion: 1|2, ring?: boolean }`. Creates a `call_sessions` row; optionally rings phone via VAPI. Returns `{ sessionId, promptVersion, ring }`.
- **`POST /api/demo/session/:id/end`** — Sets `ended_at` on the session.
- **`POST /api/demo/save-transcript`** — Body: `{ sessionId, lines: [ { role: "agent"|"user", text } ] }`. Inserts into `call_transcripts`.
- **`POST /api/demo/refine-and-save`** — Body: `{ sessionId }`. Reads transcript from DB, calls Azure OpenAI, updates `prompts` row for version 2. Returns `{ ok, improvedPrompt }`.
- **`POST /api/demo/agent`** — Body: `{ message, history?, promptVersion?: 1|2 }`. Chat completion using prompt from DB. Returns `{ text }`.
- **`POST /api/demo/tts`** — Body: `{ text }`. ElevenLabs TTS; returns `audio/mpeg`.
- **`POST /api/demo/improve-prompt`** — Legacy: body `{ agentScript, clientResponse }`. Returns `{ improvedPrompt, agentFeedback, nextPitchSummary }`.
- **`POST /api/demo/start-call`** — Twilio Studio flow to +971 (optional).
