-- supabase/schema_part3.sql
--
-- Run this in Supabase's SQL Editor AFTER schema.sql and schema_part2.sql.
-- Adds three columns to profiles for the "Understand" view on the Lifetime
-- Income page — a rough lifetime-earnings projection built from a career
-- start year/income and an assumed save rate, kept alongside the real
-- month-by-month income_entries data (which needs no new columns).

alter table public.profiles
  add column if not exists career_start_year integer,
  add column if not exists career_start_income numeric(12,2),
  add column if not exists lifetime_save_rate numeric(5,2);
