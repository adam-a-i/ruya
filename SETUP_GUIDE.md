# 🚀 Complete Setup Guide

## Step-by-Step Instructions

### ✅ What You Have
- ✅ Azure OpenAI credentials (GPT-4o)
- ✅ Supabase database URL and keys
- ✅ Vapi API key and assistant ID
- ✅ Backend code complete
- ✅ Frontend dashboard created
- ✅ Database schema ready

### 📋 Next Steps to Get Running

## 1. Install Backend Dependencies

```bash
cd backend
npm install
```

**This will install:**
- express (web server)
- @supabase/supabase-js (database client)
- @azure/openai (AI analysis)
- dotenv (environment variables)
- cors (API security)

## 2. Set Up Supabase Database

**Go to Supabase SQL Editor:**
1. Visit: https://supabase.com/dashboard/project/mtmcvxuxoifkcugqjcaa/sql
2. Create a new query
3. Copy the entire contents of `backend/supabase-schema.sql`
4. Paste and click **RUN**

**This creates:**
- `agent_versions` table (stores strategy versions)
- `calls` table (stores call transcripts and analyses)
- Baseline v1.0 strategy
- Automatic triggers to update stats

## 3. Start the Backend Server

```bash
cd backend
npm start
```

**You should see:**
```
🚀 Ruya Self-Improving Voice Agent Backend
===========================================
✅ Server running on http://localhost:3000
✅ Azure OpenAI: https://kuecopenai.openai.azure.com
✅ Supabase: https://mtmcvxuxoifkcugqjcaa.supabase.co
✅ Vapi Assistant: [configured in .env]
```

## 4. Test Backend with Sample Call

**Open a new terminal and run:**
```bash
cd backend
npm run test-webhook
```

**This simulates a Vapi webhook with a test call transcript.**

**Check if it worked:**
```bash
curl http://localhost:3000/api/calls/recent
```

You should see the test call stored in the database!

## 5. Configure Vapi Webhook (for Real Calls)

**For local testing, use ngrok:**

```bash
# Install ngrok (if not already installed)
brew install ngrok
# or download from https://ngrok.com

# Start ngrok tunnel
ngrok http 3000
```

**Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)**

**Configure in Vapi:**
1. Go to: https://dashboard.vapi.ai
2. Find your assistant ID in Vapi dashboard
3. Look for "Server URL" or "Webhooks" settings
4. Set webhook URL to: `https://abc123.ngrok.io/webhook/call-completed`
5. Save

## 6. Start the Frontend Dashboard

**In a new terminal:**
```bash
# From project root
npm run dev
```

**Visit:** http://localhost:5173/dashboard

**You should see:**
- Total calls: 1 (from test)
- Strategy version: v1.0
- Recent calls with analysis
- Ability to trigger mutations

## 7. Make Real Test Calls

**Option A: Call Vapi Phone Number**
- If you have a Vapi phone number, call it
- Have a conversation with the agent
- Watch the backend logs for webhook

**Option B: Web Call (if configured)**
- Use Vapi's web interface
- Trigger a call through their dashboard

**After each call:**
1. Check backend logs: `📞 Call completed webhook received`
2. View dashboard: http://localhost:5173/dashboard
3. See new call appear with AI analysis

## 8. Trigger Strategy Mutation

**Automatic Trigger:** Every 5 calls, the system automatically:
1. Analyzes last 10 calls
2. Identifies weaknesses
3. Generates improved strategy
4. Deploys new version to Vapi

**Manual Trigger (for demo):**
```bash
curl -X POST http://localhost:3000/api/strategy/mutate
```

Or use the dashboard button: "Force Mutation"

**Check new version:**
```bash
curl http://localhost:3000/api/strategy/current
```

## 9. Monitor Improvements

**Dashboard shows:**
- Conversion rate per version
- Strategy evolution (v1.0 → v1.1 → v1.2)
- Call analysis (objections, tone, engagement)
- Real-time metrics

## Architecture Flow

```
┌──────────────────────────────────────────────────────────────┐
│                     IMPROVEMENT LOOP                          │
└──────────────────────────────────────────────────────────────┘

1. User calls Vapi number
   ↓
2. Vapi handles call with current strategy
   ↓
3. Call ends, Vapi sends webhook to backend
   ↓
4. Backend stores transcript in Supabase
   ↓
5. Azure OpenAI analyzes call (objections, tone, weaknesses)
   ↓
6. Every 5 calls: Generate new strategy based on analyses
   ↓
7. Deploy new strategy to Vapi
   ↓
8. Next call uses improved strategy
   ↓
9. Conversion rate increases over time ↗️
```

## API Endpoints Reference

### Health Check
```bash
curl http://localhost:3000/health
```

### Get Overall Stats
```bash
curl http://localhost:3000/api/stats/overall
```

### Get All Versions
```bash
curl http://localhost:3000/api/stats/versions
```

### Get Recent Calls
```bash
curl http://localhost:3000/api/calls/recent?limit=10
```

### Get Current Strategy
```bash
curl http://localhost:3000/api/strategy/current
```

### Force Strategy Mutation
```bash
curl -X POST http://localhost:3000/api/strategy/mutate
```

### Update Call Outcome
```bash
curl -X PATCH http://localhost:3000/api/calls/[call-id]/outcome \
  -H "Content-Type: application/json" \
  -d '{"outcome": "booked"}'
```

## Demo Presentation Flow

**For hackathon judging:**

### 1. Show The Problem (2 min)
- "Traditional voice agents use fixed prompts"
- "They don't learn from failures"
- "Conversion rates stay flat"

### 2. Show Ruya Dashboard (2 min)
- Open: http://localhost:5173/dashboard
- Show baseline v1.0 strategy
- Current stats: 0 conversions

### 3. Simulate Failed Calls (2 min)
- Run test webhook 3-5 times
- Show calls appearing in dashboard
- Point out AI analysis identifying issues
- "Notice: price objections, timing concerns"

### 4. Trigger Mutation (1 min)
- Click "Force Mutation" button
- Show backend logs generating new strategy
- Display v1.1 with improvements

### 5. Compare Strategies (1 min)
- Side-by-side v1.0 vs v1.1
- Highlight specific changes:
  - ✅ Shortened intro
  - ✅ Better objection handling
  - ✅ Added flexibility

### 6. Show Results (1 min)
- Point to increasing conversion rate
- "This continues automatically"
- "Agent improves with every call"

### 7. Close (30 sec)
- "Optimizing for revenue, not just realism"
- "Closed feedback loop"
- "Self-improving sales agent"

## Troubleshooting

### Backend won't start
```bash
# Check Node.js version
node --version  # Should be 18+

# Reinstall dependencies
cd backend
rm -rf node_modules package-lock.json
npm install
```

### Database errors
- Make sure you ran the SQL schema in Supabase
- Check service_role_key in backend/.env
- Verify Supabase URL is correct

### Vapi webhook not working
- Ensure ngrok is running
- Check webhook URL in Vapi dashboard
- Look for errors in backend logs
- Test with: `npm run test-webhook`

### Azure OpenAI errors
- Verify API key is correct
- Check deployment name (should be gpt-4o)
- Ensure you have quota available

### Frontend can't connect to backend
- Check backend is running on port 3000
- Verify VITE_API_BASE in frontend .env
- Check CORS is enabled in backend

## Production Deployment

### Backend Deployment (Railway)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
cd backend
railway init
railway up

# Add environment variables in Railway dashboard
# Update Vapi webhook to Railway URL
```

### Frontend Deployment (Vercel)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Update VITE_API_BASE to Railway URL
```

## Files Created

```
ruya/
├── backend/
│   ├── server.js                    # Main Express server ✅
│   ├── package.json                 # Dependencies ✅
│   ├── supabase-schema.sql         # Database schema ✅
│   ├── scripts/
│   │   ├── setup-database.js       # DB setup helper ✅
│   │   └── test-webhook.js         # Test script ✅
│   └── README.md                   # Backend docs ✅
├── src/
│   ├── pages/
│   │   └── Dashboard.tsx           # Live metrics dashboard ✅
│   └── App.tsx                     # Updated with routes ✅
├── PROJECT_PLAN.md                 # Implementation plan ✅
├── CREDENTIALS_CHECKLIST.md        # API setup guide ✅
└── README.md                       # Main docs ✅
```

## Success Checklist

- [ ] Backend dependencies installed
- [ ] Database tables created in Supabase
- [ ] Backend server running on :3000
- [ ] Test webhook successful
- [ ] ngrok tunnel running (for local Vapi)
- [ ] Vapi webhook configured
- [ ] Frontend dashboard accessible
- [ ] Made 5+ test calls
- [ ] Strategy mutation triggered
- [ ] New version (v1.1+) deployed
- [ ] Conversion rate tracking working

## You're Ready! 🎉

Your self-improving voice agent is now:
- ✅ Receiving calls from Vapi
- ✅ Analyzing transcripts with AI
- ✅ Learning from failures
- ✅ Automatically improving strategies
- ✅ Tracking conversion rates
- ✅ Evolving over time

**Every call makes it better.**

---

Questions? Check the backend logs or open an issue!
