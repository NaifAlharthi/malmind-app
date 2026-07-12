// Google redirects here after consent. Verifies the CSRF state, exchanges
// the code for tokens, stores the refresh token (+ email) for this user,
// then returns them to the financial-numbers page.

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@/lib/supabase/server';
import { googleConfigured, oauthClient } from '@/lib/google';

function back(origin: string, params: string) {
  return NextResponse.redirect(new URL(`/financial-numbers?${params}`, origin));
}

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  if (!googleConfigured()) return back(origin, 'gerror=not_configured');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', origin));

  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const cookieState = req.cookies.get('g_oauth_state')?.value;

  if (!code || !state || !cookieState || state !== cookieState) {
    return back(origin, 'gerror=state');
  }

  try {
    const client = oauthClient(origin);
    const { tokens } = await client.getToken(code);
    if (!tokens.refresh_token) {
      // No refresh token (user previously consented without offline access).
      return back(origin, 'gerror=no_refresh');
    }
    client.setCredentials(tokens);

    let email: string | null = null;
    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: client });
      const info = await oauth2.userinfo.get();
      email = info.data.email ?? null;
    } catch {
      // email is best-effort only
    }

    await supabase.from('google_sheet_connections').upsert(
      {
        user_id: user.id,
        google_email: email,
        refresh_token: tokens.refresh_token,
      },
      { onConflict: 'user_id' }
    );

    const res = back(origin, 'connected=1');
    res.cookies.delete('g_oauth_state');
    return res;
  } catch (err) {
    console.error('Google callback error:', err);
    return back(origin, 'gerror=exchange');
  }
}
