# 🎨 System Architecture & Flow Diagrams

## 🔄 The Improvement Loop (High Level)

```
┌────────────────────────────────────────────────────────────────┐
│                    SELF-IMPROVING LOOP                          │
└────────────────────────────────────────────────────────────────┘

    📞 Call Happens
         ↓
    📝 Transcript Captured
         ↓
    💾 Stored in Database
         ↓
    🤖 AI Analyzes Call
         ↓
    📊 Identifies Weaknesses
         ↓
    🧬 Generates Better Strategy
         ↓
    🚀 Deploys New Version
         ↓
    📈 Conversion Rate ↑
         ↓
    🔁 Repeat...
```

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER LAYER                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────────────┐
                    │   Vapi Voice    │  (Handles voice call)
                    │   AI Platform   │  (Transcription + TTS)
                    └─────────────────┘
                              ↓
                              │ Webhook (Call Completed)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND LAYER                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Express Server (Node.js)                                 │  │
│  │  ─────────────────────────────                            │  │
│  │  • Receives webhook from Vapi                             │  │
│  │  • Stores transcript in database                          │  │
│  │  • Triggers AI analysis                                   │  │
│  │  • Manages strategy versions                              │  │
│  │  • Serves API endpoints                                   │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
           ↓                              ↓
   ┌───────────────┐            ┌──────────────────┐
   │   Supabase    │            │  Azure OpenAI    │
   │  (Database)   │            │    (GPT-4o)      │
   │               │            │                  │
   │  • calls      │            │  • Analyze call  │
   │  • versions   │            │  • Generate new  │
   │               │            │    strategy      │
   └───────────────┘            └──────────────────┘
           ↓
   ┌───────────────┐
   │  Dashboard    │  (React Frontend)
   │  (Metrics)    │  View improvements
   └───────────────┘
```

---

## 📊 Data Flow

### 1. Call Completion Flow

```
┌──────┐       ┌──────┐       ┌──────────┐       ┌──────────┐
│ User │──────▶│ Vapi │──────▶│ Backend  │──────▶│ Supabase │
└──────┘       └──────┘       └──────────┘       └──────────┘
  talks         handles          webhook            stores
  to agent      call             receives           transcript
                                 data
```

### 2. Analysis Flow

```
┌──────────┐       ┌───────────────┐       ┌──────────┐
│ Supabase │──────▶│ Azure OpenAI  │──────▶│ Supabase │
└──────────┘       └───────────────┘       └──────────┘
  fetch              analyze call           store
  transcript         with GPT-4o            analysis
```

### 3. Mutation Flow

```
┌──────────┐       ┌───────────────┐       ┌──────────┐
│ Backend  │──────▶│ Azure OpenAI  │──────▶│ Supabase │
└──────────┘       └───────────────┘       └──────────┘
  trigger            generate new           store new
  mutation           strategy               version
      ↓
┌──────────┐
│   Vapi   │  ←─── Deploy new strategy
└──────────┘
```

---

## 🗄️ Database Schema

```
┌─────────────────────────────────────────┐
│          agent_versions                  │
├─────────────────────────────────────────┤
│  id              UUID PRIMARY KEY        │
│  version         TEXT (v1.0, v1.1...)   │
│  strategy_json   JSONB                   │
│  total_calls     INTEGER                 │
│  total_bookings  INTEGER                 │
│  conversion_rate FLOAT                   │
│  is_active       BOOLEAN                 │
│  created_at      TIMESTAMP               │
└─────────────────────────────────────────┘
                    ↑
                    │ (foreign key)
                    │
┌─────────────────────────────────────────┐
│              calls                       │
├─────────────────────────────────────────┤
│  id              UUID PRIMARY KEY        │
│  vapi_call_id    TEXT                    │
│  agent_version   TEXT → agent_versions  │
│  transcript      TEXT                    │
│  outcome         TEXT (booked/not)      │
│  duration_sec    INTEGER                 │
│  analysis_json   JSONB                   │
│  created_at      TIMESTAMP               │
└─────────────────────────────────────────┘
```

---

## 🧠 AI Analysis Process

```
Input: Call Transcript + Outcome
         ↓
┌────────────────────────────────┐
│     Azure OpenAI GPT-4o        │
│  (Structured JSON Response)    │
└────────────────────────────────┘
         ↓
Output JSON:
{
  "objections": ["price", "timing"],
  "emotional_tone": "skeptical",
  "engagement_score": 6,
  "conversion_probability": 0.3,
  "strengths": ["rapport building"],
  "weaknesses": ["too aggressive CTA"],
  "improvement_suggestions": [...]
}
```

---

## 🧬 Strategy Mutation Process

```
Inputs:
├─ Current Strategy (v1.0)
├─ Last 10 Call Analyses
└─ Current Conversion Rate (15%)
         ↓
┌────────────────────────────────┐
│     Azure OpenAI GPT-4o        │
│   (Strategy Optimizer)         │
└────────────────────────────────┘
         ↓
Output JSON:
{
  "changes_made": [
    "Shortened intro by 30%",
    "Added financing objection handling",
    "More flexible scheduling options"
  ],
  "reasoning": "Analysis showed...",
  "new_strategy": {
    "version": "v1.1",
    "opening": {...},
    "objection_handling": {...},
    ...
  }
}
         ↓
Deploy to Vapi → Next call uses v1.1
```

---

## 📈 Performance Tracking

```
v1.0 (Baseline)
├─ Calls: 10
├─ Bookings: 2
└─ Conversion: 20%

      ↓ (mutation based on analysis)

v1.1 (Improved)
├─ Calls: 10
├─ Bookings: 3
└─ Conversion: 30% ↑

      ↓ (mutation based on analysis)

v1.2 (Further Improved)
├─ Calls: 10
├─ Bookings: 4
└─ Conversion: 40% ↑
```

---

## 🎯 Trigger Logic

```
After each call:
  ├─ Store transcript
  ├─ Analyze with AI
  ├─ Update stats
  └─ Check: total_calls % 5 == 0?
       ├─ YES → Trigger mutation
       │         ├─ Fetch last 10 analyses
       │         ├─ Generate new strategy
       │         ├─ Create new version
       │         ├─ Deploy to Vapi
       │         └─ Deactivate old version
       └─ NO  → Continue with current strategy
```

---

## 🔌 API Endpoints Map

```
GET  /health
     └─ Health check

GET  /api/stats/overall
     └─ System-wide metrics

GET  /api/stats/versions
     └─ Per-version performance

GET  /api/calls/recent?limit=20
     └─ Recent call history

GET  /api/strategy/current
     └─ Active strategy JSON

POST /api/strategy/mutate
     └─ Force strategy evolution

PATCH /api/calls/:id/outcome
     └─ Update call outcome

POST /webhook/call-completed
     └─ Vapi webhook endpoint
```

---

## 🎭 Demo Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    DEMO SEQUENCE                         │
└─────────────────────────────────────────────────────────┘

1. Show Dashboard
   └─ v1.0, 0 conversions

2. Run 5 Test Calls
   ├─ npm run test-webhook (x5)
   └─ Show calls appearing with analysis

3. AI Identifies Issues
   └─ "Intro too long, price objection not handled"

4. Trigger Mutation
   ├─ Click "Force Mutation"
   └─ Backend generates v1.1

5. Show Improvements
   └─ Compare v1.0 vs v1.1 strategies

6. Demonstrate Conversion
   └─ v1.0: 20% → v1.1: 35% (simulated)

7. Explain Self-Improvement
   └─ "This happens automatically every 5 calls"
```

---

## 🚀 Deployment Architecture

```
┌─────────────────────────────────────────┐
│          Production Setup                │
└─────────────────────────────────────────┘

Frontend (Vercel)
  └─ React Dashboard
       ↓ API Calls
Backend (Railway/Render/Fly.io)
  └─ Express Server
       ↓
       ├→ Supabase (managed)
       ├→ Azure OpenAI (managed)
       └→ Vapi (managed)
```

---

## 🔐 Security Flow

```
Vapi Webhook
     ↓
Express Middleware
  ├─ CORS check
  ├─ Body parser
  └─ Error handler
     ↓
Supabase Client
  └─ Service role key (server-side only)
     ↓
Azure OpenAI
  └─ API key (server-side only)
```

---

## 🧪 Testing Flow

```
Local Development:
  ├─ Backend: localhost:3000
  ├─ Frontend: localhost:5173
  └─ ngrok: public HTTPS tunnel
       └─ Connects to Vapi

Test Script:
  └─ npm run test-webhook
       ├─ Sends mock call data
       ├─ Triggers analysis
       └─ Updates database
```

---

## 📊 Metrics Visualization

```
Dashboard Components:
├─ Overall Stats Cards
│  ├─ Total Calls
│  ├─ Total Bookings
│  ├─ Conversion Rate
│  └─ Version Count
│
├─ Version History
│  ├─ v1.0 (20%)
│  ├─ v1.1 (28%) ↑
│  └─ v1.2 (35%) ↑
│
└─ Recent Calls
   ├─ Transcript
   ├─ Outcome
   ├─ Analysis
   └─ Engagement Score
```

---

## 🎯 Success Metrics

```
Before Ruya:
├─ Fixed strategy
├─ Manual optimization
├─ Slow iteration
└─ Static performance

After Ruya:
├─ Dynamic strategy ✅
├─ Auto optimization ✅
├─ Rapid iteration ✅
└─ Improving performance ✅
```

---

**All diagrams represent the actual implementation in this project.**
