'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ComposedChart, Bar, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { buildProjection, monthLabel } from '@/lib/lifetimeProjection';

function fmt(n: number) {
  return Math.round(n).toLocaleString();
}

function fmtCompact(n: number) {
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 1 : 2) + 'M';
  if (n >= 1e3) return Math.round(n / 1e3) + 'K';
  return Math.round(n).toString();
}

type ChartMode = 'earned' | 'split';
type Reflection = 'happy' | 'unsure' | 'unhappy';

export default function UnderstandView() {
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const money = (n: number) => (ar ? `${fmt(n)} ريال` : `SAR ${fmt(n)}`);
  const moneyC = (n: number) => (ar ? `${fmtCompact(n)} ريال` : `SAR ${fmtCompact(n)}`);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentIncome, setCurrentIncome] = useState(0);

  const [startYear, setStartYear] = useState(new Date().getFullYear() - 5);
  const [startIncome, setStartIncome] = useState('');
  const [saveRatePct, setSaveRatePct] = useState('20');
  const [chartMode, setChartMode] = useState<ChartMode>('earned');
  const [reflection, setReflection] = useState<Reflection | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data } = await supabase
        .from('profiles')
        .select('monthly_income, career_start_year, career_start_income, lifetime_save_rate')
        .eq('id', user.id)
        .single();

      if (data) {
        setCurrentIncome(Number(data.monthly_income) || 0);
        if (data.career_start_year) setStartYear(data.career_start_year);
        if (data.career_start_income != null) setStartIncome(String(data.career_start_income));
        if (data.lifetime_save_rate != null) setSaveRatePct(String(data.lifetime_save_rate));
      }
      setLoading(false);
    })();
  }, [supabase]);

  async function saveAssumptions() {
    if (!userId) return;
    setSaving(true);
    setSaved(false);
    await supabase
      .from('profiles')
      .update({
        career_start_year: startYear,
        career_start_income: parseFloat(startIncome) || 0,
        lifetime_save_rate: parseFloat(saveRatePct) || 0,
      })
      .eq('id', userId);
    setSaving(false);
    setSaved(true);
  }

  const series = useMemo(
    () =>
      buildProjection({
        startYear,
        startIncome: parseFloat(startIncome) || 0,
        currentIncome,
        saveRate: (parseFloat(saveRatePct) || 0) / 100,
      }),
    [startYear, startIncome, currentIncome, saveRatePct]
  );

  const last = series[series.length - 1];
  const earned = last?.cumulativeIncome ?? 0;
  const kept = last?.cumulativeSaved ?? 0;
  const spent = earned - kept;
  const keptPct = earned > 0 ? (kept / earned) * 100 : 0;

  const chartData = series.map((p) => {
    const keptShare = p.cumulativeIncome > 0 ? (p.cumulativeSaved / p.cumulativeIncome) * 100 : 0;
    return {
      label: monthLabel(p, locale),
      cumulativeIncome: p.cumulativeIncome,
      cumulativeSaved: p.cumulativeSaved,
      keptShare,
      spentShare: 100 - keptShare,
    };
  });

  const tickInterval = Math.max(0, Math.floor(chartData.length / 8) - 1);

  if (loading) {
    return <div className="text-sm text-[var(--muted)]">{L('جارٍ التحميل…', 'Loading…')}</div>;
  }

  return (
    <div>
      {/* assumptions */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-6">
        <div className="text-[11px] tracking-[0.1em] uppercase text-[var(--muted)] mb-4">
          {L('رسمٌ تقريبي لحياتك المهنية في الكسب', 'A rough sketch of your earning life')}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">{L('سنة بدء المسار المهني', 'Career start year')}</label>
            <input
              type="number"
              value={startYear}
              onChange={(e) => setStartYear(parseInt(e.target.value) || startYear)}
              className="w-full border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--green)]"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">{L('الدخل الشهري في البداية', 'Starting monthly income')}</label>
            <div className="flex items-center border border-[var(--border-default)] rounded-lg px-3 focus-within:border-[var(--green)]">
              <span className="text-xs text-[var(--muted)] me-1">{L('ريال', 'SAR')}</span>
              <input
                value={startIncome}
                onChange={(e) => setStartIncome(e.target.value)}
                placeholder={L('مثال: 6,000', 'e.g. 6,000')}
                className="w-full py-2 text-sm outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">{L('الدخل الشهري الحالي', 'Current monthly income')}</label>
            <div className="border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm bg-[var(--surface-0)] text-[var(--ink-2)]">
              {money(currentIncome)}
            </div>
          </div>
          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">{L('تقريباً، % ما تدّخره', 'Roughly, % you save')}</label>
            <div className="flex items-center border border-[var(--border-default)] rounded-lg px-3 focus-within:border-[var(--green)]">
              <input
                value={saveRatePct}
                onChange={(e) => setSaveRatePct(e.target.value)}
                className="w-full py-2 text-sm outline-none"
              />
              <span className="text-xs text-[var(--muted)] ms-1">%</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={saveAssumptions}
            disabled={saving}
            className="text-sm bg-[var(--green-dark)] text-white rounded-lg px-4 py-2 font-medium disabled:opacity-50"
          >
            {saving ? L('جارٍ الحفظ…', 'Saving…') : L('حفظ الافتراضات', 'Save assumptions')}
          </button>
          {saved && <span className="text-xs text-[var(--green)]">{L('حُفظ في ملفّك الشخصي.', 'Saved to your profile.')}</span>}
          <span className="text-xs text-[var(--muted)]">
            {L('الدخل الحالي يأتي من ملفّك الشخصي — عدّله من الصفحة الرئيسية.', 'Current income comes from your profile — edit it from the home page.')}
          </span>
        </div>
      </div>

      {/* chart mode toggle */}
      <div className="inline-flex border border-[var(--border-default)] rounded-lg overflow-hidden mb-4">
        <button
          onClick={() => setChartMode('earned')}
          className={`px-4 py-2 text-xs font-medium ${chartMode === 'earned' ? 'bg-[var(--ink)] text-[var(--surface-0)]' : 'bg-[var(--surface-card)] text-[var(--ink-2)]'}`}
        >
          {L('ما كسبته مقابل ما احتفظت به', "What you've earned vs kept")}
        </button>
        <button
          onClick={() => setChartMode('split')}
          className={`px-4 py-2 text-xs font-medium ${chartMode === 'split' ? 'bg-[var(--ink)] text-[var(--surface-0)]' : 'bg-[var(--surface-card)] text-[var(--ink-2)]'}`}
        >
          {L('الدخل مقابل الإنفاق، عبر الزمن', 'Income vs spending, over time')}
        </button>
      </div>

      {/* chart */}
      {chartMode === 'earned' ? (
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 mb-6">
          <div className="text-sm font-medium mb-1">{L('الدخل المتراكم عبر حياتك', 'Accumulated income over your life')}</div>
          <div className="text-xs text-[var(--muted)] mb-4">
            {L('كل ريال كسبته، متراكماً شهراً بعد شهر — إسقاط تقديري، لا بيانات مسجَّلة', "Every riyal you've earned, stacked up month after month — a projection, not logged data")}
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid stroke="var(--chart-grid)" />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--muted)' }} interval={tickInterval} angle={-45} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} tickFormatter={(v) => fmtCompact(v)} />
                <Tooltip formatter={(v) => money(Number(v))} />
                <Bar dataKey="cumulativeIncome" name={L('إجمالي المكتسَب (تراكمي)', 'Total earned (cumulative)')} fill="var(--blue)" />
                <Line type="monotone" dataKey="cumulativeSaved" name={L('ما بقي فعلاً (مدّخرات)', 'What actually stayed (savings)')} stroke="var(--red)" strokeWidth={2.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 mb-4">
          <div className="text-sm font-medium mb-1">{L('من كل ما كسبته، كم احتفظت به؟', 'Of everything you earned, how much did you keep?')}</div>
          <div className="text-xs text-[var(--muted)] mb-4">
            {L('ارتفاع المنطقة الزرقاء يعني أنك احتفظت بحصّة أكبر مع الوقت', 'The blue area climbing means you kept a bigger share over time')}
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid stroke="var(--chart-grid)" />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--muted)' }} interval={tickInterval} angle={-45} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                <Tooltip formatter={(v) => `${Number(v).toFixed(0)}%`} />
                <Area type="monotone" dataKey="keptShare" name={L('محتفَظ به', 'Kept')} stackId="a" stroke="var(--blue)" fill="var(--blue-soft-bg)" />
                <Area type="monotone" dataKey="spentShare" name={L('مُنفَق', 'Spent')} stackId="a" stroke="var(--red)" fill="var(--red-soft-bg)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-3 items-start bg-[var(--gold-bg)] border border-[var(--gold)] rounded-xl p-4 mt-4">
            <div className="w-7 h-7 rounded-full bg-[var(--gold)] flex items-center justify-center font-serif font-semibold text-white text-sm shrink-0">
              M
            </div>
            <div className="text-xs text-[var(--gold-text-body)] leading-relaxed">
              <strong className="text-[var(--gold-text-strong)]">{L('كيف تقرأ هذا.', 'How to read this.')}</strong> {L(
                'كل نقطة تُظهر كم من إجمالي دخل عمرك احتفظت به مقابل ما أنفقته حتى تلك اللحظة. حين يرتفع الأزرق، ينضبط ادّخارك أكثر. القفزة المفاجئة غالباً ما تعني حدثاً كبيراً لمرّة واحدة — مكافأة ادُّخرت، أو شراءٌ كبير رفع الإنفاق.',
                "Each point shows what share of your total lifetime income you've kept versus spent up to that moment. When the blue rises, your saving discipline is improving. A sudden jump usually means a big one-off — a bonus saved, or a major purchase that pushed spending up."
              )}
            </div>
          </div>
        </div>
      )}

      {/* the big reveal */}
      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-[var(--surface-card)] border border-[var(--blue)] rounded-2xl p-5">
          <div className="text-[11px] tracking-[0.08em] uppercase text-[var(--muted)] mb-2">{L('لقد كسبت', "You've earned")}</div>
          <div className="font-serif text-2xl font-semibold text-[var(--blue)] mb-1">{moneyC(earned)}</div>
          <div className="text-xs text-[var(--ink-2)]">{L('عبر حياتك العملية حتى الآن', 'across your working life so far')}</div>
        </div>
        <div className="bg-[var(--surface-card)] border border-[var(--green)] rounded-2xl p-5">
          <div className="text-[11px] tracking-[0.08em] uppercase text-[var(--muted)] mb-2">{L('احتفظت بـ', 'You kept')}</div>
          <div className="font-serif text-2xl font-semibold text-[var(--green-dark)] mb-1">{moneyC(kept)}</div>
          <div className="text-xs text-[var(--ink-2)]">{L(`أي ${keptPct.toFixed(0)}% من كل ما كسبته`, `that's ${keptPct.toFixed(0)}% of everything you earned`)}</div>
        </div>
        <div className="bg-[var(--surface-card)] border border-[var(--red)] rounded-2xl p-5">
          <div className="text-[11px] tracking-[0.08em] uppercase text-[var(--muted)] mb-2">{L('أنفقت', 'You spent')}</div>
          <div className="font-serif text-2xl font-semibold text-[var(--red)] mb-1">{moneyC(spent)}</div>
          <div className="text-xs text-[var(--ink-2)]">{L(`${(100 - keptPct).toFixed(0)}% مرّت وذهبت`, `${(100 - keptPct).toFixed(0)}% flowed through and is gone`)}</div>
        </div>
      </div>

      {/* reflection */}
      <div className="bg-[var(--surface-card)] border-[1.5px] border-[var(--green)] rounded-2xl p-6 mb-6">
        <div className="text-[11px] tracking-[0.1em] uppercase text-[var(--green)] mb-3">
          {L('السؤال المهم', 'The question that matters')}
        </div>
        <div className="font-serif text-lg text-[var(--ink)] leading-relaxed mb-2">
          {L('عبر حياتك العملية، مرّ نحو', 'Over your working life, about')} <strong className="text-[var(--green-dark)] font-semibold">{money(earned)}</strong> {L('بين يديك. احتفظت بـ', 'has passed through your hands. You kept')} <strong className="text-[var(--green-dark)] font-semibold">{money(kept)}</strong>.
        </div>
        <div className="text-sm text-[var(--ink-2)] leading-relaxed mb-5">
          {L(
            `أغلب الناس لم يروا هذا الرقم قط. كسب ${moneyC(earned)} يبدو كثيراً — وهو كذلك. لكن ${(100 - keptPct).toFixed(0)}% منه قد ذهب فعلاً. المقصود ليس الشعور بالذنب: بعض ذلك الإنفاق اشترى حياةً حقيقية طيّبة. المقصود أن تنظر بصدق وتسأل: هل اشترى الحياة التي أردتها؟`,
            `Most people have never seen this number. Earning ${moneyC(earned)} sounds like a lot — and it is. But ${(100 - keptPct).toFixed(0)}% of it is already gone. The point isn't guilt: some of that spending bought a real, good life. The point is to look honestly and ask whether it bought the life you wanted.`
          )}
        </div>
        <div className="text-sm font-medium text-[var(--ink)] mb-3">
          {L('بالنظر إلى هذا — هل أنت راضٍ عنه؟', 'Looking at this — are you happy with it?')}
        </div>
        <div className="flex gap-2.5 flex-wrap mb-4">
          <button
            onClick={() => setReflection('happy')}
            className="px-4 py-2.5 rounded-lg text-xs font-medium border border-[var(--border-medium)] hover:bg-[var(--green-bg)] hover:border-[var(--green)] hover:text-[var(--green-dark)] transition-colors"
          >
            {L('نعم، أنا راضٍ', "Yes, I'm happy")}
          </button>
          <button
            onClick={() => setReflection('unsure')}
            className="px-4 py-2.5 rounded-lg text-xs font-medium border border-[var(--border-medium)] hover:bg-[var(--gold-bg)] hover:border-[var(--gold)] hover:text-[var(--gold-text-alt2)] transition-colors"
          >
            {L('لست متأكّداً', "I'm not sure")}
          </button>
          <button
            onClick={() => setReflection('unhappy')}
            className="px-4 py-2.5 rounded-lg text-xs font-medium border border-[var(--border-medium)] hover:bg-[var(--red-soft-bg)] hover:border-[var(--red)] hover:text-[var(--red-dark-text)] transition-colors"
          >
            {L('لا، هذا يقلقني', 'No, this worries me')}
          </button>
        </div>

        {reflection && (
          <div className="pt-4 border-t border-[var(--border-default)] text-sm text-[var(--ink-2)] leading-relaxed">
            {reflection === 'happy' && (
              L(
                `هذا موضعٌ جيّد — وأندر ممّا تظنّ. إن كنت تحتفظ بـ ${keptPct.toFixed(0)}% وتشعر أن إنفاقك اشترى حياةً تقدّرها، فقد حللت الجزء الذي يصارعه أغلب الناس. من هنا، الخطوة أن تجعل الجزء المُحتفَظ به يعمل بجدّ أكبر — مستثمَراً لا خاملاً. أتريد أن ترى ما يمكن أن يصبح عليه ذلك المبلغ ${moneyC(kept)} على مسار المضاعفة؟`,
                `That's a good place to be — and rarer than you'd think. If you're keeping ${keptPct.toFixed(0)}% and feel your spending bought a life you value, you've solved the part most people struggle with. From here, the move is to make the kept portion work harder — invested rather than idle. Want to see what that ${moneyC(kept)} could become on the Doubling Path?`
              )
            )}
            {reflection === 'unsure' && (
              L(
                'ذلك التردّد يستحقّ التأمّل — فهو غالباً يعني أن بعض الإنفاق خدمك جيّداً وبعضه لا، ولا يمكنك بعد تمييز أيّهما. أنفع تمرين: فكّر في العام الماضي. هل تستطيع أن تشير إلى ما اشتراه لك إنفاقك — تقدّماً، أو فرحاً، أو لا هذا ولا ذاك؟ يستطيع مال مايند مساعدتك على تتبّعه شهراً بشهر.',
                "That uncertainty is worth sitting with — it usually means some spending served you well and some didn't, and you can't yet tell which. The most useful exercise: think about the last year. Can you point to what your spending bought you — progress, joy, or neither? MalMind can help you trace it month by month."
              )
            )}
            {reflection === 'unhappy' && (
              L(
                'تسمية ذلك هي الجزء الصعب، وقد فعلته للتوّ. الخبر الجيّد: هذا المنحنى ليس ثابتاً — هو نتيجة عادات، والعادات تتغيّر أسرع ممّا تتوقّع. لست بحاجة إلى أن تصير مقتّراً أو بلا فرح. أنت بحاجة إلى أن تجد الإنفاق الذي لم يشترِ تقدّماً ولا متعة — التسرّب الخفيّ — وتعيد توجيه ذلك وحده.',
                "Naming that is the hard part, and you just did it. The good news: this curve isn't fixed — it's the result of habits, and habits change faster than you'd expect. You don't need to become frugal or joyless. You need to find the spending that bought neither progress nor enjoyment — the invisible leak — and redirect just that."
              )
            )}
          </div>
        )}
      </div>

      {/* alignment lenses */}
      <div className="mb-6">
        <div className="font-serif text-lg font-medium text-[var(--ink)] mb-1">
          {L('الأمر ليس أن تنفق أقل — بل أن تنفق بشكل صحيح', "It's not about spending less — it's about spending right")}
        </div>
        <div className="text-sm text-[var(--ink-2)] mb-4">
          {L('المال المنفَق على حياة تحبّها ليس مهدوراً. لننظر هل اشترى إنفاقك ما يهمّك.', "Money spent on a life you love isn't wasted. Let's look at whether yours bought what matters to you.")}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <LensCard icon="🎯" title={L('هل قرّبك من أهدافك؟', 'Did it move you toward your goals?')} desc={L('قارِن ما أنفقته بالأهداف التي تقول إنها تهمّك — منزل، عائلة، حرّية. الإنفاق الذي اشترى تقدّماً هو إنفاق نجح.', 'Compare what you spent against the goals you say matter — a home, family, freedom. Spending that bought progress is spending that worked.')} />
          <LensCard icon="😊" title={L('هل اشترى متعةً حقيقية؟', 'Did it buy real enjoyment?')} desc={L('السفر، التجارب، الوقت مع من تحبّ — هذا ما وُجد المال لأجله. والسؤال هل حقّقها إنفاقك فعلاً.', 'Travel, experiences, time with people you love — these are what money is for. The question is whether your spending actually delivered them.')} />
          <LensCard icon="💨" title={L('أم أنه تبخّر فحسب؟', 'Or did it just evaporate?')} desc={L('كثير من الإنفاق لا يترك أثراً — لا تقدّماً ولا فرحاً. إيجاد هذا التسرّب الخفيّ هو أكبر فرصة في مالية أغلب الناس.', "Much spending leaves no trace — neither progress nor joy. Finding this invisible leak is the single biggest opportunity in most people's finances.")} />
          <LensCard icon="⚖️" title={L('هل التوازن مناسب لمرحلتك؟', 'Is the balance right for your stage?')} desc={L('ابن الخامسة والعشرين وابن الخامسة والأربعين ينبغي أن يحتفظا بحصص مختلفة. يزن مال مايند نسبتك مقابل موضعك في الحياة — لا قاعدة عامّة.', 'A 25-year-old and a 45-year-old should keep different shares. MalMind weighs your ratio against where you are in life — not a generic rule.')} />
        </div>
      </div>

      {/* nudge */}
      <div className="flex gap-3 items-start bg-[var(--gold-bg)] border border-[var(--gold)] rounded-xl p-4">
        <div className="w-7 h-7 rounded-full bg-[var(--gold)] flex items-center justify-center font-serif font-semibold text-white text-sm shrink-0">
          M
        </div>
        <div className="text-xs text-[var(--gold-text-body)] leading-relaxed">
          <strong className="text-[var(--gold-text-strong)]">{L('مال مايند يُبقي هذا نصب عينيه.', 'MalMind keeps this in view.')}</strong> {L(
            'تصبح صورة العمر هذه جزءاً من كيفية فهمي لك. حين تزن شراءً كبيراً لاحقاً، أستطيع أن أُريك ما يفعله بهذا المنحنى — لا لأوقفك، بل لتراه مقابل كل ما كسبته واحتفظت به. الحياة الطيّبة تحتاج إنفاقاً. والهدف أن يشتري إنفاقك الحياة التي تريدها فعلاً.',
            "This lifetime picture becomes part of how I understand you. When you're weighing a big purchase later, I can show you what it does to this curve — not to stop you, but so you see it against everything you've earned and kept. A good life needs spending. The goal is making sure yours buys the life you actually want."
          )}
        </div>
      </div>
    </div>
  );
}

function LensCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-4 hover:border-[var(--green)] transition-colors">
      <div className="flex items-center gap-2.5 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-medium text-[var(--ink)]">{title}</span>
      </div>
      <div className="text-xs text-[var(--ink-2)] leading-relaxed">{desc}</div>
    </div>
  );
}
