# Demo pipeline API

Backend for the real demo: saves transcripts to Supabase and uses Azure OpenAI to improve the pitch and generate agent feedback.

## Setup

1. **Env**: Uses `../frontend/.env`. Ensure it has:
   - **Azure OpenAI:** `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT_NAME`, `AZURE_OPENAI_API_VERSION`
   - **Supabase:** `service_role_key`. Optional: `SUPABASE_URL` (e.g. `https://YOUR_REF.supabase.co`); if omitted, URL is derived from the JWT.
   - The **call step** is simulated (Twilio: set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_STUDIO_FLOW_SID, TWILIO_FROM_NUMBER in .env; use recovery code in Twilio Console to get/regenerate auth token. For real UAE calls you’d need a UAE-capable provider (e.g. Twilio with an international number).

2. **Supabase table**: Create the table so transcript save works. In the [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**, run the contents of `server/supabase-call_transcripts.sql` (creates `call_transcripts` with `id`, `role`, `content`, `created_at`). If you skip this, the demo still runs; transcript save will report "save failed (demo continues)".

3. **Install and run** (from repo root):
   ```powershell
   cd server
   npm install
   npm run dev
   ```
   On PowerShell avoid `&&`; run the three commands above one by one (or use `;` between them). Server runs on port 3001. Frontend (port 8080) proxies `/api` to it.

## Endpoints

- `POST /api/demo/start-call` — starts a Twilio Studio flow execution to +971 56 661 6884. Returns `{ ok, executionSid, to, from }` or `{ ok: false, error }`.
- `POST /api/demo/save-transcript` — body: `{ lines: [ { role, text } ] }`. Saves to `call_transcripts`.
- `POST /api/demo/improve-prompt` — body: `{ agentScript, clientResponse }`. Returns `{ improvedPrompt, agentFeedback, nextPitchSummary }` from Azure OpenAI.
