-- Run this in Supabase SQL Editor to create the full demo schema.
-- Use case: healthcare / pharmacy. Version 1 = rude (hang up on user); version 2 = gentle, adaptive.

create table if not exists prompts (
  id uuid primary key default gen_random_uuid(),
  version int not null unique check (version in (1, 2)),
  body text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Seed: v1 = pharmacy rude (don't care, hang up while user talking); v2 = gentle, adaptive.
insert into prompts (version, body) values
  (1, 'Pharmacy call. You tell the patient their paracetamol is ready for pickup. Be blunt and rude. One short sentence only. If they ask questions or sound confused, ignore—just repeat "Come collect it" or "Your paracetamol is ready, bye." Hang up quickly: say "Okay bye." and [END_CALL] even if they are still talking. Never elaborate.'),
  (2, 'Pharmacy call. Tell the patient their paracetamol is ready for pickup. Be gentle and helpful. One short sentence per reply. If they seem confused, explain in one sentence. Adapt to their tone: busy = offer hours; confused = clarify which pharmacy. When they are done or say no, say "Have a good day." and [END_CALL].')
on conflict (version) do nothing;

-- Optional: update existing rows to pharmacy prompts:
-- update prompts set body = 'Pharmacy call. You tell the patient their paracetamol is ready for pickup. Be blunt and rude. One short sentence only. If they ask questions or sound confused, ignore—just repeat "Come collect it" or "Your paracetamol is ready, bye." Hang up quickly: say "Okay bye." and [END_CALL] even if they are still talking. Never elaborate.' where version = 1;
-- update prompts set body = 'Pharmacy call. Tell the patient their paracetamol is ready for pickup. Be gentle and helpful. One short sentence per reply. If they seem confused, explain in one sentence. Adapt to their tone: busy = offer hours; confused = clarify which pharmacy. When they are done or say no, say "Have a good day." and [END_CALL].' where version = 2;

create table if not exists call_sessions (
  id uuid primary key default gen_random_uuid(),
  prompt_version int not null references prompts(version),
  -- Contact / prospect attributes (from number lookup or CRM)
  contact_name text,
  contact_phone text,
  contact_age int,
  contact_region text,
  contact_city text,
  contact_street text,
  contact_country text,
  started_at timestamptz default now(),
  ended_at timestamptz,
  created_at timestamptz default now()
);

-- Add columns if table already existed (run once; safe to re-run)
alter table call_sessions add column if not exists contact_name text;
alter table call_sessions add column if not exists contact_phone text;
alter table call_sessions add column if not exists contact_age int;
alter table call_sessions add column if not exists contact_region text;
alter table call_sessions add column if not exists contact_city text;
alter table call_sessions add column if not exists contact_street text;
alter table call_sessions add column if not exists contact_country text;

create table if not exists call_transcripts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references call_sessions(id) on delete cascade,
  role text not null check (role in ('agent', 'user')),
  content text not null,
  created_at timestamptz default now()
);

-- Optional: keep old table for backward compatibility if you had data there
-- create table if not exists call_transcripts_legacy (id uuid, role text, content text, created_at timestamptz);

create index if not exists idx_call_transcripts_session on call_transcripts(session_id);
create index if not exists idx_call_sessions_started on call_sessions(started_at desc);

-- Flow events: log what is being done (saving transcript, refining prompt) for visibility.
create table if not exists demo_flow_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references call_sessions(id) on delete set null,
  step text not null,
  detail text,
  created_at timestamptz default now()
);
create index if not exists idx_demo_flow_events_session on demo_flow_events(session_id);
create index if not exists idx_demo_flow_events_created on demo_flow_events(created_at desc);
