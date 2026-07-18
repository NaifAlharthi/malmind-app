'use client';

// Live investment portfolio: the user records each holding as ticker + shares,
// and we price it live from the market (in SAR), sum it, and offer to push the
// total into this month's ledger so net worth, ratios, positioning and every
// projection factor it in. Holdings live in the `assets` table (asset_type
// 'stocks') with the ticker/quantity columns from schema_part14.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchQuotes, quoteMap, type QuoteResult } from '@/lib/quotes';

interface Holding {
  id: string;
  name: string;
  ticker: string;
  quantity: number;
}

function fmt(n: number) {
  return Math.round(n).toLocaleString();
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function LivePortfolio() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [quotes, setQuotes] = useState<Map<string, QuoteResult>>(new Map());
  const [asOf, setAsOf] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', ticker: '', quantity: '' });
  const [applyMsg, setApplyMsg] = useState<string | null>(null);

  const load = useCallback(
    async (uid: string) => {
      const { data } = await supabase
        .from('assets')
        .select('id, name, ticker, quantity, asset_type')
        .eq('user_id', uid);
      const rows = ((data ?? []) as (Holding & { asset_type: string })[])
        .filter((r) => r.ticker && Number(r.quantity) > 0)
        .map((r) => ({ id: r.id, name: r.name, ticker: r.ticker, quantity: Number(r.quantity) }));
      setHoldings(rows);
      return rows;
    },
    [supabase]
  );

  const refresh = useCallback(async (rows: Holding[]) => {
    const symbols = rows.map((r) => r.ticker);
    if (symbols.length === 0) {
      setQuotes(new Map());
      setAsOf(null);
      return;
    }
    setLoading(true);
    try {
      const resp = await fetchQuotes(symbols);
      setQuotes(quoteMap(resp));
      setAsOf(resp.asOf);
    } catch {
      /* leave prior quotes in place */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const rows = await load(user.id);
      refresh(rows);
    })();
  }, [supabase, load, refresh]);

  async function addHolding(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const ticker = form.ticker.trim().toUpperCase();
    const quantity = parseFloat(form.quantity.replace(/[^0-9.]/g, '')) || 0;
    if (!ticker || quantity <= 0) return;
    await supabase.from('assets').insert({
      user_id: userId,
      name: form.name.trim() || ticker,
      asset_type: 'stocks',
      asset_class: 'equity',
      ticker,
      quantity,
      value: 0,
    });
    setForm({ name: '', ticker: '', quantity: '' });
    setApplyMsg(null);
    const rows = await load(userId);
    refresh(rows);
  }

  async function del(id: string) {
    if (!userId) return;
    await supabase.from('assets').delete().eq('id', id);
    setApplyMsg(null);
    const rows = await load(userId);
    refresh(rows);
  }

  const valued = useMemo(
    () =>
      holdings.map((h) => {
        const q = quotes.get(h.ticker.toUpperCase());
        const marketValue = q && q.priceSar !== null ? q.priceSar * h.quantity : null;
        return { ...h, q, marketValue };
      }),
    [holdings, quotes]
  );

  const total = valued.reduce((s, v) => s + (v.marketValue ?? 0), 0);
  const priced = valued.filter((v) => v.marketValue !== null).length;

  async function applyToMonth() {
    if (!userId || total <= 0) return;
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const { error } = await supabase
      .from('financial_snapshots')
      .upsert(
        { user_id: userId, year: y, month: m, stocks: Math.round(total) },
        { onConflict: 'user_id,year,month' }
      );
    setApplyMsg(
      error
        ? `Couldn't update: ${error.message}`
        : `Set ${MONTHS[m - 1]} ${y} investments to SAR ${fmt(total)} — it now flows into your net worth, ratios and projections.`
    );
  }

  const asOfLabel = asOf
    ? new Date(asOf).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-6">
      <div className="flex items-start justify-between gap-3 mb-1 flex-wrap">
        <div>
          <div className="text-[11px] tracking-[0.1em] uppercase text-[var(--muted)] mb-1">
            📈 Live investment portfolio
          </div>
          <p className="text-xs text-[var(--muted)] max-w-md leading-relaxed">
            Add each holding as a ticker and share count — MalMind prices it live from the market in SAR.
            Tadawul uses a <span className="font-mono">.SR</span> suffix (e.g. <span className="font-mono">2222.SR</span>);
            US tickers are bare (e.g. <span className="font-mono">AAPL</span>).
          </p>
        </div>
        {holdings.length > 0 && (
          <button
            onClick={() => refresh(holdings)}
            disabled={loading}
            className="text-xs font-medium text-[var(--green-dark)] bg-[var(--green-bg)] border border-[var(--green-border)] rounded-lg px-3 py-1.5 disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? 'Refreshing…' : '↻ Refresh prices'}
          </button>
        )}
      </div>

      {/* add a holding */}
      <form onSubmit={addHolding} className="grid grid-cols-2 sm:grid-cols-[1fr_auto_auto_auto] gap-2 mt-4 mb-4">
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Name (optional)"
          className="bg-[var(--surface-1)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--green)]"
        />
        <input
          value={form.ticker}
          onChange={(e) => setForm((f) => ({ ...f, ticker: e.target.value }))}
          placeholder="Ticker"
          className="w-28 bg-[var(--surface-1)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm font-mono uppercase outline-none focus:border-[var(--green)]"
        />
        <input
          value={form.quantity}
          onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
          placeholder="Shares"
          inputMode="decimal"
          className="w-24 bg-[var(--surface-1)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--green)]"
        />
        <button
          type="submit"
          className="text-sm bg-[var(--green-dark)] text-white rounded-lg px-4 py-2 font-medium whitespace-nowrap"
        >
          Add
        </button>
      </form>

      {holdings.length === 0 ? (
        <div className="text-sm text-[var(--muted)] py-2">
          No live holdings yet. Add your first above — try <span className="font-mono">2222.SR</span> or{' '}
          <span className="font-mono">AAPL</span>.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs whitespace-nowrap">
              <thead>
                <tr className="text-[var(--muted)] text-left">
                  <th className="py-2 pr-3 font-medium">Holding</th>
                  <th className="py-2 px-3 font-medium text-right">Shares</th>
                  <th className="py-2 px-3 font-medium text-right">Price</th>
                  <th className="py-2 px-3 font-medium text-right">Day</th>
                  <th className="py-2 px-3 font-medium text-right">Market value</th>
                  <th className="py-2 pl-3" />
                </tr>
              </thead>
              <tbody>
                {valued.map((v) => (
                  <tr key={v.id} className="border-t border-[var(--border-default)]">
                    <td className="py-2 pr-3">
                      <span className="font-mono text-[var(--ink)]">{v.ticker}</span>
                      {v.name !== v.ticker && <span className="text-[var(--muted)]"> · {v.name}</span>}
                      {v.q && v.q.currency && v.q.currency !== 'SAR' && (
                        <span className="text-[10px] text-[var(--muted)]"> ({v.q.currency})</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right text-[var(--ink-2)]">{v.quantity}</td>
                    <td className="py-2 px-3 text-right text-[var(--ink-2)]">
                      {v.q && v.q.priceSar !== null ? `SAR ${fmt(v.q.priceSar)}` : v.q ? '—' : '…'}
                    </td>
                    <td
                      className="py-2 px-3 text-right"
                      style={{
                        color:
                          v.q?.changePct == null
                            ? 'var(--muted)'
                            : v.q.changePct >= 0
                              ? 'var(--green-dark)'
                              : 'var(--red-2)',
                      }}
                    >
                      {v.q?.changePct == null
                        ? '—'
                        : `${v.q.changePct >= 0 ? '▲' : '▼'} ${Math.abs(v.q.changePct).toFixed(1)}%`}
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-[var(--ink)]">
                      {v.marketValue !== null ? `SAR ${fmt(v.marketValue)}` : '—'}
                    </td>
                    <td className="py-2 pl-3 text-right">
                      <button
                        onClick={() => del(v.id)}
                        className="text-[var(--muted)] hover:text-[#C0504D]"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap mt-4 pt-4 border-t border-[var(--border-default)]">
            <div>
              <div className="text-[10px] text-[var(--muted)]">
                Total market value{priced < holdings.length ? ` · ${priced}/${holdings.length} priced` : ''}
                {asOfLabel ? ` · as of ${asOfLabel}` : ''}
              </div>
              <div className="font-serif text-2xl font-bold text-[var(--green-dark)]">SAR {fmt(total)}</div>
            </div>
            <button
              onClick={applyToMonth}
              disabled={total <= 0}
              className="text-sm font-medium bg-[var(--ink)] text-[var(--surface-0)] rounded-lg px-4 py-2 disabled:opacity-40"
            >
              Apply to this month →
            </button>
          </div>
          {applyMsg && <p className="text-xs text-[var(--ink-2)] mt-3">{applyMsg}</p>}
        </>
      )}
    </div>
  );
}
