'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import {
  PRESETS, PRESET_NAMES_AR, PRESET_CHIPS_AR, targetFromMonthly, monthlyFromTarget, buildFundSeries, fundStatus, monthLabel,
  type FundStatus,
} from '@/lib/goalFund';

interface GoalFund {
  id: string;
  name: string;
  icon: string;
  target_amount: number;
  monthly_contribution: number;
  maturity_years: number;
  expected_return: number;
  start_date: string;
}

interface Actual {
  month_index: number;
  actual_amount: number;
}

function fmt(n: number) {
  return Math.round(n).toLocaleString();
}

function fmtCompact(n: number) {
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return Math.round(n / 1e3) + 'K';
  return String(Math.round(n));
}

const STATUS_LABEL: Record<FundStatus, string> = {
  'not-started': 'Not started yet',
  ahead: 'Ahead of plan',
  ontrack: 'On track',
  behind: 'Behind plan',
};

const STATUS_LABEL_AR: Record<FundStatus, string> = {
  'not-started': 'لم يبدأ بعد',
  ahead: 'متقدّم على الخطة',
  ontrack: 'على المسار',
  behind: 'متأخّر عن الخطة',
};

const STATUS_CLASS: Record<FundStatus, string> = {
  'not-started': 'bg-[var(--blue-bg)] text-[var(--blue-dark-text)]',
  ahead: 'bg-[var(--green-bg)] text-[var(--green-dark)]',
  ontrack: 'bg-[var(--blue-bg)] text-[var(--blue-dark-text)]',
  behind: 'bg-[var(--red-bg)] text-[var(--red-dark-text)]',
};

type Mode = 'monthly' | 'target';

export default function GoalFundPage() {
  const router = useRouter();
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const money = (n: number) => (ar ? `${fmt(n)} ريال` : `SAR ${fmt(n)}`);
  const [userId, setUserId] = useState<string | null>(null);
  const [funds, setFunds] = useState<GoalFund[]>([]);
  const [activeFundId, setActiveFundId] = useState<string | null>(null);
  const [actuals, setActuals] = useState<Actual[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [visibleMonths, setVisibleMonths] = useState(12);

  // new-fund form
  const [selectedPreset, setSelectedPreset] = useState(PRESETS[0].id);
  const [icon, setIcon] = useState(PRESETS[0].icon);
  const [name, setName] = useState(PRESETS[0].name);
  const [mode, setMode] = useState<Mode>('monthly');
  const [monthly, setMonthly] = useState('1500');
  const [target, setTarget] = useState('324000');
  const [years, setYears] = useState(String(PRESETS[0].years));
  const [roi, setRoi] = useState('3');

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setUserId(user.id);

    const { data } = await supabase
      .from('goal_funds')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (data) {
      setFunds(data as GoalFund[]);
      setActiveFundId((prev) => prev ?? (data.length > 0 ? data[0].id : null));
    }
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    load();
  }, [load]);

  const loadActuals = useCallback(async (fundId: string) => {
    const { data } = await supabase
      .from('goal_fund_actuals')
      .select('month_index, actual_amount')
      .eq('goal_fund_id', fundId)
      .order('month_index', { ascending: true });
    if (data) setActuals(data as Actual[]);
  }, [supabase]);

  useEffect(() => {
    if (activeFundId) {
      setVisibleMonths(12);
      loadActuals(activeFundId);
    }
  }, [activeFundId, loadActuals]);

  function applyPreset(id: string) {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    setSelectedPreset(id);
    setIcon(p.icon);
    setName(ar ? PRESET_NAMES_AR[p.id] ?? p.name : p.name);
    setYears(String(p.years));
  }

  async function createFund() {
    if (!userId) return;
    const yearsNum = parseFloat(years) || 1;
    const roiNum = parseFloat(roi) || 0;
    const monthlyNum = parseFloat(monthly.replace(/[^0-9.]/g, '')) || 0;
    const targetNum = parseFloat(target.replace(/[^0-9.]/g, '')) || 0;

    const finalMonthly = mode === 'monthly' ? monthlyNum : monthlyFromTarget(targetNum, yearsNum, roiNum);
    const finalTarget = mode === 'monthly' ? targetFromMonthly(monthlyNum, yearsNum, roiNum) : targetNum;

    const { data, error } = await supabase
      .from('goal_funds')
      .insert({
        user_id: userId,
        name,
        icon,
        monthly_contribution: finalMonthly,
        maturity_years: yearsNum,
        expected_return: roiNum,
        target_amount: finalTarget,
        start_date: new Date().toISOString().slice(0, 10),
      })
      .select()
      .single();

    if (!error && data) {
      setFunds((prev) => [...prev, data as GoalFund]);
      setActiveFundId(data.id);
      setCreating(false);
    }
  }

  async function deleteFund(id: string) {
    await supabase.from('goal_funds').delete().eq('id', id);
    setFunds((prev) => prev.filter((f) => f.id !== id));
    if (activeFundId === id) setActiveFundId(funds.find((f) => f.id !== id)?.id ?? null);
  }

  async function logActual(monthIndex: number, amount: number) {
    if (!activeFundId || !userId) return;
    await supabase.from('goal_fund_actuals').upsert(
      { goal_fund_id: activeFundId, user_id: userId, month_index: monthIndex, actual_amount: amount },
      { onConflict: 'goal_fund_id,month_index' }
    );
    loadActuals(activeFundId);
  }

  const activeFund = funds.find((f) => f.id === activeFundId);

  const actualsMap = useMemo(
    () => Object.fromEntries(actuals.map((a) => [a.month_index, a.actual_amount])),
    [actuals]
  );

  const series = useMemo(
    () =>
      activeFund
        ? buildFundSeries(activeFund.monthly_contribution, activeFund.maturity_years, activeFund.expected_return, actualsMap)
        : [],
    [activeFund, actualsMap]
  );

  const status = fundStatus(series);
  const lastLogged = [...series].reverse().find((s) => s.actualLogged !== null);
  const cumActual = lastLogged?.cumActual ?? 0;
  const pctToGoal = activeFund && activeFund.target_amount > 0 ? Math.min(999, (cumActual / activeFund.target_amount) * 100) : 0;
  const startDate = activeFund ? new Date(activeFund.start_date) : new Date();

  const chartData = series.map((s, i) => ({
    label: monthLabel(startDate, i, locale),
    cumTarget: s.cumTarget,
    cumActual: s.actualLogged !== null ? s.cumActual : null,
  }));

  const simpleSum = activeFund ? activeFund.monthly_contribution * Math.round(activeFund.maturity_years * 12) : 0;
  const bonus = activeFund ? activeFund.target_amount - simpleSum : 0;

  if (loading) {
    return <div className="text-sm text-[var(--muted)]">{L('جارٍ تحميل صناديق أهدافك…', 'Loading your goal funds…')}</div>;
  }

  return (
    <div>
      <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--green)] font-semibold mb-1">
        {L('قرّر', 'Decide')}
      </div>
      <h1 className="font-serif text-2xl font-semibold text-[var(--ink)] mb-1">
        {L('صندوق الهدف', 'Goal Fund')}
      </h1>
      <p className="text-sm text-[var(--ink-2)] mb-6 max-w-xl">
        {L(
          'دفعة تملّك منزل، عيد ميلاد طفلك الثامن عشر، الحج، زواج — أيّ هدف له مبلغ وتاريخ. اضبطه مرّة، ادّخر شهرياً، وتتبّع بدقّة هل أنت متقدّم أم على الوتيرة أم متأخّر.',
          "A house down payment, your child's 18th birthday, Hajj, a wedding — any goal with a target and a date. Set it once, save monthly, and track exactly whether you're ahead, on pace, or behind."
        )}
      </p>

      {/* fund selector */}
      <div className="flex gap-2 flex-wrap mb-6">
        {funds.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFundId(f.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border ${
              activeFundId === f.id
                ? 'bg-[var(--ink)] text-[var(--surface-0)] border-[var(--ink)]'
                : 'bg-[var(--surface-card)] text-[var(--ink-2)] border-[var(--border-default)]'
            }`}
          >
            <span>{f.icon}</span>
            {f.name}
          </button>
        ))}
        <button
          onClick={() => setCreating(true)}
          className="px-4 py-2 rounded-full text-sm font-medium bg-[var(--green-bg)] text-[var(--green-dark)] border border-[var(--green-border)]"
        >
          {L('+ صندوق جديد', '+ New fund')}
        </button>
      </div>

      {creating && (
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 mb-6">
          <div className="flex gap-2 flex-wrap mb-4">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border ${
                  selectedPreset === p.id
                    ? 'bg-[var(--green-bg)] border-[var(--green)] text-[var(--green-dark)]'
                    : 'bg-[var(--surface-card)] border-[var(--border-medium)] text-[var(--ink-2)]'
                }`}
              >
                <span>{p.icon}</span>
                {ar ? PRESET_CHIPS_AR[p.id] ?? p.name : (p.id === 'child' ? 'Child at 18' : p.name.replace(' Fund', ''))}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[var(--green-bg)] flex items-center justify-center text-lg shrink-0">
              {icon}
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 font-serif text-lg font-semibold text-[var(--ink)] border-b-[1.5px] border-dashed border-[var(--border-medium)] focus:border-[var(--green)] outline-none pb-1 bg-transparent"
            />
          </div>

          <div className="inline-flex border border-[var(--border-default)] rounded-lg overflow-hidden mb-4">
            <button
              onClick={() => setMode('monthly')}
              className={`px-4 py-2 text-xs font-medium ${mode === 'monthly' ? 'bg-[var(--ink)] text-[var(--surface-0)]' : 'bg-[var(--surface-card)] text-[var(--ink-2)]'}`}
            >
              {L('أعرف كم أستطيع أن أدّخر شهرياً', 'I know what I can save monthly')}
            </button>
            <button
              onClick={() => setMode('target')}
              className={`px-4 py-2 text-xs font-medium ${mode === 'target' ? 'bg-[var(--ink)] text-[var(--surface-0)]' : 'bg-[var(--surface-card)] text-[var(--ink-2)]'}`}
            >
              {L('أعرف مبلغي المستهدَف', 'I know my target amount')}
            </button>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mb-1">
            {mode === 'monthly' ? (
              <div>
                <label className="text-xs text-[var(--muted)] block mb-1">{L('الادّخار الشهري (ريال)', 'Monthly saving (SAR)')}</label>
                <input
                  value={monthly}
                  onChange={(e) => setMonthly(e.target.value)}
                  className="w-full border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm outline-none"
                />
              </div>
            ) : (
              <div>
                <label className="text-xs text-[var(--muted)] block mb-1">{L('المبلغ المستهدَف عند الاستحقاق (ريال)', 'Target amount at maturity (SAR)')}</label>
                <input
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="w-full border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm outline-none"
                />
              </div>
            )}
            <div>
              <label className="text-xs text-[var(--muted)] block mb-1">{L('سنوات حتى الاستحقاق', 'Years to maturity')}</label>
              <input
                value={years}
                onChange={(e) => setYears(e.target.value)}
                className="w-full border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--muted)] block mb-1">{L('العائد السنوي المتوقّع (%)', 'Expected annual return (%)')}</label>
              <input
                value={roi}
                onChange={(e) => setRoi(e.target.value)}
                className="w-full border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm outline-none"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={createFund}
              className="text-sm bg-[var(--green-dark)] text-white rounded-lg px-4 py-2 font-medium"
            >
              {L('إنشاء الصندوق', 'Create fund')}
            </button>
            <button onClick={() => setCreating(false)} className="text-sm text-[var(--muted)] px-4 py-2">
              {L('إلغاء', 'Cancel')}
            </button>
          </div>
        </div>
      )}

      {!activeFund && !creating && (
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-8 text-center text-sm text-[var(--muted)]">
          {L('أنشئ صندوق هدفك الأول للبدء.', 'Create your first goal fund to get started.')}
        </div>
      )}

      {activeFund && (
        <>
          {/* hero row */}
          <div className="grid sm:grid-cols-[1.3fr_1fr] gap-3.5 mb-5">
            <div className="bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] rounded-2xl p-6 text-white relative overflow-hidden">
              <div className="text-xs tracking-[0.1em] uppercase text-[var(--gold)] mb-2">
                {L('الهدف عند الاستحقاق', 'Target at maturity')}
              </div>
              <div className="font-serif text-3xl font-bold mb-1">{money(activeFund.target_amount)}</div>
              <div className="text-xs text-white/50 mb-4">
                {icon || activeFund.icon} {activeFund.name}
              </div>
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10">
                <div>
                  <div className="text-[10px] text-white/45 mb-1">{L('الادّخار الشهري', 'Monthly saving')}</div>
                  <div className="text-sm font-medium">{money(activeFund.monthly_contribution)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-white/45 mb-1">{L('المدّة', 'Duration')}</div>
                  <div className="text-sm font-medium">{L(`${Math.round(activeFund.maturity_years * 12)} شهراً`, `${Math.round(activeFund.maturity_years * 12)} months`)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-white/45 mb-1">{L('العائد المتوقّع', 'Expected return')}</div>
                  <div className="text-sm font-medium">{activeFund.expected_return}%{L('/سنة', '/yr')}</div>
                </div>
              </div>
            </div>

            <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 flex flex-col items-center justify-center">
              <div className="text-[11px] tracking-[0.08em] uppercase text-[var(--muted)] mb-3">{L('التقدّم الحالي', 'Current progress')}</div>
              <div className="relative w-36 h-36">
                <svg viewBox="0 0 150 150" className="w-full h-full -rotate-90">
                  <circle cx="75" cy="75" r="60" fill="none" stroke="var(--surface-1)" strokeWidth="12" />
                  <circle
                    cx="75" cy="75" r="60" fill="none" stroke="var(--green)" strokeWidth="12" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 60}
                    strokeDashoffset={2 * Math.PI * 60 * (1 - Math.min(1, pctToGoal / 100))}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="font-serif text-2xl font-bold text-[var(--green-dark)]">{pctToGoal.toFixed(1)}%</div>
                  <div className="text-[10px] text-[var(--muted)]">{L('من الهدف', 'of goal')}</div>
                </div>
              </div>
              <div className={`mt-3 text-xs font-medium px-3.5 py-1.5 rounded-full ${STATUS_CLASS[status]}`}>
                {ar ? STATUS_LABEL_AR[status] : STATUS_LABEL[status]}
              </div>
            </div>
          </div>

          <div className="text-xs text-[var(--green-dark)] font-medium mb-5 -mt-2">
            {activeFund.expected_return > 0 ? (
              L(
                `${money(simpleSum)} من مساهماتك أنت، إضافةً إلى ${money(bonus)} من عائد الـ${activeFund.expected_return}% — تلك هي قوّة استثماره، لا مجرّد ادّخاره.`,
                `${money(simpleSum)} from your own contributions, plus ${money(bonus)} from the ${activeFund.expected_return}% return — that's the power of investing it, not just saving it.`
              )
            ) : (
              L('هذا إجمالي ادّخار صِرف — اضبط عائداً أعلى من 0% لترى ما يمكن أن يضيفه استثمار هذا الصندوق.', 'This is a pure savings total — set a return above 0% to see what investing this fund could add.')
            )}
          </div>

          {/* trajectory chart */}
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 mb-5">
            <div className="text-sm font-medium text-[var(--ink)]">{L('صندوقك عبر الزمن', 'Your fund over time')}</div>
            <div className="text-xs text-[var(--muted)] mb-1">
              {L('الخطّ المتقطّع هو خطّتك. والخطّ المتّصل هو ما ادّخرته فعلاً.', "The dashed line is your plan. The solid line is what you've actually saved.")}
            </div>
            <div className="h-72 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid stroke="var(--chart-grid)" />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--muted)' }} interval={Math.max(0, Math.floor(chartData.length / 8) - 1)} angle={-45} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} tickFormatter={(v) => ar ? `${fmtCompact(Number(v))} ريال` : `SAR ${fmtCompact(Number(v))}`} />
                  <Tooltip
                    formatter={(value, name) => {
                      if (value == null) return ['—', name];
                      return [money(Number(value)), name];
                    }}
                  />
                  <Line type="monotone" dataKey="cumTarget" name={L('الهدف', 'Target')} stroke="var(--ink)" strokeWidth={2} strokeDasharray="5 4" dot={false} />
                  <Line type="monotone" dataKey="cumActual" name={L('الفعلي', 'Actual')} stroke="var(--green)" strokeWidth={2.5} dot={false} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* monthly tracker */}
          <div className="mb-5">
            <div className="font-serif text-lg font-medium text-[var(--ink)] mb-1">{L('المتتبّع الشهري', 'Monthly tracker')}</div>
            <div className="text-xs text-[var(--muted)] mb-3">
              {L('سجّل ما ادّخرته فعلاً. يتتبّع مال مايند الفرق تلقائياً.', 'Log what you actually saved. MalMind tracks the difference automatically.')}
            </div>
            <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl overflow-hidden">
              <div className="grid grid-cols-[36px_1fr_90px_90px_80px_80px] gap-2.5 px-4 py-2.5 bg-[var(--surface-0)] text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                <span>#</span>
                <span>{L('الشهر', 'Month')}</span>
                <span>{L('الهدف', 'Target')}</span>
                <span>{L('الفعلي', 'Actual')}</span>
                <span className="text-end">{L('الفرق', 'Diff.')}</span>
                <span className="text-end">{L('التراكمي', 'Accum.')}</span>
              </div>
              {series.slice(0, visibleMonths).map((s) => {
                const hasActual = s.actualLogged !== null;
                const diff = hasActual ? s.actualLogged! - s.target : null;
                const accumDiff = s.cumActual - s.cumTarget;
                return (
                  <div key={s.m} className="grid grid-cols-[36px_1fr_90px_90px_80px_80px] gap-2.5 px-4 py-2.5 items-center text-xs border-t border-[var(--border-faint)]">
                    <span className="text-[var(--muted)]">{s.m}</span>
                    <span className="text-[var(--ink)] font-medium">{monthLabel(startDate, s.m - 1, locale)}</span>
                    <span className="text-[var(--ink-2)]">{money(s.target)}</span>
                    <input
                      type="text"
                      defaultValue={hasActual ? fmt(s.actualLogged!) : ''}
                      placeholder="—"
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value.replace(/[^0-9.]/g, ''));
                        if (!isNaN(val)) logActual(s.m, val);
                      }}
                      className="w-full bg-[var(--surface-0)] border border-[var(--border-default)] rounded-md px-2 py-1 text-xs outline-none focus:border-[var(--green)]"
                    />
                    <span className={`text-end font-semibold ${diff === null ? 'text-[var(--muted)]' : diff >= 0 ? 'text-[var(--green-dark)]' : 'text-[var(--red)]'}`}>
                      {diff === null ? '—' : `${diff >= 0 ? '+' : ''}${fmt(diff)}`}
                    </span>
                    <span className={`text-end ${!hasActual ? 'text-[var(--muted)]' : accumDiff >= 0 ? 'text-[var(--green-dark)]' : 'text-[var(--red)]'}`}>
                      {hasActual ? `${accumDiff >= 0 ? '+' : ''}${fmt(accumDiff)}` : '—'}
                    </span>
                  </div>
                );
              })}
              {visibleMonths < series.length && (
                <button
                  onClick={() => setVisibleMonths((v) => v + 24)}
                  className="w-full text-center py-3 text-xs font-medium text-[var(--green-dark)] border-t border-[var(--border-faint)]"
                >
                  {L('عرض أشهر أكثر', 'Show more months')}
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mb-5">
            <button onClick={() => deleteFund(activeFund.id)} className="text-xs text-[var(--red-dark-text)]">
              {L('احذف هذا الصندوق', 'Delete this fund')}
            </button>
          </div>

          {/* nudge */}
          <div className="flex gap-3 items-start bg-[var(--gold-bg)] border border-[var(--gold)] rounded-xl p-4">
            <div className="w-7 h-7 rounded-full bg-[var(--gold)] flex items-center justify-center font-serif font-semibold text-white text-sm shrink-0">
              M
            </div>
            <div className="text-xs text-[var(--gold-text-body)] leading-relaxed">
              <strong className="text-[var(--gold-text-strong)]">{L('هذا الصندوق الآن جزء من خطتك.', 'This fund is now part of your plan.')}</strong> {L(
                'يتتبّعه مال مايند إلى جانب كل شيء آخر — وإن كان قرارٌ كبير يعني تفويت شهر هنا، سأريك ما يكلّفه ذلك مقابل هذا الهدف بالذات، بهذه المصطلحات بالذات.',
                "MalMind tracks it alongside everything else — if a big decision would mean skipping a month here, I'll show you what that costs against this exact goal, in these exact terms."
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
