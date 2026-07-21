'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ComposedChart, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { useProfileContext } from '@/components/shared/AppShell';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import {
  BENCHMARK_START_AGE, buildBenchmarkCurves, buildYouSeries, computeGapAndGain,
} from '@/lib/positioningBenchmarks';

function fmt(n: number) {
  return Math.round(n).toLocaleString();
}

type SubView = 'stand' | 'quad';
type Peer = 'similar' | 'upper' | 'lower';

interface QuadDef {
  title: string;
  move: string;
  step: 'A' | 'B' | 'C' | 'D';
  detail: string;
  levers: { ic: string; t: string; d: string; tag: string }[];
}

function getQuadData(ar: boolean): Record<string, QuadDef> {
  const L = (a: string, e: string) => (ar ? a : e);
  return {
    poor: {
      title: L('أنت في وضع البناء', "You're in build mode"), move: L('توليد الدخل والأصول', 'Generate income and assets'), step: 'A',
      detail: L(
        'الأولوية الآن ليست الادّخار أو الاستثمار — بل رفع أرضية دخلك وإنشاء أصولك الأولى. هذه أكثر نقطة انطلاق شيوعاً وأكثرها قابليةً للإصلاح. كل ريال دخل جديد هنا له أثر مضاعَف لأنك تبني من قاعدة منخفضة.',
        "Right now the priority isn't saving or investing — it's raising your income floor and creating your first assets. This is the most common starting point and the most fixable. Every riyal of new income here has outsized impact because you're building from a low base."
      ),
      levers: [
        { ic: '📈', t: L('ارفع أرضية دخلك', 'Raise your income floor'), d: L('وظيفة أعلى أجراً، أو شهادة، أو دخل جانبي — تُحاكيها أداة سرعة المال', 'A higher-paying role, a certification, or a side income — modeled in the Velocity tool'), tag: L('ابدأ هنا', 'Start here') },
        { ic: '🧾', t: L('أوقِف التسرّبات أولاً', 'Stop the leaks first'), d: L('اعثر على النفقات التي تستنزف قاعدتك المنخفضة بهدوء في أداة الميزنة', 'Find the expenses quietly draining your low base in the Budgeting tool'), tag: L('مكسب سريع', 'Quick win') },
        { ic: '💬', t: L('ارسم خطة دخل لـ12 شهراً', 'Map a 12-month income plan'), d: L('دع مستشارك يرتّب خطوات واقعية نحو مستوى دخلك التالي', 'Let your advisor sequence realistic steps to your next income level'), tag: L('خطة', 'Plan') },
      ],
    },
    stuck: {
      title: L('أنت عالق عند نقطة التعادل', "You're stuck at break-even"), move: L('إنشاء فائض وادّخار', 'Create surplus and saving'), step: 'B',
      detail: L(
        'دخلك يغطّي مصروفاتك، لكن لا يبقى شيء للبناء به. أنت لا تتراجع — لكنك لا تتقدّم أيضاً. الخطوة الوحيدة المهمّة هي فتح فجوة بين ما تكسب وما تنفق، ثم حمايتها.',
        "Your income covers your outflow, but there's nothing left to build with. You're not going backward — but you're not moving forward either. The single move that matters is opening a gap between what you earn and what you spend, then protecting it."
      ),
      levers: [
        { ic: '✂️', t: L('هندِس فائضاً', 'Engineer a surplus'), d: L('اعثر على 1,000–2,000 ريال/شهر من متنفّس واحفظها في أداة الميزنة', 'Find and lock SAR 1,000–2,000/month of breathing room in the Budgeting tool'), tag: L('خطوة جوهرية', 'Core move') },
        { ic: '🔒', t: L('أتمِته قبل أن تراه', 'Automate it before you see it'), d: L('انقل الفائض إلى الادّخار يوم الراتب فلا يُنفَق أبداً', 'Move the surplus to savings on payday so it never gets spent'), tag: L('احمِ', 'Protect') },
        { ic: '📊', t: L('احترس من تضخّم نمط الحياة', 'Watch for lifestyle creep'), d: L('ينبّهك مَالمايند حين ترتفع النفقات بسرعة الدخل', 'MalMind flags when expenses rise as fast as income'), tag: L('أضِف للخطة', 'Add to plan') },
      ],
    },
    behind: {
      title: L('أنت تنزلق إلى الوراء', "You're slipping backward"), move: L('اقلِب الميزان', 'Flip the balance'), step: 'B',
      detail: L(
        'التزاماتك ومصروفاتك تفوق حالياً دخلك — دفعات الدَّين والتمويل والالتزامات أكبر ممّا يأتيك. هذا عاجل لكنه قابل للتعافي. الهدف قلب العمودين: تقليص الأحمر، وتنمية الأخضر، بهذا الترتيب.',
        "Your liabilities and outflow currently outweigh your income — debt payments, financing, and commitments are larger than what's coming in. This is urgent but recoverable. The goal is to flip the two bars: shrink the red, grow the green, in that order."
      ),
      levers: [
        { ic: '🏠', t: L('أعِد هيكلة الالتزامات الثقيلة', 'Restructure heavy commitments'), d: L('قرض سيارة طويل أو رهن مبالَغ فيه قد يكون أكبر عبء — أعِد النظر في حجمه', 'A long car loan or oversized mortgage may be the single biggest drag — rethink the size'), tag: L('عاجل', 'Urgent') },
        { ic: '🧾', t: L('افرِز مصروفاتك الآن', 'Triage outflow now'), d: L('افصِل الأساسي عن الاختياري واقتطِع بحزم، مؤقّتاً', 'Separate essential from discretionary and cut hard, temporarily'), tag: L('استقرار', 'Stabilize') },
        { ic: '💬', t: L('ابنِ تسلسل تعافٍ', 'Build a recovery sequence'), d: L('يرتّب مستشارك أيّ الالتزامات تعالجها أولاً لأسرع تخفيف', 'Your advisor orders which liabilities to tackle first for fastest relief'), tag: L('خطة', 'Plan') },
      ],
    },
    wealthy: {
      title: L('أنت جاهز للمضاعفة', "You're ready to multiply"), move: L('ضاعِف الفائض', 'Multiply the surplus'), step: 'D',
      detail: L(
        'لديك فائض صحّي دائم — الجزء الصعب انتهى. الخطر الآن ليس التخلّف، بل ترك المال الجيّد خاملاً. الخطوة أن تجعل الفرق بين الدخل والمصروف يعمل: استثمِره، ووظِّفه، وابحث عن فرص تضاعفه أضعافاً لا مجرّد إضافة إليه.',
        "You have a healthy, durable surplus — the hard part is done. The risk now isn't falling behind, it's letting good money sit idle. The move is to make the difference between income and outflow work: invest it, deploy it, and look into opportunities that multiply it by N rather than add to it."
      ),
      levers: [
        { ic: '📈', t: L('وظِّف الفائض', 'Put the surplus to work'), d: L('نوِّع عبر تداول والصكوك والعقار والذهب — تُسقِط أداة مسار المضاعفة كلاً منها', 'Diversify across Tadawul, sukuk, real estate, and gold — the Doubling Path tool projects each'), tag: L('وظِّف', 'Deploy') },
        { ic: '🏡', t: L('ابحث عن أصول مدرّة للدخل', 'Look into income-producing assets'), d: L('عقار ومشاريع تولّد تدفّقاً نقدياً، لا مجرّد ارتفاع قيمة', 'Property and ventures that generate cash flow, not just appreciation'), tag: L('ضاعِف', 'Multiply') },
        { ic: '💬', t: L('صمّم استراتيجية ثروة', 'Design a wealth strategy'), d: L('يبني مستشارك خطة توظيف تناسب مخاطرك وأهدافك', 'Your advisor builds a deployment plan matched to your risk and goals'), tag: L('خطة', 'Plan') },
      ],
    },
  };
}

const LADDER_STEPS: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];

export default function UnderstandPositioning() {
  const supabase = createClient();
  const { openEditProfile } = useProfileContext();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const money = (n: number) => (ar ? `${fmt(n)} ريال` : `SAR ${fmt(n)}`);
  const QUAD_DATA = useMemo(() => getQuadData(ar), [ar]);

  const [loading, setLoading] = useState(true);
  const [age, setAge] = useState<number | null>(null);
  const [incomeByYear, setIncomeByYear] = useState<{ year: number; value: number }[]>([]);
  const [netWorthByYear, setNetWorthByYear] = useState<{ year: number; value: number }[]>([]);

  const [subView, setSubView] = useState<SubView>('stand');
  const [peer, setPeer] = useState<Peer>('similar');
  const [selectedQuad, setSelectedQuad] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: profile }, { data: incomeRows }, { data: netWorthRows }] = await Promise.all([
        supabase.from('profiles').select('age').eq('id', user.id).single(),
        supabase.from('income_entries').select('year, income').eq('user_id', user.id),
        supabase.from('net_worth_snapshots').select('year, amount').eq('user_id', user.id),
      ]);

      if (profile?.age) setAge(profile.age);
      if (incomeRows) setIncomeByYear(incomeRows.map((r) => ({ year: r.year, value: Number(r.income) })));
      if (netWorthRows) setNetWorthByYear(netWorthRows.map((r) => ({ year: r.year, value: Number(r.amount) })));
      setLoading(false);
    })();
  }, [supabase]);

  const currentYear = new Date().getFullYear();
  const minAge = BENCHMARK_START_AGE;
  const maxAge = age ? Math.max(minAge, age) : minAge;

  const youIncome = useMemo(
    () => (age ? buildYouSeries(incomeByYear, age, currentYear, minAge, maxAge) : []),
    [incomeByYear, age, currentYear, minAge, maxAge]
  );
  const youNetWorth = useMemo(
    () => (age ? buildYouSeries(netWorthByYear, age, currentYear, minAge, maxAge) : []),
    [netWorthByYear, age, currentYear, minAge, maxAge]
  );
  const benchmarks = useMemo(() => buildBenchmarkCurves(minAge, maxAge), [minAge, maxAge]);

  const compareIncome = peer === 'upper' ? benchmarks.incomeHigher : benchmarks.incomeNational;
  const compareNetworth = peer === 'upper' ? benchmarks.networthHigher : benchmarks.networthNational;

  const ages = useMemo(() => {
    const arr: number[] = [];
    for (let a = minAge; a <= maxAge; a++) arr.push(a);
    return arr;
  }, [minAge, maxAge]);

  const incomeChartData = ages.map((a, i) => {
    const you = youIncome[i] ?? null;
    const compare = compareIncome[i];
    const base = you != null ? Math.min(you, compare) : 0;
    const gapValue = you != null ? Math.max(compare - you, 0) : 0;
    const gainValue = you != null ? Math.max(you - compare, 0) : 0;
    return {
      age: a,
      you,
      national: benchmarks.incomeNational[i],
      higher: benchmarks.incomeHigher[i],
      base,
      gapValue,
      gainValue,
    };
  });

  const networthChartData = ages.map((a, i) => ({
    age: a,
    you: youNetWorth[i] ?? null,
    national: benchmarks.networthNational[i],
    higher: benchmarks.networthHigher[i],
  }));

  const hasIncomeData = youIncome.some((v) => v != null);
  const hasNetWorthData = youNetWorth.some((v) => v != null);

  const { missedTotal, gainTotal } = computeGapAndGain(youIncome, compareIncome);
  const compareName = peer === 'upper' ? L('الأقران الأعلى دخلاً', 'higher-earning peers') : L('المتوسط الوطني', 'the national average');

  if (loading) {
    return <div className="text-sm text-[var(--muted)]">{L('جارٍ التحميل…', 'Loading…')}</div>;
  }

  if (!age) {
    return (
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-8 text-center">
        <p className="text-sm text-[var(--ink-2)] mb-4">
          {L('حدّد عمرك في ملفّك الشخصي لترى كيف يقارَن دخلك وصافي ثروتك حسب العمر.', 'Set your age in your profile to see how your income and net worth compare by age.')}
        </p>
        <button
          onClick={openEditProfile}
          className="text-sm bg-[var(--green-dark)] text-white rounded-lg px-4 py-2 font-medium"
        >
          {L('حدّد عمرك ←', 'Set your age →')}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="inline-flex border border-[var(--border-default)] rounded-lg overflow-hidden mb-6">
        <button
          onClick={() => setSubView('stand')}
          className={`px-4 py-2 text-xs font-medium ${subView === 'stand' ? 'bg-[var(--ink)] text-[var(--surface-0)]' : 'bg-[var(--surface-card)] text-[var(--ink-2)]'}`}
        >
          {L('أين تقف', 'Where you stand')}
        </button>
        <button
          onClick={() => setSubView('quad')}
          className={`px-4 py-2 text-xs font-medium ${subView === 'quad' ? 'bg-[var(--ink)] text-[var(--surface-0)]' : 'bg-[var(--surface-card)] text-[var(--ink-2)]'}`}
        >
          {L('ماذا تفعل حياله', 'What to do about it')}
        </button>
      </div>

      {subView === 'stand' && (
        <div>
          <div className="flex items-center gap-2.5 mb-5 flex-wrap">
            <span className="text-xs text-[var(--muted)]">{L('قارِن نفسك بـ:', 'Compare yourself to:')}</span>
            {(['similar', 'upper', 'lower'] as Peer[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeer(p)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium border ${
                  peer === p
                    ? 'bg-[var(--green-bg)] border-[var(--green)] text-[var(--green-dark)]'
                    : 'bg-[var(--surface-card)] border-[var(--border-medium)] text-[var(--ink-2)]'
                }`}
              >
                {p === 'similar' ? L('أقران مماثلون', 'Similar peers') : p === 'upper' ? L('أعلى دخلاً', 'Higher earners') : L('المتوسط الوطني', 'National average')}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5">
              <div className="text-sm font-medium text-[var(--ink)]">{L('الدخل الشهري', 'Monthly income')}</div>
              <div className="text-xs text-[var(--muted)] mb-3">
                {hasIncomeData
                  ? L(`مسار كسبك، من عمر ${minAge} إلى ${maxAge}`, `Your earning trajectory, age ${minAge} to ${maxAge}`)
                  : L('سجّل دخلاً في دخل العمر لترى مسارك أنت هنا', `Log income in Lifetime Income to see your own trajectory here`)}
              </div>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={incomeChartData}>
                    <CartesianGrid stroke="var(--chart-grid)" />
                    <XAxis dataKey="age" tick={{ fontSize: 10, fill: 'var(--muted)' }} tickFormatter={(v) => `${v}`} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} tickFormatter={(v) => `${Math.round(v / 1000)}K`} />
                    <Tooltip
                      labelFormatter={(v) => L(`عمر ${v}`, `Age ${v}`)}
                      formatter={(value, name) => {
                        if (name === 'base' || name === 'gapValue' || name === 'gainValue') return [undefined, undefined];
                        return [money(Number(value)), name];
                      }}
                    />
                    <Area dataKey="base" stackId="fill" stroke="none" fill="transparent" legendType="none" />
                    <Area dataKey="gapValue" stackId="fill" stroke="none" fill="var(--pink)" fillOpacity={0.22} legendType="none" />
                    <Area dataKey="gainValue" stackId="fill" stroke="none" fill="var(--chart-soft-green)" fillOpacity={0.3} legendType="none" />
                    <Line type="monotone" dataKey="national" name={L('المتوسط الوطني', 'National avg')} stroke="var(--blue-2)" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="higher" name={L('قرين أعلى', 'Higher peer')} stroke="var(--ink)" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="you" name={L('أنت', 'You')} stroke="var(--chart-neutral-1)" strokeWidth={3} dot={false} connectNulls={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-3 flex-wrap justify-center text-[10px] text-[var(--ink-2)] mt-2">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--pink)', opacity: 0.5 }} />{L('فرصة فائتة', 'Missed opportunity')}</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--chart-soft-green)', opacity: 0.6 }} />{L('مكسب محقَّق', 'Realized gain')}</span>
              </div>
            </div>

            <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5">
              <div className="text-sm font-medium text-[var(--ink)]">{L('صافي الثروة', 'Net worth')}</div>
              <div className="text-xs text-[var(--muted)] mb-3">
                {hasNetWorthData
                  ? L(`ما بنيته، من عمر ${minAge} إلى ${maxAge}`, `What you've built, age ${minAge} to ${maxAge}`)
                  : L('سجّل لقطة صافي ثروة لترى مسارك أنت هنا', `Log a net worth snapshot to see your own trajectory here`)}
              </div>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={networthChartData}>
                    <CartesianGrid stroke="var(--chart-grid)" />
                    <XAxis dataKey="age" tick={{ fontSize: 10, fill: 'var(--muted)' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${Math.round(v / 1000)}K`)} />
                    <Tooltip
                      labelFormatter={(v) => L(`عمر ${v}`, `Age ${v}`)}
                      formatter={(value, name) => [money(Number(value)), name]}
                    />
                    <Line type="monotone" dataKey="national" name={L('المتوسط الوطني', 'National avg')} stroke="var(--blue-2)" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="higher" name={L('قرين أعلى', 'Higher peer')} stroke="var(--ink)" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="you" name={L('أنت', 'You')} stroke="var(--chart-neutral-1)" strokeWidth={3} dot={false} connectNulls={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-[var(--surface-card)] border-[1.5px] border-[var(--pink)] rounded-2xl p-6 mb-4">
            <div className="text-[11px] tracking-[0.1em] uppercase text-[var(--pink)] mb-3">{L('الفرصة الفائتة', 'The missed opportunity')}</div>
            {hasIncomeData ? (
              <>
                <div className="font-serif text-xl text-[var(--ink)] leading-relaxed mb-2">
                  {peer === 'upper' ? (
                    <>{L('مقابل الأعلى دخلاً، تركت نحو', 'Against higher earners, you left roughly')} <strong className="text-[var(--pink)] font-semibold">{money(missedTotal)}</strong> {L('على الطاولة حتى الآن.', 'on the table so far.')}</>
                  ) : (
                    <>{L('كسبت نحو', 'You earned about')} <strong className="text-[var(--pink)] font-semibold">{money(missedTotal)}</strong> {L(`أقلّ من ${compareName} خلال سنوات بدايتك الأبطأ.`, `less than ${compareName} during your slower-start years.`)}</>
                  )}
                </div>
                <div className="text-sm text-[var(--ink-2)] leading-relaxed">
                  {L(
                    `هذا هو فرق الدخل التراكمي مقابل ${compareName}، باستخدام السنوات التي سجّلتها فعلاً فقط. ليس حكماً — بل قياس للمسافة، لتعرف بالضبط ما تلحق به.`,
                    `This is the cumulative income difference versus ${compareName}, using only the years you've actually logged. It's not a verdict — it's a measure of the distance, so you know exactly what you're catching up to.`
                  )}
                </div>
              </>
            ) : (
              <div className="text-sm text-[var(--ink-2)] leading-relaxed">
                {L('سجّل بعض إدخالات الدخل في', 'Log some income entries in')} <Link href="/lifetime-income" className="text-[var(--green-dark)] font-medium">{L('دخل العمر', 'Lifetime Income')}</Link> {L(`لترى كيف يقارَن كسبك بـ${compareName}.`, `to see how your earnings compare against ${compareName}.`)}
              </div>
            )}
          </div>

          {hasIncomeData && gainTotal > 0 && (
            <div className="bg-[var(--green-bg)] border border-[var(--green-border)] rounded-2xl p-5 mb-6 flex gap-4 items-start">
              <div className="text-xl">📈</div>
              <div>
                <div className="text-sm font-semibold text-[var(--green-dark)] mb-1">{L('لكنك بدأت تغلق الفجوة', "But you've started closing the gap")}</div>
                <div className="text-sm text-[var(--green-dark)] leading-relaxed">
                  {L(`في السنوات التي تجاوزت فيها ${compareName}، يساوي ذلك التعافي نحو`, `In the years you've pulled above ${compareName}, that recovery is worth about`)}{' '}
                  <strong>{money(gainTotal)}</strong> — {L('دليلٌ على أن المسار طوعُ يدك. والسؤال الآن كم بسرعة تغلق الباقي.', 'proof the trajectory is yours to bend. The question now is how fast you close the rest.')}
                </div>
              </div>
            </div>
          )}

          <div className="mb-6">
            <div className="text-[11px] tracking-[0.1em] uppercase text-[var(--muted)] mb-3">
              {L('لماذا انفتحت الفجوة — في سياق سعودي', 'Why the gap opened — in a Saudi context')}
            </div>
            <div className="grid sm:grid-cols-2 gap-2.5">
              <WhyCard icon="🎓" title={L('بداية متأخّرة بعد التخرّج', 'Late start after graduation')} desc={L('يدخل كثير من السعوديين سوق العمل في 23–24 بعد الجامعة. تلك السنتان أو الثلاث من دخل صفري، بينما كسب الأقران الأعلى مبكراً، تتراكم إلى فجوة عمرية كبيرة.', 'Many Saudis enter the workforce at 23–24 after university. Those extra 2–3 years of zero income, while higher peers earned early, compound into a large lifetime gap.')} />
              <WhyCard icon="💼" title={L('القطاع الحكومي مقابل الخاص', 'Public vs. private sector path')} desc={L('الوظائف الحكومية توفّر استقراراً لكن نموّ راتب أبطأ. غالباً ما خاض الأقران الأعلى مخاطرة القطاع الخاص أو ريادة الأعمال التي أثمرت قفزات دخل أسرع.', 'Government roles offer stability but slower salary growth. Higher peers often took private-sector or entrepreneurial risk that paid off in faster income jumps.')} />
              <WhyCard icon="🏠" title={L('الإيجار بدل التملّك مبكراً', 'Renting instead of owning early')} desc={L('سنوات إيجار بلا ملكية، بينما استخدم الأقران دعم صندوق التنمية العقارية للشراء وبناء ثروة عقارية، من أكبر المحرّكات الصامتة لفجوة صافي الثروة.', 'Years of rent with no equity, while peers used REDF support to buy and build property wealth, is one of the biggest silent drivers of the net-worth gap.')} />
              <WhyCard icon="💸" title={L('لا عادة استثمار مبكّرة', 'No early investing habit')} desc={L('جلس المال في الحسابات الجارية دون عائد بدلاً من التراكم في تداول أو الصكوك أو الذهب. الوقت في السوق — لا توقيته — هو ما امتلكه الأقران.', 'Money sat in current accounts earning nothing instead of compounding in Tadawul, sukuk, or gold. Time in the market — not timing — is what peers had.')} />
            </div>
          </div>

          <div className="mb-6">
            <div className="font-serif text-lg font-medium text-[var(--ink)] mb-1">{L('كيف تعوّض الفجوة', 'How to make up the gap')}</div>
            <div className="text-sm text-[var(--ink-2)] mb-4">
              {L('ليست نصائح عامّة — كلٌّ منها يصبح جزءاً من خطتك الشاملة التي يتتبّعها مَالمايند ويحميها.', "These aren't generic tips — each one becomes part of your holistic plan that MalMind tracks and protects.")}
            </div>
            <div className="flex flex-col gap-2">
              <LeverRow icon="📈" title={L('أضِف مصدر دخل ثانٍ', 'Add a second income stream')} desc={L('احسب دخلاً جانبياً في أداة سرعة المال وشاهِد مسارك ينحني صعوداً', 'Model a side income in the Velocity tool and watch your trajectory bend upward')} tag={L('أضِف للخطة', 'Add to plan')} />
              <LeverRow icon="🏡" title={L('انتقل من الإيجار إلى التملّك', 'Move from renting to owning')} desc={L('تحقّق من أهليّة صندوق التنمية العقارية — الملكية أسرع رافعة لللحاق بصافي الثروة', 'Check REDF eligibility — equity is the fastest net-worth catch-up lever you have')} tag={L('أضِف للخطة', 'Add to plan')} />
              <LeverRow icon="💾" title={L('ابدأ باستثمار دخلك المتاح', 'Start investing your disposable income')} desc={L('حتى مبلغ شهري متواضع يتراكم — تُسقطه أداة مسار المضاعفة إلى الأمام', 'Even a modest monthly amount compounds — the Doubling Path tool projects it forward')} tag={L('أضِف للخطة', 'Add to plan')} />
              <LeverRow icon="💬" title={L('ابنِ خطة لحاق مع مستشارك', 'Build a catch-up plan with your advisor')} desc={L('دع مَالمايند يرتّب هذه الخطوات في مسار واقعي لغلق الفجوة', 'Let MalMind sequence these moves into a realistic path to close the gap')} tag={L('مخصّص', 'Personalized')} />
            </div>
          </div>

          <NudgeBanner>
            <strong className="text-[var(--gold-text-strong)]">{L('يتذكّر مَالمايند هذا.', 'MalMind remembers this.')}</strong> {L(
              'فجوتك وخطة لحاقك أصبحتا جزءاً من صورتك المالية الشاملة. في المرّة القادمة التي توشك فيها على قرار يوسّع الفجوة — شراء اختياري كبير، قرض سيارة أطول، السحب من المدخرات — سأذكّرك بهدوء بما يكلّفه ذلك مقابل هذه الخطة. لا للحكم، بل ليكون الخيار خيارك بعينين مفتوحتين.',
              "Your gap and your catch-up plan are now part of your holistic financial picture. Next time you're about to make a decision that widens the gap — a big discretionary purchase, a longer car loan, dipping into savings — I'll quietly remind you what it costs against this plan. Not to judge, just so the choice is yours with eyes open."
            )}
          </NudgeBanner>
        </div>
      )}

      {subView === 'quad' && (
        <div>
          <p className="text-sm text-[var(--ink-2)] leading-relaxed mb-5 max-w-xl">
            {L('مسارك يخبرك ', 'Your trajectory tells you ')}<em>{L('أين', 'where')}</em>{L(' أنت. وهذا يخبرك ', ' you are. This tells you ')}<em>{L('أيّ نوع', 'what kind')}</em>{L(' من المواقف أنت فيه — والخطوة الأهمّ من هنا. اضغط على الرُّبع الذي يشبهك.', " of situation you're in — and the single most important move from here. Tap the quadrant that sounds like you.")}
          </p>

          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-4 mb-6">
            <div className="grid grid-cols-2 gap-2 relative">
              <QuadCard
                q="stuck" active={selectedQuad === 'stuck'} onClick={() => setSelectedQuad('stuck')} ar={ar}
                title={L('«أنا عالق ولا أتقدّم»', '"I\'m stuck and going nowhere"')} mood={L('الدخل يغطّي المصروف، لكن لا يبقى شيء', "Income covers outflow, but nothing's left over")} move={L('← إنشاء فائض / ادّخار', '→ Create surplus / saving')}
                incomeH={54} outflowH={52}
              />
              <QuadCard
                q="wealthy" active={selectedQuad === 'wealthy'} onClick={() => setSelectedQuad('wealthy')} ar={ar}
                title={L('«أنا ثريّ، فماذا الآن؟»', '"I\'m wealthy, now what?"')} mood={L('فائض قويّ — لكن هل يعمل بجدّ كافٍ؟', 'Strong surplus — but is it working hard enough?')} move={L('← ضاعِف الفائض', '→ Multiply the surplus')}
                incomeH={62} outflowH={40}
              />
              <QuadCard
                q="poor" active={selectedQuad === 'poor'} onClick={() => setSelectedQuad('poor')} ar={ar}
                title={L('«أنا فقير»', '"I\'m poor"')} mood={L('لا دخل ولا أصول كافية للبناء عليها بعد', 'Not enough income or assets to build on yet')} move={L('← توليد دخل / أصول', '→ Generate income / assets')}
                incomeH={28} outflowH={50}
              />
              <QuadCard
                q="behind" active={selectedQuad === 'behind'} onClick={() => setSelectedQuad('behind')} ar={ar}
                title={L('«أنا لا ألحق»', '"I\'m not catching up"')} mood={L('الالتزامات تفوق الدخل — انزلاق إلى الوراء', 'Liabilities outweigh income — slipping backward')} move={L('← اقلِب الميزان', '→ Flip the balance')}
                incomeH={38} outflowH={58}
              />
            </div>
          </div>

          {selectedQuad ? (
            <div className="bg-[var(--surface-card)] border-[1.5px] border-[var(--green)] rounded-2xl p-6">
              <div className="text-[11px] tracking-[0.1em] uppercase text-[var(--green)] mb-3">{L('وضعك', 'Your situation')}</div>
              <div className="font-serif text-lg text-[var(--ink)] leading-relaxed mb-2">
                <strong className="font-semibold">{QUAD_DATA[selectedQuad].title}.</strong> {L('الخطوة الأهمّ:', 'The move that matters most:')}{' '}
                <strong className="font-semibold">{ar ? QUAD_DATA[selectedQuad].move : QUAD_DATA[selectedQuad].move.toLowerCase()}</strong>.
              </div>
              <div className="text-sm text-[var(--ink-2)] leading-relaxed mb-5">{QUAD_DATA[selectedQuad].detail}</div>

              <div className="flex items-center gap-2 mb-5 flex-wrap">
                <span className="text-xs text-[var(--muted)] me-1">{L('مسار النضج:', 'Maturity path:')}</span>
                {LADDER_STEPS.map((s, i) => (
                  <span key={s} className="flex items-center gap-2">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-[1.5px] ${
                        QUAD_DATA[selectedQuad].step === s
                          ? 'bg-[var(--green)] border-[var(--green)] text-white'
                          : 'bg-[var(--surface-card)] border-[var(--border-medium)] text-[var(--muted)]'
                      }`}
                    >
                      {s}
                    </span>
                    {i < LADDER_STEPS.length - 1 && <span className="text-[var(--border-strong)] text-xs">→</span>}
                  </span>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                {QUAD_DATA[selectedQuad].levers.map((l) => (
                  <LeverRow key={l.t} icon={l.ic} title={l.t} desc={l.d} tag={l.tag} />
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-8 text-center text-sm text-[var(--muted)]">
              {L('اضغط على الرُّبع أعلاه الذي يشبهك.', 'Tap the quadrant above that sounds like you.')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WhyCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-lg p-3.5">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-base">{icon}</span>
        <span className="text-sm font-medium text-[var(--ink)]">{title}</span>
      </div>
      <div className="text-xs text-[var(--ink-2)] leading-relaxed">{desc}</div>
    </div>
  );
}

function LeverRow({ icon, title, desc, tag }: { icon: string; title: string; desc: string; tag: string }) {
  return (
    <div className="flex items-center gap-3 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-lg px-4 py-3 hover:border-[var(--green)] transition-colors">
      <span className="text-lg">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[var(--ink)]">{title}</div>
        <div className="text-xs text-[var(--muted)]">{desc}</div>
      </div>
      <span className="text-[11px] font-semibold text-[var(--green)] bg-[var(--green-bg)] border border-[var(--green-border)] px-2.5 py-1 rounded-full whitespace-nowrap">
        {tag}
      </span>
    </div>
  );
}

function NudgeBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start bg-[var(--gold-bg)] border border-[var(--gold)] rounded-xl p-4">
      <div className="w-7 h-7 rounded-full bg-[var(--gold)] flex items-center justify-center font-serif font-semibold text-white text-sm shrink-0">
        M
      </div>
      <div className="text-xs text-[var(--gold-text-body)] leading-relaxed">{children}</div>
    </div>
  );
}

function QuadCard({
  active, onClick, title, mood, move, incomeH, outflowH, ar,
}: {
  q: string; active: boolean; onClick: () => void; title: string; mood: string; move: string;
  incomeH: number; outflowH: number; ar: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left p-4 rounded-xl border transition-colors ${
        active ? 'border-[var(--green)] bg-[var(--green-bg)]' : 'border-[var(--border-default)] bg-[var(--surface-card)] hover:bg-[var(--surface-0)]'
      }`}
    >
      <div className="text-sm font-semibold text-[var(--ink)] mb-1">{title}</div>
      <div className="text-xs text-[var(--muted)] italic mb-3">{mood}</div>
      <div
        className={`text-xs font-medium text-[var(--green-dark)] inline-block px-2.5 py-1 rounded-full border mb-3 ${
          active ? 'bg-[var(--surface-card)] border-[var(--green-border)]' : 'bg-[var(--green-bg)] border-[var(--green-border)]'
        }`}
      >
        {move}
      </div>
      <div className="flex gap-4 items-end h-16">
        <div className="flex flex-col items-center gap-1">
          <div className="w-8 rounded-t" style={{ height: incomeH, background: 'var(--green)' }} />
          <div className="text-[9px] text-[var(--muted)]">{ar ? 'الدخل' : 'Income'}</div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-8 rounded-t" style={{ height: outflowH, background: 'var(--red-2)' }} />
          <div className="text-[9px] text-[var(--muted)]">{ar ? 'المصروف' : 'Outflow'}</div>
        </div>
      </div>
    </button>
  );
}
