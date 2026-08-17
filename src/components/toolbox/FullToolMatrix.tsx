'use client';

// The full tool matrix — every tool in the product on one wall,
// arranged across the three times, each stamped with the depth it
// lives at. Born on home·D4, later given its own /toolbox page; the
// same wall serves both, and walks anywhere in one tap.

import Link from 'next/link';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { TOOLS, type ViewKey } from '@/lib/toolbox';
import { useTier } from '@/components/shared/ExperienceMode';
import { TIER_META, tierForDepth } from '@/lib/tier';

export default function FullToolMatrix() {
  const { t, locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const { maxDepth } = useTier();
  const VIEW_META: { key: ViewKey; icon: string; label: string }[] = [
    { key: 'past', icon: '🕰', label: t('nav.past') },
    { key: 'today', icon: '☀', label: t('nav.today') },
    { key: 'future', icon: '🔭', label: t('nav.future') },
  ];
  return (
    <div className="mb-8">
      <div className="mb-3">
        <div className="text-[10px] tracking-[0.08em] uppercase text-[var(--gold)] font-semibold mb-1">{L('المصفوفة كاملة', 'The full matrix')}</div>
        <div className="font-serif text-lg font-semibold text-[var(--ink)]">{L('كل أداة، عبر الأزمنة الثلاثة', 'Every tool, across the three times')}</div>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        {VIEW_META.map((view) => (
          <div key={view.key} className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base leading-none">{view.icon}</span>
              <span className="text-sm font-semibold text-[var(--ink)]">{view.label}</span>
              <span className="ms-auto text-[10px] text-[var(--muted)]">{TOOLS[view.key].length}</span>
            </div>
            <div className="flex flex-col gap-1">
              {TOOLS[view.key].map((tool) => {
                const d = tool.depth ?? 1;
                // tools above the plan's ceiling stay visible but locked —
                // the matrix shows the whole product, the plan opens it
                if (d > maxDepth) {
                  const plan = TIER_META[tierForDepth(d)];
                  return (
                    <div
                      key={tool.href}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 opacity-55 cursor-not-allowed"
                      title={ar ? `يفتح مع باقة «${plan.name.ar}»` : `Unlocks with the ${plan.name.en} plan`}
                    >
                      <span className="text-sm leading-none">{tool.icon}</span>
                      <span className="text-xs text-[var(--ink-2)]">{t(tool.titleKey)}</span>
                      <span className="ms-auto text-[9px] text-[var(--muted)]" dir="ltr">🔒 D{d}</span>
                    </div>
                  );
                }
                return (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--surface-1)] transition-colors"
                  >
                    <span className="text-sm leading-none">{tool.icon}</span>
                    <span className="text-xs text-[var(--ink-2)] group-hover:text-[var(--ink)] transition-colors">{t(tool.titleKey)}</span>
                    <span className="ms-auto text-[9px] text-[var(--muted)]" dir="ltr">D{tool.depth ?? 1}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
