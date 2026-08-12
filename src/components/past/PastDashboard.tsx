'use client';

// The Past dashboard — three named pillars, revealed by the iceberg's depth:
//   1 · Story   — the net-worth arc with the person's story chapters
//                 annotated on the curve (My Financial Story stays the source)
//   2 · Numbers — what was earned and what stayed: headlines, the full
//                 in/out record, the saving-rate trend, the forensic table
//   3 · Lessons — behavior read from the past: the lifestyle-creep detector,
//                 Hijri-calendar spending seasons, per-chapter lessons
// Depth 1 shows Story + the headline Numbers; depth 2 opens the history and
// trend; depth 3 unlocks Lessons; depth 4 adds the month-by-month record.
// Cards that need more history than exists degrade to an honest
// "log more months" state instead of faking a pattern.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceArea, ReferenceLine,
  ComposedChart, Bar, CartesianGrid, Cell,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { useDepth } from '@/components/shared/ExperienceMode';
import { DEPTH_META, type DepthLevel } from '@/lib/depth';
import { demoAr } from '@/lib/demoI18n';
import ExplainButton, { type ExplainContent } from '@/components/shared/ExplainButton';

interface Snap {
  year: number; month: number;
  cash: number; stocks: number; real_estate: number; equity: number; other_assets: number;
  liabilities: number; income: number; expenses: number;
}
interface Chapter { title: string; note: string | null; start_year: number; end_year: number }

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const HIJRI_MONTHS_AR = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];
const HIJRI_MONTHS_EN = ['Muharram', 'Safar', 'Rabiʿ I', 'Rabiʿ II', 'Jumada I', 'Jumada II', 'Rajab', 'Shaʿban', 'Ramadan', 'Shawwal', 'Dhu al-Qiʿdah', 'Dhu al-Hijjah'];

function nwOf(s: Snap) {
  return Number(s.cash) + Number(s.stocks) + Number(s.real_estate) + Number(s.equity) + Number(s.other_assets) - Number(s.liabilities);
}
function fmt(n: number) { return Math.round(n).toLocaleString(); }
function fmtCompact(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${(n / 1e6).toFixed(abs >= 1e7 ? 0 : 1)}M`;
  if (abs >= 1e3) return `${Math.round(n / 1e3)}K`;
  return String(Math.round(n));
}
// The Hijri month (1..12) a Gregorian year-month falls in (mid-month sample).
function hijriMonthOf(year: number, month: number): number {
  try {
    const s = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { month: 'numeric' }).format(new Date(year, month - 1, 15));
    const n = Number(s);
    return n >= 1 && n <= 12 ? n : 0;
  } catch { return 0; }
}
// Least-squares slope of a numeric series (per step).
function slopeOf(xs: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const mx = (n - 1) / 2;
  const my = xs.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  xs.forEach((y, i) => { num += (i - mx) * (y - my); den += (i - mx) * (i - mx); });
  return den === 0 ? 0 : num / den;
}

export default function PastDashboard() {
  const supabase = createClient();
  const { t, locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const sar = t('common.sar');
  const money = (n: number) => (ar ? `${fmt(n)} ${sar}` : `${sar} ${fmt(n)}`);
  const moneyC = (n: number) => (ar ? `${fmtCompact(n)} ${sar}` : `${sar} ${fmtCompact(n)}`);
  const { depth, setDepth } = useDepth();

  const [snaps, setSnaps] = useState<Snap[] | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [sRes, cRes] = await Promise.all([
        supabase
          .from('financial_snapshots')
          .select('year, month, cash, stocks, real_estate, equity, other_assets, liabilities, income, expenses')
          .eq('user_id', user.id)
          .order('year', { ascending: true })
          .order('month', { ascending: true }),
        supabase
          .from('story_chapters')
          .select('title, note, start_year, end_year')
          .eq('user_id', user.id)
          .order('start_year', { ascending: true }),
      ]);
      setSnaps((sRes.data as Snap[]) ?? []);
      setChapters((cRes.data as Chapter[]) ?? []);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── derived series ────────────────────────────────────────────────────
  const D = useMemo(() => {
    const rows = (snaps ?? []).map((s, i) => ({
      i,
      year: s.year, month: s.month,
      label: `${MONTHS_EN[s.month - 1]} ${String(s.year).slice(2)}`,
      nw: nwOf(s),
      income: Number(s.income), expenses: Number(s.expenses),
      saved: Number(s.income) - Number(s.expenses),
      rate: Number(s.income) > 0 ? ((Number(s.income) - Number(s.expenses)) / Number(s.income)) * 100 : null,
    }));
    const n = rows.length;
    const totalEarned = rows.reduce((a, r) => a + r.income, 0);
    const overallRate = totalEarned > 0 ? (rows.reduce((a, r) => a + r.saved, 0) / totalEarned) * 100 : 0;

    // story chapters overlapping the logged span, mapped to row indices
    const bands = chapters
      .map((c) => {
        const x1 = rows.findIndex((r) => r.year >= c.start_year);
        let x2 = -1;
        for (let i = rows.length - 1; i >= 0; i--) if (rows[i].year <= c.end_year) { x2 = i; break; }
        return { ...c, x1, x2 };
      })
      .filter((b) => b.x1 !== -1 && b.x2 !== -1 && b.x2 >= b.x1);

    // lifestyle creep: the latest clear raise, and how much of it spending ate
    let creep: { at: number; incBefore: number; incAfter: number; expBefore: number; expAfter: number; eaten: number } | null = null;
    for (let i = 3; i < n - 2; i++) {
      const incBefore = (rows[i - 3].income + rows[i - 2].income + rows[i - 1].income) / 3;
      const after = rows.slice(i, Math.min(n, i + 6));
      const incAfter = after.reduce((a, r) => a + r.income, 0) / after.length;
      if (incBefore > 0 && incAfter > incBefore * 1.08 && rows[i].income > rows[i - 1].income * 1.08) {
        const expBefore = (rows[i - 3].expenses + rows[i - 2].expenses + rows[i - 1].expenses) / 3;
        const expAfter = after.reduce((a, r) => a + r.expenses, 0) / after.length;
        const eaten = incAfter - incBefore > 0 ? Math.max(0, (expAfter - expBefore) / (incAfter - incBefore)) : 0;
        creep = { at: i, incBefore, incAfter, expBefore, expAfter, eaten };
      }
    }

    // Hijri seasonality of spending (needs a year of history to be honest)
    const hijriBuckets: Record<number, number[]> = {};
    rows.forEach((r) => {
      const hm = hijriMonthOf(r.year, r.month);
      if (hm > 0 && r.expenses > 0) (hijriBuckets[hm] ??= []).push(r.expenses);
    });
    const spendRows = rows.filter((r) => r.expenses > 0);
    const avgExpAll = spendRows.reduce((a, r) => a + r.expenses, 0) / Math.max(1, spendRows.length);
    const seasonality = Array.from({ length: 12 }, (_, i) => {
      const xs = hijriBuckets[i + 1] ?? [];
      return { hm: i + 1, avg: xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0, count: xs.length };
    });
    const seasonReady = n >= 12 && seasonality.filter((s) => s.count > 0).length >= 10;
    const seasonPeak = seasonReady
      ? [...seasonality].filter((s) => s.count > 0).sort((a, b) => b.avg - a.avg)[0]
      : null;

    // saving-rate trend over the last year of data
    const rates = rows.map((r) => r.rate).filter((x): x is number => x !== null);
    const recentRates = rates.slice(-12);
    const trendSlopeYr = slopeOf(recentRates) * 12; // percentage points per year
    const trendReady = recentRates.length >= 4;

    // per-chapter lessons
    const lessons = bands.map((b) => {
      const inRows = rows.slice(b.x1, b.x2 + 1);
      const earned = inRows.reduce((a, r) => a + r.income, 0);
      const rate = earned > 0 ? (inRows.reduce((a, r) => a + r.saved, 0) / earned) * 100 : null;
      const nwDelta = inRows.length > 1 ? inRows[inRows.length - 1].nw - inRows[0].nw : 0;
      return { ...b, months: inRows.length, rate, nwDelta };
    }).filter((x) => x.months >= 2);

    // records for the forensic view
    const withSaved = rows.filter((r) => r.income > 0 || r.expenses > 0);
    const best = withSaved.length ? withSaved.reduce((a, b) => (b.saved > a.saved ? b : a)) : null;
    const worst = withSaved.length ? withSaved.reduce((a, b) => (b.saved < a.saved ? b : a)) : null;
    let streak = 0, bestStreak = 0;
    withSaved.forEach((r) => { streak = r.saved > 0 ? streak + 1 : 0; bestStreak = Math.max(bestStreak, streak); });

    return { rows, n, totalEarned, overallRate, bands, creep, seasonality, seasonReady, seasonPeak, avgExpAll, trendSlopeYr, trendReady, recentRates, lessons, best, worst, bestStreak };
  }, [snaps, chapters]);

  // ── the verdict: how the past positions this person today ─────────────
  const verdict = useMemo(() => {
    if (D.n < 3) return null;
    const latestNw = D.rows[D.n - 1]?.nw ?? 0;
    const pros: string[] = [];
    const cons: string[] = [];
    if (D.overallRate >= 15) pros.push(L(`تدّخر ${D.overallRate.toFixed(0)}% من دخلك عبر مسيرتك — عادة بناء راسخة`, `You save ${D.overallRate.toFixed(0)}% of income across your journey — an established building habit`));
    else if (D.overallRate < 0) cons.push(L('أنفقت عبر مسيرتك أكثر مما كسبت — النزيف هو أول ما يُصلَح', "Across your journey you spent more than you earned — the bleed is the first fix"));
    else if (D.overallRate < 5) cons.push(L(`معدل ادخارك العام ${D.overallRate.toFixed(0)}% — أقل من أن يبني ثروة`, `Your overall saving rate is ${D.overallRate.toFixed(0)}% — too thin to build wealth`));
    if (D.trendReady) {
      if (D.trendSlopeYr > 2) pros.push(L('معدل ادخارك في تحسّن مستمر — الاتجاه يعمل لصالحك', 'Your saving rate keeps improving — the trend works for you'));
      else if (D.trendSlopeYr < -2) cons.push(L('معدل ادخارك يتراجع شهراً بعد شهر — اتجاه يستحق وقفة', 'Your saving rate is decaying month after month — a trend worth stopping'));
    }
    if (D.creep) {
      const eaten = D.creep.eaten;
      if (eaten <= 0.3) pros.push(L('حميت علاوتك الأخيرة من مصروفك — انضباط نادر', 'You protected your last raise from spending — rare discipline'));
      else if (eaten > 0.7) cons.push(L('نمط حياتك ابتلع معظم علاوتك الأخيرة — أخطر عادة في سجلّك', 'Lifestyle swallowed most of your last raise — the most dangerous habit in your record'));
    }
    if (D.bestStreak >= 6) pros.push(L(`${D.bestStreak} أشهر ادخار متتالية — تعرف كيف تستمر`, `${D.bestStreak} consecutive saving months — you know how to sustain`));
    if (latestNw > 0) pros.push(L('خرجت من ماضيك بصافي ثروة موجب', 'You emerged from your past with positive net worth'));
    else cons.push(L('صافي ثروتك اليوم سالب — ماضيك يسلّمك ديناً يجب تفكيكه أولاً', 'Your net worth today is negative — your past hands you debt to dismantle first'));
    const score = pros.length - cons.length;
    const tone: 'up' | 'mixed' | 'fix' = score >= 2 ? 'up' : score <= -1 ? 'fix' : 'mixed';
    return { pros, cons, tone };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [D, ar]);

  // ── explainers ────────────────────────────────────────────────────────
  const EX: Record<string, ExplainContent> = {
    arc: {
      title: L('قوس ثروتك', 'Your wealth arc'),
      what: L('صافي ثروتك شهراً بشهر منذ أول تسجيل، وفصول قصتك مظلَّلة فوق المنحنى — فترى ما فعله كل فصل من حياتك بالخط.', 'Your net worth month by month since the first log, with your story chapters shaded over the curve — so you see what each chapter of your life did to the line.'),
      how: L('صافي الثروة = كل أصولك ناقص التزاماتك، من سجلّك الشهري. الفصول من «قصتي المالية».', 'Net worth = all assets minus liabilities, from your monthly ledger. Chapters come from My Financial Story.'),
      action: L('افتح قصتك وسمِّ الفصل الذي غيّر الخط أكثر من غيره.', 'Open your story and name the chapter that bent the line the most.'),
      ask: L('اقرأ قوس ثروتي وفصوله وأخبرني أي فصل صنعني مالياً وأي فصل كلّفني.', 'Read my wealth arc and its chapters — which chapter made me financially, and which cost me?'),
    },
    creep: {
      title: L('كاشف تضخم نمط الحياة', 'The lifestyle-creep detector'),
      what: L('عند كل ارتفاع واضح في دخلك، يقيس كم من الزيادة ابتلعه مصروفك خلال الأشهر التالية — أخطر عادة مالية تُقاس هنا برقم.', 'At each clear income rise, it measures how much of the raise your spending swallowed over the following months — the most dangerous money habit, measured as one number.'),
      how: L('يقارن متوسط الدخل والمصروف في الأشهر الثلاثة قبل العلاوة بالأشهر الستة بعدها.', 'Compares average income and spending in the three months before the raise with the six months after it.'),
      action: L('في العلاوة القادمة: وجّه نصفها للاستثمار قبل أن يراها مصروفك.', 'On the next raise: route half of it to investing before your spending ever sees it.'),
      ask: L('كم أكل مصروفي من علاواتي السابقة، وكيف أحمي العلاوة القادمة؟', 'How much of my past raises did spending eat, and how do I protect the next one?'),
    },
    season: {
      title: L('مواسم مصروفك — بالتقويم الهجري', 'Your spending seasons — on the Hijri calendar'),
      what: L('متوسط مصروفك في كل شهر هجري عبر سجلّك كله — فيظهر أثر رمضان والأعياد والمواسم على إنفاقك بوضوح.', 'Your average spending in each Hijri month across your whole record — Ramadan, the Eids, and the seasons show their true effect on your spending.'),
      how: L('تُنسب مصروفات كل شهر ميلادي مسجَّل إلى شهره الهجري (أم القرى)، ثم يُحسب المتوسط.', 'Each logged Gregorian month is mapped to its Hijri (Umm al-Qura) month, then averaged.'),
      action: L('ضع ميزانية الموسم الأعلى قبل دخوله بشهر — لا أثناءه.', "Budget your highest season a month before it arrives — not during it."),
      ask: L('في أي المواسم الهجرية يرتفع مصروفي ولماذا، وكيف أخطط لها؟', 'Which Hijri seasons raise my spending and why, and how do I plan for them?'),
    },
    trend: {
      title: L('اتجاه معدل ادخارك', 'Your saving-rate trend'),
      what: L('نسبة ما تُبقيه من دخلك كل شهر، وميلها عبر آخر سنة: تتحسن، تتراجع، أم ثابتة.', 'The share of income you keep each month, and its slope over the last year: improving, decaying, or flat.'),
      how: L('معدل الادخار = (الدخل − المصروف) ÷ الدخل لكل شهر، والاتجاه بميل الانحدار الخطي.', 'Saving rate = (income − spending) ÷ income per month; the trend is the least-squares slope.'),
      action: L('اتجاه أفضل بنقطة مئوية واحدة سنوياً يغيّر مصيرك المالي أكثر من أي شهر بطولي واحد.', 'A trend one percentage point better per year changes your financial fate more than any single heroic month.'),
      ask: L('لماذا يتجه معدل ادخاري بهذا الشكل وما أقوى رافعة لتحسينه؟', "Why is my saving rate trending this way, and what's the strongest lever to improve it?"),
    },
  };

  if (snaps === null) {
    return <div className="text-sm text-[var(--muted)] mb-6">{t('common.loading')}</div>;
  }

  if (D.n === 0) {
    return (
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 mb-6">
        <p className="text-sm text-[var(--ink-2)] mb-3">
          {L('ماضيك المالي يبدأ من أول تسجيل — سجّل شهرك الأول وسيبدأ القوس بالتشكّل.', 'Your financial past begins at the first log — record your first month and the arc starts forming.')}
        </p>
        <Link href="/financial-numbers" className="text-xs font-semibold text-white bg-[var(--green-dark)] rounded-lg px-4 py-2">
          {L('سجّل أرقامك ←', 'Log your numbers →')}
        </Link>
      </div>
    );
  }

  const first = D.rows[0], latest = D.rows[D.n - 1];
  const journey = latest.nw - first.nw;

  return (
    <div className="flex flex-col gap-3 mb-6">
      {/* ═══ 1 · Story ═══ */}
      <Pillar n={1} icon="📖" title={L('القصة', 'Story')} sub={L('ماضيك حكايةً — خط زمني وفصول حياة', 'Your past as a story — a timeline and chapters of life')} />

      <Card title={L('قوس ثروتك — وقصتك فوقه', 'Your wealth arc — with your story on it')} href="/story" explain={EX.arc}>
        <div className="drv-num h-56" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={D.rows} margin={{ top: 18, right: 6, left: 6, bottom: 0 }}>
              <defs>
                <linearGradient id="pastArc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--green)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--green)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              {D.bands.map((b, bi) => (
                <ReferenceArea
                  key={`${b.title}-${bi}`} x1={b.x1} x2={b.x2}
                  fill="var(--ink)" fillOpacity={bi % 2 === 0 ? 0.05 : 0.01}
                  stroke="var(--border-medium)" strokeOpacity={0.35}
                  label={{ value: demoAr(b.title, ar), position: 'insideTop', fontSize: 9, fill: 'var(--ink-2)' }}
                />
              ))}
              <XAxis
                dataKey="i" type="number" domain={[0, D.n - 1]}
                ticks={D.rows.filter((r) => r.month === 1).map((r) => r.i)}
                tickFormatter={(i: number) => String(D.rows[i]?.year ?? '')}
                tick={{ fontSize: 9, fill: 'var(--muted)' }} axisLine={false} tickLine={false}
              />
              <YAxis tickFormatter={(v: number) => fmtCompact(v)} tick={{ fontSize: 9, fill: 'var(--muted)' }} width={42} axisLine={false} tickLine={false} />
              <ReferenceLine y={0} stroke="var(--border-strong)" strokeDasharray="3 3" />
              <Tooltip
                formatter={(v) => [money(Number(v)), L('صافي الثروة', 'Net worth')]}
                labelFormatter={(i) => D.rows[Number(i)]?.label ?? ''}
              />
              <Area type="monotone" dataKey="nw" stroke="var(--green)" strokeWidth={2.5} fill="url(#pastArc)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-between gap-2 flex-wrap mt-1.5">
          <p className="text-[11px] text-[var(--ink-2)] leading-relaxed min-w-0">
            {journey >= 0
              ? L(`من ${moneyC(first.nw)} إلى ${moneyC(latest.nw)} — رحلة ${D.n} شهراً صنعت ${moneyC(Math.abs(journey))}.`, `From ${moneyC(first.nw)} to ${moneyC(latest.nw)} — ${D.n} months that built ${moneyC(Math.abs(journey))}.`)
              : L(`من ${moneyC(first.nw)} إلى ${moneyC(latest.nw)} — ${D.n} شهراً أكلت ${moneyC(Math.abs(journey))}. القوس يشرح أين.`, `From ${moneyC(first.nw)} to ${moneyC(latest.nw)} — ${D.n} months that ate ${moneyC(Math.abs(journey))}. The arc shows where.`)}
          </p>
          <Link href="/story" className="text-[11px] font-semibold text-[var(--green-dark)] hover:underline shrink-0">
            {L('افتح قصتك كاملة ←', 'Open your full story →')}
          </Link>
        </div>
      </Card>

      {/* ═══ 2 · Numbers ═══ */}
      <Pillar n={2} icon="🔢" title={L('الأرقام', 'Numbers')} sub={L('أرشيف حياتك المالية كاملةً حتى اليوم', 'The complete archive of your financial life up to today')} />

      <div className="drv-num grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label={L('أشهر مسجّلة', 'Months logged')} value={String(D.n)} />
        <Stat label={L('كل ما كسبته', 'Everything earned')} value={moneyC(D.totalEarned)} />
        <Stat label={L('ما بقي منه', 'What stayed')} value={moneyC(latest.nw)} accent={latest.nw >= 0 ? 'var(--green-dark)' : 'var(--red-2)'} />
        <Stat label={L('معدل الادخار العام', 'Overall saving rate')} value={`${D.overallRate.toFixed(1)}%`} />
      </div>

      {depth >= 2 && (
        <Card title={L('الداخل والخارج — السجل كاملاً', 'Money in vs out — the whole record')} href="/financial-numbers" className="drv-num">
          <div className="h-44" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={D.rows} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border-faint)" />
                <XAxis dataKey="i" type="number" domain={[0, D.n - 1]}
                  ticks={D.rows.filter((r) => r.month === 1).map((r) => r.i)}
                  tickFormatter={(i: number) => String(D.rows[i]?.year ?? '')}
                  tick={{ fontSize: 9, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v: number) => fmtCompact(v)} tick={{ fontSize: 9, fill: 'var(--muted)' }} width={40} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v, name) => [money(Number(v)), name]}
                  labelFormatter={(i) => D.rows[Number(i)]?.label ?? ''}
                />
                <Bar dataKey="income" name={L('الدخل', 'Income')} fill="var(--green)" opacity={0.85} radius={[2, 2, 0, 0]} />
                <Bar dataKey="expenses" name={L('المصروف', 'Spending')} fill="var(--gold-2)" opacity={0.8} radius={[2, 2, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {depth >= 2 && (D.trendReady ? (
        <Card title={L('اتجاه معدل ادخارك', 'Saving-rate trend')} href="/ratios" explain={EX.trend} className="drv-num">
          {(() => {
            const s = D.trendSlopeYr;
            const verdict = s > 2
              ? { txt: L('يتحسّن', 'Improving'), color: 'var(--green-dark)', icon: '📈' }
              : s < -2
                ? { txt: L('يتراجع', 'Decaying'), color: 'var(--red-2)', icon: '📉' }
                : { txt: L('ثابت', 'Holding flat'), color: 'var(--gold-2)', icon: '➖' };
            return (
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <div className="font-serif text-2xl font-bold" style={{ color: verdict.color }}>{verdict.icon} {verdict.txt}</div>
                  <div className="text-[11px] text-[var(--muted)] mt-0.5">
                    {L(`${s >= 0 ? '+' : '−'}${Math.abs(s).toFixed(1)} نقطة مئوية سنوياً`, `${s >= 0 ? '+' : '−'}${Math.abs(s).toFixed(1)} percentage points per year`)}
                  </div>
                </div>
                <div className="h-14 flex-1 min-w-[140px]" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={D.recentRates.map((r, i) => ({ i, r }))}>
                      <ReferenceLine y={0} stroke="var(--border-strong)" strokeDasharray="2 2" />
                      <Area dataKey="r" stroke={verdict.color} strokeWidth={2} fill={verdict.color} fillOpacity={0.12} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })()}
        </Card>
      ) : (
        <LockedCard title={L('اتجاه معدل ادخارك', 'Saving-rate trend')} hint={L('يحتاج الاتجاه أربعة أشهر مسجّلة على الأقل.', 'The trend needs at least four logged months.')} />
      ))}

      {depth >= 4 && (
        <Card title={L('السجل الكامل — شهراً بشهر', 'The full record — month by month')} href="/financial-numbers" className="drv-num">
          <div className="flex gap-2 flex-wrap mb-3 text-[10px]">
            {D.best && (
              <span className="rounded-full bg-[var(--green-bg)] border border-[var(--green-border)] text-[var(--green-dark)] px-2.5 py-1">
                🏆 {L(`أفضل شهر: ${D.best.label} (+${moneyC(D.best.saved)})`, `Best month: ${D.best.label} (+${moneyC(D.best.saved)})`)}
              </span>
            )}
            {D.worst && D.worst.saved < 0 && (
              <span className="rounded-full bg-[var(--gold-bg)] border border-[var(--gold)]/40 text-[var(--gold-text-alt)] px-2.5 py-1">
                🕳 {L(`أصعب شهر: ${D.worst.label} (−${moneyC(Math.abs(D.worst.saved))})`, `Hardest month: ${D.worst.label} (−${moneyC(Math.abs(D.worst.saved))})`)}
              </span>
            )}
            {D.bestStreak >= 2 && (
              <span className="rounded-full bg-[var(--surface-1)] border border-[var(--border-default)] text-[var(--ink-2)] px-2.5 py-1">
                🔥 {L(`أطول سلسلة ادخار: ${D.bestStreak} أشهر متتالية`, `Longest saving streak: ${D.bestStreak} months in a row`)}
              </span>
            )}
          </div>
          <div className="overflow-x-auto max-h-64 overflow-y-auto rounded-lg border border-[var(--border-faint)]">
            <table className="w-full text-[11px] border-collapse min-w-[420px]">
              <thead className="sticky top-0 bg-[var(--surface-card)]">
                <tr className="text-[var(--muted)] text-[10px]">
                  <th className="text-start p-2">{L('الشهر', 'Month')}</th>
                  <th className="text-start p-2">{L('الدخل', 'Income')}</th>
                  <th className="text-start p-2">{L('المصروف', 'Spending')}</th>
                  <th className="text-start p-2">{L('الادخار', 'Saved')}</th>
                  <th className="text-start p-2">{L('صافي الثروة', 'Net worth')}</th>
                </tr>
              </thead>
              <tbody>
                {[...D.rows].reverse().map((r) => (
                  <tr key={r.i} className="border-t border-[var(--border-faint)]">
                    <td className="p-2 text-[var(--ink)]" dir="ltr">{r.label}</td>
                    <td className="p-2 text-[var(--ink-2)]">{fmt(r.income)}</td>
                    <td className="p-2 text-[var(--ink-2)]">{fmt(r.expenses)}</td>
                    <td className="p-2 font-medium" style={{ color: r.saved >= 0 ? 'var(--green-dark)' : 'var(--red-2)' }}>
                      {r.saved >= 0 ? '+' : '−'}{fmt(Math.abs(r.saved))}{r.rate !== null ? ` (${r.rate.toFixed(0)}%)` : ''}
                    </td>
                    <td className="p-2 text-[var(--ink)]">{fmt(r.nw)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ═══ 3 · Lessons ═══ */}
      <Pillar n={3} icon="💡" title={L('الدروس', 'Lessons')} sub={L('أنماط سلوكك، وما تعنيه — وأين يضعك ماضيك اليوم', 'Your behavior patterns, what they mean — and where your past leaves you today')} />

      {depth >= 3 ? (
        <>
          {verdict && (
            <Card title={L('حُكم الماضي — أين يضعك اليوم؟', "The past's verdict — where does it leave you today?")} href="/today" className="drv-story">
              {(() => {
                const meta = verdict.tone === 'up'
                  ? { icon: '🚀', color: 'var(--green-dark)', txt: L('ماضيك يدفعك للأمام — عاداتك رفعت احتمالات نجاحك المالي.', 'Your past pushes you forward — your habits have raised your odds of financial success.') }
                  : verdict.tone === 'fix'
                    ? { icon: '🔧', color: 'var(--red-2)', txt: L('ماضيك يترك لك إصلاحات كثيرة قبل أن يشتغل المال لصالحك — لكن كل واحدة منها قابلة للفعل، وأثقلها أولاً.', 'Your past leaves you a lot to fix before money works in your favor — but every item is actionable; start with the heaviest.') }
                    : { icon: '⚖️', color: 'var(--gold-2)', txt: L('ماضيك مختلط: أساس حقيقي موجود، وعادات تحتاج ضبطاً حتى لا تأكله.', 'Your past is mixed: a real foundation exists, with habits that need taming before they eat it.') };
                return (
                  <>
                    <div className="flex items-start gap-2.5 mb-3">
                      <span className="text-xl shrink-0">{meta.icon}</span>
                      <p className="text-xs leading-relaxed font-medium" style={{ color: meta.color }}>{meta.txt}</p>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {verdict.pros.length > 0 && (
                        <div>
                          <div className="text-[10px] text-[var(--green-dark)] font-semibold mb-1.5">{L('يعمل لصالحك', 'Working for you')}</div>
                          <ul className="space-y-1">
                            {verdict.pros.map((s, i) => (
                              <li key={i} className="flex gap-1.5 text-[11px] text-[var(--ink-2)] leading-snug"><span className="text-[var(--green-dark)]">✓</span>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {verdict.cons.length > 0 && (
                        <div>
                          <div className="text-[10px] text-[var(--red-2)] font-semibold mb-1.5">{L('يعمل ضدك', 'Working against you')}</div>
                          <ul className="space-y-1">
                            {verdict.cons.map((s, i) => (
                              <li key={i} className="flex gap-1.5 text-[11px] text-[var(--ink-2)] leading-snug"><span className="text-[var(--red-2)]">✗</span>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-[var(--muted)] leading-relaxed mt-3 pt-2.5 border-t border-[var(--border-faint)]">
                      {L(
                        'هذه قراءة سلوك، لا قدَر — ماضيك يفسّر موقعك اليوم، لكنه لا يحدّد غدك: تتغيّر القراءة بتغيّر عاداتك.',
                        'This is a behavior reading, not fate — your past explains where you stand today, but it does not decide your tomorrow: the reading changes as your habits do.'
                      )}
                    </p>
                  </>
                );
              })()}
            </Card>
          )}
          {D.creep ? (
            <Card title={L('كاشف تضخم نمط الحياة', 'Lifestyle-creep detector')} href="/velocity" explain={EX.creep}>
              {(() => {
                const c = D.creep!;
                const raise = c.incAfter - c.incBefore;
                const eatenPct = Math.min(150, Math.round(c.eaten * 100));
                const verdictColor = eatenPct <= 30 ? 'var(--green-dark)' : eatenPct <= 70 ? 'var(--gold-2)' : 'var(--red-2)';
                return (
                  <>
                    <p className="text-xs text-[var(--ink-2)] leading-relaxed mb-3">
                      {L(
                        `حوالي ${D.rows[c.at].label}: ارتفع دخلك الشهري نحو ${money(raise)}. خلال الأشهر التالية، ارتفع مصروفك ${money(Math.max(0, c.expAfter - c.expBefore))}.`,
                        `Around ${D.rows[c.at].label}: your monthly income rose by about ${money(raise)}. Over the following months, your spending rose ${money(Math.max(0, c.expAfter - c.expBefore))}.`
                      )}
                    </p>
                    <div className="drv-num flex items-center gap-3 mb-1.5">
                      <div className="flex-1 h-3 rounded-full bg-[var(--surface-1)] overflow-hidden" dir="ltr">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, eatenPct)}%`, background: verdictColor }} />
                      </div>
                      <div className="font-serif text-xl font-bold shrink-0" style={{ color: verdictColor }}>{eatenPct}%</div>
                    </div>
                    <p className="text-[11px] leading-relaxed" style={{ color: verdictColor }}>
                      {eatenPct <= 30
                        ? L('من العلاوة ذهب للمصروف — انضباط ممتاز؛ الباقي بنى ثروتك.', 'of the raise went to spending — excellent discipline; the rest built wealth.')
                        : eatenPct <= 70
                          ? L('من العلاوة ابتلعها المصروف — معتدل، لكن النصف الضائع كان يمكن أن يستثمر.', 'of the raise was swallowed by spending — moderate, but that lost half could have been invested.')
                          : L('من العلاوة ابتلعها نمط الحياة — هذه أخطر عادة في سجلّك؛ العلاوة القادمة تحتاج خطة قبل وصولها.', 'of the raise was swallowed by lifestyle — the most dangerous habit in your record; the next raise needs a plan before it lands.')}
                    </p>
                  </>
                );
              })()}
            </Card>
          ) : (
            <LockedCard
              title={L('كاشف تضخم نمط الحياة', 'Lifestyle-creep detector')}
              hint={L('لم يرصد سجلّك علاوة واضحة بعد — حين يرتفع دخلك، سيقيس هذا الكاشف كم منه يبتلعه مصروفك.', "Your record shows no clear raise yet — when your income rises, this detector will measure how much of it spending swallows.")}
            />
          )}

          {D.seasonReady ? (
            <Card title={L('مواسم مصروفك — بالهجري', 'Spending seasons — Hijri')} href="/financial-numbers" explain={EX.season}>
              <div className="drv-num h-36" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={D.seasonality} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                    <XAxis dataKey="hm" tickFormatter={(m: number) => (ar ? HIJRI_MONTHS_AR[m - 1] : HIJRI_MONTHS_EN[m - 1]).slice(0, ar ? 5 : 3)} tick={{ fontSize: 8, fill: 'var(--muted)' }} axisLine={false} tickLine={false} interval={0} />
                    <YAxis hide />
                    <ReferenceLine y={D.avgExpAll} stroke="var(--gold-2)" strokeDasharray="4 4" label={{ value: L('متوسطك', 'your avg'), position: 'insideTopRight', fontSize: 8, fill: 'var(--gold-2)' }} />
                    <Tooltip
                      formatter={(v) => [money(Number(v)), L('متوسط المصروف', 'Avg spending')]}
                      labelFormatter={(m) => (ar ? HIJRI_MONTHS_AR[Number(m) - 1] : HIJRI_MONTHS_EN[Number(m) - 1])}
                    />
                    <Bar dataKey="avg" radius={[3, 3, 0, 0]}>
                      {D.seasonality.map((s) => (
                        <Cell key={s.hm} fill={s.hm === 9 ? 'var(--gold-2)' : s.hm === D.seasonPeak?.hm ? 'var(--red-2)' : 'var(--blue-2)'} opacity={s.count === 0 ? 0.15 : 0.9} />
                      ))}
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              {D.seasonPeak && (
                <p className="text-[11px] text-[var(--ink-2)] leading-relaxed mt-1.5">
                  {L(
                    `أعلى مواسمك: ${HIJRI_MONTHS_AR[D.seasonPeak.hm - 1]} — أعلى من متوسطك بـ${Math.round(((D.seasonPeak.avg - D.avgExpAll) / D.avgExpAll) * 100)}%. ${D.seasonPeak.hm === 9 ? 'رمضان يحرّك مصروفك — خطط له قبل دخوله.' : 'خطط لهذا الموسم قبل دخوله بشهر.'}`,
                    `Your highest season: ${HIJRI_MONTHS_EN[D.seasonPeak.hm - 1]} — ${Math.round(((D.seasonPeak.avg - D.avgExpAll) / D.avgExpAll) * 100)}% above your average. ${D.seasonPeak.hm === 9 ? 'Ramadan moves your spending — plan for it before it arrives.' : 'Plan for this season a month before it arrives.'}`
                  )}
                </p>
              )}
            </Card>
          ) : (
            <LockedCard
              title={L('مواسم مصروفك — بالهجري', 'Spending seasons — Hijri')}
              hint={L(`تحتاج هذه القراءة سنة كاملة من التسجيل لتكون صادقة — عندك ${D.n} شهراً حتى الآن.`, `This reading needs a full year of logging to be honest — you have ${D.n} months so far.`)}
            />
          )}

          {D.lessons.length > 0 && (
            <Card title={L('دروس فصولك', 'Lessons from your chapters')} href="/story" className="drv-story">
              <div className="space-y-2.5">
                {D.lessons.map((les, i) => (
                  <div key={i} className="flex gap-2.5 items-start">
                    <span className="text-[var(--gold)] text-xs mt-0.5 shrink-0">📖</span>
                    <div className="text-[11px] leading-relaxed text-[var(--ink-2)] min-w-0">
                      <strong className="text-[var(--ink)]">{demoAr(les.title, ar)}</strong>
                      {' — '}
                      {les.rate !== null
                        ? L(
                          `ادّخرت بمعدل ${les.rate.toFixed(0)}% (مسيرتك كلها: ${D.overallRate.toFixed(0)}%)، و${les.nwDelta >= 0 ? 'نما' : 'انكمش'} صافي ثروتك ${moneyC(Math.abs(les.nwDelta))}.`,
                          `you saved at ${les.rate.toFixed(0)}% (whole journey: ${D.overallRate.toFixed(0)}%), and your net worth ${les.nwDelta >= 0 ? 'grew' : 'shrank'} by ${moneyC(Math.abs(les.nwDelta))}.`
                        )
                        : L(`${les.months} شهراً مسجّلة في هذا الفصل.`, `${les.months} months logged in this chapter.`)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      ) : (
        <button
          onClick={() => setDepth(3)}
          className="text-start bg-[var(--surface-card)] border border-dashed border-[var(--border-default)] rounded-2xl p-5 hover:border-[var(--green)] transition-colors"
        >
          <div className="text-sm font-semibold text-[var(--ink)] mb-1">
            🧊 {L('دروس ماضيك تسكن الأعماق', 'The lessons of your past live in the deep')}
          </div>
          <p className="text-[11px] text-[var(--muted)] leading-relaxed">
            {L(
              'كاشف تضخم نمط الحياة، ومواسم مصروفك بالتقويم الهجري، ودروس فصولك — اغطس إلى عمق «التحليل» لقراءتها.',
              'The lifestyle-creep detector, your Hijri spending seasons, and your chapter lessons — dive to the Analysis depth to read them.'
            )}
          </p>
        </button>
      )}

      {/* ── dive deeper ── */}
      {depth < 4 && (
        <button
          onClick={() => setDepth((depth + 1) as DepthLevel)}
          className="w-full text-xs font-medium text-[var(--green-dark)] bg-[var(--green-bg)] border border-dashed border-[var(--green-border)] rounded-2xl px-5 py-3.5 hover:border-[var(--green)]"
        >
          {ar
            ? `🧊 اغطس إلى «${DEPTH_META[(depth + 1) as DepthLevel].name.ar}» — ${depth === 1 ? 'يظهر تاريخ الداخل والخارج واتجاه ادخارك' : depth === 2 ? 'تُفتح الدروس: تضخم نمط الحياة والمواسم الهجرية ودروس الفصول' : 'يظهر السجل الكامل شهراً بشهر'} ▾`
            : `🧊 Dive to “${DEPTH_META[(depth + 1) as DepthLevel].name.en}” — ${depth === 1 ? 'your in/out history and saving trend appear' : depth === 2 ? 'the Lessons open: lifestyle creep, Hijri seasons, chapter lessons' : 'the full month-by-month record appears'} ▾`}
        </button>
      )}
    </div>
  );

  // ── local pieces ──────────────────────────────────────────────────────
  function Pillar({ n, icon, title, sub }: { n: number; icon: string; title: string; sub: string }) {
    return (
      <div className={`flex items-baseline gap-2 ${n > 1 ? 'mt-3' : ''}`}>
        <span className="w-6 h-6 rounded-full bg-[var(--green-dark)] text-white text-xs font-bold flex items-center justify-center shrink-0">{n}</span>
        <span className="font-serif text-lg font-semibold text-[var(--ink)]">{icon} {title}</span>
        <span className="text-[11px] text-[var(--muted)] min-w-0">{sub}</span>
      </div>
    );
  }
  function Card({ title, href, explain, className = '', children }: { title: string; href: string; explain?: ExplainContent; className?: string; children: React.ReactNode }) {
    return (
      <div className={`bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 ${className}`}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[11px] tracking-[0.08em] uppercase text-[var(--gold)]">{title}</span>
          <span className="flex items-center gap-1.5">
            {explain && <ExplainButton content={explain} />}
            <Link href={href} className="text-[var(--muted)] hover:text-[var(--ink)] text-xs" aria-label={title}>→</Link>
          </span>
        </div>
        {children}
      </div>
    );
  }
  function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
    return (
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-4">
        <div className="text-[10px] text-[var(--muted)] mb-1">{label}</div>
        <div className="font-serif text-lg font-bold" style={{ color: accent ?? 'var(--ink)' }}>{value}</div>
      </div>
    );
  }
  function LockedCard({ title, hint }: { title: string; hint: string }) {
    return (
      <div className="bg-[var(--surface-card)] border border-dashed border-[var(--border-default)] rounded-2xl p-5">
        <div className="text-sm font-semibold text-[var(--muted)] mb-1">{title}</div>
        <p className="text-[11px] text-[var(--muted)] leading-relaxed">{hint}</p>
      </div>
    );
  }
}
