// src/lib/standardOfLiving.ts
// Tier system, static Saudi-context lifestyle reference data, and the
// per-year target/actual series builder for the Standard of Living page.

export type Tier = 'national_average' | 'basic' | 'decent' | 'lavish';

export const TIERS: Tier[] = ['national_average', 'basic', 'decent', 'lavish'];

// "lavish" is surfaced to users as "Financial Freedom" — the aspiration the
// whole product is built around. The enum value stays 'lavish' so existing
// data and the DB check constraint don't have to change.
export const TIER_LABEL: Record<Tier, string> = {
  national_average: 'National Average',
  basic: 'Basic',
  decent: 'Decent',
  lavish: 'Financial Freedom',
};

export const TIER_SHORT_LABEL: Record<Tier, string> = {
  national_average: 'Nat. Avg',
  basic: 'Basic',
  decent: 'Decent',
  lavish: 'Freedom',
};

export const TIER_LABEL_AR: Record<Tier, string> = {
  national_average: 'المتوسط الوطني',
  basic: 'أساسي',
  decent: 'لائق',
  lavish: 'الحرّية المالية',
};

export const TIER_SHORT_LABEL_AR: Record<Tier, string> = {
  national_average: 'المتوسط',
  basic: 'أساسي',
  decent: 'لائق',
  lavish: 'حرّية',
};

// ── National average, grounded in real Saudi data ───────────────────────
// GaStat Household Income & Expenditure Survey: the average monthly income of
// a Saudi household was SAR 14,823 (2018 survey). The latest 2023 survey puts
// average monthly *disposable* income for Saudi households at SAR 18,056.
// We anchor the baseline on the 2018 gross-income figure (comparable to the
// income users log) and surface both so the number stays transparent and
// easy to refresh as GaStat publishes new rounds.
export const NATIONAL_AVG_INCOME = 14823;
export const NATIONAL_AVG_SOURCE = {
  en: 'GaStat Household Income & Expenditure Survey — avg. Saudi household income SAR 14,823/mo (2018); latest 2023 round: SAR 18,056/mo disposable.',
  ar: 'مسح دخل وإنفاق الأسرة (الهيئة العامة للإحصاء) — متوسط دخل الأسرة السعودية 14,823 ريال/شهر (2018)؛ وأحدث جولة 2023: 18,056 ريال/شهر دخل متاح.',
};

// The three tiers a user positions form a "ladder" of monthly-income levels.
// national_average is a fixed reference line, not part of the ladder.
export type LadderTier = 'basic' | 'decent' | 'lavish';
export const LADDER_TIERS: LadderTier[] = ['basic', 'decent', 'lavish'];
export interface Ladder { basic: number; decent: number; lavish: number }

// Default ladder, anchored on the national average: basic ≈ national average,
// then a climb. Users slide these up or down relative to the baseline.
export const DEFAULT_LADDER: Ladder = { basic: 15000, decent: 30000, lavish: 60000 };

export function ladderValue(ladder: Ladder, tier: Tier): number {
  if (tier === 'basic') return ladder.basic;
  if (tier === 'decent') return ladder.decent;
  if (tier === 'lavish') return ladder.lavish;
  return NATIONAL_AVG_INCOME;
}

// What each rung means, in the user's own life-terms (kept short; the fuller
// Saudi-context breakdown lives in LIFESTYLE below).
export const TIER_MEANING: Record<LadderTier, { en: string; ar: string }> = {
  basic: {
    en: 'Your floor. The basics are covered but it’s tight — go below this and life stops working.',
    ar: 'أرضيّتك. الأساسيّات مغطّاة لكن بالكاد — تحت هذا المستوى تتوقّف الحياة عن العمل.',
  },
  decent: {
    en: 'Room to breathe. Things start moving — an extra outing, one more trip a year.',
    ar: 'متّسع للتنفّس. تبدأ الأمور بالتحرّك — خروج إضافي، ورحلة أخرى في السنة.',
  },
  lavish: {
    en: 'Financial freedom — the top you aspire to, where what you want is within reach.',
    ar: 'الحرّية المالية — القمّة التي تطمح إليها، حيث ما تريده في متناول يدك.',
  },
};

export function tierLabel(t: Tier, locale: 'ar' | 'en' = 'en'): string {
  return locale === 'ar' ? TIER_LABEL_AR[t] : TIER_LABEL[t];
}

export function tierShortLabel(t: Tier, locale: 'ar' | 'en' = 'en'): string {
  return locale === 'ar' ? TIER_SHORT_LABEL_AR[t] : TIER_SHORT_LABEL[t];
}

export function tierIndex(t: Tier): number {
  return TIERS.indexOf(t);
}

export function tierAt(index: number): Tier {
  return TIERS[Math.max(0, Math.min(TIERS.length - 1, Math.round(index)))];
}

// Map a real monthly income onto a tier, using the same illustrative
// Saudi-context bands as the LIFESTYLE reference below.
export function tierFromIncome(monthlyIncome: number): Tier {
  if (monthlyIncome >= 40000) return 'lavish';
  if (monthlyIncome >= 18000) return 'decent';
  if (monthlyIncome >= 10000) return 'basic';
  return 'national_average';
}

// A colour per tier for compact readouts (the full page doesn't need these).
export const TIER_COLOR: Record<Tier, string> = {
  national_average: '#8a99a8',
  basic: '#4A78C4',
  decent: '#1D9E75',
  lavish: '#C9A84C',
};

export interface LifestyleItem {
  icon: string;
  label: string;
  desc: string;
}

export interface LifestyleTier {
  income: string;
  items: LifestyleItem[];
}

// Static, illustrative Saudi-context reference data — the same for every
// user, not derived from anyone's real data.
export const LIFESTYLE: Record<Tier, LifestyleTier> = {
  national_average: {
    income: 'around SAR 5,000–9,000/month',
    items: [
      { icon: '🏠', label: 'Housing', desc: 'Shared flat or modest rental in an outer district' },
      { icon: '🚗', label: 'Transport', desc: 'Public transport, or one older economy car' },
      { icon: '✈️', label: 'Travel', desc: 'Rare — maybe one domestic trip a year' },
      { icon: '🎓', label: 'Schooling', desc: 'Public schools' },
      { icon: '🍽', label: 'Daily life', desc: 'Careful budgeting; eating out is occasional' },
      { icon: '💾', label: 'Savings', desc: 'Little left over after essentials' },
    ],
  },
  basic: {
    income: 'around SAR 10,000–16,000/month',
    items: [
      { icon: '🏠', label: 'Housing', desc: 'Your own modest apartment, rented or financed' },
      { icon: '🚗', label: 'Transport', desc: 'One reliable mid-range car' },
      { icon: '✈️', label: 'Travel', desc: 'One domestic trip and perhaps one short regional trip' },
      { icon: '🎓', label: 'Schooling', desc: 'Public schools, or low-cost private' },
      { icon: '🍽', label: 'Daily life', desc: 'Comfortable basics; casual dining weekly' },
      { icon: '💾', label: 'Savings', desc: 'A real emergency fund becomes possible' },
    ],
  },
  decent: {
    income: 'around SAR 18,000–35,000/month',
    items: [
      { icon: '🏠', label: 'Housing', desc: 'A good apartment or a starter villa in a solid area' },
      { icon: '🚗', label: 'Transport', desc: 'Two mid-tier cars for the household' },
      { icon: '✈️', label: 'Travel', desc: 'One international trip a year (Turkey, Europe, Asia)' },
      { icon: '🎓', label: 'Schooling', desc: 'Private school becomes realistic for the kids' },
      { icon: '🍽', label: 'Daily life', desc: 'Dining out freely, comfortable lifestyle' },
      { icon: '📈', label: 'Wealth', desc: 'Meaningful saving plus a growing investment portfolio' },
    ],
  },
  lavish: {
    income: 'SAR 40,000+/month or strong asset income',
    items: [
      { icon: '🏠', label: 'Housing', desc: 'A large villa in a prime district, possibly a second property' },
      { icon: '🚗', label: 'Transport', desc: 'Premium vehicles, replaced often, no strain' },
      { icon: '✈️', label: 'Travel', desc: 'Frequent international travel, business class' },
      { icon: '🎓', label: 'Schooling', desc: 'Top international schools; education fully funded' },
      { icon: '🧑‍🍳', label: 'Daily life', desc: 'Household help, fine dining, few financial limits' },
      { icon: '💼', label: 'Wealth', desc: 'Investments that generate income on their own' },
    ],
  },
};

export const LIFESTYLE_AR: Record<Tier, LifestyleTier> = {
  national_average: {
    income: 'نحو 5,000–9,000 ريال/شهر',
    items: [
      { icon: '🏠', label: 'السكن', desc: 'شقّة مشتركة أو إيجار متواضع في حيّ طرفيّ' },
      { icon: '🚗', label: 'التنقّل', desc: 'مواصلات عامّة، أو سيارة اقتصادية واحدة قديمة' },
      { icon: '✈️', label: 'السفر', desc: 'نادر — ربما رحلة داخلية واحدة في السنة' },
      { icon: '🎓', label: 'التعليم', desc: 'مدارس حكومية' },
      { icon: '🍽', label: 'الحياة اليومية', desc: 'ميزنة حذِرة؛ الأكل بالخارج مناسبات قليلة' },
      { icon: '💾', label: 'الادّخار', desc: 'يبقى القليل بعد الأساسيّات' },
    ],
  },
  basic: {
    income: 'نحو 10,000–16,000 ريال/شهر',
    items: [
      { icon: '🏠', label: 'السكن', desc: 'شقّتك المتواضعة الخاصّة، إيجاراً أو تمويلاً' },
      { icon: '🚗', label: 'التنقّل', desc: 'سيارة واحدة موثوقة متوسّطة الفئة' },
      { icon: '✈️', label: 'السفر', desc: 'رحلة داخلية وربما رحلة إقليمية قصيرة' },
      { icon: '🎓', label: 'التعليم', desc: 'مدارس حكومية، أو خاصّة منخفضة التكلفة' },
      { icon: '🍽', label: 'الحياة اليومية', desc: 'أساسيّات مريحة؛ مطاعم عادية أسبوعياً' },
      { icon: '💾', label: 'الادّخار', desc: 'يصبح صندوق طوارئ حقيقي ممكناً' },
    ],
  },
  decent: {
    income: 'نحو 18,000–35,000 ريال/شهر',
    items: [
      { icon: '🏠', label: 'السكن', desc: 'شقّة جيّدة أو فيلا مبدئية في حيّ متين' },
      { icon: '🚗', label: 'التنقّل', desc: 'سيارتان متوسّطتا الفئة للأسرة' },
      { icon: '✈️', label: 'السفر', desc: 'رحلة دولية واحدة سنوياً (تركيا، أوروبا، آسيا)' },
      { icon: '🎓', label: 'التعليم', desc: 'يصبح التعليم الخاصّ واقعياً للأبناء' },
      { icon: '🍽', label: 'الحياة اليومية', desc: 'أكل بالخارج بحرّية، نمط حياة مريح' },
      { icon: '📈', label: 'الثروة', desc: 'ادّخار ملموس مع محفظة استثمارية متنامية' },
    ],
  },
  lavish: {
    income: '40,000+ ريال/شهر أو دخل أصول قويّ',
    items: [
      { icon: '🏠', label: 'السكن', desc: 'فيلا كبيرة في حيّ راقٍ، وربما عقار ثانٍ' },
      { icon: '🚗', label: 'التنقّل', desc: 'مركبات فاخرة، تُستبدَل كثيراً، دون عناء' },
      { icon: '✈️', label: 'السفر', desc: 'سفر دولي متكرّر، درجة رجال الأعمال' },
      { icon: '🎓', label: 'التعليم', desc: 'أفضل المدارس الدولية؛ التعليم مموَّل بالكامل' },
      { icon: '🧑‍🍳', label: 'الحياة اليومية', desc: 'مساعدة منزلية، مطاعم راقية، قيود مالية قليلة' },
      { icon: '💼', label: 'الثروة', desc: 'استثمارات تولّد دخلاً بذاتها' },
    ],
  },
};

export function getLifestyle(t: Tier, locale: 'ar' | 'en' = 'en'): LifestyleTier {
  return locale === 'ar' ? LIFESTYLE_AR[t] : LIFESTYLE[t];
}

export interface Phase {
  id: string;
  phase_name: string;
  start_year: number;
  end_year: number;
  target_tier: Tier;
  theme: string[];
  todo: string[];
  net_worth_goal: string | null;
}

export interface YearPoint {
  year: number;
  target: number; // tier index
  actual: number | null; // tier index, null if not logged
}

export function buildYearSeries(phases: Phase[], actualsByYear: Record<number, Tier>): YearPoint[] {
  if (phases.length === 0) return [];
  const sorted = [...phases].sort((a, b) => a.start_year - b.start_year);
  const startYear = sorted[0].start_year;
  const endYear = Math.max(...sorted.map((p) => p.end_year));

  const points: YearPoint[] = [];
  for (let y = startYear; y <= endYear; y++) {
    const phase = sorted.find((p) => y >= p.start_year && y <= p.end_year) ?? sorted[sorted.length - 1];
    const actualTier = actualsByYear[y];
    points.push({
      year: y,
      target: tierIndex(phase.target_tier),
      actual: actualTier ? tierIndex(actualTier) : null,
    });
  }
  return points;
}

// The user's age at a given calendar year, inferred from their current age.
// Returns null when we don't know their age (so the axis just shows years).
export function ageForYear(currentAge: number | null | undefined, currentYear: number, year: number): number | null {
  if (currentAge == null || !Number.isFinite(currentAge)) return null;
  return currentAge + (year - currentYear);
}

// A sensible, tier-appropriate starting suggestion for a phase's theme, to-dos
// and growth target. Used as the offline/demo fallback for the AI assist, and
// as the server-side fallback when no model key is configured.
export interface PhaseSuggestion { theme: string[]; todo: string[]; growth: string }

const SUGGESTIONS: Record<Tier, { en: PhaseSuggestion; ar: PhaseSuggestion }> = {
  national_average: {
    en: { theme: ['Cover the essentials', 'Build stability'], todo: ['Track every riyal for one month', 'Start a small emergency fund'], growth: 'Reach a positive monthly surplus' },
    ar: { theme: ['تغطية الأساسيّات', 'بناء الاستقرار'], todo: ['تتبّع كل ريال لمدة شهر', 'ابدأ صندوق طوارئ صغير'], growth: 'الوصول إلى فائض شهري موجب' },
  },
  basic: {
    en: { theme: ['Your own place', 'First real savings'], todo: ['Automate a monthly transfer to savings', 'Clear high-interest debt'], growth: 'Build 3 months of expenses in cash' },
    ar: { theme: ['سكنك الخاص', 'أول ادّخار حقيقي'], todo: ['حوّل مبلغاً شهرياً للادّخار تلقائياً', 'سدّد الديون مرتفعة الفائدة'], growth: 'بناء نفقات 3 أشهر نقداً' },
  },
  decent: {
    en: { theme: ['Comfortable living', 'Growing investments'], todo: ['Start a diversified investment plan', 'Fund the education goal'], growth: 'Grow your investment portfolio steadily' },
    ar: { theme: ['حياة مريحة', 'استثمارات متنامية'], todo: ['ابدأ خطة استثمار متنوّعة', 'موّل هدف التعليم'], growth: 'تنمية محفظتك الاستثمارية باطّراد' },
  },
  lavish: {
    en: { theme: ['Financial freedom', 'Give back'], todo: ['Deploy idle cash into income assets', 'Set up an endowment or waqf'], growth: 'Build income-producing assets that cover your lifestyle' },
    ar: { theme: ['الحرّية المالية', 'العطاء'], todo: ['وظّف النقد المعطّل في أصول مدرّة للدخل', 'أنشئ وقفاً أو صندوقاً'], growth: 'بناء أصول تولّد دخلاً يغطّي نمط حياتك' },
  },
};

export function suggestForTier(tier: Tier, locale: 'ar' | 'en' = 'en'): PhaseSuggestion {
  const s = SUGGESTIONS[tier] ?? SUGGESTIONS.decent;
  return locale === 'ar' ? s.ar : s.en;
}

export type SolStatus = 'not-logged' | 'ahead' | 'ontrack' | 'behind';

export function solStatus(actual: number | null, target: number): SolStatus {
  if (actual == null) return 'not-logged';
  if (actual > target + 0.15) return 'ahead';
  if (actual < target - 0.15) return 'behind';
  return 'ontrack';
}

// ── Income-scale planned/actual series (the new SoL chart) ──────────────
// The y-axis is monthly income in SAR. The planned line is a DIAGONAL: within
// each period it ramps from the previous rung to that period's target rung, so
// the climb from Basic → Decent → Financial Freedom reads as smooth upward
// mobility. The actual line is the user's real logged income per year.
export interface IncomePoint { year: number; planned: number; actual: number | null }

export function buildIncomeSeries(
  phases: Phase[],
  ladder: Ladder,
  incomeByYear: Record<number, number>,
  startFloor: number = NATIONAL_AVG_INCOME
): IncomePoint[] {
  if (phases.length === 0) return [];
  const sorted = [...phases].sort((a, b) => a.start_year - b.start_year);
  let prev = startFloor;
  const segs = sorted.map((p) => {
    const to = ladderValue(ladder, p.target_tier);
    const seg = { start: p.start_year, end: p.end_year, from: prev, to };
    prev = to;
    return seg;
  });
  const first = sorted[0].start_year;
  const last = Math.max(...sorted.map((p) => p.end_year));
  const out: IncomePoint[] = [];
  for (let y = first; y <= last; y++) {
    const seg = segs.find((s) => y >= s.start && y <= s.end) ?? segs[segs.length - 1];
    const span = seg.end - seg.start;
    const t = span <= 0 ? 1 : (y - seg.start) / span;
    out.push({
      year: y,
      planned: Math.round(seg.from + (seg.to - seg.from) * t),
      actual: incomeByYear[y] ?? null,
    });
  }
  return out;
}

// Ahead / on-track / behind by comparing real income to the planned line,
// with a ±12% tolerance band.
export function incomeStatus(actual: number | null, planned: number): SolStatus {
  if (actual == null) return 'not-logged';
  const tol = planned * 0.12;
  if (actual > planned + tol) return 'ahead';
  if (actual < planned - tol) return 'behind';
  return 'ontrack';
}

// Which rung a given monthly income currently sits on, for course-correction
// messaging ("you're between Basic and Decent").
export function ladderTierForIncome(income: number, ladder: Ladder): LadderTier | 'below' {
  if (income >= ladder.lavish) return 'lavish';
  if (income >= ladder.decent) return 'decent';
  if (income >= ladder.basic) return 'basic';
  return 'below';
}
