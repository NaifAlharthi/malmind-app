// src/lib/showcase.ts
// The Showcase: the four problems MalMind exists to solve, each played end
// to end on one demo persona's data, with the Brain acting as the agentic
// AI layer it is becoming — it reads the sources, calls its tools, explains
// what the numbers mean, proposes a plan, carries it out on approval, and
// shows the before and after.
//
// The Brain's moves are scripted (no model is called), but every figure is
// computed here from the persona's demo world (demoWorld.ts) — the same
// rows the app's screens read — so the showcase and the product agree.
// Pure and platform-free: the website (/showcase) and the iPhone app both
// render these steps. Keep imports relative.

import { buildDemoDb, getPersona } from './demoWorld';
import { computeVolatility, BAND_META } from './volatility';

type Row = Record<string, unknown>;
export interface Bi { ar: string; en: string }
export type Tone = 'good' | 'ok' | 'bad' | 'neutral';

export type ShowStep =
  /** the person's question */
  | { kind: 'user'; text: Bi }
  /** the Brain speaks; [label](/path) becomes a link to that screen */
  | { kind: 'say'; text: Bi }
  /** the agent calls one of its tools — runs, then reports */
  | { kind: 'tool'; tool: string; label: Bi; result: Bi }
  /** a row of figures the agent has worked out */
  | { kind: 'metrics'; title: Bi; items: { label: Bi; value: Bi; tone?: Tone }[] }
  /** a chart the agent drew */
  | { kind: 'chart'; title: Bi; type: 'line' | 'bar'; labels: Bi[]; series: { name: Bi; data: number[]; color: string }[] }
  /** a plan — the run pauses here until it is approved */
  | { kind: 'plan'; title: Bi; actions: { label: Bi; impact: Bi }[] }
  /** after approval: one thing the agent does */
  | { kind: 'act'; label: Bi; result: Bi }
  /** what changed */
  | { kind: 'outcome'; title: Bi; rows: { label: Bi; before: Bi; after: Bi }[] };

export interface Scenario {
  id: string;            // the persona id, also the scenario id
  personaId: string;
  problem: { n: number; icon: string; title: Bi; line: Bi };
  person: Bi;            // "Faisal, 24 — junior bank analyst"
  challenge: Bi;         // the most pressing challenge, in one line
  steps: ShowStep[];
  /** the screens to open afterwards, as this persona */
  open: { web: string; app: string; label: Bi };
}

// ── number formatting (Latin digits in both languages, as the app does) ──
const n0 = (x: number) => `${x < 0 ? '−' : ''}${Math.round(Math.abs(x)).toLocaleString('en-US')}`;
const sar = (x: number): Bi => ({ ar: `${n0(x)} ريال`, en: `SAR ${n0(x)}` });
function big(x: number): Bi {
  const a = Math.abs(x);
  const s = x < 0 ? '−' : '';
  if (a >= 1e6) {
    const v = (a / 1e6).toFixed(2).replace(/\.?0+$/, '');
    return { ar: `${s}${v} مليون ريال`, en: `SAR ${s}${v}M` };
  }
  if (a >= 1e4) return { ar: `${s}${Math.round(a / 1000)} ألف ريال`, en: `SAR ${s}${Math.round(a / 1000)}K` };
  return sar(x);
}
const pct = (x: number) => `${Math.round(x * 100)}%`;
const same = (s: string): Bi => ({ ar: s, en: s });
const bi = (ar: string, en: string): Bi => ({ ar, en });
const months = (x: number): Bi => ({ ar: `${x.toFixed(1)} شهر`, en: `${x.toFixed(1)} months` });

const MONTH_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const MONTH_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface Snap { year: number; month: number; cash: number; stocks: number; real_estate: number; equity: number; other_assets: number; liabilities: number; income: number; expenses: number }
const num = (v: unknown) => Number(v) || 0;
function snapsOf(db: Record<string, Row[]>): Snap[] {
  return (db.financial_snapshots ?? [])
    .map((r) => ({
      year: num(r.year), month: num(r.month), cash: num(r.cash), stocks: num(r.stocks), real_estate: num(r.real_estate),
      equity: num(r.equity), other_assets: num(r.other_assets), liabilities: num(r.liabilities), income: num(r.income), expenses: num(r.expenses),
    }))
    .sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month));
}
const assets = (s: Snap) => s.cash + s.stocks + s.real_estate + s.equity + s.other_assets;
const netWorth = (s: Snap) => assets(s) - s.liabilities;
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const monthLabel = (s: Snap): Bi => ({ ar: `${MONTH_AR[s.month - 1]} ${String(s.year).slice(2)}`, en: `${MONTH_EN[s.month - 1]} ${String(s.year).slice(2)}` });
const byName = (rows: Row[], name: string) => rows.find((r) => String(r.name) === name);

/** future value of a monthly contribution stream (end of month), yearly balances */
function growth(contrib: (month: number) => number, years: number, annualPct: number): number[] {
  const r = annualPct / 100 / 12;
  let bal = 0;
  const out: number[] = [];
  for (let m = 1; m <= years * 12; m++) {
    bal = bal * (1 + r) + contrib(m);
    if (m % 12 === 0) out.push(Math.round(bal));
  }
  return out;
}

function personLine(id: string): Bi {
  const p = getPersona(id);
  return { ar: `${p.firstNameAr}، ${p.age} — ${p.role.ar}`, en: `${p.firstName}, ${p.age} — ${p.role.en}` };
}
function problemOf(id: string, line: Bi): Scenario['problem'] {
  const p = getPersona(id);
  const TITLES: Record<number, Bi> = {
    1: bi('بياناتك المالية مبعثرة في كل مكان', 'Your financial data, scattered everywhere'),
    2: bi('أرصدة مالية، لا قرارات', 'Balances, not decisions'),
    3: bi('أرقام مالية بلا معنى', 'Numbers without meaning'),
    4: bi('ثروتك ليست نقداً فقط', "Wealth isn't just cash"),
  };
  return { n: p.problem.n, icon: p.problem.icon, title: TITLES[p.problem.n], line };
}

// ═══════════════════════════════════════════════════════════════════════
// 1 · Faisal — scattered data hides a monthly bleed
// ═══════════════════════════════════════════════════════════════════════
function faisal(): Scenario {
  const db = buildDemoDb('faisal');
  const snaps = snapsOf(db);
  const last = snaps[snaps.length - 1];
  const six = snaps.slice(-6);
  const income = avg(six.map((s) => s.income));
  const spend = avg(six.map((s) => s.expenses));
  const gap = spend - income; // > 0: the bleed
  const subs = db.subscriptions ?? [];
  const subsTotal = subs.reduce((a, r) => a + num(r.amount), 0);
  const car = (db.loans ?? [])[0] ?? {};
  const card = (db.credit_cards ?? [])[0] ?? {};
  const rent = num(byName(db.expenses ?? [], 'Apartment rent')?.amount);
  const dining = num(byName(db.expenses ?? [], 'Dining & cafés')?.amount);
  const cardBal = num(card.balance);
  const cardMin = num((db.liabilities ?? [])[0]?.monthly_payment) || num(card.min_payment);
  const fixed = rent + num(car.monthly_payment) + cardMin + subsTotal;
  const runwayNow = last.cash / gap;

  // the plan's savings, each from a named line in his data
  const cut = ['Shahid VIP', 'Anghami Plus', 'PlayStation Plus'];
  const subsCut = cut.reduce((a, nm) => a + num(byName(subs, nm)?.amount), 0);
  const gymNow = num(byName(subs, 'Gym (premium)')?.amount);
  const gymCut = gymNow - 150;
  const diningCap = 1400;
  const diningCut = dining - diningCap;
  const save = subsCut + gymCut + diningCut + cardMin;
  const flowAfter = save - gap;
  const autoSave = 500;
  const nwNow = netWorth(last);

  return {
    id: 'faisal', personaId: 'faisal',
    problem: problemOf('faisal', bi('خمسة تطبيقات، كلٌّ يرى شريحة — ولا أحد يرى النزيف.', 'Five apps, each sees a slice — none sees the bleed.')),
    person: personLine('faisal'),
    challenge: bi('راتب جيّد، ولا يبقى منه شيء — والمدّخرات تتآكل بصمت.', 'A good salary, nothing left over — and the savings quietly draining.'),
    open: { web: '/log', app: '/log', label: bi('افتح سِجلّ فيصل', "Open Faisal's Log") },
    steps: [
      { kind: 'user', text: bi('راتبي ١٠ آلاف، فلماذا لا يبقى شيء آخر الشهر؟ كل شيء موزّع على خمسة تطبيقات.', "I make SAR 10,000 — why is nothing left by month-end? Everything's spread across five apps.") },
      { kind: 'say', text: bi('لن أخمّن. سأجمع القطع أولاً — كل مصدر على حدة — ثم أريك الصورة التي لا يراها أي تطبيق وحده.', "I won't guess. I'll gather the pieces first — one source at a time — then show you the picture no single app can see.") },
      { kind: 'tool', tool: 'connect_bank', label: bi('قراءة الحساب الجاري', 'Reading the current account'), result: bi(`الراتب ${n0(income)} ريال متوسطاً · الصرف ${n0(spend)} ريال شهرياً (آخر ٦ أشهر)`, `Salary averages SAR ${n0(income)} · spending SAR ${n0(spend)}/mo (last 6 months)`) },
      { kind: 'tool', tool: 'read_installments', label: bi('قراءة تطبيق تمويل السيارة', 'Reading the car-finance app'), result: bi(`${n0(num(car.balance))} ريال متبقية · ${n0(num(car.monthly_payment))} ريال شهرياً بفائدة ${num(car.interest_rate)}٪`, `SAR ${n0(num(car.balance))} left · SAR ${n0(num(car.monthly_payment))}/mo at ${num(car.interest_rate)}%`) },
      { kind: 'tool', tool: 'read_credit_card', label: bi('قراءة البطاقة الائتمانية', 'Reading the credit card'), result: bi(`${n0(cardBal)} ريال مدوّرة من حدّ ${n0(num(card.credit_limit))} (${pct(cardBal / num(card.credit_limit))} مستخدم)`, `SAR ${n0(cardBal)} carried on an ${n0(num(card.credit_limit))} limit (${pct(cardBal / num(card.credit_limit))} used)`) },
      { kind: 'tool', tool: 'scan_subscriptions', label: bi('مسح الاشتراكات', 'Scanning subscriptions'), result: bi(`${subs.length} اشتراكات · ${n0(subsTotal)} ريال شهرياً · ٤ منها تتداخل (بثّ وموسيقى)`, `${subs.length} subscriptions · SAR ${n0(subsTotal)}/mo · 4 overlap (streaming & music)`) },
      { kind: 'tool', tool: 'read_broker', label: bi('قراءة محفظة تداول', 'Reading the Tadawul portfolio'), result: sar(last.stocks) },
      { kind: 'tool', tool: 'assemble_log', label: bi('تجميعها في سِجلّ واحد', 'Assembling one Log'), result: bi(`${snaps.length} أشهر مرتّبة · صافي الثروة ${n0(nwNow)} ريال`, `${snaps.length} months lined up · net worth SAR ${n0(nwNow)}`) },
      {
        kind: 'metrics', title: bi('الصورة كاملة — لأول مرة', 'The whole picture — for the first time'),
        items: [
          { label: bi('الدخل الشهري', 'Monthly income'), value: sar(income) },
          { label: bi('الصرف الشهري', 'Monthly spending'), value: sar(spend), tone: 'bad' },
          { label: bi('النزيف الشهري', 'Monthly bleed'), value: sar(-gap), tone: 'bad' },
          { label: bi('تنفد مدّخراته خلال', 'Cushion runs out in'), value: months(runwayNow), tone: 'bad' },
        ],
      },
      {
        kind: 'chart', title: bi('النقد يتآكل شهراً بعد شهر', 'Cash, draining month after month'), type: 'line',
        labels: snaps.map(monthLabel),
        series: [{ name: bi('النقد', 'Cash'), data: snaps.map((s) => s.cash), color: '#E5615F' }],
      },
      { kind: 'say', text: bi(
        `هذا ما لم يره أي تطبيق: الالتزامات الثابتة (الإيجار ${n0(rent)} + السيارة ${n0(num(car.monthly_payment))} + البطاقة ${n0(cardMin)} + الاشتراكات ${n0(subsTotal)}) تأكل ${pct(fixed / income)} من الراتب قبل أن تشتري شيئاً. وفوقها ${n0(dining)} ريال على المطاعم والمقاهي. المشكلة ليست الراتب — بل تسريبات صغيرة لا يجمعها أحد.`,
        `Here's what no app could see: fixed commitments (rent ${n0(rent)} + car ${n0(num(car.monthly_payment))} + card ${n0(cardMin)} + subscriptions ${n0(subsTotal)}) eat ${pct(fixed / income)} of the salary before you buy anything. On top, SAR ${n0(dining)} goes to dining and cafés. It isn't the salary — it's small leaks nobody adds up.`,
      ) },
      {
        kind: 'plan', title: bi('خطة إيقاف النزيف — ٤ خطوات', 'Stop-the-bleed plan — 4 moves'),
        actions: [
          { label: bi('ألغِ الاشتراكات المتداخلة: شاهد، أنغامي، بلايستيشن بلس', 'Cancel the overlaps: Shahid, Anghami, PlayStation Plus'), impact: bi(`+${n0(subsCut)} ريال/شهر`, `+SAR ${n0(subsCut)}/mo`) },
          { label: bi('خفّض النادي من البريميوم إلى العادي', 'Move the gym from premium to standard'), impact: bi(`+${n0(gymCut)} ريال/شهر`, `+SAR ${n0(gymCut)}/mo`) },
          { label: bi(`سقف للمطاعم والمقاهي: ${n0(diningCap)} ريال`, `Cap dining & cafés at SAR ${n0(diningCap)}`), impact: bi(`+${n0(diningCut)} ريال/شهر`, `+SAR ${n0(diningCut)}/mo`) },
          { label: bi(`سدّد البطاقة (${n0(cardBal)}) من المدّخرات — توقف الفائدة والقسط`, `Clear the card (${n0(cardBal)}) from savings — the interest and payment stop`), impact: bi(`+${n0(cardMin)} ريال/شهر`, `+SAR ${n0(cardMin)}/mo`) },
        ],
      },
      { kind: 'act', label: bi('إعداد قائمة الإلغاء', 'Drafting the cancellation list'), result: bi('٣ اشتراكات — روابط الإلغاء جاهزة', '3 subscriptions — cancel links ready') },
      { kind: 'act', label: bi('ضبط ميزانية المطاعم', 'Setting the dining budget'), result: bi(`سقف ${n0(diningCap)} ريال، وتنبيه عند منتصف الشهر`, `SAR ${n0(diningCap)} cap, with a mid-month nudge`) },
      { kind: 'act', label: bi('جدولة سداد البطاقة', 'Scheduling the card payoff'), result: bi(`${n0(cardBal)} ريال من المدّخرات — صافي الثروة لا يتغيّر، والفائدة تتوقف`, `SAR ${n0(cardBal)} from savings — net worth unchanged, interest stops`) },
      { kind: 'act', label: bi('قاعدة يوم الراتب', 'Creating a payday rule'), result: bi(`${n0(autoSave)} ريال تذهب تلقائياً إلى صندوق الطوارئ`, `SAR ${n0(autoSave)} moves to the emergency fund automatically`) },
      {
        kind: 'outcome', title: bi('قبل وبعد', 'Before and after'),
        rows: [
          { label: bi('التدفّق الشهري', 'Monthly flow'), before: sar(-gap), after: sar(flowAfter) },
          { label: bi('عمر المدّخرات', 'Cushion runway'), before: months(runwayNow), after: bi('تنمو كل شهر', 'growing every month') },
          { label: bi('صافي الثروة بعد ١٢ شهراً', 'Net worth in 12 months'), before: sar(nwNow - gap * 12), after: sar(nwNow + flowAfter * 12) },
          { label: bi('الدَّين على البطاقة', 'Card debt'), before: sar(cardBal), after: sar(0) },
        ],
      },
      { kind: 'say', text: bi(
        `من نزيف ${n0(gap)} ريال إلى فائض ${n0(flowAfter)} ريال شهرياً — دون علاوة، فقط بجمع القطع في [السِّجل](/log). سأتابع ميزانية المطاعم وأنبّهك قبل أن تتجاوزها.`,
        `From a SAR ${n0(gap)} bleed to a SAR ${n0(flowAfter)} surplus a month — no raise needed, just the pieces gathered into [the Log](/log). I'll watch the dining budget and nudge you before it slips.`,
      ) },
    ],
  };
}

// ═══════════════════════════════════════════════════════════════════════
// 2 · Reem — a decision the balances can't answer
// ═══════════════════════════════════════════════════════════════════════
function reem(): Scenario {
  const db = buildDemoDb('reem');
  const snaps = snapsOf(db);
  const last = snaps[snaps.length - 1];
  const surplus = last.income - last.expenses;
  const loans = db.loans ?? [];
  const mortgage = loans.find((l) => l.loan_type === 'mortgage') ?? {};
  const car = loans.find((l) => l.loan_type !== 'mortgage') ?? {};
  const carPay = num(car.monthly_payment);
  const carLeft = Math.ceil(num(car.balance) / carPay);
  const YEARS = 12;
  const RET = 5;
  const trim = 700; // household help 1,500 → 1,200 and kids' extras 1,200 → 800
  const newCarPay = 1900; // a new SUV on finance, replacing the old one at once

  const futA = growth(() => surplus, YEARS, RET);
  // B: upgrade now — the old car is settled into the new loan, 1,900 for 5
  // years; like A, nothing freed afterwards is redirected
  const futB = growth((m) => (m <= 60 ? Math.max(0, surplus + carPay - newCarPay) : surplus), YEARS, RET);
  // C: trim 700 now; when the car finance ends, roll its 900 in too
  const futC = growth((m) => surplus + trim + (m > carLeft ? carPay : 0), YEARS, RET);
  const startC = surplus + trim;

  return {
    id: 'reem', personaId: 'reem',
    problem: problemOf('reem', bi('التطبيقات تُظهر ما تملكه اليوم — لا ما يفعله قرارك بالغد.', 'Apps show what you have today — not what a decision does to tomorrow.')),
    person: personLine('reem'),
    challenge: bi('عالقة عند التعادل: صندوق تعليم الأبناء أم سيارة أكبر؟', "Stuck at break-even: the kids' education fund, or a bigger car?"),
    open: { web: '/what-if', app: '/home', label: bi('امشِ في حياة ريم', "Walk Reem's life") },
    steps: [
      { kind: 'user', text: bi('هل نبدأ صندوق تعليم الأبناء الآن، أم نغيّر السيارة أولاً؟ لا أريد أن أضغط على البيت.', "Should we start the kids' education fund now, or upgrade the car first? I don't want to squeeze the household.") },
      { kind: 'say', text: bi('هذا قرار، لا رصيد — فلن أريك مجاميع. سأبني ثلاثة مستقبلات وأشغّلها ١٢ سنة إلى الأمام.', "That's a decision, not a balance — so I won't show you totals. I'll build three futures and run them 12 years forward.") },
      { kind: 'tool', tool: 'read_log', label: bi('قراءة السِّجل', 'Reading the Log'), result: bi(`دخل ${n0(last.income)} · مصروف ${n0(last.expenses)} · فائض ${n0(surplus)} ريال شهرياً`, `Income ${n0(last.income)} · spending ${n0(last.expenses)} · surplus SAR ${n0(surplus)}/mo`) },
      { kind: 'tool', tool: 'read_commitments', label: bi('قراءة الالتزامات', 'Reading commitments'), result: bi(`الرهن ${n0(num(mortgage.balance))} (${n0(num(mortgage.monthly_payment))}/شهر) · تمويل السيارة ينتهي بعد ${carLeft} شهراً`, `Mortgage ${n0(num(mortgage.balance))} (${n0(num(mortgage.monthly_payment))}/mo) · car finance ends in ${carLeft} months`) },
      { kind: 'tool', tool: 'read_expenses', label: bi('تحليل المصروفات', 'Analysing spending'), result: bi('مساحة ٧٠٠ ريال: مساعدة المنزل ١٬٥٠٠ ← ١٬٢٠٠، وكماليات الأطفال ١٬٢٠٠ ← ٨٠٠', 'Room for SAR 700: household help 1,500 → 1,200, kids’ extras 1,200 → 800') },
      { kind: 'tool', tool: 'simulate_futures', label: bi('محاكاة ثلاثة مستقبلات', 'Simulating three futures'), result: bi(`٣ مسارات × ${YEARS} سنة · عائد ${RET}٪ سنوياً`, `3 paths × ${YEARS} years · ${RET}% a year`) },
      {
        kind: 'chart', title: bi(`صندوق التعليم بعد ${YEARS} سنة — ثلاثة مستقبلات`, `The education fund over ${YEARS} years — three futures`), type: 'line',
        labels: futA.map((_, i) => bi(`س${i + 1}`, `Y${i + 1}`)),
        series: [
          { name: bi('غيّري السيارة الآن', 'Upgrade the car now'), data: futB, color: '#E5615F' },
          { name: bi('لا تغيّري شيئاً', 'Change nothing'), data: futA, color: '#C9A84C' },
          { name: bi('قلّمي وحوّلي', 'Trim & redirect'), data: futC, color: '#1D9E75' },
        ],
      },
      {
        kind: 'metrics', title: bi(`ما يصل إليه الصندوق بعد ${YEARS} سنة`, `What the fund reaches in ${YEARS} years`),
        items: [
          { label: bi('غيّري السيارة الآن', 'Upgrade the car now'), value: big(futB[YEARS - 1]), tone: 'bad' },
          { label: bi('لا تغيّري شيئاً', 'Change nothing'), value: big(futA[YEARS - 1]), tone: 'ok' },
          { label: bi('قلّمي وحوّلي', 'Trim & redirect'), value: big(futC[YEARS - 1]), tone: 'good' },
        ],
      },
      { kind: 'say', text: bi(
        `الفرق ليس صغيراً: «قلّمي وحوّلي» يصل إلى ${big(futC[YEARS - 1]).ar} — ${(futC[YEARS - 1] / Math.max(1, futA[YEARS - 1])).toFixed(1)} أضعاف «لا تغيّري شيئاً». وتغيير السيارة الآن يجمّد الصندوق خمس سنوات. السيارة تأتي لاحقاً — نقداً، بعد انتهاء تمويلها الحالي.`,
        `The gap isn't small: "trim & redirect" reaches ${big(futC[YEARS - 1]).en} — ${(futC[YEARS - 1] / Math.max(1, futA[YEARS - 1])).toFixed(1)}× "change nothing". Upgrading now freezes the fund for five years. The car can come later — in cash, once the current finance ends.`,
      ) },
      {
        kind: 'plan', title: bi('القرار — في ٤ خطوات', 'The decision — in 4 moves'),
        actions: [
          { label: bi('افتحي «صندوق تعليم الأبناء»', "Open a 'Kids' education' goal fund"), impact: bi(`${n0(startC)} ريال/شهر من الآن`, `SAR ${n0(startC)}/mo from now`) },
          { label: bi('قلّمي ٧٠٠ ريال من مساعدة المنزل والكماليات', 'Trim SAR 700 from household help and extras'), impact: bi('+٧٠٠ ريال/شهر', '+SAR 700/mo') },
          { label: bi(`عند انتهاء تمويل السيارة (بعد ${carLeft} شهراً) حوّلي قسطها للصندوق`, `When the car finance ends (in ${carLeft} months), roll its payment in`), impact: bi(`+${n0(carPay)} ريال/شهر`, `+SAR ${n0(carPay)}/mo`) },
          { label: bi('أجّلي تغيير السيارة — ونعيد النظر نقداً', 'Defer the car upgrade — revisit it in cash'), impact: bi(`بعد ${carLeft + 12} شهراً`, `in ${carLeft + 12} months`) },
        ],
      },
      { kind: 'act', label: bi('إنشاء صندوق الهدف', 'Creating the goal fund'), result: bi(`«تعليم الأبناء» · ${n0(startC)} ريال/شهر · عائد ${RET}٪`, `"Kids' education" · SAR ${n0(startC)}/mo · ${RET}% return`) },
      { kind: 'act', label: bi('تحديث الميزانية', 'Updating the budget'), result: bi('مساعدة المنزل ١٬٢٠٠ · الكماليات ٨٠٠', 'Household help 1,200 · extras 800') },
      { kind: 'act', label: bi('جدولة التحويل التلقائي', 'Scheduling the roll-over'), result: bi(`بعد ${carLeft} شهراً: +${n0(carPay)} ريال للصندوق`, `In ${carLeft} months: +SAR ${n0(carPay)} into the fund`) },
      { kind: 'act', label: bi('تذكير بمراجعة السيارة', 'Setting the car review'), result: bi(`تذكير بعد ${carLeft + 12} شهراً — بأرقام ذلك اليوم`, `Reminder in ${carLeft + 12} months — with that day's numbers`) },
      {
        kind: 'outcome', title: bi('قبل وبعد', 'Before and after'),
        rows: [
          { label: bi('يُبنى كل شهر', 'Built each month'), before: sar(surplus), after: sar(startC) },
          { label: bi(`صندوق التعليم بعد ${YEARS} سنة`, `Education fund in ${YEARS} years`), before: big(futA[YEARS - 1]), after: big(futC[YEARS - 1]) },
          { label: bi('دَين سيارة جديد', 'New car debt'), before: bi('مطروح على الطاولة', 'on the table'), after: bi('لا شيء', 'none') },
          { label: bi('القرار', 'The decision'), before: bi('معلّق', 'pending'), after: bi('محسوم بالأرقام', 'made, in numbers') },
        ],
      },
      { kind: 'say', text: bi('سأبقي الصندوق والسيارة في [ماذا لو](/what-if) — غيّري أي رقم وأعيد تشغيل المستقبلات الثلاثة فوراً.', "I'll keep the fund and the car in [What-If](/what-if) — change any number and I'll rerun all three futures instantly.") },
    ],
  };
}

// ═══════════════════════════════════════════════════════════════════════
// 3 · Layla — numbers that don't say what they mean
// ═══════════════════════════════════════════════════════════════════════
function layla(): Scenario {
  const db = buildDemoDb('layla');
  const snaps = snapsOf(db);
  const first = snaps[0];
  const last = snaps[snaps.length - 1];
  const incomes = snaps.map((s) => s.income);
  const loggedFlow = snaps.slice(1).reduce((a, s) => a + s.income - s.expenses, 0);
  const cashGrowth = last.cash - first.cash;
  const unlogged = (cashGrowth - loggedFlow) / (snaps.length - 1);
  const incAvg = avg(incomes);
  const spendAvg = avg(snaps.map((s) => s.expenses));
  const loggedRate = (incAvg - spendAvg) / incAvg;
  const realRate = (incAvg + unlogged - spendAvg) / (incAvg + unlogged);
  const swing = (Math.max(...incomes) - Math.min(...incomes)) / incAvg;
  const vol = computeVolatility(snaps as never);
  const credit = (db.credit_snapshots ?? []).map((c) => num(c.molim_score));
  const nwFirst = netWorth(first);
  const nwLast = netWorth(last);
  const pace = (nwLast - nwFirst) / (snaps.length - 1);
  const target = 10000;
  const etaNow = (target - nwLast) / pace;
  const payYourself = (incAvg + unlogged) * 0.15;
  const etaAfter = (target - nwLast) / (pace + payYourself);
  const runway = last.cash / spendAvg;

  return {
    id: 'layla', personaId: 'layla',
    problem: problemOf('layla', bi('الأرقام تتراكم — ولا تقول لك: هل أنت بخير؟', "The figures pile up — and never say whether you're OK.")),
    person: personLine('layla'),
    challenge: bi('دخل غير ثابت، وأرقام في الملاحظات لا تعني شيئاً بعد.', "Irregular income, and numbers in a notes app that don't mean anything yet."),
    open: { web: '/ratios', app: '/today', label: bi('افتح مؤشّرات ليلى', "Open Layla's vital signs") },
    steps: [
      { kind: 'user', text: bi('عندي أرقامي في الملاحظات… لكن لا أعرف هل أنا بخير أم لا.', "I keep my numbers in my notes app… but I can't tell if I'm doing well or badly.") },
      { kind: 'say', text: bi('الأرقام وحدها لا تجيب. سأحسب ما تعنيه — وأتحقق أنها تقول الحقيقة أولاً.', "Numbers alone don't answer that. I'll work out what they mean — and check they tell the truth first.") },
      { kind: 'tool', tool: 'read_log', label: bi('قراءة السِّجل', 'Reading the Log'), result: bi(`${snaps.length} أشهر · الدخل بين ${n0(Math.min(...incomes))} و${n0(Math.max(...incomes))} · المتوسط ${n0(incAvg)}`, `${snaps.length} months · income from ${n0(Math.min(...incomes))} to ${n0(Math.max(...incomes))} · avg ${n0(incAvg)}`) },
      { kind: 'tool', tool: 'compute_ratios', label: bi('حساب معدّل الادخار', 'Computing the savings rate'), result: bi(`المسجَّل: ${pct(loggedRate)} — تصرفين أكثر مما تكسبين؟`, `As logged: ${pct(loggedRate)} — spending more than you earn?`) },
      { kind: 'tool', tool: 'reconcile_cash', label: bi('مطابقة النقد مع التدفّقات', 'Reconciling cash against flows'), result: bi(`النقد زاد ${n0(cashGrowth)} بينما التدفّقات المسجّلة تقول ${n0(loggedFlow)} ← نحو ${n0(unlogged)} ريال شهرياً تصل دون تسجيل`, `Cash grew ${n0(cashGrowth)} while logged flows say ${n0(loggedFlow)} → about SAR ${n0(unlogged)}/mo arriving unlogged`) },
      { kind: 'tool', tool: 'compute_volatility', label: bi('قياس تقلّب الدخل', 'Measuring income volatility'), result: vol ? bi(`درجة الهدوء ${vol.calmScore}/100 — ${BAND_META[vol.band].ar}`, `Calm score ${vol.calmScore}/100 — ${BAND_META[vol.band].en}`) : bi(`الدخل يتأرجح ${pct(swing)} بين الأشهر`, `Income swings ${pct(swing)} month to month`) },
      { kind: 'tool', tool: 'read_credit', label: bi('قراءة تقرير سمة', 'Reading the SIMAH report'), result: bi(`${credit[credit.length - 1]} — ارتفعت ${credit[credit.length - 1] - credit[0]} نقطة`, `${credit[credit.length - 1]} — up ${credit[credit.length - 1] - credit[0]} points`) },
      {
        kind: 'metrics', title: bi('أرقامك — بمعناها', 'Your numbers — with their meaning'),
        items: [
          { label: bi('معدّل الادخار الحقيقي', 'Real savings rate'), value: same(pct(realRate)), tone: realRate > 0.1 ? 'good' : 'ok' },
          { label: bi('تأرجح الدخل', 'Income swing'), value: same(`±${pct(swing / 2)}`), tone: 'ok' },
          { label: bi('درع الطوارئ', 'Emergency shield'), value: months(runway), tone: runway >= 3 ? 'good' : 'ok' },
          { label: bi('الدرجة الائتمانية', 'Credit score'), value: same(String(credit[credit.length - 1])), tone: 'ok' },
        ],
      },
      { kind: 'say', text: bi(
        `الخبر الجيد: أنتِ أفضل مما تقول ملاحظاتك. دخل مشاريعك الجانبية (نحو ${n0(unlogged)} ريال شهرياً) لا يُسجَّل، فبدا ادخارك سالباً وهو فعلياً ${pct(realRate)}. المعنى: لستِ في خطر — لكن دخلك المتأرجح يحتاج وسادة، وهدف «أول ١٠ آلاف» بعيد ${Math.round(etaNow)} شهراً بالوتيرة الحالية.`,
        `The good news: you're doing better than your notes say. Your side-project income (about SAR ${n0(unlogged)}/mo) isn't logged, so saving looked negative — it's really ${pct(realRate)}. The meaning: you're not in danger — but a swinging income needs a cushion, and "first 10,000" is ${Math.round(etaNow)} months away at today's pace.`,
      ) },
      {
        kind: 'plan', title: bi('خطة تجعل الأرقام تعمل لكِ', 'A plan that makes the numbers work for you'),
        actions: [
          { label: bi('سجّلي دخل المشاريع الجانبية كدفتر مستقل', 'Log side-project income as its own ledger'), impact: bi('أرقام تقول الحقيقة', 'numbers that tell the truth') },
          { label: bi(`وسادة تنعيم: شهر مصروف (${n0(spendAvg)})، وراتب ثابت لنفسك منها`, `A smoothing buffer: one month of spending (${n0(spendAvg)}), paying yourself a steady wage from it`), impact: bi('الأشهر الضعيفة لا تهزّك', 'thin months stop shaking you') },
          { label: bi('ادفعي لنفسك أولاً: ١٥٪ من كل دفعة إلى «أول ١٠ آلاف»', 'Pay yourself first: 15% of every payment into "First 10,000"'), impact: bi(`+${n0(payYourself)} ريال/شهر`, `+SAR ${n0(payYourself)}/mo`) },
          { label: bi('أبقي استخدام البطاقة تحت ٣٠٪', 'Keep card use under 30%'), impact: bi('الدرجة نحو ٧٠٠', 'score heading for 700') },
        ],
      },
      { kind: 'act', label: bi('إنشاء دفتر «المشاريع الجانبية»', 'Creating the "Side projects" ledger'), result: bi(`تدفّق داخل · ~${n0(unlogged)} ريال شهرياً`, `Money in · ~SAR ${n0(unlogged)}/mo`) },
      { kind: 'act', label: bi('إعداد وسادة التنعيم', 'Setting up the smoothing buffer'), result: bi(`${n0(spendAvg)} ريال محجوزة · راتب ذاتي ثابت`, `SAR ${n0(spendAvg)} held · a steady self-paid wage`) },
      { kind: 'act', label: bi('قاعدة الادفعي لنفسك أولاً', 'Creating the pay-yourself-first rule'), result: bi('١٥٪ من كل دفعة ← «أول ١٠ آلاف»', '15% of every payment → "First 10,000"') },
      {
        kind: 'outcome', title: bi('قبل وبعد', 'Before and after'),
        rows: [
          { label: bi('معدّل الادخار', 'Savings rate'), before: same(pct(loggedRate)), after: same(pct(realRate)) },
          { label: bi('الوصول إلى «أول ١٠ آلاف»', 'Reaching "First 10,000"'), before: months(etaNow), after: months(etaAfter) },
          { label: bi('الأشهر الضعيفة', 'Thin months'), before: bi('تهزّ الميزانية', 'shake the budget'), after: bi('تمتصّها الوسادة', 'absorbed by the buffer') },
          { label: bi('معنى أرقامك', 'What your numbers mean'), before: bi('غير واضح', 'unclear'), after: bi('واضح، بلغة بسيطة', 'clear, in plain words') },
        ],
      },
      { kind: 'say', text: bi('كل هذه القراءات حيّة في [اليوم](/today) — وسأخبرك عند كل تغيّر يستحق الانتباه.', 'Every one of these readings lives on in [Today](/today) — and I’ll tell you whenever one moves enough to matter.') },
    ],
  };
}

// ═══════════════════════════════════════════════════════════════════════
// 4 · Khalid — the wealth no app can see
// ═══════════════════════════════════════════════════════════════════════
function khalid(): Scenario {
  const db = buildDemoDb('khalid');
  const snaps = snapsOf(db);
  const last = snaps[snaps.length - 1];
  const loans = db.loans ?? [];
  const debt = last.liabilities;
  const appsSee = last.cash + last.stocks - debt;
  const trueNw = netWorth(last);
  const total = assets(last);
  const reserve = last.expenses * 6;
  const idle = last.cash - reserve;
  const murabaha = loans.find((l) => String(l.name).startsWith('Stock finance')) ?? {};
  const payDown = 300000;
  const saved = payDown * (num(murabaha.interest_rate) / 100);
  const diversify = idle - payDown;
  const assetRows = db.assets ?? [];
  const rental = num(byName(assetRows, 'Rental building (Riyadh)')?.value);
  const yieldPct = 6;
  const waqfShare = 0.2;
  const waqfYear = rental * (yieldPct / 100) * waqfShare;
  const illiquid = (last.real_estate + last.equity) / total;
  const classes: { name: Bi; v: number }[] = [
    { name: bi('الشركة', 'Business'), v: last.equity },
    { name: bi('العقار', 'Real estate'), v: last.real_estate },
    { name: bi('الأسهم', 'Stocks'), v: last.stocks },
    { name: bi('النقد', 'Cash'), v: last.cash },
    { name: bi('ذهب وغيره', 'Gold & other'), v: last.other_assets },
  ];

  return {
    id: 'khalid', personaId: 'khalid',
    problem: problemOf('khalid', bi('البنك والوسيط يريان النقد والأسهم — لا الشركة ولا العقار ولا الذهب.', 'The bank and broker see cash and shares — not the company, the property or the gold.')),
    person: personLine('khalid'),
    challenge: bi('ثروة لا يراها أي تطبيق، ونقد معطّل، وتركّز في قطاع واحد.', 'Wealth no app can see, idle cash, and concentration in one sector.'),
    open: { web: '/holdings', app: '/log', label: bi('افتح أصول خالد', "Open Khalid's assets") },
    steps: [
      { kind: 'user', text: bi('البنك يقول ٨٠٠ ألف، والوسيط ١٫٨ مليون. كم أملك فعلاً — وماذا أفعل بالنقد المعطّل؟', 'My bank says 800K and my broker says 1.8M. What am I actually worth — and what should I do with the idle cash?') },
      { kind: 'say', text: bi('سأبدأ بما تراه التطبيقات، ثم أضيف ما لا تراه — واحداً واحداً.', "I'll start with what the apps see, then add what they don't — one by one.") },
      { kind: 'tool', tool: 'read_bank', label: bi('قراءة الحسابات البنكية', 'Reading the bank accounts'), result: big(last.cash) },
      { kind: 'tool', tool: 'read_broker', label: bi('قراءة محفظة تداول', 'Reading the Tadawul portfolio'), result: big(last.stocks) },
      { kind: 'tool', tool: 'read_debts', label: bi('قراءة التمويلات', 'Reading the financing'), result: bi(`${big(debt).ar} عبر ${loans.length} تمويلات`, `${big(debt).en} across ${loans.length} facilities`) },
      { kind: 'say', text: bi(`ما تراه التطبيقات مجتمعة: ${big(appsSee).ar} فقط. والآن ما لا تراه:`, `What the apps see, together: just ${big(appsSee).en}. Now for what they can't see:`) },
      { kind: 'tool', tool: 'value_business', label: bi('تقييم حصّة الشركة', 'Valuing the company stake'), result: big(last.equity) },
      { kind: 'tool', tool: 'value_property', label: bi('تقييم العقارات', 'Valuing the property'), result: bi(`المبنى المؤجّر ${big(rental).ar} + الفيلا ← ${big(last.real_estate).ar}`, `Rental building ${big(rental).en} + the villa → ${big(last.real_estate).en}`) },
      { kind: 'tool', tool: 'value_other', label: bi('الذهب والأصول الأخرى', 'Gold and other assets'), result: big(last.other_assets) },
      {
        kind: 'metrics', title: bi('الثروة كاملة', 'The whole wealth'),
        items: [
          { label: bi('ما تراه التطبيقات', 'What the apps see'), value: big(appsSee), tone: 'neutral' },
          { label: bi('صافي الثروة الحقيقي', 'True net worth'), value: big(trueNw), tone: 'good' },
          { label: bi('غير سائل (شركة + عقار)', 'Illiquid (business + property)'), value: same(pct(illiquid)), tone: 'ok' },
          { label: bi('نقد معطّل فوق احتياطي ٦ أشهر', 'Idle cash above a 6-month reserve'), value: big(idle), tone: 'bad' },
        ],
      },
      {
        kind: 'chart', title: bi('أين تعيش ثروتك', 'Where your wealth lives'), type: 'bar',
        labels: classes.map((c) => c.name),
        series: [{ name: bi('القيمة', 'Value'), data: classes.map((c) => c.v), color: '#C9A84C' }],
      },
      { kind: 'say', text: bi(
        `ثروتك ${Math.round(trueNw / appsSee)} ضعفاً لما تراه التطبيقات. لكن ${pct(illiquid)} منها في الشركة والعقار، و${big(idle).ar} نقداً لا يعمل — بينما تدفع ${num(murabaha.interest_rate)}٪ على تمويل الأسهم.`,
        `You're worth ${Math.round(trueNw / appsSee)}× what the apps see. But ${pct(illiquid)} of it sits in the company and property, and ${big(idle).en} of cash isn't working — while you pay ${num(murabaha.interest_rate)}% on the stock financing.`,
      ) },
      {
        kind: 'plan', title: bi('خطة توظيف الثروة', 'Putting the wealth to work'),
        actions: [
          { label: bi(`أبقِ احتياطي ٦ أشهر: ${big(reserve).ar}`, `Keep a 6-month reserve: ${big(reserve).en}`), impact: bi('السيولة محميّة', 'liquidity protected') },
          { label: bi(`سدّد ${big(payDown).ar} من تمويل الأسهم`, `Pay down ${big(payDown).en} of the stock Murabaha`), impact: bi(`عائد مضمون ${num(murabaha.interest_rate)}٪ · ${n0(saved)} ريال/سنة`, `a sure ${num(murabaha.interest_rate)}% · SAR ${n0(saved)}/yr`) },
          { label: bi(`نوّع ${big(diversify).ar} في صكوك ومؤشر عالمي`, `Diversify ${big(diversify).en} into sukuk and a global index`), impact: bi('تركّز أقل في قطاع واحد', 'less riding on one sector') },
          { label: bi(`وقف عائلي: ${pct(waqfShare)} من إيجار المبنى`, `A family waqf: ${pct(waqfShare)} of the building's rent`), impact: bi(`~${n0(waqfYear)} ريال سنوياً للعطاء`, `~SAR ${n0(waqfYear)} a year for giving`) },
        ],
      },
      { kind: 'act', label: bi('تسجيل كل الأصول في السِّجل', 'Logging every asset in the Log'), result: bi(`${assetRows.length} أصول · صافي الثروة ${big(trueNw).ar}`, `${assetRows.length} assets · net worth ${big(trueNw).en}`) },
      { kind: 'act', label: bi('إعداد أمر السداد المبكر', 'Preparing the early-payoff order'), result: bi(`${big(payDown).ar} — بانتظار توقيعك في البنك`, `${big(payDown).en} — awaiting your signature at the bank`) },
      { kind: 'act', label: bi('بناء مقترح التنويع', 'Building the diversification proposal'), result: bi('٦٠٪ صكوك · ٤٠٪ مؤشر عالمي — للمناقشة مع مستشارك المرخّص', '60% sukuk · 40% global index — for your licensed adviser to review') },
      { kind: 'act', label: bi('صياغة هيكل الوقف', 'Drafting the waqf structure'), result: bi('مسوّدة لكاتب العدل: المبنى، النسبة، النظّار، المصارف', 'A draft for the notary: the building, the share, the trustees, the causes') },
      {
        kind: 'outcome', title: bi('قبل وبعد', 'Before and after'),
        rows: [
          { label: bi('صافي الثروة المرئي', 'Visible net worth'), before: big(appsSee), after: big(trueNw) },
          { label: bi('نقد معطّل', 'Idle cash'), before: big(idle), after: sar(0) },
          { label: bi('تكلفة التمويل السنوية', 'Yearly financing cost'), before: bi('كما هي', 'as is'), after: bi(`−${n0(saved)} ريال`, `−SAR ${n0(saved)}`) },
          { label: bi('الإرث', 'The legacy'), before: bi('نيّة', 'an intention'), after: bi('وقف بمسوّدة', 'a drafted waqf') },
        ],
      },
      { kind: 'say', text: bi('ثروتك كاملة الآن في [الأصول والالتزامات](/holdings) — وسأراقب السيولة والتركّز كل شهر.', 'Your whole wealth now lives in [Assets & Liabilities](/holdings) — and I’ll watch liquidity and concentration every month.') },
    ],
  };
}

/** The four scenarios, in the order of the four problems. */
export function buildScenarios(): Scenario[] {
  return [faisal(), reem(), layla(), khalid()].sort((a, b) => a.problem.n - b.problem.n);
}

export const SHOWCASE_NOTE: Bi = {
  ar: 'عرض توضيحي: تصرّفات العقل مكتوبة مسبقاً لتُظهر طبقة الذكاء الوكيلة التي نبنيها، وكل رقم محسوب من بيانات الشخصية التجريبية. ليست نصيحة مالية مرخّصة.',
  en: "A demonstration: the Brain's moves are scripted to show the agentic AI layer we're building, and every figure is computed from the persona's demo data. Not licensed financial advice.",
};
