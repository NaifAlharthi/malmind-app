// src/lib/compare.ts
// The Compare & Decide engine: life decisions as side-by-side unit economics.
// Every comparison is a data-driven "scheme" — a decision frame with options
// whose costs are normalised to fixed SAR/month plus SAR-per-unit-of-use.
// Adding a new decision to the library is a data entry, not a feature build,
// which is what lets the library compound into a real moat (and, later, host
// sponsored offerings as just another option row).
//
// All prefilled numbers are ILLUSTRATIVE Saudi-market estimates for thinking
// with, not quotes — the UI must say so.

export interface L10n { ar: string; en: string }

export interface CostLine {
  label: L10n;
  amount: number; // SAR; for perUnit lines, SAR per one unit (negative = benefit)
}

export interface UsageOption {
  id: string;
  name: L10n;
  icon: string;
  note?: L10n; // the assumption behind the numbers
  fixedMonthly: CostLine[];
  perUnit: CostLine[];
}

// A decision where both sides share one usage dial (km driven, meals eaten,
// SAR spent on the card…). Cost(V) = fixed + perUnit × V.
export interface UsageScheme {
  kind: 'usage';
  id: string;
  icon: string;
  title: L10n;      // "Own a car vs ride-hailing"
  question: L10n;   // the decision, phrased as the user would say it
  unit: L10n;       // "kilometres driven per month"
  unitShort: L10n;  // "km"
  minVolume: number;
  maxVolume: number;
  step: number;
  defaultVolume: number;
  options: UsageOption[];
  defaults: [string, string]; // option ids preselected left/right
}

// The bespoke miles decision: pay a flight with miles, or with cash?
export interface FlightPreset {
  id: string;
  name: L10n;
  cashPrice: number; // SAR, round trip economy
  miles: number;     // miles required to redeem
  fees: number;      // SAR taxes/fees still paid on a redemption
}
export interface MilesScheme {
  kind: 'miles';
  id: string;
  icon: string;
  title: L10n;
  question: L10n;
  flights: FlightPreset[];
  // Redeeming only beats cash when a mile returns more than it costs to
  // acquire; ~1.5 halalas is a fair Saudi loyalty-programme benchmark.
  benchmarkHalalas: number;
}

export type Scheme = UsageScheme | MilesScheme;

// ── Math ────────────────────────────────────────────────────────────────
export function fixedTotal(o: UsageOption): number {
  return o.fixedMonthly.reduce((s, l) => s + l.amount, 0);
}
export function perUnitTotal(o: UsageOption): number {
  return o.perUnit.reduce((s, l) => s + l.amount, 0);
}
export function monthlyTotal(o: UsageOption, volume: number): number {
  return fixedTotal(o) + perUnitTotal(o) * volume;
}
export function costPerUnit(o: UsageOption, volume: number): number | null {
  return volume > 0 ? monthlyTotal(o, volume) / volume : null;
}
// Usage level where the two options cost the same; null if they never cross.
export function breakevenVolume(a: UsageOption, b: UsageOption): number | null {
  const slope = perUnitTotal(a) - perUnitTotal(b);
  if (Math.abs(slope) < 1e-9) return null;
  const v = (fixedTotal(b) - fixedTotal(a)) / slope;
  return v > 0 ? v : null;
}

// Value of one redeemed mile, in halalas (SAR/100).
export function mileValueHalalas(f: FlightPreset): number {
  if (f.miles <= 0) return 0;
  return ((f.cashPrice - f.fees) / f.miles) * 100;
}

// ── The scheme library ──────────────────────────────────────────────────
export const SCHEMES: Scheme[] = [
  {
    kind: 'miles',
    id: 'miles-vs-cash',
    icon: '✈️',
    title: { ar: 'أميال المكافآت أم الدفع نقداً؟', en: 'Reward miles or cash?' },
    question: {
      ar: 'عندي أميال تكفي لرحلة — هل أستبدلها أم أدفع بالبطاقة وأحتفظ بها؟',
      en: 'I have enough miles for a flight — redeem them, or pay cash and keep them?',
    },
    benchmarkHalalas: 1.5,
    flights: [
      { id: 'jed-dxb', name: { ar: 'جدة ← دبي (ذهاب وعودة، سياحية)', en: 'Jeddah → Dubai (round trip, economy)' }, cashPrice: 1350, miles: 30000, fees: 320 },
      { id: 'ruh-cai', name: { ar: 'الرياض ← القاهرة (ذهاب وعودة، سياحية)', en: 'Riyadh → Cairo (round trip, economy)' }, cashPrice: 1600, miles: 35000, fees: 350 },
      { id: 'ruh-lhr', name: { ar: 'الرياض ← لندن (ذهاب وعودة، سياحية)', en: 'Riyadh → London (round trip, economy)' }, cashPrice: 3800, miles: 75000, fees: 620 },
      { id: 'jed-ist', name: { ar: 'جدة ← إسطنبول (ذهاب وعودة، سياحية)', en: 'Jeddah → Istanbul (round trip, economy)' }, cashPrice: 2100, miles: 45000, fees: 410 },
    ],
  },
  {
    kind: 'usage',
    id: 'car-vs-ride',
    icon: '🚗',
    title: { ar: 'سيارة خاصة أم تطبيقات التوصيل؟', en: 'Own a car or ride-hailing?' },
    question: {
      ar: 'هل امتلاك سيارة أرخص فعلاً من أوبر/كريم على نمط تنقّلي؟',
      en: 'Is owning actually cheaper than Uber/Careem for how much I move?',
    },
    unit: { ar: 'كيلومتراً تقطعه شهرياً', en: 'kilometres you travel a month' },
    unitShort: { ar: 'كم', en: 'km' },
    minVolume: 100, maxVolume: 3000, step: 50, defaultVolume: 900,
    defaults: ['own-sedan', 'ride-hailing'],
    options: [
      {
        id: 'own-sedan', icon: '🚗',
        name: { ar: 'سيارة سيدان مملوكة', en: 'Owned sedan' },
        note: { ar: 'سيارة بـ 85 ألف ريال تُستهلك على 8 سنوات، تأمين وصيانة نموذجيان', en: 'SAR 85K car depreciated over 8 years, typical insurance & maintenance' },
        fixedMonthly: [
          { label: { ar: 'استهلاك قيمة السيارة', en: 'Depreciation' }, amount: 885 },
          { label: { ar: 'تأمين', en: 'Insurance' }, amount: 210 },
          { label: { ar: 'صيانة ومواقف', en: 'Maintenance & parking' }, amount: 220 },
        ],
        perUnit: [{ label: { ar: 'وقود', en: 'Fuel' }, amount: 0.24 }],
      },
      {
        id: 'own-suv', icon: '🚙',
        name: { ar: 'دفع رباعي مملوك', en: 'Owned SUV' },
        note: { ar: 'سيارة بـ 140 ألف ريال على 8 سنوات', en: 'SAR 140K SUV over 8 years' },
        fixedMonthly: [
          { label: { ar: 'استهلاك قيمة السيارة', en: 'Depreciation' }, amount: 1460 },
          { label: { ar: 'تأمين', en: 'Insurance' }, amount: 320 },
          { label: { ar: 'صيانة ومواقف', en: 'Maintenance & parking' }, amount: 280 },
        ],
        perUnit: [{ label: { ar: 'وقود', en: 'Fuel' }, amount: 0.34 }],
      },
      {
        id: 'ride-hailing', icon: '📱',
        name: { ar: 'أوبر / كريم', en: 'Uber / Careem' },
        note: { ar: 'متوسط تعرفة المدن السعودية وقت الكتابة', en: 'Typical Saudi city fares' },
        fixedMonthly: [],
        perUnit: [{ label: { ar: 'تعرفة الرحلات', en: 'Ride fares' }, amount: 1.9 }],
      },
    ],
  },
  {
    kind: 'usage',
    id: 'cook-vs-subscribe',
    icon: '🍽',
    title: { ar: 'الطبخ أم اشتراك الوجبات؟', en: 'Cook or subscribe to meals?' },
    question: {
      ar: 'اشتراك وجبات جاهزة يوفّر وقتاً — لكن كم يكلّف فعلاً مقابل الطبخ؟',
      en: 'A meal subscription saves time — but what does it really cost vs cooking?',
    },
    unit: { ar: 'وجبة شهرياً', en: 'meals a month' },
    unitShort: { ar: 'وجبة', en: 'meals' },
    minVolume: 10, maxVolume: 90, step: 5, defaultVolume: 40,
    defaults: ['home-cooking', 'meal-subscription'],
    options: [
      {
        id: 'home-cooking', icon: '🍳',
        name: { ar: 'طبخ منزلي', en: 'Home cooking' },
        note: { ar: 'مقاضٍ لوجبة متوازنة + غاز وكهرباء', en: 'Groceries for a balanced meal + utilities' },
        fixedMonthly: [{ label: { ar: 'أساسيات المطبخ الشهرية', en: 'Pantry staples' }, amount: 120 }],
        perUnit: [{ label: { ar: 'مقاضي الوجبة', en: 'Groceries per meal' }, amount: 11 }],
      },
      {
        id: 'meal-subscription', icon: '📦',
        name: { ar: 'اشتراك وجبات', en: 'Meal subscription' },
        note: { ar: 'متوسط اشتراكات الوجبات الصحية في السعودية', en: 'Typical Saudi healthy-meal plans' },
        fixedMonthly: [],
        perUnit: [{ label: { ar: 'سعر الوجبة', en: 'Per meal' }, amount: 32 }],
      },
      {
        id: 'delivery', icon: '🛵',
        name: { ar: 'طلبات المطاعم', en: 'Restaurant delivery' },
        note: { ar: 'وجبة مطعم متوسطة + رسوم توصيل', en: 'Average restaurant meal + delivery fees' },
        fixedMonthly: [],
        perUnit: [{ label: { ar: 'الوجبة مع التوصيل', en: 'Meal + delivery' }, amount: 48 }],
      },
    ],
  },
  {
    kind: 'usage',
    id: 'card-vs-card',
    icon: '💳',
    title: { ar: 'أي بطاقة ائتمانية تناسبك؟', en: 'Which credit card fits you?' },
    question: {
      ar: 'برسومها السنوية ومكافآتها — أي بطاقة تعيد لك أكثر على إنفاقك الفعلي؟',
      en: 'Fees vs rewards — which card nets you more on your actual spending?',
    },
    unit: { ar: 'ريال تنفقه بالبطاقة شهرياً', en: 'SAR you spend on the card a month' },
    unitShort: { ar: 'ريال', en: 'SAR' },
    minVolume: 1000, maxVolume: 30000, step: 500, defaultVolume: 8000,
    defaults: ['cashback-card', 'miles-card'],
    options: [
      {
        id: 'no-fee-card', icon: '💳',
        name: { ar: 'بطاقة بلا رسوم', en: 'No-fee starter card' },
        note: { ar: 'نموذج شائع: بلا رسوم، استرداد 0.5%', en: 'Common shape: no fee, 0.5% cashback' },
        fixedMonthly: [],
        perUnit: [{ label: { ar: 'استرداد نقدي 0.5%', en: '0.5% cashback' }, amount: -0.005 }],
      },
      {
        id: 'cashback-card', icon: '💰',
        name: { ar: 'بطاقة استرداد نقدي', en: 'Cashback card' },
        note: { ar: 'نموذج شائع: رسوم 300 ريال/سنة، استرداد 1.5%', en: 'Common shape: SAR 300/yr fee, 1.5% cashback' },
        fixedMonthly: [{ label: { ar: 'الرسوم السنوية ÷ 12', en: 'Annual fee ÷ 12' }, amount: 25 }],
        perUnit: [{ label: { ar: 'استرداد نقدي 1.5%', en: '1.5% cashback' }, amount: -0.015 }],
      },
      {
        id: 'miles-card', icon: '✈️',
        name: { ar: 'بطاقة أميال طيران', en: 'Airline miles card' },
        note: { ar: 'نموذج شائع: رسوم 600 ريال/سنة، ميل لكل 4 ريالات (قيمة الميل ~1.5 هللة)', en: 'Common shape: SAR 600/yr fee, 1 mile per SAR 4 (mile worth ~1.5 halalas)' },
        fixedMonthly: [{ label: { ar: 'الرسوم السنوية ÷ 12', en: 'Annual fee ÷ 12' }, amount: 50 }],
        perUnit: [{ label: { ar: 'قيمة الأميال المكتسبة', en: 'Value of miles earned' }, amount: -0.00375 }],
      },
      {
        id: 'premium-card', icon: '💎',
        name: { ar: 'بطاقة سفر مميّزة', en: 'Premium travel card' },
        note: { ar: 'نموذج شائع: رسوم 1,500 ريال/سنة، مكافآت 2% + صالات (قيمتها ~85 ريال/شهر لمن يسافر)', en: 'Common shape: SAR 1,500/yr fee, 2% rewards + lounges (~SAR 85/mo value if you travel)' },
        fixedMonthly: [
          { label: { ar: 'الرسوم السنوية ÷ 12', en: 'Annual fee ÷ 12' }, amount: 125 },
          { label: { ar: 'قيمة مزايا السفر', en: 'Travel perks value' }, amount: -85 },
        ],
        perUnit: [{ label: { ar: 'مكافآت 2%', en: '2% rewards' }, amount: -0.02 }],
      },
    ],
  },
];

export function getScheme(id: string): Scheme {
  return SCHEMES.find((s) => s.id === id) ?? SCHEMES[0];
}
