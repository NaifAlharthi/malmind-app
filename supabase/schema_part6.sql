-- supabase/schema_part6.sql
--
-- Run this in Supabase's SQL Editor AFTER schema_part5.sql. Adds five
-- self-reported profile fields needed for ratios that have no other real
-- data source anywhere in the app yet (no debts, liquid savings, or
-- housing payment tracked elsewhere): liquid savings, monthly debt
-- payments, total debt, monthly housing payment, and monthly investment
-- contribution. Powers the Ratios & Stats page's debt-to-income, housing
-- cost, current ratio, debt-to-asset, and investment-rate ratios.

alter table public.profiles
  add column if not exists liquid_savings numeric(14,2),
  add column if not exists monthly_debt_payments numeric(12,2),
  add column if not exists total_debt numeric(14,2),
  add column if not exists monthly_housing_payment numeric(12,2),
  add column if not exists monthly_investment_contribution numeric(12,2);
