// src/lib/lifetimeArc.ts
// The arc of a working life: monthly income by AGE — rising through a career,
// flattening at a peak, then dropping to retirement (pension) income — plus
// benchmark arcs (average Saudi earner, higher/lower peers), cumulative
// lifetime totals, and an interpreter that translates a lifetime sum into
// what it could actually hold in Saudi terms (the same philosophy as the
// Standard of Living tiers: numbers become lives).
//
// All benchmark figures are ILLUSTRATIVE, anchored on public Saudi context
// (GaStat household income; typical private/public pay bands; GOSI-style
// pension replacement). The user's own arc is anchored through their real
// career start and current income.

export interface L10n { ar: string; en: string }

export interface ArcInputs {
  startAge: number;      // when earning began
  startIncome: number;   // SAR/month then
  currentAge: number;
  currentIncome: number; // SAR/month now
  retireAge: number;     // pension begins
  replacement: number;   // pension as share of final salary (0..1)
  endAge: number;        // horizon for the chart/cumulative
}

export const ARC_DEFAULTS = { retireAge: 60, replacement: 0.65, endAge: 80, peakAge: 52 };

export interface ArcPoint {
  age: number;
  income: number;     // SAR/month at this age
  cumulative: number; // SAR earned from startAge through this age
}

// Smoothstep for gentle transitions.
const ss = (t: number) => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };

// Build one arc. Before `currentAge` the curve interpolates start→current
// (accelerating, like real careers). After it, income climbs with a raise
// rate inferred from the user's own history (clamped 2–7%/yr) that fades to
// zero at the peak age, holds the plateau, then steps down to the pension.
export function buildArc(i: ArcInputs): ArcPoint[] {
  const peakAge = Math.max(ARC_DEFAULTS.peakAge, i.currentAge + 2);
  const yearsSoFar = Math.max(1, i.currentAge - i.startAge);
  const histGrowth = i.startIncome > 0 && i.currentIncome > i.startIncome
    ? Math.pow(i.currentIncome / i.startIncome, 1 / yearsSoFar) - 1
    : 0.04;
  const g = Math.max(0.02, Math.min(0.07, histGrowth));

  // Peak income: keep raising at a fading rate until peakAge.
  let peakIncome = i.currentIncome;
  for (let a = i.currentAge; a < peakAge; a++) {
    const fade = 1 - ss((a - i.currentAge) / Math.max(1, peakAge - i.currentAge));
    peakIncome *= 1 + g * fade;
  }

  const pension = peakIncome * i.replacement;
  const pts: ArcPoint[] = [];
  let cum = 0;
  for (let age = i.startAge; age <= i.endAge; age++) {
    let income: number;
    if (age <= i.currentAge) {
      const t = (age - i.startAge) / Math.max(1, i.currentAge - i.startAge);
      income = i.startIncome + (i.currentIncome - i.startIncome) * Math.pow(t, 1.4);
    } else if (age < peakAge) {
      income = i.currentIncome + (peakIncome - i.currentIncome) * ss((age - i.currentAge) / (peakAge - i.currentAge));
    } else if (age < i.retireAge) {
      income = peakIncome; // the plateau
    } else {
      income = pension;
    }
    cum += income * 12;
    pts.push({ age, income: Math.round(income), cumulative: Math.round(cum) });
  }
  return pts;
}

// ── Benchmarks: illustrative Saudi earning arcs ─────────────────────────
// Average: starts ~SAR 6K at 24, peaks ~16K in the early 50s — consistent
// with GaStat-era household/labor bands. Peers scale the whole arc.
export function benchmarkArc(retireAge: number, replacement: number, endAge: number, scale = 1): ArcPoint[] {
  return buildArc({
    startAge: 24, startIncome: 6000 * scale,
    currentAge: 40, currentIncome: 13000 * scale,
    retireAge, replacement, endAge,
  });
}
export const PEER_SCALES = { higher: 1.6, lower: 0.6 };

export function lifetimeTotal(arc: ArcPoint[]): number {
  return arc.length ? arc[arc.length - 1].cumulative : 0;
}

// ── The interpreter: what a lifetime sum could hold, in Saudi terms ─────
export interface LifeItem { icon: string; label: L10n; cost: number }

// Illustrative big-ticket Saudi life items (SAR, today's money).
export const LIFE_CATALOG: LifeItem[] = [
  { icon: '🏡', label: { ar: 'فيلا عائلية (تُمتلك)', en: 'A family villa, owned' }, cost: 1_600_000 },
  { icon: '🎓', label: { ar: 'تربية وتعليم طفل حتى الجامعة (خاص)', en: 'Raising & educating one child through university (private)' }, cost: 500_000 },
  { icon: '🚗', label: { ar: 'سيارة عائلية تُجدَّد كل 8 سنوات (مدى الحياة)', en: 'A family car renewed every 8 years, for life' }, cost: 550_000 },
  { icon: '🕋', label: { ar: 'حجّ وعُمَر للأسرة عبر العمر', en: 'Hajj & Umrahs for the household across a lifetime' }, cost: 120_000 },
  { icon: '✈️', label: { ar: 'رحلة عائلية سنوية لأربعين سنة', en: 'A yearly family trip for forty years' }, cost: 600_000 },
  { icon: '💍', label: { ar: 'زواج وتأسيس بيت', en: 'A wedding and setting up a home' }, cost: 250_000 },
  { icon: '🏢', label: { ar: 'رأس مال مشروع خاص', en: 'Seed capital for a business' }, cost: 300_000 },
  { icon: '🌱', label: { ar: 'محفظة تقاعد تولّد دخلاً', en: 'A retirement portfolio that pays an income' }, cost: 1_500_000 },
];

export interface LifetimeBracket {
  min: number;
  name: L10n;
  story: L10n;
}

export const LIFETIME_BRACKETS: LifetimeBracket[] = [
  {
    min: 0,
    name: { ar: 'حياة الأساس', en: 'The foundation life' },
    story: {
      ar: 'عمرٌ من العمل يغطي الأساسيات بكرامة — سكن مستأجر، وتعليم حكومي جيد، وسيارة تخدم طويلاً. كل ريال هنا له وظيفة، ولهذا يكون أثر كل تحسين في الدخل أو الادخار كبيراً.',
      en: 'A working life that covers the essentials with dignity — rented housing, good public schooling, a car that serves long. Every riyal has a job here, which is exactly why each raise or saving habit lands with outsized effect.',
    },
  },
  {
    min: 5_000_000,
    name: { ar: 'حياة التملّك', en: 'The ownership life' },
    story: {
      ar: 'هذا العمر الكاسب يتّسع لبيتٍ يُمتلك لا يُستأجر، وتعليمٍ خاص لطفلين، وسياراتٍ تُجدَّد — إن وصل منه ما يكفي إلى جهة الادخار من الميزان.',
      en: 'This earning life is big enough to own a home rather than rent it, put two children through private education, and renew the cars — if enough of it reaches the saving side of the scale.',
    },
  },
  {
    min: 10_000_000,
    name: { ar: 'حياة الاختيار', en: 'The life of choices' },
    story: {
      ar: 'عمرٌ يحمل فيلا مملوكة، وتعليماً خاصاً لثلاثة، وسفراً سنوياً، ومحفظة تقاعد حقيقية — وقادرٌ أن يحمل عملاً خاصاً أيضاً. عند هذا الحجم، السؤال لم يعد «كم أكسب؟» بل «كم أُبقي؟».',
      en: 'A lifetime that can hold an owned villa, private education for three, yearly travel, and a real retirement portfolio — with room for a business of your own. At this size the question is no longer "how much do I earn?" but "how much do I keep?"',
    },
  },
  {
    min: 18_000_000,
    name: { ar: 'حياة الإرث', en: 'The legacy life' },
    story: {
      ar: 'دخل عمرٍ كهذا يتجاوز الحاجات إلى الأثر: عقارٌ ثانٍ، ووقفٌ أو عطاء منتظم، ورأس مال يبدأ به أبناؤك حياتهم. التحدي الوحيد الحقيقي هو ألا يتسرّب في مستوى معيشةٍ يتضخم بصمت.',
      en: "A lifetime income like this goes past needs into legacy: a second property, an endowment or steady giving, and starting capital for your children. Its only real enemy is a standard of living that inflates silently to absorb it.",
    },
  },
];

export function bracketFor(total: number): LifetimeBracket {
  let out = LIFETIME_BRACKETS[0];
  for (const b of LIFETIME_BRACKETS) if (total >= b.min) out = b;
  return out;
}

// How many of each catalog item a lifetime sum could hold, spending roughly
// half of it on daily living first (food, bills, the ordinary days) — an
// honest frame: the arc pays for LIFE, then for the big things.
export function whatItCouldHold(total: number): { item: LifeItem; count: number }[] {
  let budget = total * 0.5;
  const out: { item: LifeItem; count: number }[] = [];
  for (const item of LIFE_CATALOG) {
    if (budget <= 0) break;
    const count = Math.min(item.icon === '🎓' ? 4 : 2, Math.floor(budget / item.cost));
    if (count > 0) {
      out.push({ item, count });
      budget -= count * item.cost;
    }
  }
  return out;
}
