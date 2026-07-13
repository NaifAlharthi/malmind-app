// src/lib/supabase/client.ts
// Use this in client components ('use client' files) — anything running
// in the user's browser, like a form submit or a button click.
//
// Guest demo mode: when the demo flag is set (see lib/demoSupabase.ts),
// this returns an in-memory mock loaded with the demo persona's data
// instead of the real Supabase client — which is what lets every page in
// the app render fully populated for a guest without a real account.

import { createBrowserClient } from '@supabase/ssr';
import { createDemoClient, isDemoActive } from '@/lib/demoSupabase';

function realClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export function createClient(): ReturnType<typeof realClient> {
  if (typeof window !== 'undefined' && isDemoActive()) {
    return createDemoClient() as unknown as ReturnType<typeof realClient>;
  }
  return realClient();
}
