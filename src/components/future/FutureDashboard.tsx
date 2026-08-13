'use client';

// T3 (the Future) by the founder's grid — each depth its own room, learned
// from T1 & T2 and composed to maximize what our future tools give:
//   D1 الحلم       — the live summary (goals, scenarios, plans, pace) and
//                    three dive cards naming what lives below
//   D2 التخطيط     — the planning room: freedom, goal funds, budgets, the
//                    year plan, compare, the standard-of-living ladder
//   D3 السيناريوهات — the scenario room: what-if and the income ahead —
//                    play the decision before living it
//   D4 المحركات    — the allocation engines: the waterfall, the doubling
//                    path, and luxury — the most complex operations
// Everything is driven by the shared toolbox registry, so a new future
// tool lands in the right room by its depth alone.

import Link from 'next/link';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { useDepth } from '@/components/shared/ExperienceMode';
import { DEPTH_META, type DepthLevel } from '@/lib/depth';
import { TOOLS } from '@/lib/toolbox';

export interface FutureTile {
  label: string;
  value: string;
  accent?: string;
  sub?: string;
  big?: boolean;
}

const FUTURE_TOOLS = TOOLS.future;

export default function FutureDashboard({ tiles }: { tiles: FutureTile[] }) {
  const { t, locale } = useLocale();
  const { depth, setDepth } = useDepth();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);

  const band = (d: DepthLevel) =>
    d === 2 ? FUTURE_TOOLS.filter((x) => (x.depth ?? 1) <= 2) : FUTURE_TOOLS.filter((x) => (x.depth ?? 1) === d);

  const ROOMS: { d: DepthLevel; icon: string; title: string; sub: string }[] = [
    { d: 2, icon: '🗺', title: L('التخطيط', 'Planning'), sub: L('اكتب الخطة: حرية، أهداف، ميزانية، سنة كاملة', 'Write the plan: freedom, goals, a budget, a whole year') },
    { d: 3, icon: '🔮', title: L('السيناريوهات', 'Scenarios'), sub: L('جرّب القرار بالأرقام قبل أن تعيشه', 'Play the decision in numbers before living it') },
    { d: 4, icon: '⚙️', title: L('المحركات', 'Engines'), sub: L('أعقد العمليات: تخصيص كل ريـال فائض لأقصى أثر', 'The most complex operations: allocating every surplus riyal for maximum effect') },
  ];

  return (
    <div className="flex flex-col gap-3 mb-6">
      {/* ═══ D1 · the dream, summarized — and the rooms beneath ═══ */}
      {depth === 1 && (
        <>
          {tiles.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {tiles.map((tile) => (
                <div key={tile.label} className={`bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-4 ${tile.big ? 'col-span-2' : ''}`}>
                  <div className="text-[10px] text-[var(--muted)] mb-1">{tile.label}</div>
                  <div className={`font-serif font-bold ${tile.big ? 'text-2xl' : 'text-lg'}`} style={{ color: tile.accent ?? 'var(--ink)' }}>
                    {tile.value}
                  </div>
                  {tile.sub && <div className="text-[11px] text-[var(--muted)] mt-0.5">{tile.sub}</div>}
                </div>
              ))}
            </div>
          )}
          <div className="grid sm:grid-cols-3 gap-3">
            {ROOMS.map((room) => (
              <button
                key={room.d}
                onClick={() => setDepth(room.d)}
                className="group text-start bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-4 hover:border-[var(--green)] transition-colors"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-lg leading-none">{room.icon}</span>
                  <span className="text-sm font-semibold text-[var(--ink)]">{room.title}</span>
                  <span className="ms-auto text-[9px] text-[var(--muted)] border border-[var(--border-faint)] rounded-full px-2 py-0.5" dir="ltr">D{room.d}</span>
                </div>
                <p className="text-[11px] text-[var(--muted)] leading-relaxed mb-2">{room.sub}</p>
                <div className="flex items-center gap-1 mb-2 text-sm">
                  {band(room.d).map((x) => <span key={x.href}>{x.icon}</span>)}
                </div>
                <span className="text-[11px] font-medium text-[var(--green-dark)] group-hover:underline">
                  {L('اغطس إليها ▾', 'Dive to it ▾')}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* ═══ D2–D4 · the room of this depth, from the registry ═══ */}
      {depth >= 2 && (() => {
        const room = ROOMS.find((r) => r.d === depth)!;
        return (
          <>
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-lg font-semibold text-[var(--ink)]">{room.icon} {room.title}</span>
              <span className="text-[11px] text-[var(--muted)]">{room.sub}</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {band(depth).map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="group bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-4 hover:border-[var(--green)] transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xl leading-none">{tool.icon}</span>
                    <span className="text-sm font-semibold text-[var(--ink)] group-hover:text-[var(--green-dark)] transition-colors">{t(tool.titleKey)}</span>
                  </div>
                  <p className="text-[11px] text-[var(--muted)] leading-relaxed">{t(tool.descKey)}</p>
                </Link>
              ))}
            </div>
          </>
        );
      })()}

      {/* ── dive deeper ── */}
      {depth < 4 && (
        <button
          onClick={() => setDepth((depth + 1) as DepthLevel)}
          className="w-full text-xs font-medium text-[var(--green-dark)] bg-[var(--green-bg)] border border-dashed border-[var(--green-border)] rounded-2xl px-5 py-3.5 hover:border-[var(--green)]"
        >
          {ar
            ? `🧊 اغطس إلى «${DEPTH_META[(depth + 1) as DepthLevel].name.ar}» — ${depth === 1 ? 'تُفتح غرفة التخطيط: الحرية والأهداف والميزانية' : depth === 2 ? 'تُفتح السيناريوهات: جرّب القرار قبل أن تعيشه' : 'تُفتح المحركات: الشلال ومسار المضاعفة والرفاهية'} ▾`
            : `🧊 Dive to “${DEPTH_META[(depth + 1) as DepthLevel].name.en}” — ${depth === 1 ? 'the planning room opens: freedom, goals, budget' : depth === 2 ? 'the scenarios open: play the decision before living it' : 'the engines open: the waterfall, the doubling path, luxury'} ▾`}
        </button>
      )}
    </div>
  );
}
