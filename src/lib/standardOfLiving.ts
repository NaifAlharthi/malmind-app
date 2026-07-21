// src/lib/standardOfLiving.ts
// Tier system, static Saudi-context lifestyle reference data, and the
// per-year target/actual series builder for the Standard of Living page.

export type Tier = 'national_average' | 'basic' | 'decent' | 'lavish';

export const TIERS: Tier[] = ['national_average', 'basic', 'decent', 'lavish'];

export const TIER_LABEL: Record<Tier, string> = {
  national_average: 'National Average',
  basic: 'Basic',
  decent: 'Decent',
  lavish: 'Lavish',
};

export const TIER_SHORT_LABEL: Record<Tier, string> = {
  national_average: 'Nat. Avg',
  basic: 'Basic',
  decent: 'Decent',
  lavish: 'Lavish',
};

export const TIER_LABEL_AR: Record<Tier, string> = {
  national_average: 'المتوسط الوطني',
  basic: 'أساسي',
  decent: 'لائق',
  lavish: 'مرفَّه',
};

export const TIER_SHORT_LABEL_AR: Record<Tier, string> = {
  national_average: 'المتوسط',
  basic: 'أساسي',
  decent: 'لائق',
  lavish: 'مرفَّه',
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

export type SolStatus = 'not-logged' | 'ahead' | 'ontrack' | 'behind';

export function solStatus(actual: number | null, target: number): SolStatus {
  if (actual == null) return 'not-logged';
  if (actual > target + 0.15) return 'ahead';
  if (actual < target - 0.15) return 'behind';
  return 'ontrack';
}
