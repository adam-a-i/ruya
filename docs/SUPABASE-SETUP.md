# Supabase setup for the demo

Follow these steps to set up Supabase so the demo (prompts, sessions, transcripts) works.

---

## 1. Create or open a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. **New project:** Click **New project** → pick org → set name, DB password, region → **Create**.
3. **Existing project:** Open your project from the dashboard.

---

## 2. Get your credentials

1. In the project, go to **Settings** (gear) → **API**.
2. Note:
   - **Project URL** (e.g. `https://xxxxxxxx.supabase.co`) → you’ll use this as `SUPABASE_URL`.
   - **Project API keys** → under **Service role** (not anon), click **Reveal** and copy the key.  
     This is the **service_role** secret (long JWT). The server uses it to read/write tables.

---

## 3. Put them in `frontend/.env`

The backend loads env from `frontend/.env`. Add or update:

```env
# Required for the demo backend
service_role_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....your-service-role-jwt....

# Optional: explicit project URL (if you omit it, the server derives it from the JWT)
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
```

- Replace `....your-service-role-jwt....` with the **Service role** key from step 2.
- Replace `YOUR_PROJECT_REF` with your project ref (from the URL, e.g. `mtmcvxuxoifkcugqjcaa`).  
  If you leave out `SUPABASE_URL`, the server will infer the URL from the JWT; you only need it if that fails.

---

## 4. Run the schema in the SQL Editor

1. In Supabase, open **SQL Editor**.
2. Open the file **`server/supabase-schema.sql`** in your repo and copy its **entire** contents.
3. Paste into the SQL Editor.
4. Click **Run** (or press Ctrl+Enter).

You should see “Success. No rows returned” (or similar). This will:

- Create **`prompts`** (version 1 = baseline, version 2 = refined) and insert the two seed rows.
- Create **`call_sessions`** (with contact fields: name, phone, age, region, city, street, country).
- Create **`call_transcripts`** (session_id, role, content).
- Add indexes. If the tables already exist, the `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` lines add any missing contact columns.

---

## 5. Confirm tables exist

1. Go to **Table Editor** in Supabase.
2. You should see:
   - **prompts** — 2 rows (version 1 and 2).
   - **call_sessions** — empty (rows appear when you start a call in the demo).
   - **call_transcripts** — empty (rows appear as the conversation is saved).

---

## 6. Restart the server

After changing `.env` or the schema:

```powershell
cd server
npm run dev
```

Then use the **/demo** page: start a call, talk, end call, refine prompt, call again. Data will be stored in Supabase.

---

## Troubleshooting

| Issue | What to do |
|--------|------------|
| “Supabase not configured” | Ensure `service_role_key` is set in `frontend/.env` and the server was restarted. |
| “Table call_sessions not found” | Run **`server/supabase-schema.sql`** in the SQL Editor (step 4). |
| “relation "prompts" does not exist” | Same: run the full schema SQL. |
| 401 / permission errors | You must use the **service_role** key (secret), not the anon key. Never expose the service_role key in the frontend; only the backend should use it. |

---

## Summary

1. Create/open project → **Settings → API** → copy **Project URL** and **Service role** key.  
2. Put **`service_role_key`** (and optionally **`SUPABASE_URL`**) in **`frontend/.env`**.  
3. **SQL Editor** → paste and run **`server/supabase-schema.sql`**.  
4. Restart **`npm run dev`** in `server/`.  
5. Use **/demo** and confirm data in **Table Editor**.
