// src/app/auth/callback/route.ts
// Supabase sends users here after they click the link in a signup-confirmation
// or magic sign-in email. Two link formats are supported:
//
//   1. token_hash + type  — the robust format (set in the Supabase email
//      templates). Verified server-side with verifyOtp, so it works on ANY
//      device — including the very common "signed up on laptop, opened the
//      email on my phone" case.
//   2. code               — the PKCE format from the default templates.
//      exchangeCodeForSession requires the code-verifier cookie from the
//      browser that STARTED the flow, so it only works on the same device.
//
// Success routes brand-new users to onboarding and returning users home; a
// dead or expired link falls back to login with a clear reason instead of a
// silent dead end.

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const code = searchParams.get('code');

  // Supabase reports link problems via error params (e.g. otp_expired).
  if (searchParams.get('error') || searchParams.get('error_code')) {
    return NextResponse.redirect(`${origin}/login?reason=link_expired`);
  }

  const supabase = await createClient();

  if (tokenHash && type) {
    // Cross-device safe: the token hash is verified entirely server-side.
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) {
      return NextResponse.redirect(`${origin}/login?reason=link_expired`);
    }
  } else if (code) {
    // Same-device PKCE exchange (needs this browser's code-verifier cookie).
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/login?reason=link_expired`);
    }
  } else {
    return NextResponse.redirect(`${origin}/login?reason=missing_code`);
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
