// src/lib/supabase/client.ts
// Use this in client components ('use client' files) — anything running
// in the user's browser, like a form submit or a button click.

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
