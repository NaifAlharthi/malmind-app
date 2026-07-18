// src/lib/quotes.ts
// Client helper for the live-quotes route. One place for the shape and the
// fetch, so components just ask for symbols and get SAR-priced results back.

export interface QuoteResult {
  symbol: string;
  ok: boolean;
  price: number | null; // native currency
  currency: string | null;
  priceSar: number | null; // converted to SAR
  prevClose: number | null;
  changePct: number | null;
}

export interface QuotesResponse {
  quotes: QuoteResult[];
  asOf: string;
}

export async function fetchQuotes(symbols: string[]): Promise<QuotesResponse> {
  const unique = Array.from(new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean)));
  if (unique.length === 0) return { quotes: [], asOf: new Date().toISOString() };
  const res = await fetch('/api/quotes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbols: unique }),
  });
  if (!res.ok) throw new Error('Quote lookup failed');
  return res.json();
}

export function quoteMap(resp: QuotesResponse): Map<string, QuoteResult> {
  const m = new Map<string, QuoteResult>();
  for (const q of resp.quotes) m.set(q.symbol.toUpperCase(), q);
  return m;
}

export interface TickerHit {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

export async function searchTickers(query: string): Promise<TickerHit[]> {
  const q = query.trim();
  if (!q) return [];
  try {
    const res = await fetch(`/api/quotes/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.results) ? (json.results as TickerHit[]) : [];
  } catch {
    return [];
  }
}
