// src/lib/admin.ts
// Who counts as a MalMind founder/admin in the APP layer — gates the
// /invites console and its API. The DATABASE enforces the same list
// independently via is_malmind_admin() in supabase/schema_part20.sql;
// keep the two lists in sync when the circle grows.

export const ADMIN_EMAILS = ['naif.alharthi94@gmail.com'];

export function isAdminEmail(email?: string | null): boolean {
  return !!email && ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
