// src/lib/experienceMode.ts
// The product's three experience modes — how much hand-holding the whole
// interface gives:
//   guided  — "take my hand": assumes no personal-finance background; the
//             core tools only, the Brain narrating every page.
//   growing — "getting a hold of things": the sensible middle; more tools
//             surfaced, guidance available on ask.
//   pro     — the full Bloomberg-terminal spread: everything visible,
//             guidance quiet until summoned.
// Nothing is ever removed — lower modes stage tools behind a "more" reveal.

export type XMode = 'guided' | 'growing' | 'pro';
export const XMODE_KEY = 'mm-xmode';
export const XMODES: XMode[] = ['guided', 'growing', 'pro'];

// Rank used to filter tool lists (tool.min ≤ rank shows by default).
export const XMODE_RANK: Record<XMode, number> = { guided: 1, growing: 2, pro: 3 };

export const XMODE_META: Record<XMode, { icon: string; label: { ar: string; en: string }; desc: { ar: string; en: string } }> = {
  guided: {
    icon: '🤝',
    label: { ar: 'أرشدني', en: 'Guide me' },
    desc: { ar: 'خطوة بخطوة، بلا تعقيد — والعقل يشرح كل صفحة', en: 'Step by step, zero clutter — the Brain narrates every page' },
  },
  growing: {
    icon: '🌱',
    label: { ar: 'شبه محترف', en: 'Semi-pro' },
    desc: { ar: 'أدوات أكثر، وإرشاد عند الطلب', en: 'More tools on the surface, guidance on ask' },
  },
  pro: {
    icon: '💼',
    label: { ar: 'محترف', en: 'Pro' },
    desc: { ar: 'كل شيء ظاهر، بلا وساطة', en: 'Everything visible, nothing between you and the numbers' },
  },
};

export function getXMode(): XMode {
  if (typeof window === 'undefined') return 'guided';
  try {
    const v = window.localStorage.getItem(XMODE_KEY);
    return v === 'growing' || v === 'pro' ? v : 'guided';
  } catch { return 'guided'; }
}

export function storeXMode(m: XMode) {
  try { window.localStorage.setItem(XMODE_KEY, m); } catch { /* ignore */ }
}
