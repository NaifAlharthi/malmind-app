-- supabase/schema_part18.sql
--
-- Run this in Supabase's SQL Editor AFTER schema_part17.sql. Adds optional
-- file attachments (an image or a PDF) to "Contact us" messages: a private
-- Storage bucket to hold the files, plus columns on contact_messages that
-- point at the uploaded object.
--
-- Safe to run even if schema_part17.sql already ran — every statement is
-- idempotent (add column if not exists / on conflict do nothing / drop-then-
-- create the policy).

alter table public.contact_messages
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_type text;

-- Private bucket: files are never publicly readable. You open attachments from
-- the Supabase dashboard (Storage → contact-attachments), which uses the
-- service role and bypasses RLS.
insert into storage.buckets (id, name, public)
values ('contact-attachments', 'contact-attachments', false)
on conflict (id) do nothing;

-- Write-only, mirroring the contact_messages table: anyone (including signed-
-- out visitors) may UPLOAD into this bucket, but with no select/update/delete
-- policy the anon and authenticated keys can never list or read the files back.
drop policy if exists "Anyone can upload a contact attachment" on storage.objects;
create policy "Anyone can upload a contact attachment"
  on storage.objects for insert
  with check (bucket_id = 'contact-attachments');
