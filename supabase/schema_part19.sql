-- supabase/schema_part19.sql
--
-- Run this in Supabase's SQL Editor. The Standard of Living designer now has a
-- fourth aspirational level — Financial Freedom — above Lavish, so a life
-- phase can target it. Widen the target_tier check constraint to allow it.
-- Idempotent: drops the old constraint (if present) and re-adds the widened
-- one. Existing rows (basic/decent/lavish) stay valid.

alter table public.life_phases drop constraint if exists life_phases_target_tier_check;
alter table public.life_phases add constraint life_phases_target_tier_check
  check (target_tier in ('basic', 'decent', 'lavish', 'financial_freedom'));
