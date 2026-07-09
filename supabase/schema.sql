-- supabase/schema.sql
--
-- Run this in your Supabase project's SQL Editor (Dashboard → SQL Editor → New query)
-- to create the real tables MalMind needs. Every table uses Row Level Security
-- (RLS) so that, at the database level, a user can only ever read or write
-- their own rows — not because the app code remembers to check, but because
-- Postgres itself enforces it. This matters a lot for a financial product.

-- ═══════════════════════════════════════════════════════════
-- PROFILES — one row per signed-up user
-- Supabase Auth already creates a row in auth.users on signup.
-- This table holds the MalMind-specific profile data linked to that user.
-- ═══════════════════════════════════════════════════════════
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null default '',
  age integer,
  city text,
  employment text,
  monthly_income numeric(12,2) default 0,
  persona text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Automatically create a profile row the moment someone signs up,
-- so the app never has to worry about a "missing profile" state.
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', 'New user'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ═══════════════════════════════════════════════════════════
-- STORY CHAPTERS — My Financial Story, per user
-- ═══════════════════════════════════════════════════════════
create table public.story_chapters (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  start_year integer not null,
  end_year integer not null,
  note text default '',
  vividness text default 'sketch' check (vividness in ('sketch', 'clear')),
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.story_chapters enable row level security;

create policy "Users can view their own chapters"
  on public.story_chapters for select using (auth.uid() = user_id);
create policy "Users can insert their own chapters"
  on public.story_chapters for insert with check (auth.uid() = user_id);
create policy "Users can update their own chapters"
  on public.story_chapters for update using (auth.uid() = user_id);
create policy "Users can delete their own chapters"
  on public.story_chapters for delete using (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════
-- NET WORTH SNAPSHOTS — for Financial Positioning
-- ═══════════════════════════════════════════════════════════
create table public.net_worth_snapshots (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  year integer not null,
  amount numeric(14,2) not null,
  created_at timestamptz default now(),
  unique (user_id, year)
);

alter table public.net_worth_snapshots enable row level security;

create policy "Users can view their own net worth"
  on public.net_worth_snapshots for select using (auth.uid() = user_id);
create policy "Users can insert their own net worth"
  on public.net_worth_snapshots for insert with check (auth.uid() = user_id);
create policy "Users can update their own net worth"
  on public.net_worth_snapshots for update using (auth.uid() = user_id);
create policy "Users can delete their own net worth"
  on public.net_worth_snapshots for delete using (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════
-- GOAL FUNDS — Decide tool: named savings goals
-- ═══════════════════════════════════════════════════════════
create table public.goal_funds (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  target_amount numeric(14,2) not null,
  monthly_contribution numeric(12,2) not null,
  start_date date not null default current_date,
  maturity_years numeric(5,2) not null,
  expected_return numeric(5,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.goal_funds enable row level security;

create policy "Users can view their own goal funds"
  on public.goal_funds for select using (auth.uid() = user_id);
create policy "Users can insert their own goal funds"
  on public.goal_funds for insert with check (auth.uid() = user_id);
create policy "Users can update their own goal funds"
  on public.goal_funds for update using (auth.uid() = user_id);
create policy "Users can delete their own goal funds"
  on public.goal_funds for delete using (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════
-- GOAL FUND ACTUALS — the monthly tracker rows for a goal fund
-- ═══════════════════════════════════════════════════════════
create table public.goal_fund_actuals (
  id uuid default gen_random_uuid() primary key,
  goal_fund_id uuid references public.goal_funds on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  month_index integer not null,
  actual_amount numeric(12,2) not null,
  created_at timestamptz default now(),
  unique (goal_fund_id, month_index)
);

alter table public.goal_fund_actuals enable row level security;

create policy "Users can view their own goal fund actuals"
  on public.goal_fund_actuals for select using (auth.uid() = user_id);
create policy "Users can insert their own goal fund actuals"
  on public.goal_fund_actuals for insert with check (auth.uid() = user_id);
create policy "Users can update their own goal fund actuals"
  on public.goal_fund_actuals for update using (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════
-- ADVISOR MESSAGES — chat history, per user
-- ═══════════════════════════════════════════════════════════
create table public.advisor_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

alter table public.advisor_messages enable row level security;

create policy "Users can view their own messages"
  on public.advisor_messages for select using (auth.uid() = user_id);
create policy "Users can insert their own messages"
  on public.advisor_messages for insert with check (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════
-- BUDGET ITEMS — Dynamic Budgeting & Prioritization, per user
-- ═══════════════════════════════════════════════════════════
create table public.budget_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  area text not null,
  phase integer not null default 2 check (phase in (1,2,3)),
  cost numeric(12,2) not null default 0,
  bought boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.budget_items enable row level security;

create policy "Users can view their own budget items"
  on public.budget_items for select using (auth.uid() = user_id);
create policy "Users can insert their own budget items"
  on public.budget_items for insert with check (auth.uid() = user_id);
create policy "Users can update their own budget items"
  on public.budget_items for update using (auth.uid() = user_id);
create policy "Users can delete their own budget items"
  on public.budget_items for delete using (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════
-- Keep updated_at fresh automatically on every UPDATE
-- ═══════════════════════════════════════════════════════════
create function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_profiles_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();
create trigger set_story_chapters_updated_at before update on public.story_chapters
  for each row execute procedure public.set_updated_at();
create trigger set_goal_funds_updated_at before update on public.goal_funds
  for each row execute procedure public.set_updated_at();
create trigger set_budget_items_updated_at before update on public.budget_items
  for each row execute procedure public.set_updated_at();
