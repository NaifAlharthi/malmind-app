// src/app/api/keepalive/route.ts
// The heartbeat that keeps the free-tier Supabase project awake.
// Supabase pauses free projects after ~7 days without API activity —
// and since demo mode never touches the database, quiet weeks are
// possible. Vercel Cron (vercel.json) calls this once a day; the tiny
// head-count query below is real database activity, which resets the
// inactivity clock. Remove once the project moves to Supabase Pro,
// which never pauses.

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    // A head-only count under RLS returns no rows and no data — but it
    // executes against the database, which is all the heartbeat needs.
    const { error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, at: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
