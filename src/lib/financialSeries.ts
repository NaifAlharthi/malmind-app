// src/lib/financialSeries.ts
// Turns a month-by-month list of financial snapshots into chart-ready points
// at a chosen time resolution / window. Shared so any chart in the app can
// offer the same "Months · Quarters · Annual · 3-year · 5-year · All" control.
//
// Aggregation is field-aware, because a financial statement mixes two kinds of
// number:
//   • balances (cash, stocks, property, equity, other, liabilities) are a
//     point in time — a quarter or year is represented by its LAST month
//     (the period-end balance);
//   • flows (income, expenses) accumulate — a quarter or year SUMS its months.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export type RangeView = 'months' | 'quarters' | 'annual' | '3y' | '5y' | 'all';

export const RANGE_VIEWS: { key: RangeView; label: string }[] = [
  { key: 'months', label: 'Months' },
  { key: 'quarters', label: 'Quarters' },
  { key: 'annual', label: 'Annual' },
  { key: '3y', label: '3-year' },
  { key: '5y', label: '5-year' },
  { key: 'all', label: 'All' },
];

export const DEFAULT_RANGE_VIEW: RangeView = 'all';

// The snapshot shape this operates on (structural — any object with these
// numeric fields works).
export interface SnapshotLike {
  year: number;
  month: number; // 1-12
  cash: number;
  stocks: number;
  real_estate: number;
  equity: number;
  other_assets: number;
  liabilities: number;
  income: number;
  expenses: number;
}

export interface SeriesPoint {
  label: string;
  cash: number;
  stocks: number;
  real_estate: number;
  equity: number;
  other_assets: number;
  liabilities: number;
  income: number;
  expenses: number;
  assets: number;
  netWorth: number;
}

function granularityOf(view: RangeView): 'month' | 'quarter' | 'year' {
  if (view === 'quarters') return 'quarter';
  if (view === 'annual') return 'year';
  return 'month';
}

// How many trailing months a monthly view keeps (∞ = keep everything).
function windowMonthsOf(view: RangeView): number {
  switch (view) {
    case 'months':
      return 12;
    case '3y':
      return 36;
    case '5y':
      return 60;
    default:
      return Infinity; // 'all' (and the quarter/year views, which ignore this)
  }
}

function assetsOf(s: SnapshotLike): number {
  return s.cash + s.stocks + s.real_estate + s.equity + s.other_assets;
}

/**
 * Build chart points from snapshots (must be sorted ascending by year, month).
 */
export function buildSeries(rows: SnapshotLike[], view: RangeView): SeriesPoint[] {
  if (rows.length === 0) return [];

  const gran = granularityOf(view);

  // Group into buckets, preserving chronological order.
  const buckets = new Map<string, SnapshotLike[]>();
  const order: string[] = [];
  for (const r of rows) {
    const key =
      gran === 'year'
        ? `${r.year}`
        : gran === 'quarter'
          ? `${r.year}-Q${Math.floor((r.month - 1) / 3) + 1}`
          : `${r.year}-${String(r.month).padStart(2, '0')}`;
    if (!buckets.has(key)) {
      buckets.set(key, []);
      order.push(key);
    }
    buckets.get(key)!.push(r);
  }

  let points: SeriesPoint[] = order.map((key) => {
    const items = buckets.get(key)!; // ascending within the bucket
    const last = items[items.length - 1]; // period-end balances
    const income = items.reduce((sum, x) => sum + x.income, 0);
    const expenses = items.reduce((sum, x) => sum + x.expenses, 0);
    const assets = assetsOf(last);

    const label =
      gran === 'year'
        ? `${last.year}`
        : gran === 'quarter'
          ? `Q${Math.floor((last.month - 1) / 3) + 1} ${String(last.year).slice(2)}`
          : `${MONTHS[last.month - 1]} ${String(last.year).slice(2)}`;

    return {
      label,
      cash: last.cash,
      stocks: last.stocks,
      real_estate: last.real_estate,
      equity: last.equity,
      other_assets: last.other_assets,
      liabilities: last.liabilities,
      income,
      expenses,
      assets,
      netWorth: assets - last.liabilities,
    };
  });

  // Trailing-window views only apply at monthly resolution.
  const windowMonths = windowMonthsOf(view);
  if (gran === 'month' && Number.isFinite(windowMonths) && points.length > windowMonths) {
    points = points.slice(points.length - windowMonths);
  }

  return points;
}
