'use client';

// "Money on the way": how much of this year's income is still ahead of
// you, month by month until December - by source - and what realistically
// survives it under three consumption scenarios (lean / current pace /
// heavy), because nobody keeps 100% of what's coming.

import { useEffect, useMemo, useState } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { useProfileContext } from '@/components/shared/AppShell';
import { useLocale } from '@/lib/i18n/LocaleProvider';

function fmt(n: number) {
  return Math.round(n).toLocaleString();
}

export default function IncomeAhead() {
  const supabase = createClient();
  const { openEditProfile } = useProfileContext();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const money = (n: number) => (ar ? `${fmt(n)} ريال` : `SAR ${fmt(n)}`);
  const MONTHS = useMemo(
    () => Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat(ar ? 'ar' : 'en', { month: 'short' }).format(new Date(2020, i, 1))),
    [ar]
  );
  const [loading, setLoading] = useState(true);
  const [salary, setSalary] = useState(0);
  const [sideIncome, setSideIncome] = useState(0);
  const [avgSpend, setAvgSpend] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: profile }, { data: entries }] = await Promise.all([
        supabase.from('profiles').select('monthly_income, side_income, monthly_expense').eq('id', user.id).single(),
        supabase.from('income_entries').select('year, month, spending').eq('user_id', user.id).order('year', { ascending: true }).order('month', { ascending: true }),
      ]);

      setSalary(Number(profile?.monthly_income) || 0);
      setSideIncome(Number(profile?.side_income) || 0);

      const recent = (entries ?? []).slice(-6).map((e) => Number(e.spending)).filter((v) => v > 0);
      if (recent.length > 0) setAvgSpend(recent.reduce((a, b) => a + b, 0) / recent.length);
      else if (profile?.monthly_expense != null && Number(profile.monthly_expense) > 0) setAvgSpend(Number(profile.monthly_expense));
      else setAvgSpend(null);

      setLoading(false);
    })();
  }, [supabase]);

  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const monthIdx = now.getMonth(); // 0-based; current month counts as "ahead"
  const monthsAhead = 12 - monthIdx;

  const totalMonthly = salary + sideIncome;
  const aheadTotal = totalMonthly * monthsAhead;
  const annualTotal = totalMonthly * 12;
  const receivedSoFar = totalMonthly * monthIdx;

  const scenarios = useMemo(() => {
    if (avgSpend == null || totalMonthly <= 0) return null;
    const make = (label: string, spend: number, note: string) => ({
      label,
      spend,
      keptMonthly: Math.max(0, totalMonthly - spend),
      keptByDec: Math.max(0, totalMonthly - spend) * monthsAhead,
      note,
    });
    return [
      make(L('أشهر مقتصِدة', 'Lean months'), avgSpend * 0.85, L('إنفاق أقلّ 15% من متوسّطك', 'spending 15% below your average')),
      make(L('وتيرتك الحالية', 'Your current pace'), avgSpend, L('متوسّط إنفاقك الحقيقي', 'your real average spending')),
      make(L('أشهر مثقَلة', 'Heavy months'), avgSpend * 1.15, L('إنفاق أعلى 15% من متوسّطك', 'spending 15% above your average')),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avgSpend, totalMonthly, monthsAhead, ar]);

  const chartData = useMemo(() => {
    let cumIn = 0;
    let cumLean = 0, cumCurrent = 0, cumHeavy = 0;
    return MONTHS.map((label, i) => {
      cumIn += totalMonthly;
      const isAhead = i >= monthIdx;
      if (isAhead && scenarios) {
        cumLean += scenarios[0].keptMonthly;
        cumCurrent += scenarios[1].keptMonthly;
        cumHeavy += scenarios[2].keptMonthly;
      }
      return {
        label,
        incoming: isAhead ? totalMonthly : 0,
        received: isAhead ? 0 : totalMonthly,
        cumulativeIncome: cumIn,
        keptLean: isAhead && scenarios ? Math.round(cumLean) : null,
        keptCurrent: isAhead && scenarios ? Math.round(cumCurrent) : null,
        keptHeavy: isAhead && scenarios ? Math.round(cumHeavy) : null,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalMonthly, monthIdx, scenarios, MONTHS]);

  if (loading) {
    return <div className="text-sm text-[var(--muted)]">{L('جارٍ التحميل…', 'Loading…')}</div>;
  }

  if (!totalMonthly) {
    return (
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-8 text-center">
        <p className="text-sm text-[var(--ink-2)] mb-4">{L('حدّد دخلك الشهري لترى ما لا يزال في الطريق هذا العام.', "Set your monthly income to see what's still on the way this year.")}</p>
        <button onClick={openEditProfile} className="text-sm bg-[var(--green-dark)] text-white rounded-lg px-4 py-2 font-medium">
          {L('حدّد دخلك ←', 'Set your income →')}
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* headline tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] rounded-xl p-4">
          <div className="text-[10px] text-[var(--gold)] mb-1">{L(`لا يزال في الطريق في ${currentYear}`, `Still on the way in ${currentYear}`)}</div>
          <div className="font-serif text-xl font-bold text-white">{money(aheadTotal)}</div>
          <div className="text-[10px] text-white/50 mt-0.5">{MONTHS[monthIdx]}–{MONTHS[11]} · {L(`${monthsAhead} دفعة`, `${monthsAhead} payment${monthsAhead === 1 ? '' : 's'}`)}</div>
        </div>
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-4">
          <div className="text-[10px] text-[var(--muted)] mb-1">{L('ما تجنيه سنوياً', 'You bring in yearly')}</div>
          <div className="font-serif text-xl font-bold text-[var(--ink)]">{money(annualTotal)}</div>
        </div>
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-4">
          <div className="text-[10px] text-[var(--muted)] mb-1">{L('المستلَم هذا العام', 'Already received this year')}</div>
          <div className="font-serif text-xl font-bold text-[var(--ink)]">{money(receivedSoFar)}</div>
        </div>
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-4">
          <div className="text-[10px] text-[var(--muted)] mb-1">{L('يصل شهرياً', 'Arriving monthly')}</div>
          <div className="font-serif text-xl font-bold text-[var(--green-dark)]">{money(totalMonthly)}</div>
        </div>
      </div>

      {/* sources */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-5">
        <div className="text-[11px] tracking-[0.1em] uppercase text-[var(--muted)] mb-3">{L('من أين يأتي التدفّق', 'Where the inflow comes from')}</div>
        <div className="flex flex-col gap-2">
          <SourceBar label={L('الراتب', 'Salary')} amount={salary} total={totalMonthly} color="#1D9E75" ar={ar} />
          {sideIncome > 0 ? (
            <SourceBar label={L('الدخل الجانبي', 'Side income')} amount={sideIncome} total={totalMonthly} color="#4A78C4" ar={ar} />
          ) : (
            <p className="text-[11px] text-[var(--muted)]">
              {L(
                '100% من تدفّقك يعتمد على مصدر واحد. أضِف دخلاً جانبياً في تعديل الملف الشخصي حين يوجد — وراجِع صفحة المخاطر لتعرف لماذا يهمّ ذلك.',
                '100% of your inflow rides on one source. Add a side income in Edit Profile when it exists — and see the Risks page for why it matters.'
              )}
            </p>
          )}
        </div>
      </div>

      {/* the chart */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-5">
        <div className="text-sm font-medium text-[var(--ink)] mb-1">{L(`${currentYear}، شهراً بشهر`, `${currentYear}, month by month`)}</div>
        <div className="text-xs text-[var(--muted)] mb-3">
          {L(
            'الأعمدة دفعات — الرمادي وصل بالفعل، والأخضر لا يزال قادماً. تُظهر الخطوط ما يتراكم واقعياً من المال القادم تحت ثلاثة سيناريوهات إنفاق.',
            'Bars are payments — grey already landed, green still ahead. The lines show what realistically piles up from the money ahead under three spending scenarios.'
          )}
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid stroke="var(--border-default)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}K`} />
              <Tooltip formatter={(v, name) => (v == null ? ['—', String(name)] : [money(Number(v)), String(name)])} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="received" name={L('المستلَم بالفعل', 'Already received')} stackId="in" fill="#8a99a8" radius={[3, 3, 0, 0]} />
              <Bar dataKey="incoming" name={L('لا يزال قادماً', 'Still ahead')} stackId="in" fill="#1D9E75" radius={[3, 3, 0, 0]} />
              {scenarios && (
                <>
                  <Line type="monotone" dataKey="keptLean" name={L('المتراكم — مقتصِد', 'Piled up — lean')} stroke="#4A78C4" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="keptCurrent" name={L('المتراكم — الوتيرة الحالية', 'Piled up — current pace')} stroke="#D89A3E" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="keptHeavy" name={L('المتراكم — مثقَل', 'Piled up — heavy')} stroke="#C0504D" strokeWidth={2} strokeDasharray="4 3" dot={false} />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* scenarios */}
      {scenarios ? (
        <div className="grid sm:grid-cols-3 gap-3 mb-5">
          {scenarios.map((s, i) => (
            <div key={s.label} className={`rounded-2xl p-5 border ${i === 1 ? 'border-[var(--green-border)] bg-[var(--green-bg)]' : 'border-[var(--border-default)] bg-[var(--surface-card)]'}`}>
              <div className="text-[11px] tracking-[0.08em] uppercase text-[var(--muted)] mb-2">{s.label}</div>
              <div className={`font-serif text-2xl font-bold mb-1 ${i === 1 ? 'text-[var(--green-dark)]' : 'text-[var(--ink)]'}`}>
                {money(s.keptByDec)}
              </div>
              <div className="text-xs text-[var(--ink-2)] leading-relaxed">
                {L(
                  `متراكماً بحلول ${MONTHS[11]} — مع الاحتفاظ بـ ${money(s.keptMonthly)}/شهر بـ${s.note} (${money(s.spend)}/شهر).`,
                  `piled up by December — keeping ${money(s.keptMonthly)}/month with ${s.note} (${money(s.spend)}/mo).`
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-5 text-xs text-[var(--muted)]">
          {L(
            'سجّل بضعة أشهر من الإنفاق (هنا في تبويب التسجيل، أو في أرقامي المالية) وتُضيف هذه الشاشة ثلاثة سيناريوهات احتفاظ واقعية — فلا أحد يحتفظ بـ 100% ممّا يأتيه.',
            "Log a few months of spending (here in the Log tab, or in My Financial Numbers) and this view adds three realistic keep-scenarios — because nobody keeps 100% of what's coming."
          )}
        </div>
      )}

      <div className="flex gap-3 items-start bg-[#FAF6EA] border border-[var(--gold)] rounded-xl p-4">
        <div className="w-7 h-7 rounded-full bg-[var(--gold)] flex items-center justify-center font-serif font-semibold text-white text-sm shrink-0">M</div>
        <div className="text-xs text-[#5A4A1A] leading-relaxed">
          <strong className="text-[#3A2F0A]">{L('هذا وقود التخطيط.', 'This is planning fuel.')}</strong> {L(
            'المال الذي لا يزال أمامك هذا العام هو أكثر مالك قابليةً للقرار — لم يصل بعد، فلم يطالب به شيء بعد. وجِّهه بقصد: صندوق هدف، خطة استثمار، دفعة سداد — قبل أن تصل الأشهر وتوجّهه بدلاً عنك.',
            "The money still ahead of you this year is the most decidable money you have — it hasn't arrived, so nothing has claimed it yet. Route it on purpose: a goal fund, an investment plan, a payoff push — before the months arrive and route it for you."
          )}
        </div>
      </div>
    </div>
  );
}

function SourceBar({ label, amount, total, color, ar }: { label: string; amount: number; total: number; color: string; ar: boolean }) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  const amt = `${Math.round(amount).toLocaleString()}`;
  return (
    <div className="grid grid-cols-[90px_1fr_auto] gap-3 items-center">
      <span className="text-xs font-medium text-[var(--ink)]">{label}</span>
      <div className="h-5 bg-[var(--surface-1)] rounded overflow-hidden">
        <div className="h-full rounded flex items-center ps-2 text-[10px] text-white font-medium" style={{ width: `${Math.max(pct, 4)}%`, background: color }}>
          {pct > 20 ? `${pct.toFixed(0)}%` : ''}
        </div>
      </div>
      <span className="text-[11px] text-[var(--muted)] whitespace-nowrap">{ar ? `${amt} ريال/شهر` : `SAR ${amt}/mo`}</span>
    </div>
  );
}
