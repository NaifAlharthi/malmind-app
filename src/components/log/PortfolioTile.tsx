'use client';

// The investment portfolios tile on the Log page. The Log is the book
// of record — this tile shows the LIVE side of one line in it: every
// ticker holding priced now, totaled, and compared against the stocks
// figure the Log holds for this month. When the live market and the
// book disagree, the drift is shown — managing holdings stays in
// Holdings, reading stays here.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { loadHoldings, valueHoldings, type PortfolioValue } from '@/lib/livePortfolio';

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

export default function PortfolioTile() {
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const [pf, setPf] = useState<PortfolioValue | null | 'empty'>(null);
  const [loggedStocks, setLoggedStocks] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setPf('empty'); return; }
      // the Log's latest stocks line — the book value this tile drifts
      // against (fetched ascending + last, the shape the demo shim speaks)
      const { data: snaps } = await supabase
        .from('financial_snapshots')
        .select('year, month, stocks')
        .eq('user_id', user.id)
        .order('year', { ascending: true })
        .order('month', { ascending: true });
      const arr = (snaps ?? []) as { stocks: number }[];
      setLoggedStocks(arr.length ? Number(arr[arr.length - 1].stocks) : null);
      const holdings = await loadHoldings(user.id);
      if (holdings.length === 0) { setPf('empty'); return; }
      setPf(await valueHoldings(holdings));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (pf === null) {
    return (
      <div className="drv-num bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 mb-8 text-sm text-[var(--muted)]">
        {L('تُسعَّر المحفظة…', 'Pricing the portfolio…')}
      </div>
    );
  }

  if (pf === 'empty') {
    return (
      <div className="drv-num bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 sm:p-6 mb-8">
        <div className="font-serif text-lg font-semibold text-[var(--ink)] mb-1">📈 {L('محافظك الاستثمارية', 'Investment portfolios')}</div>
        <p className="text-[11px] text-[var(--muted)] leading-relaxed mb-3">
          {L(
            'أضف أسهمك برمزها وعددها — وسيُسعّرها هذا الجزء مباشرةً من السوق كلما فتحت السِّجل.',
            'Add your stocks by ticker and share count — this tile will price them live from the market every time you open the Log.'
          )}
        </p>
        <Link href="/holdings" className="text-xs font-semibold text-white bg-[var(--green-dark)] rounded-lg px-4 py-2 inline-block">
          {L('أضف أول حيازة ←', 'Add your first holding →')}
        </Link>
      </div>
    );
  }

  const drift = loggedStocks !== null && loggedStocks > 0 ? pf.total - loggedStocks : null;
  const driftPct = drift !== null && loggedStocks ? (drift / loggedStocks) * 100 : null;

  return (
    <div className="drv-num bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 sm:p-6 mb-8">
      <div className="flex items-baseline justify-between gap-2 flex-wrap mb-1">
        <div className="font-serif text-lg font-semibold text-[var(--ink)]">📈 {L('محافظك الاستثمارية', 'Investment portfolios')}</div>
        <Link href="/holdings" className="text-[11px] font-semibold text-[var(--green-dark)] hover:underline">
          {L('أدرها في الأصول ←', 'Manage in Holdings →')}
        </Link>
      </div>
      <p className="text-[11px] text-[var(--muted)] leading-relaxed mb-4">
        {L(
          `${pf.valued.length} ${pf.valued.length === 1 ? 'حيازة' : 'حيازات'} مسعَّرة الآن من السوق مباشرة${pf.asOf ? '' : ''} — والسطر الأخير يقارنها بما في سِجلّك.`,
          `${pf.valued.length} ${pf.valued.length === 1 ? 'holding' : 'holdings'} priced live from the market — the last line compares them to what your Log holds.`
        )}
      </p>

      {/* the holdings, priced */}
      <div className="overflow-x-auto" dir="ltr">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-[var(--border-faint)]">
              <th className="p-2 text-[10px] text-[var(--muted)] font-semibold text-start">{L('الحيازة', 'Holding')}</th>
              <th className="p-2 text-[10px] text-[var(--muted)] font-semibold text-end">{L('الكمية', 'Qty')}</th>
              <th className="p-2 text-[10px] text-[var(--muted)] font-semibold text-end">{L('السعر (ر.س)', 'Price (SAR)')}</th>
              <th className="p-2 text-[10px] text-[var(--muted)] font-semibold text-end">{L('اليوم', 'Today')}</th>
              <th className="p-2 text-[10px] text-[var(--muted)] font-semibold text-end">{L('القيمة (ر.س)', 'Value (SAR)')}</th>
            </tr>
          </thead>
          <tbody>
            {pf.valued.map((h) => (
              <tr key={h.id} className="border-b border-[var(--border-faint)]/60">
                <td className="p-2">
                  <span className="font-semibold text-[var(--ink)]">{h.ticker}</span>
                  <span className="text-[var(--muted)] ms-2">{h.name}</span>
                </td>
                <td className="p-2 text-end text-[var(--ink-2)]">{h.quantity.toLocaleString('en-US')}</td>
                <td className="p-2 text-end text-[var(--ink-2)]">{h.quote?.priceSar !== null && h.quote?.priceSar !== undefined ? h.quote.priceSar.toFixed(2) : '—'}</td>
                <td className={`p-2 text-end font-semibold ${h.quote?.changePct == null ? 'text-[var(--muted)]' : h.quote.changePct >= 0 ? 'text-[var(--green-dark)]' : 'text-[#D64545]'}`}>
                  {h.quote?.changePct == null ? '—' : `${h.quote.changePct >= 0 ? '▲' : '▼'} ${Math.abs(h.quote.changePct).toFixed(2)}%`}
                </td>
                <td className="p-2 text-end font-semibold text-[var(--ink)]">{h.marketValue !== null ? fmt(h.marketValue) : '—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="p-2 font-bold text-[var(--ink)]" colSpan={4}>{L('الإجمالي الحي', 'Live total')}</td>
              <td className="p-2 text-end font-bold text-[var(--green-dark)]">{fmt(pf.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* live vs the book — the drift line */}
      <div className="mt-3 flex items-center justify-between gap-3 flex-wrap rounded-xl border border-[var(--border-faint)] bg-[var(--surface-1)] px-3.5 py-2.5">
        <div className="text-[11px] text-[var(--ink-2)]">
          {loggedStocks === null || loggedStocks === 0
            ? L('سِجلّك لا يحمل رقم أسهم لهذا الشهر بعد.', "Your Log holds no stocks figure for this month yet.")
            : drift !== null && Math.abs(drift) < 1
              ? L('السوق وسِجلّك متطابقان — لا انحراف.', 'Market and Log agree — no drift.')
              : L(
                  `سِجلّك يقول ${fmt(loggedStocks)} — السوق يقول ${fmt(pf.total)} (${drift! >= 0 ? '+' : '−'}${fmt(Math.abs(drift!))}${driftPct !== null ? ` · ${Math.abs(driftPct).toFixed(1)}٪` : ''}).`,
                  `Your Log says ${fmt(loggedStocks)} — the market says ${fmt(pf.total)} (${drift! >= 0 ? '+' : '−'}${fmt(Math.abs(drift!))}${driftPct !== null ? ` · ${Math.abs(driftPct).toFixed(1)}%` : ''}).`
                )}
          {pf.priced < pf.valued.length && (
            <span className="text-[var(--muted)]"> {L(`(${pf.valued.length - pf.priced} بلا سعر)`, `(${pf.valued.length - pf.priced} unpriced)`)}</span>
          )}
        </div>
        <Link href="/log/update?f=stocks" className="text-[10px] font-semibold text-[var(--green-dark)] border border-[var(--green-border)] rounded-lg px-3 py-1.5 hover:bg-[var(--green-bg)] transition-colors whitespace-nowrap">
          {L('حدّث سطر السِّجل ←', "Update the Log's line →")}
        </Link>
      </div>
    </div>
  );
}
