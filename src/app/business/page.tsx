'use client';

// Start your business — the feasibility room. Not a generic calculator:
// it reads the person's OWN Log (cash, saving pace, spending, net worth)
// and answers the founder-to-be's real questions in order:
//   D1 · the dream and one verdict — could I fund this, and when?
//   D2 · the feasibility sketch — break-even, the cash curve, the
//        study checklist with the Saudi doors (licensing, permits)
//   D3 · the funding paths, priced with THEIR numbers — self-fund,
//        bank/Monsha'at loan (Kafalah), a consortium of partners,
//        or a Saudi incubator/accelerator
//   D4 · the engine room — revenue ramp, loan terms, sensitivity,
//        and the personal-risk line nobody else will tell them
// Inputs persist locally (mm-business); the money numbers come from
// the Log, never re-typed.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import ToolStage from '@/components/shared/ToolStage';

interface Snap {
  year: number; month: number;
  cash: number; stocks: number; real_estate: number; equity: number; other_assets: number;
  liabilities: number; income: number; expenses: number;
}

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
const fmtCompact = (n: number) => (Math.abs(n) >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n)));

interface BizInputs { name: string; startupCost: number; monthlyCost: number; monthlyRevenue: number }
const BIZ_KEY = 'mm-business';
const DEFAULTS: BizInputs = { name: '', startupCost: 150000, monthlyCost: 12000, monthlyRevenue: 20000 };

export default function BusinessPage() {
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);

  const [snaps, setSnaps] = useState<Snap[] | null>(null);
  const [biz, setBiz] = useState<BizInputs>(DEFAULTS);
  // D4 assumptions
  const [rampMonths, setRampMonths] = useState(6);
  const [loanRatePct, setLoanRatePct] = useState(8);
  const [loanYears, setLoanYears] = useState(5);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(BIZ_KEY);
      if (raw) setBiz({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch { /* ignore */ }
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSnaps([]); return; }
      const { data } = await supabase
        .from('financial_snapshots')
        .select('year, month, cash, stocks, real_estate, equity, other_assets, liabilities, income, expenses')
        .eq('user_id', user.id)
        .order('year', { ascending: true })
        .order('month', { ascending: true });
      setSnaps((data as Snap[]) ?? []);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setBizField = (patch: Partial<BizInputs>) => {
    setBiz((prev) => {
      const next = { ...prev, ...patch };
      try { window.localStorage.setItem(BIZ_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };
  const num = (v: string) => Number(String(v).replace(/[^\d.]/g, '')) || 0;

  // ── you, from the Log ──
  const me = useMemo(() => {
    if (!snaps || snaps.length === 0) return null;
    const latest = snaps[snaps.length - 1];
    const recent = snaps.slice(-6);
    const avgIncome = recent.reduce((a, s) => a + Number(s.income), 0) / recent.length;
    const avgExpenses = recent.reduce((a, s) => a + Number(s.expenses), 0) / recent.length;
    const assets = Number(latest.cash) + Number(latest.stocks) + Number(latest.equity) + Number(latest.real_estate) + Number(latest.other_assets);
    return {
      cash: Number(latest.cash),
      saved: avgIncome - avgExpenses,
      avgExpenses,
      netWorth: assets - Number(latest.liabilities),
    };
  }, [snaps]);

  // ── the study's arithmetic ──
  const study = useMemo(() => {
    const profitFull = biz.monthlyRevenue - biz.monthlyCost;
    // the untouchable buffer: six months of the person's own life
    const buffer = me ? me.avgExpenses * 6 : 0;
    const deployable = me ? Math.max(0, me.cash - buffer) : 0;
    const stillNeeded = Math.max(0, biz.startupCost - deployable);
    const selfFundMonths = me && me.saved > 0 ? Math.ceil(stillNeeded / me.saved) : null;
    // ramped 36-month business cash curve: revenue climbs linearly to
    // full over rampMonths, costs run from day one
    const points: { m: number; cum: number }[] = [];
    let cum = -biz.startupCost;
    let breakEvenMonth: number | null = null;
    for (let m = 1; m <= 36; m++) {
      const rampFactor = rampMonths > 0 ? Math.min(1, m / rampMonths) : 1;
      cum += biz.monthlyRevenue * rampFactor - biz.monthlyCost;
      points.push({ m, cum: Math.round(cum) });
      if (breakEvenMonth === null && cum >= 0) breakEvenMonth = m;
    }
    // loan path
    const principal = stillNeeded;
    const r = loanRatePct / 100 / 12;
    const n = loanYears * 12;
    const loanPayment = principal > 0 ? (r > 0 ? (principal * r) / (1 - Math.pow(1 + r, -n)) : principal / n) : 0;
    // consortium path
    const partners = deployable > 0 ? Math.max(2, Math.ceil(biz.startupCost / deployable)) : null;
    const equityShare = deployable > 0 ? Math.min(100, (deployable / biz.startupCost) * 100) : 0;
    // sensitivity: revenue ±25%
    const beAt = (revFactor: number) => {
      let c = -biz.startupCost;
      for (let m = 1; m <= 60; m++) {
        const rampFactor = rampMonths > 0 ? Math.min(1, m / rampMonths) : 1;
        c += biz.monthlyRevenue * revFactor * rampFactor - biz.monthlyCost;
        if (c >= 0) return m;
      }
      return null;
    };
    return {
      profitFull, buffer, deployable, stillNeeded, selfFundMonths, points, breakEvenMonth,
      principal, loanPayment, partners, equityShare,
      bePessimistic: beAt(0.75), beBase: breakEvenMonth, beOptimistic: beAt(1.25),
    };
  }, [biz, me, rampMonths, loanRatePct, loanYears]);

  if (snaps === null) {
    return <div className="text-sm text-[var(--muted)]">…</div>;
  }

  const input = (label: string, value: number, onChange: (n: number) => void, placeholder: string) => (
    <label className="block">
      <span className="block text-[10px] font-semibold text-[var(--muted)] mb-1">{label}</span>
      <input
        value={value || ''}
        onChange={(e) => onChange(num(e.target.value))}
        inputMode="numeric" dir="ltr" placeholder={placeholder}
        className="w-full bg-[var(--surface-1)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm font-semibold text-[var(--ink)] outline-none focus:border-[var(--green)]"
      />
    </label>
  );

  return (
    <div className="max-w-3xl">
      <div className="text-[10px] tracking-[0.12em] uppercase text-[var(--gold)] mb-1">🔭 {L('المستقبل', 'The Future')}</div>
      <h1 className="font-serif text-3xl font-semibold text-[var(--ink)] mb-1">🚀 {L('ابدأ مشروعك', 'Start your business')}</h1>
      <p className="text-sm text-[var(--ink-2)] mb-6 max-w-2xl">
        {L(
          'غرفة الجدوى: تدرس فكرتك بأرقامها — وبأرقامك أنت من سِجلّك — وترسم طرق تمويلها في السعودية.',
          "The feasibility room: your idea in its numbers — and in YOUR numbers from the Log — with the Saudi roads to funding it."
        )}
      </p>

      {/* ── D1 · the dream, and one verdict ── */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
        <div className="grid sm:grid-cols-2 gap-3 mb-1">
          <label className="block sm:col-span-2">
            <span className="block text-[10px] font-semibold text-[var(--muted)] mb-1">{L('فكرة المشروع', 'The idea')}</span>
            <input
              value={biz.name}
              onChange={(e) => setBizField({ name: e.target.value })}
              placeholder={L('مقهى مختص في الرياض…', 'A specialty café in Riyadh…')}
              className="w-full bg-[var(--surface-1)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--green)]"
            />
          </label>
          {input(L('رأس المال المطلوب (ر.س)', 'Startup cost (SAR)'), biz.startupCost, (n) => setBizField({ startupCost: n }), '150,000')}
          {input(L('التكلفة التشغيلية الشهرية', 'Monthly operating cost'), biz.monthlyCost, (n) => setBizField({ monthlyCost: n }), '12,000')}
          {input(L('الإيراد الشهري المتوقع', 'Expected monthly revenue'), biz.monthlyRevenue, (n) => setBizField({ monthlyRevenue: n }), '20,000')}
        </div>

        {/* the verdict, from THEIR Log */}
        {me ? (
          <div className="mt-3 rounded-xl border border-[var(--green-border)] bg-[var(--green-bg)]/40 px-4 py-3 text-[12px] text-[var(--ink-2)] leading-relaxed">
            💡 {L(
              `من سِجلّك: نقدك ${fmt(me.cash)}، منه ${fmt(study.deployable)} قابل للاستخدام بعد حجز درعك (٦ أشهر مصاريف = ${fmt(study.buffer)}). `,
              `From your Log: cash ${fmt(me.cash)}, of which ${fmt(study.deployable)} is deployable after your shield (6 months of spending = ${fmt(study.buffer)}). `
            )}
            {study.stillNeeded <= 0
              ? L('يمكنك تمويل المشروع ذاتياً اليوم — رأس المال بيدك.', 'You could self-fund this TODAY — the capital is in hand.')
              : study.selfFundMonths !== null
                ? L(
                    `ينقصك ${fmt(study.stillNeeded)} — وبإيقاع ادخارك (${fmt(me.saved)}/شهرياً) تجمعها خلال ${study.selfFundMonths} شهراً.`,
                    `You're ${fmt(study.stillNeeded)} short — at your saving pace (${fmt(me.saved)}/mo) you close it in ${study.selfFundMonths} months.`
                  )
                : L(
                    `ينقصك ${fmt(study.stillNeeded)} — وادخارك الحالي سالب، فالتمويل الذاتي غير ممكن بهذا الإيقاع؛ انظر طرق التمويل بالأسفل.`,
                    `You're ${fmt(study.stillNeeded)} short — and your current saving is negative, so self-funding can't work at this pace; see the funding paths below.`
                  )}
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-[var(--border-faint)] bg-[var(--surface-1)] px-4 py-3 text-[12px] text-[var(--muted)]">
            {L('سجّل شهراً في ', 'Log a month in ')}<Link href="/log" className="text-[var(--green-dark)] font-semibold hover:underline">{L('السِّجل', 'the Log')}</Link>{L(' ليدخل مالك أنت في الدراسة.', ' and YOUR money joins the study.')}
          </div>
        )}
      </div>

      {/* ── D2 · the feasibility sketch ── */}
      <ToolStage level={2} title={L('مخطط الجدوى', 'The feasibility sketch')}>
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
        <div className="text-sm font-medium text-[var(--ink)] mb-3">📈 {L('منحنى نقد المشروع — ٣٦ شهراً', "The business's cash curve — 36 months")}</div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {([
            [L('ربح شهري (كامل الطاقة)', 'Monthly profit (full steam)'), study.profitFull >= 0 ? fmt(study.profitFull) : `−${fmt(-study.profitFull)}`, study.profitFull >= 0 ? 'var(--green-dark)' : '#D64545'],
            [L('نقطة التعادل', 'Break-even'), study.breakEvenMonth ? L(`الشهر ${study.breakEvenMonth}`, `month ${study.breakEvenMonth}`) : L('لا تتحقق', 'never'), study.breakEvenMonth ? 'var(--green-dark)' : '#D64545'],
            [L('ربح السنة الأولى', 'Year-one result'), (() => { const y1 = study.points[11]?.cum ?? 0; return y1 >= 0 ? fmt(y1) : `−${fmt(-y1)}`; })(), (study.points[11]?.cum ?? 0) >= 0 ? 'var(--green-dark)' : '#E0922A'],
          ] as [string, string, string][]).map(([name, val, color]) => (
            <div key={name} className="bg-[var(--surface-1)] border border-[var(--border-faint)] rounded-xl px-3 py-2.5">
              <div className="text-[9px] text-[var(--muted)]">{name}</div>
              <div className="text-sm font-bold" style={{ color }} dir="ltr">{val}</div>
            </div>
          ))}
        </div>
        <div className="h-44" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={study.points} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border-faint)" />
              <XAxis dataKey="m" tick={{ fontSize: 9, fill: 'var(--muted)' }} interval="preserveStartEnd" reversed={ar} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: 'var(--muted)' }} tickFormatter={fmtCompact} width={46} orientation={ar ? 'right' : 'left'} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 11 }} formatter={(v) => fmt(Number(v))} labelFormatter={(m) => L(`الشهر ${m}`, `Month ${m}`)} />
              <ReferenceLine y={0} stroke="var(--border-medium)" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="cum" name={L('نقد المشروع', 'Business cash')} stroke="#1D9E75" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* the study's checklist — with the Saudi doors */}
        <div className="mt-4 pt-3 border-t border-[var(--border-faint)]">
          <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--muted)] font-semibold mb-2">{L('عناصر دراسة الجدوى', 'The feasibility study, section by section')}</div>
          <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
            {([
              ['🎯', L('السوق: من يشتري؟ وكم حجمهم؟', 'The market: who buys, and how many?')],
              ['⚔️', L('المنافسون: من يخدمهم اليوم وبأي سعر؟', 'Competitors: who serves them today, at what price?')],
              ['💵', L('التسعير: هامشك بعد كل التكاليف', 'Pricing: your margin after ALL costs')],
              ['🏗', L('التشغيل: الموقع والفريق والموردون', 'Operations: location, team, suppliers')],
              ['📜', L('التراخيص: عبر المركز السعودي للأعمال', 'Licensing: via the Saudi Business Center')],
              ['🧾', L('الزكاة والضريبة والفوترة الإلكترونية', 'Zakat, VAT and e-invoicing readiness')],
            ] as [string, string][]).map(([icon, item]) => (
              <div key={item} className="flex items-start gap-2 text-[11px] text-[var(--ink-2)] leading-relaxed">
                <span className="shrink-0" aria-hidden>{icon}</span>{item}
              </div>
            ))}
          </div>
        </div>
      </div>
      </ToolStage>

      {/* ── D3 · the funding paths, priced with YOUR numbers ── */}
      <ToolStage level={3} title={L('طرق التمويل الأربع', 'The four funding paths')}>
      <div className="mb-4">
        <div className="text-[11px] tracking-[0.1em] uppercase text-[var(--muted)] mb-3">{L('طرق التمويل — بأرقامك أنت', 'The funding paths — in YOUR numbers')}</div>
        <div className="grid sm:grid-cols-2 gap-3">
          {/* self-funding */}
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-4">
            <div className="text-sm font-semibold text-[var(--ink)] mb-1">🐢 {L('التمويل الذاتي — بالادخار', 'Self-fund — by saving')}</div>
            <p className="text-xs text-[var(--ink-2)] leading-relaxed">
              {me && study.selfFundMonths !== null
                ? L(
                    `${fmt(study.deployable)} جاهزة الآن + ${fmt(me.saved)}/شهرياً ⇒ رأس المال كاملاً خلال ${study.stillNeeded <= 0 ? 'اليوم' : `${study.selfFundMonths} شهراً`}. أبطأ الطرق — وأسلمها: لا دين ولا شركاء.`,
                    `${fmt(study.deployable)} ready now + ${fmt(me.saved)}/mo ⇒ full capital in ${study.stillNeeded <= 0 ? 'zero months' : `${study.selfFundMonths} months`}. The slowest road — and the safest: no debt, no partners.`
                  )
                : L('يحتاج ادخاراً موجباً — اضبط مصروفك أولاً في «الميزانية».', 'Needs positive saving — steady your spending first in Budgeting.')}
            </p>
          </div>
          {/* loan */}
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-4">
            <div className="text-sm font-semibold text-[var(--ink)] mb-1">🏦 {L('قرض — بنك أو منشآت', "A loan — bank or Monsha'at")}</div>
            <p className="text-xs text-[var(--ink-2)] leading-relaxed">
              {study.principal > 0
                ? L(
                    `اقتراض ${fmt(study.principal)} على ${loanYears} سنوات (${loanRatePct}٪) ⇒ قسط ${fmt(study.loanPayment)}/شهرياً${me ? ` — ${me.saved > 0 && study.loanPayment <= me.saved ? 'ضمن قدرة ادخارك الحالية ✓' : 'فوق قدرة ادخارك الحالية ⚠️'}` : ''}. برنامج «كفالة» يضمن تمويل المنشآت الصغيرة لدى البنوك.`,
                    `Borrow ${fmt(study.principal)} over ${loanYears} years (${loanRatePct}%) ⇒ ${fmt(study.loanPayment)}/mo${me ? ` — ${me.saved > 0 && study.loanPayment <= me.saved ? 'within your current saving power ✓' : 'above your current saving power ⚠️'}` : ''}. The Kafalah program guarantees SME loans at Saudi banks.`
                  )
                : L('لا تحتاج قرضاً — رأس المال متوفر ذاتياً.', 'No loan needed — the capital is covered.')}
            </p>
          </div>
          {/* consortium */}
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-4">
            <div className="text-sm font-semibold text-[var(--ink)] mb-1">🤝 {L('شراكة — كونسورتيوم', 'A consortium — partners')}</div>
            <p className="text-xs text-[var(--ink-2)] leading-relaxed">
              {study.partners
                ? L(
                    `بمساهمتك (${fmt(study.deployable)}) يلزم نحو ${study.partners} شركاء بمساهمات مماثلة — وحصتك تبدأ من ~${study.equityShare.toFixed(0)}٪. أسرع انطلاقاً، وأثقل حوكمةً: اتفاقية شركاء مكتوبة قبل أي ريال.`,
                    `At your contribution (${fmt(study.deployable)}) you'd need ~${study.partners} similar partners — your equity starts near ${study.equityShare.toFixed(0)}%. Faster to launch, heavier to govern: a written partners' agreement before any riyal.`
                  )
                : L('تحتاج نقداً قابلاً للاستخدام لتدخل شراكة من موقع قوة.', 'You need deployable cash to enter a partnership from strength.')}
            </p>
          </div>
          {/* incubators */}
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-4">
            <div className="text-sm font-semibold text-[var(--ink)] mb-1">🌱 {L('حاضنات ومسرّعات سعودية', 'Saudi incubators & accelerators')}</div>
            <p className="text-xs text-[var(--ink-2)] leading-relaxed mb-1.5">
              {L(
                'تمويل أولي ومساحات وإرشاد مقابل التقدّم ببرنامج — الأنسب حين تكون الفكرة قابلة للنمو.',
                'Seed support, space and mentorship through a program — the road for scalable ideas.'
              )}
            </p>
            <div className="flex flex-wrap gap-1">
              {['منشآت Monsha\'at', 'بادر Badir', 'The Garage الكراج', 'Flat6Labs Riyadh', 'KAUST Innovation'].map((n) => (
                <span key={n} className="text-[9px] font-medium rounded-full border border-[var(--border-default)] text-[var(--muted)] px-2 py-0.5">{n}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
      </ToolStage>

      {/* ── D4 · the engine room ── */}
      <ToolStage level={4} title={L('غرفة المحرّك — الافتراضات والحساسية', 'The engine room — assumptions & sensitivity')}>
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
        <div className="text-sm font-medium text-[var(--ink)] mb-3">⚙️ {L('الافتراضات', 'Assumptions')}</div>
        <div className="grid sm:grid-cols-3 gap-x-6 gap-y-4 mb-4">
          {([
            [L('أشهر بلوغ كامل الإيراد', 'Months to full revenue'), rampMonths, 0, 18, 1, setRampMonths, (v: number) => String(v)],
            [L('فائدة القرض ٪', 'Loan rate %'), loanRatePct, 2, 16, 0.5, setLoanRatePct, (v: number) => `${v}%`],
            [L('سنوات القرض', 'Loan years'), loanYears, 1, 10, 1, setLoanYears, (v: number) => String(v)],
          ] as [string, number, number, number, number, (n: number) => void, (v: number) => string][]).map(([label, val, min, max, step, set, show]) => (
            <label key={label} className="block">
              <span className="flex justify-between text-[10px] font-semibold text-[var(--muted)] mb-1">
                <span>{label}</span><span className="text-[var(--ink)]" dir="ltr">{show(val)}</span>
              </span>
              <input type="range" min={min} max={max} step={step} value={val} onChange={(e) => set(Number(e.target.value))} className="w-full accent-[var(--green)]" dir="ltr" />
            </label>
          ))}
        </div>

        {/* sensitivity: the three futures */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {([
            [L('متشائم (−٢٥٪ إيراد)', 'Pessimistic (−25% rev)'), study.bePessimistic, '#D64545'],
            [L('الأساس', 'Base'), study.beBase, 'var(--gold)'],
            [L('متفائل (+٢٥٪ إيراد)', 'Optimistic (+25% rev)'), study.beOptimistic, 'var(--green-dark)'],
          ] as [string, number | null, string][]).map(([name, be, color]) => (
            <div key={name} className="bg-[var(--surface-1)] border border-[var(--border-faint)] rounded-xl px-3 py-2.5">
              <div className="text-[9px] text-[var(--muted)]">{name}</div>
              <div className="text-sm font-bold" style={{ color }} dir="ltr">
                {be ? L(`تعادل: الشهر ${be}`, `BE: month ${be}`) : L('لا تعادل', 'no BE')}
              </div>
            </div>
          ))}
        </div>

        {/* the personal-risk line — the sentence nobody else says */}
        {me && (
          <div className="rounded-xl border border-[var(--gold)]/40 bg-[var(--gold)]/5 px-4 py-3 text-[12px] text-[var(--ink-2)] leading-relaxed">
            ⚠️ {L(
              `خط الصراحة: لو تعثّر المشروع بعد رأس المال كاملاً، تكون خسارتك ${fmt(biz.startupCost)} — أي ${me.netWorth > 0 ? `${Math.round((biz.startupCost / me.netWorth) * 100)}٪ من صافي ثروتك` : 'أكثر من صافي ثروتك الحالية'}. درعك (${fmt(study.buffer)}) خارج المخاطرة دائماً.`,
              `The honesty line: if the business fails after the full capital, your loss is ${fmt(biz.startupCost)} — ${me.netWorth > 0 ? `${Math.round((biz.startupCost / me.netWorth) * 100)}% of your net worth` : 'more than your current net worth'}. Your shield (${fmt(study.buffer)}) stays out of the fire, always.`
            )}
          </div>
        )}
      </div>
      </ToolStage>

      {/* the Brain knows this study */}
      <Link
        href="/advisor"
        className="block w-full text-center text-sm font-semibold bg-[var(--green-dark)] text-white rounded-xl px-4 py-3"
        onClick={() => {
          try { window.sessionStorage.setItem('mm-ask', `I'm considering starting a business${biz.name ? ` (${biz.name})` : ''}: startup cost ${biz.startupCost}, monthly cost ${biz.monthlyCost}, expected revenue ${biz.monthlyRevenue}. Given my finances, which funding path fits me best?`); } catch { /* ignore */ }
        }}
      >
        🧠 {L('اعرض الدراسة على العقل ←', 'Put the study to the Brain →')}
      </Link>
    </div>
  );
}
