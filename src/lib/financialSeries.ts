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

export type Granularity = 'month' | 'quarter' | 'year';

export function granularityOf(view: RangeView): Granularity {
  if (view === 'quarters') return 'quarter';
  if (view === 'annual') return 'year';
  return 'month';
}

// How many buckets a view shows at once (∞ = the whole history). This is the
// window *width*; its position can then be panned across the full series.
export function windowBucketsOf(view: RangeView): number {
  switch (view) {
    case 'months':
      return 12;
    case 'quarters':
      return 8; // two years of quarters
    case 'annual':
      return 6;
    case '3y':
      return 36;
    case '5y':
      return 60;
    default:
      return Infinity; // 'all'
  }
}

function assetsOf(s: SnapshotLike): number {
  return s.cash + s.stocks + s.real_estate + s.equity + s.other_assets;
}

/**
 * Bucket snapshots (sorted ascending by year, month) into the full, unwindowed
 * series at the given resolution. Callers apply their own window/pan on top.
 */
export function bucketSeries(rows: SnapshotLike[], gran: Granularity): SeriesPoint[] {
  if (rows.length === 0) return [];

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

  const points: SeriesPoint[] = order.map((key) => {
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

  return points;
}

/**
 * Full series for a view at its resolution, trimmed to the trailing window
 * width (position anchored to the most recent data). Callers that need to pan
 * should use bucketSeries + windowBucketsOf directly.
 */
export function buildSeries(rows: SnapshotLike[], view: RangeView): SeriesPoint[] {
  const full = bucketSeries(rows, granularityOf(view));
  const width = windowBucketsOf(view);
  return Number.isFinite(width) && full.length > width ? full.slice(full.length - width) : full;
}

// ── Statistical analysis ────────────────────────────────────────────────
// Deltas (nominal SAR and %), totals and averages for a single metric across
// whatever series is currently on screen — so the numbers always match the
// selected range/resolution.

export type NumericKey = Exclude<keyof SeriesPoint, 'label'>;

export interface MetricStat {
  count: number;
  first: number;
  last: number;
  prev: number | null; // second-to-last point
  deltaAbs: number; // last - first  (change across the whole view)
  deltaPct: number | null; // % change across the view (null if first is 0)
  periodAbs: number | null; // last - prev (most recent step)
  periodPct: number | null;
  total: number; // sum of every point (meaningful for flows)
  avg: number; // mean per point
  min: number;
  max: number;
}

export function metricStat(points: SeriesPoint[], key: NumericKey): MetricStat {
  const vals = points.map((p) => p[key] as number);
  const n = vals.length;
  if (n === 0) {
    return { count: 0, first: 0, last: 0, prev: null, deltaAbs: 0, deltaPct: null, periodAbs: null, periodPct: null, total: 0, avg: 0, min: 0, max: 0 };
  }

  const first = vals[0];
  const last = vals[n - 1];
  const prev = n >= 2 ? vals[n - 2] : null;
  const deltaAbs = last - first;
  const deltaPct = first !== 0 ? (deltaAbs / Math.abs(first)) * 100 : null;
  const periodAbs = prev !== null ? last - prev : null;
  const periodPct = prev !== null && prev !== 0 ? ((last - prev) / Math.abs(prev)) * 100 : null;
  const total = vals.reduce((s, v) => s + v, 0);

  return {
    count: n,
    first,
    last,
    prev,
    deltaAbs,
    deltaPct,
    periodAbs,
    periodPct,
    total,
    avg: total / n,
    min: Math.min(...vals),
    max: Math.max(...vals),
  };
}
