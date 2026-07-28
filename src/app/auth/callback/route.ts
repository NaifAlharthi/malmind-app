// src/app/auth/callback/route.ts
// Supabase sends users here after they click the confirmation link in their
// signup email (or a magic sign-in link). This exchanges the link's code for
// a real logged-in session, then routes them to the right place: brand-new
// users go to onboarding, returning users go home, and a dead/expired link
// falls back to login with a clear reason instead of a silent dead end.

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(`${origin}/login?reason=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    // Expired or already-used link — let them request a fresh one.
    return NextResponse.redirect(`${origin}/login?reason=link_expired`);
  }

  // Fresh confirmation vs returning user: if they haven't onboarded yet
  // (no employment on their profile), take them through onboarding first.
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('employment')
      .eq('id', user.id)
      .single();
    if (!profile?.employment) {
      return NextResponse.redirect(`${origin}/onboarding?justSignedUp=1`);
    }
  }

  return NextResponse.redirect(`${origin}/home`);
}
