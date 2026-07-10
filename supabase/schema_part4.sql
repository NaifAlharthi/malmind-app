-- supabase/schema_part4.sql
--
-- Run this in Supabase's SQL Editor AFTER schema.sql, schema_part2.sql and
-- schema_part3.sql. Adds two columns to profiles for the Velocity of Money
-- page - side income and average monthly expense, alongside the existing
-- monthly_income column - so the disposable-income calculation persists
-- across visits instead of resetting every time.

alter table public.profiles
  add column if not exists side_income numeric(12,2),
  add column if not exists monthly_expense numeric(12,2);
