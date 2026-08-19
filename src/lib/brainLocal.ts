// src/lib/brainLocal.ts
// The Brain's local thinking layer — a deterministic engine that answers
// from the Log and the sourced Saudi reference data with NO model call.
// It composes the exact same rich-message format the live model uses
// (```chart fences, [label](/path) chips, /log?spot= pointing), so the
// advisor page renders it through the same pipeline, and when a live
// model is connected these composers become its tool layer.
//
// It runs wherever the app runs: demo personas (which the API route
// rejects) get a fully working Brain, and real users get a resilient
// fallback when the live model is unreachable.

import { createClient } from '@/lib/supabase/client';
import { SALARY_CITIES, SALARY_TREND, CLASS_BANDS, HOUSEHOLD, GOSI, REF_SOURCES } from '@/lib/saudiReference';

interface Snap {
  year: number; month: number;
  income: number; expenses: number; cash: number;
  stocks: number; equity: number; real_estate: number;
  other_assets: number; liabilities: number;
}

export interface BrainContext {
  name: string | null;
  age: number | null;
  snaps: Snap[]; // ascending
  avgIncome: number;
  avgExpenses: number;
  saved: number;
  cash: number;
  invested: number;
  property: number;
  liabilities: number;
  netWorth: number;
}

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
const chart = (spec: object) => '\n```chart\n' + JSON.stringify(spec) + '\n```\n';
const mLabel = (s: Snap) => `${s.month}/${String(s.year).slice(2)}`;

export async function loadBrainContext(): Promise<BrainContext | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data: snapsRaw }, { data: prof }] = await Promise.all([
    supabase.from('financial_snapshots')
      .select('year, month, income, expenses, cash, stocks, equity, real_estate, other_assets, liabilities')
      .eq('user_id', user.id)
      .order('year', { ascending: true }).order('month', { ascending: true }),
    supabase.from('profiles').select('name, age').eq('id', user.id).single(),
  ]);
  const snaps = ((snapsRaw as Snap[] | null) ?? []).map((s) => ({
    ...s,
    income: Number(s.income), expenses: Number(s.expenses), cash: Number(s.cash),
    stocks: Number(s.stocks), equity: Number(s.equity), real_estate: Number(s.real_estate),
    other_assets: Number(s.other_assets), liabilities: Number(s.liabilities),
  }));
  if (snaps.length === 0) return null;
  const recent = snaps.slice(-6);
  const avgIncome = recent.reduce((a, s) => a + s.income, 0) / recent.length;
  const avgExpenses = recent.reduce((a, s) => a + s.expenses, 0) / recent.length;
  const last = snaps[snaps.length - 1];
  const invested = last.stocks + last.equity;
  const property = last.real_estate + last.other_assets;
  const p = prof as { name: string | null; age: number | null } | null;
  return {
    name: p?.name ?? null,
    age: p?.age ?? null,
    snaps,
    avgIncome, avgExpenses,
    saved: avgIncome - avgExpenses,
    cash: last.cash,
    invested, property,
    liabilities: last.liabilities,
    netWorth: last.cash + invested + property - last.liabilities,
  };
}

// ── composers — each one is a tool of the product speaking through the Brain ──

function netWorthSeries(ctx: BrainContext) {
  return ctx.snaps.slice(-12).map((s) => ({
    label: mLabel(s),
    value: Math.round(s.cash + s.stocks + s.equity + s.real_estate + s.other_assets - s.liabilities),
  }));
}

function spendingReply(ctx: BrainContext, ar: boolean): string {
  const pct = ctx.avgIncome > 0 ? Math.round((ctx.avgExpenses / ctx.avgIncome) * 100) : 0;
  const win = ctx.snaps.slice(-6);
  const rising = win.length >= 2 && win[win.length - 1].expenses > win[0].expenses;
  const data = win.map((s) => ({ label: mLabel(s), value: Math.round(s.expenses) }));
  return ar
    ? `متوسط مصروفك آخر ٦ أشهر «${fmt(ctx.avgExpenses)}» شهرياً — أي ${pct}٪ من دخلك، و${rising ? 'الاتجاه صاعد؛ يستحق نظرة' : 'الاتجاه مستقر'}.` +
      chart({ type: 'bar', title: 'مصروفك — آخر ٦ أشهر', data, color: '#D64545' }) +
      `المس البند نفسه: [بند المصروف](/log?spot=spending) — أو اضبط الإيقاع في [الميزانية](/budgeting) و[الاشتراكات](/subscriptions).`
    : `Your average spending over the last 6 months is ${fmt(ctx.avgExpenses)}/mo — ${pct}% of your income, and the trend is ${rising ? 'rising; worth a look' : 'steady'}.` +
      chart({ type: 'bar', title: 'Your spending — last 6 months', data, color: '#D64545' }) +
      `Touch the line itself: [the spending line](/log?spot=spending) — or steady the rhythm in [Budgeting](/budgeting) and [Subscriptions](/subscriptions).`;
}

function incomeReply(ctx: BrainContext, ar: boolean): string {
  const riyadh = SALARY_CITIES[0];
  const above = ctx.avgIncome >= riyadh.avg;
  const natTrendPct = Math.round(((SALARY_TREND.to.avg - SALARY_TREND.from.avg) / SALARY_TREND.from.avg) * 100);
  return ar
    ? `دخلك «${fmt(ctx.avgIncome)}» شهرياً — ${above ? 'فوق' : 'تحت'} متوسط ${riyadh.ar} (${fmt(riyadh.avg)}) حسب ${REF_SOURCES.jisr.ar}. المتوسط الوطني نما ${natTrendPct}٪ بين ${SALARY_TREND.from.year} و${SALARY_TREND.to.year} — قارن نفسك وفكّر في الزيادة داخل [الرواتب](/salaries)، وحدّث [بند الدخل](/log?spot=income) إن تغيّر.`
    : `Your income is ${fmt(ctx.avgIncome)}/mo — ${above ? 'above' : 'below'} the ${riyadh.en} average (${fmt(riyadh.avg)}) per ${REF_SOURCES.jisr.en}. The national average grew ${natTrendPct}% between ${SALARY_TREND.from.year} and ${SALARY_TREND.to.year} — benchmark yourself and think through a raise in [Salaries](/salaries), and update [the income line](/log?spot=income) if it changed.`;
}

function netWorthReply(ctx: BrainContext, ar: boolean): string {
  const series = netWorthSeries(ctx);
  const delta = series.length >= 2 ? series[series.length - 1].value - series[0].value : 0;
  return ar
    ? `صافي ثروتك اليوم «${fmt(ctx.netWorth)}» — ${delta >= 0 ? `نمت ${fmt(delta)}` : `انخفضت ${fmt(-delta)}`} خلال الفترة المسجلة:` +
      chart({ type: 'line', title: 'صافي الثروة عبر الزمن', data: series }) +
      `التكوين: نقد ${fmt(ctx.cash)} · استثمارات ${fmt(ctx.invested)} · عقار وأصول ${fmt(ctx.property)} · التزامات −${fmt(ctx.liabilities)}. الصورة الكاملة في [السِّجل](/log) ولوحة [النظرة الكاملة](/home).`
    : `Your net worth today is ${fmt(ctx.netWorth)} — it ${delta >= 0 ? `grew ${fmt(delta)}` : `fell ${fmt(-delta)}`} over the recorded stretch:` +
      chart({ type: 'line', title: 'Net worth over time', data: series }) +
      `The composition: cash ${fmt(ctx.cash)} · investments ${fmt(ctx.invested)} · property & assets ${fmt(ctx.property)} · liabilities −${fmt(ctx.liabilities)}. The full picture lives in [the Log](/log) and the [full overview](/home).`;
}

function savingReply(ctx: BrainContext, ar: boolean): string {
  const rate = ctx.avgIncome > 0 ? (ctx.saved / ctx.avgIncome) * 100 : 0;
  const data = [
    { label: ar ? 'أنت' : 'You', value: Math.round(rate * 10) / 10 },
    { label: ar ? 'السعودية' : 'Saudi avg', value: HOUSEHOLD.savingsRatePct },
    { label: ar ? 'مستهدف الرؤية' : 'Vision target', value: HOUSEHOLD.visionTargetPct },
    { label: ar ? 'المعيار العالمي' : 'Global standard', value: HOUSEHOLD.globalStandardPct },
  ];
  const verdict = rate <= 0
    ? (ar ? 'ادخارك سالب — كل شيء يبدأ من هنا.' : 'your saving is negative — everything starts here.')
    : rate >= HOUSEHOLD.globalStandardPct
      ? (ar ? 'فوق المعيار العالمي ✓' : 'above the global standard ✓')
      : (ar ? 'بين المتوسط السعودي والمعيار — قابل للرفع.' : 'between the Saudi average and the standard — liftable.');
  return ar
    ? `تدّخر «${fmt(ctx.saved)}» شهرياً (${Math.round(rate)}٪ من دخلك) — ${verdict}` +
      chart({ type: 'bar', title: `نسبة الادخار ٪ — ${REF_SOURCES.kpmg.ar}`, data }) +
      `وجّه الفائض في [صندوق هدف](/goal-fund) أو رتّب أولوياته في [شلال الريال](/waterfall).`
    : `You save ${fmt(ctx.saved)}/mo (${Math.round(rate)}% of income) — ${verdict}` +
      chart({ type: 'bar', title: `Savings rate % — ${REF_SOURCES.kpmg.en}`, data }) +
      `Aim the surplus in a [Goal Fund](/goal-fund) or order its priorities in [the Waterfall](/waterfall).`;
}

function debtReply(ctx: BrainContext, ar: boolean): string {
  const assets = ctx.cash + ctx.invested + ctx.property;
  const ratio = assets > 0 ? Math.round((ctx.liabilities / assets) * 100) : 0;
  return ar
    ? `التزاماتك «${fmt(ctx.liabilities)}» — تعادل ${ratio}٪ من أصولك. ${ratio <= 35 ? 'نسبة صحية عموماً.' : 'نسبة تستحق خطة سداد.'} افتح [دفتر الديون](/log?spot=liabilities)، وراقب استخدام البطاقات في [البطاقات الائتمانية](/credit-cards) — القاعدة: استخدام أقل من ٣٠٪.`
    : `Your liabilities are ${fmt(ctx.liabilities)} — ${ratio}% of your assets. ${ratio <= 35 ? 'A generally healthy ratio.' : 'A ratio that deserves a paydown plan.'} Open [the debt book](/log?spot=liabilities), and watch card utilization in [Credit cards](/credit-cards) — the rule: keep it under 30%.`;
}

function retirementReply(ctx: BrainContext, ar: boolean): string {
  const wage = (ctx.avgIncome / 1.35) * 1.25; // basic + housing
  const deduction = wage * ((GOSI.annuities.employeePct + GOSI.saned.employeePct) / 100);
  const years = Math.max(10, GOSI.retirementAge - Math.min(ctx.age ?? 27, 55));
  const pension = Math.max(GOSI.minPension, Math.min(1, (years * GOSI.accrualPerYearPct) / 100) * wage);
  const coverage = ctx.avgExpenses > 0 ? Math.round((pension / ctx.avgExpenses) * 100) : 0;
  return ar
    ? `طبقة الدولة أولاً: يُقتطع منك نحو «${fmt(deduction)}» شهرياً للتأمينات، وبمعادلة ${GOSI.accrualPerYearPct}٪ عن كل سنة اشتراك قد يبلغ معاشك عند ${GOSI.retirementAge} نحو «${fmt(pension)}» — يغطي ${coverage}٪ من مصروفك اليوم، والباقي وظيفة محفظتك. فكّك الطبقة في [التأمينات](/gosi) واجمعها مع محفظتك في [التقاعد](/retirement). (${REF_SOURCES.gosi.ar})`
    : `The state's layer first: about ${fmt(deduction)}/mo leaves your payslip for GOSI, and at ${GOSI.accrualPerYearPct}% per contribution year your pension at ${GOSI.retirementAge} could reach ~${fmt(pension)} — covering ${coverage}% of today's spending; the rest is your portfolio's job. Unpack the layer in [GOSI](/gosi) and combine it with your pot in [Retirement](/retirement). (${REF_SOURCES.gosi.en})`;
}

function classReply(ctx: BrainContext, ar: boolean): string {
  const band = CLASS_BANDS.find((b) => ctx.avgIncome >= b.lo && (b.hi === null || ctx.avgIncome < b.hi)) ?? CLASS_BANDS[0];
  return ar
    ? `بدخل «${fmt(ctx.avgIncome)}» شهرياً تقع أسرتك في «${band.ar}» ${band.icon} حسب ${REF_SOURCES.grc.ar}. الشرائح كاملةً وموقعك بينها في [الطبقة الاجتماعية](/class)، ومقارنتك بأقرانك في [موقعك بين الناس](/positioning).`
    : `At ${fmt(ctx.avgIncome)}/mo your household sits in the «${band.en}» band ${band.icon} per ${REF_SOURCES.grc.en}. The full bands and your place among them are in [Social class](/class), and your peer comparison in [Positioning](/positioning).`;
}

function runwayReply(ctx: BrainContext, ar: boolean): string {
  const months = ctx.avgExpenses > 0 ? ctx.cash / ctx.avgExpenses : 0;
  const m1 = Math.round(months * 10) / 10;
  const saned = Math.min(GOSI.saned.firstMonthsCap, (ctx.avgIncome / 1.35) * 1.25 * (GOSI.saned.firstMonthsPct / 100));
  return ar
    ? `درعك النقدي «${fmt(ctx.cash)}» يصمد ${m1} شهراً بمصروفك الحالي — ${months >= 6 ? 'فوق نطاق الأمان (٦ أشهر) ✓' : months >= 3 ? 'داخل النطاق الأدنى (٣–٦ أشهر)' : 'تحت النطاق؛ هذا أول صندوق يستحق البناء'}. ولو توقف الدخل، يدفع ساند نحو ${fmt(saned)} شهرياً في الأشهر الأولى. خريطة الصمود كاملة في [خط الفقر](/poverty)، والتغطيات في [التأمين](/insurance).`
    : `Your cash shield of ${fmt(ctx.cash)} holds ${m1} months at current spending — ${months >= 6 ? 'above the safety range (6 months) ✓' : months >= 3 ? 'inside the minimum range (3–6 months)' : 'below the range; this is the first fund worth building'}. And if income stops, SANED pays ~${fmt(saned)}/mo in the first months. The full holding map is in [The Poverty Line](/poverty), covers in [Insurance](/insurance).`;
}

function houseReply(ctx: BrainContext, ar: boolean): string {
  const cap = ctx.avgIncome * 0.33;
  return ar
    ? `قاعدة التمويل العقاري: أقساطك كلها ≤ ٣٣٪ من دخلك — أي «${fmt(cap)}» شهرياً كسقف. جدول السداد وسيناريوهات الدفعة الأولى وبرامج سكني في [الرهن العقاري](/mortgage)، وموّل الدفعة من [صندوق هدف](/goal-fund).`
    : `The mortgage rule: all your installments ≤ 33% of income — ${fmt(cap)}/mo as your ceiling. Amortization, down-payment scenarios and Sakani programs live in [Mortgage](/mortgage); fund the down payment via a [Goal Fund](/goal-fund).`;
}

function carReply(ctx: BrainContext, ar: boolean): string {
  const cap = ctx.avgIncome * 0.1;
  return ar
    ? `قاعدة ٢٠/٤/١٠ للسيارة: دفعة ٢٠٪، تمويل ≤ ٤ سنوات، وقسط ≤ ١٠٪ من دخلك — أي «${fmt(cap)}» شهرياً. التكلفة الحقيقية بالإهلاك كاملةً في [قرض السيارة](/auto-loan).`
    : `The 20/4/10 car rule: 20% down, financing ≤ 4 years, payment ≤ 10% of income — ${fmt(cap)}/mo for you. The true cost with depreciation is in [Auto loan](/auto-loan).`;
}

function businessReply(ctx: BrainContext, ar: boolean): string {
  const deployable = ctx.cash - 6 * ctx.avgExpenses;
  return ar
    ? (deployable > 0
        ? `بعد حجز درع ٦ أشهر، تستطيع نشر «${fmt(deployable)}» في مشروع دون المساس بأمانك.`
        : `درعك النقدي لا يغطي ٦ أشهر بعد — رأس مال المشروع يبدأ من بناء الدرع أولاً.`) +
      ` دراسة الجدوى ومسارات التمويل (كفالة، منشآت) والحاضنات في [ابدأ مشروعك](/business).`
    : (deployable > 0
        ? `After reserving a 6-month shield, you can deploy ${fmt(deployable)} into a venture without touching your safety.`
        : `Your cash shield doesn't cover 6 months yet — venture capital starts with building the shield first.`) +
      ` Feasibility, funding paths (Kafalah, Monsha'at) and incubators live in [Start your business](/business).`;
}

function familyReply(ctx: BrainContext, ar: boolean): string {
  const fund = 80000;
  const months = ctx.saved > 0 ? Math.ceil(fund / ctx.saved) : null;
  return ar
    ? `${months !== null ? `بإيقاع ادخارك الحالي (${fmt(ctx.saved)}/شهرياً) تجمع صندوق زواج «${fmt(fund)}» في ${months} شهراً تقريباً.` : 'ادخارك الحالي سالب — محطات الأسرة تبدأ من ضبط التدفق.'} كل المحطات — الزواج، سنة الطفل الأولى، المدارس، وكلفة الطفل حتى ١٨ — بأرقامك في [تخطيط الأسرة](/family).`
    : `${months !== null ? `At your saving pace (${fmt(ctx.saved)}/mo) you gather an ${fmt(fund)} marriage fund in ~${months} months.` : 'Your saving is negative — family milestones start with steadying the flow.'} Every milestone — marriage, a child's first year, schooling, and the cost of a child to 18 — in YOUR numbers, in [Family planning](/family).`;
}

function marketReply(ctx: BrainContext, ar: boolean): string {
  return ar
    ? `استثماراتك المسجلة «${fmt(ctx.invested)}». لوحة المؤشرات الحية — تاسي، S&P، الذهب — ومقارنتك بها تعمل في [الأسواق والمؤشرات](/markets)، ومحفظتك بأسعارها في [ممتلكاتك](/holdings)، وخطها التاريخي في [بند المحافظ](/log?spot=portfolio).`
    : `Your recorded investments: ${fmt(ctx.invested)}. The live board — TASI, S&P, gold — and you-vs-benchmarks runs in [Markets & Indices](/markets); your priced portfolio in [Holdings](/holdings); its history line in [the portfolio line](/log?spot=portfolio).`;
}

function freedomReply(ctx: BrainContext, ar: boolean): string {
  const pot = 25 * 12 * ctx.avgExpenses;
  const progress = pot > 0 ? Math.round(((ctx.invested + ctx.cash) / pot) * 100) : 0;
  return ar
    ? `الحرية المالية تقريباً = ٢٥ ضعف مصروفك السنوي: «${fmt(pot)}». أنت اليوم عند ${progress}٪ منها. التاريخ المتوقع وعتلات تقريبه في [الحرية المالية](/freedom)، ومسار المضاعفة في [طريق المضاعفة](/doubling-path).`
    : `Financial freedom ≈ 25× your annual spending: ${fmt(pot)}. You're at ${progress}% of it today. The projected date and its levers are in [Freedom](/freedom); the compounding path in [Doubling path](/doubling-path).`;
}

function helpReply(ar: boolean): string {
  return ar
    ? `أقرأ سِجلّك وأجيب بأرقامك عن: المصروف، الدخل، الادخار، صافي الثروة، الديون، التقاعد والتأمينات، طبقتك الاجتماعية، درع الطوارئ، البيت، السيارة، المشروع، الأسرة، والأسواق. وكل أداة من أدوات المنتج الـ٣٦ خلف باب واحد: [صندوق الأدوات](/toolbox).`
    : `I read your Log and answer in YOUR numbers about: spending, income, saving, net worth, debt, retirement & GOSI, your social class, the emergency shield, the house, the car, the business, the family, and the markets. And all 36 tools of the product sit behind one door: [the Toolbox](/toolbox).`;
}

// ── the router: intent keywords (AR + EN) → composer ──
const INTENTS: { keys: string[]; make: (ctx: BrainContext, ar: boolean) => string }[] = [
  { keys: ['مصروف', 'صرف', 'انفاق', 'إنفاق', 'spend', 'expense'], make: spendingReply },
  { keys: ['راتب', 'دخل', 'salary', 'income', 'earn', 'raise', 'علاوة'], make: incomeReply },
  { keys: ['صافي', 'ثروة', 'ثروت', 'net worth', 'networth', 'wealth'], make: netWorthReply },
  { keys: ['ادخار', 'أدخر', 'ادخر', 'وفر', 'توفير', 'sav'], make: savingReply },
  { keys: ['دين', 'ديون', 'قرض', 'قروض', 'التزام', 'بطاق', 'debt', 'loan', 'liabilit', 'card'], make: debtReply },
  { keys: ['تقاعد', 'معاش', 'تأمينات', 'ساند', 'retire', 'gosi', 'pension', 'saned'], make: retirementReply },
  { keys: ['طبقة', 'طبقت', 'مقارنة بالناس', 'class', 'compare me'], make: classReply },
  { keys: ['طوارئ', 'أمان', 'صمود', 'درع', 'emergency', 'runway', 'cushion', 'safety'], make: runwayReply },
  { keys: ['بيت', 'منزل', 'رهن', 'عقار', 'سكني', 'house', 'mortgage', 'sakani', 'apartment'], make: houseReply },
  { keys: ['سيارة', 'سياره', 'car', 'auto'], make: carReply },
  { keys: ['مشروع', 'تجارة', 'شركة', 'business', 'startup', 'venture'], make: businessReply },
  { keys: ['زواج', 'أسرة', 'عائلة', 'أطفال', 'طفل', 'عيال', 'marr', 'family', 'child', 'kid', 'wedding'], make: familyReply },
  { keys: ['سوق', 'تاسي', 'سهم', 'أسهم', 'مؤشر', 'ذهب', 'market', 'tasi', 'stock', 'index', 'gold'], make: marketReply },
  { keys: ['حرية', 'استقلال', 'freedom', 'independen'], make: freedomReply },
  { keys: ['أدوات', 'تساعد', 'تقدر', 'وش تسوي', 'help', 'what can', 'tools', 'how do you'], make: (_c, ar) => helpReply(ar) },
];

export function composeLocalReply(question: string, ctx: BrainContext, ar: boolean): string {
  const q = question.toLowerCase();
  for (const intent of INTENTS) {
    if (intent.keys.some((k) => q.includes(k))) return intent.make(ctx, ar);
  }
  // no intent matched — give the situational verdict + the capability map
  const rate = ctx.avgIncome > 0 ? Math.round((ctx.saved / ctx.avgIncome) * 100) : 0;
  return ar
    ? `من سِجلّك: دخل «${fmt(ctx.avgIncome)}» · مصروف «${fmt(ctx.avgExpenses)}» · ادخار ${rate}٪ · صافي ثروة «${fmt(ctx.netWorth)}». ${helpReply(ar)}`
    : `From your Log: income ${fmt(ctx.avgIncome)} · spending ${fmt(ctx.avgExpenses)} · saving ${rate}% · net worth ${fmt(ctx.netWorth)}. ${helpReply(ar)}`;
}

// ── the proactive reading — the Brain speaks first ──
export function composeBriefing(ctx: BrainContext, ar: boolean): string {
  const last = ctx.snaps[ctx.snaps.length - 1];
  const rate = ctx.avgIncome > 0 ? Math.round((ctx.saved / ctx.avgIncome) * 100) : 0;
  const months = ctx.avgExpenses > 0 ? Math.round((ctx.cash / ctx.avgExpenses) * 10) / 10 : 0;
  const series = netWorthSeries(ctx);
  const flowLine = ctx.saved >= 0
    ? (ar ? `ينجو من دخلك «${fmt(ctx.saved)}» شهرياً (${rate}٪)` : `${fmt(ctx.saved)}/mo of your income survives (${rate}%)`)
    : (ar ? `تصرف فوق دخلك بـ«${fmt(-ctx.saved)}» شهرياً — هذا أول خيط أسحبه` : `you spend ${fmt(-ctx.saved)}/mo above your income — the first thread I'd pull`);
  return ar
    ? `قراءتي لسِجلّك حتى ${last.month}/${last.year}: ${flowLine}، ودرعك النقدي يصمد ${months} شهراً، وصافي ثروتك «${fmt(ctx.netWorth)}»:` +
      chart({ type: 'line', title: 'صافي الثروة عبر الزمن', data: series }) +
      `اسألني عن أي بند — أو المس ما يهمّك مباشرة: [المصروف](/log?spot=spending) · [درع الطوارئ](/poverty) · [تقاعدك](/gosi) · [طبقتك](/class) · [كل الأدوات](/toolbox)`
    : `My reading of your Log through ${last.month}/${last.year}: ${flowLine}, your cash shield holds ${months} months, and your net worth is ${fmt(ctx.netWorth)}:` +
      chart({ type: 'line', title: 'Net worth over time', data: series }) +
      `Ask me about any line — or touch what matters directly: [spending](/log?spot=spending) · [the shield](/poverty) · [your retirement](/gosi) · [your class](/class) · [all tools](/toolbox)`;
}

export function isDemoMode(): boolean {
  try { return window.localStorage.getItem('mm-demo') === '1'; } catch { return false; }
}
