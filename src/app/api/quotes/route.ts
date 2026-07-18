// src/app/api/quotes/route.ts
// Live market quotes for a set of tickers, priced in SAR.
//
// Yahoo has no API for reading a user's portfolio, but its public chart
// endpoint returns live/last prices for any ticker without an API key. We call
// it server-side (keeps it off the client, avoids CORS) and convert every
// non-SAR quote into SAR using Yahoo's FX pairs, so the whole portfolio can be
// summed in one currency and folded into the user's financial canvas.
//
// This is an unofficial endpoint — fine for this use, but not a licensed feed;
// a production build would swap in a paid provider behind the same shape.

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CHART = 'https://query1.finance.yahoo.com/v8/finance/chart/';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36';

interface Meta {
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  previousClose?: number;
  currency?: string;
  symbol?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Yahoo's unofficial endpoint occasionally throttles or blips, so retry a
// couple of times with a little backoff before giving up on a symbol.
async function fetchMeta(symbol: string, attempts = 3): Promise<Meta | null> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`${CHART}${encodeURIComponent(symbol)}?interval=1d&range=1d`, {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        const meta = json?.chart?.result?.[0]?.meta;
        if (meta) return meta;
      }
    } catch {
      /* fall through to retry */
    }
    if (i < attempts - 1) await sleep(350 * (i + 1));
  }
  return null;
}

// SAR per 1 unit of `currency` (1 for SAR itself).
async function fxToSar(currency: string, cache: Map<string, number | null>): Promise<number | null> {
  const cur = currency.toUpperCase();
  if (cur === 'SAR') return 1;
  if (cache.has(cur)) return cache.get(cur)!;
  const meta = await fetchMeta(`${cur}SAR=X`);
  const rate = typeof meta?.regularMarketPrice === 'number' ? meta.regularMarketPrice : null;
  cache.set(cur, rate);
  return rate;
}

export interface QuoteResult {
  symbol: string;
  ok: boolean;
  price: number | null; // native currency
  currency: string | null;
  priceSar: number | null; // converted to SAR
  prevClose: number | null;
  changePct: number | null;
}

export async function POST(request: Request) {
  let symbols: string[] = [];
  try {
    const body = await request.json();
    symbols = Array.isArray(body?.symbols) ? body.symbols : [];
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  // De-dupe, trim, cap the batch so a bad input can't hammer the endpoint.
  const clean = Array.from(
    new Set(symbols.map((s) => String(s).trim().toUpperCase()).filter(Boolean))
  ).slice(0, 60);

  const fxCache = new Map<string, number | null>();

  const metas = await Promise.all(clean.map((s) => fetchMeta(s)));

  const quotes: QuoteResult[] = [];
  for (let i = 0; i < clean.length; i++) {
    const symbol = clean[i];
    const meta = metas[i];
    const price = typeof meta?.regularMarketPrice === 'number' ? meta.regularMarketPrice : null;
    const currency = meta?.currency ?? null;
    const prevClose =
      typeof meta?.chartPreviousClose === 'number'
        ? meta.chartPreviousClose
        : typeof meta?.previousClose === 'number'
          ? meta.previousClose
          : null;

    let priceSar: number | null = null;
    if (price !== null && currency) {
      const fx = await fxToSar(currency, fxCache);
      priceSar = fx !== null ? price * fx : null;
    }

    const changePct =
      price !== null && prevClose !== null && prevClose !== 0
        ? ((price - prevClose) / prevClose) * 100
        : null;

    quotes.push({
      symbol,
      ok: price !== null,
      price,
      currency,
      priceSar,
      prevClose,
      changePct,
    });
  }

  return NextResponse.json({ quotes, asOf: new Date().toISOString() });
}
