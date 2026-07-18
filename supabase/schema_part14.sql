-- supabase/schema_part14.sql
--
-- Run this in Supabase's SQL Editor AFTER schema_part13.sql. Adds live-quote
-- fields to `assets`: a market ticker and a share quantity. When both are set,
-- the asset can be valued live from market prices (see /api/quotes) instead of
-- a hand-typed number — and that live value can be pushed into the monthly
-- ledger so every downstream tool factors it in.
--
-- Ticker convention follows Yahoo: bare symbol for US (AAPL), and an exchange
-- suffix elsewhere — Tadawul is `.SR` (e.g. 2222.SR for Saudi Aramco).

alter table public.assets
  add column if not exists ticker text,
  add column if not exists quantity numeric(18, 6);
