// Links an existing Google Sheet (by pasted URL or ID) to sync with. Checks
// the app can actually open it, then saves the id + canonical URL.

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@/lib/supabase/server';
import { clientForRefreshToken, extractSpreadsheetId } from '@/lib/google';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const { url } = (await req.json()) as { url: string };
  const id = extractSpreadsheetId(url || '');
  if (!id) return NextResponse.json({ error: "That doesn't look like a Google Sheets link." }, { status: 400 });

  const { data: conn } = await supabase
    .from('google_sheet_connections')
    .select('refresh_token')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!conn?.refresh_token) return NextResponse.json({ error: 'Connect Google first.' }, { status: 400 });

  try {
    const auth = clientForRefreshToken(req.nextUrl.origin, conn.refresh_token);
    const sheets = google.sheets({ version: 'v4', auth });
    // Confirm access (throws if the app can't open it).
    await sheets.spreadsheets.get({ spreadsheetId: id, fields: 'spreadsheetId' });

    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${id}/edit`;
    await supabase
      .from('google_sheet_connections')
      .update({ spreadsheet_id: id, spreadsheet_url: spreadsheetUrl })
      .eq('user_id', user.id);

    return NextResponse.json({ ok: true, spreadsheetId: id, spreadsheetUrl });
  } catch {
    return NextResponse.json(
      { error: "Couldn't open that sheet. Make sure you opened it while connecting, or that it's the right link." },
      { status: 400 }
    );
  }
}
