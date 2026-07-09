// src/lib/supabase/server.ts
// Use this in server components, API routes, and Server Actions — anywhere
// running on Vercel's servers, not in the browser. This version can read the
// user's session from cookies so the server knows who's making the request.

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll is called from a Server Component sometimes, where
            // cookies can't be mutated. Safe to ignore — middleware
            // refreshes the session in that case.
          }
        },
      },
    }
  );
}
