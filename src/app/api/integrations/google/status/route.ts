// Returns whether the signed-in user has connected Google Sheets, and
// which spreadsheet (if any) is linked. Never returns the refresh token.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { googleConfigured } from '@/lib/google';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const { data } = await supabase
    .from('google_sheet_connections')
    .select('google_email, spreadsheet_id, spreadsheet_url')
    .eq('user_id', user.id)
    .maybeSingle();

  return NextResponse.json({
    configured: googleConfigured(),
    connected: Boolean(data),
    email: data?.google_email ?? null,
    spreadsheetId: data?.spreadsheet_id ?? null,
    spreadsheetUrl: data?.spreadsheet_url ?? null,
  });
}
