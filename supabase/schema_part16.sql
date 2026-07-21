-- supabase/schema_part16.sql
--
-- Run this in Supabase's SQL Editor AFTER schema_part15.sql. Adds the Credit
-- Standing feature: SIMAH / MOLIM credit-report snapshots the user records
-- over time, plus the individual credit products (accounts) inside each one.
--
-- The MOLIM score itself (300–900) is user-entered — it only appears in
-- SIMAH's paid "Smart" report, so MalMind stores the official number the user
-- gives it and tracks how it changes across snapshots. Everything else
-- (good/bad-debt classification, utilisation, DBR, access-to-credit) is
-- computed from the accounts, never fabricated.

-- ═══════════════════════════════════════════════════════════
-- CREDIT SNAPSHOTS — one per SIMAH report the user records
-- ═══════════════════════════════════════════════════════════
create table if not exists public.credit_snapshots (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  report_date date not null,
  -- The official MOLIM score (300–900); null until the user has one.
  molim_score integer check (molim_score is null or (molim_score between 300 and 900)),
  -- Net monthly income used for the Debt Burden Ratio at this point in time.
  monthly_income numeric(12,2) not null default 0,
  first_account_date date,
  num_defaulted integer not null default 0,
  total_defaulted numeric(14,2) not null default 0,
  num_inquiries integer not null default 0,       -- recent credit enquiries
  bounced_cheques integer not null default 0,
  -- Denormalised summary so the trend chart stays cheap to load.
  total_limits numeric(14,2) not null default 0,
  total_outstanding numeric(14,2) not null default 0,
  num_active integer not null default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, report_date)
);

alter table public.credit_snapshots enable row level security;
create policy "Users can view their own credit snapshots" on public.credit_snapshots for select using (auth.uid() = user_id);
create policy "Users can insert their own credit snapshots" on public.credit_snapshots for insert with check (auth.uid() = user_id);
create policy "Users can update their own credit snapshots" on public.credit_snapshots for update using (auth.uid() = user_id);
create policy "Users can delete their own credit snapshots" on public.credit_snapshots for delete using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════
-- CREDIT ACCOUNTS — the products inside a snapshot
-- ═══════════════════════════════════════════════════════════
create table if not exists public.credit_accounts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  snapshot_id uuid references public.credit_snapshots on delete cascade not null,
  -- 'mortgage','stock_finance','personal_loan','auto_loan','credit_card',
  -- 'sme_finance','telecom','utility','other'
  product_type text not null default 'other',
  creditor text,
  credit_limit numeric(14,2) not null default 0,
  outstanding numeric(14,2) not null default 0,
  installment numeric(12,2) not null default 0,
  past_due numeric(12,2) not null default 0,
  issue_date date,
  status text not null default 'active',            -- 'active' | 'closed'
  -- Worst payment status seen recently: 'current' or overdue bucket label.
  payment_status text not null default 'current',
  sort_order integer default 0,
  created_at timestamptz default now()
);

alter table public.credit_accounts enable row level security;
create policy "Users can view their own credit accounts" on public.credit_accounts for select using (auth.uid() = user_id);
create policy "Users can insert their own credit accounts" on public.credit_accounts for insert with check (auth.uid() = user_id);
create policy "Users can update their own credit accounts" on public.credit_accounts for update using (auth.uid() = user_id);
create policy "Users can delete their own credit accounts" on public.credit_accounts for delete using (auth.uid() = user_id);

create index if not exists credit_accounts_snapshot_idx on public.credit_accounts (snapshot_id);
