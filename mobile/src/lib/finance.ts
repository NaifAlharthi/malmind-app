// The numbers every screen reads — derived once from the Log, the same way
// the website derives them (6-month averages, latest balances).

import type { Data, Snap } from '@/lib/store';

export const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

export function compact(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1)}M`;
  if (a >= 10_000) return `${Math.round(n / 1_000)}k`;
  return fmt(n);
}

export const assetsOf = (s: Snap) => s.cash + s.stocks + s.equity + s.real_estate + s.other_assets;
export const netWorthOf = (s: Snap) => assetsOf(s) - s.liabilities;

export interface Vitals {
  hasData: boolean;
  first: Snap | null;
  last: Snap | null;
  months: number;
  avgIncome: number;
  avgExpenses: number;
  saved: number; // monthly, 6-mo average
  savingsRate: number | null; // fraction
  netWorth: number;
  netWorthChange: number; // since the first logged month
  assets: number;
  liabilities: number;
  invested: number;
  cash: number;
  runwayMonths: number | null;
  debtToAssets: number | null; // fraction
  debtService: number; // monthly payments across debts
  debtServiceRatio: number | null; // fraction of income
  creditScore: number | null;
  creditChange: number | null;
}

export function vitals(d: Data): Vitals {
  const snaps = d.snaps;
  const last = snaps[snaps.length - 1] ?? null;
  const first = snaps[0] ?? null;
  const recent = snaps.slice(-6);
  const avg = (f: (s: Snap) => number) => (recent.length ? recent.reduce((a, s) => a + f(s), 0) / recent.length : 0);
  const avgIncome = avg((s) => s.income);
  const avgExpenses = avg((s) => s.expenses);
  const saved = avgIncome - avgExpenses;
  const assets = last ? assetsOf(last) : 0;
  const debtService = d.debts.reduce((a, x) => a + x.monthly, 0);
  const lastScore = d.credit[d.credit.length - 1]?.score ?? null;
  const prevScore = d.credit.length >= 2 ? d.credit[d.credit.length - 2].score : null;
  return {
    hasData: !!last,
    first, last,
    months: snaps.length,
    avgIncome, avgExpenses, saved,
    savingsRate: avgIncome > 0 ? saved / avgIncome : null,
    netWorth: last ? netWorthOf(last) : 0,
    netWorthChange: last && first ? netWorthOf(last) - netWorthOf(first) : 0,
    assets,
    liabilities: last?.liabilities ?? 0,
    invested: last ? last.stocks + last.equity : 0,
    cash: last?.cash ?? 0,
    runwayMonths: avgExpenses > 0 && last ? last.cash / avgExpenses : null,
    debtToAssets: assets > 0 && last ? last.liabilities / assets : null,
    debtService,
    debtServiceRatio: avgIncome > 0 ? debtService / avgIncome : null,
    creditScore: lastScore,
    creditChange: lastScore !== null && prevScore !== null ? lastScore - prevScore : null,
  };
}

/** Year+month key and its label. */
export const ymKey = (s: { year: number; month: number }) => `${s.year}-${String(s.month).padStart(2, '0')}`;
