-- supabase/schema_part10.sql
--
-- Run this in Supabase's SQL Editor AFTER schema_part9.sql. Adds the
-- `financial_snapshots` table behind the "My financial numbers" page: one
-- row per month, capturing the balances that make up a personal financial
-- statement over time (cash, stocks, real estate, equity, other assets,
-- liabilities, income, expenses). Net worth and total assets are derived
-- in the app, not stored.

create table public.financial_snapshots (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  year integer not null,
  month integer not null check (month between 1 and 12),
  cash numeric(14,2) not null default 0,
  stocks numeric(14,2) not null default 0,
  real_estate numeric(14,2) not null default 0,
  equity numeric(14,2) not null default 0,
  other_assets numeric(14,2) not null default 0,
  liabilities numeric(14,2) not null default 0,
  income numeric(14,2) not null default 0,
  expenses numeric(14,2) not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, year, month)
);

alter table public.financial_snapshots enable row level security;
create policy "own financial_snapshots select" on public.financial_snapshots for select using (auth.uid() = user_id);
create policy "own financial_snapshots insert" on public.financial_snapshots for insert with check (auth.uid() = user_id);
create policy "own financial_snapshots update" on public.financial_snapshots for update using (auth.uid() = user_id);
create policy "own financial_snapshots delete" on public.financial_snapshots for delete using (auth.uid() = user_id);
create trigger set_financial_snapshots_updated_at before update on public.financial_snapshots
  for each row execute procedure public.set_updated_at();
