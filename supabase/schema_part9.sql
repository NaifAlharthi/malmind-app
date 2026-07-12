-- supabase/schema_part9.sql
--
-- Run this in Supabase's SQL Editor AFTER schema_part8.sql. Adds the five
-- tables behind the two new capture features in the sidebar:
--   • "Assets & liabilities": expenses, liabilities (assets/investments
--      reuse the existing `assets` table from schema_part8).
--   • "Bills & commitments": subscriptions, loans, credit_cards.
-- Each has Row Level Security and the shared updated_at trigger.

-- ── Expenses ──
create table public.expenses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  category text,
  amount numeric(12,2) not null default 0,
  frequency text not null default 'monthly' check (frequency in ('monthly','annual','one_off')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.expenses enable row level security;
create policy "own expenses select" on public.expenses for select using (auth.uid() = user_id);
create policy "own expenses insert" on public.expenses for insert with check (auth.uid() = user_id);
create policy "own expenses update" on public.expenses for update using (auth.uid() = user_id);
create policy "own expenses delete" on public.expenses for delete using (auth.uid() = user_id);
create trigger set_expenses_updated_at before update on public.expenses
  for each row execute procedure public.set_updated_at();

-- ── Liabilities (generic things you owe; bank loans and cards live in their own tables) ──
create table public.liabilities (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  kind text not null default 'other' check (kind in ('personal','family','bnpl','tax','other')),
  balance numeric(14,2) not null default 0,
  monthly_payment numeric(12,2) not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.liabilities enable row level security;
create policy "own liabilities select" on public.liabilities for select using (auth.uid() = user_id);
create policy "own liabilities insert" on public.liabilities for insert with check (auth.uid() = user_id);
create policy "own liabilities update" on public.liabilities for update using (auth.uid() = user_id);
create policy "own liabilities delete" on public.liabilities for delete using (auth.uid() = user_id);
create trigger set_liabilities_updated_at before update on public.liabilities
  for each row execute procedure public.set_updated_at();

-- ── Subscriptions ──
create table public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  amount numeric(12,2) not null default 0,
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly','annual')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.subscriptions enable row level security;
create policy "own subscriptions select" on public.subscriptions for select using (auth.uid() = user_id);
create policy "own subscriptions insert" on public.subscriptions for insert with check (auth.uid() = user_id);
create policy "own subscriptions update" on public.subscriptions for update using (auth.uid() = user_id);
create policy "own subscriptions delete" on public.subscriptions for delete using (auth.uid() = user_id);
create trigger set_subscriptions_updated_at before update on public.subscriptions
  for each row execute procedure public.set_updated_at();

-- ── Loans & mortgages ──
create table public.loans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  loan_type text not null default 'loan' check (loan_type in ('loan','mortgage')),
  balance numeric(14,2) not null default 0,
  monthly_payment numeric(12,2) not null default 0,
  interest_rate numeric(5,2) not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.loans enable row level security;
create policy "own loans select" on public.loans for select using (auth.uid() = user_id);
create policy "own loans insert" on public.loans for insert with check (auth.uid() = user_id);
create policy "own loans update" on public.loans for update using (auth.uid() = user_id);
create policy "own loans delete" on public.loans for delete using (auth.uid() = user_id);
create trigger set_loans_updated_at before update on public.loans
  for each row execute procedure public.set_updated_at();

-- ── Credit cards ──
create table public.credit_cards (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  balance numeric(14,2) not null default 0,
  credit_limit numeric(14,2) not null default 0,
  min_payment numeric(12,2) not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.credit_cards enable row level security;
create policy "own credit_cards select" on public.credit_cards for select using (auth.uid() = user_id);
create policy "own credit_cards insert" on public.credit_cards for insert with check (auth.uid() = user_id);
create policy "own credit_cards update" on public.credit_cards for update using (auth.uid() = user_id);
create policy "own credit_cards delete" on public.credit_cards for delete using (auth.uid() = user_id);
create trigger set_credit_cards_updated_at before update on public.credit_cards
  for each row execute procedure public.set_updated_at();
