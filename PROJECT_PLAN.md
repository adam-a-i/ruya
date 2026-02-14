# Self-Improving Voice Sales Agent
**Hackathon Build - Revenue-Optimized Voice AI**

---

## The Problem

Most voice AI startups optimize for infrastructure metrics:
- ✅ Latency
- ✅ Voice realism
- ✅ Multilingual capability
- ✅ Model performance

**But businesses don't care about those metrics.**

### They care about conversion rate.

Today's voice agents are mostly **static**:
- They use a fixed prompt
- They don't learn from failed calls
- They don't adapt to objections
- They don't evolve based on outcomes

In high-value industries like **real estate**, this is inefficient. Each call represents potential revenue, but the agent behaves the same regardless of whether it closes the deal or fails.

**There is no closed feedback loop.**

---

## The Solution

We are building a **self-improving voice sales agent** that optimizes for revenue over time.

Instead of treating calls as isolated events, we treat them as **training signals**.

### The Improvement Loop

Each call goes through a continuous loop:

1. **Agent handles call** → Real-time conversation with lead
2. **Transcript is captured** → Full conversation recorded
3. **Outcome is recorded** → `booked` / `not booked`
4. **Transcript is analyzed** → LLM evaluation of performance
5. **Strategy updates are generated** → Structured improvements
6. **New agent version is deployed** → Updated conversational policy
7. **Conversion metrics are tracked** → Per-version performance monitoring

Over time, the agent improves its ability to convert leads.

### Key Insight

> This is **not** reinforcement learning at the model level.  
> This is **policy-level strategy mutation** driven by outcome data.

---

## How the Improvement Loop Works

### Step 1: Call Execution
The voice agent (real estate vertical) speaks to a lead and attempts to book a viewing.

### Step 2: Post-Call Analysis
We send the transcript to **GPT-4o** with a structured evaluation prompt.

It extracts:
- Objections raised
- Emotional shifts
- Engagement drop points
- Call structure weaknesses
- Estimated conversion probability
- Improvement suggestions

**Returns:** Structured JSON

### Step 3: Strategy Mutation
We take:
- Current agent strategy
- Last N call evaluations
- Conversion rate trends

We ask GPT-4o to generate **structured deltas**:
- Add new objection handling
- Shorten intro
- Adjust CTA timing
- Remove ineffective phrasing
- Tone modifications

We then update the strategy JSON and create a new agent version.

**Example Evolution:**
```
v1.0 → baseline
v1.1 → shorter intro
v1.2 → financing objection handling added
v1.3 → emotional rapport building enhanced
```

### Step 4: Performance Tracking
We track per-version:
- Total calls
- Total bookings
- Conversion rate

- Only strategy changes that correlate with **improved conversion** persist
- Underperforming versions can be rolled back

---

## Core Concept

We are **not** optimizing for realism or latency.

### We are optimizing for: **Revenue per call.**

This is a **closed-loop, outcome-driven, self-improving voice agent**.

---

## Tech Stack
*Optimized for 3-Hour Hackathon Build*

### Voice Layer
- **Vapi** - Call orchestration + transcripts
- **ElevenLabs** - Voice synthesis

### LLM
- **OpenAI GPT-4o**
  - Live agent prompt
  - Post-call analysis
  - Strategy mutation
  - *Single model for everything to reduce complexity*

### Backend
- **Node.js (Express)** or **Python (FastAPI)**
  - Webhook handler for call transcripts
  - Runs post-call analysis
  - Updates strategy
  - Stores data

### Database
- **Supabase (Postgres)**

#### Tables:

**`calls`**
```sql
id              UUID PRIMARY KEY
transcript      TEXT
outcome         TEXT  -- 'booked' | 'not_booked'
agent_version   TEXT
analysis_json   JSONB
created_at      TIMESTAMP
```

**`agent_versions`**
```sql
version           TEXT PRIMARY KEY
strategy_json     JSONB
total_calls       INTEGER
total_bookings    INTEGER
conversion_rate   FLOAT
created_at        TIMESTAMP
```

### What We're NOT Using
❌ No vector database  
❌ No RAG  
❌ No long-term semantic memory  
❌ No reinforcement learning  

✅ Just **structured strategy evolution**

---

## What Makes This Strong

1. ✅ **Clear feedback loop** - Every call improves the system
2. ✅ **Measurable improvement** - Conversion rate is the North Star metric
3. ✅ **Versioned conversational policy** - Track what works, rollback what doesn't
4. ✅ **Revenue-focused optimization** - Optimizing for business outcomes, not tech metrics
5. ✅ **Verticalized example** - Real estate = high-value, clear conversion events

### This is a self-improving revenue agent, not just a voice bot.

---

## Implementation Plan

### Phase 1: Setup & Infrastructure (30 minutes)

#### 1.1 Environment Setup
- [ ] Create project directory structure
- [ ] Initialize Node.js/Python project
- [ ] Set up environment variables file (`.env`)
  - `OPENAI_API_KEY`
  - `VAPI_API_KEY`
  - `ELEVENLABS_API_KEY`
  - `SUPABASE_URL`
  - `SUPABASE_KEY`
- [ ] Install dependencies

#### 1.2 Database Setup (Supabase)
- [ ] Create Supabase project
- [ ] Create `calls` table with schema
- [ ] Create `agent_versions` table with schema
- [ ] Set up database client connection
- [ ] Test connection

#### 1.3 Baseline Strategy
- [ ] Create initial `strategy.json` (v1.0)
  - Opening script
  - Qualification questions
  - Objection handling
  - Call-to-action script
  - Tone guidelines
- [ ] Insert v1.0 into `agent_versions` table

---

### Phase 2: Voice Agent Integration (45 minutes)

#### 2.1 Vapi Setup
- [ ] Create Vapi account and get API credentials
- [ ] Configure Vapi assistant with:
  - ElevenLabs voice selection
  - Dynamic system prompt from strategy JSON
  - Webhook endpoint for call completion
- [ ] Test basic call flow

#### 2.2 Dynamic Prompt Generation
- [ ] Create function to convert `strategy_json` → Vapi system prompt
- [ ] Implement version fetching (get latest active version)
- [ ] Test prompt updates reflect in Vapi

#### 2.3 Webhook Handler
- [ ] Create POST endpoint `/webhook/call-completed`
- [ ] Parse incoming call data:
  - Call ID
  - Transcript
  - Duration
  - Metadata
- [ ] Store raw data in `calls` table
- [ ] Trigger async analysis job

---

### Phase 3: Post-Call Analysis Engine (45 minutes)

#### 3.1 Analysis Prompt Engineering
- [ ] Design structured GPT-4o analysis prompt
  - Input: transcript + outcome
  - Output: JSON schema
    ```json
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

#### 3.2 Analysis Function
- [ ] Create `analyzeCall(transcript, outcome)` function
- [ ] Call OpenAI API with structured output
- [ ] Parse and validate response
- [ ] Store `analysis_json` in database
- [ ] Handle errors gracefully

#### 3.3 Testing
- [ ] Test with sample transcripts (booked)
- [ ] Test with sample transcripts (not booked)
- [ ] Verify JSON structure consistency

---

### Phase 4: Strategy Mutation Engine (45 minutes)

#### 4.1 Mutation Prompt Engineering
- [ ] Design strategy mutation prompt
  - Input: current strategy + last 10 analyses + conversion stats
  - Output: New strategy JSON with modifications
  - Constraint: Only make 1-3 targeted changes per iteration

#### 4.2 Mutation Logic
- [ ] Create `generateStrategyUpdate()` function
- [ ] Fetch current strategy version
- [ ] Fetch recent call analyses
- [ ] Calculate current conversion rate
- [ ] Call GPT-4o for strategy delta
- [ ] Merge changes into new strategy JSON
- [ ] Increment version number (v1.1 → v1.2)

#### 4.3 Version Management
- [ ] Insert new version into `agent_versions` table
- [ ] Update Vapi assistant with new strategy
- [ ] Log version change event

#### 4.4 Trigger Conditions
- [ ] Define when to mutate:
  - Option A: Every N calls (e.g., every 5 calls)
  - Option B: When conversion rate drops below threshold
  - Option C: Manual trigger endpoint
- [ ] Implement chosen trigger logic

---

### Phase 5: Performance Tracking & Dashboard (30 minutes)

#### 5.1 Metrics Calculation
- [ ] Create function to update version stats:
  - Count total calls per version
  - Count bookings per version
  - Calculate conversion rate
- [ ] Update `agent_versions` table after each call

#### 5.2 API Endpoints
- [ ] `GET /stats/overall` - Total system performance
- [ ] `GET /stats/versions` - Per-version comparison
- [ ] `GET /calls/recent` - Last 20 calls with outcomes
- [ ] `GET /strategy/current` - Active strategy JSON
- [ ] `POST /strategy/mutate` - Manual trigger for mutation

#### 5.3 Simple Dashboard (Optional)
- [ ] Create basic HTML page with fetch calls
- [ ] Display:
  - Current version
  - Conversion rate trend
  - Recent calls table
  - Strategy evolution timeline

---

### Phase 6: Testing & Demo Preparation (15 minutes)

#### 6.1 End-to-End Testing
- [ ] Simulate 5-10 calls with different outcomes
- [ ] Verify transcripts stored correctly
- [ ] Confirm analysis runs
- [ ] Trigger strategy mutation manually
- [ ] Verify new version deployed to Vapi
- [ ] Test version rollback (if implemented)

#### 6.2 Demo Script
- [ ] Prepare demo narrative:
  1. Show initial v1.0 strategy
  2. Make test calls with failures
  3. Show analysis identifying issues
  4. Trigger mutation
  5. Show v1.1 with improvements
  6. Make improved call
  7. Show conversion rate improvement

#### 6.3 Fallback Plans
- [ ] Prepare recorded call samples if live calls fail
- [ ] Have sample transcripts ready for analysis demo
- [ ] Pre-seed database with progression if needed

---

## Success Metrics

### For Hackathon Demo:
- ✅ Agent successfully handles calls
- ✅ Transcripts captured and stored
- ✅ Analysis extracts meaningful insights
- ✅ Strategy mutates based on feedback
- ✅ Conversion rate tracked per version
- ✅ Clear before/after improvement visible

### For Production (Future):
- Consistent conversion rate improvement over 100+ calls
- Automated A/B testing between versions
- Multi-vertical expansion (solar, insurance, B2B)
- Real-time strategy optimization

---

## File Structure

```
/ruya
├── README.md
├── PROJECT_PLAN.md (this file)
├── .env
├── package.json / requirements.txt
├── src/
│   ├── server.js / main.py
│   ├── services/
│   │   ├── vapi.js
│   │   ├── openai.js
│   │   ├── database.js
│   │   └── strategy.js
│   ├── routes/
│   │   ├── webhooks.js
│   │   └── api.js
│   ├── prompts/
│   │   ├── analysis.txt
│   │   └── mutation.txt
│   └── utils/
│       └── helpers.js
├── strategies/
│   ├── v1.0.json
│   ├── v1.1.json
│   └── ...
└── demo/
    └── dashboard.html
```

---

## Next Steps

1. **Start with Phase 1** - Get infrastructure ready
2. **Build incrementally** - Test each phase before moving on
3. **Focus on demo clarity** - Make the feedback loop visible
4. **Prioritize core loop** - Webhook → Analysis → Mutation → Deploy
5. **Keep it simple** - No over-engineering

---

## Questions to Resolve

- [ ] How do we manually mark outcomes? (Admin endpoint? Vapi metadata?)
- [ ] What's the minimum calls before first mutation? (5? 10?)
- [ ] Do we auto-deploy mutations or require approval?
- [ ] Real-estate script: residential or commercial focus?
- [ ] How do we demo this in 3 minutes?

---

**Let's build a revenue-optimizing voice agent that actually learns.**

🚀 **Time to ship.**
