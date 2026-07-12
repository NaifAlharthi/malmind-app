// Reads the linked Google Sheet and upserts its rows into
// financial_snapshots (Sheet -> MalMind). Expects the SHEET_COLUMNS order,
// with an optional header row.

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@/lib/supabase/server';
import { clientForRefreshToken, SHEET_COLUMNS, SHEET_TAB } from '@/lib/google';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const { data: conn } = await supabase
    .from('google_sheet_connections')
    .select('refresh_token, spreadsheet_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!conn?.refresh_token) return NextResponse.json({ error: 'Connect Google first.' }, { status: 400 });
  if (!conn.spreadsheet_id) return NextResponse.json({ error: 'Link a spreadsheet first.' }, { status: 400 });

  try {
    const auth = clientForRefreshToken(req.nextUrl.origin, conn.refresh_token);
    const sheets = google.sheets({ version: 'v4', auth });
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: conn.spreadsheet_id,
      range: `${SHEET_TAB}!A1:J2000`,
    });

    const values = (resp.data.values ?? []) as string[][];
    const payloads: Record<string, unknown>[] = [];
    for (const row of values) {
      const yearCell = String(row[0] ?? '').trim();
      if (!/^\d{4}$/.test(yearCell)) continue; // skip header / blank rows
      const year = parseInt(yearCell);
      const month = parseInt(String(row[1] ?? '').trim());
      if (!month || month < 1 || month > 12) continue;
      const p: Record<string, unknown> = { user_id: user.id, year, month };
      SHEET_COLUMNS.slice(2).forEach((col, i) => {
        p[col] = parseFloat(String(row[2 + i] ?? '').replace(/[^0-9.-]/g, '')) || 0;
      });
      payloads.push(p);
    }

    if (payloads.length === 0) {
      return NextResponse.json({ ok: true, imported: 0, message: 'No data rows found in the sheet.' });
    }

    const { error } = await supabase
      .from('financial_snapshots')
      .upsert(payloads, { onConflict: 'user_id,year,month' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, imported: payloads.length });
  } catch (err) {
    console.error('Google pull error:', err);
    return NextResponse.json({ error: 'Could not read the sheet. Check the tab name is "MalMind".' }, { status: 500 });
  }
}
