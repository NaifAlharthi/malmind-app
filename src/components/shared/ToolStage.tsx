'use client';

// Inside every tool, FOUR levels of complexity and power — staged by
// the same iceberg dial the whole product speaks, and gated by the
// same plan ceiling that is the subscription system. Usage, per tool:
//
//   <ToolStage level={2} title="The controls">…</ToolStage>
//   <ToolStage level={4} title="The engine room">…</ToolStage>
//
// At or below the current depth, sections render as themselves. Above
// the depth but within the plan: a quiet "dive to open" teaser that
// raises the dial in place. Above the plan's ceiling: a locked teaser
// naming the plan that opens it — the paywall's honest face.

import { useDepth, useTier } from './ExperienceMode';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { TIER_META, tierForDepth } from '@/lib/tier';
import type { DepthLevel } from '@/lib/depth';

export default function ToolStage({
  level, title, children,
}: {
  level: DepthLevel; title?: string; children: React.ReactNode;
}) {
  const { depth, setDepth } = useDepth();
  const { maxDepth } = useTier();
  const { locale } = useLocale();
  const ar = locale === 'ar';

  if (depth >= level) return <>{children}</>;

  const locked = maxDepth < level;
  const plan = TIER_META[tierForDepth(level)];

  return locked ? (
    <div className="rounded-2xl border border-dashed border-[var(--gold)]/40 bg-[var(--gold)]/5 px-4 py-3 mb-4">
      <div className="flex items-center gap-2.5 text-[11px] text-[var(--ink-2)]">
        <span aria-hidden>🔒</span>
        <span className="flex-1">
          {title && <span className="font-semibold">{title} — </span>}
          {ar ? `يفتح مع باقة «${plan.name.ar}» ${plan.icon}` : `unlocks with the ${plan.name.en} plan ${plan.icon}`}
        </span>
        <span className="text-[9px] text-[var(--muted)]" dir="ltr">D{level}</span>
      </div>
    </div>
  ) : (
    <button
      onClick={() => setDepth(level)}
      className="w-full rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--surface-1)]/40 px-4 py-3 mb-4 flex items-center gap-2.5 text-[11px] text-[var(--ink-2)] hover:text-[var(--ink)] hover:border-[var(--green)] transition-colors cursor-pointer text-start"
    >
      <span aria-hidden>▾</span>
      <span className="flex-1">
        {title && <span className="font-semibold">{title} — </span>}
        {ar ? `اغطس إلى العمق ${level} ليُفتح` : `dive to depth ${level} to open`}
      </span>
      <span className="text-[9px] text-[var(--muted)]" dir="ltr">D{level}</span>
    </button>
  );
}
