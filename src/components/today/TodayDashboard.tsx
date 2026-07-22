'use client';

// The Today dashboard — what a person needs to see about their present,
// daily, in one glance:
//   1. Where they stand (the A→B→C→D quadrant map, auto-diagnosed)
//   2. Money in vs money out (6-month bars + P&L delta)
//   3. Income sources · Debt load · Risk radar
//   4. Next big plan · Wealth pace
//   5. The road to financial freedom (seed of the upcoming tool)
// Everything is computed from real data; charts over static numbers.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ReferenceArea, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  AreaChart, Area, PieChart, Pie, ComposedChart, Line,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { computeRisks, type RiskInputs, type RiskResult } from '@/lib/risks';
import { computeFreedom } from '@/lib/financialFreedom';
import { BANDS, SCORE_MIN, SCORE_MAX, bandFor, bandLabel } from '@/lib/creditScore';
import {
  tierFromIncome, tierIndex, tierLabel, tierShortLabel, getLifestyle, buildYearSeries,
  TIERS, TIER_COLOR, type Tier, type Phase,
} from '@/lib/standardOfLiving';
import { loadHoldings, valueHoldings } from '@/lib/livePortfolio';
import { BENCHMARK_START_AGE, buildBenchmarkCurves, buildYouSeries } from '@/lib/positioningBenchmarks';
import { buildProjection } from '@/lib/lifetimeProjection';
import ExplainButton, { type ExplainContent } from '@/components/shared/ExplainButton';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface Snap {
  year: number; month: number;
  cash: number; stocks: number; real_estate: number; equity: number; other_assets: number;
  liabilities: number; income: number; expenses: number;
}
interface Goal {
  id: string; name: string; target_amount: number; monthly_contribution: number;
  start_date: string; maturity_years: number;
}

interface DebtItem {
  name: string;
  original: number | null; // null when the starting amount is unknown
  balance: number;
  leverage: boolean; // true = wealth-building (mortgage, business); false = consumption
}

// Leverage debt buys assets that can appreciate or produce income (a home, a
// business, education). Everything else — cars, cards, personal/BNPL — is
// consumption debt that only costs you.
function isLeverageDebt(name: string, tag: string | null): boolean {
  const s = `${name} ${tag ?? ''}`.toLowerCase();
  return /mortgage|home\s?loan|house|real\s?estate|property|land|apartment|villa|business|invest|company|project|educat|student|tuition|study|degree/.test(s);
}

// A life phase as stored — end_year may be null while the user is drafting it.
interface SolPhaseRow {
  id: string;
  phase_name: string;
  start_year: number;
  end_year: number | null;
  target_tier: Tier;
  theme: string[] | null;
  todo: string[] | null;
  net_worth_goal: string | null;
}

// Net-worth milestones the wealth-pace ladder counts toward.
const MILESTONE_STOPS = [10_000, 50_000, 100_000, 250_000, 500_000, 750_000, 1_000_000];

interface Data {
  profile: {
    monthly_income: number; side_income: number; monthly_expense: number;
    liquid_savings: number | null; monthly_debt_payments: number | null;
    has_health_insurance: boolean | null;
    age: number | null; employment: string | null;
    career_start_year: number | null; career_start_income: number | null; lifetime_save_rate: number | null;
  } | null;
  snaps: Snap[];
  goals: Goal[];
  actualsByGoal: Record<string, number>;
  liveInvested: number | null;
  debtItems: DebtItem[];
  nwSnaps: { year: number; value: number }[];
}

function fmt(n: number) {
  return Math.round(n).toLocaleString();
}
function fmtCompact(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${(n / 1e6).toFixed(abs >= 1e7 ? 0 : 1)}M`;
  if (abs >= 1e3) return `${Math.round(n / 1e3)}K`;
  return String(Math.round(n));
}
function assetsOf(s: Snap) {
  return Number(s.cash) + Number(s.stocks) + Number(s.real_estate) + Number(s.equity) + Number(s.other_assets);
}
function netWorthOf(s: Snap) {
  return assetsOf(s) - Number(s.liabilities);
}
function avg(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

// ── The four stages, in their usual order of progression ────────────────
const QUADS = {
  A: { title: 'Build mode', mood: 'Little income or assets yet', move: 'Generate income & first assets', incomeH: 0, outflowH: 24 },
  B: { title: 'Falling behind', mood: 'Outflow exceeds income', move: 'Flip the balance', incomeH: 19, outflowH: 28 },
  C: { title: 'Break-even', mood: 'Covers costs, nothing left', move: 'Create surplus & protect it', incomeH: 25, outflowH: 24 },
  D: { title: 'Abundance', mood: 'Durable surplus to deploy', move: 'Multiply the surplus', incomeH: 28, outflowH: 18 },
} as const;
type QuadKey = keyof typeof QUADS;

const AXIS_LABEL: Record<string, string> = {
  income: 'Income', runway: 'Runway', health: 'Health', concentration: 'Mix', debt: 'Debt',
};

const RISK_COLOR: Record<string, string> = {
  high: 'var(--red)', medium: 'var(--gold-2)', low: 'var(--green)', unknown: 'var(--muted)',
};

// Asset classes for the composition-over-time chart (same palette as the
// Financial Numbers charts).
const ASSET_SERIES = [
  { key: 'cash', labelKey: 'today.assets.cash', color: '#2a78d6' },
  { key: 'stocks', labelKey: 'today.assets.stocks', color: '#17B8C9' },
  { key: 'real_estate', labelKey: 'today.assets.realEstate', color: '#E0559E' },
  { key: 'equity', labelKey: 'today.assets.equity', color: '#E0922A' },
  { key: 'other_assets', labelKey: 'today.assets.other', color: '#9AA0A6' },
] as const;

function diagnose(avgIncome: number, avgExpenses: number, totalAssets: number): QuadKey | null {
  if (avgIncome <= 0 && avgExpenses <= 0) return null;
  if (avgIncome <= 0) return 'A';
  const surplus = avgIncome - avgExpenses;
  if (surplus < 0) return totalAssets < 3 * avgExpenses ? 'A' : 'B';
  if (surplus / avgIncome < 0.1) return 'C';
  return 'D';
}

export default function TodayDashboard() {
  const supabase = createClient();
  const { t, locale } = useLocale();
  const [data, setData] = useState<Data | null>(null);
  const [credit, setCredit] = useState<{ score: number | null; prev: number | null } | null>(null);
  const [sol, setSol] = useState<{ phases: SolPhaseRow[]; actualsByYear: Record<number, Tier> } | null>(null);
  const [selRisk, setSelRisk] = useState<string | null>(null);
  const [cashView, setCashView] = useState<'six' | 'ytd'>('six');
  const [srcInfo, setSrcInfo] = useState(false);
  const [assetView, setAssetView] = useState<'pct' | 'abs'>('abs');

  const sar = t('common.sar');
  const money = (n: number) => (locale === 'ar' ? `${fmt(n)} ${sar}` : `${sar} ${fmt(n)}`);
  const moneyC = (n: number) => (locale === 'ar' ? `${fmtCompact(n)} ${sar}` : `${sar} ${fmtCompact(n)}`);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileRes, snapsRes, goalsRes, actualsRes, loansRes, liabsRes, nwRes] = await Promise.all([
        supabase.from('profiles')
          .select('monthly_income, side_income, monthly_expense, liquid_savings, monthly_debt_payments, has_health_insurance, age, employment, career_start_year, career_start_income, lifetime_save_rate')
          .eq('id', user.id).single(),
        supabase.from('financial_snapshots')
          .select('year, month, cash, stocks, real_estate, equity, other_assets, liabilities, income, expenses')
          .eq('user_id', user.id).order('year', { ascending: true }).order('month', { ascending: true }),
        supabase.from('goal_funds')
          .select('id, name, target_amount, monthly_contribution, start_date, maturity_years')
          .eq('user_id', user.id),
        supabase.from('goal_fund_actuals').select('goal_fund_id, actual_amount').eq('user_id', user.id),
        supabase.from('loans').select('name, original_amount, balance, category').eq('user_id', user.id),
        supabase.from('liabilities').select('name, original_amount, balance, kind').eq('user_id', user.id),
        supabase.from('net_worth_snapshots').select('year, amount').eq('user_id', user.id),
      ]);

      const actualsByGoal: Record<string, number> = {};
      for (const a of (actualsRes.data ?? []) as { goal_fund_id: string; actual_amount: number }[]) {
        actualsByGoal[a.goal_fund_id] = (actualsByGoal[a.goal_fund_id] ?? 0) + Number(a.actual_amount);
      }

      // Live-priced investments, when the user has tickered holdings.
      let liveInvested: number | null = null;
      try {
        const holdings = await loadHoldings(user.id);
        if (holdings.length > 0) {
          const pv = await valueHoldings(holdings);
          if (pv.total > 0) liveInvested = pv.total;
        }
      } catch { /* fine without */ }

      // Every named debt: bank loans (with a category) + general liabilities
      // (with a kind), one list, classified leverage vs consumption.
      const debtItems: DebtItem[] = [
        ...(((loansRes.data ?? []) as { name: string; original_amount: number | null; balance: number; category: string | null }[]).map((r) => ({ ...r, tag: r.category }))),
        ...(((liabsRes.data ?? []) as { name: string; original_amount: number | null; balance: number; kind: string | null }[]).map((r) => ({ ...r, tag: r.kind }))),
      ]
        .map((r) => ({
          name: r.name,
          original: r.original_amount != null && Number(r.original_amount) > 0 ? Number(r.original_amount) : null,
          balance: Number(r.balance) || 0,
          leverage: isLeverageDebt(r.name, r.tag ?? null),
        }))
        .filter((r) => r.balance > 0 || (r.original ?? 0) > 0)
        .sort((a, b) => b.balance - a.balance);

      setData({
        profile: (profileRes.data as Data['profile']) ?? null,
        snaps: (snapsRes.data as Snap[]) ?? [],
        goals: (goalsRes.data as Goal[]) ?? [],
        actualsByGoal,
        liveInvested,
        debtItems,
        nwSnaps: (((nwRes.data ?? []) as { year: number; amount: number }[])).map((r) => ({
          year: r.year,
          value: Number(r.amount),
        })),
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Latest SIMAH score, loaded on its own so a missing migration just hides
  // the tile instead of breaking the whole dashboard.
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: rows, error } = await supabase
        .from('credit_snapshots')
        .select('report_date, molim_score')
        .eq('user_id', user.id)
        .order('report_date', { ascending: true });
      if (error || !rows) return; // table absent → no tile
      const scored = rows.filter((r) => r.molim_score != null) as { molim_score: number }[];
      if (scored.length === 0) return; // nothing worth showing yet
      setCredit({
        score: scored[scored.length - 1].molim_score,
        prev: scored.length >= 2 ? scored[scored.length - 2].molim_score : null,
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Life phases for the standard-of-living staircase, loaded on their own.
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: ph }, { data: ac }] = await Promise.all([
        supabase.from('life_phases')
          .select('id, phase_name, start_year, end_year, target_tier, theme, todo, net_worth_goal')
          .eq('user_id', user.id).order('start_year', { ascending: true }),
        supabase.from('living_standard_actuals').select('year, actual_tier').eq('user_id', user.id),
      ]);
      const actualsByYear: Record<number, Tier> = {};
      ((ac ?? []) as { year: number; actual_tier: Tier | null }[]).forEach((r) => {
        if (r.actual_tier) actualsByYear[r.year] = r.actual_tier;
      });
      setSol({ phases: (ph ?? []) as SolPhaseRow[], actualsByYear });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const d = data;

  const derived = useMemo(() => {
    if (!d) return null;
    const { snaps, profile } = d;
    const last6 = snaps.slice(-6);
    const latest = snaps[snaps.length - 1] ?? null;

    const avgIncome = last6.length ? avg(last6.map((s) => Number(s.income))) : Number(profile?.monthly_income) || 0;
    const avgExpenses = last6.length ? avg(last6.map((s) => Number(s.expenses))) : Number(profile?.monthly_expense) || 0;
    const totalAssets = latest ? assetsOf(latest) : 0;
    const liabilities = latest ? Number(latest.liabilities) : 0;
    const netWorth = latest ? netWorthOf(latest) : 0;

    const cashFlow = last6.map((s) => ({
      label: `${MONTHS[s.month - 1]} ${String(s.year).slice(2)}`,
      income: Number(s.income),
      expenses: Number(s.expenses),
      net: Number(s.income) - Number(s.expenses),
      forecast: false,
    }));

    // Year-to-date + a forecast through December, using the recent average
    // pace for months that haven't happened yet — "money that's supposed to
    // hit your bank account."
    const now = new Date();
    const curYear = now.getFullYear();
    const yearActual = snaps
      .filter((s) => s.year === curYear)
      .map((s) => ({
        label: `${MONTHS[s.month - 1]} ${String(s.year).slice(2)}`,
        income: Number(s.income),
        expenses: Number(s.expenses),
        net: Number(s.income) - Number(s.expenses),
        forecast: false,
        _month: s.month,
      }));
    const lastLoggedMonth = yearActual.length ? yearActual[yearActual.length - 1]._month : 0;
    const yearForecast: typeof yearActual = [];
    const projIncome = last6.length ? avg(last6.map((s) => Number(s.income))) : 0;
    const projExpenses = last6.length ? avg(last6.map((s) => Number(s.expenses))) : 0;
    for (let m = lastLoggedMonth + 1; m <= 12; m++) {
      yearForecast.push({
        label: `${MONTHS[m - 1]} ${String(curYear).slice(2)}`,
        income: projIncome,
        expenses: projExpenses,
        net: projIncome - projExpenses,
        forecast: true,
        _month: m,
      });
    }
    const yearCashFlow = [...yearActual, ...yearForecast].map(({ _month, ...rest }) => rest);

    // wealth pace: avg month-over-month net-worth change (≤ last 12)
    const tail = snaps.slice(-13);
    const nwDeltas: number[] = [];
    for (let i = 1; i < tail.length; i++) nwDeltas.push(netWorthOf(tail[i]) - netWorthOf(tail[i - 1]));
    const nwPace = nwDeltas.length ? avg(nwDeltas) : 0;
    const nwSeries = snaps.map((s) => ({ v: netWorthOf(s) }));
    const milestone = netWorth < 1e6 ? 1e6 : Math.ceil((netWorth + 1) / 250000) * 250000;
    const monthsToMilestone = nwPace > 0 ? (milestone - netWorth) / nwPace : null;

    // investing pace: avg monthly change of stocks+equity
    const invDeltas: number[] = [];
    for (let i = 1; i < tail.length; i++) {
      invDeltas.push(
        Number(tail[i].stocks) + Number(tail[i].equity) - Number(tail[i - 1].stocks) - Number(tail[i - 1].equity)
      );
    }
    const investPace = invDeltas.length ? Math.max(0, avg(invDeltas)) : Math.max(0, avgIncome - avgExpenses);
    const investedSnapshot = latest ? Number(latest.stocks) + Number(latest.equity) : 0;
    const invested = d.liveInvested ?? investedSnapshot;

    const freedom = computeFreedom({
      avgMonthlyExpenses: avgExpenses,
      investedNow: invested,
      monthlyInvestPace: investPace,
    });

    const riskInputs: RiskInputs = {
      monthlyIncome: Number(profile?.monthly_income) || (avgIncome || null),
      sideIncome: Number(profile?.side_income) || 0,
      liquidSavings: profile?.liquid_savings != null ? Number(profile.liquid_savings) : latest ? Number(latest.cash) : null,
      monthlyDebtPayments: profile?.monthly_debt_payments != null ? Number(profile.monthly_debt_payments) : null,
      hasHealthInsurance: profile?.has_health_insurance ?? null,
      avgMonthlyExpenses: avgExpenses || null,
      assetMix: latest
        ? [
            { label: 'Cash', value: Number(latest.cash) },
            { label: 'Stocks', value: Number(latest.stocks) },
            { label: 'Real estate', value: Number(latest.real_estate) },
            { label: 'Equity', value: Number(latest.equity) },
            { label: 'Other', value: Number(latest.other_assets) },
          ].filter((a) => a.value > 0)
        : [],
    };
    const risks = computeRisks(riskInputs);

    const salary = Number(profile?.monthly_income) || 0;
    const side = Number(profile?.side_income) || 0;

    const goal = [...d.goals].sort((a, b) => Number(b.target_amount) - Number(a.target_amount))[0] ?? null;

    // Net worth vs. benchmark curves by age, with today marked and your own
    // line projected forward at your current pace ("if things stay as is").
    const age = profile?.age ?? null;
    let compare: { age: number; you: number | null; youProjected: number | null; national: number; higher: number }[] = [];
    if (age && age >= BENCHMARK_START_AGE) {
      const currentYear = new Date().getFullYear();
      const pastSpan = age - BENCHMARK_START_AGE;
      const maxAge = age + Math.max(pastSpan, 10); // extend forward so today sits near centre
      const you = buildYouSeries(d.nwSnaps, age, currentYear, BENCHMARK_START_AGE, age);
      const bench = buildBenchmarkCurves(BENCHMARK_START_AGE, maxAge);
      const annualPace = nwPace * 12;
      compare = Array.from({ length: maxAge - BENCHMARK_START_AGE + 1 }, (_, i) => {
        const a = BENCHMARK_START_AGE + i;
        return {
          age: a,
          you: a <= age ? (you[i] ?? null) : null,
          youProjected: a >= age ? Math.max(0, netWorth + annualPace * (a - age)) : null,
          national: bench.networthNational[i],
          higher: bench.networthHigher[i],
        };
      });
    }

    // Lifetime income vs. savings: the same career-earnings projection used
    // in Lifetime Income → Understand, aggregated to one point per year.
    const lifeStartYear = profile?.career_start_year ?? new Date().getFullYear() - 5;
    const lifeStartIncome = Number(profile?.career_start_income) || 0;
    const lifeSaveRate = (profile?.lifetime_save_rate != null ? Number(profile.lifetime_save_rate) : 20) / 100;
    const lifeCurrentIncome = Number(profile?.monthly_income) || avgIncome || 0;
    const lifeSeries = buildProjection({
      startYear: lifeStartYear,
      startIncome: lifeStartIncome,
      currentIncome: lifeCurrentIncome,
      saveRate: lifeSaveRate,
    });
    const yearlyMap = new Map<number, { earned: number; kept: number }>();
    for (const p of lifeSeries) yearlyMap.set(p.year, { earned: p.cumulativeIncome, kept: p.cumulativeSaved });
    const lifeYearly = Array.from(yearlyMap.entries()).map(([year, v]) => ({
      year: String(year), earned: v.earned, kept: v.kept,
    }));
    const lifeLast = lifeSeries[lifeSeries.length - 1];
    const lifeEarned = lifeLast?.cumulativeIncome ?? 0;
    const lifeKept = lifeLast?.cumulativeSaved ?? 0;
    const lifeKeptPct = lifeEarned > 0 ? (lifeKept / lifeEarned) * 100 : 0;

    // Asset composition over time — every logged month's asset breakdown.
    const assetComposition = snaps.map((s) => ({
      label: `${MONTHS[s.month - 1]} ${String(s.year).slice(2)}`,
      cash: Number(s.cash),
      stocks: Number(s.stocks),
      real_estate: Number(s.real_estate),
      equity: Number(s.equity),
      other_assets: Number(s.other_assets),
    }));

    // Balances scorecards + liquidity ratio.
    const cash = latest ? Number(latest.cash) : 0;
    const liquidityPct = totalAssets > 0 ? (cash / totalAssets) * 100 : 0;
    const monthsOfCash = avgExpenses > 0 ? cash / avgExpenses : null;
    const assetTiles = latest
      ? ASSET_SERIES.map((s) => ({ key: s.key, labelKey: s.labelKey, color: s.color, value: Number(latest[s.key]) }))
          .filter((tt) => tt.value > 0)
      : [];

    // Wealth-pace ladder: time from today's net worth to each milestone.
    const paceLadder = MILESTONE_STOPS.map((target) => ({
      target,
      reached: netWorth >= target,
      months: netWorth < target && nwPace > 0 ? (target - netWorth) / nwPace : null,
    }));

    return {
      age,
      employment: profile?.employment ?? null,
      compare,
      hasCompareData: compare.some((p) => p.you != null),
      cash, liquidityPct, monthsOfCash, assetTiles, paceLadder,
      latest, avgIncome, avgExpenses, totalAssets, liabilities, netWorth, cashFlow, yearCashFlow,
      quad: diagnose(avgIncome, avgExpenses, totalAssets),
      nwPace, nwSeries, milestone, monthsToMilestone,
      invested, liveIsUsed: d.liveInvested != null, freedom,
      risks, salary, side, goal,
      goalSaved: goal ? d.actualsByGoal[goal.id] ?? 0 : 0,
      debtItems: d.debtItems,
      lifeYearly, lifeEarned, lifeKept, lifeKeptPct,
      assetComposition,
    };
  }, [d]);

  if (!d || !derived) {
    return <div className="text-sm text-[var(--muted)] mb-6">{t('common.loading')}</div>;
  }

  if (!derived.latest && derived.avgIncome <= 0) {
    return (
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 mb-6 text-sm text-[var(--muted)]">
        {t('hub.sum.needData')}{' '}
        <Link href="/financial-numbers" className="text-[var(--green-dark)] font-medium underline">→</Link>
      </div>
    );
  }

  const {
    avgIncome, avgExpenses, totalAssets, liabilities, netWorth, cashFlow, yearCashFlow, quad,
    nwPace, nwSeries, invested, liveIsUsed, freedom,
    risks, salary, side, goal, goalSaved, debtItems,
    age, employment, compare, hasCompareData,
    lifeYearly, lifeEarned, lifeKept, lifeKeptPct, assetComposition,
    cash, liquidityPct, monthsOfCash, assetTiles, paceLadder,
  } = derived;
  const cfData = cashView === 'six' ? cashFlow : yearCashFlow;
  const hasForecast = cfData.some((e) => e.forecast);
  // Anchor the "current"/"last" bands to the real calendar month when it's on
  // the chart (the Through-December view); otherwise to the latest data.
  const nowD = new Date();
  const nowLabel = `${MONTHS[nowD.getMonth()]} ${String(nowD.getFullYear()).slice(2)}`;
  const curIdx = (() => {
    const i = cfData.findIndex((e) => e.label === nowLabel);
    return i === -1 ? cfData.length - 1 : i;
  })();
  const lastIdx = curIdx - 1;

  // Income streams, split by nature. Passive income = the yield your invested
  // capital already generates (4% safe rate) — money that arrives without your
  // time. That's what the active-vs-passive donut contrasts against.
  const passiveIncome = invested > 0 ? (invested * 0.04) / 12 : 0;
  const activeIncome = salary + side;
  const incomeTotal = activeIncome + passiveIncome;
  const passivePct = incomeTotal > 0 ? (passiveIncome / incomeTotal) * 100 : 0;
  const sourceStreams = [
    { name: 'Employer salary', amt: salary, kind: 'active' as const, emp: true, perMo: false },
    ...(side > 0 ? [{ name: 'Side income', amt: side, kind: 'active' as const, emp: false, perMo: false }] : []),
    ...(passiveIncome > 0
      ? [{ name: t('today.sources.investYield'), amt: passiveIncome, kind: 'passive' as const, emp: false, perMo: true }]
      : []),
  ].filter((s) => s.amt > 0);
  const biggestStream = [...sourceStreams].sort((a, b) => b.amt - a.amt)[0];

  // Forecast band: total income expected from the first upcoming month
  // through December, shown as a labelled band under the projected bars.
  const forecastEntries = cashView === 'ytd' ? yearCashFlow.filter((e) => e.forecast) : [];
  const forecastTotal = forecastEntries.reduce((s, e) => s + e.income, 0);
  const firstForecastLabel = forecastEntries[0]?.label ?? null;
  const negDepth = Math.max(0, ...cfData.filter((e) => !e.forecast).map((e) => e.expenses));

  // Asset-composition series that carry value, ordered biggest-first so the
  // largest class sits at the bottom of the stack; "Other" is pinned last.
  const assetLatest = assetComposition[assetComposition.length - 1];
  const assetSeries = ASSET_SERIES
    .filter((s) => assetComposition.some((r) => Number(r[s.key]) > 0))
    .slice()
    .sort((a, b) => {
      if (a.key === 'other_assets') return 1;
      if (b.key === 'other_assets') return -1;
      return Number(assetLatest?.[b.key] ?? 0) - Number(assetLatest?.[a.key] ?? 0);
    });

  const delta = avgIncome - avgExpenses;
  const highRisks = risks.filter((r) => r.level === 'high');
  const medRisks = risks.filter((r) => r.level === 'medium');
  const radarData = risks.map((r) => ({
    axis: AXIS_LABEL[r.id] ?? r.id,
    score: r.score,
  }));
  const selectedRisk = risks.find((r) => r.id === selRisk) ?? null;
  const debtVsIncome = avgIncome > 0 ? (liabilities / (avgIncome * 12)) * 100 : null;
  const debtVsAssets = totalAssets > 0 ? (liabilities / totalAssets) * 100 : null;

  // Liquidity verdict (cash as a share of assets; healthy ≈ 10–20%).
  const liqLow = liquidityPct < 8;
  const liqHigh = liquidityPct > 30;
  const liqColor = liqLow || liqHigh ? 'var(--amber)' : 'var(--green)';
  const liqVerdict = liqLow ? t('today.liquidity.thin') : liqHigh ? t('today.liquidity.idle') : t('today.liquidity.healthy');

  // Debt split: leverage (wealth-building) vs consumption.
  const leverageTotal = debtItems.filter((x) => x.leverage).reduce((s, x) => s + x.balance, 0);
  const consumptionTotal = debtItems.filter((x) => !x.leverage).reduce((s, x) => s + x.balance, 0);

  // Format a month count as "X yr Y mo".
  const dur = (months: number) => {
    const total = Math.max(0, Math.round(months));
    const y = Math.floor(total / 12);
    const mo = total % 12;
    const parts: string[] = [];
    if (y > 0) parts.push(`${y} ${t('today.pace.yr')}`);
    if (mo > 0 || y === 0) parts.push(`${mo} ${t('today.pace.mo')}`);
    return parts.join(' ');
  };

  // The Brain's card-by-card explanations (the "?" on each card).
  const EX: Record<string, ExplainContent> = {
    balances: {
      title: t('today.balances.title'),
      what: 'What you own right now, split by asset class — cash, stocks, real estate, equity and other — with your net worth, and how liquid you are.',
      how: 'The asset columns of your most recent logged month in My Financial Numbers. Liquidity = cash ÷ total assets; the healthy band is roughly 10–20%.',
      action: 'Keep enough cash to cover 3–6 months of spending, but not so much that it sits idle losing value to inflation — invest the excess.',
      ask: 'Review my balances, asset mix and liquidity — is my cash level right, or should some be invested?',
    },
    quad: {
      title: t('today.quad.title'),
      what: 'Which of the four financial stages you are in right now — A build mode, B falling behind, C break-even, D abundance. People usually progress A → B → C → D as income grows and behavior matures into surplus.',
      how: 'Your average monthly income vs spending over the last 6 logged months, plus your asset cushion. A deficit with under 3 months of assets reads as A; a deficit with a cushion as B; a surplus under 10% of income as C; above that, D.',
      action: 'Each stage has one move that matters — it is written under the map. Open Financial Positioning for the full playbook of levers at your stage.',
      ask: 'Which financial stage am I in (A build mode, B falling behind, C break-even, D abundance), and what is the single most important move for me right now?',
    },
    cash: {
      title: t('today.cash.title'),
      what: 'Your last six months of money entering (green, up) and leaving (amber, down), with the blue Net bar showing what each month actually left behind. The highlighted bands mark the current and previous month.',
      how: 'Straight from your monthly ledger in My Financial Numbers: income, expenses, and net = income − expenses.',
      action: 'A widening green-over-amber gap is the engine of everything else. If Net dips negative in some months, find the leak in My Financial Numbers.',
      ask: 'Analyze my income vs expenses over the last 6 months. Where is my surplus going and how can I widen it?',
    },
    sources: {
      title: t('today.sources.title'),
      what: 'How many streams feed your income, who the biggest contributor is, and whether each stream is active (you work for it) or passive (it works for you).',
      how: 'From your profile: employer salary and side income. Passive streams — rent, dividends, business income — are the ones that carry you toward financial freedom.',
      action: 'One active source is a single point of failure. Build a second stream, then start converting active income into assets that pay you.',
      ask: 'How concentrated is my income, and what realistic passive income sources could I build in Saudi Arabia?',
    },
    risks: {
      title: t('today.risks.title'),
      what: 'Five life-risks scored 0 (safe) to 100 (exposed): income concentration, emergency runway, health cover, asset mix, and debt burden. The bigger the shaded shape, the more exposed you are. Tap any chip below for the finding.',
      how: 'Computed from your real numbers — income sources, liquid savings vs spending, insurance answer, asset mix, and debt payments. Nothing is fabricated; missing data reads as unknown.',
      action: 'Fix the reddest axis first — usually runway or insurance. The Risks page maps each one to concrete mitigations.',
      ask: 'Walk me through my top financial risks right now and the most effective mitigations, in order.',
    },
    sol: {
      title: t('today.sol.title'),
      what: 'The standard of living your income currently supports, in real Saudi terms — what housing, transport, travel, schooling and daily life actually look like at this level.',
      how: 'Your tier is placed from your average monthly income against illustrative Saudi-context bands. The items describe a typical lifestyle at that tier, not your exact spending.',
      action: 'Design the phases of the life you want on the Standard of Living page — and see what it takes to climb to the next tier.',
      ask: 'What standard of living does my income support, and what would it take to reach the next level?',
    },
    credit: {
      title: t('today.credit.title'),
      what: 'Your SIMAH MOLIM score (300–900) and how far it has moved since the previous report you recorded.',
      how: 'The official number you entered on the Credit Standing page; the band and pointer place it on the 300–900 scale.',
      action: 'Two levers move it most: every payment on time, and keeping card utilisation under 30%.',
      ask: 'How can I improve my SIMAH credit score fastest given my current debts?',
    },
    debt: {
      title: t('today.debt.title'),
      what: 'Every loan and liability you carry: how much of each is already paid off (blue) versus still owed (green), plus your total debt as a share of annual income and of assets.',
      how: 'Paid = original amount − current balance, from your Bills & Commitments records. The gauges divide total owed by your annual income and total assets.',
      action: 'Under 30% of annual income is comfortable; past 60% it commands your life. Consider the snowball: clear the smallest balance first for momentum.',
      ask: 'Assess my debt load and design a payoff strategy for my loans.',
    },
    assets: {
      title: t('today.assets.title'),
      what: 'How your wealth is split across cash, stocks, real estate, equity and other — every logged month. Toggle between the SAR amount and each class’s share of the whole.',
      how: 'Straight from the asset columns of your monthly ledger in My Financial Numbers, stacked over time.',
      action: 'Watch for over-concentration in one class, and whether your mix is drifting the way you intend as you add months.',
      ask: 'Analyze how my asset allocation has shifted over time and whether my current mix fits my goals.',
    },
    compare: {
      title: t('today.compare.title'),
      what: 'Your net worth trajectory by age, against an illustrative national-average curve and a higher-earning peer curve.',
      how: 'Your yearly net-worth snapshots plotted at each age, over benchmark curves modeled for Saudi earners. The gap is a measure of distance — not a verdict.',
      action: 'Log a net worth snapshot each year, and use Financial Positioning to see which levers close the gap fastest.',
      ask: 'How does my net worth compare to peers my age, and what would close the gap fastest?',
    },
    plan: {
      title: t('today.plan.title'),
      what: 'Your biggest named goal — the thing you are saving toward — with its progress and monthly pace.',
      action: 'A goal with a name and a monthly number gets funded; a vague intention does not. Keep exactly one big plan in focus.',
      ask: 'Review my next big plan — is its pace realistic, and should it be my top priority?',
    },
    pace: {
      title: t('today.pace.title'),
      what: 'How fast your net worth is actually growing per month, and how long the next milestone takes at that speed.',
      how: 'The average month-over-month change in your net worth across the last 12 logged months.',
      action: 'Pace is the one number that compounds. Raise it by widening the income–spending gap or by making idle cash work.',
      ask: 'How fast am I building wealth, and what would realistically accelerate my pace the most?',
    },
    lifetime: {
      title: t('today.lifetime.title'),
      what: 'Every riyal you are projected to earn across your career (blue bars) against what actually stays with you as savings (red line) — the same question as Lifetime Income → Understand, distilled to one chart.',
      how: 'A projection from your career-start year and income, your current income, and your savings rate, ramping both up realistically over time. It is a model, not logged history — refine the assumptions in Lifetime Income.',
      action: 'The gap between the bars and the line is spending. Raising your savings rate even a little compounds enormously over a full career.',
      ask: 'Show me how much I have earned and kept over my career, and how to raise my savings rate.',
    },
    freedom: {
      title: t('today.freedom.title'),
      what: 'The capital at which passive returns replace your recurring expenses — making work a choice. The road shows how far along you are.',
      how: 'At a 4% safe withdrawal rate, you need 25× your annual spending invested. Progress = your working capital ÷ that number; the ETA compounds your capital at 6%/year plus your monthly investing pace.',
      action: 'Two levers move the finish line: spend less (each SAR 1,000/month less = SAR 300K less needed) or invest more each month.',
      ask: 'What is my financial freedom number, and the fastest realistic path to reach it?',
    },
  };

  return (
    <div className="space-y-3 mb-6">
      {/* ── Row 0: balances scorecards + liquidity ── */}
      {assetTiles.length > 0 && (
        <Card title={t('today.balances.title')} href="/holdings" explain={EX.balances}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-3">
            {assetTiles.map((tt) => (
              <div key={tt.key}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: tt.color }} />
                  <span className="text-[10px] text-[var(--muted)] truncate">{t(tt.labelKey)}</span>
                </div>
                <div className="font-serif text-base font-bold text-[var(--ink)]">{moneyC(tt.value)}</div>
                <div className="text-[9px] text-[var(--muted)]">
                  {totalAssets > 0 ? Math.round((tt.value / totalAssets) * 100) : 0}% {t('today.balances.ofAssets')}
                </div>
              </div>
            ))}
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--green-dark)' }} />
                <span className="text-[10px] text-[var(--muted)] truncate">{t('today.balances.netWorth')}</span>
              </div>
              <div className="font-serif text-base font-bold text-[var(--green-dark)]">{moneyC(netWorth)}</div>
              <div className="text-[9px] text-[var(--muted)]">−{money(liabilities)}</div>
            </div>
          </div>

          {totalAssets > 0 && (
            <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
              <div className="flex items-baseline justify-between gap-2 mb-1.5 flex-wrap">
                <div className="text-[11px] font-medium text-[var(--ink)]">💧 {t('today.liquidity.title')}</div>
                <div className="text-[10px] text-[var(--muted)]">
                  {t('today.liquidity.cashOfAssets', { pct: Math.round(liquidityPct) })}
                  {monthsOfCash != null ? ` · ${t('today.liquidity.months', { n: monthsOfCash.toFixed(1) })}` : ''}
                </div>
              </div>
              {/* gauge on a 0–50% scale, with the healthy 10–20% zone shaded */}
              <div className="relative h-2.5 rounded-full overflow-hidden bg-[var(--surface-1)]" dir="ltr">
                <div className="absolute inset-y-0" style={{ left: '20%', width: '20%', background: 'var(--green-bg)' }} />
                <div
                  className="absolute inset-y-0 w-1.5 rounded-full"
                  style={{ left: `calc(${Math.min(100, (liquidityPct / 50) * 100)}% - 3px)`, background: liqColor }}
                />
              </div>
              <div className="flex justify-between text-[8px] text-[var(--muted)] mt-0.5">
                <span>0%</span><span className="text-[var(--green-dark)]">{t('today.liquidity.band')}</span><span>50%+</span>
              </div>
              <p className="text-[11px] text-[var(--ink-2)] leading-relaxed mt-1.5">{liqVerdict}</p>
            </div>
          )}
        </Card>
      )}

      {/* ── Row 1: position + cash flow ── */}
      <div className="grid lg:grid-cols-2 gap-3">
        <Card title={t('today.quad.title')} href="/positioning" explain={EX.quad}>
          <QuadrantMap active={quad} hereLabel={t('today.quad.here')} />
          <div className="flex items-center gap-4 mt-1.5 text-[10px] text-[var(--muted)]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--green)' }} />
              {t('today.quad.moneyIn')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--red-2)' }} />
              {t('today.quad.moneyOut')}
            </span>
          </div>
          {quad && (
            <p className="text-xs text-[var(--ink-2)] leading-relaxed mt-2">
              <strong className="text-[var(--ink)]">{QUADS[quad].title}.</strong> {QUADS[quad].mood} — the move:{' '}
              <strong className="text-[var(--green-dark)]">{QUADS[quad].move.toLowerCase()}</strong>.
            </p>
          )}
        </Card>

        <Card title={t('today.cash.title')} href="/financial-numbers" explain={EX.cash}>
          <div className="flex items-baseline gap-4 flex-wrap mb-2">
            <div>
              <div className="text-[10px] text-[var(--muted)]">{t('today.cash.avgIncome')}</div>
              <div className="font-serif text-xl font-bold text-[var(--ink)]">{money(avgIncome)}</div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--muted)]">{t('today.cash.avgSpend')}</div>
              <div className="font-serif text-xl font-bold text-[var(--ink-2)]">{money(avgExpenses)}</div>
            </div>
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{
                color: delta >= 0 ? 'var(--green-dark)' : 'var(--red-2)',
                background: delta >= 0 ? 'var(--green-bg)' : 'var(--red-bg)',
              }}
            >
              {delta >= 0 ? '▲' : '▼'} {money(Math.abs(delta))}/mo {delta >= 0 ? t('today.cash.surplus') : t('today.cash.deficit')}
            </span>
          </div>

          <div className="flex bg-[var(--surface-1)] rounded-lg p-0.5 mb-2 w-fit">
            <button
              onClick={() => setCashView('six')}
              className={`text-[10px] px-2.5 py-1 rounded-md transition-colors ${
                cashView === 'six' ? 'bg-[var(--surface-card)] text-[var(--ink)] font-medium shadow-sm' : 'text-[var(--muted)]'
              }`}
            >
              {t('today.cash.viewSix')}
            </button>
            <button
              onClick={() => setCashView('ytd')}
              className={`text-[10px] px-2.5 py-1 rounded-md transition-colors ${
                cashView === 'ytd' ? 'bg-[var(--surface-card)] text-[var(--ink)] font-medium shadow-sm' : 'text-[var(--muted)]'
              }`}
            >
              {t('today.cash.viewYtd')}
            </button>
          </div>

          <div className="h-48" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={cfData.map((e) => ({
                  ...e,
                  // Upcoming months: only expected income is knowable, so
                  // drop the projected expense and net bars.
                  expensesDown: e.forecast ? null : -e.expenses,
                  net: e.forecast ? null : e.net,
                }))}
                barGap={2}
                margin={{ top: 14, right: 4, left: 0, bottom: 0 }}
                stackOffset="sign"
              >
                <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 9, fill: 'var(--muted)' }}
                  tickFormatter={(v) => fmtCompact(Math.abs(Number(v)))}
                  width={34} axisLine={false} tickLine={false}
                />
                <Tooltip formatter={(v, name) => [`SAR ${fmt(Math.abs(Number(v)))}`, name]} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {/* soft bands lock the eye onto the present, without pointing at any bar */}
                {lastIdx >= 0 && (
                  <ReferenceArea
                    x1={cfData[lastIdx].label} x2={cfData[lastIdx].label}
                    fill="var(--muted)" fillOpacity={0.08}
                    label={<BandLabel text={t('today.cash.last')} align="end" color="var(--muted)" />}
                  />
                )}
                {cfData.length >= 1 && (
                  <ReferenceArea
                    x1={cfData[curIdx].label} x2={cfData[curIdx].label}
                    fill="var(--gold-2)" fillOpacity={0.1}
                    label={<BandLabel text={t('today.cash.current')} align="start" color="var(--gold-2)" />}
                  />
                )}
                {/* how much income is on the way through year-end */}
                {cashView === 'ytd' && hasForecast && firstForecastLabel && negDepth > 0 && (
                  <ReferenceArea
                    x1={firstForecastLabel} x2={cfData[cfData.length - 1].label}
                    y1={0} y2={-negDepth}
                    fill="var(--green)" fillOpacity={0.09}
                    stroke="var(--green-border)" strokeOpacity={0.5} strokeDasharray="3 3"
                    label={<ForecastBandLabel text={`${money(forecastTotal)} ${t('today.cash.onTheWay')}`} />}
                  />
                )}
                <ReferenceLine y={0} stroke="var(--border-strong)" />
                {/* fill on each Bar sets its legend swatch colour; the Cells
                    still override the per-bar rendering */}
                <Bar dataKey="income" name="Income" fill="var(--green)" radius={[3, 3, 0, 0]}>
                  {cfData.map((e, i) => (
                    <Cell key={i} fill="var(--green)" fillOpacity={e.forecast ? 0.35 : 1} stroke={e.forecast ? 'var(--green)' : 'none'} strokeDasharray={e.forecast ? '2 2' : undefined} />
                  ))}
                </Bar>
                <Bar dataKey="expensesDown" name="Expenses" fill="var(--amber)" radius={[0, 0, 3, 3]}>
                  {cfData.map((e, i) => (
                    <Cell key={i} fill="var(--amber)" fillOpacity={e.forecast ? 0.35 : 1} stroke={e.forecast ? 'var(--amber)' : 'none'} strokeDasharray={e.forecast ? '2 2' : undefined} />
                  ))}
                </Bar>
                <Bar dataKey="net" name={t('today.cash.net')} fill="var(--blue-2)" radius={[3, 3, 0, 0]}>
                  {cfData.map((e, i) => (
                    <Cell
                      key={i}
                      fill={e.net >= 0 ? 'var(--blue-2)' : 'var(--red)'}
                      fillOpacity={e.forecast ? 0.35 : 1}
                      stroke={e.forecast ? (e.net >= 0 ? 'var(--blue-2)' : 'var(--red)') : 'none'}
                      strokeDasharray={e.forecast ? '2 2' : undefined}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {cashView === 'ytd' && hasForecast && (
            <p className="text-[10px] text-[var(--muted)] mt-1.5">{t('today.cash.forecastNote')}</p>
          )}
        </Card>
      </div>

      {/* ── Standard of living — the life this income affords, next to
             "where you stand" ── */}
      {(() => {
        const tier = tierFromIncome(avgIncome);
        const life = getLifestyle(tier, locale);
        const nextTier = tierIndex(tier) < TIERS.length - 1 ? TIERS[tierIndex(tier) + 1] : null;
        const phasesForSeries: Phase[] = (sol?.phases ?? [])
          .filter((p) => p.end_year != null)
          .map((p) => ({
            id: p.id, phase_name: p.phase_name, start_year: p.start_year, end_year: p.end_year!,
            target_tier: p.target_tier, theme: p.theme ?? [], todo: p.todo ?? [], net_worth_goal: p.net_worth_goal,
          }));
        const hasPhases = phasesForSeries.length > 0;
        const chartData = hasPhases
          ? buildYearSeries(phasesForSeries, sol?.actualsByYear ?? {}).map((s) => ({ year: s.year, target: s.target, actual: s.actual }))
          : [];
        return (
          <Card title={t('today.sol.title')} href="/standard-of-living" explain={EX.sol}>
            <div className="flex items-baseline gap-2.5 flex-wrap mb-3">
              <span className="text-[11px] text-[var(--muted)]">{t('today.sol.youreAt')}</span>
              <span className="font-serif text-base font-semibold" style={{ color: TIER_COLOR[tier] }}>{tierLabel(tier, locale)}</span>
              <span className="text-[11px] text-[var(--muted)]">{t('today.sol.typically')} {life.income}</span>
            </div>

            {hasPhases ? (
              <>
                {/* the life staircase: target vs actual standard of living */}
                <div className="h-44" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                      <XAxis dataKey="year" tick={{ fontSize: 9, fill: 'var(--muted)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                      <YAxis
                        domain={[0, TIERS.length - 1]} ticks={TIERS.map((_, i) => i)}
                        tick={{ fontSize: 9, fill: 'var(--ink-2)' }}
                        tickFormatter={(v) => tierShortLabel(TIERS[v], locale)}
                        width={locale === 'ar' ? 60 : 64} axisLine={false} tickLine={false}
                      />
                      <Tooltip
                        formatter={(value, name) => [value == null ? '—' : tierLabel(TIERS[Math.round(Number(value))], locale), name]}
                        labelFormatter={(v) => String(v)}
                      />
                      <Line type="stepAfter" dataKey="target" name={t('today.sol.target')} stroke="var(--ink)" strokeWidth={2.5} dot={false} />
                      <Line type="monotone" dataKey="actual" name={t('today.sol.actual')} stroke="var(--blue)" strokeWidth={2.5} dot={{ r: 2.5 }} connectNulls />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex gap-4 justify-center text-[10px] text-[var(--ink-2)] mb-1">
                  <span className="flex items-center gap-1.5"><span className="w-3.5 h-0.5 bg-[var(--ink)] inline-block" />{t('today.sol.target')}</span>
                  <span className="flex items-center gap-1.5"><span className="w-3.5 h-0.5 bg-[var(--blue)] inline-block" />{t('today.sol.actual')}</span>
                </div>

                {/* phases table: theme · what needs doing · quantified growth */}
                <div className="overflow-x-auto mt-3">
                  <table className="w-full text-[11px] border-collapse min-w-[440px]">
                    <thead>
                      <tr>
                        <th className="p-1.5 w-14"></th>
                        {phasesForSeries.map((p) => (
                          <th key={p.id} className="text-start p-1.5 align-bottom">
                            <div className="font-semibold text-[var(--ink)]">{p.phase_name}</div>
                            <div className="text-[10px] text-[var(--muted)] font-normal">
                              {p.start_year}–{p.end_year} · <span style={{ color: TIER_COLOR[p.target_tier] }}>{tierLabel(p.target_tier, locale)}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="align-top">
                      <SolRow label={t('today.sol.theme')} cells={phasesForSeries.map((p) => p.theme ?? [])} />
                      <SolRow label={t('today.sol.todo')} cells={phasesForSeries.map((p) => p.todo ?? [])} />
                      <SolRowText label={t('today.sol.growth')} cells={phasesForSeries.map((p) => p.net_worth_goal ?? '')} />
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <>
                {/* no phases yet — show what this income tier affords, and nudge */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                  {life.items.map((it, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="text-base shrink-0 leading-none mt-0.5">{it.icon}</span>
                      <div className="text-[11px] leading-relaxed min-w-0">
                        <strong className="text-[var(--ink)] font-medium block">{it.label}</strong>
                        <span className="text-[var(--muted)]">{it.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {nextTier && (
                  <div className="mt-3 pt-2.5 border-t border-[var(--border-faint)] text-[11px] text-[var(--ink-2)]">
                    {t('today.sol.next')} <strong style={{ color: TIER_COLOR[nextTier] }}>{tierLabel(nextTier, locale)}</strong> — {getLifestyle(nextTier, locale).income}
                  </div>
                )}
                <p className="text-[11px] text-[var(--green-dark)] font-medium mt-3">{t('today.sol.designHint')}</p>
              </>
            )}
          </Card>
        );
      })()}

      {/* ── Row 2: income sources (pie) + risk radar ── */}
      <div className="grid sm:grid-cols-2 gap-3">
        <Card title={t('today.sources.title')} href="/lifetime-income" explain={EX.sources}>
          {activeIncome > 0 ? (
            <div className="flex items-center gap-3">
              {/* active vs passive donut */}
              <div className="relative h-36 w-36 shrink-0" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: t('today.sources.active'), value: activeIncome },
                        ...(passiveIncome > 0 ? [{ name: t('today.sources.passive'), value: passiveIncome }] : []),
                      ]}
                      dataKey="value" nameKey="name"
                      innerRadius={34} outerRadius={52} paddingAngle={passiveIncome > 0 ? 3 : 0}
                      stroke="none"
                    >
                      <Cell fill="var(--green)" />
                      {passiveIncome > 0 && <Cell fill="var(--gold-2)" />}
                    </Pie>
                    <Tooltip formatter={(v, name) => [`${money(Number(v))}/mo`, name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="font-serif text-xl font-bold text-[var(--ink)] leading-none">{sourceStreams.length}</span>
                  <span className="text-[8px] tracking-wide text-[var(--muted)] uppercase mt-0.5">
                    {sourceStreams.length === 1 ? 'source' : 'sources'}
                  </span>
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <div className="text-[10px] text-[var(--muted)]">{t('today.sources.biggest')}</div>
                  <div className="text-xs font-semibold text-[var(--ink)] leading-snug">
                    {biggestStream.name}
                    {biggestStream.emp && employment ? (
                      <span className="text-[var(--muted)] font-normal"> · {employment}</span>
                    ) : null}
                  </div>
                </div>

                {/* each stream, coloured by nature */}
                <div className="space-y-1 text-[11px] text-[var(--ink-2)]">
                  {sourceStreams.map((s) => (
                    <div key={s.name} className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: s.kind === 'passive' ? 'var(--gold-2)' : 'var(--green)' }}
                      />
                      <span className="truncate">{s.name}</span>
                      <span className="ms-auto font-medium whitespace-nowrap">
                        {money(s.amt)}{s.perMo ? '/mo' : ''}
                      </span>
                    </div>
                  ))}
                </div>

                {/* active vs passive split + explainer */}
                <div className="flex items-center gap-2.5 text-[10px] text-[var(--ink-2)] pt-0.5">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ background: 'var(--green)' }} />
                    {t('today.sources.active')} {Math.round(100 - passivePct)}%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ background: 'var(--gold-2)' }} />
                    {t('today.sources.passive')} {Math.round(passivePct)}%
                  </span>
                  <button
                    onClick={() => setSrcInfo((v) => !v)}
                    className="ms-auto flex items-center gap-1 text-[var(--muted)] hover:text-[var(--green-dark)]"
                  >
                    <span className="w-[14px] h-[14px] rounded-full border border-[var(--border-medium)] text-[8px] leading-none flex items-center justify-center">?</span>
                    {t('today.sources.whatsThis')}
                  </button>
                </div>

                {srcInfo && (
                  <div className="text-[10px] text-[var(--ink-2)] leading-relaxed bg-[var(--surface-1)] rounded-lg p-2.5 space-y-1.5">
                    <p><strong className="text-[var(--green-dark)]">{t('today.sources.active')}</strong> — {t('today.sources.explainActive')}</p>
                    <p><strong className="text-[var(--gold-text-alt)]">{t('today.sources.passive')}</strong> — {t('today.sources.explainPassive')}</p>
                  </div>
                )}

                {passivePct < 10 && (
                  <p className="text-[10px] text-[var(--gold-text-alt)] leading-relaxed">{t('today.sources.nudge')}</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-[var(--muted)]">Set your income in Edit Profile.</p>
          )}
        </Card>

        <Card title={t('today.risks.title')} href="/risks" explain={EX.risks}>
          <div className="flex items-center gap-2 mb-1">
            {highRisks.length > 0 && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: 'var(--red-dark-text)', background: 'var(--red-bg)' }}>
                {highRisks.length} {t('today.risks.exposed')}
              </span>
            )}
            {medRisks.length > 0 && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: 'var(--gold-text-alt)', background: 'var(--gold-bg)' }}>
                {medRisks.length} {t('today.risks.watch')}
              </span>
            )}
          </div>
          <div className="h-28" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke="var(--chart-grid)" />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 9, fill: 'var(--muted)' }} />
                <Radar dataKey="score" stroke="var(--red)" fill="var(--red)" fillOpacity={0.25} />
                <Tooltip content={<RiskTooltip risks={risks} />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          {/* tap a risk for its finding */}
          <div className="flex flex-wrap gap-1 mb-1">
            {risks.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelRisk(selRisk === r.id ? null : r.id)}
                className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                  selRisk === r.id
                    ? 'border-[var(--green)] bg-[var(--green-bg)] text-[var(--ink)]'
                    : 'border-[var(--border-default)] text-[var(--muted)] hover:text-[var(--ink-2)]'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: RISK_COLOR[r.level] }} />
                {AXIS_LABEL[r.id] ?? r.id}
              </button>
            ))}
          </div>
          {selectedRisk && (
            <div className="text-[11px] text-[var(--ink-2)] leading-relaxed bg-[var(--surface-1)] rounded-lg p-2.5">
              <span className="font-medium text-[var(--ink)]">{selectedRisk.icon} {selectedRisk.title}.</span>{' '}
              {selectedRisk.finding}
              {selectedRisk.mitigations[0]?.href && (
                <>
                  {' '}
                  <Link href={selectedRisk.mitigations[0].href} className="text-[var(--green-dark)] font-medium">
                    {selectedRisk.mitigations[0].linkLabel} →
                  </Link>
                </>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* ── SIMAH credit standing (only when a score has been recorded) ── */}
      {credit && (
        <Card title={t('today.credit.title')} href="/credit" explain={EX.credit}>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="text-center shrink-0">
              <div className="font-serif text-4xl font-bold leading-none" style={{ color: bandFor(credit.score!).color }}>{credit.score}</div>
              <div className="text-[10px] text-[var(--muted)] mt-1">{t('today.credit.of900')}</div>
            </div>
            <div className="flex-1 min-w-[180px]">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold" style={{ color: bandFor(credit.score!).color }}>
                  {bandLabel(bandFor(credit.score!).key, locale)}
                </span>
                {credit.prev != null && credit.score != null && credit.score !== credit.prev && (
                  <span className={`text-[11px] font-semibold ${credit.score - credit.prev >= 0 ? 'text-[var(--green-dark)]' : 'text-[var(--red-dark-text)]'}`}>
                    {credit.score - credit.prev >= 0 ? '▲' : '▼'} {Math.abs(credit.score - credit.prev)} {t('today.credit.vsPrev')}
                  </span>
                )}
              </div>
              {/* five-band scale with a pointer at the score */}
              <div className="relative">
                <div className="flex h-2 rounded-full overflow-hidden">
                  {BANDS.map((b) => (
                    <div key={b.key} style={{ flex: b.max - b.min, background: b.color, opacity: bandFor(credit.score!).key === b.key ? 1 : 0.35 }} />
                  ))}
                </div>
                <div
                  className="absolute -top-1 w-0 h-0"
                  style={{
                    // logical offset so the pointer tracks the bands, which
                    // flip under RTL
                    insetInlineStart: `${((Math.max(SCORE_MIN, Math.min(SCORE_MAX, credit.score!)) - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * 100}%`,
                    transform: 'translateX(-50%)',
                    borderLeft: '4px solid transparent',
                    borderRight: '4px solid transparent',
                    borderTop: '5px solid var(--ink)',
                  }}
                />
                <div className="flex justify-between text-[9px] text-[var(--muted)] mt-1">
                  <span>{SCORE_MIN}</span><span>{SCORE_MAX}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ── Row 3: debt load — each liability, paid vs remaining ── */}
      <Card title={t('today.debt.title')} href="/commitments" explain={EX.debt}>
        <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
          <div className="font-serif text-2xl font-bold text-[var(--ink)]">{money(liabilities)}</div>
          {/* the two ratios, folded in as compact gauges */}
          <div className="flex gap-5">
            <div className="w-32"><Gauge label={t('today.debt.vsIncome')} pct={debtVsIncome} /></div>
            <div className="w-32"><Gauge label={t('today.debt.vsAssets')} pct={debtVsAssets} /></div>
          </div>
        </div>

        {debtItems.length > 0 ? (
          <>
            {/* leverage vs consumption split */}
            {(leverageTotal > 0 || consumptionTotal > 0) && (
              <div className="flex items-stretch gap-2 mb-3">
                {leverageTotal > 0 && (
                  <div className="flex-1 rounded-lg px-3 py-2 bg-[var(--green-bg)] border border-[var(--green-border)]">
                    <div className="text-[10px] text-[var(--green-dark)]">🌱 {t('today.debt.leverageFull')}</div>
                    <div className="font-serif text-base font-bold text-[var(--green-dark)]">{money(leverageTotal)}</div>
                  </div>
                )}
                {consumptionTotal > 0 && (
                  <div className="flex-1 rounded-lg px-3 py-2 bg-[var(--gold-bg)] border border-[var(--gold)]/40">
                    <div className="text-[10px] text-[var(--gold-text-alt)]">🛒 {t('today.debt.consumptionFull')}</div>
                    <div className="font-serif text-base font-bold text-[var(--gold-text-alt)]">{money(consumptionTotal)}</div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2.5">
              {debtItems.map((item) => (
                <DebtBar key={item.name} name={item.name} original={item.original} balance={item.balance} leverage={item.leverage} />
              ))}
              <div className="pt-2.5 border-t border-[var(--border-default)]">
                <DebtBar
                  name={t('today.debt.all')}
                  original={
                    debtItems.some((x) => x.original != null)
                      ? debtItems.reduce((s, x) => s + (x.original ?? x.balance), 0)
                      : null
                  }
                  balance={debtItems.reduce((s, x) => s + x.balance, 0)}
                  bold
                />
              </div>
            </div>
            <div className="flex gap-4 mt-3 text-[10px] text-[var(--muted)] flex-wrap">
              <span><span className="inline-block w-2.5 h-2.5 rounded-sm me-1" style={{ background: 'var(--blue-2)' }} />{t('today.debt.paid')}</span>
              <span><span className="inline-block w-2.5 h-2.5 rounded-sm me-1" style={{ background: 'var(--chart-soft-green)' }} />{t('today.debt.remaining')}</span>
            </div>
            <p className="text-[10px] text-[var(--muted)] mt-1.5 leading-relaxed">{t('today.debt.goodBadHint')}</p>
          </>
        ) : (
          <p className="text-xs text-[var(--muted)]">
            Add your loans and liabilities in Bills &amp; Commitments to see each one&apos;s payoff progress here.
          </p>
        )}
      </Card>

      {/* ── Row 4: net worth vs peers, by age ── */}
      <Card title={t('today.compare.title')} href="/positioning" explain={EX.compare}>
        {age && compare.length > 1 ? (
          <>
            <div className="h-44" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={compare} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                  <XAxis dataKey="age" tick={{ fontSize: 9, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 9, fill: 'var(--muted)' }}
                    tickFormatter={fmtCompact} width={38} axisLine={false} tickLine={false}
                  />
                  <Tooltip labelFormatter={(v) => `Age ${v}`} formatter={(v, name) => [`SAR ${fmt(Number(v))}`, name]} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {age != null && (
                    <ReferenceLine
                      x={age}
                      stroke="var(--gold-2)" strokeWidth={1.5} strokeDasharray="3 3"
                      label={{ value: t('today.compare.today'), position: 'top', fontSize: 9, fill: 'var(--gold-2)' }}
                    />
                  )}
                  <Line type="monotone" dataKey="national" name="National avg" stroke="var(--blue-2)" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="higher" name="Higher peer" stroke="var(--ink)" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="you" name={t('today.compare.you')} stroke="var(--green)" strokeWidth={3} dot={false} connectNulls={false} />
                  <Line type="monotone" dataKey="youProjected" name={t('today.compare.projected')} stroke="var(--green)" strokeWidth={2} dot={false} strokeDasharray="5 3" connectNulls={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            {!hasCompareData && (
              <p className="text-[11px] text-[var(--muted)] mt-1">
                Log a yearly net worth snapshot in{' '}
                <Link href="/positioning" className="text-[var(--green-dark)] font-medium">Financial Positioning</Link>{' '}
                to draw your own line against the benchmarks.
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-[var(--muted)]">
            Set your age in Edit Profile to see how you compare against peers and the national average.
          </p>
        )}
      </Card>

      {/* ── Row 4a: asset composition over time ── */}
      {assetComposition.length > 0 && assetSeries.length > 0 && (
        <Card title={t('today.assets.title')} href="/financial-numbers" explain={EX.assets}>
          <div className="flex bg-[var(--surface-1)] rounded-lg p-0.5 mb-2 w-fit">
            <button
              onClick={() => setAssetView('abs')}
              className={`text-[10px] px-2.5 py-1 rounded-md transition-colors ${
                assetView === 'abs' ? 'bg-[var(--surface-card)] text-[var(--ink)] font-medium shadow-sm' : 'text-[var(--muted)]'
              }`}
            >
              {t('today.assets.amount')}
            </button>
            <button
              onClick={() => setAssetView('pct')}
              className={`text-[10px] px-2.5 py-1 rounded-md transition-colors ${
                assetView === 'pct' ? 'bg-[var(--surface-card)] text-[var(--ink)] font-medium shadow-sm' : 'text-[var(--muted)]'
              }`}
            >
              {t('today.assets.share')}
            </button>
          </div>
          <div className="h-56" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={assetComposition}
                stackOffset={assetView === 'pct' ? 'expand' : 'none'}
                margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
              >
                <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                <XAxis
                  dataKey="label" tick={{ fontSize: 9, fill: 'var(--muted)' }} axisLine={false} tickLine={false}
                  interval={Math.max(0, Math.floor(assetComposition.length / 8))}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: 'var(--muted)' }} width={38} axisLine={false} tickLine={false}
                  domain={assetView === 'pct' ? [0, 1] : undefined}
                  tickFormatter={(v) => (assetView === 'pct' ? `${Math.round(Number(v) * 100)}%` : fmtCompact(Number(v)))}
                />
                <Tooltip formatter={(v, name) => [`SAR ${fmt(Number(v))}`, name]} />
                {/* custom legend so it follows stack order (biggest first, Other last) */}
                <Legend
                  wrapperStyle={{ fontSize: 10 }}
                  content={() => (
                    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 pt-1">
                      {assetSeries.map((s) => (
                        <span key={s.key} className="inline-flex items-center gap-1 text-[10px] text-[var(--ink-2)]">
                          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />
                          {t(s.labelKey)}
                        </span>
                      ))}
                    </div>
                  )}
                />
                {assetSeries.map((s) => (
                  <Bar key={s.key} dataKey={s.key} name={t(s.labelKey)} stackId="a" fill={s.color} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* ── Row 4b: lifetime income vs savings ── */}
      {lifeEarned > 0 && (
        <Card title={t('today.lifetime.title')} href="/lifetime-income" explain={EX.lifetime}>
          <div className="flex items-baseline gap-4 flex-wrap mb-2">
            <div>
              <div className="text-[10px] text-[var(--muted)]">{t('today.lifetime.earned')}</div>
              <div className="font-serif text-xl font-bold text-[var(--blue)]">{moneyC(lifeEarned)}</div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--muted)]">{t('today.lifetime.kept')}</div>
              <div className="font-serif text-xl font-bold text-[var(--green-dark)]">{moneyC(lifeKept)}</div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full text-[var(--green-dark)] bg-[var(--green-bg)]">
              {Math.round(lifeKeptPct)}%
            </span>
          </div>
          <div className="h-40" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={lifeYearly} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                <XAxis
                  dataKey="year" tick={{ fontSize: 9, fill: 'var(--muted)' }} axisLine={false} tickLine={false}
                  interval={Math.max(0, Math.floor(lifeYearly.length / 6))}
                />
                <YAxis tick={{ fontSize: 9, fill: 'var(--muted)' }} tickFormatter={fmtCompact} width={34} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v, name) => [`SAR ${fmt(Number(v))}`, name]} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="earned" name={t('today.lifetime.earned')} fill="var(--blue)" radius={[2, 2, 0, 0]} />
                <Line type="monotone" dataKey="kept" name={t('today.lifetime.kept')} stroke="var(--green-dark)" strokeWidth={2.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* ── Row 5: plan + pace ── */}
      <div className="grid lg:grid-cols-2 gap-3">
        <Card title={t('today.plan.title')} href="/goal-fund" explain={EX.plan}>
          {goal ? (
            <>
              <div className="flex items-baseline justify-between gap-2 mb-2">
                <div className="font-serif text-lg font-semibold text-[var(--ink)] truncate">🎯 {goal.name}</div>
                <div className="text-xs text-[var(--muted)] whitespace-nowrap">{money(Number(goal.target_amount))}</div>
              </div>
              <div className="h-2.5 bg-[var(--surface-1)] rounded-full overflow-hidden mb-2" dir="ltr">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, (goalSaved / Number(goal.target_amount)) * 100)}%`,
                    background: 'linear-gradient(90deg, var(--green), var(--green-border))',
                  }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-[var(--ink-2)]">
                <span>{money(goalSaved)} saved · {Math.round((goalSaved / Number(goal.target_amount)) * 100)}%</span>
                <span>{money(Number(goal.monthly_contribution))}/mo</span>
              </div>
            </>
          ) : (
            <p className="text-xs text-[var(--muted)]">No goal fund yet — name your next big thing and give it a monthly number.</p>
          )}
        </Card>

        <Card title={t('today.pace.title')} href="/velocity" explain={EX.pace}>
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="font-serif text-2xl font-bold" style={{ color: nwPace >= 0 ? 'var(--green-dark)' : 'var(--red-2)' }}>
                {nwPace >= 0 ? '+' : '−'}{money(Math.abs(nwPace))}
              </div>
              <div className="text-[10px] text-[var(--muted)]">{t('today.pace.perMonth')}</div>
            </div>
            <div className="h-16 w-36 shrink-0" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={nwSeries}>
                  <Area dataKey="v" stroke="var(--green)" strokeWidth={2} fill="var(--green)" fillOpacity={0.15} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {nwPace > 0 ? (
            <div className="mt-3 pt-3 border-t border-[var(--border-default)]">
              <div className="text-[10px] text-[var(--muted)] mb-1.5">{t('today.pace.ladderTitle')}</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {paceLadder.map((m) => (
                  <div key={m.target} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-[var(--ink-2)]">{moneyC(m.target)}</span>
                    {m.reached ? (
                      <span className="text-[var(--green-dark)] font-medium whitespace-nowrap">{t('today.pace.reached')}</span>
                    ) : m.months != null ? (
                      <span className="font-medium text-[var(--ink)] whitespace-nowrap">{dur(m.months)}</span>
                    ) : (
                      <span className="text-[var(--muted)]">—</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-[var(--muted)] mt-2">{t('today.pace.stalled')}</p>
          )}
        </Card>
      </div>

      {/* ── Row 4: the road to financial freedom ── */}
      {freedom && (
        <div className="bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <Link href="/freedom" className="text-[10px] tracking-[0.12em] uppercase text-[var(--gold)] hover:underline">
              🕊 {t('today.freedom.title')} →
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/50">
                4% rule · {liveIsUsed ? 'live portfolio' : 'latest ledger'}
              </span>
              <span className="[&>button]:border-white/30 [&>button]:text-white/60 [&>button:hover]:text-white [&>button:hover]:border-white/60">
                <ExplainButton content={EX.freedom} />
              </span>
            </div>
          </div>

          {/* the road */}
          <div className="relative h-6 mb-1" dir="ltr">
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2.5 rounded-full bg-white/10" />
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-2.5 rounded-full"
              style={{
                width: `${Math.max(1.5, freedom.progress * 100)}%`,
                background: 'linear-gradient(90deg, var(--green), #7FE8C4)',
              }}
            />
            {[25, 50, 75].map((p) => (
              <div key={p} className="absolute top-1/2 -translate-y-1/2 w-px h-4 bg-white/25" style={{ left: `${p}%` }} />
            ))}
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-sm" style={{ left: `${Math.max(1.5, freedom.progress * 100)}%` }}>
              🚶
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 text-sm">🏁</div>
          </div>
          <div className="text-right text-[11px] text-white/60 mb-3">{(freedom.progress * 100).toFixed(1)}%</div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <HeroStat label={t('today.freedom.number')} value={moneyC(freedom.freedomNumber)} accent="var(--gold)" />
            <HeroStat label={t('today.freedom.invested')} value={moneyC(freedom.investedNow)} />
            <HeroStat label={t('today.freedom.passive')} value={`${moneyC(freedom.passiveMonthlyNow)}/mo`} />
            <HeroStat
              label={t('today.freedom.gap')}
              value={moneyC(freedom.gap)}
              sub={freedom.etaYear ? `≈ ${freedom.etaYear} at your pace` : undefined}
            />
          </div>
        </div>
      )}
    </div>
  );

  // ── local pieces ──────────────────────────────────────────────────────
  function Card({ title, href, className = '', explain, children }: { title: string; href: string; className?: string; explain?: ExplainContent; children: React.ReactNode }) {
    return (
      <div className={`bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-4 ${className}`}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="text-[10px] tracking-[0.08em] uppercase text-[var(--muted)]">{title}</div>
          <div className="flex items-center gap-1.5">
            {explain && <ExplainButton content={explain} />}
            <Link href={href} className="text-[var(--muted)] hover:text-[var(--green-dark)] text-xs">→</Link>
          </div>
        </div>
        {children}
      </div>
    );
  }

  function Gauge({ label, pct }: { label: string; pct: number | null }) {
    const color = pct == null ? 'var(--muted)' : pct < 30 ? 'var(--green)' : pct < 60 ? 'var(--amber)' : 'var(--red)';
    return (
      <div className="mb-2">
        <div className="flex justify-between text-[10px] text-[var(--muted)] mb-1">
          <span>{label}</span>
          <span className="font-semibold" style={{ color }}>{pct == null ? '—' : `${Math.round(pct)}%`}</span>
        </div>
        <div className="h-1.5 bg-[var(--surface-1)] rounded-full overflow-hidden" dir="ltr">
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct ?? 0)}%`, background: color }} />
        </div>
      </div>
    );
  }

  // One liability as a horizontal paid-vs-remaining bar (blue = paid so far,
  // green = still owed), with the paid share called out as a percentage.
  function DebtBar({ name, original, balance, bold, leverage }: { name: string; original: number | null; balance: number; bold?: boolean; leverage?: boolean }) {
    const paid = original != null ? Math.max(0, original - balance) : null;
    const paidPct = original != null && original > 0 && paid != null ? (paid / original) * 100 : null;
    return (
      <div>
        <div className="flex justify-between items-baseline gap-2 mb-1">
          <span className={`text-xs truncate flex items-center gap-1.5 ${bold ? 'font-semibold text-[var(--ink)]' : 'text-[var(--ink-2)]'}`}>
            {leverage !== undefined && (
              <span
                className="text-[8px] px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0"
                style={
                  leverage
                    ? { color: 'var(--green-dark)', background: 'var(--green-bg)' }
                    : { color: 'var(--gold-text-alt)', background: 'var(--gold-bg)' }
                }
              >
                {leverage ? t('today.debt.leverage') : t('today.debt.consumption')}
              </span>
            )}
            <span className="truncate">{name}</span>
          </span>
          {paidPct != null && (
            <span className="text-[10px] font-semibold whitespace-nowrap" style={{ color: 'var(--red-2)' }}>
              {paidPct.toFixed(paidPct < 10 ? 1 : 0)}% {t('today.debt.paid').toLowerCase()}
            </span>
          )}
        </div>
        <div className="flex h-5 rounded-md overflow-hidden bg-[var(--surface-1)]" dir="ltr">
          {paid != null && paidPct != null && paid > 0 && (
            <div
              className="flex items-center justify-end px-1.5 shrink-0"
              style={{ width: `${Math.max(1.5, paidPct)}%`, background: 'var(--blue-2)' }}
            >
              {paidPct > 20 && <span className="text-[9px] font-medium text-white whitespace-nowrap">{fmt(paid)}</span>}
            </div>
          )}
          <div className="flex-1 flex items-center px-1.5 min-w-0" style={{ background: 'var(--chart-soft-green)' }}>
            {balance > 0 && (
              <span className="text-[9px] font-semibold whitespace-nowrap" style={{ color: '#1F3324' }}>{fmt(balance)}</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  function HeroStat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
    return (
      <div>
        <div className="text-[10px] text-white/50 mb-0.5">{label}</div>
        <div className="font-serif text-lg font-bold" style={{ color: accent ?? '#fff' }}>{value}</div>
        {sub && <div className="text-[10px] text-white/60">{sub}</div>}
      </div>
    );
  }
}

// Centred label for the "income on the way" forecast band, sitting just
// under the zero line beneath the projected income bars.
function ForecastBandLabel({ viewBox, text }: { viewBox?: { x: number; y: number; width: number; height: number }; text: string }) {
  if (!viewBox) return null;
  return (
    <text
      x={viewBox.x + viewBox.width / 2}
      y={viewBox.y + 16}
      textAnchor="middle"
      fontSize={10.5}
      fontWeight={700}
      fill="var(--green-dark)"
    >
      {text}
    </text>
  );
}

// One row of the standard-of-living phase table: a labelled left cell, then a
// bullet list per phase.
function SolRow({ label, cells }: { label: string; cells: string[][] }) {
  return (
    <tr className="border-t border-[var(--border-faint)]">
      <td className="p-1.5 text-[10px] text-[var(--muted)] font-medium whitespace-nowrap">{label}</td>
      {cells.map((items, i) => (
        <td key={i} className="p-1.5 text-[var(--ink-2)]">
          {items.length ? (
            <ul className="space-y-0.5">
              {items.map((s, j) => (
                <li key={j} className="flex gap-1"><span className="text-[var(--muted)] shrink-0">·</span><span>{s}</span></li>
              ))}
            </ul>
          ) : (
            <span className="text-[var(--muted)]">—</span>
          )}
        </td>
      ))}
    </tr>
  );
}

// Single-value row (the quantified growth goal), one cell per phase.
function SolRowText({ label, cells }: { label: string; cells: string[] }) {
  return (
    <tr className="border-t border-[var(--border-faint)]">
      <td className="p-1.5 text-[10px] text-[var(--muted)] font-medium whitespace-nowrap">{label}</td>
      {cells.map((s, i) => (
        <td key={i} className="p-1.5">
          {s ? <span className="text-[var(--green-dark)] font-medium">{s}</span> : <span className="text-[var(--muted)]">—</span>}
        </td>
      ))}
    </tr>
  );
}

// Label for the last/current-month reference bands. Anchoring "last month" to
// the right edge and "current month" to the left edge splits them at the
// month boundary so the two labels never overlap.
function BandLabel({
  viewBox, text, align, color,
}: {
  viewBox?: { x: number; y: number; width: number; height: number };
  text: string;
  align: 'start' | 'end';
  color: string;
}) {
  if (!viewBox) return null;
  const x = align === 'end' ? viewBox.x + viewBox.width - 2 : viewBox.x + 2;
  return (
    <text x={x} y={viewBox.y + 9} textAnchor={align} fontSize={9} fill={color}>
      {text}
    </text>
  );
}

// Hovering an axis on the radar shows that risk's real finding.
function RiskTooltip({
  active, payload, risks,
}: {
  active?: boolean;
  payload?: { payload?: { axis?: string } }[];
  risks: RiskResult[];
}) {
  if (!active || !payload?.length) return null;
  const axis = payload[0]?.payload?.axis;
  const risk = risks.find((r) => (AXIS_LABEL[r.id] ?? r.id) === axis);
  if (!risk) return null;
  return (
    <div className="mm-tooltip px-3 py-2 max-w-[230px]">
      <div className="text-[10px] font-semibold text-[var(--ink)] mb-0.5">{risk.icon} {risk.title}</div>
      <div className="text-[10px] text-[var(--ink-2)] leading-relaxed">
        {risk.level === 'unknown' ? risk.missingHint ?? risk.finding : risk.finding}
      </div>
    </div>
  );
}

// ── The A→B→C→D quadrant map ─────────────────────────────────────────────
// Reading order: A (top-left) → B (top-right) → C (bottom-left) → D
// (bottom-right) — the usual progression as finances mature toward surplus.
// The B→C arrow stretches diagonally across the middle.
function QuadrantMap({ active, hereLabel }: { active: QuadKey | null; hereLabel: string }) {
  const cells: { key: QuadKey; x: number; y: number }[] = [
    { key: 'A', x: 4, y: 4 },
    { key: 'B', x: 181, y: 4 },
    { key: 'C', x: 4, y: 134 },
    { key: 'D', x: 181, y: 134 },
  ];
  const W = 155, H = 112;
  const barW = 15, barGap = 8;
  return (
    <svg viewBox="0 0 340 250" className="w-full">
      <defs>
        <marker id="qArrow" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--gold-2)" />
        </marker>
      </defs>

      {cells.map(({ key, x, y }) => {
        const q = QUADS[key];
        const isActive = active === key;
        // in/out bar pair, centered horizontally in the cell
        const bx = x + W / 2 - (barW * 2 + barGap) / 2;
        const barBase = y + H - 24;
        return (
          <g key={key}>
            <rect
              x={x} y={y} width={W} height={H} rx={13}
              fill={isActive ? 'var(--green-bg)' : 'var(--surface-1)'}
              stroke={isActive ? 'var(--green)' : 'var(--border-default)'}
              strokeWidth={isActive ? 2 : 1}
            />
            {/* step letter */}
            <circle cx={x + 20} cy={y + 20} r={12} fill={isActive ? 'var(--green)' : 'var(--surface-card)'} stroke={isActive ? 'var(--green)' : 'var(--border-medium)'} />
            <text x={x + 20} y={y + 24.5} textAnchor="middle" fontSize="12.5" fontWeight="700" fill={isActive ? '#fff' : 'var(--muted)'}>
              {key}
            </text>
            {/* title + mood */}
            <text x={x + 38} y={y + 19} fontSize="12" fontWeight="600" fill="var(--ink)">{q.title}</text>
            <text x={x + 38} y={y + 31} fontSize="8.5" fill="var(--muted)">{q.mood}</text>
            {/* mini income vs outflow bars, centered — a quadrant with no
                income (e.g. build mode) gets a flat zero-line, not a bar */}
            {q.incomeH > 0 ? (
              <rect x={bx} y={barBase - q.incomeH} width={barW} height={q.incomeH} rx={2.5} fill="var(--green)" />
            ) : (
              <line x1={bx} y1={barBase} x2={bx + barW} y2={barBase} stroke="var(--muted)" strokeWidth={1.5} strokeDasharray="2 2" />
            )}
            <rect x={bx + barW + barGap} y={barBase - q.outflowH} width={barW} height={q.outflowH} rx={2.5} fill="var(--red-2)" opacity={0.85} />
            <text x={bx + barW / 2} y={y + H - 12} textAnchor="middle" fontSize="7.5" fill="var(--muted)">in</text>
            <text x={bx + barW + barGap + barW / 2} y={y + H - 12} textAnchor="middle" fontSize="7.5" fill="var(--muted)">out</text>
            {/* you-are-here pill, tucked in the gap between the mood line and
                the bars so it never covers either */}
            {isActive && (
              <g>
                <rect x={x + W / 2 - 39} y={y + 39} width={78} height={16} rx={8} fill="var(--green)" />
                <circle cx={x + W / 2 - 28} cy={y + 47} r={3} fill="#fff">
                  <animate attributeName="opacity" values="1;0.25;1" dur="1.6s" repeatCount="indefinite" />
                </circle>
                <text x={x + W / 2 + 6} y={y + 50} textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#fff">
                  {hereLabel}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* progression arrows: A→B (top), B→C (short diagonal at the center), C→D (bottom) */}
      <line x1={163} y1={60} x2={177} y2={60} stroke="var(--gold-2)" strokeWidth={1.8} markerEnd="url(#qArrow)" />
      <line x1={177} y1={118} x2={163} y2={132} stroke="var(--gold-2)" strokeWidth={1.8} markerEnd="url(#qArrow)" />
      <line x1={163} y1={190} x2={177} y2={190} stroke="var(--gold-2)" strokeWidth={1.8} markerEnd="url(#qArrow)" />
    </svg>
  );
}
