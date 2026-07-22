'use client';

import { useEffect, useMemo, useRef, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { isDemoActive } from '@/lib/demoSupabase';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import {
  ladderLabel, ladderShortLabel, getLifestyle, ageForYear, suggestForTier, TIER_COLOR,
  NATIONAL_AVG_INCOME, NATIONAL_AVG_SOURCE, LADDER_TIERS, TIER_MEANING,
  NAT_Y, OFFSET_MIN, OFFSET_MAX, DEFAULT_OFFSET, OFFSET_BELOW, OFFSET_AT, OFFSET_ABOVE,
  Y_MIN, Y_MAX, ladderY, ladderBandBottom, buildAbstractSeries, pathStatus,
  type Tier, type Phase, type PhaseSuggestion, type LadderTier,
} from '@/lib/standardOfLiving';

interface PhaseRow {
  id: string;
  phase_name: string;
  start_year: number;
  end_year: number | null;
  target_tier: Tier;
  theme: string[] | null;
  todo: string[] | null;
  net_worth_goal: string | null;
}

const STATUS_LABEL = { 'not-logged': 'Not logged', ahead: 'Ahead of plan', ontrack: 'On track', behind: 'Behind plan' };
const STATUS_LABEL_AR = { 'not-logged': 'غير مسجَّل', ahead: 'متقدّم على الخطة', ontrack: 'على المسار', behind: 'متأخّر عن الخطة' };
const STATUS_CLASS = {
  'not-logged': 'bg-[var(--surface-1)] text-[var(--muted)] border-[var(--border-default)]',
  ahead: 'bg-[var(--green-bg)] text-[var(--green-dark)] border-[var(--green-border)]',
  ontrack: 'bg-[var(--blue-bg)] text-[var(--blue-dark-text)] border-[var(--blue-border)]',
  behind: 'bg-[var(--red-bg)] text-[var(--red-dark-text)] border-[var(--red-soft)]',
};

const OFFSET_KEY = 'mm-sol-offset';
const CONFIRM_KEY = 'mm-sol-confirmed';

function YearAgeTick(props: {
  x?: number | string; y?: number | string; payload?: { value: number | string };
  ageBase: { year: number; age: number } | null; ar: boolean;
}) {
  const { ageBase, ar } = props;
  const px = Number(props.x) || 0;
  const py = Number(props.y) || 0;
  const year = Number(props.payload?.value ?? 0);
  const age = ageBase ? ageBase.age + (year - ageBase.year) : null;
  return (
    <g transform={`translate(${px},${py})`}>
      <text x={0} y={0} dy={12} textAnchor="middle" fontSize={10} fill="var(--muted)">{year}</text>
      {age != null && age >= 0 && (
        <text x={0} y={0} dy={25} textAnchor="middle" fontSize={9} fill="var(--muted)" opacity={0.6}>
          {ar ? `${age} سنة` : `age ${age}`}
        </text>
      )}
    </g>
  );
}

// Representative icons per level — one more for each rung up. They live inside
// the band and move with it. Financial Freedom includes wings (freedom); Lavish
// includes a plane (travels a lot).
const LEVEL_ICONS: Record<LadderTier, string[]> = {
  basic: ['🏠'],
  decent: ['🚗', '🍽️'],
  lavish: ['🏡', '🚙', '✈️'],
  financial_freedom: ['🪽', '🏝️', '💰', '🌱'],
};

// The placement step. Left→right: a grabbable socioeconomic ladder (the drag
// handle) · the level names in the y-axis gutter · the y-axis line · the plot
// with transparent, full-width colour bands and a fixed national-average line.
// No numbers, no x-axis values.
function LadderPlacement({ offset, setOffset, ar, locale }: {
  offset: number; setOffset: (v: number) => void; ar: boolean; locale: 'ar' | 'en';
}) {
  const L = (a: string, e: string) => (ar ? a : e);
  const H = 384;
  const PLOT_LEFT = 156;
  const BOTTOM_PAD = 30;
  const span = Y_MAX - Y_MIN;
  const pxPerUnit = (H - BOTTOM_PAD) / span;
  const yToTop = (yUnit: number) => (Y_MAX - yUnit) * pxPerUnit;
  const drag = useRef<{ startY: number; startOffset: number } | null>(null);

  const onDown = (e: React.PointerEvent) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); drag.current = { startY: e.clientY, startOffset: offset }; };
  const onMove = (e: React.PointerEvent) => { if (drag.current) setOffset(drag.current.startOffset + (drag.current.startY - e.clientY) / pxPerUnit); };
  const onUp = (e: React.PointerEvent) => { drag.current = null; try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ } };

  const bandTop = yToTop(ladderY('financial_freedom', offset) + 0.5);
  const bandBottom = yToTop(ladderY('basic', offset) - 0.5);
  const bandH = bandBottom - bandTop;
  const natTop = yToTop(NAT_Y);

  return (
    <div className="relative select-none" style={{ height: H }} dir="ltr">
      {/* y-axis + x-axis lines (fixed, no ticks) */}
      <div className="absolute rounded-full" style={{ left: PLOT_LEFT, top: 4, bottom: BOTTOM_PAD, width: 2, background: 'var(--border-medium)' }} />
      <div className="absolute rounded-full" style={{ left: PLOT_LEFT, right: 4, height: 2, bottom: BOTTOM_PAD, background: 'var(--border-medium)' }} />

      {/* transparent, full-width colour bands (move with the ladder) */}
      {LADDER_TIERS.map((t) => (
        <div key={t} className="absolute rounded-md" style={{
          left: PLOT_LEFT + 3, right: 4, top: yToTop(ladderY(t, offset) + 0.5) + 2, height: pxPerUnit - 4,
          background: `linear-gradient(90deg, ${TIER_COLOR[t]}3d, ${TIER_COLOR[t]}0a)`,
        }} />
      ))}

      {/* level icons — one more per rung, living inside the band (move with it) */}
      {LADDER_TIERS.map((t) =>
        LEVEL_ICONS[t].map((ic, i) => (
          <div key={`${t}-${i}`} className="absolute pointer-events-none select-none" style={{ top: yToTop(ladderY(t, offset)) - 15, left: PLOT_LEFT + 24 + i * 40, fontSize: 24, lineHeight: 1 }}>
            {ic}
          </div>
        ))
      )}

      {/* national-average line (fixed) */}
      <div className="absolute border-t-2 border-dashed" style={{ left: PLOT_LEFT, right: 4, top: natTop, borderColor: 'var(--gold)' }} />
      <div className="absolute px-2 py-0.5 rounded-full text-[10px] font-semibold shadow-sm whitespace-nowrap" style={{ top: natTop - 10, right: 8, color: '#4a3a12', background: 'var(--gold)' }}>
        {L('المتوسط الوطني', 'National average')}
      </div>

      {/* level names in the gutter, between the ladder and the y-axis (move with the ladder) */}
      {LADDER_TIERS.map((t) => (
        <div key={t} className="absolute text-right font-serif font-semibold leading-tight" style={{ left: 44, width: PLOT_LEFT - 44 - 12, top: yToTop(ladderY(t, offset)) - 10, color: TIER_COLOR[t], fontSize: 13 }}>
          {ladderLabel(t, locale)}
        </div>
      ))}

      {/* the grabbable ladder — the drag handle, spanning the band */}
      <div
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        className="absolute cursor-grab active:cursor-grabbing touch-none group"
        style={{ left: 4, top: bandTop, height: bandH, width: 30 }}
        title={L('اسحب السُّلّم لأعلى أو لأسفل', 'Drag the ladder up or down')}
      >
        <div className="absolute rounded-full" style={{ left: 4, top: 0, bottom: 0, width: 5, background: '#C9843E' }} />
        <div className="absolute rounded-full" style={{ right: 4, top: 0, bottom: 0, width: 5, background: '#C9843E' }} />
        <div className="absolute flex flex-col justify-around" style={{ left: 6, right: 6, top: 8, bottom: 8 }}>
          {Array.from({ length: 7 }).map((_, i) => <div key={i} className="rounded-full" style={{ height: 4, background: '#C9843E' }} />)}
        </div>
        <div className="absolute -right-4 top-1/2 -translate-y-1/2 text-[var(--muted)] group-hover:text-[var(--green-dark)] text-sm">⇕</div>
      </div>

      {/* caption directly beneath the ladder (follows it as it moves) */}
      <div className="absolute text-[8.5px] text-[var(--muted)] text-center leading-[1.15]"
        style={{ top: Math.min(bandBottom + 6, H - 24), left: 19 - 33, width: 66 }}>
        {L('السُّلّم الاجتماعي', 'Socioeconomic ladder')}
      </div>
    </div>
  );
}

export default function StandardOfLivingPage() {
  return (
    <Suspense fallback={<div className="text-sm text-[var(--muted)]">Loading…</div>}>
      <StandardOfLivingInner />
    </Suspense>
  );
}

function StandardOfLivingInner() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') === 'track' ? 'track' : 'plan';
  const router = useRouter();
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);

  const [mode, setMode] = useState<'plan' | 'track'>(initialMode);
  const [userId, setUserId] = useState<string | null>(null);
  const [profileAge, setProfileAge] = useState<number | null>(null);
  const [phases, setPhases] = useState<PhaseRow[]>([]);
  const [incomeByYear, setIncomeByYear] = useState<Record<number, number>>({});
  const [offset, setOffsetState] = useState<number>(DEFAULT_OFFSET);
  const [confirmed, setConfirmedState] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lsTier, setLsTier] = useState<LadderTier>('basic');
  const [buffers, setBuffers] = useState<Record<string, { theme?: string; todo?: string; growth?: string }>>({});
  const [assisting, setAssisting] = useState<Set<string>>(new Set());
  const [tierHover, setTierHover] = useState<{ tier: Tier; x: number; y: number } | null>(null);

  const currentYear = new Date().getFullYear();
  const ageBase = profileAge != null ? { year: currentYear, age: profileAge } : null;

  const setOffset = (v: number) => {
    const clamped = Math.max(OFFSET_MIN, Math.min(OFFSET_MAX, v));
    setOffsetState(clamped);
    try { localStorage.setItem(userId ? `${OFFSET_KEY}:${userId}` : OFFSET_KEY, String(clamped)); } catch { /* ignore */ }
  };
  const setConfirmed = (v: boolean) => {
    setConfirmedState(v);
    try { localStorage.setItem(userId ? `${CONFIRM_KEY}:${userId}` : CONFIRM_KEY, v ? '1' : '0'); } catch { /* ignore */ }
  };

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    setUserId(user.id);

    try {
      const o = localStorage.getItem(`${OFFSET_KEY}:${user.id}`) ?? localStorage.getItem(OFFSET_KEY);
      if (o != null && Number.isFinite(Number(o))) setOffsetState(Math.max(OFFSET_MIN, Math.min(OFFSET_MAX, Number(o))));
      const c = localStorage.getItem(`${CONFIRM_KEY}:${user.id}`) ?? localStorage.getItem(CONFIRM_KEY);
      if (c === '1') setConfirmedState(true);
    } catch { /* ignore */ }

    const [{ data: phaseData }, { data: profile }, { data: snaps }] = await Promise.all([
      supabase.from('life_phases').select('*').eq('user_id', user.id).order('start_year', { ascending: true }),
      supabase.from('profiles').select('age').eq('id', user.id).single(),
      supabase.from('financial_snapshots').select('year, income').eq('user_id', user.id),
    ]);

    if (phaseData) setPhases(phaseData as PhaseRow[]);
    if (profile && (profile as { age: number | null }).age != null) setProfileAge((profile as { age: number }).age);
    if (snaps) {
      const acc: Record<number, number[]> = {};
      (snaps as { year: number; income: number | null }[]).forEach((s) => {
        if (s.income != null && Number(s.income) > 0) (acc[s.year] ??= []).push(Number(s.income));
      });
      const map: Record<number, number> = {};
      Object.entries(acc).forEach(([y, arr]) => { map[+y] = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length); });
      setIncomeByYear(map);
    }
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { load(); }, [load]);

  async function addPhase(preset?: { name: string; start: number; end: number; tier: Tier }) {
    if (!userId) return;
    const lastEnd = phases.length > 0 ? Math.max(...phases.map((p) => p.end_year ?? p.start_year)) : currentYear - 1;
    const start = preset?.start ?? lastEnd + 1;
    const { data, error } = await supabase
      .from('life_phases')
      .insert({
        user_id: userId,
        phase_name: preset?.name ?? L(`المرحلة ${String.fromCharCode(65 + phases.length)}`, `Phase ${String.fromCharCode(65 + phases.length)}`),
        start_year: start, end_year: preset?.end ?? start + 5, target_tier: preset?.tier ?? 'basic',
        target_monthly_spend: 0, sort_order: phases.length,
      })
      .select().single();
    if (!error && data) setPhases((prev) => [...prev, data as PhaseRow]);
  }

  async function autoClimb() {
    const startBase = phases.length > 0 ? Math.max(...phases.map((p) => p.end_year ?? p.start_year)) + 1 : currentYear;
    const rungs: { tier: Tier; label: [string, string] }[] = [
      { tier: 'basic', label: ['ترسيخ الأساس', 'Secure the base'] },
      { tier: 'decent', label: ['التوسّع والراحة', 'Grow & breathe'] },
      { tier: 'lavish', label: ['حياة رغدة', 'Live large'] },
      { tier: 'financial_freedom', label: ['الحرّية المالية', 'Financial freedom'] },
    ];
    let cursor = startBase;
    for (const r of rungs) { await addPhase({ name: L(r.label[0], r.label[1]), start: cursor, end: cursor + 4, tier: r.tier }); cursor += 5; }
  }

  async function updatePhase(id: string, patch: Partial<PhaseRow>) {
    setPhases((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    await supabase.from('life_phases').update(patch).eq('id', id);
  }
  async function deletePhase(id: string) {
    setPhases((prev) => prev.filter((p) => p.id !== id));
    setBuffers((prev) => { const n = { ...prev }; delete n[id]; return n; });
    await supabase.from('life_phases').delete().eq('id', id);
  }

  async function assist(phase: PhaseRow) {
    setAssisting((prev) => new Set(prev).add(phase.id));
    try {
      let sug: PhaseSuggestion;
      if (isDemoActive()) {
        await new Promise((r) => setTimeout(r, 500));
        sug = suggestForTier(phase.target_tier, ar ? 'ar' : 'en');
      } else {
        const res = await fetch('/api/sol-assist', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phaseName: phase.phase_name, startYear: phase.start_year, endYear: phase.end_year, tier: phase.target_tier, locale: ar ? 'ar' : 'en' }),
        });
        sug = res.ok ? await res.json() : suggestForTier(phase.target_tier, ar ? 'ar' : 'en');
      }
      const merge = (existing: string[] | null, add: string[]) => {
        const out = [...(existing ?? [])];
        add.forEach((a) => { if (a && !out.includes(a)) out.push(a); });
        return out;
      };
      setBuffers((prev) => { const n = { ...prev }; delete n[phase.id]; return n; });
      await updatePhase(phase.id, {
        theme: merge(phase.theme, sug.theme), todo: merge(phase.todo, sug.todo),
        net_worth_goal: phase.net_worth_goal?.trim() ? phase.net_worth_goal : (sug.growth || null),
      });
    } finally {
      setAssisting((prev) => { const n = new Set(prev); n.delete(phase.id); return n; });
    }
  }

  const phasesForSeries: Phase[] = useMemo(
    () => phases.filter((p) => p.end_year != null).map((p) => ({
      id: p.id, phase_name: p.phase_name, start_year: p.start_year, end_year: p.end_year!,
      target_tier: p.target_tier, theme: p.theme ?? [], todo: p.todo ?? [], net_worth_goal: p.net_worth_goal,
    })),
    [phases]
  );

  const series = useMemo(() => buildAbstractSeries(phasesForSeries, offset, incomeByYear), [phasesForSeries, offset, incomeByYear]);

  // Abstract y-axis ticks: one per ladder level, labelled (never a number).
  const tierYs = LADDER_TIERS.map((t) => ({ t, y: ladderY(t, offset) }));
  const yTicks = tierYs.map((o) => o.y);
  const nearestTier = (v: number): LadderTier => tierYs.reduce((best, o) => Math.abs(o.y - v) < Math.abs(best.y - v) ? o : best).t;
  const tickLabel = (v: number) => ladderShortLabel(nearestTier(v), locale);

  function switchMode(m: 'plan' | 'track') {
    setMode(m);
    router.push(`/standard-of-living?mode=${m === 'track' ? 'track' : 'plan'}`);
  }
  const showTierMeaning = (tier: Tier, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setTierHover({ tier, x: Math.min(r.left, window.innerWidth - 300), y: r.bottom + 8 });
  };

  const themeVal = (p: PhaseRow) => buffers[p.id]?.theme ?? (p.theme ?? []).join('\n');
  const todoVal = (p: PhaseRow) => buffers[p.id]?.todo ?? (p.todo ?? []).join('\n');
  const growthVal = (p: PhaseRow) => buffers[p.id]?.growth ?? (p.net_worth_goal ?? '');
  const setBuf = (id: string, field: 'theme' | 'todo' | 'growth', v: string) => setBuffers((prev) => ({ ...prev, [id]: { ...prev[id], [field]: v } }));
  const commitList = (p: PhaseRow, field: 'theme' | 'todo') => {
    const v = (buffers[p.id]?.[field] ?? (p[field] ?? []).join('\n'));
    updatePhase(p.id, { [field]: v.split('\n').map((s) => s.trim()).filter(Boolean) });
  };

  if (loading) return <div className="text-sm text-[var(--muted)]">{L('جارٍ تحميل تصميم حياتك…', 'Loading your life design…')}</div>;

  const loggedYears = series.filter((s) => s.actual != null);
  const latest = loggedYears.length ? loggedYears[loggedYears.length - 1] : null;
  const latestStatus = latest ? pathStatus(latest.actual, latest.planned) : null;

  // The fixed-size colour band (one filled strip per level) + national-average
  // baseline. An ARRAY, not a fragment — Recharts only detects array children.
  const bandRefs = [
    ...LADDER_TIERS.map((t) => (
      <ReferenceArea key={t} y1={ladderBandBottom(t, offset)} y2={ladderBandBottom(t, offset) + 1}
        fill={TIER_COLOR[t]} fillOpacity={0.13} stroke="none" />
    )),
    <ReferenceLine key="natavg" y={NAT_Y} stroke="var(--gold)" strokeDasharray="5 3" strokeWidth={1.5}
      label={{ value: L('المتوسط الوطني', 'National avg'), position: 'insideBottomRight', fontSize: 9, fill: 'var(--gold)' }} />,
  ];
  const yAxis = (
    <YAxis domain={[Y_MIN, Y_MAX]} ticks={yTicks} tickFormatter={(v) => tickLabel(Number(v))}
      tick={{ fontSize: 10, fill: 'var(--ink-2)' }} width={ar ? 88 : 108} axisLine={false} tickLine={false} interval={0} />
  );
  // Full picture: every year shown, with age beneath.
  const xAxis = <XAxis dataKey="year" height={ageBase ? 36 : 20} interval={0} tick={(props) => <YearAgeTick {...props} ageBase={ageBase} ar={ar} />} tickLine={false} />;

  return (
    <div onMouseLeave={() => setTierHover(null)}>
      <div className="mb-1 text-[10px] tracking-[0.1em] uppercase text-[var(--blue)] font-semibold">
        {mode === 'plan' ? L('قرّر', 'Decide') : L('فكّر', 'Think')}
      </div>
      <h1 className="font-serif text-2xl font-semibold text-[var(--ink)] mb-1">{L('مستوى المعيشة', 'Standard of Living')}</h1>
      <p className="text-sm text-[var(--ink-2)] mb-5 max-w-2xl">
        {L(
          'أربعة مستويات للمعيشة — أساسي، لائق، مرفَّه، وحرّية مالية. تعرّف على معناها، ثم ضع سُلّمك فوق المتوسط الوطني أو حوله، وارسم رحلة صعودك عبر السنين.',
          'Four standards of living — Basic, Decent, Lavish, Financial Freedom. Learn what they mean, then place your ladder around the national-average line and map your climb over the years.'
        )}
      </p>

      {/* ── INTRO: what each level means (moved to the top) ── */}
      <div className="mb-6">
        <div className="font-serif text-lg font-medium text-[var(--ink)] mb-1">{L('ماذا يعني كل مستوى فعلاً في الحياة السعودية', 'What each level actually means in Saudi life')}</div>
        <div className="text-sm text-[var(--ink-2)] mb-3">{L('قبل أن تخطّط، افهم المستويات الأربعة — وما يشتريه كلٌّ منها يوماً بيوم.', 'Before you plan, understand the four levels — and what each one buys you, day to day.')}</div>
        <div className="flex gap-2 flex-wrap mb-3.5">
          {LADDER_TIERS.map((t) => (
            <button key={t} onClick={() => setLsTier(t)}
              className="px-4 py-2 rounded-lg text-xs font-medium border"
              style={lsTier === t
                ? { background: TIER_COLOR[t], color: '#fff', borderColor: TIER_COLOR[t] }
                : { background: 'var(--surface-card)', color: 'var(--ink-2)', borderColor: 'var(--border-default)' }}>
              {ladderLabel(t, locale)}
            </button>
          ))}
        </div>
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6">
          <div className="flex items-baseline gap-3 mb-2 flex-wrap">
            <div className="font-serif text-xl font-semibold" style={{ color: TIER_COLOR[lsTier] }}>{ladderLabel(lsTier, locale)}</div>
            <div className="text-xs text-[var(--muted)]">{getLifestyle(lsTier, locale).income}</div>
          </div>
          <div className="text-xs text-[var(--ink-2)] mb-4 italic">{ar ? TIER_MEANING[lsTier].ar : TIER_MEANING[lsTier].en}</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {getLifestyle(lsTier, locale).items.map((it, i) => (
              <div key={i} className="flex gap-2.5 items-start">
                <span className="text-lg shrink-0">{it.icon}</span>
                <div className="text-xs text-[var(--ink-2)] leading-relaxed">
                  <strong className="text-[var(--ink)] font-medium block">{it.label}</strong>
                  {it.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* national average — grounded in real GaStat data */}
      <div className="flex gap-3 items-start bg-[var(--gold-bg)] border border-[var(--gold)] rounded-xl p-4 mb-6">
        <span className="text-lg shrink-0">🇸🇦</span>
        <div className="text-xs text-[var(--gold-text-body)] leading-relaxed">
          <strong className="text-[var(--gold-text-strong)]">{L('المتوسط الوطني:', 'National average:')} {L('14,823 ريال/شهر للأسرة', 'SAR 14,823/mo per household')}</strong>
          <span className="block mt-0.5">{ar ? NATIONAL_AVG_SOURCE.ar : NATIONAL_AVG_SOURCE.en}</span>
        </div>
      </div>

      {/* ── STEP 1: place the ladder band vs the national average ── */}
      {!confirmed ? (
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 mb-6">
          <div className="text-sm font-medium text-[var(--ink)] mb-1">{L('١ · ضع سُلّمك بالنسبة للمتوسط الوطني', '1 · Place your ladder vs the national average')}</div>
          <div className="text-xs text-[var(--muted)] mb-4 max-w-xl">
            {L('امسك السُّلّم واسحبه لأعلى أو لأسفل — تبقى المستويات الأربعة بحجمٍ ثابت. ضع «الأساسي» عند المتوسط الوطني أو فوقه أو تحته. لا أرقام في هذه المرحلة.',
              'Grab the ladder and drag it up or down — the four levels stay a fixed size. Put “Basic” at, above, or below the national average. No numbers at this stage.')}
          </div>

          {/* quick-place buttons */}
          <div className="flex gap-2 flex-wrap mb-4">
            {[
              { v: OFFSET_BELOW, ar: 'أساسيّ دون المتوسط', en: 'My Basic below average' },
              { v: OFFSET_AT, ar: 'أساسيّ عند المتوسط', en: 'My Basic at average' },
              { v: OFFSET_ABOVE, ar: 'أساسيّ فوق المتوسط', en: 'My Basic above average' },
            ].map((b) => {
              const active = Math.abs(offset - b.v) < 0.4;
              return (
                <button key={b.v} onClick={() => setOffset(b.v)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium border ${active ? 'bg-[var(--green-bg)] border-[var(--green)] text-[var(--green-dark)]' : 'bg-[var(--surface-card)] border-[var(--border-medium)] text-[var(--ink-2)]'}`}>
                  {L(b.ar, b.en)}
                </button>
              );
            })}
          </div>

          <LadderPlacement offset={offset} setOffset={setOffset} ar={ar} locale={locale} />

          <div className="text-[11px] text-[var(--muted)] mt-3">
            {offset > 0.4 ? L('مستوى «الأساسي» لديك فوق المتوسط الوطني — طبقة وسطى عليا.', 'Your “Basic” level sits above the national average — an upper-middle footing.')
              : offset < -0.4 ? L('مستوى «الأساسي» لديك دون المتوسط الوطني.', 'Your “Basic” level sits below the national average.')
              : L('مستوى «الأساسي» لديك عند المتوسط الوطني.', 'Your “Basic” level sits right at the national average.')}
          </div>
          <button onClick={() => setConfirmed(true)} className="mt-4 text-sm text-white bg-[var(--green-dark)] rounded-lg px-5 py-2.5 font-medium">
            {L('تأكيد هذه المستويات ←', 'Confirm these levels →')}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 flex-wrap bg-[var(--surface-1)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 mb-5">
          <span className="text-xs text-[var(--ink-2)]">
            {L('مستوياتك مثبَّتة بالنسبة للمتوسط الوطني.', 'Your levels are placed relative to the national average.')}{' '}
            <span className="text-[var(--muted)]">{offset > 0.15 ? L('(فوق المتوسط)', '(above average)') : offset < -0.15 ? L('(دون المتوسط)', '(below average)') : L('(عند المتوسط)', '(at average)')}</span>
          </span>
          <button onClick={() => setConfirmed(false)} className="text-xs text-[var(--green-dark)] font-medium">{L('تعديل المستويات', 'Edit levels')}</button>
        </div>
      )}

      {confirmed && (
        <>
          {/* mode toggle */}
          <div className="inline-flex border border-[var(--border-default)] rounded-lg overflow-hidden mb-5">
            <button onClick={() => switchMode('plan')} className={`px-4 py-2 text-xs font-medium flex items-center gap-2 ${mode === 'plan' ? 'bg-[var(--ink)] text-[var(--surface-0)]' : 'bg-[var(--surface-card)] text-[var(--ink-2)]'}`}>
              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${mode === 'plan' ? 'bg-white/25 text-white' : 'bg-[var(--green-bg)] text-[var(--green-dark)]'}`}>{L('قرّر', 'Decide')}</span>
              {L('صمّم خطتي', 'Design my plan')}
            </button>
            <button onClick={() => switchMode('track')} className={`px-4 py-2 text-xs font-medium flex items-center gap-2 ${mode === 'track' ? 'bg-[var(--ink)] text-[var(--surface-0)]' : 'bg-[var(--surface-card)] text-[var(--ink-2)]'}`}>
              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${mode === 'track' ? 'bg-white/25 text-white' : 'bg-[var(--blue-bg)] text-[var(--blue-dark-text)]'}`}>{L('فكّر', 'Think')}</span>
              {L('تتبّع الفعلي مقابل الخطة', 'Track actual vs plan')}
            </button>
          </div>

          {/* main chart */}
          {series.length > 0 ? (
            <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 mb-6">
              <div className="text-sm font-medium text-[var(--ink)]">{L('رحلة صعودك عبر المستويات', 'Your climb across the levels')}</div>
              <div className="text-xs text-[var(--muted)] mb-1">{L('الخطّ المائل هو مسارك المخطَّط. والخطّ الأزرق هو أداؤك الفعلي.', 'The diagonal line is your planned path. The blue line is your real performance.')}</div>
              <div className="flex gap-4 text-[11px] text-[var(--ink-2)] mb-2 flex-wrap">
                <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-[var(--ink)] inline-block" />{L('المخطَّط', 'Planned')}</span>
                <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-[var(--blue)] inline-block" />{L('الفعلي', 'Actual')}</span>
                <span className="flex items-center gap-1.5"><span className="w-4 h-0 border-t border-dashed border-[var(--gold)] inline-block" />{L('المتوسط الوطني', 'National average')}</span>
              </div>
              {/* every year is shown with its age; the chart scrolls if the span is long */}
              <div className="mt-2 overflow-x-auto" dir="ltr">
              <div style={{ width: Math.max(680, series.length * 44), height: 380 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={series} margin={{ top: 16, right: 12, left: 6, bottom: 0 }}>
                    <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                    {/* horizontal level bands first (the ladder), so period marks read on top */}
                    {bandRefs}
                    {phasesForSeries.map((p, i) => (
                      <ReferenceArea key={p.id} x1={p.start_year} x2={p.end_year} y1={Y_MIN} y2={Y_MAX}
                        fill="var(--ink)" fillOpacity={i % 2 === 0 ? 0.04 : 0}
                        stroke="var(--border-medium)" strokeOpacity={0.4}
                        label={{ value: p.phase_name, position: 'insideTop', fontSize: 10, fill: 'var(--ink-2)' }} />
                    ))}
                    {xAxis}
                    {yAxis}
                    <Tooltip
                      formatter={(value, name) => [value == null ? L('غير مسجَّل', 'Not logged') : ladderLabel(nearestTier(Number(value)), locale), name]}
                      labelFormatter={(y) => (ageBase ? `${y} · ${L(`${ageForYear(profileAge, currentYear, Number(y))} سنة`, `age ${ageForYear(profileAge, currentYear, Number(y))}`)}` : String(y))}
                    />
                    <Line type="linear" dataKey="planned" name={L('المخطَّط', 'Planned')} stroke="var(--ink)" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="actual" name={L('الفعلي', 'Actual')} stroke="var(--blue)" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              </div>
              <div className="flex gap-2 flex-wrap mt-3">
                {phasesForSeries.map((p) => (
                  <button key={p.id} onMouseEnter={(e) => showTierMeaning(p.target_tier, e.currentTarget)} onMouseLeave={() => setTierHover(null)}
                    className="text-[11px] rounded-full px-3 py-1 border cursor-help"
                    style={{ color: TIER_COLOR[p.target_tier], borderColor: `${TIER_COLOR[p.target_tier]}55`, background: `${TIER_COLOR[p.target_tier]}12` }}>
                    {p.phase_name}: {p.start_year}–{p.end_year} · {ladderLabel(p.target_tier as LadderTier, locale)} ⓘ
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-8 text-center mb-6">
              <div className="text-sm text-[var(--muted)] mb-3">{L('لم تُخطّط رحلتك بعد. ابدأ بصعودٍ مقترَح من الأساسي إلى الحرّية المالية.', "You haven't mapped your climb yet. Start with a suggested Basic → Financial Freedom path.")}</div>
              <button onClick={autoClimb} className="text-sm text-white bg-[var(--green-dark)] rounded-lg px-4 py-2 font-medium">{L('✨ اقترِح رحلة صعود', '✨ Auto-split a climb')}</button>
            </div>
          )}

          {mode === 'plan' && (
            <div className="mb-6">
              <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                <div className="text-[11px] tracking-[0.1em] uppercase text-[var(--muted)]">{L('مراحلك — كم تبقى في كل مستوى، وكيف تصعد', 'Your phases — how long at each level, and how to climb')}</div>
                {phasesForSeries.length > 0 && (
                  <button onClick={autoClimb} className="text-[11px] text-[var(--green-dark)] font-medium">{L('✨ أضِف صعوداً مقترحاً', '✨ Add a suggested climb')}</button>
                )}
              </div>
              {phases.length === 0 ? (
                <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-8 text-center text-sm text-[var(--muted)]">{L('لا مراحل بعد — استخدم زرّ «اقترِح رحلة صعود»، أو أضِف مرحلة يدوياً.', 'No phases yet — use “Auto-split a climb”, or add one manually.')}</div>
              ) : (
                <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl overflow-x-auto">
                  <table className="border-collapse text-xs" style={{ minWidth: 120 + phases.length * 230 }}>
                    <thead>
                      <tr className="border-b border-[var(--border-faint)]">
                        <th className="p-3 w-28 align-top" />
                        {phases.map((p) => (
                          <th key={p.id} className="p-3 text-start align-top border-s border-[var(--border-faint)]" style={{ minWidth: 220 }}>
                            <div className="flex items-center gap-2 mb-2">
                              <input value={p.phase_name} onChange={(e) => updatePhase(p.id, { phase_name: e.target.value })}
                                className="font-serif text-sm font-semibold text-[var(--ink)] border-b border-dashed border-[var(--border-medium)] focus:border-[var(--green)] outline-none bg-transparent flex-1 min-w-0" />
                              <button onClick={() => deletePhase(p.id)} className="text-[var(--muted)] hover:text-[var(--red-dark-text)] text-xs shrink-0" aria-label={L('حذف', 'Delete')}>✕</button>
                            </div>
                            <div className="flex items-center gap-1.5 mb-2">
                              <input type="number" value={p.start_year} onChange={(e) => updatePhase(p.id, { start_year: parseInt(e.target.value) || p.start_year })} className="w-16 bg-[var(--surface-0)] border border-[var(--border-default)] rounded-md px-2 py-1 text-[11px]" />
                              <span className="text-[var(--muted)]">–</span>
                              <input type="number" value={p.end_year ?? ''} onChange={(e) => updatePhase(p.id, { end_year: parseInt(e.target.value) || null })} className="w-16 bg-[var(--surface-0)] border border-[var(--border-default)] rounded-md px-2 py-1 text-[11px]" />
                              {ageBase && p.end_year && (
                                <span className="text-[10px] text-[var(--muted)]">{L(`(${ageForYear(profileAge, currentYear, p.start_year)}–${ageForYear(profileAge, currentYear, p.end_year)} سنة)`, `(age ${ageForYear(profileAge, currentYear, p.start_year)}–${ageForYear(profileAge, currentYear, p.end_year)})`)}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <select value={p.target_tier} onChange={(e) => updatePhase(p.id, { target_tier: e.target.value as Tier })}
                                className="bg-[var(--surface-0)] border rounded-md px-2 py-1 text-[11px] font-medium outline-none"
                                style={{ color: TIER_COLOR[p.target_tier], borderColor: `${TIER_COLOR[p.target_tier]}66` }}>
                                {LADDER_TIERS.map((t) => <option key={t} value={t} style={{ color: 'var(--ink)' }}>{ladderLabel(t, locale)}</option>)}
                              </select>
                              <button onMouseEnter={(e) => showTierMeaning(p.target_tier, e.currentTarget)} onMouseLeave={() => setTierHover(null)}
                                className="w-5 h-5 rounded-full border border-[var(--border-medium)] text-[10px] text-[var(--muted)] hover:border-[var(--green)] hover:text-[var(--green-dark)] cursor-help shrink-0" aria-label={L('ماذا يعني هذا المستوى', 'What this tier means')}>ⓘ</button>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="align-top">
                      <tr className="border-b border-[var(--border-faint)]">
                        <td className="p-3 text-[10px] tracking-[0.06em] uppercase text-[var(--gold)] font-semibold align-top">{L('أحداث وتحدّيات واحتياجات', 'Events, challenges & needs')}</td>
                        {phases.map((p) => (
                          <td key={p.id} className="p-3 border-s border-[var(--border-faint)]">
                            <textarea rows={3} value={themeVal(p)} onChange={(e) => setBuf(p.id, 'theme', e.target.value)} onBlur={() => commitList(p, 'theme')} placeholder={L('واحد في كل سطر', 'One per line')}
                              className="w-full bg-[var(--surface-0)] border border-[var(--border-default)] rounded-md px-2 py-1.5 text-[11px] leading-relaxed outline-none focus:border-[var(--green)] resize-none" />
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-[var(--border-faint)]">
                        <td className="p-3 text-[10px] tracking-[0.06em] uppercase text-[var(--gold)] font-semibold align-top">{L('للصعود إلى الأعلى', 'To climb a rung')}</td>
                        {phases.map((p) => (
                          <td key={p.id} className="p-3 border-s border-[var(--border-faint)]">
                            <textarea rows={3} value={todoVal(p)} onChange={(e) => setBuf(p.id, 'todo', e.target.value)} onBlur={() => commitList(p, 'todo')} placeholder={L('واحد في كل سطر', 'One per line')}
                              className="w-full bg-[var(--surface-0)] border border-[var(--border-default)] rounded-md px-2 py-1.5 text-[11px] leading-relaxed outline-none focus:border-[var(--green)] resize-none" />
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-[var(--border-faint)]">
                        <td className="p-3 text-[10px] tracking-[0.06em] uppercase text-[var(--gold)] font-semibold align-top">{L('محطّة القياس', 'Milestone')}</td>
                        {phases.map((p) => (
                          <td key={p.id} className="p-3 border-s border-[var(--border-faint)]">
                            <input value={growthVal(p)} onChange={(e) => setBuf(p.id, 'growth', e.target.value)}
                              onBlur={() => updatePhase(p.id, { net_worth_goal: (buffers[p.id]?.growth ?? p.net_worth_goal ?? '') || null })}
                              placeholder={L('مثال: أول 500 ألف ريال', 'e.g. First SAR 500K')}
                              className="w-full bg-transparent text-[12px] font-serif font-semibold text-[var(--green-dark)] border-b border-dashed border-[var(--border-medium)] focus:border-[var(--green)] outline-none" />
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="p-3" />
                        {phases.map((p) => (
                          <td key={p.id} className="p-3 border-s border-[var(--border-faint)]">
                            <button onClick={() => assist(p)} disabled={assisting.has(p.id)} className="w-full text-[11px] font-medium text-[var(--blue-dark-text)] bg-[var(--blue-bg)] border border-[var(--blue-border)] rounded-lg px-2 py-1.5 disabled:opacity-60">
                              {assisting.has(p.id) ? L('يفكّر…', 'Thinking…') : L('✨ ساعِدني', '✨ Assist me')}
                            </button>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
              <button onClick={() => addPhase()} className="mt-3.5 text-sm text-[var(--green-dark)] bg-[var(--green-bg)] border border-[var(--green-border)] rounded-lg px-4 py-2 font-medium">{L('+ أضِف مرحلة', '+ Add a phase')}</button>
            </div>
          )}

          {mode === 'track' && (
            <div className="mb-6">
              <div className="font-serif text-lg font-medium text-[var(--ink)] mb-1">{L('تقدّمك الفعلي مقابل خطّتك', 'Your real progress vs your plan')}</div>
              <div className="text-sm text-[var(--ink-2)] mb-3">{L('نحسب الفعلي تلقائياً من دخلك المسجَّل، ونقارنه بمسارك المخطَّط — لتعرف أين تقف، وكيف تصحّح المسار.', 'We compute your actual automatically from your logged income and compare it to your planned path — so you know where you stand, and how to course-correct.')}</div>
              {series.length === 0 ? (
                <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-8 text-center text-sm text-[var(--muted)]">{L('صمّم مراحلك أولاً في «صمّم خطتي».', 'Design your phases first, in Design my plan.')}</div>
              ) : (
                <>
                  {latest && latestStatus && (
                    <div className={`rounded-xl border p-4 mb-3 text-xs leading-relaxed ${STATUS_CLASS[latestStatus]}`}>
                      <strong>{latest.year} · {ar ? STATUS_LABEL_AR[latestStatus] : STATUS_LABEL[latestStatus]} — {L(`الفعلي عند «${ladderLabel(nearestTier(latest.actual!), locale)}» مقابل خطّة «${ladderLabel(nearestTier(latest.planned), locale)}»`, `actual at “${ladderLabel(nearestTier(latest.actual!), locale)}” vs planned “${ladderLabel(nearestTier(latest.planned), locale)}”`)}</strong>
                      {latestStatus === 'behind' && (
                        <span className="block mt-1">{L('أنت دون مسارك المخطَّط. صحّح المسار: ', "You're below your planned path. Course-correct: ")}
                          <Link href="/budgeting" className="underline font-medium">{L('الميزنة', 'Budgeting')}</Link>{' · '}
                          <Link href="/freedom" className="underline font-medium">{L('الحرّية المالية', 'Freedom')}</Link>{' · '}
                          <Link href="/advisor" className="underline font-medium">{L('اسأل المستشار', 'Ask the advisor')}</Link>
                        </span>
                      )}
                      {latestStatus === 'ahead' && <span className="block mt-1">{L('أنت متقدّم على خطّتك — فكّر برفع مستواك المستهدَف التالي.', "You're ahead of plan — consider raising your next target level.")}</span>}
                    </div>
                  )}
                  <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl overflow-hidden">
                    {series.map((s) => {
                      const status = pathStatus(s.actual, s.planned);
                      const age = ageForYear(profileAge, currentYear, s.year);
                      return (
                        <div key={s.year} className="flex items-center justify-between px-5 py-3 border-t border-[var(--border-faint)] first:border-t-0">
                          <div className="text-sm font-medium text-[var(--ink)]">{s.year}{age != null && age >= 0 && <span className="text-[11px] text-[var(--muted)] font-normal ms-1.5">· {L(`${age} سنة`, `age ${age}`)}</span>}</div>
                          <div className="flex items-center gap-3.5">
                            <div className="text-xs text-[var(--muted)] text-end">
                              <div>{L('خطّة:', 'Plan:')} <strong className="text-[var(--ink-2)]">{ladderLabel(nearestTier(s.planned), locale)}</strong></div>
                              <div>{L('فعلي:', 'Actual:')} <strong className="text-[var(--ink-2)]">{s.actual != null ? ladderLabel(nearestTier(s.actual), locale) : '—'}</strong></div>
                            </div>
                            <span className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border whitespace-nowrap ${STATUS_CLASS[status]}`}>{ar ? STATUS_LABEL_AR[status] : STATUS_LABEL[status]}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {tierHover && (
        <div className="fixed z-[80] w-[280px] bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl shadow-2xl p-4 pointer-events-none" style={{ left: tierHover.x, top: tierHover.y }}>
          <div className="flex items-baseline gap-2 mb-2.5">
            <span className="font-serif text-sm font-semibold" style={{ color: TIER_COLOR[tierHover.tier] }}>{ladderLabel(tierHover.tier as LadderTier, locale)}</span>
            <span className="text-[10px] text-[var(--muted)]">{getLifestyle(tierHover.tier, locale).income}</span>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {getLifestyle(tierHover.tier, locale).items.map((it, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-sm shrink-0 leading-none mt-0.5">{it.icon}</span>
                <div className="text-[11px] leading-snug min-w-0"><strong className="text-[var(--ink)] font-medium">{it.label}: </strong><span className="text-[var(--muted)]">{it.desc}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
