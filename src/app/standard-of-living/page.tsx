'use client';

import { useEffect, useMemo, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { isDemoActive } from '@/lib/demoSupabase';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import {
  TIERS, tierLabel, getLifestyle, ageForYear, suggestForTier, TIER_COLOR,
  NATIONAL_AVG_INCOME, NATIONAL_AVG_SOURCE, DEFAULT_LADDER, LADDER_TIERS,
  ladderValue, TIER_MEANING, buildIncomeSeries, incomeStatus, ladderTierForIncome,
  type Tier, type Phase, type PhaseSuggestion, type Ladder, type LadderTier,
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

const LADDER_KEY = 'mm-sol-ladder';
const fmtSar = (n: number) => Math.round(n).toLocaleString();

// X-axis tick: calendar year + the age the user will be that year.
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
  const [ladder, setLadderState] = useState<Ladder>(DEFAULT_LADDER);
  const [loading, setLoading] = useState(true);
  const [lsTier, setLsTier] = useState<Tier>('decent');
  const [buffers, setBuffers] = useState<Record<string, { theme?: string; todo?: string; growth?: string }>>({});
  const [assisting, setAssisting] = useState<Set<string>>(new Set());
  const [tierHover, setTierHover] = useState<{ tier: Tier; x: number; y: number } | null>(null);

  const currentYear = new Date().getFullYear();
  const ageBase = profileAge != null ? { year: currentYear, age: profileAge } : null;

  const persistLadder = (next: Ladder) => {
    setLadderState(next);
    try { localStorage.setItem(userId ? `${LADDER_KEY}:${userId}` : LADDER_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };
  // Nudge a rung, keeping basic ≤ decent ≤ financial freedom.
  const setRung = (tier: LadderTier, raw: number) => {
    const v = Math.max(2000, Math.min(200000, Math.round(raw / 500) * 500));
    const n: Ladder = { ...ladder, [tier]: v };
    if (n.decent < n.basic) n.decent = n.basic;
    if (n.lavish < n.decent) n.lavish = n.decent;
    if (tier === 'lavish' && n.decent > v) n.decent = v;
    if (tier === 'decent' && n.basic > v) n.basic = v;
    persistLadder(n);
  };

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    setUserId(user.id);

    try {
      const saved = localStorage.getItem(`${LADDER_KEY}:${user.id}`) || localStorage.getItem(LADDER_KEY);
      if (saved) {
        const p = JSON.parse(saved);
        if (p && typeof p.basic === 'number') setLadderState({ basic: p.basic, decent: p.decent, lavish: p.lavish });
      }
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
        start_year: start,
        end_year: preset?.end ?? start + 5,
        target_tier: preset?.tier ?? 'basic',
        target_monthly_spend: 0,
        sort_order: phases.length,
      })
      .select()
      .single();
    if (!error && data) setPhases((prev) => [...prev, data as PhaseRow]);
    return data as PhaseRow | undefined;
  }

  // Auto-split: lay out a Basic → Decent → Financial Freedom climb from now.
  async function autoClimb() {
    const startBase = phases.length > 0 ? Math.max(...phases.map((p) => p.end_year ?? p.start_year)) + 1 : currentYear;
    const rungs: { tier: Tier; label: [string, string] }[] = [
      { tier: 'basic', label: ['ترسيخ الأساس', 'Secure the base'] },
      { tier: 'decent', label: ['التوسّع والراحة', 'Grow & breathe'] },
      { tier: 'lavish', label: ['الحرّية المالية', 'Financial freedom'] },
    ];
    let cursor = startBase;
    for (const r of rungs) {
      await addPhase({ name: L(r.label[0], r.label[1]), start: cursor, end: cursor + 4, tier: r.tier });
      cursor += 5;
    }
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
      const patch: Partial<PhaseRow> = {
        theme: merge(phase.theme, sug.theme),
        todo: merge(phase.todo, sug.todo),
        net_worth_goal: phase.net_worth_goal?.trim() ? phase.net_worth_goal : (sug.growth || null),
      };
      setBuffers((prev) => { const n = { ...prev }; delete n[phase.id]; return n; });
      await updatePhase(phase.id, patch);
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

  const series = useMemo(
    () => buildIncomeSeries(phasesForSeries, ladder, incomeByYear, NATIONAL_AVG_INCOME),
    [phasesForSeries, ladder, incomeByYear]
  );
  const maxActual = Object.values(incomeByYear).reduce((m, v) => Math.max(m, v), 0);
  const yMax = Math.max(ladder.lavish, maxActual, NATIONAL_AVG_INCOME) * 1.15;

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
  const setBuf = (id: string, field: 'theme' | 'todo' | 'growth', v: string) =>
    setBuffers((prev) => ({ ...prev, [id]: { ...prev[id], [field]: v } }));
  const commitList = (p: PhaseRow, field: 'theme' | 'todo') => {
    const v = (buffers[p.id]?.[field] ?? (p[field] ?? []).join('\n'));
    updatePhase(p.id, { [field]: v.split('\n').map((s) => s.trim()).filter(Boolean) });
  };

  if (loading) {
    return <div className="text-sm text-[var(--muted)]">{L('جارٍ تحميل تصميم حياتك…', 'Loading your life design…')}</div>;
  }

  // Latest year we have actual income for, for the course-correction summary.
  const loggedYears = series.filter((s) => s.actual != null);
  const latest = loggedYears.length ? loggedYears[loggedYears.length - 1] : null;
  const latestStatus = latest ? incomeStatus(latest.actual, latest.planned) : null;

  return (
    <div onMouseLeave={() => setTierHover(null)}>
      <div className="mb-1 text-[10px] tracking-[0.1em] uppercase text-[var(--blue)] font-semibold">
        {mode === 'plan' ? L('قرّر', 'Decide') : L('فكّر', 'Think')}
      </div>
      <h1 className="font-serif text-2xl font-semibold text-[var(--ink)] mb-1">{L('مستوى المعيشة', 'Standard of Living')}</h1>
      <p className="text-sm text-[var(--ink-2)] mb-5 max-w-2xl">
        {L(
          'ابدأ بوضع سُلّمك الشخصي — أساسي، لائق، وحرّية مالية — فوق خطّ المتوسط الوطني أو حوله. ثم ارسم رحلة صعودك عبر السنين، وتابِع تقدّمك الفعلي مقابل خطّتك.',
          'Start by placing your personal ladder — Basic, Decent, Financial Freedom — around the national-average line. Then map your climb over the years, and track your real progress against the plan.'
        )}
      </p>

      {/* national average — grounded in real GaStat data */}
      <div className="flex gap-3 items-start bg-[var(--gold-bg)] border border-[var(--gold)] rounded-xl p-4 mb-5">
        <span className="text-lg shrink-0">🇸🇦</span>
        <div className="text-xs text-[var(--gold-text-body)] leading-relaxed">
          <strong className="text-[var(--gold-text-strong)]">{L('المتوسط الوطني:', 'National average:')} {L(`${fmtSar(NATIONAL_AVG_INCOME)} ريال/شهر للأسرة`, `SAR ${fmtSar(NATIONAL_AVG_INCOME)}/mo per household`)}</strong>
          <span className="block mt-0.5">{ar ? NATIONAL_AVG_SOURCE.ar : NATIONAL_AVG_SOURCE.en}</span>
        </div>
      </div>

      {/* ── ladder setup — position your bundle vs the national average ── */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 mb-6">
        <div className="text-sm font-medium text-[var(--ink)] mb-1">{L('سُلّمك: أين تضع مستوياتك؟', 'Your ladder: where do your levels sit?')}</div>
        <div className="text-xs text-[var(--muted)] mb-4">
          {L('حرّك كل مستوى فوق المتوسط الوطني أو حوله. قد يبدأ «الأساسي» عند المتوسط، أو فوقه إن أردت أرضيّةً أعلى.',
            'Slide each level above or around the national average. Your “Basic” floor can sit at the average — or above it, if you want a higher floor.')}
        </div>
        <div className="space-y-4">
          {LADDER_TIERS.map((t) => (
            <div key={t}>
              <div className="flex items-baseline justify-between mb-1 gap-2">
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="text-sm font-semibold" style={{ color: TIER_COLOR[t] }}>{tierLabel(t, locale)}</span>
                  <span className="text-[11px] text-[var(--muted)] truncate">{ar ? TIER_MEANING[t].ar : TIER_MEANING[t].en}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="number" value={ladder[t]} step={500}
                    onChange={(e) => setRung(t, Number(e.target.value) || ladder[t])}
                    className="w-24 bg-[var(--surface-0)] border border-[var(--border-default)] rounded-md px-2 py-1 text-xs text-end"
                  />
                  <span className="text-[11px] text-[var(--muted)]">{L('ريال/شهر', 'SAR/mo')}</span>
                </div>
              </div>
              {/* force LTR so the low→high money scale (and the marker) read
                  consistently regardless of UI direction */}
              <div className="relative" dir="ltr">
                <input
                  type="range" min={2000} max={120000} step={500} value={Math.min(ladder[t], 120000)}
                  onChange={(e) => setRung(t, Number(e.target.value))}
                  className="w-full accent-[var(--green-dark)]"
                  style={{ accentColor: TIER_COLOR[t] }}
                />
                {/* national-average marker on the slider track */}
                <div className="absolute top-1/2 -translate-y-1/2 h-3 w-0.5 bg-[var(--gold)] pointer-events-none"
                  style={{ left: `${(NATIONAL_AVG_INCOME - 2000) / (120000 - 2000) * 100}%` }} title={L('المتوسط الوطني', 'National average')} />
              </div>
              <div className="flex justify-between text-[10px] text-[var(--muted)] mt-0.5">
                <span>{ladder[t] > NATIONAL_AVG_INCOME ? L('فوق المتوسط الوطني', 'above national average') : ladder[t] < NATIONAL_AVG_INCOME ? L('دون المتوسط الوطني', 'below national average') : L('عند المتوسط الوطني', 'at national average')}</span>
                <span>{L('الخطّ الذهبي = المتوسط الوطني', 'gold mark = national average')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

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

      {/* chart */}
      {series.length > 0 ? (
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 mb-6">
          <div className="text-sm font-medium text-[var(--ink)]">{L('رحلة صعودك، بالريال شهرياً', 'Your climb, in SAR per month')}</div>
          <div className="text-xs text-[var(--muted)] mb-1">{L('الخطّ الأسود المائل هو مسارك المخطَّط. والخطّ الأزرق هو دخلك الفعلي المسجَّل.', 'The diagonal black line is your planned path. The blue line is your real logged income.')}</div>
          <div className="flex gap-4 text-[11px] text-[var(--ink-2)] mb-2 flex-wrap">
            <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-[var(--ink)] inline-block" />{L('المخطَّط', 'Planned')}</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-[var(--blue)] inline-block" />{L('الفعلي', 'Actual')}</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-0 border-t border-dashed border-[var(--gold)] inline-block" />{L('المتوسط الوطني', 'National average')}</span>
          </div>
          <div className="h-80 mt-2" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={series} margin={{ top: 16, right: 12, left: 6, bottom: 0 }}>
                <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                {phasesForSeries.map((p, i) => (
                  <ReferenceArea key={p.id} x1={p.start_year} x2={p.end_year} y1={0} y2={yMax}
                    fill={TIER_COLOR[p.target_tier]} fillOpacity={0.07 + (i % 2) * 0.05}
                    stroke={TIER_COLOR[p.target_tier]} strokeOpacity={0.2}
                    label={{ value: p.phase_name, position: 'insideTop', fontSize: 10, fill: 'var(--ink-2)' }} />
                ))}
                {/* the ladder rungs as reference levels */}
                {LADDER_TIERS.map((t) => (
                  <ReferenceLine key={t} y={ladder[t]} stroke={TIER_COLOR[t]} strokeOpacity={0.4} strokeDasharray="2 4"
                    label={{ value: tierLabel(t, locale), position: 'insideRight', fontSize: 9, fill: TIER_COLOR[t] }} />
                ))}
                {/* national average — the real-world anchor */}
                <ReferenceLine y={NATIONAL_AVG_INCOME} stroke="var(--gold)" strokeDasharray="5 3" strokeWidth={1.5}
                  label={{ value: L('المتوسط الوطني', 'National avg'), position: 'insideBottomRight', fontSize: 9, fill: 'var(--gold)' }} />
                <XAxis dataKey="year" height={ageBase ? 36 : 20} tick={(props) => <YearAgeTick {...props} ageBase={ageBase} ar={ar} />} tickLine={false} />
                <YAxis domain={[0, yMax]} width={46} tick={{ fontSize: 9, fill: 'var(--muted)' }}
                  tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                <Tooltip
                  formatter={(value, name) => [value == null ? L('غير مسجَّل', 'Not logged') : `${fmtSar(Number(value))} ${L('ريال', 'SAR')}`, name]}
                  labelFormatter={(y) => (ageBase ? `${y} · ${L(`${ageForYear(profileAge, currentYear, Number(y))} سنة`, `age ${ageForYear(profileAge, currentYear, Number(y))}`)}` : String(y))}
                />
                <Line type="linear" dataKey="planned" name={L('المخطَّط', 'Planned')} stroke="var(--ink)" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="actual" name={L('الفعلي', 'Actual')} stroke="var(--blue)" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          {/* phase chips — hover for what that standard of living means */}
          <div className="flex gap-2 flex-wrap mt-3">
            {phasesForSeries.map((p) => (
              <button key={p.id}
                onMouseEnter={(e) => showTierMeaning(p.target_tier, e.currentTarget)} onMouseLeave={() => setTierHover(null)}
                className="text-[11px] rounded-full px-3 py-1 border cursor-help"
                style={{ color: TIER_COLOR[p.target_tier], borderColor: `${TIER_COLOR[p.target_tier]}55`, background: `${TIER_COLOR[p.target_tier]}12` }}>
                {p.phase_name}: {p.start_year}–{p.end_year} · {tierLabel(p.target_tier, locale)} ⓘ
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-8 text-center mb-6">
          <div className="text-sm text-[var(--muted)] mb-3">{L('لم تُخطّط رحلتك بعد. ابدأ بصعودٍ مقترَح من الأساسي إلى الحرّية المالية.', "You haven't mapped your climb yet. Start with a suggested Basic → Financial Freedom path.")}</div>
          <button onClick={autoClimb} className="text-sm text-white bg-[var(--green-dark)] rounded-lg px-4 py-2 font-medium">
            {L('✨ اقترِح رحلة صعود', '✨ Auto-split a climb')}
          </button>
        </div>
      )}

      {mode === 'plan' && (
        <div className="mb-6">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
            <div className="text-[11px] tracking-[0.1em] uppercase text-[var(--muted)]">
              {L('مراحلك — كم تبقى في كل مستوى، وكيف تصعد', 'Your phases — how long at each level, and how to climb')}
            </div>
            {phasesForSeries.length > 0 && (
              <button onClick={autoClimb} className="text-[11px] text-[var(--green-dark)] font-medium">{L('✨ أضِف صعوداً مقترحاً', '✨ Add a suggested climb')}</button>
            )}
          </div>

          {phases.length === 0 ? (
            <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-8 text-center text-sm text-[var(--muted)]">
              {L('لا مراحل بعد — استخدم زرّ «اقترِح رحلة صعود» أعلاه، أو أضِف مرحلة يدوياً.', 'No phases yet — use “Auto-split a climb” above, or add one manually.')}
            </div>
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
                          <input type="number" value={p.start_year} onChange={(e) => updatePhase(p.id, { start_year: parseInt(e.target.value) || p.start_year })}
                            className="w-16 bg-[var(--surface-0)] border border-[var(--border-default)] rounded-md px-2 py-1 text-[11px]" />
                          <span className="text-[var(--muted)]">–</span>
                          <input type="number" value={p.end_year ?? ''} onChange={(e) => updatePhase(p.id, { end_year: parseInt(e.target.value) || null })}
                            className="w-16 bg-[var(--surface-0)] border border-[var(--border-default)] rounded-md px-2 py-1 text-[11px]" />
                          {ageBase && p.end_year && (
                            <span className="text-[10px] text-[var(--muted)]">
                              {L(`(${ageForYear(profileAge, currentYear, p.start_year)}–${ageForYear(profileAge, currentYear, p.end_year)} سنة)`,
                                `(age ${ageForYear(profileAge, currentYear, p.start_year)}–${ageForYear(profileAge, currentYear, p.end_year)})`)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <select value={p.target_tier} onChange={(e) => updatePhase(p.id, { target_tier: e.target.value as Tier })}
                            className="bg-[var(--surface-0)] border rounded-md px-2 py-1 text-[11px] font-medium outline-none"
                            style={{ color: TIER_COLOR[p.target_tier], borderColor: `${TIER_COLOR[p.target_tier]}66` }}>
                            {LADDER_TIERS.map((t) => <option key={t} value={t} style={{ color: 'var(--ink)' }}>{tierLabel(t, locale)}</option>)}
                          </select>
                          <button onMouseEnter={(e) => showTierMeaning(p.target_tier, e.currentTarget)} onMouseLeave={() => setTierHover(null)}
                            className="w-5 h-5 rounded-full border border-[var(--border-medium)] text-[10px] text-[var(--muted)] hover:border-[var(--green)] hover:text-[var(--green-dark)] cursor-help shrink-0"
                            aria-label={L('ماذا يعني هذا المستوى', 'What this tier means')}>ⓘ</button>
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
                        <textarea rows={3} value={themeVal(p)} onChange={(e) => setBuf(p.id, 'theme', e.target.value)} onBlur={() => commitList(p, 'theme')}
                          placeholder={L('واحد في كل سطر', 'One per line')}
                          className="w-full bg-[var(--surface-0)] border border-[var(--border-default)] rounded-md px-2 py-1.5 text-[11px] leading-relaxed outline-none focus:border-[var(--green)] resize-none" />
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-[var(--border-faint)]">
                    <td className="p-3 text-[10px] tracking-[0.06em] uppercase text-[var(--gold)] font-semibold align-top">{L('للصعود إلى الأعلى', 'To climb a rung')}</td>
                    {phases.map((p) => (
                      <td key={p.id} className="p-3 border-s border-[var(--border-faint)]">
                        <textarea rows={3} value={todoVal(p)} onChange={(e) => setBuf(p.id, 'todo', e.target.value)} onBlur={() => commitList(p, 'todo')}
                          placeholder={L('واحد في كل سطر', 'One per line')}
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
                        <button onClick={() => assist(p)} disabled={assisting.has(p.id)}
                          className="w-full text-[11px] font-medium text-[var(--blue-dark-text)] bg-[var(--blue-bg)] border border-[var(--blue-border)] rounded-lg px-2 py-1.5 disabled:opacity-60">
                          {assisting.has(p.id) ? L('يفكّر…', 'Thinking…') : L('✨ ساعِدني', '✨ Assist me')}
                        </button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <button onClick={() => addPhase()} className="mt-3.5 text-sm text-[var(--green-dark)] bg-[var(--green-bg)] border border-[var(--green-border)] rounded-lg px-4 py-2 font-medium">
            {L('+ أضِف مرحلة', '+ Add a phase')}
          </button>
        </div>
      )}

      {mode === 'track' && (
        <div className="mb-6">
          <div className="font-serif text-lg font-medium text-[var(--ink)] mb-1">{L('تقدّمك الفعلي مقابل خطّتك', 'Your real progress vs your plan')}</div>
          <div className="text-sm text-[var(--ink-2)] mb-3">
            {L('نحسب الفعلي تلقائياً من دخلك المسجَّل، ونقارنه بمسارك المخطَّط — لتعرف أين تقف، وكيف تصحّح المسار.',
              'We compute your actual automatically from your logged income and compare it to your planned path — so you know where you stand, and how to course-correct.')}
          </div>

          {series.length === 0 ? (
            <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-8 text-center text-sm text-[var(--muted)]">
              {L('صمّم مراحلك أولاً في «صمّم خطتي».', 'Design your phases first, in Design my plan.')}
            </div>
          ) : (
            <>
              {latest && latestStatus && (
                <div className={`rounded-xl border p-4 mb-3 text-xs leading-relaxed ${STATUS_CLASS[latestStatus]}`}>
                  <strong>
                    {latest.year} · {ar ? STATUS_LABEL_AR[latestStatus] : STATUS_LABEL[latestStatus]}
                    {' — '}
                    {L(`الفعلي ${fmtSar(latest.actual!)} مقابل خطّة ${fmtSar(latest.planned)} ريال/شهر`, `actual ${fmtSar(latest.actual!)} vs planned ${fmtSar(latest.planned)} SAR/mo`)}
                  </strong>
                  {latestStatus === 'behind' && (
                    <span className="block mt-1">
                      {L('أنت دون مسارك المخطَّط. صحّح المسار: ', "You're below your planned path. Course-correct: ")}
                      <Link href="/budgeting" className="underline font-medium">{L('الميزنة', 'Budgeting')}</Link>{' · '}
                      <Link href="/freedom" className="underline font-medium">{L('الحرّية المالية', 'Freedom')}</Link>{' · '}
                      <Link href="/advisor" className="underline font-medium">{L('اسأل المستشار', 'Ask the advisor')}</Link>
                    </span>
                  )}
                  {latestStatus === 'ahead' && (
                    <span className="block mt-1">{L('أنت متقدّم على خطّتك — فكّر برفع مستواك المستهدَف التالي.', "You're ahead of plan — consider raising your next target rung.")}</span>
                  )}
                </div>
              )}
              <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl overflow-hidden">
                {series.map((s) => {
                  const status = incomeStatus(s.actual, s.planned);
                  const age = ageForYear(profileAge, currentYear, s.year);
                  return (
                    <div key={s.year} className="flex items-center justify-between px-5 py-3 border-t border-[var(--border-faint)] first:border-t-0">
                      <div className="text-sm font-medium text-[var(--ink)]">
                        {s.year}{age != null && age >= 0 && <span className="text-[11px] text-[var(--muted)] font-normal ms-1.5">· {L(`${age} سنة`, `age ${age}`)}</span>}
                      </div>
                      <div className="flex items-center gap-3.5">
                        <div className="text-xs text-[var(--muted)] text-end">
                          <div>{L('خطّة:', 'Plan:')} <strong className="text-[var(--ink-2)]">{fmtSar(s.planned)}</strong></div>
                          <div>{L('فعلي:', 'Actual:')} <strong className="text-[var(--ink-2)]">{s.actual != null ? fmtSar(s.actual) : '—'}</strong></div>
                        </div>
                        <span className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border whitespace-nowrap ${STATUS_CLASS[status]}`}>
                          {ar ? STATUS_LABEL_AR[status] : STATUS_LABEL[status]}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* lifestyle reference */}
      <div className="mb-6">
        <div className="font-serif text-lg font-medium text-[var(--ink)] mb-1">{L('ماذا يعني كل مستوى فعلاً في الحياة السعودية', 'What each level actually means in Saudi life')}</div>
        <div className="text-sm text-[var(--ink-2)] mb-3">
          {L('مستويات المعيشة ليست مجرّدة. إليك ما يشتريه كل مستوى، يوماً بيوم.', "Standards of living aren't abstract. Here's what each tier buys you, day to day.")}
        </div>
        <div className="flex gap-2 flex-wrap mb-3.5">
          {TIERS.map((t) => (
            <button key={t} onClick={() => setLsTier(t)}
              className={`px-4 py-2 rounded-lg text-xs font-medium border ${lsTier === t ? 'bg-[var(--ink)] text-[var(--surface-0)] border-[var(--ink)]' : 'bg-[var(--surface-card)] text-[var(--ink-2)] border-[var(--border-default)]'}`}>
              {tierLabel(t, locale)}
            </button>
          ))}
        </div>
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6">
          <div className="flex items-baseline gap-3 mb-4">
            <div className="font-serif text-xl font-semibold text-[var(--ink)]">{tierLabel(lsTier, locale)}</div>
            <div className="text-xs text-[var(--muted)]">{L('عادةً', 'typically')} {getLifestyle(lsTier, locale).income}</div>
          </div>
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

      {tierHover && (
        <div className="fixed z-[80] w-[280px] bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl shadow-2xl p-4 pointer-events-none" style={{ left: tierHover.x, top: tierHover.y }}>
          <div className="flex items-baseline gap-2 mb-2.5">
            <span className="font-serif text-sm font-semibold" style={{ color: TIER_COLOR[tierHover.tier] }}>{tierLabel(tierHover.tier, locale)}</span>
            <span className="text-[10px] text-[var(--muted)]">{getLifestyle(tierHover.tier, locale).income}</span>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {getLifestyle(tierHover.tier, locale).items.map((it, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-sm shrink-0 leading-none mt-0.5">{it.icon}</span>
                <div className="text-[11px] leading-snug min-w-0">
                  <strong className="text-[var(--ink)] font-medium">{it.label}: </strong>
                  <span className="text-[var(--muted)]">{it.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
