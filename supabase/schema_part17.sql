-- supabase/schema_part17.sql
--
-- Run this in Supabase's SQL Editor AFTER schema_part16.sql. Adds the
-- "Contact us" inbox: every inquiry sent from the marketing/auth/home pages
-- (customer support, investment interest, partnerships, general) is captured
-- here so nothing is ever lost — even when no email provider is configured.
--
-- Anyone (including signed-out visitors) may INSERT a message, but there is
-- deliberately NO select/update/delete policy: with RLS on, that means the
-- anon and authenticated keys can only write, never read. You read inquiries
-- from the Supabase dashboard (Table editor / SQL), which uses the service
-- role and bypasses RLS. Optionally wire a Supabase Database Webhook on this
-- table to get pinged (email/Slack) the moment a row lands.

create table if not exists public.contact_messages (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  -- 'support' | 'investment' | 'partnership' | 'general'
  category text not null default 'general',
  name text not null,
  email text not null,
  subject text,
  message text not null,
  -- Context we capture automatically (never asked of the user).
  locale text,                 -- 'ar' | 'en' at time of sending
  source text,                 -- which page: 'signup' | 'login' | 'home'
  user_id uuid references auth.users on delete set null,  -- null for guests
  user_agent text,
  status text not null default 'new'   -- 'new' | 'read' | 'archived'
);

alter table public.contact_messages enable row level security;

-- Write-only for everyone: visitors can submit, but cannot read the inbox.
create policy "Anyone can submit a contact message"
  on public.contact_messages for insert
  with check (true);

create index if not exists contact_messages_created_idx
  on public.contact_messages (created_at desc);
create index if not exists contact_messages_status_idx
  on public.contact_messages (status);
