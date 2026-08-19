// src/lib/tier.ts
// The subscription tiers — per the business model (Moja, working sheet
// 03/23 + malmind-bundles.netlify.app). Three individual plans, and the
// doctrine stays: the product ALREADY stages everything by the iceberg
// depth (D1–D4); a plan is a CEILING on that dial:
//   Free «السطح»   → D1        · the picture, free forever · 1 Brain review/mo
//   Plus «الضبط»   → D2        · the system & the plan · 33 SAR/mo · 20 Brain/mo
//   Pro  «الأعماق» → D3 + D4   · analysis & the engines together · 66 SAR/mo · unlimited
// D3 and D4 deliberately share Pro — splitting "analysis" from "the
// advanced engines" would make a weak fourth plan and harder choices.
// Prices include VAT; yearly = ten months for twelve. Family (+24/mo,
// up to 4 profiles at the account's depth) and Advisor (399, separate
// professional product) come later — teased, not sold, in the picker.
// Never say "tokens" to the customer: it's "Brain reviews & analyses".
// Until billing lands the tier lives in localStorage and defaults to
// Pro (all open) — to be reset to Free at subscription launch.

import type { DepthLevel } from '@/lib/depth';

export type TierKey = 'free' | 'plus' | 'pro';

export const TIER_ORDER: TierKey[] = ['free', 'plus', 'pro'];

export const TIER_META: Record<TierKey, {
  icon: string;
  maxDepth: DepthLevel;
  brand: string; // Free · Plus · Pro — the commercial name, locale-free
  name: { ar: string; en: string };
  blurb: { ar: string; en: string };
  priceMonthly: number; // SAR, VAT included; 0 = free forever
  priceYearly: number | null; // SAR billed yearly — two months free
  brain: { ar: string; en: string }; // the Brain allowance, in customer words
}> = {
  free: {
    icon: '🌊', maxDepth: 1, brand: 'Free',
    name: { ar: 'السطح', en: 'The Surface' },
    blurb: { ar: 'اعرف أين تقف — دون ضجيج أو تعقيد.', en: 'Know where you stand — no noise, no complexity.' },
    priceMonthly: 0, priceYearly: null,
    brain: { ar: 'مراجعة واحدة من العقل شهرياً', en: 'One Brain review a month' },
  },
  plus: {
    icon: '🎚', maxDepth: 2, brand: 'Plus',
    name: { ar: 'الضبط', en: 'The Tuning' },
    blurb: { ar: 'حوّل صورتك المالية إلى نظام وخطة شهرية.', en: 'Turn your picture into a system and a monthly plan.' },
    priceMonthly: 33, priceYearly: 390,
    brain: { ar: '٢٠ تحليلاً من العقل شهرياً', en: '20 Brain analyses a month' },
  },
  pro: {
    icon: '🤿', maxDepth: 4, brand: 'Pro',
    name: { ar: 'الأعماق', en: 'The Depths' },
    blurb: { ar: 'اختبر القرارات والسيناريوهات قبل أن تعيش نتائجها.', en: 'Test decisions and scenarios before living their outcomes.' },
    priceMonthly: 66, priceYearly: 790,
    brain: { ar: 'تحليلات غير محدودة من العقل', en: 'Unlimited Brain analyses' },
  },
};

export const TIER_KEY = 'mm-tier';

// The pre-business-model keys (four tiers) map onto the three plans:
// analysis and mastery both live in Pro now.
const LEGACY: Record<string, TierKey> = {
  starter: 'free', growth: 'plus', advanced: 'pro', mastery: 'pro',
};

export function getStoredTier(): TierKey {
  if (typeof window === 'undefined') return 'pro';
  try {
    const v = window.localStorage.getItem(TIER_KEY);
    if (v === 'free' || v === 'plus' || v === 'pro') return v;
    if (v && LEGACY[v]) {
      window.localStorage.setItem(TIER_KEY, LEGACY[v]);
      return LEGACY[v];
    }
    // default: the highest plan, until the subscription launch resets to Free
    return 'pro';
  } catch { return 'pro'; }
}

export function storeTier(t: TierKey) {
  try { window.localStorage.setItem(TIER_KEY, t); } catch { /* ignore */ }
}

/** The cheapest plan whose ceiling reaches the given depth. */
export function tierForDepth(d: DepthLevel): TierKey {
  return TIER_ORDER.find((t) => TIER_META[t].maxDepth >= d) ?? 'pro';
}
