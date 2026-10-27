// src/lib/volatility.ts
// The mathematics of personal calm — how much a financial life shakes.
// Everything reads from the Log's monthly snapshots and comes back as
// plain numbers the Volatility tool (and the Brain) can speak:
//   · flows (income, spending, surplus) — dispersion of the monthly
//     amounts: σ and CV (σ/μ); the surplus is normalized by income,
//     because a surplus mean can sit near zero
//   · stocks (investments, net worth) — dispersion of month-over-month
//     % movement, annualized ×√12. Honest note: movement includes the
//     user's own deposits and withdrawals, so this is "how much the
//     line moves", not pure market return
//   · rolling σ — is the sea calming or building?
//   · max drawdown — the deepest peak-to-trough fall
//   · the calm score (0–100) — a weighted blend of all roughness,
//     banded into sea states the product speaks: mirror → sailing →
//     choppy → storm
//   · the implications engine — the storm buffer a life needs (a 2σ
//     bad month) and the volatility drag on compounding (≈ σ²/2)

export interface VolSnap {
  year: number; month: number;
  income: number; expenses: number; cash: number;
  stocks: number; equity: number; real_estate: number;
  other_assets: number; liabilities: number;
}

export interface SeriesPoint { label: string; value: number }

export interface DimensionVol {
  key: 'income' | 'spending' | 'surplus' | 'invested' | 'networth';
  /** roughness as a fraction (CV for flows, annualized σ for stocks) */
  vol: number;
  /** 0–1 normalized roughness against the dimension's own storm ceiling */
  roughness: number;
  mean: number;
  sigma: number;
  /** false when the series can't support a reading (e.g. too few positive months) */
  measured: boolean;
}

export interface VolReport {
  months: number;
  calmScore: number; // 0–100, higher = calmer
  band: 'mirror' | 'sailing' | 'choppy' | 'storm';
  dims: DimensionVol[];
  noisiest: DimensionVol;
  /** seismograph: monthly surplus deviation from its mean, as % of income */
  seismo: SeriesPoint[];
  /** rolling 3-month σ of the surplus, as % of mean income */
  rolling: SeriesPoint[];
  /** calming if the last rolling reading sits below the first */
  calming: boolean | null;
  maxDrawdownInvested: number | null; // fraction, e.g. 0.18
  maxDrawdownNetWorth: number | null;
  /** a 2σ-bad month's shortfall vs the average month, in SAR */
  stormBuffer: number;
  /** annualized volatility drag on invested compounding, as a fraction */
  dragAnnual: number | null;
  avgIncome: number;
  avgExpenses: number;
  cash: number;
  invested: number;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const stdev = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) * (b - m), 0) / (xs.length - 1));
};

const mLabel = (s: VolSnap) => `${s.month}/${String(s.year).slice(2)}`;

function pctChanges(values: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < values.length; i++) {
    if (values[i - 1] > 0) out.push((values[i] - values[i - 1]) / values[i - 1]);
  }
  return out;
}

function maxDrawdown(values: number[]): number | null {
  let peak = -Infinity;
  let worst = 0;
  let seen = false;
  for (const v of values) {
    if (v > peak) peak = v;
    if (peak > 0) { seen = true; worst = Math.max(worst, (peak - v) / peak); }
  }
  return seen ? worst : null;
}

/** The storm ceiling per dimension: roughness 1.0 = "as rough as it gets". */
const CEILING: Record<DimensionVol['key'], number> = {
  income: 0.35, spending: 0.35, surplus: 0.5, invested: 0.4, networth: 0.1,
};

const WEIGHT: Record<DimensionVol['key'], number> = {
  surplus: 0.3, spending: 0.2, income: 0.2, invested: 0.2, networth: 0.1,
};

export function computeVolatility(snapsIn: VolSnap[]): VolReport | null {
  const snaps = snapsIn.map((s) => ({
    ...s,
    income: Number(s.income), expenses: Number(s.expenses), cash: Number(s.cash),
    stocks: Number(s.stocks), equity: Number(s.equity),
    real_estate: Number(s.real_estate), other_assets: Number(s.other_assets),
    liabilities: Number(s.liabilities),
  }));
  if (snaps.length < 4) return null; // σ over fewer months is noise about noise

  const income = snaps.map((s) => s.income);
  const expenses = snaps.map((s) => s.expenses);
  const surplus = snaps.map((s) => s.income - s.expenses);
  const invested = snaps.map((s) => s.stocks + s.equity);
  const netWorth = snaps.map((s) => s.cash + s.stocks + s.equity + s.real_estate + s.other_assets - s.liabilities);

  const avgIncome = mean(income);
  const avgExpenses = mean(expenses);

  // flows: dispersion of the amounts themselves
  const dimIncome: DimensionVol = {
    key: 'income', mean: avgIncome, sigma: stdev(income),
    vol: avgIncome > 0 ? stdev(income) / avgIncome : 0,
    roughness: 0, measured: avgIncome > 0,
  };
  const dimSpending: DimensionVol = {
    key: 'spending', mean: avgExpenses, sigma: stdev(expenses),
    vol: avgExpenses > 0 ? stdev(expenses) / avgExpenses : 0,
    roughness: 0, measured: avgExpenses > 0,
  };
  // the surplus mean can hug zero — normalize its σ by income instead
  const dimSurplus: DimensionVol = {
    key: 'surplus', mean: mean(surplus), sigma: stdev(surplus),
    vol: avgIncome > 0 ? stdev(surplus) / avgIncome : 0,
    roughness: 0, measured: avgIncome > 0,
  };

  // stocks: dispersion of monthly % movement, annualized
  const invChanges = pctChanges(invested);
  const nwChanges = pctChanges(netWorth);
  const invSigmaM = invChanges.length >= 3 ? stdev(invChanges) : null;
  const nwSigmaM = nwChanges.length >= 3 ? stdev(nwChanges) : null;
  const dimInvested: DimensionVol = {
    key: 'invested', mean: invested[invested.length - 1], sigma: invSigmaM ?? 0,
    vol: invSigmaM !== null ? invSigmaM * Math.sqrt(12) : 0,
    roughness: 0, measured: invSigmaM !== null,
  };
  const dimNetWorth: DimensionVol = {
    key: 'networth', mean: netWorth[netWorth.length - 1], sigma: nwSigmaM ?? 0,
    vol: nwSigmaM ?? 0, // monthly σ — net worth is judged month to month
    roughness: 0, measured: nwSigmaM !== null,
  };

  const dims = [dimIncome, dimSpending, dimSurplus, dimInvested, dimNetWorth];
  for (const d of dims) d.roughness = Math.min(1, d.vol / CEILING[d.key]);

  const calmScore = Math.round(100 * (1 - dims.reduce((a, d) => a + WEIGHT[d.key] * d.roughness, 0)));
  const band: VolReport['band'] = calmScore >= 80 ? 'mirror' : calmScore >= 60 ? 'sailing' : calmScore >= 40 ? 'choppy' : 'storm';

  const noisiest = dims.reduce((a, b) => (b.roughness > a.roughness ? b : a));

  // the seismograph: surplus deviation from its mean, as % of income
  const surplusMean = mean(surplus);
  const seismo: SeriesPoint[] = snaps.map((s, i) => ({
    label: mLabel(s),
    value: avgIncome > 0 ? Math.round(((surplus[i] - surplusMean) / avgIncome) * 1000) / 10 : 0,
  }));

  // rolling 3-month σ of the surplus, % of income
  const rolling: SeriesPoint[] = [];
  for (let i = 2; i < surplus.length; i++) {
    const win = surplus.slice(i - 2, i + 1);
    rolling.push({
      label: mLabel(snaps[i]),
      value: avgIncome > 0 ? Math.round((stdev(win) / avgIncome) * 1000) / 10 : 0,
    });
  }
  const calming = rolling.length >= 2 ? rolling[rolling.length - 1].value < rolling[0].value : null;

  return {
    months: snaps.length,
    calmScore, band, dims, noisiest, seismo, rolling, calming,
    maxDrawdownInvested: maxDrawdown(invested),
    maxDrawdownNetWorth: maxDrawdown(netWorth),
    stormBuffer: 2 * dimSurplus.sigma,
    dragAnnual: invSigmaM !== null ? ((invSigmaM * invSigmaM) / 2) * 12 : null,
    avgIncome, avgExpenses,
    cash: snaps[snaps.length - 1].cash,
    invested: invested[invested.length - 1],
  };
}

export const BAND_META: Record<VolReport['band'], { icon: string; ar: string; en: string; arLine: string; enLine: string }> = {
  mirror: {
    icon: '🪞', ar: 'بحر مرآة', en: 'Mirror sea',
    arLine: 'شهورك تتشابه — مالك يمكن التنبؤ به، وخططك تُبنى على أرض صلبة.',
    enLine: 'Your months look alike — your money is predictable, and plans stand on solid ground.',
  },
  sailing: {
    icon: '⛵', ar: 'بحر إبحار', en: 'Sailing sea',
    arLine: 'موجٌ خفيف لا يعطّل الإبحار — تقلّب صحي ضمن الحدود.',
    enLine: 'Light waves that never stop the sailing — healthy fluctuation, within bounds.',
  },
  choppy: {
    icon: '🌊', ar: 'بحر متقلّب', en: 'Choppy sea',
    arLine: 'الموج يصل إلى السطح — التخطيط يصعب، والدرع يحتاج سماكة أكبر.',
    enLine: 'The waves reach your deck — planning gets harder, and the shield needs more thickness.',
  },
  storm: {
    icon: '⛈', ar: 'بحر عاصف', en: 'Storm sea',
    arLine: 'شهورك لا تشبه بعضها — قبل أي خطة طويلة، يحتاج هذا البحر تهدئة.',
    enLine: 'No month resembles the last — before any long plan, this sea needs calming.',
  },
};

export const DIM_META: Record<DimensionVol['key'], { icon: string; ar: string; en: string }> = {
  income: { icon: '💰', ar: 'الدخل', en: 'Income' },
  spending: { icon: '🔥', ar: 'المصروف', en: 'Spending' },
  surplus: { icon: '💧', ar: 'الفائض الشهري', en: 'Monthly surplus' },
  invested: { icon: '📈', ar: 'الاستثمارات', en: 'Investments' },
  networth: { icon: '🧊', ar: 'صافي الثروة', en: 'Net worth' },
};
