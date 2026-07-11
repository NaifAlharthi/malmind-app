-- supabase/schema_part8.sql
--
-- Run this in Supabase's SQL Editor AFTER schema_part7.sql. Adds the
-- `assets` table: the first real asset-capture model for the 3D "your
-- life, in space" world. Each asset has a name, a type, an asset class
-- (auto-derived from the type but stored so it can be reasoned over), and
-- a value. Rendered as objects next to the avatar; also the foundation
-- for future net-worth / allocation features.

create table public.assets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  asset_type text not null default 'other'
    check (asset_type in ('cash','stocks','real_estate','gold','car','business','crypto','other')),
  asset_class text not null default 'other'
    check (asset_class in ('cash','equity','real_estate','commodity','business','alternative','other')),
  value numeric(14,2) not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.assets enable row level security;

create policy "Users can view their own assets"
  on public.assets for select using (auth.uid() = user_id);
create policy "Users can insert their own assets"
  on public.assets for insert with check (auth.uid() = user_id);
create policy "Users can update their own assets"
  on public.assets for update using (auth.uid() = user_id);
create policy "Users can delete their own assets"
  on public.assets for delete using (auth.uid() = user_id);

create trigger set_assets_updated_at before update on public.assets
  for each row execute procedure public.set_updated_at();
