'use client';

import { useEffect, useMemo, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea, ResponsiveContainer,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { isDemoActive } from '@/lib/demoSupabase';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import {
  TIERS, tierLabel, getLifestyle, buildYearSeries, solStatus, ageForYear, suggestForTier,
  TIER_COLOR, type Tier, type Phase, type PhaseSuggestion,
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

interface ActualRow {
  year: number;
  actual_tier: Tier | null;
}

const STATUS_LABEL = { 'not-logged': 'Not logged', ahead: 'Ahead', ontrack: 'On track', behind: 'Behind' };
const STATUS_LABEL_AR = { 'not-logged': 'غير مسجَّل', ahead: 'متقدّم', ontrack: 'على المسار', behind: 'متأخّر' };
const STATUS_CLASS = {
  'not-logged': 'bg-[var(--surface-1)] text-[var(--muted)] border-[var(--border-default)]',
  ahead: 'bg-[var(--green-bg)] text-[var(--green-dark)] border-[var(--green-border)]',
  ontrack: 'bg-[var(--blue-bg)] text-[var(--blue-dark-text)] border-[var(--blue-border)]',
  behind: 'bg-[var(--red-bg)] text-[var(--red-dark-text)] border-[var(--red-soft)]',
};

type Baseline = 'below' | 'at' | 'above';
const BASELINE_KEY = 'mm-sol-baseline';

// X-axis tick that shows the calendar year and, when we know the user's age,
// the age they'll be that year — so the timeline reads in human terms.
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
  const [baseline, setBaselineState] = useState<Baseline>('at');
  const [userId, setUserId] = useState<string | null>(null);
  const [profileAge, setProfileAge] = useState<number | null>(null);
  const [phases, setPhases] = useState<PhaseRow[]>([]);
  const [actuals, setActuals] = useState<ActualRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lsTier, setLsTier] = useState<Tier>('decent');
  // Buffered edits (theme/todo/growth) so we commit on blur, not per keystroke.
  const [buffers, setBuffers] = useState<Record<string, { theme?: string; todo?: string; growth?: string }>>({});
  const [assisting, setAssisting] = useState<Set<string>>(new Set());
  // Page-level hover popover for "what this tier means" (rendered fixed, so an
  // overflow-scrolled table never clips it).
  const [tierHover, setTierHover] = useState<{ tier: Tier; x: number; y: number } | null>(null);

  const currentYear = new Date().getFullYear();
  const ageBase = profileAge != null ? { year: currentYear, age: profileAge } : null;

  const setBaseline = (b: Baseline) => {
    setBaselineState(b);
    try { localStorage.setItem(userId ? `${BASELINE_KEY}:${userId}` : BASELINE_KEY, b); } catch { /* ignore */ }
  };

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    setUserId(user.id);

    try {
      const saved = localStorage.getItem(`${BASELINE_KEY}:${user.id}`) || localStorage.getItem(BASELINE_KEY);
      if (saved === 'below' || saved === 'at' || saved === 'above') setBaselineState(saved);
    } catch { /* ignore */ }

    const [{ data: phaseData }, { data: actualData }, { data: profile }] = await Promise.all([
      supabase.from('life_phases').select('*').eq('user_id', user.id).order('start_year', { ascending: true }),
      supabase.from('living_standard_actuals').select('year, actual_tier').eq('user_id', user.id).order('year', { ascending: true }),
      supabase.from('profiles').select('age').eq('id', user.id).single(),
    ]);

    if (phaseData) setPhases(phaseData as PhaseRow[]);
    if (actualData) setActuals(actualData as ActualRow[]);
    if (profile && (profile as { age: number | null }).age != null) setProfileAge((profile as { age: number }).age);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { load(); }, [load]);

  async function addPhase() {
    if (!userId) return;
    const lastEnd = phases.length > 0 ? Math.max(...phases.map((p) => p.end_year ?? p.start_year)) : currentYear;
    const start = phases.length > 0 ? lastEnd + 1 : currentYear;
    const { data, error } = await supabase
      .from('life_phases')
      .insert({
        user_id: userId,
        phase_name: L(`المرحلة ${String.fromCharCode(65 + phases.length)}`, `Phase ${String.fromCharCode(65 + phases.length)}`),
        start_year: start,
        end_year: start + 5,
        target_tier: 'decent',
        target_monthly_spend: 0,
        sort_order: phases.length,
      })
      .select()
      .single();
    if (!error && data) setPhases((prev) => [...prev, data as PhaseRow]);
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

  // "Assist me" — fill this phase's theme/to-dos/growth. Real users hit the AI
  // route; in the guest demo we use the tier template locally.
  async function assist(phase: PhaseRow) {
    setAssisting((prev) => new Set(prev).add(phase.id));
    try {
      let sug: PhaseSuggestion;
      if (isDemoActive()) {
        await new Promise((r) => setTimeout(r, 500));
        sug = suggestForTier(phase.target_tier, ar ? 'ar' : 'en');
      } else {
        const res = await fetch('/api/sol-assist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phaseName: phase.phase_name, startYear: phase.start_year,
            endYear: phase.end_year, tier: phase.target_tier, locale: ar ? 'ar' : 'en',
          }),
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

  async function setActual(year: number, tier: string) {
    if (!userId) return;
    setActuals((prev) => {
      const rest = prev.filter((a) => a.year !== year);
      return tier ? [...rest, { year, actual_tier: tier as Tier }] : rest;
    });
    await supabase.from('living_standard_actuals').upsert(
      { user_id: userId, year, actual_tier: tier || null },
      { onConflict: 'user_id,year' }
    );
  }

  const phasesForSeries: Phase[] = useMemo(
    () => phases.filter((p) => p.end_year != null).map((p) => ({
      id: p.id, phase_name: p.phase_name, start_year: p.start_year, end_year: p.end_year!,
      target_tier: p.target_tier, theme: p.theme ?? [], todo: p.todo ?? [], net_worth_goal: p.net_worth_goal,
    })),
    [phases]
  );

  const actualsByYear = useMemo(() => {
    const map: Record<number, Tier> = {};
    actuals.forEach((a) => { if (a.actual_tier) map[a.year] = a.actual_tier; });
    return map;
  }, [actuals]);

  const series = useMemo(() => buildYearSeries(phasesForSeries, actualsByYear), [phasesForSeries, actualsByYear]);
  const chartData = series.map((s) => ({ year: s.year, target: s.target, actual: s.actual }));

  function switchMode(m: 'plan' | 'track') {
    setMode(m);
    router.push(`/standard-of-living?mode=${m === 'track' ? 'track' : 'plan'}`);
  }

  // Show the tier meaning popover anchored under the hovered element.
  const showTierMeaning = (tier: Tier, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setTierHover({ tier, x: Math.min(r.left, window.innerWidth - 300), y: r.bottom + 8 });
  };

  // Buffered value getters for the editable table.
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

  return (
    <div onMouseLeave={() => setTierHover(null)}>
      <div className="mb-1 text-[10px] tracking-[0.1em] uppercase text-[var(--blue)] font-semibold">
        {mode === 'plan' ? L('قرّر', 'Decide') : L('فكّر', 'Think')}
      </div>
      <h1 className="font-serif text-2xl font-semibold text-[var(--ink)] mb-1">{L('مستوى المعيشة', 'Standard of Living')}</h1>
      <p className="text-sm text-[var(--ink-2)] mb-5 max-w-2xl">
        {L(
          'مستوى معيشتك ليس حظّاً. بل سلسلة من درجات يمكنك تخطيطها. حدّد مراحل حياتك القادمة، وشاهِد ماذا يعني كل مستوى في واقع سعودي — وما يلزم للصعود إلى التالي.',
          "Your standard of living isn't luck. It's a series of stepping stones you can plan. Set the phases of your life ahead, and see what each level means in real Saudi terms — and what it takes to climb to the next."
        )}
      </p>

      {/* starting positioning — a saved framing choice */}
      <div className="flex items-center gap-2.5 flex-wrap mb-4">
        <span className="text-sm text-[var(--ink-2)]">{L('أبدأ اليوم من:', "Today I'm starting from:")}</span>
        {(['below', 'at', 'above'] as const).map((b) => (
          <button
            key={b}
            onClick={() => setBaseline(b)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium border ${
              baseline === b ? 'bg-[var(--green-bg)] border-[var(--green)] text-[var(--green-dark)]' : 'bg-[var(--surface-card)] border-[var(--border-medium)] text-[var(--ink-2)]'
            }`}
          >
            {b === 'below' ? L('دون المتوسط الوطني', 'Below national average') : b === 'at' ? L('حول المتوسط الوطني', 'Around national average') : L('أعلى من المتوسط', 'Above national average')}
          </button>
        ))}
      </div>

      {/* mode toggle */}
      <div className="inline-flex border border-[var(--border-default)] rounded-lg overflow-hidden mb-5">
        <button
          onClick={() => switchMode('plan')}
          className={`px-4 py-2 text-xs font-medium flex items-center gap-2 ${mode === 'plan' ? 'bg-[var(--ink)] text-[var(--surface-0)]' : 'bg-[var(--surface-card)] text-[var(--ink-2)]'}`}
        >
          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${mode === 'plan' ? 'bg-white/25 text-white' : 'bg-[var(--green-bg)] text-[var(--green-dark)]'}`}>{L('قرّر', 'Decide')}</span>
          {L('صمّم خطتي', 'Design my plan')}
        </button>
        <button
          onClick={() => switchMode('track')}
          className={`px-4 py-2 text-xs font-medium flex items-center gap-2 ${mode === 'track' ? 'bg-[var(--ink)] text-[var(--surface-0)]' : 'bg-[var(--surface-card)] text-[var(--ink-2)]'}`}
        >
          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${mode === 'track' ? 'bg-white/25 text-white' : 'bg-[var(--blue-bg)] text-[var(--blue-dark-text)]'}`}>{L('فكّر', 'Think')}</span>
          {L('تتبّع الفعلي مقابل الخطة', 'Track actual vs plan')}
        </button>
      </div>

      {/* chart */}
      {chartData.length > 0 ? (
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 mb-6">
          <div className="text-sm font-medium text-[var(--ink)]">{L('مستوى معيشتك عبر السنوات', 'Your standard of living over the years')}</div>
          <div className="text-xs text-[var(--muted)] mb-1">{L('المناطق الملوّنة هي مراحلك. والخطّ الأزرق هو ما سجّلته.', 'The coloured bands are your phases. The blue line is what you logged.')}</div>
          <div className="flex gap-4 text-[11px] text-[var(--ink-2)] mb-2">
            <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-[var(--ink)] inline-block" />{L('الهدف (خطّتك)', 'Target (your plan)')}</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-[var(--blue)] inline-block" />{L('الفعلي (مسجَّل)', 'Actual (logged)')}</span>
          </div>
          <div className="h-80 mt-2" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                {/* translucent phase bands */}
                {phasesForSeries.map((p, i) => (
                  <ReferenceArea
                    key={p.id}
                    x1={p.start_year}
                    x2={p.end_year}
                    y1={0}
                    y2={3}
                    fill={TIER_COLOR[p.target_tier]}
                    fillOpacity={0.08 + (i % 2) * 0.05}
                    stroke={TIER_COLOR[p.target_tier]}
                    strokeOpacity={0.25}
                    label={{ value: p.phase_name, position: 'insideTop', fontSize: 10, fill: 'var(--ink-2)' }}
                  />
                ))}
                <XAxis
                  dataKey="year"
                  height={ageBase ? 36 : 20}
                  tick={(props) => <YearAgeTick {...props} ageBase={ageBase} ar={ar} />}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 3]}
                  ticks={[0, 1, 2, 3]}
                  tick={{ fontSize: 10, fill: 'var(--ink-2)' }}
                  tickFormatter={(v) => tierLabel(TIERS[v], locale) ?? ''}
                  width={100}
                />
                <Tooltip
                  formatter={(value, name) => {
                    if (value == null) return [L('غير مسجَّل', 'Not logged'), name];
                    return [tierLabel(TIERS[Math.round(Number(value))], locale), name];
                  }}
                />
                <Line type="stepAfter" dataKey="target" name={L('الهدف', 'Target')} stroke="var(--ink)" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="actual" name={L('الفعلي', 'Actual')} stroke="var(--blue)" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          {/* phase chips — hover to see what that standard of living means */}
          <div className="flex gap-2 flex-wrap mt-3">
            {phasesForSeries.map((p) => (
              <button
                key={p.id}
                onMouseEnter={(e) => showTierMeaning(p.target_tier, e.currentTarget)}
                onMouseLeave={() => setTierHover(null)}
                className="text-[11px] rounded-full px-3 py-1 border cursor-help"
                style={{ color: TIER_COLOR[p.target_tier], borderColor: `${TIER_COLOR[p.target_tier]}55`, background: `${TIER_COLOR[p.target_tier]}12` }}
              >
                {p.phase_name}: {p.start_year}–{p.end_year} · {tierLabel(p.target_tier, locale)} ⓘ
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-8 text-center text-sm text-[var(--muted)] mb-6">
          {L('أضِف مرحلة حياة أدناه (بسنة نهاية) لرؤية مخطّط الدرَج.', 'Add a life phase below (with an end year) to see the staircase chart.')}
        </div>
      )}

      {mode === 'plan' && (
        <div className="mb-6">
          <div className="text-[11px] tracking-[0.1em] uppercase text-[var(--muted)] mb-3">
            {L('مراحل حياتك — حدّد هدفاً لكلٍّ منها', 'The phases of your life — set a target for each')}
          </div>

          {phases.length === 0 ? (
            <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-8 text-center text-sm text-[var(--muted)]">
              {L('لم تُضِف مراحل بعد.', 'No phases yet.')}
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
                          <input
                            value={p.phase_name}
                            onChange={(e) => updatePhase(p.id, { phase_name: e.target.value })}
                            className="font-serif text-sm font-semibold text-[var(--ink)] border-b border-dashed border-[var(--border-medium)] focus:border-[var(--green)] outline-none bg-transparent flex-1 min-w-0"
                          />
                          <button onClick={() => deletePhase(p.id)} className="text-[var(--muted)] hover:text-[var(--red-dark-text)] text-xs shrink-0" aria-label={L('حذف', 'Delete')}>✕</button>
                        </div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <input type="number" value={p.start_year}
                            onChange={(e) => updatePhase(p.id, { start_year: parseInt(e.target.value) || p.start_year })}
                            className="w-16 bg-[var(--surface-0)] border border-[var(--border-default)] rounded-md px-2 py-1 text-[11px]" />
                          <span className="text-[var(--muted)]">–</span>
                          <input type="number" value={p.end_year ?? ''}
                            onChange={(e) => updatePhase(p.id, { end_year: parseInt(e.target.value) || null })}
                            className="w-16 bg-[var(--surface-0)] border border-[var(--border-default)] rounded-md px-2 py-1 text-[11px]" />
                          {ageBase && p.end_year && (
                            <span className="text-[10px] text-[var(--muted)]">
                              {L(`(${ageForYear(profileAge, currentYear, p.start_year)}–${ageForYear(profileAge, currentYear, p.end_year)} سنة)`,
                                `(age ${ageForYear(profileAge, currentYear, p.start_year)}–${ageForYear(profileAge, currentYear, p.end_year)})`)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <select
                            value={p.target_tier}
                            onChange={(e) => updatePhase(p.id, { target_tier: e.target.value as Tier })}
                            className="bg-[var(--surface-0)] border rounded-md px-2 py-1 text-[11px] font-medium outline-none"
                            style={{ color: TIER_COLOR[p.target_tier], borderColor: `${TIER_COLOR[p.target_tier]}66` }}
                          >
                            {TIERS.map((t) => <option key={t} value={t} style={{ color: 'var(--ink)' }}>{tierLabel(t, locale)}</option>)}
                          </select>
                          <button
                            onMouseEnter={(e) => showTierMeaning(p.target_tier, e.currentTarget)}
                            onMouseLeave={() => setTierHover(null)}
                            className="w-5 h-5 rounded-full border border-[var(--border-medium)] text-[10px] text-[var(--muted)] hover:border-[var(--green)] hover:text-[var(--green-dark)] cursor-help shrink-0"
                            aria-label={L('ماذا يعني هذا المستوى', 'What this tier means')}
                          >ⓘ</button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="align-top">
                  {/* Theme & events */}
                  <tr className="border-b border-[var(--border-faint)]">
                    <td className="p-3 text-[10px] tracking-[0.06em] uppercase text-[var(--gold)] font-semibold align-top">{L('الموضوع والأحداث', 'Theme & events')}</td>
                    {phases.map((p) => (
                      <td key={p.id} className="p-3 border-s border-[var(--border-faint)]">
                        <textarea rows={3} value={themeVal(p)}
                          onChange={(e) => setBuf(p.id, 'theme', e.target.value)}
                          onBlur={() => commitList(p, 'theme')}
                          placeholder={L('واحد في كل سطر', 'One per line')}
                          className="w-full bg-[var(--surface-0)] border border-[var(--border-default)] rounded-md px-2 py-1.5 text-[11px] leading-relaxed outline-none focus:border-[var(--green)] resize-none" />
                      </td>
                    ))}
                  </tr>
                  {/* To-do */}
                  <tr className="border-b border-[var(--border-faint)]">
                    <td className="p-3 text-[10px] tracking-[0.06em] uppercase text-[var(--gold)] font-semibold align-top">{L('ما يجب إنجازه', 'To-do')}</td>
                    {phases.map((p) => (
                      <td key={p.id} className="p-3 border-s border-[var(--border-faint)]">
                        <textarea rows={3} value={todoVal(p)}
                          onChange={(e) => setBuf(p.id, 'todo', e.target.value)}
                          onBlur={() => commitList(p, 'todo')}
                          placeholder={L('واحد في كل سطر', 'One per line')}
                          className="w-full bg-[var(--surface-0)] border border-[var(--border-default)] rounded-md px-2 py-1.5 text-[11px] leading-relaxed outline-none focus:border-[var(--green)] resize-none" />
                      </td>
                    ))}
                  </tr>
                  {/* Growth */}
                  <tr className="border-b border-[var(--border-faint)]">
                    <td className="p-3 text-[10px] tracking-[0.06em] uppercase text-[var(--gold)] font-semibold align-top">{L('قياس النموّ', 'Growth')}</td>
                    {phases.map((p) => (
                      <td key={p.id} className="p-3 border-s border-[var(--border-faint)]">
                        <input value={growthVal(p)}
                          onChange={(e) => setBuf(p.id, 'growth', e.target.value)}
                          onBlur={() => updatePhase(p.id, { net_worth_goal: (buffers[p.id]?.growth ?? p.net_worth_goal ?? '') || null })}
                          placeholder={L('مثال: أول 500 ألف ريال', 'e.g. First SAR 500K')}
                          className="w-full bg-transparent text-[12px] font-serif font-semibold text-[var(--green-dark)] border-b border-dashed border-[var(--border-medium)] focus:border-[var(--green)] outline-none" />
                      </td>
                    ))}
                  </tr>
                  {/* AI assist */}
                  <tr>
                    <td className="p-3" />
                    {phases.map((p) => (
                      <td key={p.id} className="p-3 border-s border-[var(--border-faint)]">
                        <button
                          onClick={() => assist(p)}
                          disabled={assisting.has(p.id)}
                          className="w-full text-[11px] font-medium text-[var(--blue-dark-text)] bg-[var(--blue-bg)] border border-[var(--blue-border)] rounded-lg px-2 py-1.5 disabled:opacity-60"
                        >
                          {assisting.has(p.id) ? L('يفكّر…', 'Thinking…') : L('✨ ساعِدني', '✨ Assist me')}
                        </button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <button
            onClick={addPhase}
            className="mt-3.5 text-sm text-[var(--green-dark)] bg-[var(--green-bg)] border border-[var(--green-border)] rounded-lg px-4 py-2 font-medium"
          >
            {L('+ أضِف مرحلة حياة', '+ Add a life phase')}
          </button>
        </div>
      )}

      {mode === 'track' && (
        <div className="mb-6">
          <div className="font-serif text-lg font-medium text-[var(--ink)] mb-1">{L('كيف حالك مقابل خطّتك أنت؟', 'How are you doing against your own plan?')}</div>
          <div className="text-sm text-[var(--ink-2)] mb-3">
            {L('كل سنة، سجّل مستوى المعيشة الذي بلغته فعلاً. يخبرك مال مايند إن كنت متقدّماً أم على المسار أم متأخّراً.', "Each year, record the standard of living you actually reached. MalMind tells you if you're ahead, on track, or falling behind.")}
          </div>
          {series.length === 0 ? (
            <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-8 text-center text-sm text-[var(--muted)]">
              {L('صمّم مراحل حياتك أولاً، في «صمّم خطتي»، ليكون هناك خطّة تتتبّعها.', 'Design your life phases first, in Design my plan, so there is a plan to track against.')}
            </div>
          ) : (
            <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl overflow-hidden">
              {series.map((s) => {
                const status = solStatus(s.actual, s.target);
                const age = ageForYear(profileAge, currentYear, s.year);
                return (
                  <div key={s.year} className="flex items-center justify-between px-5 py-3.5 border-t border-[var(--border-faint)] first:border-t-0">
                    <div>
                      <div className="text-sm font-medium text-[var(--ink)]">
                        {s.year}{age != null && age >= 0 && <span className="text-[11px] text-[var(--muted)] font-normal ms-1.5">· {L(`${age} سنة`, `age ${age}`)}</span>}
                      </div>
                      <div className="text-xs text-[var(--muted)]">
                        {L('الهدف:', 'Target:')} <strong className="text-[var(--ink-2)] font-medium">{tierLabel(TIERS[s.target], locale)}</strong>
                      </div>
                    </div>
                    <div className="flex items-center gap-3.5">
                      <select
                        value={s.actual != null ? TIERS[s.actual] : ''}
                        onChange={(e) => setActual(s.year, e.target.value)}
                        className="bg-[var(--surface-0)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-xs outline-none focus:border-[var(--green)]"
                      >
                        <option value="">{L('سجّل الفعلي…', 'Log actual…')}</option>
                        {TIERS.map((t) => (
                          <option key={t} value={t}>{tierLabel(t, locale)}</option>
                        ))}
                      </select>
                      <span className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border whitespace-nowrap ${STATUS_CLASS[status]}`}>
                        {ar ? STATUS_LABEL_AR[status] : STATUS_LABEL[status]}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
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
            <button
              key={t}
              onClick={() => setLsTier(t)}
              className={`px-4 py-2 rounded-lg text-xs font-medium border ${
                lsTier === t ? 'bg-[var(--ink)] text-[var(--surface-0)] border-[var(--ink)]' : 'bg-[var(--surface-card)] text-[var(--ink-2)] border-[var(--border-default)]'
              }`}
            >
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

      <div className="flex gap-3 items-start bg-[var(--gold-bg)] border border-[var(--gold)] rounded-xl p-4">
        <div className="w-7 h-7 rounded-full bg-[var(--gold)] flex items-center justify-center font-serif font-semibold text-white text-sm shrink-0">M</div>
        <div className="text-xs text-[var(--gold-text-body)] leading-relaxed">
          <strong className="text-[var(--gold-text-strong)]">{L('يصبح هذا مخطّط حياتك.', "This becomes your life's blueprint.")}</strong> {L(
            'ما إن تحدّد هذه الدرجات، يحفظها لك مال مايند. وحين يبعدك قرارٌ عن مسارك إلى مستواك التالي، سأريك المقايضة مقابل الحياة التي قلت إنك تريدها.',
            "Once you set these stepping stones, MalMind holds them for you. When a decision would knock you off the path to your next level, I'll show you the trade-off against the life you said you wanted."
          )}
        </div>
      </div>

      {/* tier-meaning hover popover (fixed, never clipped) */}
      {tierHover && (
        <div
          className="fixed z-[80] w-[280px] bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl shadow-2xl p-4 pointer-events-none"
          style={{ left: tierHover.x, top: tierHover.y }}
        >
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
