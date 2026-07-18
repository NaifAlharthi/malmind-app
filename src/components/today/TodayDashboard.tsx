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
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  AreaChart, Area,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { computeRisks, type RiskInputs } from '@/lib/risks';
import { computeFreedom } from '@/lib/financialFreedom';
import { loadHoldings, valueHoldings } from '@/lib/livePortfolio';

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

interface Data {
  profile: {
    monthly_income: number; side_income: number; monthly_expense: number;
    liquid_savings: number | null; monthly_debt_payments: number | null;
    has_health_insurance: boolean | null;
  } | null;
  snaps: Snap[];
  goals: Goal[];
  actualsByGoal: Record<string, number>;
  liveInvested: number | null;
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
  A: { title: 'Build mode', mood: 'Not enough income or assets yet', move: 'Generate income & first assets', incomeH: 10, outflowH: 20 },
  B: { title: 'Falling behind', mood: 'Outflow outweighs income', move: 'Flip the balance', incomeH: 16, outflowH: 24 },
  C: { title: 'Break-even', mood: 'Income covers outflow, nothing left', move: 'Create surplus & protect it', incomeH: 21, outflowH: 20 },
  D: { title: 'Abundance', mood: 'Durable surplus — make it work', move: 'Multiply the surplus', incomeH: 24, outflowH: 15 },
} as const;
type QuadKey = keyof typeof QUADS;

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

  const sar = t('common.sar');
  const money = (n: number) => (locale === 'ar' ? `${fmt(n)} ${sar}` : `${sar} ${fmt(n)}`);
  const moneyC = (n: number) => (locale === 'ar' ? `${fmtCompact(n)} ${sar}` : `${sar} ${fmtCompact(n)}`);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileRes, snapsRes, goalsRes, actualsRes] = await Promise.all([
        supabase.from('profiles')
          .select('monthly_income, side_income, monthly_expense, liquid_savings, monthly_debt_payments, has_health_insurance')
          .eq('id', user.id).single(),
        supabase.from('financial_snapshots')
          .select('year, month, cash, stocks, real_estate, equity, other_assets, liabilities, income, expenses')
          .eq('user_id', user.id).order('year', { ascending: true }).order('month', { ascending: true }),
        supabase.from('goal_funds')
          .select('id, name, target_amount, monthly_contribution, start_date, maturity_years')
          .eq('user_id', user.id),
        supabase.from('goal_fund_actuals').select('goal_fund_id, actual_amount').eq('user_id', user.id),
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

      setData({
        profile: (profileRes.data as Data['profile']) ?? null,
        snaps: (snapsRes.data as Snap[]) ?? [],
        goals: (goalsRes.data as Goal[]) ?? [],
        actualsByGoal,
        liveInvested,
      });
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
    }));

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

    return {
      latest, avgIncome, avgExpenses, totalAssets, liabilities, netWorth, cashFlow,
      quad: diagnose(avgIncome, avgExpenses, totalAssets),
      nwPace, nwSeries, milestone, monthsToMilestone,
      invested, liveIsUsed: d.liveInvested != null, freedom,
      risks, salary, side, goal,
      goalSaved: goal ? d.actualsByGoal[goal.id] ?? 0 : 0,
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
    avgIncome, avgExpenses, totalAssets, liabilities, netWorth, cashFlow, quad,
    nwPace, nwSeries, milestone, monthsToMilestone, invested, liveIsUsed, freedom,
    risks, salary, side, goal, goalSaved,
  } = derived;

  const delta = avgIncome - avgExpenses;
  const highRisks = risks.filter((r) => r.level === 'high');
  const medRisks = risks.filter((r) => r.level === 'medium');
  const radarData = risks.map((r) => ({
    axis: { income: 'Income', runway: 'Runway', health: 'Health', concentration: 'Mix', debt: 'Debt' }[r.id] ?? r.id,
    score: r.score,
  }));
  const debtVsIncome = avgIncome > 0 ? (liabilities / (avgIncome * 12)) * 100 : null;
  const debtVsAssets = totalAssets > 0 ? (liabilities / totalAssets) * 100 : null;

  return (
    <div className="space-y-3 mb-6">
      {/* ── Row 1: position + cash flow ── */}
      <div className="grid lg:grid-cols-5 gap-3">
        <Card className="lg:col-span-2" title={t('today.quad.title')} href="/positioning">
          <QuadrantMap active={quad} />
          {quad && (
            <p className="text-xs text-[var(--ink-2)] leading-relaxed mt-2">
              <strong className="text-[var(--ink)]">{QUADS[quad].title}.</strong> {QUADS[quad].mood} — the move:{' '}
              <strong className="text-[var(--green-dark)]">{QUADS[quad].move.toLowerCase()}</strong>.
            </p>
          )}
        </Card>

        <Card className="lg:col-span-3" title={t('today.cash.title')} href="/financial-numbers">
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
          <div className="h-36" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlow} barGap={2}>
                <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--muted)' }} tickFormatter={fmtCompact} width={34} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => `SAR ${fmt(Number(v))}`} />
                <Bar dataKey="income" name="Income" fill="var(--green)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="var(--amber)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* ── Row 2: sources · debt · risks ── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Card title={t('today.sources.title')} href="/lifetime-income">
          <div className="font-serif text-3xl font-bold text-[var(--ink)] mb-2">
            {(salary > 0 ? 1 : 0) + (side > 0 ? 1 : 0)}
          </div>
          {salary + side > 0 ? (
            <>
              <div className="flex h-3 rounded-full overflow-hidden mb-2" dir="ltr">
                <div style={{ width: `${(salary / (salary + side)) * 100}%`, background: 'var(--green)' }} />
                {side > 0 && <div style={{ width: `${(side / (salary + side)) * 100}%`, background: 'var(--blue)' }} />}
              </div>
              <div className="space-y-1 text-xs text-[var(--ink-2)]">
                <div className="flex justify-between gap-2">
                  <span><span className="inline-block w-2 h-2 rounded-full me-1.5" style={{ background: 'var(--green)' }} />Employer salary</span>
                  <span className="font-medium">{money(salary)}</span>
                </div>
                {side > 0 && (
                  <div className="flex justify-between gap-2">
                    <span><span className="inline-block w-2 h-2 rounded-full me-1.5" style={{ background: 'var(--blue)' }} />Side income</span>
                    <span className="font-medium">{money(side)}</span>
                  </div>
                )}
              </div>
              {side === 0 && (
                <p className="text-[11px] text-[var(--gold-text-alt)] mt-2">⚠ Everything rides on one source.</p>
              )}
            </>
          ) : (
            <p className="text-xs text-[var(--muted)]">Set your income in Edit Profile.</p>
          )}
        </Card>

        <Card title={t('today.debt.title')} href="/commitments">
          <div className="font-serif text-2xl font-bold text-[var(--ink)] mb-3">{money(liabilities)}</div>
          <Gauge label={t('today.debt.vsIncome')} pct={debtVsIncome} />
          <Gauge label={t('today.debt.vsAssets')} pct={debtVsAssets} />
        </Card>

        <Card title={t('today.risks.title')} href="/risks">
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
          <div className="h-32" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke="var(--chart-grid)" />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 9, fill: 'var(--muted)' }} />
                <Radar dataKey="score" stroke="var(--red)" fill="var(--red)" fillOpacity={0.25} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          {highRisks[0] && (
            <p className="text-[11px] text-[var(--ink-2)] truncate" title={highRisks[0].finding}>
              {highRisks[0].icon} {highRisks[0].title}
            </p>
          )}
        </Card>
      </div>

      {/* ── Row 3: plan + pace ── */}
      <div className="grid lg:grid-cols-2 gap-3">
        <Card title={t('today.plan.title')} href="/goal-fund">
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

        <Card title={t('today.pace.title')} href="/velocity">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="font-serif text-2xl font-bold" style={{ color: nwPace >= 0 ? 'var(--green-dark)' : 'var(--red-2)' }}>
                {nwPace >= 0 ? '+' : '−'}{money(Math.abs(nwPace))}
              </div>
              <div className="text-[10px] text-[var(--muted)] mb-1.5">{t('today.pace.perMonth')}</div>
              {monthsToMilestone != null && Number.isFinite(monthsToMilestone) && (
                <p className="text-[11px] text-[var(--ink-2)]">
                  ≈ <strong>{Math.ceil(monthsToMilestone)} months</strong> to {moneyC(milestone)}
                </p>
              )}
            </div>
            <div className="h-16 w-36 shrink-0" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={nwSeries}>
                  <Area dataKey="v" stroke="var(--green)" strokeWidth={2} fill="var(--green)" fillOpacity={0.15} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Row 4: the road to financial freedom ── */}
      {freedom && (
        <div className="bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <div className="text-[10px] tracking-[0.12em] uppercase text-[var(--gold)]">
              🕊 {t('today.freedom.title')}
            </div>
            <div className="text-[10px] text-white/50">
              4% rule · {liveIsUsed ? 'live portfolio' : 'latest ledger'}
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
  function Card({ title, href, className = '', children }: { title: string; href: string; className?: string; children: React.ReactNode }) {
    return (
      <div className={`bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-4 ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] tracking-[0.08em] uppercase text-[var(--muted)]">{title}</div>
          <Link href={href} className="text-[var(--muted)] hover:text-[var(--green-dark)] text-xs">→</Link>
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

// ── The A→B→C→D quadrant map ─────────────────────────────────────────────
// Horseshoe path: A (top-left) ↓ B (bottom-left) → C (bottom-right) ↑ D
// (top-right) — the usual progression as finances mature toward surplus.
function QuadrantMap({ active }: { active: QuadKey | null }) {
  const cells: { key: QuadKey; x: number; y: number }[] = [
    { key: 'A', x: 2, y: 2 },
    { key: 'B', x: 2, y: 122 },
    { key: 'C', x: 170, y: 122 },
    { key: 'D', x: 170, y: 2 },
  ];
  const W = 148, H = 96;
  return (
    <svg viewBox="0 0 320 220" className="w-full">
      <defs>
        <marker id="qArrow" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--gold-2)" />
        </marker>
      </defs>

      {cells.map(({ key, x, y }) => {
        const q = QUADS[key];
        const isActive = active === key;
        return (
          <g key={key}>
            <rect
              x={x} y={y} width={W} height={H} rx={12}
              fill={isActive ? 'var(--green-bg)' : 'var(--surface-1)'}
              stroke={isActive ? 'var(--green)' : 'var(--border-default)'}
              strokeWidth={isActive ? 1.8 : 1}
            />
            {/* step letter */}
            <circle cx={x + 18} cy={y + 18} r={10} fill={isActive ? 'var(--green)' : 'var(--surface-card)'} stroke={isActive ? 'var(--green)' : 'var(--border-medium)'} />
            <text x={x + 18} y={y + 22} textAnchor="middle" fontSize="11" fontWeight="700" fill={isActive ? '#fff' : 'var(--muted)'}>
              {key}
            </text>
            {/* title + mood */}
            <text x={x + 34} y={y + 22} fontSize="11" fontWeight="600" fill="var(--ink)">{q.title}</text>
            <text x={x + 12} y={y + 42} fontSize="8.5" fill="var(--muted)">{q.mood}</text>
            {/* mini income vs outflow bars */}
            <rect x={x + 14} y={y + H - 14 - q.incomeH} width={13} height={q.incomeH} rx={2} fill="var(--green)" />
            <rect x={x + 31} y={y + H - 14 - q.outflowH} width={13} height={q.outflowH} rx={2} fill="var(--red-2)" opacity={0.85} />
            <text x={x + 14} y={y + H - 4} fontSize="7" fill="var(--muted)">in</text>
            <text x={x + 31} y={y + H - 4} fontSize="7" fill="var(--muted)">out</text>
            {/* you-are-here */}
            {isActive && (
              <g>
                <circle cx={x + W - 18} cy={y + H - 18} r={5} fill="var(--green)" />
                <circle cx={x + W - 18} cy={y + H - 18} r={9} fill="none" stroke="var(--green)" opacity={0.4}>
                  <animate attributeName="r" values="6;11;6" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
                </circle>
              </g>
            )}
          </g>
        );
      })}

      {/* progression arrows A→B→C→D (the usual path as finances mature) */}
      <line x1={76} y1={101} x2={76} y2={117} stroke="var(--gold-2)" strokeWidth={1.6} markerEnd="url(#qArrow)" />
      <line x1={153} y1={170} x2={167} y2={170} stroke="var(--gold-2)" strokeWidth={1.6} markerEnd="url(#qArrow)" />
      <line x1={244} y1={119} x2={244} y2={103} stroke="var(--gold-2)" strokeWidth={1.6} markerEnd="url(#qArrow)" />
    </svg>
  );
}
