-- supabase/schema_part11.sql
--
-- Run this in Supabase's SQL Editor AFTER schema_part10.sql. Adds
-- `google_sheet_connections`: one row per user, storing their Google
-- OAuth refresh token and the spreadsheet they've linked for two-way sync
-- of "My financial numbers".
--
-- SECURITY NOTE (prototype): the refresh token is stored here and, under
-- these RLS policies, is readable by the owning user's own session. That's
-- acceptable for a prototype. Before production this should be hardened:
--   • encrypt the token at rest (e.g. pgsodium / a KMS), and
--   • read it only from a service-role server context, with NO row-level
--     SELECT of the token column granted to the `authenticated` role.

create table public.google_sheet_connections (
  user_id uuid references auth.users on delete cascade primary key,
  google_email text,
  refresh_token text not null,
  spreadsheet_id text,
  spreadsheet_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.google_sheet_connections enable row level security;
create policy "own google connection select" on public.google_sheet_connections for select using (auth.uid() = user_id);
create policy "own google connection insert" on public.google_sheet_connections for insert with check (auth.uid() = user_id);
create policy "own google connection update" on public.google_sheet_connections for update using (auth.uid() = user_id);
create policy "own google connection delete" on public.google_sheet_connections for delete using (auth.uid() = user_id);
create trigger set_google_sheet_connections_updated_at before update on public.google_sheet_connections
  for each row execute procedure public.set_updated_at();
