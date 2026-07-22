// src/lib/standardOfLiving.ts
// Tier system, static Saudi-context lifestyle reference data, and the
// per-year target/actual series builder for the Standard of Living page.

export type Tier = 'national_average' | 'basic' | 'decent' | 'lavish' | 'financial_freedom';

export const TIERS: Tier[] = ['national_average', 'basic', 'decent', 'lavish', 'financial_freedom'];

export const TIER_LABEL: Record<Tier, string> = {
  national_average: 'National Average',
  basic: 'Basic',
  decent: 'Decent',
  lavish: 'Lavish',
  financial_freedom: 'Financial Freedom',
};

export const TIER_SHORT_LABEL: Record<Tier, string> = {
  national_average: 'Nat. Avg',
  basic: 'Basic',
  decent: 'Decent',
  lavish: 'Lavish',
  financial_freedom: 'Freedom',
};

export const TIER_LABEL_AR: Record<Tier, string> = {
  national_average: 'المتوسط الوطني',
  basic: 'أساسي',
  decent: 'لائق',
  lavish: 'مرفَّه',
  financial_freedom: 'الحرّية المالية',
};

export const TIER_SHORT_LABEL_AR: Record<Tier, string> = {
  national_average: 'المتوسط',
  basic: 'أساسي',
  decent: 'لائق',
  lavish: 'مرفَّه',
  financial_freedom: 'حرّية',
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

// ── The abstract ladder ─────────────────────────────────────────────────
// The user's standard-of-living "band" is four levels — Basic, Decent, Lavish,
// Financial Freedom — that a user positions as a bundle relative to the fixed
// national-average line. The chart's y-axis is ABSTRACT (no numbers): the four
// levels sit at equal spacing, and a single `offset` slides the whole bundle
// up or down against the baseline. national_average is a reference line, not a
// ladder rung.
export type LadderTier = 'basic' | 'decent' | 'lavish' | 'financial_freedom';
export const LADDER_TIERS: LadderTier[] = ['basic', 'decent', 'lavish', 'financial_freedom'];

export const NAT_Y = 1;          // national average sits here on the abstract axis
export const LADDER_STEP = 1;    // equal spacing between the four levels
export const OFFSET_MIN = -0.6;  // band can dip its floor a little below the average
export const OFFSET_MAX = 2.5;   // …or ride well above it (upper-middle footing)
export const DEFAULT_OFFSET = 0; // basic sits exactly on the national average

// Abstract y-position of a ladder level for a given band offset. offset 0 puts
// Basic on the national-average line; higher offset lifts the whole band.
export function ladderY(tier: LadderTier, offset: number): number {
  return NAT_Y + offset + LADDER_TIERS.indexOf(tier) * LADDER_STEP;
}
export function ladderTop(offset: number): number {
  return ladderY('financial_freedom', offset);
}

// Implied monthly SAR for each rung — used ONLY to place the user's real income
// on the abstract axis (never shown). Basic tracks the offset around the
// national average; the rest are fixed multiples of Basic.
const LADDER_MULT: Record<LadderTier, number> = { basic: 1, decent: 1.9, lavish: 3.3, financial_freedom: 6 };
export function ladderBasicSar(offset: number): number {
  return Math.max(NATIONAL_AVG_INCOME * 0.55, Math.round(NATIONAL_AVG_INCOME * (1 + offset * 0.5)));
}
export function impliedSar(tier: LadderTier, offset: number): number {
  return Math.round(ladderBasicSar(offset) * LADDER_MULT[tier]);
}

// Place a real monthly income on the abstract axis by interpolating between the
// implied rung values, so the actual line can be drawn against the plan.
export function incomeToAbstractY(income: number, offset: number): number {
  const anchors: [number, number][] = [[0, 0], ...LADDER_TIERS.map((t) => [impliedSar(t, offset), ladderY(t, offset)] as [number, number])];
  for (let i = 0; i < anchors.length - 1; i++) {
    const [s0, y0] = anchors[i];
    const [s1, y1] = anchors[i + 1];
    if (income <= s1) {
      const t = s1 === s0 ? 1 : (income - s0) / (s1 - s0);
      return y0 + (y1 - y0) * t;
    }
  }
  // Above Financial Freedom — nudge a touch beyond the top rung.
  return ladderTop(offset) + 0.3;
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
    en: 'Living large — a premium home, cars and travel, with few limits on spending.',
    ar: 'حياة رغدة — بيت ومركبات وسفر من الفئة الراقية، بقيود قليلة على الإنفاق.',
  },
  financial_freedom: {
    en: 'True freedom — your wealth pays for your life; work becomes a choice, not a need.',
    ar: 'الحرّية الحقيقية — ثروتك تدفع تكاليف حياتك؛ ويصبح العمل خياراً لا ضرورة.',
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
  financial_freedom: '#17B8C9',
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
    income: 'SAR 40,000+/month',
    items: [
      { icon: '🏠', label: 'Housing', desc: 'A large villa in a prime district, possibly a second property' },
      { icon: '🚗', label: 'Transport', desc: 'Premium vehicles, replaced often, no strain' },
      { icon: '✈️', label: 'Travel', desc: 'Frequent international travel, business class' },
      { icon: '🎓', label: 'Schooling', desc: 'Top international schools; education fully funded' },
      { icon: '🧑‍🍳', label: 'Daily life', desc: 'Household help, fine dining, few financial limits' },
      { icon: '📈', label: 'Wealth', desc: 'A large, growing investment portfolio' },
    ],
  },
  financial_freedom: {
    income: 'passive income covers your lifestyle — work is optional',
    items: [
      { icon: '🏠', label: 'Housing', desc: 'Home(s) owned outright, no mortgage pressure' },
      { icon: '🚗', label: 'Transport', desc: 'Whatever you choose, paid for outright' },
      { icon: '🕊', label: 'Time', desc: 'Your time is yours — work becomes a choice' },
      { icon: '✈️', label: 'Travel', desc: 'Go when you like, on your own schedule' },
      { icon: '💼', label: 'Wealth', desc: 'Investments alone generate enough to live on, indefinitely' },
      { icon: '🌱', label: 'Legacy', desc: 'Giving, an endowment (waqf), and provision for the next generation' },
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
    income: '40,000+ ريال/شهر',
    items: [
      { icon: '🏠', label: 'السكن', desc: 'فيلا كبيرة في حيّ راقٍ، وربما عقار ثانٍ' },
      { icon: '🚗', label: 'التنقّل', desc: 'مركبات فاخرة، تُستبدَل كثيراً، دون عناء' },
      { icon: '✈️', label: 'السفر', desc: 'سفر دولي متكرّر، درجة رجال الأعمال' },
      { icon: '🎓', label: 'التعليم', desc: 'أفضل المدارس الدولية؛ التعليم مموَّل بالكامل' },
      { icon: '🧑‍🍳', label: 'الحياة اليومية', desc: 'مساعدة منزلية، مطاعم راقية، قيود مالية قليلة' },
      { icon: '📈', label: 'الثروة', desc: 'محفظة استثمارية كبيرة ومتنامية' },
    ],
  },
  financial_freedom: {
    income: 'دخل غير نشط يغطّي نمط حياتك — والعمل اختياري',
    items: [
      { icon: '🏠', label: 'السكن', desc: 'مسكن (أو أكثر) مملوك بالكامل، دون عبء تمويل' },
      { icon: '🚗', label: 'التنقّل', desc: 'ما تختاره، مدفوعاً بالكامل' },
      { icon: '🕊', label: 'الوقت', desc: 'وقتك ملكك — يصبح العمل خياراً' },
      { icon: '✈️', label: 'السفر', desc: 'تسافر متى شئت، وفق جدولك أنت' },
      { icon: '💼', label: 'الثروة', desc: 'استثماراتك وحدها تولّد ما يكفي للعيش، بلا حدّ' },
      { icon: '🌱', label: 'الإرث', desc: 'عطاء، ووقف، وتأمين للجيل القادم' },
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
    en: { theme: ['Live well, sustainably', 'Compound the surplus'], todo: ['Upgrade lifestyle within a set budget', 'Keep investing a fixed share'], growth: 'Grow assets faster than lifestyle' },
    ar: { theme: ['عِش جيّداً باستدامة', 'ضاعِف الفائض'], todo: ['ارفع نمط حياتك ضمن ميزانية محدّدة', 'استمرّ باستثمار حصّة ثابتة'], growth: 'نموّ الأصول أسرع من نموّ نمط الحياة' },
  },
  financial_freedom: {
    en: { theme: ['Financial freedom', 'Give back'], todo: ['Deploy idle cash into income assets', 'Set up an endowment or waqf'], growth: 'Build passive income that covers your lifestyle' },
    ar: { theme: ['الحرّية المالية', 'العطاء'], todo: ['وظّف النقد المعطّل في أصول مدرّة للدخل', 'أنشئ وقفاً أو صندوقاً'], growth: 'بناء دخل غير نشط يغطّي نمط حياتك' },
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

// ── Abstract planned/actual series (the new SoL chart) ──────────────────
// Everything is on the ABSTRACT axis (no numbers). The planned line is a
// DIAGONAL: within each period it ramps from the previous rung's level to this
// period's target level, so the climb reads as smooth upward mobility. The
// actual line is the user's real logged income, mapped onto the same abstract
// scale via impliedSar/incomeToAbstractY.
export interface AbstractPoint { year: number; planned: number; actual: number | null }

export function buildAbstractSeries(
  phases: Phase[],
  offset: number,
  incomeByYear: Record<number, number>
): AbstractPoint[] {
  if (phases.length === 0) return [];
  const sorted = [...phases].sort((a, b) => a.start_year - b.start_year);
  // The climb starts from the national-average baseline.
  let prev = NAT_Y;
  const segs = sorted.map((p) => {
    const tier = (LADDER_TIERS.includes(p.target_tier as LadderTier) ? p.target_tier : 'basic') as LadderTier;
    const to = ladderY(tier, offset);
    const seg = { start: p.start_year, end: p.end_year, from: prev, to };
    prev = to;
    return seg;
  });
  const first = sorted[0].start_year;
  const last = Math.max(...sorted.map((p) => p.end_year));
  const out: AbstractPoint[] = [];
  for (let y = first; y <= last; y++) {
    const seg = segs.find((s) => y >= s.start && y <= s.end) ?? segs[segs.length - 1];
    const span = seg.end - seg.start;
    const t = span <= 0 ? 1 : (y - seg.start) / span;
    out.push({
      year: y,
      planned: seg.from + (seg.to - seg.from) * t,
      actual: incomeByYear[y] != null ? incomeToAbstractY(incomeByYear[y], offset) : null,
    });
  }
  return out;
}

// Ahead / on-track / behind by comparing actual to planned on the abstract
// axis, with a tolerance of ~a third of a level.
export function pathStatus(actual: number | null, planned: number): SolStatus {
  if (actual == null) return 'not-logged';
  if (actual > planned + 0.35) return 'ahead';
  if (actual < planned - 0.35) return 'behind';
  return 'ontrack';
}

// Which rung a real monthly income currently sits on, for course-correction
// messaging ("you're between Basic and Decent").
export function ladderTierForIncome(income: number, offset: number): LadderTier | 'below' {
  if (income >= impliedSar('financial_freedom', offset)) return 'financial_freedom';
  if (income >= impliedSar('lavish', offset)) return 'lavish';
  if (income >= impliedSar('decent', offset)) return 'decent';
  if (income >= impliedSar('basic', offset)) return 'basic';
  return 'below';
}
