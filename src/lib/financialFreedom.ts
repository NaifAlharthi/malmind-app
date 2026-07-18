// src/lib/financialFreedom.ts
// The Financial Freedom engine (seed of the upcoming dedicated tool).
//
// Financial freedom = the point where passive returns on your working capital
// can replace your recurring expenses, so working becomes a choice. The
// classic reading: at a safe withdrawal rate of 4%/year, you need 25× your
// annual spending invested. This module computes that number, your progress
// toward it, and — given your current monthly investing pace — roughly when
// you'd arrive, letting invested capital compound along the way.

export interface FreedomInputs {
  avgMonthlyExpenses: number; // real recurring spending
  investedNow: number; // capital that can work for you (investments)
  monthlyInvestPace: number; // how much you're adding per month at current pace
  withdrawalRate?: number; // safe annual withdrawal rate (default 4%)
  annualGrowth?: number; // expected annual return on invested capital (default 6%)
}

export interface FreedomReading {
  freedomNumber: number; // capital needed
  investedNow: number;
  progress: number; // 0..1
  gap: number; // SAR still to build
  passiveMonthlyNow: number; // what your current capital yields per month at the rate
  monthsToFreedom: number | null; // null when unreachable at current pace
  etaYear: number | null;
}

export function computeFreedom(i: FreedomInputs): FreedomReading | null {
  const rate = i.withdrawalRate ?? 0.04;
  const growth = i.annualGrowth ?? 0.06;
  if (!i.avgMonthlyExpenses || i.avgMonthlyExpenses <= 0) return null;

  const freedomNumber = (i.avgMonthlyExpenses * 12) / rate; // == 25× annual at 4%
  const investedNow = Math.max(0, i.investedNow);
  const progress = Math.min(1, investedNow / freedomNumber);
  const gap = Math.max(0, freedomNumber - investedNow);
  const passiveMonthlyNow = (investedNow * rate) / 12;

  // Iterate month by month: capital compounds at `growth`, pace keeps adding.
  let monthsToFreedom: number | null = null;
  if (investedNow >= freedomNumber) {
    monthsToFreedom = 0;
  } else if (i.monthlyInvestPace > 0 || growth > 0) {
    const r = Math.pow(1 + growth, 1 / 12) - 1;
    let capital = investedNow;
    for (let m = 1; m <= 1200; m++) {
      capital = capital * (1 + r) + Math.max(0, i.monthlyInvestPace);
      if (capital >= freedomNumber) {
        monthsToFreedom = m;
        break;
      }
    }
  }

  return {
    freedomNumber,
    investedNow,
    progress,
    gap,
    passiveMonthlyNow,
    monthsToFreedom,
    etaYear:
      monthsToFreedom != null ? new Date().getFullYear() + Math.floor(monthsToFreedom / 12) : null,
  };
}
