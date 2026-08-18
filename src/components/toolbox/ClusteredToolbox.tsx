'use client';

// The Toolbox, clustered your way. One set of tools, FOUR lenses —
// each a different question a decision-maker asks:
//   🕰 Time    — past · today · future (the classic wall)
//   🧊 Depth   — D1 essentials → D4 mastery (the iceberg's bands)
//   🎯 Purpose — capture & understand · steady & protect · decide · grow
//   🧭 Area    — cash flow · debt · wealth · protection
// Switching lenses doesn't redraw the wall — the SAME tool chips fly
// to their new homes (FLIP: measure, reparent, animate the delta), so
// the eye keeps track of every tool as the clustering changes.

import { useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { TOOLS, type ViewKey, type HubTool } from '@/lib/toolbox';
import { useTier } from '@/components/shared/ExperienceMode';
import { TIER_META, tierForDepth } from '@/lib/tier';

type LensKey = 'time' | 'depth' | 'purpose' | 'area' | 'indices' | 'phase';
type Entry = { id: string; view: ViewKey; tool: HubTool };

const ENTRIES: Entry[] = (['past', 'today', 'future'] as ViewKey[])
  .flatMap((view) => TOOLS[view].map((tool) => ({ id: `${view}|${tool.href}`, view, tool })));

// which PURPOSE each tool serves — the jobs a person hires it for
const PURPOSE_OF: Record<string, string> = {
  '/story': 'capture', '/financial-numbers': 'capture', '/holdings': 'capture', '/commitments': 'capture',
  '/positioning': 'capture', '/ratios': 'capture', '/lifetime-income': 'capture', '/markets': 'capture',
  '/daily-stack': 'steady', '/risks': 'steady', '/standard-of-living?mode=track': 'steady',
  '/budgeting': 'steady', '/year-plan': 'steady',
  '/compare': 'decide', '/what-if': 'decide', '/waterfall': 'decide', '/luxury': 'decide',
  '/business': 'decide', '/credit': 'decide', '/standard-of-living?mode=plan': 'decide',
  '/freedom': 'grow', '/goal-fund': 'grow', '/velocity': 'grow', '/doubling-path': 'grow',
  '/subscriptions': 'steady', '/credit-cards': 'steady', '/class': 'capture', '/mortgage': 'decide',
  '/salaries': 'capture', '/insurance': 'steady', '/poverty': 'steady', '/auto-loan': 'decide', '/retirement': 'grow',
  '/gosi': 'grow', '/family': 'decide',
};

// which MONEY AREA each tool steers
const AREA_OF: Record<string, string> = {
  '/financial-numbers': 'flow', '/daily-stack': 'flow', '/budgeting': 'flow', '/year-plan': 'flow',
  '/waterfall': 'flow', '/velocity': 'flow', '/lifetime-income': 'flow', '/story': 'flow',
  '/commitments': 'debt', '/credit': 'debt',
  '/holdings': 'wealth', '/freedom': 'wealth', '/goal-fund': 'wealth', '/doubling-path': 'wealth',
  '/markets': 'wealth', '/luxury': 'wealth', '/positioning': 'wealth', '/business': 'wealth',
  '/compare': 'wealth', '/what-if': 'wealth',
  '/risks': 'shield', '/standard-of-living?mode=track': 'shield', '/standard-of-living?mode=plan': 'shield',
  '/ratios': 'shield',
  '/subscriptions': 'flow', '/credit-cards': 'debt', '/class': 'wealth', '/mortgage': 'debt',
  '/salaries': 'flow', '/insurance': 'shield', '/poverty': 'shield', '/auto-loan': 'debt', '/retirement': 'wealth',
  '/gosi': 'wealth', '/family': 'flow',
};

// which tools ARE index-like — everything else falls to the strip
// beneath when the indices lens is chosen
const INDICES_OF: Record<string, string> = {
  '/markets': 'world',
  '/salaries': 'you', '/class': 'you', '/positioning': 'you', '/ratios': 'you', '/credit': 'you', '/poverty': 'you',
};

// which LIFE PHASE each tool serves first — a tool can matter in many
// phases; this is where it matters MOST. Phase-agnostic tools fall to
// the strip.
const PHASE_OF: Record<string, string> = {
  '/daily-stack': 'college', '/subscriptions': 'college', '/budgeting': 'college', '/salaries': 'college',
  '/financial-numbers': 'entry', '/story': 'entry', '/goal-fund': 'entry', '/auto-loan': 'entry',
  '/credit-cards': 'entry', '/positioning': 'entry', '/commitments': 'entry',
  '/mortgage': 'family', '/insurance': 'family', '/risks': 'family', '/class': 'family', '/compare': 'family',
  '/standard-of-living?mode=plan': 'family', '/standard-of-living?mode=track': 'family',
  '/holdings': 'mid', '/what-if': 'mid', '/velocity': 'mid', '/doubling-path': 'mid', '/business': 'mid',
  '/markets': 'mid', '/ratios': 'mid', '/credit': 'mid', '/waterfall': 'mid', '/year-plan': 'mid',
  '/retirement': 'retire', '/lifetime-income': 'retire', '/freedom': 'retire', '/luxury': 'retire',
  '/gosi': 'retire', '/family': 'family',
};

const LENSES: Record<LensKey, {
  icon: string;
  name: { ar: string; en: string };
  groups: { key: string; icon: string; ar: string; en: string }[];
  // null means: this tool doesn't belong under this lens — it falls
  // to the "outside this lens" strip beneath the wall
  groupOf: (e: Entry) => string | null;
}> = {
  time: {
    icon: '🕰',
    name: { ar: 'الزمن', en: 'Time' },
    groups: [
      { key: 'past', icon: '🕰', ar: 'الماضي', en: 'The Past' },
      { key: 'today', icon: '☀', ar: 'اليوم', en: 'Today' },
      { key: 'future', icon: '🔭', ar: 'المستقبل', en: 'The Future' },
    ],
    groupOf: (e) => e.view,
  },
  depth: {
    icon: '🧊',
    name: { ar: 'العمق', en: 'Depth' },
    groups: [
      { key: '1', icon: '🌊', ar: 'الأساسيات D1', en: 'Essentials D1' },
      { key: '2', icon: '⚓', ar: 'الانضباط D2', en: 'Organized D2' },
      { key: '3', icon: '🐬', ar: 'التحليل D3', en: 'Analysis D3' },
      { key: '4', icon: '💎', ar: 'الاحتراف D4', en: 'Mastery D4' },
    ],
    groupOf: (e) => String(e.tool.depth ?? 1),
  },
  purpose: {
    icon: '🎯',
    name: { ar: 'الغرض', en: 'Purpose' },
    groups: [
      { key: 'capture', icon: '📥', ar: 'سجّل وافهم', en: 'Capture & understand' },
      { key: 'steady', icon: '🛡', ar: 'اضبط واحمِ', en: 'Steady & protect' },
      { key: 'decide', icon: '🧭', ar: 'قرّر', en: 'Decide' },
      { key: 'grow', icon: '📈', ar: 'نمِّ', en: 'Grow' },
    ],
    groupOf: (e) => PURPOSE_OF[e.tool.href] ?? 'capture',
  },
  area: {
    icon: '🧭',
    name: { ar: 'المجال', en: 'Area' },
    groups: [
      { key: 'flow', icon: '🔄', ar: 'التدفق', en: 'Cash flow' },
      { key: 'debt', icon: '⛓', ar: 'الدين', en: 'Debt' },
      { key: 'wealth', icon: '📊', ar: 'الثروة', en: 'Wealth' },
      { key: 'shield', icon: '🛡', ar: 'الحماية', en: 'Protection' },
    ],
    groupOf: (e) => AREA_OF[e.tool.href] ?? 'wealth',
  },
  indices: {
    icon: '📊',
    name: { ar: 'المؤشرات', en: 'Indices' },
    groups: [
      { key: 'world', icon: '🌐', ar: 'مؤشرات العالم', en: 'World indices' },
      { key: 'you', icon: '🧭', ar: 'أنت على المساطر', en: 'You on the rulers' },
    ],
    groupOf: (e) => INDICES_OF[e.tool.href] ?? null,
  },
  phase: {
    icon: '🎢',
    name: { ar: 'مرحلة الحياة', en: 'Life phase' },
    groups: [
      { key: 'college', icon: '🎓', ar: 'الجامعة وبداية الطريق', en: 'College & starting out' },
      { key: 'entry', icon: '🚪', ar: 'بداية المسيرة', en: 'Career entry' },
      { key: 'family', icon: '👨‍👩‍👧', ar: 'تكوين الأسرة', en: 'Family building' },
      { key: 'mid', icon: '⛰', ar: 'منتصف المسيرة', en: 'Mid-career' },
      { key: 'retire', icon: '🌅', ar: 'التقاعد وما بعده', en: 'Retirement & beyond' },
    ],
    groupOf: (e) => PHASE_OF[e.tool.href] ?? null,
  },
};

export default function ClusteredToolbox() {
  const { t, locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const { maxDepth } = useTier();
  const [lens, setLens] = useState<LensKey>('time');

  // FLIP: remember where every chip stood, then animate it to where
  // it lands under the new lens
  const nodes = useRef<Map<string, HTMLElement>>(new Map());
  const prevRects = useRef<Map<string, DOMRect> | null>(null);

  const switchLens = (next: LensKey) => {
    if (next === lens) return;
    const rects = new Map<string, DOMRect>();
    nodes.current.forEach((el, id) => rects.set(id, el.getBoundingClientRect()));
    prevRects.current = rects;
    setLens(next);
  };

  useLayoutEffect(() => {
    const prev = prevRects.current;
    if (!prev) return;
    prevRects.current = null;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    nodes.current.forEach((el, id) => {
      const from = prev.get(id);
      if (!from) return;
      const to = el.getBoundingClientRect();
      const dx = from.left - to.left;
      const dy = from.top - to.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px)`, opacity: 0.85 },
          { transform: 'translate(0, 0)', opacity: 1 },
        ],
        { duration: 520, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      );
    });
  }, [lens]);

  const active = LENSES[lens];
  const cols = active.groups.length;

  return (
    <div className="mb-8">
      {/* the lens switcher — how do you want to think right now? */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--green-border)] bg-[var(--green-bg)]/50 px-2.5 py-1 text-[10px] font-bold text-[var(--green-dark)]" dir="ltr">
          🧰 {ENTRIES.length} {L('أداة', 'tools')}
        </span>
        <span className="text-[10px] tracking-[0.08em] uppercase text-[var(--muted)] font-semibold">{L('اجمعها حسب', 'Cluster by')}</span>
        <div className="inline-flex items-center bg-[var(--surface-1)] border border-[var(--border-default)] rounded-full p-0.5" role="radiogroup">
          {(Object.keys(LENSES) as LensKey[]).map((k) => {
            const meta = LENSES[k];
            const on = lens === k;
            return (
              <button
                key={k}
                role="radio"
                aria-checked={on}
                onClick={() => switchLens(k)}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] transition-colors whitespace-nowrap cursor-pointer ${
                  on ? 'bg-[var(--ink)] text-[var(--surface-0)] font-semibold shadow-sm' : 'text-[var(--muted)] hover:text-[var(--ink-2)]'
                }`}
              >
                <span className="leading-none">{meta.icon}</span>
                <span>{ar ? meta.name.ar : meta.name.en}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* the wall — same chips, new homes */}
      <div className={`grid gap-3 ${cols === 3 ? 'sm:grid-cols-3' : cols === 5 ? 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
        {active.groups.map((g) => {
          const members = ENTRIES.filter((e) => active.groupOf(e) === g.key);
          return (
            <div key={`${lens}-${g.key}`} className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base leading-none">{g.icon}</span>
                <span className="text-sm font-semibold text-[var(--ink)]">{ar ? g.ar : g.en}</span>
                <span className="ms-auto text-[10px] text-[var(--muted)]">{members.length}</span>
              </div>
              <div className="flex flex-col gap-1">
                {members.map((e) => {
                  const d = e.tool.depth ?? 1;
                  const locked = d > maxDepth;
                  const plan = TIER_META[tierForDepth(d)];
                  const register = (el: HTMLElement | null) => {
                    if (el) nodes.current.set(e.id, el);
                    else nodes.current.delete(e.id);
                  };
                  return locked ? (
                    <div
                      key={e.id}
                      ref={register}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 opacity-55 cursor-not-allowed"
                      title={ar ? `يفتح مع باقة «${plan.name.ar}»` : `Unlocks with the ${plan.name.en} plan`}
                    >
                      <span className="text-sm leading-none">{e.tool.icon}</span>
                      <span className="text-xs text-[var(--ink-2)]">{t(e.tool.titleKey)}</span>
                      <span className="ms-auto text-[9px] text-[var(--muted)]" dir="ltr">🔒 D{d}</span>
                    </div>
                  ) : (
                    <Link
                      key={e.id}
                      ref={register as never}
                      href={e.tool.href}
                      className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--surface-1)] transition-colors"
                    >
                      <span className="text-sm leading-none">{e.tool.icon}</span>
                      <span className="text-xs text-[var(--ink-2)] group-hover:text-[var(--ink)] transition-colors">{t(e.tool.titleKey)}</span>
                      <span className="ms-auto text-[9px] text-[var(--muted)]" dir="ltr">D{d}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* the strip beneath: tools this lens doesn't speak about — they
          fly down here (same chips, same FLIP) rather than vanish */}
      {(() => {
        const outside = ENTRIES.filter((e) => active.groupOf(e) === null);
        if (outside.length === 0) return null;
        return (
          <div className="mt-4 rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--surface-1)]/30 p-4">
            <div className="text-[10px] tracking-[0.08em] uppercase text-[var(--muted)] font-semibold mb-2">
              {L(`خارج هذه العدسة — ${outside.length} أداة لا تنطبق عليها`, `Outside this lens — ${outside.length} tools it doesn't apply to`)}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {outside.map((e) => {
                const d = e.tool.depth ?? 1;
                const locked = d > maxDepth;
                const register = (el: HTMLElement | null) => {
                  if (el) nodes.current.set(e.id, el);
                  else nodes.current.delete(e.id);
                };
                return locked ? (
                  <span key={e.id} ref={register} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-faint)] px-2.5 py-1 text-[10px] text-[var(--muted)] opacity-55">
                    <span>{e.tool.icon}</span>{t(e.tool.titleKey)} 🔒
                  </span>
                ) : (
                  <Link key={e.id} ref={register as never} href={e.tool.href}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] px-2.5 py-1 text-[10px] text-[var(--ink-2)] hover:border-[var(--green)] hover:text-[var(--ink)] transition-colors">
                    <span>{e.tool.icon}</span>{t(e.tool.titleKey)}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
