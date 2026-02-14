# ✅ Action Checklist - Start Here!

## 🎯 Your Mission
Get the self-improving voice agent running in **15 minutes**.

---

## Step 1️⃣: Install Backend Dependencies (2 min)

```bash
cd /Users/adamahmed/73/ruya/backend
npm install
```

**Expected output:**
```
added 150 packages in 30s
```

**✅ Check:** Should complete without errors

---

## Step 2️⃣: Set Up Database (3 min)

### Option A: Supabase SQL Editor (Recommended)

1. Open: https://supabase.com/dashboard/project/mtmcvxuxoifkcugqjcaa/sql
2. Click **New Query**
3. Open file: `/Users/adamahmed/73/ruya/backend/supabase-schema.sql`
4. Copy all contents (Cmd+A, Cmd+C)
5. Paste into SQL Editor
6. Click **RUN** (or press Cmd+Enter)

**Expected output:**
```
Success. No rows returned.
```

**✅ Check:** No errors in output

### Option B: Setup Script

```bash
cd /Users/adamahmed/73/ruya/backend
node scripts/setup-database.js
```

---

## Step 3️⃣: Start Backend Server (1 min)

```bash
cd /Users/adamahmed/73/ruya/backend
npm start
```

**Expected output:**
```
🚀 Ruya Self-Improving Voice Agent Backend
===========================================
✅ Server running on http://localhost:3000
✅ Azure OpenAI: https://kuecopenai.openai.azure.com
✅ Supabase: https://mtmcvxuxoifkcugqjcaa.supabase.co
✅ Vapi Assistant: abf264bb-58cf-410c-845e-764b27c51677
```

**✅ Check:** Server starts without errors

**Leave this terminal running!**

---

## Step 4️⃣: Test Backend (2 min)

**Open a NEW terminal:**

```bash
# Test health endpoint
curl http://localhost:3000/health
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-14T...",
  "service": "Ruya Self-Improving Voice Agent"
}
```

**✅ Check:** Returns OK status

---

## Step 5️⃣: Run Test Webhook (2 min)

```bash
cd /Users/adamahmed/73/ruya/backend
npm run test-webhook
```

**Expected output:**
```
🧪 Testing Vapi Webhook...
📍 Webhook URL: http://localhost:3000/webhook/call-completed
📞 Simulating call completion...

✅ Webhook test successful!
```

**✅ Check:** Test completes successfully

---

## Step 6️⃣: Verify Data Stored (1 min)

```bash
curl http://localhost:3000/api/calls/recent
```

**Expected response:**
```json
{
  "calls": [
    {
      "id": "...",
      "transcript": "Agent: Hi! This is Sarah...",
      "outcome": "not_booked",
      "agent_version": "v1.0",
      ...
    }
  ]
}
```

**✅ Check:** Test call appears in database

---

## Step 7️⃣: Start Frontend Dashboard (2 min)

**Open a NEW terminal:**

```bash
cd /Users/adamahmed/73/ruya
npm run dev
```

**Expected output:**
```
  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

**✅ Check:** Frontend starts on port 5173

---

## Step 8️⃣: View Dashboard (1 min)

1. Open browser: http://localhost:5173/dashboard
2. You should see:
   - Total Calls: 1
   - Total Bookings: 0
   - Conversion Rate: 0%
   - Strategy Version: v1.0
   - Recent call in the list

**✅ Check:** Dashboard loads and shows test call

---

## Step 9️⃣: Connect Vapi (Optional - For Real Calls) (5 min)

### Install ngrok (if not already installed)

```bash
brew install ngrok
# or download from https://ngrok.com
```

### Start ngrok tunnel

**Open a NEW terminal:**

```bash
ngrok http 3000
```

**Expected output:**
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

**Copy the HTTPS URL!**

### Configure Vapi Webhook

1. Go to: https://dashboard.vapi.ai
2. Find your assistant: `abf264bb-58cf-410c-845e-764b27c51677`
3. Look for **Server URL** or **Webhooks** section
4. Paste: `https://your-ngrok-url.ngrok.io/webhook/call-completed`
5. Save

**✅ Check:** Webhook URL saved in Vapi

---

## Step 🔟: Make Test Call (Optional - If Vapi Connected)

1. Call your Vapi phone number
2. Have a conversation with the agent
3. Watch backend terminal for:
   ```
   📞 Call completed webhook received
   ✅ Call stored
   🔍 Starting analysis
   ```
4. Refresh dashboard to see new call

**✅ Check:** Real call appears in dashboard

---

## 🎉 Success Checklist

At this point, you should have:

- [ ] ✅ Backend running on :3000
- [ ] ✅ Database tables created
- [ ] ✅ Test call stored
- [ ] ✅ Frontend dashboard on :5173
- [ ] ✅ Can view metrics
- [ ] ✅ Can view call history
- [ ] ⬜ ngrok tunnel (optional)
- [ ] ⬜ Vapi webhook configured (optional)

---

## 🚨 Troubleshooting

### Backend won't start
```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill process if needed
kill -9 [PID]

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Database errors
- Make sure you ran the SQL in Supabase
- Check `SUPABASE_URL` in backend/.env
- Verify `SUPABASE_SERVICE_KEY` is correct

### Test webhook fails
- Ensure backend is running
- Check no firewall blocking localhost
- Try: `curl http://localhost:3000/health`

### Frontend can't connect
- Verify backend is on :3000
- Check for CORS errors in browser console
- Create `.env` in root with: `VITE_API_BASE=http://localhost:3000`

### ngrok issues
- Make sure ngrok is installed: `ngrok version`
- Backend must be running first
- Use the HTTPS URL, not HTTP

---

## 🎯 Quick Test Commands

```bash
# Health check
curl http://localhost:3000/health

# Current strategy
curl http://localhost:3000/api/strategy/current | jq

# Overall stats
curl http://localhost:3000/api/stats/overall | jq

# Recent calls
curl http://localhost:3000/api/calls/recent | jq

# Force mutation
curl -X POST http://localhost:3000/api/strategy/mutate
```

---

## 📱 What to Watch

### Backend Terminal:
```
📞 Call completed webhook received
✅ Call stored: abc-123
🔍 Starting analysis for call: abc-123
✅ Analysis complete for call: abc-123
🔄 Mutation threshold reached!
✨ New strategy deployed: v1.1
```

### Dashboard:
- Total calls increasing
- Conversion rate updating
- New strategy versions appearing
- Call analysis showing

---

## 🎬 Demo Mode

Want to simulate the full demo quickly?

```bash
# Terminal 1: Backend
cd backend && npm start

# Terminal 2: Run 5 test calls
for i in {1..5}; do
  npm run test-webhook
  sleep 2
done

# This will:
# 1. Store 5 calls
# 2. Trigger automatic mutation
# 3. Create v1.1 strategy
# 4. Show in dashboard
```

---

## 🚀 Next Steps

After completing this checklist:

1. **For Demo:** Use `test-webhook` to simulate calls
2. **For Real Testing:** Connect Vapi with ngrok
3. **For Production:** Deploy to Railway/Vercel
4. **For Learning:** Read `ARCHITECTURE.md`

---

## 📚 Documentation Reference

- **Setup Guide:** `SETUP_GUIDE.md` - Complete instructions
- **Quick Reference:** `QUICK_REFERENCE.md` - Commands & API
- **Architecture:** `ARCHITECTURE.md` - System diagrams
- **Project Plan:** `PROJECT_PLAN.md` - Implementation details
- **Summary:** `PROJECT_SUMMARY.md` - What we built

---

## ✅ You're Ready!

Once all steps are complete, you have a fully functional self-improving voice agent!

**Time to impress the judges! 🏆**

---

**Having issues? Check the terminal logs or read SETUP_GUIDE.md**
