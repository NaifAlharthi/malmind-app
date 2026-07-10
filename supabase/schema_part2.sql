-- supabase/schema_part2.sql
--
-- Run this in Supabase's SQL Editor AFTER schema.sql. Same pattern as
-- before: every table has Row Level Security so users only ever see their
-- own rows. This adds the tables needed for the remaining tools:
-- Standard of Living, Year Master Plan, Money Waterfall, Lifetime Income,
-- Velocity of Money, Doubling Path. (Goal Fund and Dynamic Budgeting
-- already had their tables in schema.sql.)

-- ═══════════════════════════════════════════════════════════
-- LIFE PHASES — Standard of Living: the decades-long design
-- ═══════════════════════════════════════════════════════════
create table public.life_phases (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  phase_name text not null,
  start_year integer not null,
  target_tier text not null default 'decent' check (target_tier in ('basic','decent','lavish')),
  target_monthly_spend numeric(12,2) default 0,
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.life_phases enable row level security;
create policy "Users can view their own life phases" on public.life_phases for select using (auth.uid() = user_id);
create policy "Users can insert their own life phases" on public.life_phases for insert with check (auth.uid() = user_id);
create policy "Users can update their own life phases" on public.life_phases for update using (auth.uid() = user_id);
create policy "Users can delete their own life phases" on public.life_phases for delete using (auth.uid() = user_id);

-- Actual tracked spend per year, compared against the designed phases above
create table public.living_standard_actuals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  year integer not null,
  actual_monthly_spend numeric(12,2) not null,
  created_at timestamptz default now(),
  unique (user_id, year)
);

alter table public.living_standard_actuals enable row level security;
create policy "Users can view their own living standard actuals" on public.living_standard_actuals for select using (auth.uid() = user_id);
create policy "Users can insert their own living standard actuals" on public.living_standard_actuals for insert with check (auth.uid() = user_id);
create policy "Users can update their own living standard actuals" on public.living_standard_actuals for update using (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════
-- YEAR PLANS — Year Master Plan + Money Waterfall (same data, two views)
-- ═══════════════════════════════════════════════════════════
create table public.year_plans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  year integer not null,
  opening_balance numeric(14,2) not null default 0,
  target_balance numeric(14,2) not null default 0,
  monthly_income numeric(12,2) not null default 0,
  monthly_expenses numeric(12,2) not null default 0,
  save_rate numeric(5,2) not null default 20,
  invest_split numeric(5,2) not null default 50,
  expected_roi numeric(5,2) not null default 7,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, year)
);

alter table public.year_plans enable row level security;
create policy "Users can view their own year plans" on public.year_plans for select using (auth.uid() = user_id);
create policy "Users can insert their own year plans" on public.year_plans for insert with check (auth.uid() = user_id);
create policy "Users can update their own year plans" on public.year_plans for update using (auth.uid() = user_id);
create policy "Users can delete their own year plans" on public.year_plans for delete using (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════
-- INCOME ENTRIES — Lifetime Income: month-by-month earning history
-- ═══════════════════════════════════════════════════════════
create table public.income_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  year integer not null,
  month integer not null check (month between 1 and 12),
  income numeric(12,2) not null default 0,
  spending numeric(12,2) not null default 0,
  created_at timestamptz default now(),
  unique (user_id, year, month)
);

alter table public.income_entries enable row level security;
create policy "Users can view their own income entries" on public.income_entries for select using (auth.uid() = user_id);
create policy "Users can insert their own income entries" on public.income_entries for insert with check (auth.uid() = user_id);
create policy "Users can update their own income entries" on public.income_entries for update using (auth.uid() = user_id);
create policy "Users can delete their own income entries" on public.income_entries for delete using (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════
-- INVESTMENT SETTINGS — Doubling Path: portfolio value + expected return
-- ═══════════════════════════════════════════════════════════
create table public.investment_settings (
  user_id uuid references auth.users on delete cascade primary key,
  portfolio_value numeric(14,2) not null default 0,
  expected_roi numeric(5,2) not null default 8,
  updated_at timestamptz default now()
);

alter table public.investment_settings enable row level security;
create policy "Users can view their own investment settings" on public.investment_settings for select using (auth.uid() = user_id);
create policy "Users can insert their own investment settings" on public.investment_settings for insert with check (auth.uid() = user_id);
create policy "Users can update their own investment settings" on public.investment_settings for update using (auth.uid() = user_id);


-- keep updated_at fresh on these new tables too
create trigger set_life_phases_updated_at before update on public.life_phases
  for each row execute procedure public.set_updated_at();
create trigger set_year_plans_updated_at before update on public.year_plans
  for each row execute procedure public.set_updated_at();
create trigger set_investment_settings_updated_at before update on public.investment_settings
  for each row execute procedure public.set_updated_at();
