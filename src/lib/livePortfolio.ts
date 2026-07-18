// src/lib/livePortfolio.ts
// Shared loading + live valuation for the investment portfolio, so both the
// Holdings panel and the Today hub read holdings and price them the same way.

import { createClient } from '@/lib/supabase/client';
import { fetchQuotes, quoteMap, type QuoteResult } from '@/lib/quotes';

export interface Holding {
  id: string;
  name: string;
  ticker: string;
  quantity: number;
}

export interface ValuedHolding extends Holding {
  quote: QuoteResult | undefined;
  marketValue: number | null; // SAR
}

export interface PortfolioValue {
  valued: ValuedHolding[];
  total: number; // SAR across priced holdings
  priced: number; // how many holdings got a live price
  asOf: string | null;
}

/** All holdings that carry a ticker + quantity (i.e. live-priceable). */
export async function loadHoldings(userId: string): Promise<Holding[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('assets')
    .select('id, name, ticker, quantity')
    .eq('user_id', userId);
  return ((data ?? []) as (Holding & Record<string, unknown>)[])
    .filter((r) => r.ticker && Number(r.quantity) > 0)
    .map((r) => ({ id: r.id, name: r.name, ticker: String(r.ticker), quantity: Number(r.quantity) }));
}

/** Price a set of holdings live and total them in SAR. */
export async function valueHoldings(holdings: Holding[]): Promise<PortfolioValue> {
  if (holdings.length === 0) {
    return { valued: [], total: 0, priced: 0, asOf: null };
  }
  const resp = await fetchQuotes(holdings.map((h) => h.ticker));
  const quotes = quoteMap(resp);
  const valued: ValuedHolding[] = holdings.map((h) => {
    const quote = quotes.get(h.ticker.toUpperCase());
    const marketValue = quote && quote.priceSar !== null ? quote.priceSar * h.quantity : null;
    return { ...h, quote, marketValue };
  });
  const total = valued.reduce((s, v) => s + (v.marketValue ?? 0), 0);
  const priced = valued.filter((v) => v.marketValue !== null).length;
  return { valued, total, priced, asOf: resp.asOf };
}
