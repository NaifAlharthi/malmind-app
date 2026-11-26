'use client';

// The Showcase player: one scenario at a time, revealed step by step like
// the Brain working live — the question, its tool calls (running, then
// done), the figures it worked out, a plan that waits for approval, the
// actions it then carries out, and the before/after. "Play all four" runs
// every problem end to end, approving plans on its own.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { enterDemo } from '@/lib/demoSupabase';
import { getPersona } from '@/lib/demoWorld';
import { buildScenarios, SHOWCASE_NOTE, type Bi, type ShowStep, type Tone } from '@/lib/showcase';
import PersonaAvatar from '@/app/signup/PersonaAvatar';

const TONE: Record<Tone, string> = { good: 'var(--green)', ok: 'var(--gold)', bad: 'var(--red)', neutral: 'var(--ink)' };

// how long each kind of step holds the stage at 1× (ms)
function dwell(s: ShowStep): number {
  switch (s.kind) {
    case 'user': return 1300;
    case 'say': return Math.min(4200, 1600 + s.text.en.length * 9);
    case 'tool': return 1250;
    case 'metrics': return 2300;
    case 'chart': return 2600;
    case 'act': return 1100;
    case 'outcome': return 2800;
    case 'plan': return 0;
  }
}

function MiniChart({ step, ar }: { step: Extract<ShowStep, { kind: 'chart' }>; ar: boolean }) {
  const W = 520, H = 170, P = { l: 8, r: 8, t: 10, b: 22 };
  const all = step.series.flatMap((s) => s.data);
  const max = Math.max(1, ...all);
  const min = Math.min(0, ...all);
  const n = step.labels.length;
  const x = (i: number) => {
    const t = n <= 1 ? 0.5 : i / (n - 1);
    const px = P.l + t * (W - P.l - P.r);
    return ar ? W - px : px; // time runs right-to-left in Arabic
  };
  const y = (v: number) => P.t + (1 - (v - min) / (max - min)) * (H - P.t - P.b);
  const slot = (W - P.l - P.r) / Math.max(1, n);
  const bx = (i: number) => {
    const px = P.l + (i + 0.5) * slot;
    return ar ? W - px : px;
  };
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={ar ? step.title.ar : step.title.en}>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={P.l} x2={W - P.r} y1={P.t + f * (H - P.t - P.b)} y2={P.t + f * (H - P.t - P.b)} stroke="var(--border-faint)" />
        ))}
        {step.type === 'line'
          ? step.series.map((s, si) => (
              <path
                key={si}
                d={s.data.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}
                fill="none" stroke={s.color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"
                pathLength={1} className="sc-draw" style={{ animationDelay: `${si * 0.25}s` }}
              />
            ))
          : step.series[0].data.map((v, i) => (
              <rect
                key={i} x={bx(i) - slot * 0.3} y={y(v)} width={slot * 0.6} height={Math.max(1, y(min) - y(v))} rx={4}
                fill={step.series[0].color} className="sc-rise" style={{ animationDelay: `${i * 0.08}s`, transformOrigin: `${bx(i)}px ${y(min)}px` }}
              />
            ))}
        {(step.type === 'bar' ? step.labels.map((_, i) => i) : [0, n - 1]).map((i) => (
          <text key={i} x={step.type === 'bar' ? bx(i) : x(i)} y={H - 6} fontSize={10} fill="var(--muted)"
            textAnchor={step.type === 'bar' ? 'middle' : (i === 0) !== ar ? 'start' : 'end'}>
            {ar ? step.labels[i].ar : step.labels[i].en}
          </text>
        ))}
      </svg>
      {step.series.length > 1 && (
        <div className="flex flex-wrap gap-3 mt-1">
          {step.series.map((s) => (
            <span key={s.name.en} className="flex items-center gap-1.5 text-[11px] text-[var(--ink-2)]">
              <span className="w-3 h-1 rounded-full" style={{ background: s.color }} /> {ar ? s.name.ar : s.name.en}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ShowcasePlayer({ initial }: { initial?: string }) {
  const router = useRouter();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const b = (x: Bi) => (ar ? x.ar : x.en);

  const scenarios = useMemo(() => buildScenarios(), []);
  const startAt = Math.max(0, scenarios.findIndex((s) => s.id === initial));
  // one atomic run state, so switching scenario resets everything at once
  const [run, setRun] = useState({ idx: startAt, shown: 1, approved: false });
  const [speed, setSpeed] = useState<1 | 2>(1);
  const [auto, setAuto] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const sc = scenarios[run.idx];
  const persona = getPersona(sc.personaId);
  const steps = sc.steps;
  const planAt = steps.findIndex((s) => s.kind === 'plan');
  const waiting = run.shown - 1 === planAt && !run.approved;
  const done = run.shown >= steps.length;

  const go = (idx: number, autoplay = auto) => {
    setAuto(autoplay);
    setRun({ idx, shown: 1, approved: false });
  };
  const approve = () => setRun((r) => ({ ...r, approved: true, shown: r.shown + 1 }));

  // the clock: reveal the next step after this one's dwell; pause on the plan
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    if (waiting) {
      if (auto) t = setTimeout(() => setRun((r) => ({ ...r, approved: true, shown: r.shown + 1 })), 2600 / speed);
    } else if (!done) {
      t = setTimeout(() => setRun((r) => ({ ...r, shown: r.shown + 1 })), dwell(steps[run.shown - 1]) / speed);
    } else if (auto && run.idx < scenarios.length - 1) {
      t = setTimeout(() => setRun({ idx: run.idx + 1, shown: 1, approved: false }), 4000 / speed);
    }
    return () => clearTimeout(t);
  }, [run, waiting, done, auto, speed, steps, scenarios.length]);

  // keep the newest step in view
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [run.shown, run.idx]);

  const openAs = (href: string) => {
    enterDemo(sc.personaId);
    router.push(href);
  };

  // [label](/path) in the Brain's words → a door into that screen, as this persona
  const rich = (text: string) => {
    const out: React.ReactNode[] = [];
    const re = /\[([^\]]+)\]\((\/[^)\s]*)\)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) out.push(text.slice(last, m.index));
      const href = m[2];
      out.push(
        <button key={m.index} onClick={() => openAs(href)} className="font-semibold text-[var(--green)] underline decoration-dotted underline-offset-4 hover:opacity-80">
          {m[1]}
        </button>,
      );
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  };

  const shownSteps = steps.slice(0, run.shown);

  return (
    <div>
      <style>{`
        @keyframes scIn { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
        @keyframes scDraw { from { stroke-dasharray: 0 1 } to { stroke-dasharray: 1 0 } }
        @keyframes scRise { from { transform: scaleY(0) } to { transform: scaleY(1) } }
        @keyframes scDot { 0%, 100% { opacity: .25 } 50% { opacity: 1 } }
        .sc-in { animation: scIn .45s cubic-bezier(.2,.8,.2,1) both }
        .sc-draw { animation: scDraw 1.2s ease-out both }
        .sc-rise { animation: scRise .7s cubic-bezier(.2,.8,.2,1) both }
        .sc-dot { animation: scDot 1s ease-in-out infinite }
        @media (prefers-reduced-motion: reduce) { .sc-in, .sc-draw, .sc-rise, .sc-dot { animation: none } }
      `}</style>

      <div className="mb-1 text-[10px] tracking-[0.1em] uppercase text-[var(--gold)] font-semibold">{L('عرض حيّ', 'Showcase')}</div>
      <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[var(--ink)] mb-1">
        {L('شاهد العقل يحلّ المشكلات الأربع', 'Watch the Brain solve the four problems')}
      </h1>
      <p className="text-sm text-[var(--ink-2)] mb-5 max-w-2xl">
        {L(
          'لكل مشكلة شخصية حقيقية التفاصيل. العقل يعمل كطبقة ذكاء وكيلة: يقرأ المصادر، ويشغّل أدواته، ويشرح المعنى، ويقترح خطة — وينفّذها بعد موافقتك.',
          'Each problem, one persona with a real-feeling life. The Brain works as an agentic AI layer: it reads the sources, runs its tools, explains what it means, proposes a plan — and carries it out once you approve.'
        )}
      </p>

      {/* the four problems */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {scenarios.map((s, i) => {
          const p = getPersona(s.personaId);
          const on = i === run.idx;
          return (
            <button
              key={s.id}
              onClick={() => go(i, false)}
              className={`text-start rounded-2xl border p-3.5 transition-all ${on ? 'border-[var(--green)] bg-[var(--green-bg)] shadow-sm' : 'border-[var(--border-default)] bg-[var(--surface-card)] hover:border-[var(--border-strong)]'}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-[var(--gold)] uppercase tracking-wider">{L(`المشكلة ${s.problem.n}`, `Problem ${s.problem.n}`)}</span>
                <span className="text-lg">{s.problem.icon}</span>
              </div>
              <div className="font-serif text-sm font-semibold text-[var(--ink)] leading-snug mb-2">{b(s.problem.title)}</div>
              <div className="flex items-center gap-2">
                <PersonaAvatar id={p.id} className="w-6 h-6 shrink-0 rounded-full overflow-hidden" />
                <span className="text-[11px] text-[var(--ink-2)] truncate">{ar ? p.firstNameAr : p.firstName} · {b(s.challenge).split(/[:،,—]/)[0]}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        <button onClick={() => go(0, true)} className="rounded-full bg-[var(--green)] text-white text-sm font-semibold px-4 py-2 hover:opacity-90">
          ▶ {L('شغّل المشكلات الأربع من البداية للنهاية', 'Play all four, end to end')}
        </button>
        <button onClick={() => go(run.idx, auto)} className="rounded-full border border-[var(--border-default)] text-sm px-3.5 py-2 text-[var(--ink-2)] hover:bg-[var(--surface-1)]">
          ↺ {L('أعد التشغيل', 'Replay')}
        </button>
        <button onClick={() => setSpeed((x) => (x === 1 ? 2 : 1))} className="rounded-full border border-[var(--border-default)] text-sm px-3.5 py-2 text-[var(--ink-2)] hover:bg-[var(--surface-1)]">
          {speed}×
        </button>
        <label className="flex items-center gap-2 text-sm text-[var(--ink-2)] ms-1 cursor-pointer">
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="accent-[var(--green)]" />
          {L('موافقة تلقائية وتشغيل متتالٍ', 'Auto-approve & continue')}
        </label>
        <button
          onClick={() => setRun((r) => ({ ...r, approved: true, shown: steps.length }))}
          className="text-xs text-[var(--muted)] hover:text-[var(--ink)] ms-auto"
        >
          {L('تخطَّ إلى النتيجة ⇥', 'Skip to the outcome ⇥')}
        </button>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-5 items-start">
        {/* the case file */}
        <aside className="lg:sticky lg:top-4 rounded-2xl p-5 text-white bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)]">
          <div className="flex items-center gap-3 mb-3">
            <PersonaAvatar id={persona.id} className="w-11 h-11 shrink-0 rounded-full overflow-hidden" />
            <div className="min-w-0">
              <div className="font-semibold">{ar ? persona.firstNameAr : persona.firstName}, {persona.age}</div>
              <div className="text-[11px] text-white/70 truncate">{b(persona.role)}</div>
            </div>
          </div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--gold)] font-semibold mb-1">
            {problemLabel(ar, sc.problem.n)}
          </div>
          <div className="font-serif text-lg font-semibold leading-snug mb-1">{sc.problem.icon} {b(sc.problem.title)}</div>
          <p className="text-xs text-white/75 mb-3">{b(sc.problem.line)}</p>
          <div className="text-[10px] uppercase tracking-wider text-white/50 mb-0.5">{L('التحدّي الأشدّ', 'The pressing challenge')}</div>
          <p className="text-sm text-white/90 mb-4">{b(sc.challenge)}</p>
          <div className="h-1.5 rounded-full bg-white/15 overflow-hidden mb-1.5">
            <div className="h-full bg-[#5DCAA5] transition-all duration-500" style={{ width: `${(run.shown / steps.length) * 100}%` }} />
          </div>
          <div className="text-[11px] text-white/60">
            {done ? L('اكتمل ✓', 'Complete ✓') : waiting ? L('بانتظار موافقتك على الخطة', 'Waiting for your approval') : L('العقل يعمل…', 'The Brain is working…')}
          </div>
          {done && (
            <button onClick={() => openAs(sc.open.web)} className="mt-4 w-full rounded-xl bg-white text-[var(--hero-from)] text-sm font-semibold py-2.5 hover:opacity-90">
              {b(sc.open.label)} →
            </button>
          )}
        </aside>

        {/* the thread */}
        <div className="space-y-3 min-w-0">
          {shownSteps.map((s, i) => {
            const live = i === run.shown - 1 && !done && !waiting;
            const key = `${run.idx}-${i}`;
            switch (s.kind) {
              case 'user':
                return (
                  <div key={key} className="sc-in flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-ee-md bg-[var(--green)] text-white px-4 py-2.5 text-sm">{b(s.text)}</div>
                  </div>
                );
              case 'say':
                return (
                  <div key={key} className="sc-in rounded-2xl rounded-ss-md bg-[var(--surface-card)] border border-[var(--border-default)] px-4 py-3">
                    <div className="text-[11px] font-semibold text-[var(--gold)] mb-1">🧠 {L('العقل', 'The Brain')}</div>
                    <p className="text-sm text-[var(--ink)] leading-relaxed">{rich(b(s.text))}</p>
                  </div>
                );
              case 'tool':
                return (
                  <div key={key} className="sc-in flex items-start gap-3 rounded-xl border border-dashed border-[var(--border-medium)] bg-[var(--surface-1)] px-3.5 py-2.5">
                    <span className={`mt-0.5 w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-[11px] ${live ? 'border-2 border-[var(--gold)] border-t-transparent animate-spin' : 'bg-[var(--green)] text-white'}`}>
                      {live ? '' : '✓'}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs text-[var(--ink-2)]">
                        <code className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-card)] text-[var(--muted)] me-1.5" dir="ltr">{s.tool}()</code>
                        {b(s.label)}
                      </div>
                      {!live && <div className="sc-in text-sm font-medium text-[var(--ink)] mt-0.5">{b(s.result)}</div>}
                    </div>
                  </div>
                );
              case 'metrics':
                return (
                  <div key={key} className="sc-in rounded-2xl bg-[var(--surface-card)] border border-[var(--border-default)] p-4">
                    <div className="text-xs font-semibold text-[var(--ink-2)] mb-2.5">{b(s.title)}</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {s.items.map((m, k) => (
                        <div key={k} className="sc-in rounded-xl bg-[var(--surface-1)] px-3 py-2.5" style={{ animationDelay: `${k * 0.12}s` }}>
                          <div className="text-[10px] text-[var(--muted)] mb-0.5">{b(m.label)}</div>
                          <div className="font-serif text-base font-bold tabular-nums" style={{ color: TONE[m.tone ?? 'neutral'] }}>{b(m.value)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              case 'chart':
                return (
                  <div key={key} className="sc-in rounded-2xl bg-[var(--surface-card)] border border-[var(--border-default)] p-4">
                    <div className="text-xs font-semibold text-[var(--ink-2)] mb-2">📊 {b(s.title)}</div>
                    <MiniChart step={s} ar={ar} />
                  </div>
                );
              case 'plan':
                return (
                  <div key={key} className="sc-in rounded-2xl border-2 border-[var(--gold)] bg-[var(--gold-bg)] p-4">
                    <div className="text-[11px] font-semibold text-[var(--gold)] uppercase tracking-wider mb-1">{L('خطة مقترحة', 'Proposed plan')}</div>
                    <div className="font-serif text-base font-semibold text-[var(--ink)] mb-3">{b(s.title)}</div>
                    <ol className="space-y-2 mb-3">
                      {s.actions.map((a, k) => (
                        <li key={k} className="flex items-start gap-2.5 text-sm">
                          <span className="w-5 h-5 shrink-0 rounded-full bg-[var(--gold)] text-white text-[11px] font-bold flex items-center justify-center">{k + 1}</span>
                          <span className="flex-1 text-[var(--ink)]">{b(a.label)}</span>
                          <span className="text-xs font-semibold text-[var(--green)] whitespace-nowrap">{b(a.impact)}</span>
                        </li>
                      ))}
                    </ol>
                    {waiting ? (
                      <div className="flex items-center gap-3">
                        <button onClick={approve} className="rounded-full bg-[var(--green)] text-white text-sm font-semibold px-5 py-2 hover:opacity-90">
                          ✓ {L('وافق ونفّذ', 'Approve & run')}
                        </button>
                        <span className="text-xs text-[var(--muted)]">
                          {auto ? L('موافقة تلقائية بعد لحظات…', 'Auto-approving in a moment…') : L('لا شيء يُنفَّذ قبل موافقتك.', 'Nothing runs until you approve.')}
                        </span>
                      </div>
                    ) : (
                      <div className="text-xs font-semibold text-[var(--green)]">✓ {L('تمت الموافقة — العقل ينفّذ', 'Approved — the Brain is carrying it out')}</div>
                    )}
                  </div>
                );
              case 'act':
                return (
                  <div key={key} className="sc-in flex items-center gap-3 rounded-xl bg-[var(--green-bg)] border border-[var(--green-border)] px-3.5 py-2.5">
                    <span className={`w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-[11px] ${live ? 'border-2 border-[var(--green)] border-t-transparent animate-spin' : 'bg-[var(--green)] text-white'}`}>
                      {live ? '' : '✓'}
                    </span>
                    <div className="min-w-0 text-sm">
                      <span className="font-semibold text-[var(--ink)]">{b(s.label)}</span>
                      {!live && <span className="text-[var(--ink-2)]"> — {b(s.result)}</span>}
                    </div>
                  </div>
                );
              case 'outcome':
                return (
                  <div key={key} className="sc-in rounded-2xl bg-[var(--surface-card)] border border-[var(--border-default)] p-4">
                    <div className="text-xs font-semibold text-[var(--ink-2)] mb-2.5">⚖️ {b(s.title)}</div>
                    <div className="divide-y divide-[var(--border-faint)]">
                      {s.rows.map((r, k) => (
                        <div key={k} className="sc-in grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 py-2 text-sm" style={{ animationDelay: `${k * 0.15}s` }}>
                          <span className="text-[var(--ink-2)]">{b(r.label)}</span>
                          <span className="text-[var(--red)] line-through decoration-1 opacity-80 tabular-nums">{b(r.before)}</span>
                          <span className="text-[var(--muted)]">{ar ? '←' : '→'}</span>
                          <span className="font-semibold text-[var(--green)] tabular-nums">{b(r.after)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
            }
          })}
          {!done && !waiting && (
            <div className="flex items-center gap-1.5 ps-2 py-1" aria-label={L('العقل يعمل', 'The Brain is working')}>
              {[0, 1, 2].map((d) => (
                <span key={d} className="sc-dot w-1.5 h-1.5 rounded-full bg-[var(--green)]" style={{ animationDelay: `${d * 0.18}s` }} />
              ))}
            </div>
          )}
          {done && auto && run.idx < scenarios.length - 1 && (
            <div className="sc-in text-xs text-[var(--muted)] text-center py-2">
              {L('المشكلة التالية بعد لحظات…', 'Next problem in a moment…')}
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <p className="text-[11px] text-[var(--muted)] mt-6 max-w-3xl">{b(SHOWCASE_NOTE)}</p>
    </div>
  );
}

function problemLabel(ar: boolean, n: number) {
  return ar ? `المشكلة ${n} من 4` : `Problem ${n} of 4`;
}
