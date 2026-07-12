// Removes the stored Google connection for the signed-in user.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  await supabase.from('google_sheet_connections').delete().eq('user_id', user.id);
  return NextResponse.json({ ok: true });
}
