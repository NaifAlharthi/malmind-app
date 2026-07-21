'use client';

import { useEffect, useMemo, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import {
  TIERS, tierLabel, tierShortLabel, getLifestyle,
  buildYearSeries, solStatus, type Tier, type Phase,
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
  const [baseline, setBaseline] = useState<'below' | 'at' | 'above'>('at');
  const [userId, setUserId] = useState<string | null>(null);
  const [phases, setPhases] = useState<PhaseRow[]>([]);
  const [actuals, setActuals] = useState<ActualRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lsTier, setLsTier] = useState<Tier>('decent');
  const [editBuffers, setEditBuffers] = useState<Record<string, { theme: string; todo: string }>>({});

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setUserId(user.id);

    const [{ data: phaseData }, { data: actualData }] = await Promise.all([
      supabase.from('life_phases').select('*').eq('user_id', user.id).order('start_year', { ascending: true }),
      supabase.from('living_standard_actuals').select('year, actual_tier').eq('user_id', user.id).order('year', { ascending: true }),
    ]);

    if (phaseData) setPhases(phaseData as PhaseRow[]);
    if (actualData) setActuals(actualData as ActualRow[]);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function addPhase() {
    if (!userId) return;
    const lastEnd = phases.length > 0 ? Math.max(...phases.map((p) => p.end_year ?? p.start_year)) : new Date().getFullYear();
    const start = phases.length > 0 ? lastEnd + 1 : new Date().getFullYear();
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
    await supabase.from('life_phases').delete().eq('id', id);
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
    () =>
      phases
        .filter((p) => p.end_year != null)
        .map((p) => ({
          id: p.id,
          phase_name: p.phase_name,
          start_year: p.start_year,
          end_year: p.end_year!,
          target_tier: p.target_tier,
          theme: p.theme ?? [],
          todo: p.todo ?? [],
          net_worth_goal: p.net_worth_goal,
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

  if (loading) {
    return <div className="text-sm text-[var(--muted)]">{L('جارٍ تحميل تصميم حياتك…', 'Loading your life design…')}</div>;
  }

  return (
    <div>
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

      {/* baseline — reflective only, no effect on the chart */}
      <div className="flex items-center gap-2.5 flex-wrap mb-4">
        <span className="text-sm text-[var(--ink-2)]">{L('الآن، أقول إنّني:', "Right now, I'd say I'm:")}</span>
        {(['below', 'at', 'above'] as const).map((b) => (
          <button
            key={b}
            onClick={() => setBaseline(b)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium border ${
              baseline === b ? 'bg-[var(--green-bg)] border-[var(--green)] text-[var(--green-dark)]' : 'bg-[var(--surface-card)] border-[var(--border-medium)] text-[var(--ink-2)]'
            }`}
          >
            {b === 'below' ? L('دون المتوسط الوطني', 'Below national average') : b === 'at' ? L('حول المتوسط الوطني', 'Around national average') : L('أعلى قليلاً من المتوسط', 'Slightly above average')}
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
          <div className="text-xs text-[var(--muted)] mb-1">{L('الدرَج هو خطّتك. والخطّ الأزرق هو ما سجّلته.', 'The staircase is your plan. The blue line is what you logged.')}</div>
          <div className="flex gap-4 text-[11px] text-[var(--ink-2)] mb-2">
            <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-[var(--ink)] inline-block" />{L('الهدف (خطّتك)', 'Target (your plan)')}</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-[var(--blue)] inline-block" />{L('الفعلي (مسجَّل)', 'Actual (logged)')}</span>
          </div>
          <div className="h-80 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid stroke="var(--chart-grid)" />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'var(--muted)' }} />
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
          <div className="flex gap-2 flex-wrap mt-3">
            {phasesForSeries.map((p) => (
              <span key={p.id} className="text-[11px] text-[var(--red)] border border-[var(--red)]/30 bg-[var(--red-bg)] rounded-full px-3 py-1">
                {p.phase_name}: {p.start_year}–{p.end_year} · {L(`${p.end_year - p.start_year} سنة`, `${p.end_year - p.start_year} years`)}
              </span>
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {phases.map((phase) => (
              <PhaseCard
                key={phase.id}
                phase={phase}
                ar={ar}
                buffer={editBuffers[phase.id]}
                onLocalTheme={(v) => setEditBuffers((prev) => ({ ...prev, [phase.id]: { theme: v, todo: prev[phase.id]?.todo ?? (phase.todo ?? []).join('\n') } }))}
                onLocalTodo={(v) => setEditBuffers((prev) => ({ ...prev, [phase.id]: { theme: prev[phase.id]?.theme ?? (phase.theme ?? []).join('\n'), todo: v } }))}
                onCommitTheme={() => updatePhase(phase.id, { theme: (editBuffers[phase.id]?.theme ?? (phase.theme ?? []).join('\n')).split('\n').map((s) => s.trim()).filter(Boolean) })}
                onCommitTodo={() => updatePhase(phase.id, { todo: (editBuffers[phase.id]?.todo ?? (phase.todo ?? []).join('\n')).split('\n').map((s) => s.trim()).filter(Boolean) })}
                onUpdate={(patch) => updatePhase(phase.id, patch)}
                onDelete={() => deletePhase(phase.id)}
              />
            ))}
          </div>
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
            {L('كل سنة، سجّل مستوى المعيشة الذي بلغته فعلاً. يخبرك مَالمايند إن كنت متقدّماً أم على المسار أم متأخّراً.', "Each year, record the standard of living you actually reached. MalMind tells you if you're ahead, on track, or falling behind.")}
          </div>
          {series.length === 0 ? (
            <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-8 text-center text-sm text-[var(--muted)]">
              {L('صمّم مراحل حياتك أولاً، في «صمّم خطتي»، ليكون هناك خطّة تتتبّعها.', 'Design your life phases first, in Design my plan, so there is a plan to track against.')}
            </div>
          ) : (
            <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl overflow-hidden">
              {series.map((s) => {
                const status = solStatus(s.actual, s.target);
                return (
                  <div key={s.year} className="flex items-center justify-between px-5 py-3.5 border-t border-[var(--border-faint)] first:border-t-0">
                    <div>
                      <div className="text-sm font-medium text-[var(--ink)]">{s.year}</div>
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
            'ما إن تحدّد هذه الدرجات، يحفظها لك مَالمايند. وحين يبعدك قرارٌ عن مسارك إلى مستواك التالي، سأريك المقايضة مقابل الحياة التي قلت إنك تريدها.',
            "Once you set these stepping stones, MalMind holds them for you. When a decision would knock you off the path to your next level, I'll show you the trade-off against the life you said you wanted."
          )}
        </div>
      </div>
    </div>
  );
}

function PhaseCard({
  phase, ar, buffer, onLocalTheme, onLocalTodo, onCommitTheme, onCommitTodo, onUpdate, onDelete,
}: {
  phase: PhaseRow;
  ar: boolean;
  buffer?: { theme: string; todo: string };
  onLocalTheme: (v: string) => void;
  onLocalTodo: (v: string) => void;
  onCommitTheme: () => void;
  onCommitTodo: () => void;
  onUpdate: (patch: Partial<PhaseRow>) => void;
  onDelete: () => void;
}) {
  const L = (a: string, e: string) => (ar ? a : e);
  const locale: 'ar' | 'en' = ar ? 'ar' : 'en';
  const themeText = buffer?.theme ?? (phase.theme ?? []).join('\n');
  const todoText = buffer?.todo ?? (phase.todo ?? []).join('\n');

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5">
      <div className="flex items-center gap-2.5 mb-3.5">
        <input
          value={phase.phase_name}
          onChange={(e) => onUpdate({ phase_name: e.target.value })}
          className="font-serif text-base font-semibold text-[var(--ink)] border-b border-dashed border-[var(--border-medium)] focus:border-[var(--green)] outline-none bg-transparent flex-1 min-w-0"
        />
        <button onClick={onDelete} className="text-[10px] text-[var(--red-dark-text)] shrink-0">{L('حذف', 'Delete')}</button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-3.5">
        <div>
          <label className="text-[10px] text-[var(--muted)] block mb-1">{L('سنة البداية', 'Start year')}</label>
          <input
            type="number"
            value={phase.start_year}
            onChange={(e) => onUpdate({ start_year: parseInt(e.target.value) || phase.start_year })}
            className="w-full bg-[var(--surface-0)] border border-[var(--border-default)] rounded-md px-2 py-1.5 text-xs"
          />
        </div>
        <div>
          <label className="text-[10px] text-[var(--muted)] block mb-1">{L('سنة النهاية', 'End year')}</label>
          <input
            type="number"
            value={phase.end_year ?? ''}
            onChange={(e) => onUpdate({ end_year: parseInt(e.target.value) || null })}
            className="w-full bg-[var(--surface-0)] border border-[var(--border-default)] rounded-md px-2 py-1.5 text-xs"
          />
        </div>
      </div>

      <div className="mb-3.5">
        <label className="text-[10px] text-[var(--muted)] block mb-1.5">{L('المستوى المستهدَف لهذه المرحلة', 'Target standard for this phase')}</label>
        <div className="flex gap-1">
          {TIERS.map((t) => (
            <button
              key={t}
              onClick={() => onUpdate({ target_tier: t })}
              className={`flex-1 px-1 py-1.5 rounded-md text-[10px] text-center font-medium ${
                phase.target_tier === t ? 'bg-[var(--green)] text-white' : 'bg-[var(--surface-card)] border border-[var(--border-medium)] text-[var(--muted)]'
              }`}
            >
              {tierShortLabel(t, locale)}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <label className="text-[10px] tracking-[0.06em] uppercase text-[var(--gold)] block mb-1.5">{L('الموضوع والأحداث الكبرى', 'Theme & major events')}</label>
        <textarea
          value={themeText}
          onChange={(e) => onLocalTheme(e.target.value)}
          onBlur={onCommitTheme}
          rows={3}
          placeholder={L('واحد في كل سطر — مثال: بداية مسيرتي المهنية', 'One per line — e.g. Starting my career')}
          className="w-full bg-[var(--surface-0)] border border-[var(--border-default)] rounded-md px-2.5 py-2 text-xs leading-relaxed outline-none focus:border-[var(--green)] resize-none"
        />
      </div>

      <div className="mb-3.5">
        <label className="text-[10px] tracking-[0.06em] uppercase text-[var(--gold)] block mb-1.5">{L('ما الذي يجب إنجازه', 'What needs to be done')}</label>
        <textarea
          value={todoText}
          onChange={(e) => onLocalTodo(e.target.value)}
          onBlur={onCommitTodo}
          rows={3}
          placeholder={L('واحد في كل سطر — مثال: بناء صندوق طوارئ', 'One per line — e.g. Build an emergency fund')}
          className="w-full bg-[var(--surface-0)] border border-[var(--border-default)] rounded-md px-2.5 py-2 text-xs leading-relaxed outline-none focus:border-[var(--green)] resize-none"
        />
      </div>

      <div className="bg-[var(--surface-0)] rounded-lg px-3 py-2.5">
        <label className="text-[10px] text-[var(--muted)] block mb-1">{L('قياس النموّ (بكلماتك)', 'Quantifying growth (your own words)')}</label>
        <input
          defaultValue={phase.net_worth_goal ?? ''}
          onBlur={(e) => onUpdate({ net_worth_goal: e.target.value || null })}
          placeholder={L('مثال: ابنِ أول 500 ألف ريال لك', 'e.g. Build your first SAR 500K')}
          className="w-full bg-transparent text-sm font-serif font-semibold text-[var(--green-dark)] outline-none"
        />
      </div>
    </div>
  );
}
