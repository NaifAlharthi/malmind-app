// Kicks off the Google OAuth consent flow. Requires the user to be signed
// in, sets a short-lived CSRF "state" cookie, and redirects to Google.

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { GOOGLE_SCOPES, googleConfigured, oauthClient } from '@/lib/google';

export async function GET(req: NextRequest) {
  if (!googleConfigured()) {
    return NextResponse.json({ error: 'Google integration is not configured on the server.' }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL('/login', req.nextUrl.origin));
  }

  const state = randomBytes(16).toString('hex');
  const client = oauthClient(req.nextUrl.origin);
  const url = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // force a refresh_token every time
    scope: GOOGLE_SCOPES,
    state,
  });

  const res = NextResponse.redirect(url);
  res.cookies.set('g_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });
  return res;
}
