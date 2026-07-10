-- supabase/schema_part7.sql
--
-- Run this in Supabase's SQL Editor AFTER schema_part6.sql. Upgrades
-- Standard of Living: an explicit end_year per phase (instead of implying
-- it from the next phase's start), editable theme/to-do/net-worth-goal
-- narrative fields per phase, a 4th "national_average" tier alongside
-- basic/decent/lavish, and switches yearly tracking from an exact SAR
-- spend amount to which lifestyle tier the user actually lived at.

alter table public.life_phases
  add column if not exists end_year integer,
  add column if not exists theme text[] not null default '{}',
  add column if not exists todo text[] not null default '{}',
  add column if not exists net_worth_goal text;

alter table public.life_phases drop constraint if exists life_phases_target_tier_check;
alter table public.life_phases add constraint life_phases_target_tier_check
  check (target_tier in ('national_average', 'basic', 'decent', 'lavish'));

alter table public.living_standard_actuals
  add column if not exists actual_tier text check (actual_tier in ('national_average', 'basic', 'decent', 'lavish'));
alter table public.living_standard_actuals alter column actual_monthly_spend drop not null;
alter table public.living_standard_actuals alter column actual_monthly_spend set default 0;
