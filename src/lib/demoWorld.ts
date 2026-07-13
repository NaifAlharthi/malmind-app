// src/lib/demoWorld.ts
// The complete, internally-consistent dataset behind guest demo mode:
// "Sara Al-Qahtani", 29, a product manager in Riyadh. Every table the app
// reads is prefilled here so every feature renders fully populated the
// moment a guest enters the demo - no signup, no empty states.
//
// Numbers are deliberately coherent across tools: SAR 28,000/month salary,
// ~SAR 18,500/month spending, a net worth arc from SAR 15K (2019) to
// ~SAR 1M (2026) made of cash 145K + stocks 235K + apartment 650K +
// equity 52K + other 15K minus 92K of debt (car 42K + mortgage tail 35K +
// family loan 15K).

export const DEMO_USER_ID = 'demo-user-0001';
export const DEMO_EMAIL = 'sara.demo@malmind.ai';

type Row = Record<string, unknown>;

function rows(table: Row[], extra: Row = {}): Row[] {
  return table.map((r, i) => ({
    id: `${DEMO_USER_ID}-${i}-${Math.random().toString(36).slice(2, 8)}`,
    user_id: DEMO_USER_ID,
    created_at: new Date(2026, 0, 1 + i).toISOString(),
    ...extra,
    ...r,
  }));
}

export function buildDemoDb(): Record<string, Row[]> {
  const goalFunds = rows([
    {
      name: 'Hajj Fund', icon: '🕋', monthly_contribution: 1500, maturity_years: 2,
      expected_return: 3, target_amount: 37110, start_date: '2025-09-01',
    },
    {
      name: 'Home Upgrade Fund', icon: '🏡', monthly_contribution: 2500, maturity_years: 5,
      expected_return: 4, target_amount: 165739, start_date: '2026-01-01',
    },
  ]);

  return {
    profiles: [
      {
        id: DEMO_USER_ID,
        name: 'Sara Al-Qahtani',
        age: 29,
        city: 'Riyadh',
        employment: 'Product manager (tech)',
        monthly_income: 28000,
        persona: 'demo',
        career_start_year: 2019,
        career_start_income: 9000,
        lifetime_save_rate: 25,
        side_income: 3000,
        monthly_expense: 18500,
        liquid_savings: 145000,
        monthly_debt_payments: 3400,
        total_debt: 92000,
        monthly_housing_payment: 6500,
        monthly_investment_contribution: 4500,
      },
    ],

    story_chapters: rows([
      { title: 'University years', start_year: 2015, end_year: 2019, note: 'Computer science at KSU. Lived at home, tutored on the side — first taste of earning.', vividness: 'sketch' },
      { title: 'First job, first salary', start_year: 2019, end_year: 2021, note: 'Junior analyst at SAR 9,000/month. Spent almost all of it — the leak years.', vividness: 'clear' },
      { title: 'The switch to product', start_year: 2021, end_year: 2023, note: 'Moved into product management, income jumped to SAR 18,000. Opened a Tadawul account and started investing every month.', vividness: 'clear' },
      { title: 'The apartment', start_year: 2023, end_year: 2025, note: 'Bought a small apartment in Al Malqa with REDF support. Scary, then the best decision so far.', vividness: 'clear' },
      { title: 'Compounding quietly', start_year: 2025, end_year: 2026, note: 'Promoted to senior PM at SAR 28,000. Savings on autopilot; net worth crossed SAR 1M.', vividness: 'clear' },
    ]),

    net_worth_snapshots: rows([
      { year: 2019, amount: 15000 },
      { year: 2020, amount: 48000 },
      { year: 2021, amount: 110000 },
      { year: 2022, amount: 210000 },
      { year: 2023, amount: 370000 },
      { year: 2024, amount: 560000 },
      { year: 2025, amount: 800000 },
      { year: 2026, amount: 1005000 },
    ]),

    income_entries: rows([
      { year: 2025, month: 7, income: 28000, spending: 18200 },
      { year: 2025, month: 8, income: 28000, spending: 17600 },
      { year: 2025, month: 9, income: 28000, spending: 18900 },
      { year: 2025, month: 10, income: 28000, spending: 18100 },
      { year: 2025, month: 11, income: 28000, spending: 17900 },
      { year: 2025, month: 12, income: 28000, spending: 19500 },
      { year: 2026, month: 1, income: 28000, spending: 18000 },
      { year: 2026, month: 2, income: 28000, spending: 17800 },
      { year: 2026, month: 3, income: 34000, spending: 18600 },
      { year: 2026, month: 4, income: 28000, spending: 18300 },
      { year: 2026, month: 5, income: 28000, spending: 18900 },
      { year: 2026, month: 6, income: 28000, spending: 18500 },
    ]),

    financial_snapshots: rows([
      { year: 2025, month: 11, cash: 118000, stocks: 196000, real_estate: 650000, equity: 40000, other_assets: 15000, liabilities: 105000, income: 28000, expenses: 17900 },
      { year: 2025, month: 12, cash: 122000, stocks: 201000, real_estate: 650000, equity: 41500, other_assets: 15000, liabilities: 103000, income: 28000, expenses: 19500 },
      { year: 2026, month: 1, cash: 126000, stocks: 207000, real_estate: 650000, equity: 43000, other_assets: 15000, liabilities: 101000, income: 28000, expenses: 18000 },
      { year: 2026, month: 2, cash: 128000, stocks: 212000, real_estate: 650000, equity: 44500, other_assets: 15000, liabilities: 99500, income: 28000, expenses: 17800 },
      { year: 2026, month: 3, cash: 133000, stocks: 219000, real_estate: 650000, equity: 46000, other_assets: 15000, liabilities: 98000, income: 34000, expenses: 18600 },
      { year: 2026, month: 4, cash: 137000, stocks: 224000, real_estate: 650000, equity: 48000, other_assets: 15000, liabilities: 96000, income: 28000, expenses: 18300 },
      { year: 2026, month: 5, cash: 141000, stocks: 229000, real_estate: 650000, equity: 50000, other_assets: 15000, liabilities: 94000, income: 28000, expenses: 18900 },
      { year: 2026, month: 6, cash: 145000, stocks: 235000, real_estate: 650000, equity: 52000, other_assets: 15000, liabilities: 92000, income: 28000, expenses: 18500 },
    ]),

    goal_funds: goalFunds,

    goal_fund_actuals: rows(
      [1500, 1500, 1000, 1500, 2000, 1500, 1500, 1500, 1500].map((amt, i) => ({
        goal_fund_id: goalFunds[0].id,
        month_index: i + 1,
        actual_amount: amt,
      }))
    ),

    assets: rows([
      { name: 'Tadawul portfolio', asset_type: 'stocks', asset_class: 'equity', value: 235000 },
      { name: 'Apartment in Al Malqa', asset_type: 'real_estate', asset_class: 'real_estate', value: 650000 },
      { name: 'Gold (savings grams)', asset_type: 'gold', asset_class: 'commodity', value: 15000 },
      { name: 'Startup equity (ESOP)', asset_type: 'business', asset_class: 'business', value: 52000 },
    ]),

    expenses: rows([
      { name: 'Groceries', category: 'Food', amount: 2400, frequency: 'monthly' },
      { name: 'Dining out', category: 'Lifestyle', amount: 1300, frequency: 'monthly' },
      { name: 'Fuel & car costs', category: 'Transport', amount: 950, frequency: 'monthly' },
      { name: 'Family trip to AlUla', category: 'Travel', amount: 7500, frequency: 'one_off' },
    ]),

    liabilities: rows([
      { name: 'Owed to my brother (car down payment)', kind: 'family', balance: 15000, monthly_payment: 500 },
    ]),

    subscriptions: rows([
      { name: 'Netflix', amount: 56, billing_cycle: 'monthly' },
      { name: 'Spotify', amount: 22, billing_cycle: 'monthly' },
      { name: 'iCloud 200GB', amount: 12, billing_cycle: 'monthly' },
      { name: 'Amazon Prime', amount: 140, billing_cycle: 'annual' },
    ]),

    loans: rows([
      { name: 'Car loan (Camry)', loan_type: 'loan', balance: 42000, monthly_payment: 1900, interest_rate: 4.5 },
      { name: 'Apartment mortgage (final stretch)', loan_type: 'mortgage', balance: 35000, monthly_payment: 1000, interest_rate: 3.2 },
    ]),

    credit_cards: rows([
      { name: 'SNB Visa Signature', balance: 4200, credit_limit: 25000, min_payment: 210 },
    ]),

    life_phases: rows([
      {
        phase_name: 'Phase A — Build the base', start_year: 2019, end_year: 2024, target_tier: 'basic',
        target_monthly_spend: 9000, sort_order: 0,
        theme: ['First job, full independence', 'Move out to my own place', 'Learn to invest'],
        todo: ['Stop the spending leaks', 'Open Tadawul account', 'Build 6-month emergency fund'],
        net_worth_goal: 'First SAR 250K',
      },
      {
        phase_name: 'Phase B — Compound & upgrade', start_year: 2025, end_year: 2031, target_tier: 'decent',
        target_monthly_spend: 19000, sort_order: 1,
        theme: ['Senior roles, bigger scope', 'Possibly marriage & family', 'Upgrade the apartment'],
        todo: ['Scale income past SAR 35K', 'Keep 25%+ savings rate', 'Diversify beyond Tadawul'],
        net_worth_goal: 'SAR 1M → 2.5M',
      },
      {
        phase_name: 'Phase C — Freedom of choice', start_year: 2032, end_year: 2040, target_tier: 'lavish',
        target_monthly_spend: 32000, sort_order: 2,
        theme: ['Work because I want to', 'A villa with a garden', 'Give generously'],
        todo: ['Income-producing assets', 'Mentor and invest in others'],
        net_worth_goal: 'SAR 5M+',
      },
    ]),

    living_standard_actuals: rows([
      { year: 2019, actual_monthly_spend: 8000, actual_tier: 'national_average' },
      { year: 2020, actual_monthly_spend: 8600, actual_tier: 'national_average' },
      { year: 2021, actual_monthly_spend: 11000, actual_tier: 'basic' },
      { year: 2022, actual_monthly_spend: 13500, actual_tier: 'basic' },
      { year: 2023, actual_monthly_spend: 16500, actual_tier: 'decent' },
      { year: 2024, actual_monthly_spend: 17500, actual_tier: 'decent' },
      { year: 2025, actual_monthly_spend: 18200, actual_tier: 'decent' },
      { year: 2026, actual_monthly_spend: 18500, actual_tier: 'decent' },
    ]),

    year_plans: rows([
      {
        year: 2026, opening_balance: 800000, target_balance: 1150000,
        monthly_income: 28000, monthly_expenses: 18500, save_rate: 35, invest_split: 60, expected_roi: 8,
      },
    ]),

    budget_items: rows([
      { name: 'Ergonomic desk setup', area: 'Home office', phase: 1, cost: 3200, bought: true },
      { name: 'New iPhone', area: 'Tech', phase: 2, cost: 4600, bought: false },
      { name: 'Living room refresh', area: 'Home', phase: 2, cost: 9500, bought: false },
      { name: 'Ski trip gear', area: 'Travel', phase: 3, cost: 5400, bought: false },
    ]),

    investment_settings: [
      { user_id: DEMO_USER_ID, portfolio_value: 235000, expected_roi: 8, updated_at: new Date().toISOString() },
    ],

    advisor_messages: rows([
      { role: 'user', content: 'Should I pay off my car loan early or put the extra SAR 2,000 into Tadawul every month?' },
      { role: 'assistant', content: "Good question to be asking, Sara. Your car loan is at 4.5% while your portfolio has averaged around 8% — so mathematically, investing the SAR 2,000 wins over time. But your loan balance (SAR 42,000) is small enough that clearing it would free SAR 1,900/month of guaranteed cash flow and simplify your picture before the apartment upgrade you're planning in Phase B. Honestly? Either choice is a good one at your savings rate — this is a comfort decision, not a math emergency. This is educational information, not licensed financial advice." },
      { role: 'user', content: 'What would it take to hit SAR 2.5M by 2031?' },
      { role: 'assistant', content: "You're at roughly SAR 1M now. Reaching SAR 2.5M by 2031 needs about SAR 1.5M of growth in ~5.5 years. At your current pace — roughly SAR 9,500/month saved plus ~8% returns on your SAR 287K invested — you'd land near SAR 1.9M. Closing the rest means either lifting income (your Phase B plan already targets SAR 35K+), or letting the apartment appreciate and counting it honestly. Ambitious but not fantasy — I'll keep this target in view across your tools. Educational information, not licensed financial advice." },
    ]),

    google_sheet_connections: [],
  };
}

// A canned reply used when demo visitors try the live AI features (the
// real Claude endpoints require a signed-in account).
export const DEMO_AI_REPLY =
  "Here's a taste of how I think (this is the demo — sign up and I'll reason over YOUR real numbers): Sara's picture is strong. She keeps ~34% of her income, her emergency fund covers 7.8 months, and debt claims just 12% of income — all healthy. The one pattern I'd flag: SAR 145K sitting in cash is more safety than she needs; even moving a third of it into her portfolio would meaningfully compound by her Phase B target. Her Hajj fund is ahead of schedule, so there's slack to redirect. That's the kind of cross-tool reasoning I do continuously once your own story is in MalMind.";
