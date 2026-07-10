-- supabase/schema_part5.sql
--
-- Run this in Supabase's SQL Editor AFTER schema.sql, schema_part2.sql,
-- schema_part3.sql and schema_part4.sql. Adds one column to goal_funds so
-- each fund can show its own icon (set from a preset like "Hajj" or
-- "Wedding", or left as the default target emoji for a custom goal).

alter table public.goal_funds
  add column if not exists icon text not null default '🎯';
