// src/lib/risks.ts
// The Risks engine: turns a user's real position into a set of named,
// scored life-risks - income concentration, thin emergency runway,
// uninsured health shocks, portfolio concentration, and debt burden -
// each with a severity, a plain-language finding, and concrete
// mitigations mapped to MalMind's own tools. Computed, never fabricated:
// any risk without enough data says so.

export type RiskLevel = 'high' | 'medium' | 'low' | 'unknown';

export interface Mitigation {
  text: string;
  href?: string;
  linkLabel?: string;
}

export interface RiskResult {
  id: string;
  icon: string;
  title: string;
  level: RiskLevel;
  score: number; // 0 (safe) → 100 (exposed); 0 when unknown
  finding: string; // one-line, with real numbers
  why: string; // why this matters
  mitigations: Mitigation[];
  missingHint?: string; // when level === 'unknown'
}

export interface RiskInputs {
  monthlyIncome: number | null;
  sideIncome: number | null;
  liquidSavings: number | null;
  monthlyDebtPayments: number | null;
  hasHealthInsurance: boolean | null;
  avgMonthlyExpenses: number | null;
  // latest asset mix, e.g. [{ label: 'Real estate', value: 650000 }, …]
  assetMix: { label: string; value: number }[];
}

function fmtSar(n: number) {
  return 'SAR ' + Math.round(n).toLocaleString();
}

export function computeRisks(i: RiskInputs): RiskResult[] {
  const out: RiskResult[] = [];

  // 1 ── Income concentration
  if (i.monthlyIncome && i.monthlyIncome > 0) {
    const side = Math.max(0, i.sideIncome ?? 0);
    const total = i.monthlyIncome + side;
    const pct = (i.monthlyIncome / total) * 100;
    const level: RiskLevel = pct >= 95 ? 'high' : pct >= 80 ? 'medium' : 'low';
    out.push({
      id: 'income', icon: '🎯', title: 'One income to rule them all', level,
      score: Math.round(pct),
      finding: side > 0
        ? `${pct.toFixed(0)}% of what enters your pocket comes from a single employer — your side income covers just ${fmtSar(side)}/month.`
        : `100% of what enters your pocket comes from a single source. If it stops, everything stops.`,
      why: 'A single income source means a single point of failure: one restructuring, one health event, one bad quarter at your employer, and the entire inflow goes to zero at once. Diversifying income is the deepest risk fix there is.',
      mitigations: [
        { text: 'Model what a second income stream does to your timeline', href: '/velocity', linkLabel: 'Velocity of Money' },
        { text: 'Grow assets that pay you — dividends, rent, business income', href: '/holdings', linkLabel: 'Assets & liabilities' },
        { text: 'Keep your runway long enough to survive a gap between jobs (see the next risk)' },
      ],
    });
  } else {
    out.push({
      id: 'income', icon: '🎯', title: 'One income to rule them all', level: 'unknown', score: 0,
      finding: 'Not enough data yet.', why: '',
      missingHint: 'Set your monthly income (and any side income) in Edit Profile.',
      mitigations: [],
    });
  }

  // 2 ── Emergency runway
  if (i.liquidSavings != null && i.avgMonthlyExpenses && i.avgMonthlyExpenses > 0) {
    const months = i.liquidSavings / i.avgMonthlyExpenses;
    const level: RiskLevel = months < 3 ? 'high' : months < 6 ? 'medium' : 'low';
    out.push({
      id: 'runway', icon: '🛟', title: 'How long could you glide?', level,
      score: Math.round(Math.max(0, Math.min(100, (1 - months / 12) * 100))),
      finding: `Your liquid savings of ${fmtSar(i.liquidSavings)} cover ${months.toFixed(1)} months of your real spending (${fmtSar(i.avgMonthlyExpenses)}/month).`,
      why: 'The runway is what turns a crisis into an inconvenience. Below three months, a job loss or urgent expense forces debt or fire-selling investments at the worst moment. Six months buys calm — and calm makes better decisions.',
      mitigations: [
        { text: 'Set a runway target and automate a monthly top-up on payday', href: '/goal-fund', linkLabel: 'Goal Fund' },
        { text: 'Find the leak months in your spending history', href: '/financial-numbers', linkLabel: 'My Financial Numbers' },
        { text: 'Watch the runway ratio recover month by month', href: '/ratios', linkLabel: 'Ratios & Stats' },
      ],
    });
  } else {
    out.push({
      id: 'runway', icon: '🛟', title: 'How long could you glide?', level: 'unknown', score: 0,
      finding: 'Not enough data yet.', why: '',
      missingHint: 'Set your liquid savings in Edit Profile and log a month in My Financial Numbers.',
      mitigations: [],
    });
  }

  // 3 ── Health shock (insurance)
  if (i.hasHealthInsurance === true) {
    out.push({
      id: 'health', icon: '🏥', title: 'The uninsured emergency', level: 'low', score: 15,
      finding: 'You have health insurance — a sudden medical event hits your calendar, not your net worth.',
      why: 'A single uninsured hospitalization can erase years of savings overnight. Cover converts an unbounded, unpredictable cost into a bounded, predictable one — which is the entire art of risk management.',
      mitigations: [
        { text: 'Review your coverage limits yearly — especially if family members were added' },
        { text: 'Keep one month of the deductible inside your emergency runway' },
      ],
    });
  } else if (i.hasHealthInsurance === false) {
    out.push({
      id: 'health', icon: '🏥', title: 'The uninsured emergency', level: 'high', score: 90,
      finding: 'No health insurance on record — one serious medical event would be paid entirely from your savings.',
      why: 'This is the classic unbounded risk: you cannot predict it, schedule it, or cap it. A single uninsured emergency can consume an emergency fund built over years. Insurance is the cheapest way to put a ceiling on it.',
      mitigations: [
        { text: 'Price a private health policy — even a high-deductible plan caps the catastrophe' },
        { text: 'If employed, check whether your employer plan can be upgraded or extended to family' },
        { text: 'Until covered, treat your runway as untouchable', href: '/goal-fund', linkLabel: 'Goal Fund' },
      ],
    });
  } else {
    out.push({
      id: 'health', icon: '🏥', title: 'The uninsured emergency', level: 'unknown', score: 0,
      finding: 'Do you have health insurance?', why: '',
      missingHint: 'answer-inline', // page renders yes/no buttons for this one
      mitigations: [],
    });
  }

  // 4 ── Portfolio / asset concentration
  const totalAssets = i.assetMix.reduce((s, a) => s + a.value, 0);
  if (totalAssets > 0) {
    const top = [...i.assetMix].sort((a, b) => b.value - a.value)[0];
    const pct = (top.value / totalAssets) * 100;
    const level: RiskLevel = pct >= 70 ? 'high' : pct >= 50 ? 'medium' : 'low';
    out.push({
      id: 'concentration', icon: '🧺', title: 'All eggs, how many baskets?', level,
      score: Math.round(pct),
      finding: `${top.label} makes up ${pct.toFixed(0)}% of your ${fmtSar(totalAssets)} in assets.`,
      why: 'Concentration cuts both ways: it built the wealth, but it also means one market — one asset — decides your net worth. A property downturn or a single stock crash shouldn\'t be able to take half your story with it.',
      mitigations: [
        { text: 'Map your full asset mix and its drift over time', href: '/financial-numbers', linkLabel: 'My Financial Numbers' },
        { text: 'Direct new monthly investment into the under-weighted classes', href: '/doubling-path', linkLabel: 'Doubling Path' },
        { text: 'Ask the AI analyst how your mix compares to your phase of life', href: '/ratios', linkLabel: 'The Blend' },
      ],
    });
  } else {
    out.push({
      id: 'concentration', icon: '🧺', title: 'All eggs, how many baskets?', level: 'unknown', score: 0,
      finding: 'Not enough data yet.', why: '',
      missingHint: 'Log a month in My Financial Numbers (cash, stocks, real estate…) to see your asset mix.',
      mitigations: [],
    });
  }

  // 5 ── Debt burden
  if (i.monthlyDebtPayments != null && i.monthlyIncome && i.monthlyIncome > 0) {
    const pct = (i.monthlyDebtPayments / i.monthlyIncome) * 100;
    const level: RiskLevel = pct > 36 ? 'high' : pct > 20 ? 'medium' : 'low';
    out.push({
      id: 'debt', icon: '⚓', title: 'The weight you carry monthly', level,
      score: Math.round(Math.min(100, pct * 1.8)),
      finding: `Debt payments claim ${pct.toFixed(0)}% of your income (${fmtSar(i.monthlyDebtPayments)} of ${fmtSar(i.monthlyIncome)}) before you see a riyal.`,
      why: 'Fixed obligations are the anchor in every storm: they don\'t shrink when income does. The higher this share, the less room you have to absorb any of the other risks on this page.',
      mitigations: [
        { text: 'See each debt\'s payoff progress and months-to-zero', href: '/commitments', linkLabel: 'Bills & commitments' },
        { text: 'Model how a smaller commitment accelerates every milestone', href: '/velocity', linkLabel: 'Velocity of Money' },
      ],
    });
  } else {
    out.push({
      id: 'debt', icon: '⚓', title: 'The weight you carry monthly', level: 'unknown', score: 0,
      finding: 'Not enough data yet.', why: '',
      missingHint: 'Set your monthly debt payments in Edit Profile.',
      mitigations: [],
    });
  }

  return out;
}

export const RISK_LEVEL_LABEL: Record<RiskLevel, string> = {
  high: 'Exposed',
  medium: 'Watch',
  low: 'Managed',
  unknown: 'Unknown',
};
