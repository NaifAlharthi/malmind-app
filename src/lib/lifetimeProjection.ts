// src/lib/lifetimeProjection.ts
// A rough month-by-month projection of lifetime income/savings, built from
// a handful of assumptions (career start year/income, current income, save
// rate) rather than real logged data. Income is modeled as accelerating from
// the starting figure toward the current one; the save rate ramps up too,
// since people tend to save a bigger share as they earn more.

export interface ProjectionInputs {
  startYear: number;
  startIncome: number;
  currentIncome: number;
  saveRate: number; // 0..1
}

export interface ProjectionPoint {
  year: number;
  month: number; // 0-indexed
  monthlyIncome: number;
  cumulativeIncome: number;
  cumulativeSaved: number;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function monthLabel(p: { year: number; month: number }): string {
  return `${MONTH_NAMES[p.month]} ${p.year}`;
}

export function buildProjection(inputs: ProjectionInputs, now = new Date()): ProjectionPoint[] {
  const { startYear, startIncome, currentIncome, saveRate } = inputs;
  const endYear = now.getFullYear();
  const endMonth = now.getMonth();

  let totalMonths = (endYear - startYear) * 12 + endMonth + 1;
  if (totalMonths < 2) totalMonths = 2;

  const series: ProjectionPoint[] = [];
  let cumulativeIncome = 0;
  let cumulativeSaved = 0;

  for (let i = 0; i < totalMonths; i++) {
    const t = i / (totalMonths - 1);
    const monthlyIncome = startIncome + (currentIncome - startIncome) * Math.pow(t, 1.4);
    const effectiveRate = saveRate * (0.4 + 0.6 * t);

    cumulativeIncome += monthlyIncome;
    cumulativeSaved += monthlyIncome * effectiveRate;

    const year = startYear + Math.floor(i / 12);
    const month = i % 12;
    series.push({ year, month, monthlyIncome, cumulativeIncome, cumulativeSaved });
  }

  return series;
}
