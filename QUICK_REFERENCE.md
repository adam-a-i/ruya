# ⚡ Quick Reference Card

## 🎯 What This Does
Self-improving voice agent that **optimizes for revenue**, not just tech metrics.
- Analyzes every call with AI
- Identifies what's not working
- Automatically improves strategy
- Deploys new versions
- Conversion rate increases over time

---

## 🚀 Quick Start (5 Steps)

### 1. Install Backend
```bash
cd backend && npm install
```

### 2. Setup Database
Go to https://supabase.com/dashboard → SQL Editor
Copy/paste contents of `backend/supabase-schema.sql` → Run

### 3. Start Backend
```bash
cd backend && npm start
# Should run on http://localhost:3000
```

### 4. Test It
```bash
cd backend && npm run test-webhook
# Simulates a call completion
```

### 5. View Dashboard
```bash
npm run dev
# Visit http://localhost:5173/dashboard
```

---

## 📞 Connect Real Vapi Calls

### Local Testing:
```bash
# Terminal 1: Backend
cd backend && npm start

# Terminal 2: ngrok
ngrok http 3000
# Copy HTTPS URL

# Terminal 3: Frontend
npm run dev
```

**Configure Vapi:**
- Dashboard: https://dashboard.vapi.ai
- Assistant ID: `your_vapi_assistant_id_here`
- Webhook URL: `https://YOUR-NGROK-URL.ngrok.io/webhook/call-completed`

---

## 🔑 Environment Variables

### Backend (`backend/.env`)
```env
AZURE_OPENAI_API_KEY=your_azure_openai_api_key_here
AZURE_OPENAI_ENDPOINT=https://kuecopenai.openai.azure.com
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
AZURE_OPENAI_API_VERSION=2025-01-01-preview
SUPABASE_URL=https://mtmcvxuxoifkcugqjcaa.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VAPI_API_KEY=your_vapi_api_key_here
VAPI_ASSISTANT_ID=your_vapi_assistant_id_here
PORT=3000
```

---

## 🛠️ Useful Commands

### Test Backend Health
```bash
curl http://localhost:3000/health
```

### View All Stats
```bash
curl http://localhost:3000/api/stats/overall | jq
```

### View Strategy Versions
```bash
curl http://localhost:3000/api/stats/versions | jq
```

### View Recent Calls
```bash
curl http://localhost:3000/api/calls/recent | jq
```

### View Current Strategy
```bash
curl http://localhost:3000/api/strategy/current | jq
```

### Force Strategy Mutation
```bash
curl -X POST http://localhost:3000/api/strategy/mutate
```

### Update Call Outcome
```bash
curl -X PATCH http://localhost:3000/api/calls/CALL_ID/outcome \
  -H "Content-Type: application/json" \
  -d '{"outcome": "booked"}'
```

---

## 🎭 Demo Script (8 minutes)

**1. Intro (1 min)**
- "Voice AI today optimizes for latency, not revenue"
- "We built an agent that learns from every call"

**2. Show Dashboard (1 min)**
- Open http://localhost:5173/dashboard
- Point to v1.0 baseline strategy
- "Zero bookings so far"

**3. Run Test Calls (2 min)**
```bash
# Run 3 times
npm run test-webhook
```
- Show calls appearing in dashboard
- Point out AI analysis: "Intro too long, objections not handled"

**4. Trigger Mutation (2 min)**
- Click "Force Mutation" button
- Show logs: "New strategy deployed: v1.1"
- Open strategy details, highlight changes

**5. Compare Before/After (1 min)**
```
v1.0: Generic greeting, weak objection handling
v1.1: Shorter intro, financing discussion added, flexible scheduling
```

**6. Show The Loop (1 min)**
- "Every 5 calls, it improves automatically"
- "Strategy v1.1 → v1.2 → v1.3..."
- "Conversion rate increases over time"

**7. Close**
- "Self-improving revenue agent"
- "Closed feedback loop"
- "Built in 3 hours"

---

## 🏗️ Architecture

```
User → Vapi → Webhook → Backend → Azure OpenAI
                            ↓
                        Supabase
                            ↓
                        Analysis
                            ↓
                   Strategy Mutation
                            ↓
                    Deploy to Vapi
```

---

## 📊 What Gets Tracked

### Per Call:
- Full transcript
- Duration
- Outcome (booked/not_booked)
- Objections raised
- Emotional tone
- Engagement score
- AI improvement suggestions

### Per Version:
- Total calls
- Total bookings
- Conversion rate
- Strategy changes made
- Performance vs previous version

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| Backend won't start | `cd backend && npm install` |
| Database error | Run SQL in Supabase SQL Editor |
| Webhook not working | Check ngrok URL in Vapi |
| No calls appearing | Test with `npm run test-webhook` |
| OpenAI error | Check API key and quota |

---

## 📁 Key Files

```
backend/
├── server.js              # Main backend (Express + AI logic)
├── supabase-schema.sql   # Database tables
├── scripts/
│   ├── test-webhook.js   # Test Vapi webhook
│   └── setup-database.js # DB setup helper
└── README.md             # Full backend docs

src/
└── pages/
    └── Dashboard.tsx     # React dashboard

Docs:
├── SETUP_GUIDE.md        # Complete setup instructions
├── PROJECT_PLAN.md       # Implementation plan
└── README.md             # Project overview
```

---

## 🎯 Success Metrics

**Before Ruya:**
- Static prompt
- Fixed strategy
- Flat conversion rate
- Manual optimization needed

**After Ruya:**
- Dynamic learning
- Auto-improving strategy
- Increasing conversion rate
- Fully automated

---

## 🚢 Deploy to Production

### Backend → Railway
```bash
railway login
cd backend && railway init && railway up
```

### Frontend → Vercel
```bash
vercel
```

### Update Vapi webhook to production URL

---

## 💡 Next Features
- [ ] A/B testing between versions
- [ ] Automated rollback if performance drops
- [ ] Multi-vertical support (solar, insurance)
- [ ] Real-time voice tone analysis
- [ ] CRM integration

---

## 🏆 Built For Hackathon 2026

**Team:** [Your Name]
**Tech:** Azure OpenAI GPT-4o, Vapi, Supabase, Node.js, React
**Time:** 3 hours
**Goal:** Optimize for revenue, not realism

---

**Questions? Check backend logs or read SETUP_GUIDE.md**
