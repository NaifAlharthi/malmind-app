// src/lib/positioningBenchmarks.ts
// Illustrative Saudi-context benchmark curves (national average / higher
// peer) for monthly income and net worth, indexed by age 18-30 - the same
// disclosed-as-illustrative placeholders the Positioning page has always
// used, just richer (age-indexed rather than a single multiplier). The
// user's own "you" curve is built elsewhere from their real logged data.

export const BENCHMARK_START_AGE = 18;
const BENCHMARK_END_AGE = 30;

const INCOME_NATIONAL = [0, 0, 0, 7000, 7000, 8500, 10000, 10000, 12000, 12500, 13500, 15000, 16000];
const INCOME_HIGHER = [0, 0, 0, 18000, 18000, 20000, 20000, 24000, 26000, 26000, 26000, 26000, 26000];
const NETWORTH_NATIONAL = [0, 0, 0, 10000, 30000, 60000, 100000, 150000, 200000, 250000, 290000, 320000, 350000];
const NETWORTH_HIGHER = [0, 0, 0, 50000, 200000, 500000, 1000000, 1000000, 1200000, 2000000, 2300000, 2400000, 2500000];

// Ages past 30 aren't in the base table; continue at the trailing
// year-over-year growth rate observed at the end of it.
function extendWithTrailingGrowth(base: number[], toAge: number): number[] {
  const result = [...base];
  const last = base[base.length - 1];
  const prev = base[base.length - 2];
  const growth = prev > 0 ? last / prev : 1;
  let current = last;
  for (let age = BENCHMARK_START_AGE + base.length; age <= toAge; age++) {
    current = current * growth;
    result.push(Math.round(current));
  }
  return result;
}

function seriesForRange(base: number[], minAge: number, maxAge: number): number[] {
  const extended = maxAge > BENCHMARK_END_AGE ? extendWithTrailingGrowth(base, maxAge) : base;
  const startIdx = Math.max(0, minAge - BENCHMARK_START_AGE);
  const endIdx = maxAge - BENCHMARK_START_AGE + 1;
  return extended.slice(startIdx, endIdx);
}

export interface BenchmarkCurves {
  incomeNational: number[];
  incomeHigher: number[];
  networthNational: number[];
  networthHigher: number[];
}

export function buildBenchmarkCurves(minAge: number, maxAge: number): BenchmarkCurves {
  return {
    incomeNational: seriesForRange(INCOME_NATIONAL, minAge, maxAge),
    incomeHigher: seriesForRange(INCOME_HIGHER, minAge, maxAge),
    networthNational: seriesForRange(NETWORTH_NATIONAL, minAge, maxAge),
    networthHigher: seriesForRange(NETWORTH_HIGHER, minAge, maxAge),
  };
}

// Maps a calendar year to the user's age in that year, from their current age.
export function ageAtYear(currentAge: number, currentYear: number, year: number): number {
  return currentAge - (currentYear - year);
}

// Buckets real (year, value) entries into an age-indexed array (null where
// there's no logged data for that age). Multiple entries for the same year
// are averaged (used for income_entries, which are logged per month).
export function buildYouSeries(
  entries: { year: number; value: number }[],
  currentAge: number,
  currentYear: number,
  minAge: number,
  maxAge: number
): (number | null)[] {
  const byYear = new Map<number, number[]>();
  for (const e of entries) {
    const list = byYear.get(e.year) ?? [];
    list.push(e.value);
    byYear.set(e.year, list);
  }

  const result: (number | null)[] = [];
  for (let age = minAge; age <= maxAge; age++) {
    const year = currentYear - (currentAge - age);
    const values = byYear.get(year);
    if (values && values.length > 0) {
      result.push(values.reduce((a, b) => a + b, 0) / values.length);
    } else {
      result.push(null);
    }
  }
  return result;
}

export function computeGapAndGain(
  youSeries: (number | null)[],
  compareSeries: number[]
): { missedTotal: number; gainTotal: number } {
  let missedMonthly = 0;
  let gainMonthly = 0;
  for (let i = 0; i < youSeries.length; i++) {
    const you = youSeries[i];
    const compare = compareSeries[i];
    if (you == null || compare == null) continue;
    if (compare > you) missedMonthly += compare - you;
    else if (you >= compare && you > 0) gainMonthly += you - compare;
  }
  return { missedTotal: missedMonthly * 12, gainTotal: gainMonthly * 12 };
}
