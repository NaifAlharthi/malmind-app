// src/lib/demoWorld.ts
// Guest demo mode's data. Four internally-consistent Saudi personas, one per
// "where you stand" quadrant, so a visitor can walk the whole product as the
// person they relate to most. Every table each feature reads is prefilled, so
// nothing shows an empty state. Numbers are coherent across tools.
//
//   A · Layla   — 20, KSU computer-science student, Riyadh (Build mode)
//   B · Faisal  — 24, fresh-grad bank analyst, Riyadh   (Falling behind)
//   C · Reem    — 34, ministry employee, married + kids  (Break-even)
//   D · Khalid  — 48, self-made business owner           (Abundance)

export type Quadrant = 'A' | 'B' | 'C' | 'D';
type Row = Record<string, unknown>;

export interface DemoPersona {
  id: string;
  firstName: string;
  firstNameAr: string;
  name: string;
  age: number;
  gender: 'male' | 'female';
  quadrant: Quadrant;
  accent: string;           // brand-consistent accent colour
  role: { ar: string; en: string };
  tagline: { ar: string; en: string };
  blurb: { ar: string; en: string };
  netWorth: { ar: string; en: string };
  challenge: { ar: string; en: string };
  interest: { ar: string; en: string };
  goal: { ar: string; en: string };
  // Which of the four fundamental problems this persona's life embodies —
  // the picker draws the link explicitly (one persona per problem).
  problem: { n: number; icon: string; ar: string; en: string };
}

export const DEMO_PERSONAS: DemoPersona[] = [
  {
    id: 'layla', firstName: 'Layla', firstNameAr: 'ليلى', name: 'Layla Al-Ghamdi', age: 20, gender: 'female',
    quadrant: 'A', accent: '#4A78C4',
    role: { ar: 'طالبة حاسب في جامعة الملك سعود', en: 'CS student, King Saud University' },
    tagline: { ar: 'أبني عاداتي الأولى قبل أن أبني ثروتي.', en: 'Building my first habits before my first wealth.' },
    blurb: {
      ar: 'في سنتها الثالثة بجامعة الملك سعود بالرياض، تعيش مع أهلها وتكسب من الدروس الخصوصية ومشاريع صغيرة. لا دخل ثابت بعد، لكنها بدأت تدّخر وتستثمر مبالغ صغيرة.',
      en: 'Third year at KSU in Riyadh, living with family, earning from tutoring and small side projects. No steady income yet — but already saving and micro-investing.',
    },
    netWorth: { ar: '4,200 ريال', en: 'SAR 4,200' },
    challenge: { ar: 'لا دخل ثابت بعد', en: 'No steady income yet' },
    interest: { ar: 'البرمجة والتقنية', en: 'Coding & tech' },
    goal: { ar: 'أول 10,000 ريال', en: 'First SAR 10,000' },
    problem: { n: 3, icon: '🔢', ar: 'أرقام مالية بلا معنى', en: 'Numbers without meaning' },
  },
  {
    id: 'faisal', firstName: 'Faisal', firstNameAr: 'فيصل', name: 'Faisal Al-Otaibi', age: 24, gender: 'male',
    quadrant: 'B', accent: '#D89A3E',
    role: { ar: 'محلّل مبتدئ في بنك بالرياض', en: 'Junior analyst at a Riyadh bank' },
    tagline: { ar: 'راتبي جيّد… فلماذا لا يبقى منه شيء؟', en: 'Good salary — so why is nothing left?' },
    blurb: {
      ar: 'حديث التخرّج، أول وظيفة براتب 10,000 ريال. استقلّ في شقّته، واشترى سيارة بالتقسيط، فصار الإنفاق يسبق الدخل بعض الأشهر. لديه مدّخرات صغيرة من هدايا التخرّج تتآكل.',
      en: "Fresh grad, first job at SAR 10,000. Moved into his own place, financed a car — now some months spend faster than they earn. A small graduation-gift cushion is quietly draining.",
    },
    netWorth: { ar: '−2,500 ريال', en: '−SAR 2,500' },
    challenge: { ar: 'الإنفاق يسبق الدخل', en: 'Outflow beats income' },
    interest: { ar: 'السيارات والتقنية', en: 'Cars & gadgets' },
    goal: { ar: 'أوقف النزيف', en: 'Stop the bleed' },
    problem: { n: 1, icon: '🧩', ar: 'بياناته المالية مبعثرة في كل مكان', en: 'Financial data scattered everywhere' },
  },
  {
    id: 'reem', firstName: 'Reem', firstNameAr: 'ريم', name: 'Reem Al-Harbi', age: 34, gender: 'female',
    quadrant: 'C', accent: '#1D9E75',
    role: { ar: 'موظّفة في وزارة حكومية', en: 'Government ministry employee' },
    tagline: { ar: 'أغطّي كل شيء… لكن لا يتبقّى للبناء.', en: 'I cover everything — but nothing is left to build with.' },
    blurb: {
      ar: 'في منتصف مسيرتها، متزوّجة ولديها طفلان، وتسدّد رهن الفيلا. الدخل يغطّي المصروفات بالكاد؛ التحدّي أن تفتح فائقاً بين ما تكسب وما تنفق دون أن يتأثّر الأبناء.',
      en: "Mid-career, married with two kids, paying down the villa mortgage. Income barely covers the outgoings; the challenge is opening a gap between earning and spending without shortchanging the family.",
    },
    netWorth: { ar: '355,000 ريال', en: 'SAR 355,000' },
    challenge: { ar: 'عالقة عند التعادل', en: 'Stuck at break-even' },
    interest: { ar: 'الأسرة والمنزل', en: 'Family & home' },
    goal: { ar: 'صندوق تعليم الأبناء', en: "Kids' education fund" },
    problem: { n: 2, icon: '🧮', ar: 'أرصدة مالية، لا قرارات', en: 'Balances, not decisions' },
  },
  {
    id: 'khalid', firstName: 'Khalid', firstNameAr: 'خالد', name: 'Khalid Al-Dossari', age: 48, gender: 'male',
    quadrant: 'D', accent: '#C9A84C',
    role: { ar: 'صاحب أعمال (مقاولات وتجارة)', en: 'Business owner (trading & contracting)' },
    tagline: { ar: 'الجزء الصعب انتهى — الآن أضاعف وأعطي.', en: 'The hard part is done — now I multiply and give.' },
    blurb: {
      ar: 'بنى شركته من الصفر على مدى عقدين، وصافي ثروته يتجاوز 11 مليوناً بين أعمال وعقار ومحفظة أسهم. تحدّيه ليس البقاء، بل توظيف الفائض، وتنويع التركّز، وبناء إرث ووقف للعائلة.',
      en: "Built his company from nothing over two decades; net worth past SAR 11M across business, real estate and a Tadawul portfolio. His challenge isn't survival — it's deploying surplus, diversifying concentration, and building a legacy and a family waqf.",
    },
    netWorth: { ar: '11.3 مليون ريال', en: 'SAR 11.3M' },
    challenge: { ar: 'نقد معطّل وتركّز', en: 'Idle cash & concentration' },
    interest: { ar: 'العقار والعطاء', en: 'Real estate & giving' },
    goal: { ar: 'وقف عائلي وإرث', en: 'A family waqf & legacy' },
    problem: { n: 4, icon: '🐫', ar: 'ثروته ليست نقداً فقط', en: "Wealth isn't just cash" },
  },
];

export function getPersona(id: string): DemoPersona {
  return DEMO_PERSONAS.find((p) => p.id === id) ?? DEMO_PERSONAS[1];
}

export function personaUser(id: string) {
  const p = getPersona(id);
  return { id: `demo-${p.id}`, email: `${p.id}.demo@malmind.ai`, user_metadata: { name: p.name } };
}

// ── row helper ────────────────────────────────────────────────────────
function rows(userId: string, table: Row[], extra: Row = {}): Row[] {
  return table.map((r, i) => ({
    id: `${userId}-${i}-${Math.random().toString(36).slice(2, 8)}`,
    user_id: userId,
    created_at: new Date(2026, 0, 1 + i).toISOString(),
    ...extra,
    ...r,
  }));
}

// ═══════════════════════════════════════════════════════════════════════
// A · LAYLA — KSU student, build mode
// ═══════════════════════════════════════════════════════════════════════
function buildLayla(): Record<string, Row[]> {
  const uid = 'demo-layla';
  const goalFunds = rows(uid, [
    { name: 'My first SAR 5,000', icon: '🌱', monthly_contribution: 300, maturity_years: 1, expected_return: 2, target_amount: 5000, start_date: '2025-10-01' },
    { name: 'Final-year laptop', icon: '💻', monthly_contribution: 250, maturity_years: 1, expected_return: 2, target_amount: 6000, start_date: '2026-02-01' },
  ]);
  const credit = rows(uid, [
    { report_date: '2025-08-15', molim_score: 610, monthly_income: 1300, first_account_date: '2024-03-01', num_defaulted: 0, total_defaulted: 0, num_inquiries: 1, bounced_cheques: 0, total_limits: 3500, total_outstanding: 1400, num_active: 2 },
    { report_date: '2026-06-20', molim_score: 640, monthly_income: 1400, first_account_date: '2024-03-01', num_defaulted: 0, total_defaulted: 0, num_inquiries: 0, bounced_cheques: 0, total_limits: 3500, total_outstanding: 1150, num_active: 2 },
  ]);
  return {
    profiles: [{
      id: uid, name: 'Layla Al-Ghamdi', age: 20, city: 'Riyadh', employment: 'CS student (KSU) · tutoring',
      monthly_income: 1400, persona: 'layla', career_start_year: 2024, career_start_income: 600,
      lifetime_save_rate: 15, side_income: 500, monthly_expense: 1550, liquid_savings: 3000,
      monthly_debt_payments: 250, total_debt: 1400, monthly_housing_payment: 0,
      monthly_investment_contribution: 200, has_health_insurance: true, life_stage: 'student', currency: 'SAR', marital_status: 'single',
    }],
    story_chapters: rows(uid, [
      { title: 'High school & first code', start_year: 2019, end_year: 2022, note: 'Taught myself Python from YouTube. Built a school-schedule app for friends — my first taste of making something people use.', vividness: 'sketch' },
      { title: 'Started KSU — Computer Science', start_year: 2022, end_year: 2024, note: 'Living at home, small monthly allowance. Learned to budget the hard way after overspending on the new phone.', vividness: 'clear' },
      { title: 'First income: tutoring', start_year: 2024, end_year: 2026, note: 'Tutoring programming to first-year students, ~SAR 800/month. Opened a Tadawul account and put SAR 200 in every month — tiny, but it is a start.', vividness: 'clear' },
    ]),
    net_worth_snapshots: rows(uid, [
      { year: 2022, amount: 400 }, { year: 2023, amount: 1100 }, { year: 2024, amount: 2200 },
      { year: 2025, amount: 3200 }, { year: 2026, amount: 4200 },
    ]),
    income_entries: rows(uid, [
      { year: 2025, month: 7, income: 1200, spending: 1400 }, { year: 2025, month: 8, income: 900, spending: 1250 },
      { year: 2025, month: 9, income: 1500, spending: 1600 }, { year: 2025, month: 10, income: 1400, spending: 1500 },
      { year: 2025, month: 11, income: 1300, spending: 1450 }, { year: 2025, month: 12, income: 1600, spending: 1800 },
      { year: 2026, month: 1, income: 1200, spending: 1400 }, { year: 2026, month: 2, income: 1400, spending: 1550 },
      { year: 2026, month: 3, income: 1500, spending: 1500 }, { year: 2026, month: 4, income: 1300, spending: 1500 },
      { year: 2026, month: 5, income: 1400, spending: 1600 }, { year: 2026, month: 6, income: 1400, spending: 1550 },
    ]),
    financial_snapshots: rows(uid, [
      { year: 2025, month: 11, cash: 2100, stocks: 500, real_estate: 0, equity: 0, other_assets: 200, liabilities: 1600, income: 1300, expenses: 1450 },
      { year: 2025, month: 12, cash: 2200, stocks: 600, real_estate: 0, equity: 0, other_assets: 200, liabilities: 1550, income: 1600, expenses: 1800 },
      { year: 2026, month: 1, cash: 2400, stocks: 700, real_estate: 0, equity: 0, other_assets: 200, liabilities: 1500, income: 1200, expenses: 1400 },
      { year: 2026, month: 2, cash: 2600, stocks: 750, real_estate: 0, equity: 0, other_assets: 200, liabilities: 1400, income: 1400, expenses: 1550 },
      { year: 2026, month: 3, cash: 2750, stocks: 820, real_estate: 0, equity: 0, other_assets: 200, liabilities: 1350, income: 1500, expenses: 1500 },
      { year: 2026, month: 4, cash: 2850, stocks: 880, real_estate: 0, equity: 0, other_assets: 200, liabilities: 1300, income: 1300, expenses: 1500 },
      { year: 2026, month: 5, cash: 2950, stocks: 950, real_estate: 0, equity: 0, other_assets: 200, liabilities: 1250, income: 1400, expenses: 1600 },
      { year: 2026, month: 6, cash: 3000, stocks: 1000, real_estate: 0, equity: 0, other_assets: 200, liabilities: 1150, income: 1400, expenses: 1550 },
    ]),
    goal_funds: goalFunds,
    goal_fund_actuals: rows(uid, [300, 200, 300, 250, 300, 200, 300, 300].map((amt, i) => ({ goal_fund_id: goalFunds[0].id, month_index: i + 1, actual_amount: amt }))),
    assets: rows(uid, [
      { name: 'Tadawul (micro-investing)', asset_type: 'stocks', asset_class: 'equity', value: 1000 },
      { name: 'Gold gift (Eid)', asset_type: 'gold', asset_class: 'commodity', value: 200 },
    ]),
    expenses: rows(uid, [
      { name: 'Phone & data', category: 'Bills', amount: 180, frequency: 'monthly' },
      { name: 'Coffee & campus food', category: 'Lifestyle', amount: 450, frequency: 'monthly' },
      { name: 'Transport (Uber/Careem)', category: 'Transport', amount: 320, frequency: 'monthly' },
    ]),
    liabilities: rows(uid, [
      { name: 'Phone (12-month installment)', kind: 'installment', balance: 900, monthly_payment: 150, original_amount: 1800 },
    ]),
    subscriptions: rows(uid, [
      { name: 'Spotify (student)', amount: 11, billing_cycle: 'monthly', started_on: '2023-09-01', category: 'Entertainment' },
      { name: 'iCloud 50GB', amount: 3, billing_cycle: 'monthly', started_on: '2022-06-01', category: 'Services & tools' },
      { name: 'ChatGPT Plus', amount: 75, billing_cycle: 'monthly', started_on: '2024-10-01', category: 'Services & tools' },
      { name: 'Netflix (shared)', amount: 20, billing_cycle: 'monthly', started_on: '2023-01-01', category: 'Entertainment' },
    ]),
    loans: [],
    credit_cards: rows(uid, [
      { name: 'Student credit card', balance: 250, credit_limit: 3000, min_payment: 75 },
    ]),
    life_phases: rows(uid, [
      { phase_name: 'A — Study & first income', start_year: 2022, end_year: 2026, target_tier: 'national_average', target_monthly_spend: 1500, sort_order: 0, theme: ['Finish CS at KSU', 'Earn from tutoring & projects', 'Learn to invest small'], todo: ['Keep a 3-month cushion', 'Add SAR 200/mo to Tadawul', 'Land a strong internship'], net_worth_goal: 'First SAR 10K' },
      { phase_name: 'B — Launch career', start_year: 2027, end_year: 2031, target_tier: 'basic', target_monthly_spend: 9000, sort_order: 1, theme: ['First real salary', 'Move out', 'Emergency fund'], todo: ['Beat lifestyle creep', 'Save 20%+', 'Avoid car-loan trap'], net_worth_goal: 'SAR 100K' },
      { phase_name: 'C — Independence', start_year: 2032, end_year: 2040, target_tier: 'decent', target_monthly_spend: 18000, sort_order: 2, theme: ['Senior tech role', 'Own place', 'Serious investing'], todo: ['Diversify', 'Buy vs rent', 'Grow income'], net_worth_goal: 'SAR 1M' },
    ]),
    living_standard_actuals: rows(uid, [
      { year: 2022, actual_monthly_spend: 900, actual_tier: 'national_average' },
      { year: 2023, actual_monthly_spend: 1100, actual_tier: 'national_average' },
      { year: 2024, actual_monthly_spend: 1300, actual_tier: 'national_average' },
      { year: 2025, actual_monthly_spend: 1500, actual_tier: 'national_average' },
      { year: 2026, actual_monthly_spend: 1550, actual_tier: 'national_average' },
    ]),
    year_plans: rows(uid, [
      { year: 2026, opening_balance: 3200, target_balance: 6000, monthly_income: 1400, monthly_expenses: 1550, save_rate: 15, invest_split: 40, expected_roi: 4 },
    ]),
    budget_items: rows(uid, [
      { name: 'Second-hand study desk', area: 'Home', phase: 1, cost: 400, bought: true },
      { name: 'Final-year laptop', area: 'Tech', phase: 1, cost: 6000, bought: false },
      { name: 'Graduation abaya', area: 'Personal', phase: 2, cost: 1200, bought: false },
      { name: 'Grad trip with friends', area: 'Travel', phase: 3, cost: 4000, bought: false },
    ]),
    investment_settings: [{ user_id: uid, portfolio_value: 1000, expected_roi: 6, updated_at: new Date().toISOString() }],
    advisor_messages: rows(uid, [
      { role: 'user', content: 'I only earn about SAR 1,400 a month from tutoring. Is it even worth investing SAR 200?' },
      { role: 'assistant', content: "Absolutely, Layla — and not for the money yet. At SAR 200/month the balance is small, but the habit is the whole point: you're learning how Tadawul works, how it feels when the market dips, and how automatic saving beats willpower. By the time your first real salary lands, investing will already be second nature — that head start is worth far more than the SAR 200. Keep your 3-month cushion first, then let the rest compound. Educational information, not licensed financial advice." },
    ]),
    credit_snapshots: credit,
    credit_accounts: rows(uid, [
      { snapshot_id: credit[1].id, product_type: 'credit_card', creditor: 'Al Rajhi Bank', credit_limit: 3000, outstanding: 250, installment: 75, past_due: 0, issue_date: '2024-03-01', status: 'active', payment_status: 'current', sort_order: 0 },
      { snapshot_id: credit[1].id, product_type: 'telecom', creditor: 'STC', credit_limit: 1800, outstanding: 900, installment: 150, past_due: 0, issue_date: '2025-01-01', status: 'active', payment_status: 'current', sort_order: 1 },
    ]),
    google_sheet_connections: [],
  };
}

// ═══════════════════════════════════════════════════════════════════════
// B · FAISAL — fresh grad, falling behind
// ═══════════════════════════════════════════════════════════════════════
function buildFaisal(): Record<string, Row[]> {
  const uid = 'demo-faisal';
  const goalFunds = rows(uid, [
    { name: 'Emergency fund (6 months)', icon: '🛟', monthly_contribution: 1000, maturity_years: 2, expected_return: 3, target_amount: 66000, start_date: '2025-06-01' },
  ]);
  const credit = rows(uid, [
    { report_date: '2025-09-10', molim_score: 648, monthly_income: 10000, first_account_date: '2023-08-01', num_defaulted: 0, total_defaulted: 0, num_inquiries: 3, bounced_cheques: 0, total_limits: 8000, total_outstanding: 48500, num_active: 3 },
    { report_date: '2026-06-18', molim_score: 662, monthly_income: 10000, first_account_date: '2023-08-01', num_defaulted: 0, total_defaulted: 0, num_inquiries: 2, bounced_cheques: 0, total_limits: 8000, total_outstanding: 48500, num_active: 3 },
  ]);
  return {
    profiles: [{
      id: uid, name: 'Faisal Al-Otaibi', age: 24, city: 'Riyadh', employment: 'Private sector (banking)',
      monthly_income: 10000, persona: 'faisal', career_start_year: 2023, career_start_income: 9000,
      lifetime_save_rate: 5, side_income: 0, monthly_expense: 11500, liquid_savings: 38000,
      monthly_debt_payments: 2100, total_debt: 48500, monthly_housing_payment: 3500,
      monthly_investment_contribution: 500, has_health_insurance: true, life_stage: 'employed', currency: 'SAR', marital_status: 'single',
    }],
    story_chapters: rows(uid, [
      { title: 'University years', start_year: 2019, end_year: 2023, note: 'Finance degree. Part-time work, some graduation gifts saved up — about SAR 45K by the time I finished.', vividness: 'sketch' },
      { title: 'First job at the bank', start_year: 2023, end_year: 2024, note: 'Joined as a junior analyst at SAR 9,000. Felt rich for the first time — that was the trap.', vividness: 'clear' },
      { title: 'Own place + the car', start_year: 2024, end_year: 2025, note: 'Rented my own apartment and financed a car. Suddenly the salary vanished by day 20 of every month.', vividness: 'clear' },
      { title: 'The reality check', start_year: 2025, end_year: 2026, note: 'Some months I spend more than I earn and dip into savings. Time to fix the picture before it fixes me.', vividness: 'clear' },
    ]),
    net_worth_snapshots: rows(uid, [
      { year: 2022, amount: 40000 }, { year: 2023, amount: 22000 }, { year: 2024, amount: 8000 },
      { year: 2025, amount: 1000 }, { year: 2026, amount: -2500 },
    ]),
    income_entries: rows(uid, [
      { year: 2025, month: 7, income: 10000, spending: 11200 }, { year: 2025, month: 8, income: 10000, spending: 10800 },
      { year: 2025, month: 9, income: 10000, spending: 12400 }, { year: 2025, month: 10, income: 10000, spending: 11900 },
      { year: 2025, month: 11, income: 10000, spending: 11300 }, { year: 2025, month: 12, income: 10000, spending: 13600 },
      { year: 2026, month: 1, income: 10000, spending: 11000 }, { year: 2026, month: 2, income: 10000, spending: 11400 },
      { year: 2026, month: 3, income: 14000, spending: 12000 }, { year: 2026, month: 4, income: 10000, spending: 11800 },
      { year: 2026, month: 5, income: 10000, spending: 12100 }, { year: 2026, month: 6, income: 10000, spending: 11500 },
    ]),
    financial_snapshots: rows(uid, [
      { year: 2025, month: 11, cash: 45000, stocks: 5000, real_estate: 0, equity: 0, other_assets: 2000, liabilities: 52000, income: 10000, expenses: 11300 },
      { year: 2025, month: 12, cash: 43000, stocks: 5200, real_estate: 0, equity: 0, other_assets: 2000, liabilities: 51200, income: 10000, expenses: 13600 },
      { year: 2026, month: 1, cash: 42000, stocks: 5400, real_estate: 0, equity: 0, other_assets: 2000, liabilities: 50600, income: 10000, expenses: 11000 },
      { year: 2026, month: 2, cash: 41000, stocks: 5500, real_estate: 0, equity: 0, other_assets: 2000, liabilities: 50100, income: 10000, expenses: 11400 },
      { year: 2026, month: 3, cash: 41500, stocks: 5700, real_estate: 0, equity: 0, other_assets: 2000, liabilities: 49600, income: 14000, expenses: 12000 },
      { year: 2026, month: 4, cash: 40000, stocks: 5800, real_estate: 0, equity: 0, other_assets: 2000, liabilities: 49200, income: 10000, expenses: 11800 },
      { year: 2026, month: 5, cash: 39000, stocks: 5900, real_estate: 0, equity: 0, other_assets: 2000, liabilities: 48800, income: 10000, expenses: 12100 },
      { year: 2026, month: 6, cash: 38000, stocks: 6000, real_estate: 0, equity: 0, other_assets: 2000, liabilities: 48500, income: 10000, expenses: 11500 },
    ]),
    goal_funds: goalFunds,
    goal_fund_actuals: rows(uid, [1000, 0, 1000, 500, 0, 1000, 500, 1000].map((amt, i) => ({ goal_fund_id: goalFunds[0].id, month_index: i + 1, actual_amount: amt }))),
    assets: rows(uid, [
      { name: 'Tadawul portfolio', asset_type: 'stocks', asset_class: 'equity', value: 6000 },
      { name: 'Savings (graduation gifts)', asset_type: 'cash', asset_class: 'cash', value: 38000 },
    ]),
    expenses: rows(uid, [
      { name: 'Apartment rent', category: 'Housing', amount: 3500, frequency: 'monthly' },
      { name: 'Dining & cafés', category: 'Lifestyle', amount: 2200, frequency: 'monthly' },
      { name: 'Fuel & car costs', category: 'Transport', amount: 1100, frequency: 'monthly' },
      { name: 'Shopping (clothes/gadgets)', category: 'Lifestyle', amount: 1400, frequency: 'monthly' },
    ]),
    liabilities: rows(uid, [
      { name: 'Credit card balance (carried)', kind: 'credit_card', balance: 4500, monthly_payment: 450, original_amount: 4500 },
    ]),
    subscriptions: rows(uid, [
      { name: 'Netflix', amount: 56, billing_cycle: 'monthly', started_on: '2023-08-01', category: 'Entertainment' },
      { name: 'Shahid VIP', amount: 46, billing_cycle: 'monthly', started_on: '2023-09-01', category: 'Entertainment' },
      { name: 'Spotify', amount: 22, billing_cycle: 'monthly', started_on: '2022-01-01', category: 'Entertainment' },
      { name: 'PlayStation Plus', amount: 35, billing_cycle: 'monthly', started_on: '2023-10-01', category: 'Entertainment' },
      { name: 'Anghami Plus', amount: 20, billing_cycle: 'monthly', started_on: '2024-01-01', category: 'Entertainment' },
      { name: 'Gym (premium)', amount: 350, billing_cycle: 'monthly', started_on: '2024-02-01', category: 'Health' },
      { name: 'ChatGPT Plus', amount: 75, billing_cycle: 'monthly', started_on: '2024-03-01', category: 'Services & tools' },
      { name: 'iCloud 200GB', amount: 12, billing_cycle: 'monthly', started_on: '2023-08-01', category: 'Services & tools' },
    ]),
    loans: rows(uid, [
      { name: 'Car loan (new sedan)', loan_type: 'loan', balance: 44000, monthly_payment: 1900, interest_rate: 5.5, original_amount: 55000 },
    ]),
    credit_cards: rows(uid, [
      { name: 'Alinma Cashback Visa', balance: 4500, credit_limit: 8000, min_payment: 225 },
    ]),
    life_phases: rows(uid, [
      { phase_name: 'A — Escape the squeeze', start_year: 2023, end_year: 2027, target_tier: 'basic', target_monthly_spend: 8500, sort_order: 0, theme: ['Fix the negative months', 'Right-size the car', 'Cut dead subscriptions'], todo: ['Get spending under income', 'Build 3-month runway', 'Kill the card balance'], net_worth_goal: 'Back above zero → SAR 50K' },
      { phase_name: 'B — Build surplus', start_year: 2028, end_year: 2032, target_tier: 'decent', target_monthly_spend: 15000, sort_order: 1, theme: ['Promotion to senior analyst', 'Automate saving', 'Start investing seriously'], todo: ['Save 20%+', 'Diversify', 'Avoid lifestyle creep'], net_worth_goal: 'SAR 300K' },
      { phase_name: 'C — Establish', start_year: 2033, end_year: 2040, target_tier: 'decent', target_monthly_spend: 22000, sort_order: 2, theme: ['Marriage & a home', 'Property'], todo: ['Down payment ready', 'Keep DBR healthy'], net_worth_goal: 'SAR 1M' },
    ]),
    living_standard_actuals: rows(uid, [
      { year: 2023, actual_monthly_spend: 9000, actual_tier: 'basic' },
      { year: 2024, actual_monthly_spend: 11000, actual_tier: 'basic' },
      { year: 2025, actual_monthly_spend: 12000, actual_tier: 'basic' },
      { year: 2026, actual_monthly_spend: 11500, actual_tier: 'basic' },
    ]),
    year_plans: rows(uid, [
      { year: 2026, opening_balance: 1000, target_balance: 20000, monthly_income: 10000, monthly_expenses: 11500, save_rate: 10, invest_split: 30, expected_roi: 6 },
    ]),
    budget_items: rows(uid, [
      { name: 'Standing desk', area: 'Home', phase: 3, cost: 1800, bought: true },
      { name: 'New iPhone (upgrade)', area: 'Tech', phase: 3, cost: 5200, bought: false },
      { name: 'PS5 Pro', area: 'Tech', phase: 3, cost: 2900, bought: false },
      { name: 'Emergency fund top-up', area: 'Savings', phase: 1, cost: 30000, bought: false },
    ]),
    investment_settings: [{ user_id: uid, portfolio_value: 6000, expected_roi: 7, updated_at: new Date().toISOString() }],
    advisor_messages: rows(uid, [
      { role: 'user', content: 'Some months I spend more than I make. Where do I even start?' },
      { role: 'assistant', content: "First, breathe — this is fixable, and you caught it early, Faisal. Two numbers are doing the damage: SAR 3,500 rent and SAR 1,900 car, which together eat 54% of your salary before anything else. Your subscriptions add ~SAR 600/month too — several you barely use. Start there: trim the stack, then pick ONE structural move (a cheaper car or a flatmate) and you flip from negative to a real surplus. I'd tackle the SAR 4,500 card balance next — at card rates it's your most expensive money. Educational information, not licensed financial advice." },
    ]),
    credit_snapshots: credit,
    credit_accounts: rows(uid, [
      { snapshot_id: credit[1].id, product_type: 'auto_loan', creditor: 'Alinma Bank', credit_limit: 55000, outstanding: 44000, installment: 1900, past_due: 0, issue_date: '2024-06-01', status: 'active', payment_status: 'current', sort_order: 0 },
      { snapshot_id: credit[1].id, product_type: 'credit_card', creditor: 'Alinma Bank', credit_limit: 8000, outstanding: 4500, installment: 450, past_due: 0, issue_date: '2023-08-01', status: 'active', payment_status: 'current', sort_order: 1 },
      { snapshot_id: credit[1].id, product_type: 'telecom', creditor: 'Mobily', credit_limit: 0, outstanding: 0, installment: 0, past_due: 0, issue_date: '2023-08-01', status: 'active', payment_status: 'current', sort_order: 2 },
    ]),
    google_sheet_connections: [],
  };
}

// ═══════════════════════════════════════════════════════════════════════
// C · REEM — mid-career, break-even
// ═══════════════════════════════════════════════════════════════════════
function buildReem(): Record<string, Row[]> {
  const uid = 'demo-reem';
  const goalFunds = rows(uid, [
    { name: "Kids' university fund", icon: '🎓', monthly_contribution: 1000, maturity_years: 12, expected_return: 5, target_amount: 195000, start_date: '2024-01-01' },
    { name: 'Family Hajj', icon: '🕋', monthly_contribution: 700, maturity_years: 3, expected_return: 3, target_amount: 26000, start_date: '2025-06-01' },
  ]);
  const credit = rows(uid, [
    { report_date: '2025-08-01', molim_score: 715, monthly_income: 18000, first_account_date: '2014-05-01', num_defaulted: 0, total_defaulted: 0, num_inquiries: 1, bounced_cheques: 0, total_limits: 920000, total_outstanding: 640000, num_active: 4 },
    { report_date: '2026-06-15', molim_score: 725, monthly_income: 18000, first_account_date: '2014-05-01', num_defaulted: 0, total_defaulted: 0, num_inquiries: 0, bounced_cheques: 0, total_limits: 920000, total_outstanding: 631000, num_active: 4 },
  ]);
  return {
    profiles: [{
      id: uid, name: 'Reem Al-Harbi', age: 34, city: 'Riyadh', employment: 'Government (ministry)',
      monthly_income: 18000, persona: 'reem', career_start_year: 2014, career_start_income: 7000,
      lifetime_save_rate: 8, side_income: 0, monthly_expense: 17200, liquid_savings: 55000,
      monthly_debt_payments: 6400, total_debt: 640000, monthly_housing_payment: 5500,
      monthly_investment_contribution: 800, has_health_insurance: true, life_stage: 'employed', currency: 'SAR', marital_status: 'married',
    }],
    story_chapters: rows(uid, [
      { title: 'Early career', start_year: 2014, end_year: 2018, note: 'First government role at SAR 7,000. Built a foundation, saved for a wedding.', vividness: 'sketch' },
      { title: 'Marriage & the villa', start_year: 2018, end_year: 2021, note: 'Married, and we bought our villa in Riyadh with a mortgage. Big step, big commitment.', vividness: 'clear' },
      { title: 'Two kids arrive', start_year: 2021, end_year: 2024, note: 'Expenses climbed fast — nursery, then school. Income kept up, but only just.', vividness: 'clear' },
      { title: 'Mid-career, at break-even', start_year: 2024, end_year: 2026, note: 'Stable and secure, but nothing is left over to build with. I want to change that without shortchanging the kids.', vividness: 'clear' },
    ]),
    net_worth_snapshots: rows(uid, [
      { year: 2016, amount: 60000 }, { year: 2018, amount: 90000 }, { year: 2020, amount: 150000 },
      { year: 2022, amount: 220000 }, { year: 2024, amount: 300000 }, { year: 2026, amount: 355000 },
    ]),
    income_entries: rows(uid, [
      { year: 2025, month: 7, income: 18000, spending: 17000 }, { year: 2025, month: 8, income: 18000, spending: 16800 },
      { year: 2025, month: 9, income: 18000, spending: 17600 }, { year: 2025, month: 10, income: 18000, spending: 17100 },
      { year: 2025, month: 11, income: 18000, spending: 16900 }, { year: 2025, month: 12, income: 18000, spending: 18800 },
      { year: 2026, month: 1, income: 18000, spending: 17000 }, { year: 2026, month: 2, income: 18000, spending: 16700 },
      { year: 2026, month: 3, income: 21000, spending: 17400 }, { year: 2026, month: 4, income: 18000, spending: 17300 },
      { year: 2026, month: 5, income: 18000, spending: 17600 }, { year: 2026, month: 6, income: 18000, spending: 17200 },
    ]),
    financial_snapshots: rows(uid, [
      { year: 2025, month: 11, cash: 48000, stocks: 24000, real_estate: 900000, equity: 0, other_assets: 10000, liabilities: 660000, income: 18000, expenses: 16900 },
      { year: 2025, month: 12, cash: 49000, stocks: 25000, real_estate: 900000, equity: 0, other_assets: 10000, liabilities: 655000, income: 18000, expenses: 18800 },
      { year: 2026, month: 1, cash: 50500, stocks: 26000, real_estate: 900000, equity: 0, other_assets: 10000, liabilities: 650000, income: 18000, expenses: 17000 },
      { year: 2026, month: 2, cash: 51500, stocks: 27000, real_estate: 900000, equity: 0, other_assets: 10000, liabilities: 646000, income: 18000, expenses: 16700 },
      { year: 2026, month: 3, cash: 53000, stocks: 28000, real_estate: 900000, equity: 0, other_assets: 10000, liabilities: 642000, income: 21000, expenses: 17400 },
      { year: 2026, month: 4, cash: 53500, stocks: 28500, real_estate: 900000, equity: 0, other_assets: 10000, liabilities: 638000, income: 18000, expenses: 17300 },
      { year: 2026, month: 5, cash: 54500, stocks: 29000, real_estate: 900000, equity: 0, other_assets: 10000, liabilities: 634000, income: 18000, expenses: 17600 },
      { year: 2026, month: 6, cash: 55000, stocks: 30000, real_estate: 900000, equity: 0, other_assets: 10000, liabilities: 631000, income: 18000, expenses: 17200 },
    ]),
    goal_funds: goalFunds,
    goal_fund_actuals: rows(uid, [1000, 1000, 800, 1000, 1000, 700, 1000, 1000].map((amt, i) => ({ goal_fund_id: goalFunds[0].id, month_index: i + 1, actual_amount: amt }))),
    assets: rows(uid, [
      { name: 'Family villa (Riyadh)', asset_type: 'real_estate', asset_class: 'real_estate', value: 900000 },
      { name: 'Tadawul portfolio', asset_type: 'stocks', asset_class: 'equity', value: 30000 },
      { name: 'Gold (family savings)', asset_type: 'gold', asset_class: 'commodity', value: 10000 },
    ]),
    expenses: rows(uid, [
      { name: 'Private school fees', category: 'Education', amount: 3800, frequency: 'monthly' },
      { name: 'Groceries (family)', category: 'Food', amount: 3200, frequency: 'monthly' },
      { name: 'Household help', category: 'Home', amount: 1500, frequency: 'monthly' },
      { name: 'Kids activities & clothes', category: 'Family', amount: 1200, frequency: 'monthly' },
    ]),
    liabilities: rows(uid, [
      { name: 'Family car finance', kind: 'auto', balance: 20000, monthly_payment: 900, original_amount: 60000 },
    ]),
    subscriptions: rows(uid, [
      { name: 'Shahid VIP (family)', amount: 46, billing_cycle: 'monthly', started_on: '2021-01-01', category: 'Entertainment' },
      { name: 'Netflix', amount: 56, billing_cycle: 'monthly', started_on: '2020-06-01', category: 'Entertainment' },
      { name: 'iCloud 2TB (family)', amount: 37, billing_cycle: 'monthly', started_on: '2021-03-01', category: 'Services & tools' },
      { name: 'Abjadiyat (kids learning)', amount: 30, billing_cycle: 'monthly', started_on: '2023-09-01', category: 'Education' },
      { name: "Ladies' gym", amount: 300, billing_cycle: 'monthly', started_on: '2022-01-01', category: 'Health' },
    ]),
    loans: rows(uid, [
      { name: 'Villa mortgage', loan_type: 'mortgage', balance: 620000, monthly_payment: 5500, interest_rate: 3.8, original_amount: 850000 },
      { name: 'Family car finance', loan_type: 'loan', balance: 20000, monthly_payment: 900, interest_rate: 4.2, original_amount: 60000 },
    ]),
    credit_cards: rows(uid, [
      { name: 'SNB Family Visa', balance: 2400, credit_limit: 40000, min_payment: 120 },
    ]),
    life_phases: rows(uid, [
      { phase_name: 'A — Stabilize', start_year: 2018, end_year: 2024, target_tier: 'decent', target_monthly_spend: 16000, sort_order: 0, theme: ['Home & family', 'Cover the essentials'], todo: ['Keep the mortgage current', 'Small emergency fund'], net_worth_goal: 'SAR 300K' },
      { phase_name: 'B — Create surplus', start_year: 2025, end_year: 2031, target_tier: 'decent', target_monthly_spend: 17000, sort_order: 1, theme: ['Open a real gap', 'Secure kids’ education', 'Start investing monthly'], todo: ['Engineer SAR 2,000/mo surplus', 'Automate the education fund', 'Trim overlap in bills'], net_worth_goal: 'SAR 600K' },
      { phase_name: 'C — Comfortable & giving', start_year: 2032, end_year: 2045, target_tier: 'lavish', target_monthly_spend: 25000, sort_order: 2, theme: ['Mortgage cleared', 'Support the kids at university', 'Travel more'], todo: ['Income-producing assets', 'Give generously'], net_worth_goal: 'SAR 1.5M' },
    ]),
    living_standard_actuals: rows(uid, [
      { year: 2018, actual_monthly_spend: 12000, actual_tier: 'basic' },
      { year: 2020, actual_monthly_spend: 14500, actual_tier: 'decent' },
      { year: 2022, actual_monthly_spend: 16000, actual_tier: 'decent' },
      { year: 2024, actual_monthly_spend: 16800, actual_tier: 'decent' },
      { year: 2026, actual_monthly_spend: 17200, actual_tier: 'decent' },
    ]),
    year_plans: rows(uid, [
      { year: 2026, opening_balance: 340000, target_balance: 400000, monthly_income: 18000, monthly_expenses: 17200, save_rate: 10, invest_split: 40, expected_roi: 6 },
    ]),
    budget_items: rows(uid, [
      { name: "Kids' study room", area: 'Home', phase: 1, cost: 4500, bought: true },
      { name: 'Replace the fridge', area: 'Home', phase: 2, cost: 3800, bought: false },
      { name: 'Family Umrah trip', area: 'Travel', phase: 2, cost: 8000, bought: false },
      { name: 'Living room refresh', area: 'Home', phase: 3, cost: 12000, bought: false },
    ]),
    investment_settings: [{ user_id: uid, portfolio_value: 30000, expected_roi: 6, updated_at: new Date().toISOString() }],
    advisor_messages: rows(uid, [
      { role: 'user', content: 'We earn SAR 18,000 but there is never anything left to save or invest. How do we break out?' },
      { role: 'assistant', content: "You're not behind, Reem — you're at break-even, which is the most common and most escapable place to be. Your surplus is only about SAR 800/month, so the goal is engineering a bigger, protected gap. Two levers stand out: your subscriptions and overlapping streaming add ~SAR 470/month, and once the car finance (SAR 900/month) clears next year, that's real breathing room. Redirect both, automated, into the kids' education fund on payday so it never gets spent. Small moves compound — and your mortgage is quietly building equity the whole time. Educational information, not licensed financial advice." },
    ]),
    credit_snapshots: credit,
    credit_accounts: rows(uid, [
      { snapshot_id: credit[1].id, product_type: 'mortgage', creditor: 'Al Rajhi Bank', credit_limit: 850000, outstanding: 620000, installment: 5500, past_due: 0, issue_date: '2019-04-01', status: 'active', payment_status: 'current', sort_order: 0 },
      { snapshot_id: credit[1].id, product_type: 'auto_loan', creditor: 'SNB', credit_limit: 60000, outstanding: 20000, installment: 900, past_due: 0, issue_date: '2022-02-01', status: 'active', payment_status: 'current', sort_order: 1 },
      { snapshot_id: credit[1].id, product_type: 'credit_card', creditor: 'SNB', credit_limit: 40000, outstanding: 2400, installment: 120, past_due: 0, issue_date: '2014-05-01', status: 'active', payment_status: 'current', sort_order: 2 },
      { snapshot_id: credit[1].id, product_type: 'telecom', creditor: 'STC', credit_limit: 0, outstanding: 0, installment: 0, past_due: 0, issue_date: '2018-01-01', status: 'active', payment_status: 'current', sort_order: 3 },
    ]),
    google_sheet_connections: [],
  };
}

// ═══════════════════════════════════════════════════════════════════════
// D · KHALID — business owner, abundance
// ═══════════════════════════════════════════════════════════════════════
function buildKhalid(): Record<string, Row[]> {
  const uid = 'demo-khalid';
  const goalFunds = rows(uid, [
    { name: 'Family Waqf (endowment)', icon: '🕌', monthly_contribution: 20000, maturity_years: 5, expected_return: 5, target_amount: 1400000, start_date: '2024-01-01' },
    { name: 'Extended-family Hajj', icon: '🕋', monthly_contribution: 5000, maturity_years: 2, expected_return: 3, target_amount: 124000, start_date: '2025-06-01' },
  ]);
  const credit = rows(uid, [
    { report_date: '2025-07-01', molim_score: 802, monthly_income: 65000, first_account_date: '2006-02-01', num_defaulted: 0, total_defaulted: 0, num_inquiries: 1, bounced_cheques: 0, total_limits: 2600000, total_outstanding: 2400000, num_active: 4 },
    { report_date: '2026-06-10', molim_score: 815, monthly_income: 65000, first_account_date: '2006-02-01', num_defaulted: 0, total_defaulted: 0, num_inquiries: 0, bounced_cheques: 0, total_limits: 2600000, total_outstanding: 2350000, num_active: 4 },
  ]);
  return {
    profiles: [{
      id: uid, name: 'Khalid Al-Dossari', age: 48, city: 'Riyadh', employment: 'Business owner (trading & contracting)',
      monthly_income: 65000, persona: 'khalid', career_start_year: 2004, career_start_income: 6000,
      lifetime_save_rate: 45, side_income: 15000, monthly_expense: 35000, liquid_savings: 800000,
      monthly_debt_payments: 22000, total_debt: 2400000, monthly_housing_payment: 12000,
      monthly_investment_contribution: 25000, has_health_insurance: true, life_stage: 'business_owner', currency: 'SAR', marital_status: 'married',
    }],
    story_chapters: rows(uid, [
      { title: 'The first job', start_year: 2004, end_year: 2008, note: 'Started at SAR 6,000 in a trading firm. Learned the business from the warehouse up.', vividness: 'sketch' },
      { title: 'Went out on my own', start_year: 2008, end_year: 2013, note: 'Started my own contracting company with two trucks and a lot of nerve. Nearly went under twice.', vividness: 'clear' },
      { title: 'The first million', start_year: 2013, end_year: 2018, note: 'The business turned the corner. Reinvested everything, then bought the first rental building.', vividness: 'clear' },
      { title: 'Diversify & build', start_year: 2018, end_year: 2023, note: 'Spread into Tadawul, more real estate, and gold. Stopped depending on one income.', vividness: 'clear' },
      { title: 'Legacy years', start_year: 2023, end_year: 2026, note: 'Net worth past SAR 11M. Now it is about deploying surplus wisely, and starting a family waqf.', vividness: 'clear' },
    ]),
    net_worth_snapshots: rows(uid, [
      { year: 2014, amount: 800000 }, { year: 2016, amount: 1800000 }, { year: 2018, amount: 3500000 },
      { year: 2020, amount: 5500000 }, { year: 2022, amount: 7500000 }, { year: 2024, amount: 9800000 }, { year: 2026, amount: 11300000 },
    ]),
    income_entries: rows(uid, [
      { year: 2025, month: 7, income: 62000, spending: 34000 }, { year: 2025, month: 8, income: 58000, spending: 33000 },
      { year: 2025, month: 9, income: 70000, spending: 36000 }, { year: 2025, month: 10, income: 65000, spending: 35000 },
      { year: 2025, month: 11, income: 64000, spending: 34500 }, { year: 2025, month: 12, income: 80000, spending: 42000 },
      { year: 2026, month: 1, income: 66000, spending: 35000 }, { year: 2026, month: 2, income: 60000, spending: 33500 },
      { year: 2026, month: 3, income: 95000, spending: 38000 }, { year: 2026, month: 4, income: 65000, spending: 35000 },
      { year: 2026, month: 5, income: 63000, spending: 34000 }, { year: 2026, month: 6, income: 65000, spending: 35000 },
    ]),
    financial_snapshots: rows(uid, [
      { year: 2025, month: 11, cash: 720000, stocks: 1680000, real_estate: 6500000, equity: 3900000, other_assets: 560000, liabilities: 2480000, income: 64000, expenses: 34500 },
      { year: 2025, month: 12, cash: 760000, stocks: 1710000, real_estate: 6500000, equity: 3920000, other_assets: 570000, liabilities: 2460000, income: 80000, expenses: 42000 },
      { year: 2026, month: 1, cash: 770000, stocks: 1740000, real_estate: 6500000, equity: 3940000, other_assets: 575000, liabilities: 2440000, income: 66000, expenses: 35000 },
      { year: 2026, month: 2, cash: 775000, stocks: 1760000, real_estate: 6500000, equity: 3960000, other_assets: 580000, liabilities: 2420000, income: 60000, expenses: 33500 },
      { year: 2026, month: 3, cash: 800000, stocks: 1790000, real_estate: 6500000, equity: 3980000, other_assets: 590000, liabilities: 2400000, income: 95000, expenses: 38000 },
      { year: 2026, month: 4, cash: 795000, stocks: 1770000, real_estate: 6500000, equity: 3990000, other_assets: 595000, liabilities: 2385000, income: 65000, expenses: 35000 },
      { year: 2026, month: 5, cash: 800000, stocks: 1785000, real_estate: 6500000, equity: 4000000, other_assets: 600000, liabilities: 2365000, income: 63000, expenses: 34000 },
      { year: 2026, month: 6, cash: 800000, stocks: 1800000, real_estate: 6500000, equity: 4000000, other_assets: 600000, liabilities: 2350000, income: 65000, expenses: 35000 },
    ]),
    goal_funds: goalFunds,
    goal_fund_actuals: rows(uid, [20000, 20000, 15000, 20000, 25000, 20000, 20000, 20000].map((amt, i) => ({ goal_fund_id: goalFunds[0].id, month_index: i + 1, actual_amount: amt }))),
    assets: rows(uid, [
      { name: 'The company (equity)', asset_type: 'business', asset_class: 'business', value: 4000000 },
      { name: 'Rental building (Riyadh)', asset_type: 'real_estate', asset_class: 'real_estate', value: 3800000 },
      { name: 'Family villa', asset_type: 'real_estate', asset_class: 'real_estate', value: 2700000 },
      { name: 'Tadawul portfolio', asset_type: 'stocks', asset_class: 'equity', value: 1800000 },
      { name: 'Gold reserve', asset_type: 'gold', asset_class: 'commodity', value: 400000 },
      { name: 'Crypto (small allocation)', asset_type: 'crypto', asset_class: 'crypto', value: 200000 },
    ]),
    expenses: rows(uid, [
      { name: 'Household & villa upkeep', category: 'Home', amount: 12000, frequency: 'monthly' },
      { name: 'Private international school', category: 'Education', amount: 6000, frequency: 'monthly' },
      { name: 'Family & staff', category: 'Family', amount: 8000, frequency: 'monthly' },
      { name: 'Summer in Europe', category: 'Travel', amount: 120000, frequency: 'one_off' },
    ]),
    liabilities: rows(uid, [
      { name: 'Business line of credit', kind: 'business', balance: 0, monthly_payment: 0, original_amount: 500000 },
    ]),
    subscriptions: rows(uid, [
      { name: 'Bloomberg (research)', amount: 2400, billing_cycle: 'monthly', started_on: '2019-01-01', category: 'Services & tools' },
      { name: 'Netflix Premium', amount: 69, billing_cycle: 'monthly', started_on: '2018-01-01', category: 'Entertainment' },
      { name: 'iCloud 2TB', amount: 37, billing_cycle: 'monthly', started_on: '2019-06-01', category: 'Services & tools' },
      { name: 'Private club membership', amount: 3500, billing_cycle: 'monthly', started_on: '2020-01-01', category: 'Lifestyle' },
    ]),
    loans: rows(uid, [
      { name: 'Stock finance (Murabaha)', loan_type: 'loan', balance: 950000, monthly_payment: 9500, interest_rate: 5.0, original_amount: 1200000 },
      { name: 'Villa mortgage', loan_type: 'mortgage', balance: 900000, monthly_payment: 7500, interest_rate: 3.5, original_amount: 1800000 },
      { name: 'Commercial financing (SME)', loan_type: 'loan', balance: 500000, monthly_payment: 5000, interest_rate: 4.8, original_amount: 900000 },
    ]),
    credit_cards: rows(uid, [
      { name: 'SNB Infinite (paid in full)', balance: 8000, credit_limit: 150000, min_payment: 0 },
    ]),
    life_phases: rows(uid, [
      { phase_name: 'A — Build the business', start_year: 2008, end_year: 2016, target_tier: 'decent', target_monthly_spend: 18000, sort_order: 0, theme: ['Survive & scale', 'Reinvest everything'], todo: ['Positive cash flow', 'First asset'], net_worth_goal: 'First SAR 1M' },
      { phase_name: 'B — Diversify', start_year: 2017, end_year: 2024, target_tier: 'lavish', target_monthly_spend: 30000, sort_order: 1, theme: ['Multiple income streams', 'Property & Tadawul', 'De-risk the business'], todo: ['Diversify concentration', 'Income-producing assets'], net_worth_goal: 'SAR 10M' },
      { phase_name: 'C — Multiply & give', start_year: 2025, end_year: 2035, target_tier: 'lavish', target_monthly_spend: 38000, sort_order: 2, theme: ['Deploy the surplus', 'Family waqf', 'Mentor the next generation'], todo: ['Put idle cash to work', 'Establish the endowment', 'Succession plan'], net_worth_goal: 'SAR 20M+' },
    ]),
    living_standard_actuals: rows(uid, [
      { year: 2014, actual_monthly_spend: 16000, actual_tier: 'decent' },
      { year: 2016, actual_monthly_spend: 22000, actual_tier: 'decent' },
      { year: 2018, actual_monthly_spend: 28000, actual_tier: 'lavish' },
      { year: 2020, actual_monthly_spend: 31000, actual_tier: 'lavish' },
      { year: 2022, actual_monthly_spend: 33000, actual_tier: 'lavish' },
      { year: 2024, actual_monthly_spend: 34000, actual_tier: 'lavish' },
      { year: 2026, actual_monthly_spend: 35000, actual_tier: 'lavish' },
    ]),
    year_plans: rows(uid, [
      { year: 2026, opening_balance: 11000000, target_balance: 13000000, monthly_income: 65000, monthly_expenses: 35000, save_rate: 55, invest_split: 70, expected_roi: 9 },
    ]),
    budget_items: rows(uid, [
      { name: 'Majlis renovation', area: 'Home', phase: 2, cost: 180000, bought: false },
      { name: 'New family SUV', area: 'Transport', phase: 2, cost: 320000, bought: false },
      { name: 'Second villa (Jeddah)', area: 'Investment', phase: 3, cost: 2500000, bought: false },
      { name: 'Home office upgrade', area: 'Home', phase: 1, cost: 45000, bought: true },
    ]),
    investment_settings: [{ user_id: uid, portfolio_value: 1800000, expected_roi: 9, updated_at: new Date().toISOString() }],
    advisor_messages: rows(uid, [
      { role: 'user', content: 'I have about SAR 800K sitting in cash. Is that too much just sitting there?' },
      { role: 'assistant', content: "For your position, Khalid, it's more safety than the picture needs. At your scale a healthy operating buffer might be 6–9 months of business and household costs — call it SAR 350–450K — leaving roughly SAR 400K working harder than a current account ever will. Two honest flags first: about 60% of your net worth is in the business and real estate combined, so any new deployment ideally diversifies rather than deepens that concentration; and your family waqf is a beautiful use of surplus that also puts idle capital to purpose. I'll keep both the concentration and the cash drag in view across your tools. Educational information, not licensed financial advice." },
    ]),
    credit_snapshots: credit,
    credit_accounts: rows(uid, [
      { snapshot_id: credit[1].id, product_type: 'stock_finance', creditor: 'Alinma Bank', credit_limit: 1200000, outstanding: 950000, installment: 9500, past_due: 0, issue_date: '2022-01-01', status: 'active', payment_status: 'current', sort_order: 0 },
      { snapshot_id: credit[1].id, product_type: 'mortgage', creditor: 'Al Rajhi Bank', credit_limit: 1800000, outstanding: 900000, installment: 7500, past_due: 0, issue_date: '2016-03-01', status: 'active', payment_status: 'current', sort_order: 1 },
      { snapshot_id: credit[1].id, product_type: 'sme_finance', creditor: 'Riyad Bank', credit_limit: 900000, outstanding: 500000, installment: 5000, past_due: 0, issue_date: '2021-06-01', status: 'active', payment_status: 'current', sort_order: 2 },
      { snapshot_id: credit[1].id, product_type: 'credit_card', creditor: 'SNB', credit_limit: 150000, outstanding: 8000, installment: 0, past_due: 0, issue_date: '2006-02-01', status: 'active', payment_status: 'current', sort_order: 3 },
    ]),
    google_sheet_connections: [],
  };
}

const BUILDERS: Record<string, () => Record<string, Row[]>> = {
  layla: buildLayla, faisal: buildFaisal, reem: buildReem, khalid: buildKhalid,
};

export function buildDemoDb(personaId = 'faisal'): Record<string, Row[]> {
  return (BUILDERS[personaId] ?? buildFaisal)();
}

// A canned reply for the live-AI features inside the demo, tuned per persona.
export function demoAiReply(personaId: string): string {
  const p = getPersona(personaId);
  switch (p.id) {
    case 'layla':
      return "Here's a taste of how I think (this is the demo — sign up and I'll reason over YOUR real numbers): Layla is doing the rarest thing — building the habit before the money. Her income is small and a little volatile, but she keeps a cushion and invests SAR 200 every month like clockwork. The one thing I'd watch is her subscriptions eating into a tiny budget. Get the first job, hold the habits, and she's years ahead of most graduates. That's the cross-tool reasoning I do continuously once your own story is in MalMind.";
    case 'faisal':
      return "Here's a taste of how I think (this is the demo — sign up and I'll reason over YOUR real numbers): Faisal's salary is fine — the structure isn't. Rent and the car eat 54% before anything else, his card carries a balance at the most expensive rate he'll ever pay, and eight subscriptions quietly drain ~SAR 600/month. He has a 4-month cushion, so this is fixable fast: trim the stack, right-size the car, kill the card. Flip one structural cost and he's saving instead of slipping. That's the kind of cross-tool reasoning I do once your own story is in MalMind.";
    case 'reem':
      return "Here's a taste of how I think (this is the demo — sign up and I'll reason over YOUR real numbers): Reem isn't behind — she's at break-even, the most escapable place to be. Her surplus is ~SAR 800/month; the goal is engineering a bigger, protected gap. Overlapping streaming plus the car finance clearing next year frees real money — automate both into the kids' education fund on payday. Meanwhile the mortgage quietly builds equity. Small, protected moves compound. That's the cross-tool reasoning I do once your own story is in MalMind.";
    case 'khalid':
    default:
      return "Here's a taste of how I think (this is the demo — sign up and I'll reason over YOUR real numbers): Khalid's picture is strong — the question is efficiency, not survival. ~SAR 800K in cash is more buffer than he needs, and ~60% of his net worth sits in the business and real estate, so new capital should diversify, not deepen, that concentration. His family waqf is a superb use of surplus. Put the idle cash to purpose and the compounding accelerates. That's the cross-tool reasoning I do continuously once your own story is in MalMind.";
  }
}

// Back-compat: a few modules still import these symbols.
export const DEMO_USER_ID = 'demo-faisal';
export const DEMO_EMAIL = 'faisal.demo@malmind.ai';
export const DEMO_AI_REPLY = demoAiReply('faisal');
