// src/lib/dailyStack.ts
// "The Daily Stack" — a day of spending seen as a stack of choices, and the
// snowball it becomes when repeated. Everything is normalised to a per-DAY
// amount, then scaled to whatever lens the user views their life through
// (day · week · month · year). The compounding maths link daily choices to the
// pace shown by the Velocity of Money tool.

export type Period = 'day' | 'week' | 'month' | 'year';
export const PERIODS: Period[] = ['day', 'week', 'month', 'year'];
export const PERIOD_DAYS: Record<Period, number> = { day: 1, week: 7, month: 30.44, year: 365.25 };

const PERIOD_LABEL: Record<'ar' | 'en', Record<Period, string>> = {
  en: { day: 'Day', week: 'Week', month: 'Month', year: 'Year' },
  ar: { day: 'يوم', week: 'أسبوع', month: 'شهر', year: 'سنة' },
};
const PERIOD_PER: Record<'ar' | 'en', Record<Period, string>> = {
  en: { day: 'a day', week: 'a week', month: 'a month', year: 'a year' },
  ar: { day: 'في اليوم', week: 'في الأسبوع', month: 'في الشهر', year: 'في السنة' },
};
export const periodLabel = (p: Period, locale: 'ar' | 'en') => PERIOD_LABEL[locale][p];
export const periodPer = (p: Period, locale: 'ar' | 'en') => PERIOD_PER[locale][p];
export const scaleToPeriod = (daily: number, p: Period) => daily * PERIOD_DAYS[p];

// ── Classifying each choice ─────────────────────────────────────────────
export type Kind = 'need' | 'want' | 'debt';
export const KIND_COLOR: Record<Kind, string> = { need: '#4A78C4', want: '#C9A84C', debt: '#C2603F' };

const NEED_KW = ['food', 'grocer', 'housing', 'rent', 'home', 'utilit', 'bill', 'health', 'insur', 'educat', 'school', 'transport', 'fuel', 'gas', 'medical', 'nursery', 'water', 'electric'];
const CAT_ICON: [string, string][] = [
  ['grocer', '🛒'], ['food', '🍽'], ['dining', '🍽'], ['restaur', '🍽'], ['coffee', '☕'],
  ['rent', '🏠'], ['hous', '🏠'], ['home', '🏠'], ['mortgage', '🏦'], ['loan', '🏦'],
  ['transport', '🚗'], ['car', '🚗'], ['fuel', '⛽'], ['health', '🩺'], ['gym', '🏋'],
  ['educat', '🎓'], ['school', '🎓'], ['nursery', '🎓'], ['entertain', '🎬'], ['subscription', '📱'],
  ['service', '📱'], ['tool', '🛠'], ['shop', '🛍'], ['cloth', '🛍'], ['travel', '✈️'],
  ['bill', '💡'], ['utilit', '💡'], ['insur', '🛡'], ['family', '👨‍👩‍👧'], ['kids', '🧸'],
];

function iconFor(category: string | null, name: string): string {
  const s = `${category ?? ''} ${name}`.toLowerCase();
  for (const [k, ic] of CAT_ICON) if (s.includes(k)) return ic;
  return '•';
}
function classify(category: string | null, name: string, source: 'expense' | 'sub' | 'loan'): Kind {
  if (source === 'loan') return 'debt';
  const s = `${category ?? ''} ${name}`.toLowerCase();
  if (NEED_KW.some((k) => s.includes(k))) return 'need';
  return 'want';
}

export interface RawExpense { name: string; category: string | null; amount: number; frequency: 'monthly' | 'annual' | 'one_off' }
export interface RawSub { name: string; amount: number; billing_cycle: 'monthly' | 'annual'; category?: string | null }
export interface RawLoan { name: string; monthly_payment: number; loan_type?: string | null }

export interface StackItem { label: string; category: string; icon: string; kind: Kind; daily: number }

// Every recurring choice, normalised to a per-day amount, biggest first.
export function buildDailyItems(expenses: RawExpense[], subs: RawSub[], loans: RawLoan[]): StackItem[] {
  const items: StackItem[] = [];
  for (const e of expenses) {
    if (e.frequency === 'one_off') continue;
    const daily = Number(e.amount) / (e.frequency === 'annual' ? PERIOD_DAYS.year : PERIOD_DAYS.month);
    if (daily > 0) items.push({ label: e.name, category: e.category || 'Other', icon: iconFor(e.category, e.name), kind: classify(e.category, e.name, 'expense'), daily });
  }
  for (const s of subs) {
    const daily = Number(s.amount) / (s.billing_cycle === 'annual' ? PERIOD_DAYS.year : PERIOD_DAYS.month);
    if (daily > 0) items.push({ label: s.name, category: s.category || 'Subscriptions', icon: iconFor(s.category ?? 'subscription', s.name), kind: classify(s.category ?? null, s.name, 'sub'), daily });
  }
  for (const l of loans) {
    const daily = Number(l.monthly_payment) / PERIOD_DAYS.month;
    if (daily > 0) items.push({ label: l.name, category: l.loan_type === 'mortgage' ? 'Mortgage' : 'Loan', icon: '🏦', kind: 'debt', daily });
  }
  return items.sort((a, b) => b.daily - a.daily);
}

// Collapse items into one brick per category (for the stack visual).
export function byCategory(items: StackItem[]): StackItem[] {
  const map = new Map<string, StackItem>();
  for (const it of items) {
    const cur = map.get(it.category);
    if (cur) cur.daily += it.daily;
    else map.set(it.category, { ...it, label: it.category });
  }
  return [...map.values()].sort((a, b) => b.daily - a.daily);
}

export function sumBy(items: StackItem[], kind?: Kind): number {
  return items.filter((i) => !kind || i.kind === kind).reduce((s, i) => s + i.daily, 0);
}

// ── The snowball: what a daily amount becomes, invested ──────────────────
export const DEFAULT_RETURN = 0.07; // ~7%/yr, illustrative
export const DEBT_RATE = 0.16;      // typical revolving-debt rate

// Future value of a daily amount contributed and compounded (monthly).
export function futureValue(dailyAmount: number, years: number, annualRate: number): number {
  const monthly = dailyAmount * PERIOD_DAYS.month;
  const r = annualRate / 12;
  const n = Math.round(years * 12);
  if (r === 0) return monthly * n;
  return monthly * ((Math.pow(1 + r, n) - 1) / r);
}
