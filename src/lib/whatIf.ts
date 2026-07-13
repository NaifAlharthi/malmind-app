// src/lib/whatIf.ts
// The "What if" engine. Simulates a financial life month-by-month with a
// two-pot model - cash (no return) and invested (compounds monthly) - so
// that "start investing X/month" is a real, distinct move from "spend
// less". A scenario is the baseline plus a list of moves; the engine
// returns yearly trajectories for both, plus deterministic insights that
// analyze what the imagination actually does.

export type MoveType = 'income_change' | 'expense_change' | 'monthly_invest' | 'one_off_cost' | 'windfall';

export interface Move {
  id: string;
  type: MoveType;
  label: string;
  amount: number; // monthly delta for the recurring types, total for one-offs
  atYear: number; // years from now (0 = immediately)
}

export const MOVE_META: Record<MoveType, { label: string; hint: string; recurring: boolean }> = {
  income_change: { label: 'Income changes', hint: 'a raise, a new job, or a pay cut (use a negative amount)', recurring: true },
  expense_change: { label: 'Spending changes', hint: 'lifestyle up or down, monthly (negative = spend less)', recurring: true },
  monthly_invest: { label: 'Invest monthly', hint: 'move this much from cash into investments every month', recurring: true },
  one_off_cost: { label: 'Big purchase', hint: 'a wedding, a car, a down payment — paid once from cash', recurring: false },
  windfall: { label: 'Windfall', hint: 'a bonus, an inheritance, an exit — lands once in cash', recurring: false },
};

export interface WhatIfBaseline {
  startCash: number;
  startInvested: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  annualReturnPct: number;
  years: number;
}

export interface YearPoint {
  year: number; // calendar year
  baseline: number;
  scenario: number;
  scenarioCash: number;
  scenarioInvested: number;
}

export interface WhatIfResult {
  points: YearPoint[];
  finalBaseline: number;
  finalScenario: number;
  minScenarioCash: number;
  minScenarioCashYear: number;
  crossesMillionBaseline: number | null; // calendar year, or null
  crossesMillionScenario: number | null;
}

function simulate(b: WhatIfBaseline, moves: Move[], startYear: number): { total: number[]; cash: number[]; invested: number[] } {
  const months = b.years * 12;
  let cash = b.startCash;
  let invested = b.startInvested;
  const r = b.annualReturnPct / 100 / 12;
  const totals: number[] = [cash + invested];
  const cashSeries: number[] = [cash];
  const investedSeries: number[] = [invested];

  for (let m = 1; m <= months; m++) {
    const yearsElapsed = (m - 1) / 12;
    let income = b.monthlyIncome;
    let expenses = b.monthlyExpenses;
    let investMonthly = 0;

    for (const mv of moves) {
      if (mv.type === 'income_change' && yearsElapsed >= mv.atYear) income += mv.amount;
      if (mv.type === 'expense_change' && yearsElapsed >= mv.atYear) expenses += mv.amount;
      if (mv.type === 'monthly_invest' && yearsElapsed >= mv.atYear) investMonthly += mv.amount;
    }

    cash += income - expenses;

    // one-offs land in the exact month their year begins
    for (const mv of moves) {
      if (Math.round(mv.atYear * 12) === m - 1) {
        if (mv.type === 'one_off_cost') cash -= mv.amount;
        if (mv.type === 'windfall') cash += mv.amount;
      }
    }

    if (investMonthly > 0) {
      cash -= investMonthly;
      invested += investMonthly;
    }

    invested *= 1 + r;

    if (m % 12 === 0) {
      totals.push(cash + invested);
      cashSeries.push(cash);
      investedSeries.push(invested);
    }
  }
  void startYear;
  return { total: totals, cash: cashSeries, invested: investedSeries };
}

export function runWhatIf(b: WhatIfBaseline, moves: Move[], startYear: number): WhatIfResult {
  const base = simulate(b, [], startYear);
  const scen = simulate(b, moves, startYear);

  const points: YearPoint[] = base.total.map((bl, i) => ({
    year: startYear + i,
    baseline: Math.round(bl),
    scenario: Math.round(scen.total[i]),
    scenarioCash: Math.round(scen.cash[i]),
    scenarioInvested: Math.round(scen.invested[i]),
  }));

  let minCash = Infinity;
  let minCashYear = startYear;
  scen.cash.forEach((c, i) => {
    if (c < minCash) {
      minCash = c;
      minCashYear = startYear + i;
    }
  });

  const crosses = (series: number[]) => {
    const idx = series.findIndex((v) => v >= 1_000_000);
    return idx >= 0 ? startYear + idx : null;
  };

  return {
    points,
    finalBaseline: Math.round(base.total[base.total.length - 1]),
    finalScenario: Math.round(scen.total[scen.total.length - 1]),
    minScenarioCash: Math.round(minCash),
    minScenarioCashYear: minCashYear,
    crossesMillionBaseline: crosses(base.total),
    crossesMillionScenario: crosses(scen.total),
  };
}

function fmtSar(n: number) {
  return 'SAR ' + Math.round(n).toLocaleString();
}

export interface Insight {
  tone: 'good' | 'warn' | 'neutral';
  text: string;
}

export function analyzeWhatIf(b: WhatIfBaseline, moves: Move[], r: WhatIfResult): Insight[] {
  const out: Insight[] = [];
  const delta = r.finalScenario - r.finalBaseline;
  const horizon = b.years;
  const endYear = r.points[r.points.length - 1]?.year;

  if (moves.length === 0) {
    out.push({ tone: 'neutral', text: `This is your baseline: keep everything as it is and you'd end ${horizon} years from now (${endYear}) around ${fmtSar(r.finalBaseline)}. Add a move above to start imagining.` });
    return out;
  }

  out.push({
    tone: delta >= 0 ? 'good' : 'warn',
    text: delta >= 0
      ? `This imagination ends ${fmtSar(delta)} AHEAD of your baseline by ${endYear} — ${fmtSar(r.finalScenario)} instead of ${fmtSar(r.finalBaseline)}.`
      : `This imagination ends ${fmtSar(-delta)} BEHIND your baseline by ${endYear} — ${fmtSar(r.finalScenario)} instead of ${fmtSar(r.finalBaseline)}. That's not a verdict; it may be buying a life you want.`,
  });

  if (r.minScenarioCash < 0) {
    out.push({ tone: 'warn', text: `⚠ Your cash goes NEGATIVE around ${r.minScenarioCashYear} (bottoming near ${fmtSar(r.minScenarioCash)}). As imagined, this plan needs financing or a delayed purchase to be real.` });
  } else if (r.minScenarioCash < b.monthlyExpenses * 3) {
    out.push({ tone: 'warn', text: `Your cash runs thin around ${r.minScenarioCashYear} — about ${fmtSar(r.minScenarioCash)}, under 3 months of spending. The plan works, but it removes your safety margin at that point.` });
  }

  if (r.crossesMillionScenario && r.crossesMillionBaseline) {
    const diff = r.crossesMillionBaseline - r.crossesMillionScenario;
    if (diff > 0) out.push({ tone: 'good', text: `You reach SAR 1M in ${r.crossesMillionScenario} — ${diff} year${diff === 1 ? '' : 's'} earlier than baseline.` });
    else if (diff < 0) out.push({ tone: 'warn', text: `SAR 1M moves from ${r.crossesMillionBaseline} to ${r.crossesMillionScenario} — the imagination delays it by ${-diff} year${diff === -1 ? '' : 's'}.` });
  } else if (r.crossesMillionScenario && !r.crossesMillionBaseline) {
    out.push({ tone: 'good', text: `This imagination unlocks SAR 1M by ${r.crossesMillionScenario} — your baseline never gets there within the horizon.` });
  } else if (!r.crossesMillionScenario && r.crossesMillionBaseline) {
    out.push({ tone: 'warn', text: `Your baseline reaches SAR 1M in ${r.crossesMillionBaseline}, but this scenario doesn't get there within the horizon.` });
  }

  const investMoves = moves.filter((m) => m.type === 'monthly_invest');
  if (investMoves.length > 0) {
    const monthly = investMoves.reduce((s, m) => s + m.amount, 0);
    out.push({ tone: 'neutral', text: `You're moving ${fmtSar(monthly)}/month from cash into investments — at ${b.annualReturnPct}% that's where most of the compounding in this curve comes from.` });
  }

  return out;
}

// A compact plain-text summary for the AI analyst.
export function describeScenario(b: WhatIfBaseline, moves: Move[], r: WhatIfResult, startYear: number): string {
  const moveLines = moves.length
    ? moves.map((m) => `- ${MOVE_META[m.type].label}: "${m.label || 'unnamed'}", ${m.type === 'one_off_cost' || m.type === 'windfall' ? `SAR ${m.amount.toLocaleString()} once` : `SAR ${m.amount.toLocaleString()}/month`}, starting year ${startYear + m.atYear}`).join('\n')
    : '- (no moves; baseline only)';
  return `Baseline: cash SAR ${b.startCash.toLocaleString()}, invested SAR ${b.startInvested.toLocaleString()}, income SAR ${b.monthlyIncome.toLocaleString()}/mo, spending SAR ${b.monthlyExpenses.toLocaleString()}/mo, ${b.annualReturnPct}% annual return, ${b.years}-year horizon.
Moves:
${moveLines}
Outcome: baseline ends at SAR ${r.finalBaseline.toLocaleString()}; scenario ends at SAR ${r.finalScenario.toLocaleString()}; lowest cash point SAR ${r.minScenarioCash.toLocaleString()} around ${r.minScenarioCashYear}.`;
}
