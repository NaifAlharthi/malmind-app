-- schema_part21.sql — user-created ledgers in the Log's drawer.
-- One row per ledger (gold, crypto, rental income, school fees, …), its
-- month-by-month entries kept as a JSON array: [{ month: 'YYYY-MM',
-- amount: number, note?: text }]. Each user sees and writes only their
-- own ledgers. Until this runs, the app keeps ledgers in the browser.
-- Run in: Supabase Dashboard → SQL Editor.

create table if not exists public.custom_ledgers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  icon text not null default '📒',
  kind text not null check (kind in ('balance', 'flow')),
  direction text check (direction in ('in', 'out')),
  preset text,
  entries jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists custom_ledgers_user_idx on public.custom_ledgers (user_id);

alter table public.custom_ledgers enable row level security;

drop policy if exists "custom ledgers own select" on public.custom_ledgers;
create policy "custom ledgers own select" on public.custom_ledgers
  for select using (auth.uid() = user_id);

drop policy if exists "custom ledgers own insert" on public.custom_ledgers;
create policy "custom ledgers own insert" on public.custom_ledgers
  for insert with check (auth.uid() = user_id);

drop policy if exists "custom ledgers own update" on public.custom_ledgers;
create policy "custom ledgers own update" on public.custom_ledgers
  for update using (auth.uid() = user_id);

drop policy if exists "custom ledgers own delete" on public.custom_ledgers;
create policy "custom ledgers own delete" on public.custom_ledgers
  for delete using (auth.uid() = user_id);
