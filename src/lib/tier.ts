// src/lib/tier.ts
// The subscription tiers — and the doctrine that makes them simple:
// the product ALREADY stages everything by the iceberg depth (D1-D4);
// a tier is a CEILING on that dial. Four tiers, four depths, one rule:
//   Starter  → D1  · the essentials, free forever
//   Growth   → D2  · getting organized
//   Advanced → D3  · the analysis
//   Mastery  → D4  · every tool at full power
// Each tool likewise offers its four internal levels of complexity via
// ToolStage — the same ceiling gates those too. Until billing lands,
// the tier lives in localStorage and defaults to Mastery (all open);
// the plan picker in ☰ is the placeholder for the real paywall.

import type { DepthLevel } from '@/lib/depth';

export type TierKey = 'starter' | 'growth' | 'advanced' | 'mastery';

export const TIER_ORDER: TierKey[] = ['starter', 'growth', 'advanced', 'mastery'];

export const TIER_META: Record<TierKey, {
  icon: string;
  maxDepth: DepthLevel;
  name: { ar: string; en: string };
  blurb: { ar: string; en: string };
}> = {
  starter: {
    icon: '🌱', maxDepth: 1,
    name: { ar: 'البداية', en: 'Starter' },
    blurb: { ar: 'الأساسيات — صورة كاملة بلا تعقيد.', en: 'The essentials — a complete picture, zero complexity.' },
  },
  growth: {
    icon: '🌿', maxDepth: 2,
    name: { ar: 'النمو', en: 'Growth' },
    blurb: { ar: 'الانضباط اليومي — ميزانيات وخطط ومقارنات.', en: 'Daily discipline — budgets, plans and comparisons.' },
  },
  advanced: {
    icon: '🌳', maxDepth: 3,
    name: { ar: 'التحليل', en: 'Advanced' },
    blurb: { ar: 'القراءة العميقة — النسب والأقران والسيناريوهات.', en: 'Deep reading — ratios, peers and scenarios.' },
  },
  mastery: {
    icon: '🏔', maxDepth: 4,
    name: { ar: 'الإتقان', en: 'Mastery' },
    blurb: { ar: 'كل أداة بكامل قوتها — محركات التوزيع والائتمان والمضاعفة.', en: 'Every tool at full power — allocation, credit and compounding engines.' },
  },
};

export const TIER_KEY = 'mm-tier';

export function getStoredTier(): TierKey {
  if (typeof window === 'undefined') return 'mastery';
  try {
    const v = window.localStorage.getItem(TIER_KEY);
    return v === 'starter' || v === 'growth' || v === 'advanced' || v === 'mastery' ? v : 'mastery';
  } catch { return 'mastery'; }
}

export function storeTier(t: TierKey) {
  try { window.localStorage.setItem(TIER_KEY, t); } catch { /* ignore */ }
}

/** The cheapest tier whose ceiling reaches the given depth. */
export function tierForDepth(d: DepthLevel): TierKey {
  return TIER_ORDER.find((t) => TIER_META[t].maxDepth >= d) ?? 'mastery';
}
