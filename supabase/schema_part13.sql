-- supabase/schema_part13.sql
--
-- Run this in Supabase's SQL Editor AFTER schema_part12.sql. Creates
-- what_if_scenarios for the "What if" sandbox under Think: each saved
-- scenario stores its full parameter set (baseline overrides + moves) as
-- jsonb so the model can evolve without further migrations.

create table public.what_if_scenarios (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  params jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.what_if_scenarios enable row level security;
create policy "own what_if select" on public.what_if_scenarios for select using (auth.uid() = user_id);
create policy "own what_if insert" on public.what_if_scenarios for insert with check (auth.uid() = user_id);
create policy "own what_if update" on public.what_if_scenarios for update using (auth.uid() = user_id);
create policy "own what_if delete" on public.what_if_scenarios for delete using (auth.uid() = user_id);
create trigger set_what_if_scenarios_updated_at before update on public.what_if_scenarios
  for each row execute procedure public.set_updated_at();
