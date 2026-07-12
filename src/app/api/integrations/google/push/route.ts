// Writes financial_snapshots out to the linked Google Sheet
// (MalMind -> Sheet). If no sheet is linked yet, creates a new one, adds a
// "MalMind" tab, and saves it as the linked spreadsheet.

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@/lib/supabase/server';
import { clientForRefreshToken, SHEET_COLUMNS, SHEET_HEADER, SHEET_TAB } from '@/lib/google';

interface SnapshotRow {
  year: number; month: number; cash: number; stocks: number; real_estate: number;
  equity: number; other_assets: number; liabilities: number; income: number; expenses: number;
}

export async function POST(req: NextRequest) {
  const origin = req.nextUrl.origin;
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

  const { data: snaps } = await supabase
    .from('financial_snapshots')
    .select('year, month, cash, stocks, real_estate, equity, other_assets, liabilities, income, expenses')
    .eq('user_id', user.id)
    .order('year', { ascending: true })
    .order('month', { ascending: true });

  const rows = (snaps as SnapshotRow[]) ?? [];

  try {
    const auth = clientForRefreshToken(origin, conn.refresh_token);
    const sheets = google.sheets({ version: 'v4', auth });

    let spreadsheetId = conn.spreadsheet_id as string | null;
    let spreadsheetUrl = spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` : null;

    // No linked sheet yet → create one with a MalMind tab.
    if (!spreadsheetId) {
      const created = await sheets.spreadsheets.create({
        requestBody: {
          properties: { title: 'MalMind — My Financial Numbers' },
          sheets: [{ properties: { title: SHEET_TAB } }],
        },
        fields: 'spreadsheetId,spreadsheetUrl',
      });
      spreadsheetId = created.data.spreadsheetId!;
      spreadsheetUrl = created.data.spreadsheetUrl ?? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
      await supabase
        .from('google_sheet_connections')
        .update({ spreadsheet_id: spreadsheetId, spreadsheet_url: spreadsheetUrl })
        .eq('user_id', user.id);
    } else {
      // Make sure the MalMind tab exists on the linked sheet.
      const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties.title' });
      const hasTab = (meta.data.sheets ?? []).some((s) => s.properties?.title === SHEET_TAB);
      if (!hasTab) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: { requests: [{ addSheet: { properties: { title: SHEET_TAB } } }] },
        });
      }
    }

    const values = [
      SHEET_HEADER,
      ...rows.map((r) => SHEET_COLUMNS.map((c) => r[c as keyof SnapshotRow])),
    ];

    await sheets.spreadsheets.values.clear({ spreadsheetId, range: `${SHEET_TAB}!A1:Z5000` });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_TAB}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values },
    });

    return NextResponse.json({ ok: true, exported: rows.length, spreadsheetUrl });
  } catch (err) {
    console.error('Google push error:', err);
    return NextResponse.json({ error: 'Could not write to the sheet.' }, { status: 500 });
  }
}
