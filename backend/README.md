# Ruya Backend (FastAPI)

## Run

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 3000
```

Backend runs on `http://localhost:3000`.

## Required Environment Variables (`backend/.env`)

- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_DEPLOYMENT_NAME` (e.g. `gpt-4o`)
- `AZURE_OPENAI_API_VERSION` (e.g. `2025-01-01-preview`)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY` (or legacy `service_role_key`)
- `VAPI_API_KEY` (or legacy `serversideAPIVapi`)
- `VAPI_ASSISTANT_ID` (or legacy `assistant_id`)
- `PORT` (optional, defaults to `3000`)

## Endpoints

- `GET /health`
- `POST /webhook/call-completed`
- `GET /api/stats/overall`
- `GET /api/stats/versions`
- `GET /api/calls/recent`
- `GET /api/strategy/current`
- `POST /api/strategy/mutate`
- `PATCH /api/calls/{id}/outcome`

## Database Setup

Run `backend/supabase-schema.sql` once in Supabase SQL Editor.
