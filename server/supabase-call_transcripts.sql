-- Run this in your Supabase SQL editor to create the table for the demo pipeline.
create table if not exists call_transcripts (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  content text not null,
  created_at timestamptz default now()
);
