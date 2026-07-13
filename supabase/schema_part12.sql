-- supabase/schema_part12.sql
--
-- Run this in Supabase's SQL Editor AFTER schema_part11.sql. Powers three
-- features:
--   • Loan payoff tracking: an original_amount on loans and liabilities,
--     so paid-so-far vs remaining can be computed and visualized.
--   • The subscription "stack": a start date and category per
--     subscription, so lifetime spend and the snowball curve can be
--     computed.
--   • The Risks page: a self-reported health-insurance flag on profiles.

alter table public.loans
  add column if not exists original_amount numeric(14,2);

alter table public.liabilities
  add column if not exists original_amount numeric(14,2);

alter table public.subscriptions
  add column if not exists started_on date,
  add column if not exists category text;

alter table public.profiles
  add column if not exists has_health_insurance boolean;
