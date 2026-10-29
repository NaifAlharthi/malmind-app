-- schema_part20.sql — the Welcome Program's guest list.
-- Hand-picked people the founder invites to explore MalMind: each row is
-- one invitation, its personal note, and its journey (created → sent →
-- opened → joined). Direct table access is admin-only (keyed by the
-- signed-in email); the public /welcome page reads and marks invites
-- ONLY through the two SECURITY DEFINER functions below, so the
-- unguessable invite id is the sole key an invitee ever needs.
-- Run in: Supabase Dashboard → SQL Editor.

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  note text,
  lang text not null default 'ar' check (lang in ('ar', 'en')),
  status text not null default 'created' check (status in ('created', 'sent', 'opened', 'joined')),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  opened_at timestamptz,
  joined_at timestamptz,
  joined_user uuid references auth.users (id)
);

alter table public.invites enable row level security;

-- The founders' emails — extend the list to grow the admin circle.
create or replace function public.is_malmind_admin()
returns boolean language sql stable as $$
  select coalesce((auth.jwt() ->> 'email'), '') in (
    'naif.alharthi94@gmail.com'
  );
$$;

drop policy if exists "invites admin select" on public.invites;
create policy "invites admin select" on public.invites
  for select using (public.is_malmind_admin());

drop policy if exists "invites admin insert" on public.invites;
create policy "invites admin insert" on public.invites
  for insert with check (public.is_malmind_admin());

drop policy if exists "invites admin update" on public.invites;
create policy "invites admin update" on public.invites
  for update using (public.is_malmind_admin());

drop policy if exists "invites admin delete" on public.invites;
create policy "invites admin delete" on public.invites
  for delete using (public.is_malmind_admin());

-- The /welcome page's one read: name + language + status, by exact id.
create or replace function public.get_invite(invite_id uuid)
returns table (name text, lang text, status text)
language sql security definer set search_path = public as $$
  select name, lang, status from public.invites where id = invite_id;
$$;

-- The /welcome page's two writes: the invitee opened the page, or (after
-- signing up) joined. Status only ever moves forward.
create or replace function public.mark_invite(invite_id uuid, event text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if event = 'opened' then
    update public.invites
      set status = case when status = 'joined' then status else 'opened' end,
          opened_at = coalesce(opened_at, now())
      where id = invite_id;
  elsif event = 'joined' then
    update public.invites
      set status = 'joined',
          joined_at = coalesce(joined_at, now()),
          joined_user = coalesce(joined_user, auth.uid())
      where id = invite_id;
  end if;
end;
$$;

grant execute on function public.get_invite(uuid) to anon, authenticated;
grant execute on function public.mark_invite(uuid, text) to anon, authenticated;
