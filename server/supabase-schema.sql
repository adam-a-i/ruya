-- Run this in Supabase SQL Editor to create the full demo schema.
-- Prompts: version 1 = baseline (shitty), version 2 = refined (good) after first call.

create table if not exists prompts (
  id uuid primary key default gen_random_uuid(),
  version int not null unique check (version in (1, 2)),
  body text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Seed baseline (shitty) and refined prompt. Short. Flow: speak first; no thanks → insist once + offer to go over; no again → goodbye + hang up.
insert into prompts (version, body) values
  (1, 'Real estate agent. Speak first: short greeting + one-line pitch. If they say "no thanks": insist once briefly, then ask "Would you like me to go over one quick option?" If they say no again: say "Have a good day." and end with [END_CALL]. Keep every reply 1-2 sentences.'),
  (2, 'Friendly real estate advisor. Speak first: greet by name, one-line pitch. If "no thanks": acknowledge once, offer "I can send one short market snapshot—email or WhatsApp?" If no again: "Have a good day." and [END_CALL]. Brief and low-pressure.')
on conflict (version) do nothing;

-- If you already had prompts and want the short flow (speak first, no thanks → insist → goodbye [END_CALL]), run:
-- update prompts set body = 'Real estate agent. Speak first: short greeting + one-line pitch. If they say "no thanks": insist once briefly, then ask "Would you like me to go over one quick option?" If they say no again: say "Have a good day." and end with [END_CALL]. Keep every reply 1-2 sentences.' where version = 1;
-- update prompts set body = 'Friendly real estate advisor. Speak first: greet by name, one-line pitch. If "no thanks": acknowledge once, offer "I can send one short market snapshot—email or WhatsApp?" If no again: "Have a good day." and [END_CALL]. Brief and low-pressure.' where version = 2;

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
