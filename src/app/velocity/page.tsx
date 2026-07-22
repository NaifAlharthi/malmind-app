'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { useProfileContext } from '@/components/shared/AppShell';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import {
  MILESTONES, FOCUS_MILESTONES, SCENARIOS,
  computeDisposable, scenarioDisposable, timeToTargetMonths, monthsToWords, scenarioLabel,
} from '@/lib/velocity';

function fmt(n: number) {
  return Math.round(n).toLocaleString();
}

function fmtCompact(n: number) {
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 1 : 1) + 'M';
  if (n >= 1e3) return Math.round(n / 1e3) + 'K';
  return String(Math.round(n));
}

type Unit = 'months' | 'years';

export default function VelocityPage() {
  const router = useRouter();
  const supabase = createClient();
  const { openEditProfile } = useProfileContext();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const money = (n: number) => (ar ? `${fmt(n)} ريال` : `SAR ${fmt(n)}`);

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [salary, setSalary] = useState(0);
  const [sideIncome, setSideIncome] = useState('0');
  const [expense, setExpense] = useState('0');

  const [activeScenarioKeys, setActiveScenarioKeys] = useState<string[]>(SCENARIOS.map((s) => s.key));
  const [unit, setUnit] = useState<Unit>('months');
  const [focusTarget, setFocusTarget] = useState(1000000);
  const [reflection, setReflection] = useState<'yes' | 'no' | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('monthly_income, side_income, monthly_expense')
        .eq('id', user.id)
        .single();

      if (profile) {
        setSalary(Number(profile.monthly_income) || 0);
        if (profile.side_income != null) setSideIncome(String(profile.side_income));
        if (profile.monthly_expense != null) setExpense(String(profile.monthly_expense));
      }
      setLoading(false);
    })();
  }, [supabase, router]);

  async function saveAssumptions() {
    if (!userId) return;
    setSaving(true);
    setSaved(false);
    await supabase
      .from('profiles')
      .update({
        side_income: parseFloat(sideIncome) || 0,
        monthly_expense: parseFloat(expense) || 0,
      })
      .eq('id', userId);
    setSaving(false);
    setSaved(true);
  }

  const disposable = computeDisposable(salary, parseFloat(sideIncome) || 0, parseFloat(expense) || 0);
  const baseDisposable = scenarioDisposable(disposable, SCENARIOS[0]);

  const chartData = useMemo(
    () =>
      MILESTONES.map((m) => {
        const point: Record<string, number | string | null> = { milestone: fmtCompact(m), milestoneFull: money(m) };
        for (const sc of SCENARIOS) {
          if (!activeScenarioKeys.includes(sc.key)) continue;
          const d = scenarioDisposable(disposable, sc);
          const months = timeToTargetMonths(m, d);
          if (!Number.isFinite(months)) {
            point[sc.key] = null;
          } else {
            const val = unit === 'months' ? months : months / 12;
            point[sc.key] = Number(val.toFixed(unit === 'months' ? 1 : 2));
          }
        }
        return point;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [disposable, activeScenarioKeys, unit, ar]
  );

  function toggleScenario(key: string) {
    if (key === 'none') return; // always shown, can't be turned off
    setActiveScenarioKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
    setReflection(null);
  }

  const baseMonths = timeToTargetMonths(focusTarget, baseDisposable);
  const activeMortgages = SCENARIOS.filter((s) => s.key !== 'none' && activeScenarioKeys.includes(s.key));

  if (loading) {
    return <div className="text-sm text-[var(--muted)]">{L('جارٍ التحميل…', 'Loading…')}</div>;
  }

  if (!salary) {
    return (
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-8 text-center">
        <p className="text-sm text-[var(--ink-2)] mb-4">
          {L('حدّد دخلك الشهري في ملفّك الشخصي لترى سرعة مالك.', 'Set your monthly income in your profile to see your velocity of money.')}
        </p>
        <button
          onClick={openEditProfile}
          className="text-sm bg-[var(--green-dark)] text-white rounded-lg px-4 py-2 font-medium"
        >
          {L('حدّد دخلك ←', 'Set your income →')}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--blue)] font-semibold mb-1">
        {L('فكّر', 'Think')}
      </div>
      <h1 className="font-serif text-2xl font-semibold text-[var(--ink)] mb-1">
        {L('سرعة المال', 'Velocity of Money')}
      </h1>
      <p className="text-sm text-[var(--ink-2)] mb-6 max-w-xl">
        {L(
          'الثروة معاد صياغتها كزمن — كم تستغرق كل محطّة بوتيرة ادّخارك الحقيقية، وما الذي يتغيّر حين تضيف الحياة رهناً عقارياً.',
          'Wealth reframed as time — how long each milestone takes at your real pace of saving, and what changes when life adds a mortgage.'
        )}
      </p>

      {/* inputs */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-5">
        <div className="text-[11px] tracking-[0.1em] uppercase text-[var(--muted)] mb-4">
          {L('أرقامك الشهرية', 'Your monthly numbers')}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">{L('الراتب الأساسي', 'Main salary')}</label>
            <div className="border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm bg-[var(--surface-0)] text-[var(--ink-2)]">
              {money(salary)}
            </div>
          </div>
          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">{L('الدخل الجانبي', 'Side income')}</label>
            <div className="flex items-center border border-[var(--border-default)] rounded-lg px-3 focus-within:border-[var(--green)]">
              <span className="text-xs text-[var(--muted)] me-1">{L('ريال', 'SAR')}</span>
              <input
                value={sideIncome}
                onChange={(e) => setSideIncome(e.target.value)}
                className="w-full py-2 text-sm outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">{L('متوسط الإنفاق الشهري', 'Average monthly expense')}</label>
            <div className="flex items-center border border-[var(--border-default)] rounded-lg px-3 focus-within:border-[var(--green)]">
              <span className="text-xs text-[var(--muted)] me-1">{L('ريال', 'SAR')}</span>
              <input
                value={expense}
                onChange={(e) => setExpense(e.target.value)}
                className="w-full py-2 text-sm outline-none"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap pt-3 border-t border-[var(--border-default)]">
          <button
            onClick={saveAssumptions}
            disabled={saving}
            className="text-sm bg-[var(--green-dark)] text-white rounded-lg px-4 py-2 font-medium disabled:opacity-50"
          >
            {saving ? L('جارٍ الحفظ…', 'Saving…') : L('حفظ الافتراضات', 'Save assumptions')}
          </button>
          {saved && <span className="text-xs text-[var(--green)]">{L('حُفظ في ملفّك الشخصي.', 'Saved to your profile.')}</span>}
          <span className="text-sm text-[var(--ink-2)]">
            {L('المتاح كل شهر:', 'Disposable each month:')} <strong className="text-[var(--green)] font-serif text-base">{money(disposable)}</strong>
          </span>
          <span className="text-xs text-[var(--muted)]">
            {L('الراتب يأتي من ملفّك الشخصي — عدّله من الصفحة الرئيسية.', 'Salary comes from your profile — edit it from the home page.')}
          </span>
        </div>
      </div>

      {/* mortgage toggles */}
      <div className="flex items-center gap-2 flex-wrap mb-5">
        <span className="text-xs text-[var(--ink-2)] me-1">{L('قارِن مع رهن عقاري:', 'Compare with a mortgage:')}</span>
        {SCENARIOS.map((sc) => (
          <button
            key={sc.key}
            onClick={() => toggleScenario(sc.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
              activeScenarioKeys.includes(sc.key)
                ? 'bg-[var(--ink)] border-[var(--ink)] text-white'
                : 'bg-[var(--surface-card)] border-[var(--border-medium)] text-[var(--ink-2)]'
            } ${sc.key === 'none' ? 'cursor-default' : ''}`}
          >
            <span className="w-2 h-2 rounded-sm" style={{ background: sc.color }} />
            {scenarioLabel(sc, locale)}
          </button>
        ))}
      </div>

      {/* chart */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 mb-5">
        <div className="flex justify-between items-start mb-1">
          <div>
            <div className="text-sm font-medium text-[var(--ink)]">{L('الوقت للوصول إلى كل محطّة', 'Time to reach each milestone')}</div>
            <div className="text-xs text-[var(--muted)]">{L('كل عمود هو المدّة التي يستغرقها ذلك الهدف بوتيرتك', 'Each bar is how long that target takes at your pace')}</div>
          </div>
          <div className="inline-flex border border-[var(--border-default)] rounded-lg overflow-hidden shrink-0">
            <button
              onClick={() => setUnit('months')}
              className={`px-3 py-1.5 text-xs font-medium ${unit === 'months' ? 'bg-[var(--ink)] text-[var(--surface-0)]' : 'bg-[var(--surface-card)] text-[var(--ink-2)]'}`}
            >
              {L('أشهر', 'Months')}
            </button>
            <button
              onClick={() => setUnit('years')}
              className={`px-3 py-1.5 text-xs font-medium ${unit === 'years' ? 'bg-[var(--ink)] text-[var(--surface-0)]' : 'bg-[var(--surface-card)] text-[var(--ink-2)]'}`}
            >
              {L('سنوات', 'Years')}
            </button>
          </div>
        </div>
        <div className="h-80 mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid stroke="var(--chart-grid)" />
              <XAxis dataKey="milestone" tick={{ fontSize: 10, fill: 'var(--muted)' }} />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--muted)' }}
                label={{ value: unit === 'months' ? L('أشهر', 'Months') : L('سنوات', 'Years'), angle: -90, position: 'insideLeft', fontSize: 11, fill: 'var(--muted)' }}
              />
              <Tooltip
                formatter={(value, name) => {
                  if (value == null) return [L('بعيد المنال', 'out of reach'), name];
                  return [`${value} ${unit === 'months' ? L('شهر', 'months') : L('سنة', 'years')}`, name];
                }}
              />
              {SCENARIOS.filter((s) => activeScenarioKeys.includes(s.key)).map((s) => (
                <Bar key={s.key} dataKey={s.key} name={scenarioLabel(s, locale)} fill={s.color} radius={[3, 3, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* focus target */}
      <div className="flex items-center gap-3 flex-wrap mb-5">
        <span className="text-sm text-[var(--ink-2)]">{L('ركّز على هدف:', 'Focus on a target:')}</span>
        <div className="flex gap-1.5 flex-wrap">
          {FOCUS_MILESTONES.map((m) => (
            <button
              key={m}
              onClick={() => { setFocusTarget(m); setReflection(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs border ${
                focusTarget === m
                  ? 'bg-[var(--green-bg)] border-[var(--green)] text-[var(--green-dark)] font-medium'
                  : 'bg-[var(--surface-card)] border-[var(--border-medium)] text-[var(--ink-2)]'
              }`}
            >
              {money(m)}
            </button>
          ))}
        </div>
      </div>

      {/* verdict */}
      <div className="bg-[var(--surface-card)] border-[1.5px] border-[var(--green)] rounded-2xl p-6">
        <div className="text-[11px] tracking-[0.1em] uppercase text-[var(--green)] mb-3">{L('فحص الواقع', 'The reality check')}</div>
        <div className="font-serif text-lg text-[var(--ink)] leading-relaxed mb-2">
          {L('بوتيرتك الحالية، الوصول إلى', 'At your current pace, reaching')} <strong className="text-[var(--green-dark)] font-semibold">{money(focusTarget)}</strong>{' '}
          {L('يستغرق', 'takes')} <strong className="text-[var(--green-dark)] font-semibold">{monthsToWords(baseMonths, locale)}</strong>.
        </div>
        <div className="text-sm text-[var(--ink-2)] leading-relaxed mb-5">
          {activeMortgages.length > 0 ? (
            <>
              {L('أضِف رهناً عقارياً فيمتدّ الهدف نفسه أبعد:', 'Add a mortgage and the same goal stretches further:')}{' '}
              {activeMortgages.map((sc, i) => {
                const m = timeToTargetMonths(focusTarget, scenarioDisposable(disposable, sc));
                return (
                  <span key={sc.key}>
                    <span className="inline-block bg-[var(--surface-0)] border border-[var(--border-default)] rounded px-1.5 py-0.5 font-medium text-[var(--ink)]">
                      {scenarioLabel(sc, locale)}: {monthsToWords(m, locale)}
                    </span>
                    {i < activeMortgages.length - 1 ? ' ' : ''}
                  </span>
                );
              })}
              . {L('كلّما كبُر التزامك الشهري، تباطأ تراكم ثروتك فعلاً — وإن لم يبدُ الأمر كذلك يوماً بيوم.', "The bigger your monthly commitment, the slower your wealth actually accumulates — even though it doesn't feel that way day to day.")}
            </>
          ) : (
            <>
              {L('يفترض هذا أنك تدّخر كل ريال من الدخل المتاح — وهو ما نادراً ما يحدث في الواقع. الرقم الحقيقي أطول دائماً تقريباً.', 'This assumes you save every riyal of disposable income — which rarely happens in real life. The real number is almost always longer.')}
            </>
          )}
        </div>

        <div className="text-sm font-medium text-[var(--ink)] mb-3">{L('هل هذا ما توقّعته؟', 'Is this what you expected?')}</div>
        <div className="flex gap-2.5 flex-wrap mb-4">
          <button
            onClick={() => setReflection('yes')}
            className="px-4 py-2.5 rounded-lg text-xs font-medium border border-[var(--border-medium)] hover:bg-[var(--green-bg)] hover:border-[var(--green)] hover:text-[var(--green-dark)] transition-colors"
          >
            {L('نعم — أنا على المسار', "Yes — I'm on track")}
          </button>
          <button
            onClick={() => setReflection('no')}
            className="px-4 py-2.5 rounded-lg text-xs font-medium border border-[var(--border-medium)] hover:bg-[var(--gold-bg)] hover:border-[var(--amber-2)] hover:text-[var(--gold-text-alt2)] transition-colors"
          >
            {L('لا — هذا أطول ممّا ظننت', "No — that's longer than I thought")}
          </button>
        </div>

        {reflection && (
          <div className="pt-4 border-t border-[var(--border-default)]">
            {reflection === 'yes' ? (
              <>
                <div className="text-sm text-[var(--ink-2)] leading-relaxed mb-4">
                  {L(
                    'جيّد — هذا يعني أن توقّعاتك متجذّرة في الواقع، وهذا وحده يضعك متقدّماً على أغلب الناس. حافظ على وتيرتك واحمِ دخلك المتاح. الخطر الأساسي الآن ليس السرعة، بل ',
                    'Good — that means your expectations are grounded in reality, which already puts you ahead of most people. Keep your pace steady and protect your disposable income. The main risk now isn\'t speed, it\'s '
                  )}<strong className="text-[var(--ink)] font-medium">{L('تضخّم نمط الحياة', 'lifestyle creep')}</strong>{L(' — أن تدع النفقات ترتفع كلّما ارتفع الدخل.', ' — letting expenses rise as income does.')}
                </div>
                <div className="flex flex-col gap-2">
                  <LeverRow icon="🔒" title={L('ثبّت وتيرتك', 'Lock in your pace')} desc={L('أتمتة المبلغ المتاح إلى الادّخار قبل أن تتمكّن من إنفاقه', 'Automate the disposable amount into savings before you can spend it')} impact={L('ابقَ على المسار', 'Stay on track')} />
                  <LeverRow icon="📊" title={L('اضبط تنبيه تضخّم نمط الحياة', 'Set a lifestyle-creep alert')} desc={L('احصل على تحذير إن ارتفعت النفقات أسرع من الدخل', 'Get warned if expenses climb faster than income')} impact={L('احمِ السرعة', 'Protect speed')} />
                </div>
              </>
            ) : (
              <>
                <div className="text-sm text-[var(--ink-2)] leading-relaxed mb-4">
                  {L(
                    'تلك الفجوة بين ما توقّعته وما هو حقيقي هي أثمن ما يمكن أن تريه هذه الأداة. الخبر الجيّد: الجدول الزمني ليس ثابتاً — ينحني بسرعة حين تسحب الروافع الصحيحة. إليك ما سيغيّر مسارك نحو ',
                    "That gap between what you expected and what's real is the most valuable thing this tool can show you. The good news: the timeline isn't fixed — it bends fast when you pull the right levers. Here's what would change your trajectory toward "
                  )}<strong className="text-[var(--ink)] font-medium">{money(focusTarget)}</strong>:
                </div>
                <div className="flex flex-col gap-2">
                  <LeverRow
                    icon="📈" title={L('زِد الدخل 20%', 'Grow income by 20%')} desc={L('علاوة، أو دخل جانبي أكبر، أو مهارة جديدة', 'A raise, a bigger side income, or a new skill')}
                    impact={L(`~${monthsToWords(baseMonths - timeToTargetMonths(focusTarget, baseDisposable * 1.2), locale)} أقرب`, `~${monthsToWords(baseMonths - timeToTargetMonths(focusTarget, baseDisposable * 1.2))} sooner`)}
                  />
                  <LeverRow icon="✂️" title={L('اقتطع 1,000 ريال من الإنفاق الشهري', 'Cut SAR 1,000 from monthly expense')} desc={L('وجِّهها مباشرةً إلى بناء الثروة', 'Redirect it straight into wealth-building')} impact={L('وتيرة أسرع', 'Faster pace')} />
                  <LeverRow icon="🏡" title={L('أعِد التفكير في حجم الرهن', 'Rethink the mortgage size')} desc={L('قسطٌ أصغر يُبقي مزيداً من الدخل المتاح يعمل لصالحك', 'A smaller installment keeps more disposable income working for you')} impact={L('أثر كبير', 'Big effect')} />
                  <LeverRow icon="💬" title={L('ابنِ خطّة مع مستشارك', 'Build a plan with your advisor')} desc={L('دع مال مايند يرسم مساراً واقعياً إلى رقمك', 'Let MalMind map a realistic path to your number')} impact={L('مخصّص', 'Personalized')} />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LeverRow({ icon, title, desc, impact }: { icon: string; title: string; desc: string; impact: string }) {
  return (
    <div className="flex items-center gap-3 bg-[var(--surface-0)] border border-[var(--border-default)] rounded-lg px-4 py-3 hover:border-[var(--green)] transition-colors">
      <span className="text-lg">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[var(--ink)]">{title}</div>
        <div className="text-xs text-[var(--muted)]">{desc}</div>
      </div>
      <span className="text-xs font-semibold text-[var(--green)] whitespace-nowrap">{impact}</span>
    </div>
  );
}
