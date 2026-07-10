// src/lib/velocity.ts
// Time-to-milestone math for the Velocity of Money page: how many months
// (at your real disposable income) it takes to reach each wealth target,
// and how that stretches under a few illustrative Saudi mortgage scenarios.

export const MILESTONES = [1000, 10000, 25000, 50000, 100000, 250000, 500000, 750000, 1000000];
export const FOCUS_MILESTONES = [50000, 100000, 250000, 500000, 1000000];

export interface MortgageScenario {
  key: string;
  label: string;
  install: number; // illustrative monthly installment, SAR
  color: string;
}

// Illustrative monthly installments for a property financed at roughly
// 66% / 50% / 34% of income - not the user's real numbers, just example
// scenarios so they can see how a mortgage bends the timeline.
export const SCENARIOS: MortgageScenario[] = [
  { key: 'none', label: 'No mortgage', install: 0, color: '#2a78d6' },
  { key: 'sixtysix', label: '66% mortgage', install: 9846.21, color: '#141414' },
  { key: 'fifty', label: '50% mortgage', install: 7459.25, color: '#8a99a8' },
  { key: 'thirtyfour', label: '34% mortgage', install: 5072.29, color: '#eda100' },
];

export function computeDisposable(salary: number, sideIncome: number, expense: number): number {
  return Math.max(0, salary + sideIncome - expense);
}

export function scenarioDisposable(disposable: number, scenario: MortgageScenario): number {
  return Math.max(0, disposable - scenario.install);
}

export function timeToTargetMonths(target: number, disposable: number): number {
  if (disposable <= 0) return Infinity;
  return target / disposable;
}

export function monthsToWords(months: number): string {
  if (!Number.isFinite(months)) return 'never, at this pace';
  const years = Math.floor(months / 12);
  const remMonths = Math.round(months % 12);
  if (years === 0) return `${Math.round(months)} months`;
  if (remMonths === 0) return `${years} year${years > 1 ? 's' : ''}`;
  return `${years} year${years > 1 ? 's' : ''} and ${remMonths} month${remMonths > 1 ? 's' : ''}`;
}
