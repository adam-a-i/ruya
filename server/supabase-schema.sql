-- Run this in Supabase SQL Editor. Use case: real estate sales call.
-- Flow: Agent calls lead → Transcript saved → AI evaluator analyzes → Insights stored → Prompt updated → Next calls use improved strategy.

create table if not exists prompts (
  id uuid primary key default gen_random_uuid(),
  version int not null unique check (version in (1, 2)),
  body text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- v1 = baseline pitch; v2 = improved after evaluation. Binghatti = Dubai developer.
insert into prompts (version, body) values
  (1, 'You are a real estate sales agent for Binghatti. Call the lead to pitch Binghatti off-plan Dubai properties. Be direct. Open with a short greeting and one-line pitch. If they say not interested or no thanks, acknowledge briefly then ask if they want one market insight by email. If they say no again or show no interest, end the call respectfully: say something like "No problem, have a good day." and end with [END_CALL]. Keep every reply 1-2 short sentences. Always be respectful when they decline.'),
  (2, 'You are a consultative real estate advisor for Binghatti. Call the lead. Greet by name, one-line pitch on Binghatti off-plan Dubai. Listen to their response. If not interested, acknowledge first, offer one low-commitment follow-up (e.g. one market snapshot by email). If they say no again or show no interest, end respectfully: e.g. "No problem, have a good day." and [END_CALL]. Brief and respectful.')
on conflict (version) do nothing;

create table if not exists call_sessions (
  id uuid primary key default gen_random_uuid(),
  prompt_version int not null references prompts(version),
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

create index if not exists idx_call_transcripts_session on call_transcripts(session_id);
create index if not exists idx_call_sessions_started on call_sessions(started_at desc);

-- AI evaluator insights per call (sentiment, objections, drop-off, engagement, outcome)
create table if not exists call_insights (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references call_sessions(id) on delete cascade,
  sentiment_changes text,
  objections text,
  drop_off_point text,
  engagement_score int check (engagement_score >= 1 and engagement_score <= 10),
  outcome text,
  created_at timestamptz default now()
);
create unique index if not exists idx_call_insights_session on call_insights(session_id);

create table if not exists demo_flow_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references call_sessions(id) on delete set null,
  step text not null,
  detail text,
  created_at timestamptz default now()
);
create index if not exists idx_demo_flow_events_session on demo_flow_events(session_id);
create index if not exists idx_demo_flow_events_created on demo_flow_events(created_at desc);
