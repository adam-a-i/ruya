# 🚀 Ruya - Self-Improving Voice Sales Agent

> **A voice AI that optimizes for revenue, not just realism.**

## Overview

Ruya is a self-improving voice sales agent that learns from every call to increase conversion rates. Unlike traditional voice bots with fixed prompts, Ruya analyzes call outcomes, identifies weaknesses, and automatically evolves its conversational strategy.

### The Problem
Most voice AI optimizes for infrastructure metrics (latency, realism, multilingual support). But businesses care about **conversion rate**. Traditional voice agents:
- Use fixed prompts
- Don't learn from failures
- Can't adapt to objections
- Don't evolve based on outcomes

### The Solution
Ruya creates a **closed feedback loop**:
1. Agent handles call
2. Transcript captured
3. Outcome recorded (booked/not booked)
4. AI analyzes what went wrong
5. Strategy automatically improves
6. New version deployed
7. Conversion rate increases over time

## Quick Start

### Prerequisites
- Node.js 18+ or Bun
- Azure OpenAI account with GPT-4o access
- Supabase account
- Vapi account

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Set Up Environment Variables

Create `backend/.env` with your credentials (already done ✅):

```env
AZURE_OPENAI_API_KEY=your_key
AZURE_OPENAI_ENDPOINT=your_endpoint
SUPABASE_URL=your_url
SUPABASE_SERVICE_KEY=your_key
VAPI_API_KEY=your_key
VAPI_ASSISTANT_ID=your_assistant_id
```

### 3. Set Up Database

**Option A: Supabase SQL Editor (Recommended)**
1. Go to https://supabase.com/dashboard
2. Open SQL Editor
3. Copy contents from `backend/supabase-schema.sql`
4. Run it

**Option B: Setup Script**
```bash
cd backend
npm run setup-db
```

### 4. Start Backend Server

```bash
cd backend
npm start
```

You should see:
```
🚀 Ruya Self-Improving Voice Agent Backend
✅ Server running on http://localhost:3000
```

### 5. Configure Vapi Webhook

**For Local Testing:**
```bash
# Install ngrok
brew install ngrok  # or download from ngrok.com

# Expose localhost
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Add to Vapi webhook: https://abc123.ngrok.io/webhook/call-completed
```

**Configure in Vapi Dashboard:**
1. Go to https://dashboard.vapi.ai
2. Select your assistant
3. Add Server URL: `https://your-ngrok-url.ngrok.io/webhook/call-completed`

### 6. Test It!

**Make a test call:**
```bash
cd backend
npm run test-webhook
```

**Check recent calls:**
```bash
curl http://localhost:3000/api/calls/recent
```

**View current strategy:**
```bash
curl http://localhost:3000/api/strategy/current
```

## How It Works

### The Improvement Loop

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📞 Call → 📝 Transcript → 📊 Analysis → 🧬 Mutation      │
│                                                             │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐│
│  │  Vapi    │──▶│ Webhook  │──▶│  Azure   │──▶│  Deploy  ││
│  │  Call    │   │ Handler  │   │  OpenAI  │   │  New Ver ││
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Strategy Evolution Example

**v1.0 (Baseline)**
- Generic greeting
- Standard objection handling
- Conversion rate: 15%

**v1.1 (After 5 failed calls)**
- Analysis: "Intro too long, price objection not addressed"
- Changes: Shorter greeting, added financing discussion
- Conversion rate: 22% ⬆️

**v1.2 (After 10 more calls)**
- Analysis: "Timing objection common, need flexibility"
- Changes: Added virtual tour option, flexible scheduling
- Conversion rate: 31% ⬆️

## Project Structure

```
ruya/
├── backend/
│   ├── server.js              # Main Express server
│   ├── package.json           # Dependencies
│   ├── supabase-schema.sql    # Database schema
│   ├── scripts/
│   │   ├── setup-database.js  # DB setup script
│   │   └── test-webhook.js    # Test script
│   └── README.md              # Backend docs
├── src/                       # React frontend (dashboard)
├── PROJECT_PLAN.md           # Implementation plan
└── CREDENTIALS_CHECKLIST.md  # Setup checklist
```

## API Endpoints

### Webhooks
- `POST /webhook/call-completed` - Receives call data from Vapi

### Statistics
- `GET /api/stats/overall` - System-wide metrics
- `GET /api/stats/versions` - Per-version performance
- `GET /api/calls/recent?limit=20` - Recent call history

### Strategy Management
- `GET /api/strategy/current` - Active agent strategy
- `POST /api/strategy/mutate` - Force strategy evolution

### Call Management
- `PATCH /api/calls/:id/outcome` - Update call outcome

## Database Schema

### `agent_versions` Table
Stores different versions of conversational strategy:
- `version` - Version identifier (v1.0, v1.1, etc.)
- `strategy_json` - Full strategy configuration
- `total_calls` - Number of calls handled
- `total_bookings` - Successful conversions
- `conversion_rate` - Success percentage
- `is_active` - Currently deployed version

### `calls` Table
Stores each call with analysis:
- `transcript` - Full conversation text
- `outcome` - booked / not_booked / pending
- `agent_version` - Which strategy was used
- `analysis_json` - AI-generated insights
- `duration_seconds` - Call length

## Technology Stack

- **Voice**: Vapi (orchestration + transcription)
- **LLM**: Azure OpenAI GPT-4o (analysis + mutation)
- **Backend**: Node.js + Express
- **Database**: Supabase (Postgres)
- **Frontend**: React + TypeScript + Vite

## Deployment

### Deploy Backend

**Railway:**
```bash
railway init
railway up
```

**Render:**
1. Connect GitHub repo
2. Add environment variables
3. Deploy

**Fly.io:**
```bash
fly launch
fly deploy
```

### Update Vapi Webhook
Replace ngrok URL with your production URL:
`https://your-app.railway.app/webhook/call-completed`

## Demo Script

**For presentations:**

1. Show baseline strategy (v1.0)
2. Make 3-5 test calls with objections
3. Show analysis identifying issues
4. Trigger mutation (automatic or manual)
5. Show new v1.1 strategy with improvements
6. Make successful call with new strategy
7. Show conversion rate improvement in dashboard

## Monitoring

**Check system health:**
```bash
curl http://localhost:3000/health
```

**View logs:**
```bash
# Backend will show:
📞 Call completed webhook received
✅ Call stored
🔍 Starting analysis
✅ Analysis complete
🔄 Mutation threshold reached
✨ New strategy deployed: v1.1
```

## Troubleshooting

### "No active agent version found"
Run database setup script: `npm run setup-db`

### Webhook not receiving calls
- Check ngrok is running
- Verify webhook URL in Vapi dashboard
- Check backend logs for errors

### Azure OpenAI errors
- Verify API key and endpoint in `.env`
- Check deployment name matches GPT-4o
- Ensure quota is not exceeded

## Roadmap

- [ ] Multi-vertical support (solar, insurance, B2B)
- [ ] A/B testing between strategy versions
- [ ] Real-time dashboard with live metrics
- [ ] Automated rollback for underperforming versions
- [ ] Voice tone analysis and optimization
- [ ] Integration with CRM systems

## Contributing

This is a hackathon project. Contributions welcome!

## License

MIT

---

**Built with 🚀 for Hackathon 2026**

*Optimizing for revenue, not infrastructure.*
