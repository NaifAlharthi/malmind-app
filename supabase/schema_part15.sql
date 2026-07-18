-- supabase/schema_part15.sql
--
-- Run this in Supabase's SQL Editor AFTER schema_part14.sql. Expands the
-- profile with contact + demographic + preference fields captured in the
-- redesigned Edit Profile form.
--
-- Note: monthly_income, employment and age columns are intentionally KEPT —
-- many tools still read them. The form no longer edits income/employment, and
-- `age` is now derived from `birthday` on save so age-based tools keep working.

alter table public.profiles
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists birthday date,
  add column if not exists gender text check (gender in ('male', 'female')),
  add column if not exists country text,
  add column if not exists currency text default 'SAR',
  add column if not exists marital_status text
    check (marital_status in ('single', 'married', 'divorced', 'widowed')),
  add column if not exists life_stage text
    check (life_stage in (
      'student', 'employed', 'self_employed', 'business_owner',
      'unemployed', 'retired', 'homemaker', 'other'
    ));
