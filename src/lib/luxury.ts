// src/lib/luxury.ts
// Luxury, treated as a wealth discipline. The tool's philosophy in one
// sentence: joy is legitimate — the wealthy buy it from their wealth's
// YIELD, never its principal. This lib carries:
//   · the wealth-behavior classes luxury items fall into (from money pit
//     to store of value), each with honest 10-year retention and yearly
//     carrying costs;
//   · a Saudi-first catalog of aspirational items with realistic prices
//     (falcons, mazayin camels and istirahas beside Patek and G-Class);
//   · the four calculations the verdict is built from — share of wealth,
//     months of passive yield to cover it, true 10-year cost vs investing,
//     and joy-per-riyal (amortized cost per use).

export type LuxClass = 'appreciates' | 'holds' | 'depreciates' | 'moneypit' | 'passion';

export interface LuxClassMeta {
  ar: string; en: string;
  icon: string;
  retention10: number; // realistic resale value after 10 years, as × of price
  carryPct: number; // yearly carrying cost (insurance, upkeep, boarding) as % of price
  spectrum: number; // 0 = pure money pit … 1 = store of value
  blurb: { ar: string; en: string };
}

export const LUX_CLASSES: Record<LuxClass, LuxClassMeta> = {
  appreciates: {
    ar: 'يزيد قيمةً', en: 'Appreciates',
    icon: '📈', retention10: 1.35, carryPct: 0.015, spectrum: 1,
    blurb: {
      ar: 'رفاهية تتنكّر في هيئة أصل — تُمتعك وتنمو قيمتها غالباً مع الزمن.',
      en: 'Luxury disguised as an asset — it delights you while its value usually grows.',
    },
  },
  holds: {
    ar: 'يحفظ قيمته', en: 'Holds value',
    icon: '🪙', retention10: 0.95, carryPct: 0.005, spectrum: 0.75,
    blurb: {
      ar: 'يبقى قريباً من سعره — تدفع فعلياً ثمن المتعة لا ثمن التملّك.',
      en: 'Stays near its price — you effectively pay for the joy, not the ownership.',
    },
  },
  depreciates: {
    ar: 'يتناقص', en: 'Depreciates',
    icon: '📉', retention10: 0.4, carryPct: 0.03, spectrum: 0.35,
    blurb: {
      ar: 'يفقد معظم قيمته مع الاستعمال — اشتره لأجل الفرح، واحسب الخسارة بعينين مفتوحتين.',
      en: 'Loses most of its value with use — buy it for the joy, and price the loss with open eyes.',
    },
  },
  moneypit: {
    ar: 'بالوعة مال', en: 'Money pit',
    icon: '🕳️', retention10: 0.3, carryPct: 0.08, spectrum: 0,
    blurb: {
      ar: 'يأكل وهو راسٍ: صيانة ومراسٍ وطواقم — كلفته الحقيقية في امتلاكه لا في شرائه.',
      en: 'It eats while parked: upkeep, berthing, crews — the true cost is owning it, not buying it.',
    },
  },
  passion: {
    ar: 'شغف وميدان', en: 'Passion & arena',
    icon: '🏆', retention10: 0.5, carryPct: 0.06, spectrum: 0.45,
    blurb: {
      ar: 'قيمته في الميدان والمجلس والسلالة — سوقه سوق عارفين، وقد يفاجئك صعوداً أو هبوطاً.',
      en: 'Its value lives in the arena, the majlis and the bloodline — a connoisseur market that can surprise both ways.',
    },
  },
};

export interface LuxItem {
  id: string;
  icon: string;
  name: { ar: string; en: string };
  price: number; // SAR, realistic
  cls: LuxClass;
  usesPerWeek: number; // sensible default for joy math
}

export const LUX_CATALOG: LuxItem[] = [
  { id: 'rolex', icon: '⌚', name: { ar: 'رولكس سبمارينر', en: 'Rolex Submariner' }, price: 48000, cls: 'holds', usesPerWeek: 7 },
  { id: 'patek', icon: '⌚', name: { ar: 'باتيك فيليب نوتيلوس', en: 'Patek Philippe Nautilus' }, price: 550000, cls: 'appreciates', usesPerWeek: 3 },
  { id: 'gclass', icon: '🚙', name: { ar: 'مرسيدس جي-كلاس', en: 'Mercedes G-Class' }, price: 750000, cls: 'depreciates', usesPerWeek: 7 },
  { id: 'range', icon: '🚙', name: { ar: 'رينج روفر', en: 'Range Rover' }, price: 620000, cls: 'depreciates', usesPerWeek: 7 },
  { id: 'birkin', icon: '👜', name: { ar: 'هيرمس بيركين', en: 'Hermès Birkin' }, price: 65000, cls: 'holds', usesPerWeek: 3 },
  { id: 'diamond', icon: '💎', name: { ar: 'طقم مجوهرات ألماس', en: 'Diamond jewelry set' }, price: 120000, cls: 'holds', usesPerWeek: 1 },
  { id: 'falcon', icon: '🦅', name: { ar: 'صقر حر', en: 'A prized falcon' }, price: 150000, cls: 'passion', usesPerWeek: 2 },
  { id: 'camel', icon: '🐫', name: { ar: 'ناقة مزاين', en: 'A mazayin camel' }, price: 400000, cls: 'passion', usesPerWeek: 2 },
  { id: 'horse', icon: '🐎', name: { ar: 'خيل أصيل', en: 'A purebred Arabian horse' }, price: 250000, cls: 'passion', usesPerWeek: 3 },
  { id: 'istiraha', icon: '🌴', name: { ar: 'استراحة ومزرعة', en: 'An istiraha & farm' }, price: 1500000, cls: 'appreciates', usesPerWeek: 2 },
  { id: 'chalet', icon: '🏖', name: { ar: 'شاليه بحري', en: 'A beach chalet' }, price: 1200000, cls: 'appreciates', usesPerWeek: 1 },
  { id: 'yacht', icon: '🛥', name: { ar: 'يخت', en: 'A yacht' }, price: 2000000, cls: 'moneypit', usesPerWeek: 1 },
];

export const INVEST_RETURN = 0.07; // long-run investing alternative
export const SAFE_YIELD = 0.04; // the passive yield wealth throws off

// ── the four readings behind the verdict ─────────────────────────────────

/** Share of net worth this item consumes, 0..∞. */
export function wealthShare(price: number, netWorth: number): number {
  return netWorth > 0 ? price / netWorth : Infinity;
}

/** Months of pure passive yield (SAFE_YIELD on working capital) to cover the price. */
export function yieldMonths(price: number, invested: number): number {
  const perMonth = (invested * SAFE_YIELD) / 12;
  return perMonth > 0 ? price / perMonth : Infinity;
}

/** What the same money becomes if invested for `years` instead. */
export function investedAlternative(price: number, years: number): number {
  return price * Math.pow(1 + INVEST_RETURN, years);
}

/** Expected resale after 10 years, by class honesty. */
export function resale10(price: number, cls: LuxClass): number {
  return price * LUX_CLASSES[cls].retention10;
}

/** True 10-year cost: the invested alternative you gave up, minus what the
 *  item still returns you, plus a decade of carrying costs. */
export function trueCost10(price: number, cls: LuxClass): number {
  const carry = price * LUX_CLASSES[cls].carryPct * 10;
  return Math.max(0, investedAlternative(price, 10) - resale10(price, cls) + carry);
}

/** Amortized cost per single use over `years` of `usesPerWeek` enjoyment. */
export function joyPerUse(price: number, cls: LuxClass, usesPerWeek: number, years: number): number {
  const uses = Math.max(1, usesPerWeek * 52 * years);
  const carry = price * LUX_CLASSES[cls].carryPct * years;
  const net = price - resale10(price, cls) * Math.min(1, years / 10) + carry;
  return Math.max(0, net) / uses;
}

/** The comfort verdict on wealth share. */
export function shareVerdict(share: number): 'light' | 'measured' | 'heavy' | 'beyond' {
  if (share <= 0.01) return 'light';
  if (share <= 0.05) return 'measured';
  if (share <= 0.1) return 'heavy';
  return 'beyond';
}
