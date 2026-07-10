// src/lib/doublingPath.ts
// How many times a portfolio doubles at a given ROI, and how old the user
// will be at each doubling - the same "make compounding feel real" math as
// the prototype, ported to pure functions.

export const ITERATIONS = 15;
export const LIFE_EXPECTANCY = 78;
export const COMPARISON_HORIZON_YEARS = 25;
export const ROI_PRESETS = [
  { roi: 5, note: 'cash/sukuk' },
  { roi: 8, note: 'balanced' },
  { roi: 12, note: 'equity' },
  { roi: 20, note: 'aggressive' },
];

export interface Milestone {
  iter: number;
  value: number;
  yearsFromNow: number;
  ageThen: number;
  date: Date;
}

export function doublingYears(roi: number): number {
  return Math.log(2) / Math.log(1 + roi / 100);
}

export function buildMilestones(
  amount: number,
  age: number,
  roi: number,
  now = new Date()
): Milestone[] {
  const dy = doublingYears(roi);
  const out: Milestone[] = [];
  for (let i = 1; i <= ITERATIONS; i++) {
    const value = amount * Math.pow(2, i);
    const yearsFromNow = dy * i;
    const ageThen = age + yearsFromNow;
    const date = new Date(
      now.getFullYear() + Math.floor(yearsFromNow),
      now.getMonth() + Math.round((yearsFromNow % 1) * 12)
    );
    out.push({ iter: i, value, yearsFromNow, ageThen, date });
  }
  return out;
}

export function comparisonValue(amount: number, roi: number, years = COMPARISON_HORIZON_YEARS): number {
  return amount * Math.pow(1 + roi / 100, years);
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function fmtMonthYear(d: Date): string {
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}
