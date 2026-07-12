// src/lib/google.ts
// Shared helpers for the Google Sheets integration: building the OAuth2
// client, the scopes we request, and the fixed column order that the
// synced sheet mirrors from `financial_snapshots`.

import { google } from 'googleapis';

// Read+write the user's own spreadsheets they create/open via this app,
// plus their email for display. drive.file keeps access scoped to files
// this app creates or the user explicitly opens — not their whole Drive.
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
  'openid',
];

// The synced sheet's columns, in order — must match financial_snapshots.
export const SHEET_COLUMNS = [
  'year', 'month', 'cash', 'stocks', 'real_estate', 'equity',
  'other_assets', 'liabilities', 'income', 'expenses',
] as const;

export const SHEET_HEADER = [
  'Year', 'Month', 'Cash', 'Stocks', 'Real estate', 'Equity',
  'Other assets', 'Liabilities', 'Income', 'Expenses',
];

export const SHEET_TAB = 'MalMind';

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function redirectUri(origin: string) {
  return `${origin}/api/integrations/google/callback`;
}

export function oauthClient(origin: string) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri(origin)
  );
}

// An OAuth2 client already loaded with a stored refresh token, ready to
// make Sheets/Drive calls (access tokens auto-refresh).
export function clientForRefreshToken(origin: string, refreshToken: string) {
  const client = oauthClient(origin);
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

export function extractSpreadsheetId(input: string): string | null {
  const trimmed = input.trim();
  const m = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (m) return m[1];
  // Also accept a bare ID.
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) return trimmed;
  return null;
}
