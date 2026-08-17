// src/lib/depth.ts
// The depth dimension. The top bar's timeline moves you through TIME
// (past · today · future); the iceberg rail moves you through DEPTH — how
// much of the product's tool drawer is on the surface:
//   1 · the essentials    — the calm minimum for a complete picture
//   2 · getting organized — money's daily life: budgets, plans, risks
//   3 · the analysis      — ratios, positioning, velocity, scenarios
//   4 · full mastery      — every tool in the product laid bare
// Each hub tool carries a depth (see HubPage's TOOLS); the drawers show
// only tools at or above the chosen depth, so nobody gets the whole
// Bloomberg spread thrown at them — but anyone can dive for more.

export type DepthLevel = 1 | 2 | 3 | 4;
export const DEPTH_LEVELS: DepthLevel[] = [1, 2, 3, 4];

export const DEPTH_KEY = 'mm-depth';

// Visual + narrative meta for the iceberg: level 1 is the tip above the
// waterline, levels 2–4 sink into progressively darker water.
export const DEPTH_META: Record<DepthLevel, {
  icon: string;
  water: string; // section background tint for the dive overlay
  depth: { ar: string; en: string }; // gamified depth marker
  name: { ar: string; en: string };
  desc: { ar: string; en: string }; // what this depth gives you
}> = {
  1: {
    icon: '🌊',
    water: '#12374F',
    depth: { ar: 'السطح', en: 'Surface' },
    name: { ar: 'الأساس', en: 'The essentials' },
    desc: {
      ar: 'أقل ما يلزم لصورة مالية كاملة: قصتك، أرقامك، أصولك، التزاماتك، وحلمك الكبير. لا تحليل ولا ضجيج — وضوح فقط.',
      en: 'The least you need for a complete financial picture: your story, your numbers, your assets, your commitments, and the big dream. No analysis, no noise — just clarity.',
    },
  },
  2: {
    icon: '⚓',
    water: '#0E2C42',
    depth: { ar: '−20م', en: '−20m' },
    name: { ar: 'الضبط', en: 'Getting organized' },
    desc: {
      ar: 'تنضبط حياة مالك اليومية: ميزانية بسقوف، مقارنة القرارات الكبيرة، خطة سنة، مخاطر مكشوفة، ومستوى معيشة مرسوم.',
      en: "Your money's daily life gets disciplined: capped budgets, big-decision comparisons, a year plan, visible risks, and a mapped standard of living.",
    },
  },
  3: {
    icon: '🐬',
    water: '#092136',
    depth: { ar: '−200م', en: '−200m' },
    name: { ar: 'التحليل', en: 'The analysis' },
    desc: {
      ar: 'تبدأ قراءة الأعماق: نسبك ومؤشراتك المالية، موقعك بين أقرانك، سرعة نمو ثروتك، دخل عمرك كاملاً، وسيناريوهات ماذا-لو.',
      en: 'Deep reading begins: your financial ratios, your position among peers, your wealth velocity, your whole lifetime income, and what-if scenarios.',
    },
  },
  4: {
    icon: '💎',
    water: '#051627',
    depth: { ar: '−1000م', en: '−1000m' },
    name: { ar: 'الاحتراف', en: 'Full mastery' },
    desc: {
      ar: 'الطاولة كاملة: الائتمان وقوة الاقتراض، شلّال أولويات كل ريال، طريق مضاعفة ثروتك — كل أداة في المنتج مكشوفة أمامك.',
      en: 'The full table: credit and borrowing power, the priority waterfall for every riyal, the doubling path of your wealth — every tool in the product laid bare.',
    },
  },
};

// Pages that restage into ROOMS get their own level naming — the global
// names describe tool staging, but home's levels are literally Main, the
// foundation, the Log, and the full toolbox (founder naming, 2026-08-17).
export const DEPTH_NAME_OVERRIDES: Record<string, Record<DepthLevel, {
  icon: string;
  name: { ar: string; en: string };
  desc: { ar: string; en: string };
}>> = {
  '/home': {
    1: {
      icon: '⌂',
      name: { ar: 'الرئيسي', en: 'Main' },
      desc: { ar: 'هاجسك وحده، بكامل التركيز — ومنه تنطلق إلى حيث الفعل.', en: 'Your concern alone, in full focus — the launch point into the action.' },
    },
    2: {
      icon: '🏛',
      name: { ar: 'الأساس', en: 'The foundation' },
      desc: { ar: 'من أنت ورقمك الواحد وموقعك — ثم بيت أساسك: هل يوجد كل ما ينبغي أن يوجد؟', en: 'Who you are, your one figure, where you stand — then the foundation house: does everything that should exist, exist?' },
    },
    3: {
      icon: '🫀',
      name: { ar: 'نبض الشهر', en: 'The Monthly Pulse' },
      desc: { ar: 'قصة شهرك الأخير: ماذا تحرّك، وأكبر حركة، وسلسلتك، وإيقاعك.', en: "Your latest month's story: what moved, the biggest mover, your streak, your pace." },
    },
    4: {
      icon: '🧮',
      name: { ar: 'النظرة المالية الكاملة', en: 'Full financial overview' },
      desc: { ar: 'أعقد عرض لأرقامك: الأرصدة ومساراتها والنسب والمنحنيات — وصندوق الأدوات في دُرجه.', en: 'Your numbers at full complexity: balances with their trends, ratios and curves — the toolbox waiting in its drawer.' },
    },
  },
};

// The meta for a level AS SEEN FROM a page: global meta with the page's
// room naming layered on top when one exists.
export function depthMetaFor(pathname: string, level: DepthLevel) {
  const o = DEPTH_NAME_OVERRIDES[pathname]?.[level];
  return o ? { ...DEPTH_META[level], icon: o.icon, name: o.name, desc: o.desc } : DEPTH_META[level];
}

export function getStoredDepth(): DepthLevel {
  if (typeof window === 'undefined') return 1;
  try {
    const v = Number(window.localStorage.getItem(DEPTH_KEY));
    return v === 2 || v === 3 || v === 4 ? v : 1;
  } catch { return 1; }
}

export function storeDepth(d: DepthLevel) {
  try { window.localStorage.setItem(DEPTH_KEY, String(d)); } catch { /* ignore */ }
}
