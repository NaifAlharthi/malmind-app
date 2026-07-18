// src/app/api/quotes/search/route.ts
// Ticker autocomplete. Wraps Yahoo's public search endpoint so users can type
// a company name ("aramco") and pick the right symbol ("2222.SR") instead of
// having to know the exact ticker. Server-side, no key.

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SEARCH = 'https://query1.finance.yahoo.com/v1/finance/search';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36';

export interface TickerHit {
  symbol: string;
  name: string;
  exchange: string;
  type: string; // EQUITY, ETF, INDEX, MUTUALFUND, CRYPTOCURRENCY…
}

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q')?.trim();
  if (!q) return NextResponse.json({ results: [] });

  try {
    const res = await fetch(
      `${SEARCH}?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0&listsCount=0`,
      { headers: { 'User-Agent': UA, Accept: 'application/json' }, cache: 'no-store' }
    );
    if (!res.ok) return NextResponse.json({ results: [] });
    const json = await res.json();
    const raw: unknown[] = Array.isArray(json?.quotes) ? json.quotes : [];

    const results: TickerHit[] = raw
      .map((r) => {
        const q = r as Record<string, unknown>;
        return {
          symbol: String(q.symbol ?? ''),
          name: String(q.shortname ?? q.longname ?? q.symbol ?? ''),
          exchange: String(q.exchDisp ?? q.exchange ?? ''),
          type: String(q.quoteType ?? ''),
        };
      })
      // Only things that can actually be priced as a holding.
      .filter(
        (h) =>
          h.symbol &&
          ['EQUITY', 'ETF', 'MUTUALFUND', 'INDEX', 'CRYPTOCURRENCY', 'CURRENCY'].includes(h.type)
      )
      .slice(0, 8);

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
