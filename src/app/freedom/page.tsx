'use client';

// Financial Freedom — the dedicated tool. Financial freedom is the point where
// the yield on your invested capital covers your recurring expenses, so working
// becomes a choice. This page shows your live reading, then lets you drag four
// levers (spending, monthly investing, expected return, withdrawal rate) and
// watch your freedom number and the year your capital crosses it move in real
// time. Seeded from your real data; the sandbox itself isn't saved.

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ResponsiveContainer, ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Legend,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { computeFreedom, projectFreedomPath } from '@/lib/financialFreedom';
import { loadHoldings, valueHoldings } from '@/lib/livePortfolio';

const MONTHS_BACK = 6;

function fmt(n: number) {
  return Math.round(n).toLocaleString();
}
function fmtCompact(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${(n / 1e6).toFixed(abs >= 1e7 ? 0 : 1)}M`;
  if (abs >= 1e3) return `${Math.round(n / 1e3)}K`;
  return String(Math.round(n));
}
function avg(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

interface Seed {
  spend: number;
  pace: number;
  invested: number;
  liveUsed: boolean;
}

export default function FreedomPage() {
  const router = useRouter();
  const supabase = createClient();
  const { t, locale } = useLocale();

  const [seed, setSeed] = useState<Seed | null>(null);
  const [loading, setLoading] = useState(true);

  // sandbox levers
  const [spend, setSpend] = useState(0);
  const [pace, setPace] = useState(0);
  const [growthPct, setGrowthPct] = useState(6);
  const [wrPct, setWrPct] = useState(4);

  const sar = t('common.sar');
  const money = (n: number) => (locale === 'ar' ? `${fmt(n)} ${sar}` : `${sar} ${fmt(n)}`);
  const moneyC = (n: number) => (locale === 'ar' ? `${fmtCompact(n)} ${sar}` : `${sar} ${fmtCompact(n)}`);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const [profileRes, snapsRes] = await Promise.all([
        supabase.from('profiles').select('monthly_expense, monthly_income').eq('id', user.id).single(),
        supabase.from('financial_snapshots')
          .select('year, month, stocks, equity, income, expenses')
          .eq('user_id', user.id).order('year', { ascending: true }).order('month', { ascending: true }),
      ]);
      const snaps = (snapsRes.data as { year: number; month: number; stocks: number; equity: number; income: number; expenses: number }[]) ?? [];
      const last6 = snaps.slice(-MONTHS_BACK);
      const profile = profileRes.data as { monthly_expense: number | null; monthly_income: number | null } | null;

      const spendSeed = last6.length ? avg(last6.map((s) => Number(s.expenses))) : Number(profile?.monthly_expense) || 0;

      // investing pace: avg monthly change in stocks+equity across recent months
      const tail = snaps.slice(-13);
      const invDeltas: number[] = [];
      for (let i = 1; i < tail.length; i++) {
        invDeltas.push(Number(tail[i].stocks) + Number(tail[i].equity) - Number(tail[i - 1].stocks) - Number(tail[i - 1].equity));
      }
      const paceSeed = invDeltas.length
        ? Math.max(0, avg(invDeltas))
        : Math.max(0, (last6.length ? avg(last6.map((s) => Number(s.income))) : 0) - spendSeed);

      const latest = snaps[snaps.length - 1];
      let invested = latest ? Number(latest.stocks) + Number(latest.equity) : 0;
      let liveUsed = false;
      try {
        const holdings = await loadHoldings(user.id);
        if (holdings.length > 0) {
          const pv = await valueHoldings(holdings);
          if (pv.total > 0) { invested = pv.total; liveUsed = true; }
        }
      } catch { /* fine without */ }

      setSeed({ spend: spendSeed, pace: paceSeed, invested, liveUsed });
      setSpend(Math.round(spendSeed));
      setPace(Math.round(paceSeed));
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const invested = seed?.invested ?? 0;

  const reading = useMemo(
    () => computeFreedom({
      avgMonthlyExpenses: spend,
      investedNow: invested,
      monthlyInvestPace: pace,
      withdrawalRate: wrPct / 100,
      annualGrowth: growthPct / 100,
    }),
    [spend, invested, pace, wrPct, growthPct]
  );

  const path = useMemo(
    () => projectFreedomPath({
      avgMonthlyExpenses: spend,
      investedNow: invested,
      monthlyInvestPace: pace,
      withdrawalRate: wrPct / 100,
      annualGrowth: growthPct / 100,
    }),
    [spend, invested, pace, wrPct, growthPct]
  );

  function resetToMine() {
    if (!seed) return;
    setSpend(Math.round(seed.spend));
    setPace(Math.round(seed.pace));
    setGrowthPct(6);
    setWrPct(4);
  }

  function askBrain() {
    try {
      window.sessionStorage.setItem('mm-ask', 'What is my financial freedom number, and the fastest realistic path to reach it given my spending and investing?');
    } catch {}
    router.push('/advisor');
  }

  if (loading || !reading) {
    return <div className="text-sm text-[var(--muted)]">{t('common.loading')}</div>;
  }

  const mult = Math.round(1 / (wrPct / 100));
  const etaText = reading.monthsToFreedom == null
    ? t('freedom.etaNever')
    : reading.monthsToFreedom === 0
      ? t('freedom.today')
      : `${reading.etaYear}`;
  const etaYears = reading.monthsToFreedom != null ? Math.max(0, Math.round(reading.monthsToFreedom / 12)) : null;

  const spendMax = Math.max(50000, Math.ceil((seed?.spend ?? 0) * 2 / 5000) * 5000);
  const paceMax = Math.max(20000, Math.ceil((seed?.pace ?? 0) * 3 / 1000) * 1000);
  const freedomFromSpendDrop = (1000 * 12) / (wrPct / 100); // freedom-number impact of SAR 1k/mo less

  return (
    <div className="max-w-3xl">
      <div className="text-[10px] tracking-[0.12em] uppercase text-[var(--gold)] mb-1">🕊 {t('nav.future')}</div>
      <h1 className="font-serif text-3xl font-semibold text-[var(--ink)] mb-1">{t('freedom.title')}</h1>
      <p className="text-sm text-[var(--ink-2)] mb-6 max-w-2xl">{t('freedom.tagline')}</p>

      {spend <= 0 ? (
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 text-sm text-[var(--muted)]">
          {t('freedom.needData')}
        </div>
      ) : (
        <>
          {/* ── hero: the number + the road ── */}
          <div className="bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] rounded-2xl p-6 text-white mb-4">
            <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
              <div>
                <div className="text-[10px] tracking-[0.12em] uppercase text-[var(--gold)] mb-1">{t('freedom.number')}</div>
                <div className="font-serif text-4xl font-bold">{money(reading.freedomNumber)}</div>
                <div className="text-[11px] text-white/50 mt-1">{t('freedom.numberSub', { mult, rate: wrPct })}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] tracking-[0.12em] uppercase text-[var(--gold)] mb-1">{t('freedom.eta')}</div>
                <div className="font-serif text-3xl font-bold">{etaText}</div>
                {etaYears != null && etaYears > 0 && (
                  <div className="text-[11px] text-white/50 mt-1">{t('freedom.inYears', { n: etaYears })}</div>
                )}
              </div>
            </div>

            {/* the road */}
            <div className="relative h-7 mb-1" dir="ltr">
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2.5 rounded-full bg-white/10" />
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 h-2.5 rounded-full"
                style={{ width: `${Math.max(1.5, reading.progress * 100)}%`, background: 'linear-gradient(90deg, var(--green), #7FE8C4)' }}
              />
              {[25, 50, 75].map((p) => (
                <div key={p} className="absolute top-1/2 -translate-y-1/2 w-px h-4 bg-white/25" style={{ left: `${p}%` }} />
              ))}
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-base" style={{ left: `${Math.max(1.5, reading.progress * 100)}%` }}>🚶</div>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 text-base">🏁</div>
            </div>
            <div className="text-right text-[11px] text-white/60 mb-4">
              {t('freedom.progressLabel', { pct: (reading.progress * 100).toFixed(1) })}
            </div>

            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10">
              <HeroStat label={t('freedom.capital')} value={moneyC(reading.investedNow)} sub={seed?.liveUsed ? 'live' : undefined} />
              <HeroStat label={t('freedom.passiveNow')} value={`${moneyC(reading.passiveMonthlyNow)}/mo`} />
              <HeroStat label={t('freedom.gap')} value={moneyC(reading.gap)} />
            </div>
          </div>

          {/* ── the projection chart ── */}
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
            <div className="text-sm font-medium text-[var(--ink)] mb-3">{t('freedom.chartTitle')}</div>
            <div className="h-64" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={path.points} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="capFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--green)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--green)" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} tickFormatter={fmtCompact} width={40} axisLine={false} tickLine={false} />
                  <Tooltip labelFormatter={(v) => `${v}`} formatter={(v) => [`SAR ${fmt(Number(v))}`, t('freedom.capitalLine')]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine
                    y={reading.freedomNumber}
                    stroke="var(--gold-2)" strokeWidth={2} strokeDasharray="5 4"
                    label={{ value: `${t('freedom.freedomLine')} · ${moneyC(reading.freedomNumber)}`, position: 'insideTopRight', fontSize: 10, fill: 'var(--gold-2)' }}
                  />
                  {path.crossYear != null && (
                    <ReferenceLine
                      x={path.crossYear}
                      stroke="var(--green)" strokeWidth={1.5} strokeDasharray="3 3"
                      label={{ value: t('freedom.freeAt', { year: path.crossYear }), position: 'top', fontSize: 10, fill: 'var(--green-dark)' }}
                    />
                  )}
                  <Area type="monotone" dataKey="capital" name={t('freedom.capitalLine')} stroke="var(--green)" strokeWidth={2.5} fill="url(#capFill)" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── the sandbox ── */}
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="text-sm font-medium text-[var(--ink)]">{t('freedom.sandbox')}</div>
              <button onClick={resetToMine} className="text-xs text-[var(--green-dark)] font-medium">{t('freedom.reset')}</button>
            </div>
            <p className="text-xs text-[var(--muted)] mb-4">{t('freedom.sandboxNote')}</p>

            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
              <Lever label={t('freedom.spend')} value={money(spend)} min={0} max={spendMax} step={500} raw={spend} onChange={setSpend} />
              <Lever label={t('freedom.pace')} value={`${money(pace)}/mo`} min={0} max={paceMax} step={250} raw={pace} onChange={setPace} />
              <Lever label={t('freedom.growth')} value={`${growthPct.toFixed(1)}%`} min={0} max={12} step={0.5} raw={growthPct} onChange={setGrowthPct} />
              <Lever label={t('freedom.wr')} value={`${wrPct.toFixed(2)}%`} min={2} max={6} step={0.25} raw={wrPct} onChange={setWrPct} />
            </div>
          </div>

          {/* ── the two levers, explained ── */}
          <div className="mb-4">
            <div className="text-[11px] tracking-[0.1em] uppercase text-[var(--muted)] mb-3">{t('freedom.leversTitle')}</div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-4">
                <div className="text-sm font-semibold text-[var(--ink)] mb-1">✂️ {t('freedom.leverSpend')}</div>
                <p className="text-xs text-[var(--ink-2)] leading-relaxed">{t('freedom.leverSpendBody', { amt: money(freedomFromSpendDrop) })}</p>
              </div>
              <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-4">
                <div className="text-sm font-semibold text-[var(--ink)] mb-1">📈 {t('freedom.leverInvest')}</div>
                <p className="text-xs text-[var(--ink-2)] leading-relaxed">{t('freedom.leverInvestBody')}</p>
              </div>
            </div>
          </div>

          <button
            onClick={askBrain}
            className="w-full text-center text-sm font-semibold bg-[var(--green-dark)] text-white rounded-xl px-4 py-3"
          >
            {t('freedom.askBrain')}
          </button>
        </>
      )}
    </div>
  );
}

function HeroStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-[10px] text-white/50 mb-0.5">
        {label}{sub ? <span className="text-[var(--gold)]"> · {sub}</span> : null}
      </div>
      <div className="font-serif text-lg font-bold">{value}</div>
    </div>
  );
}

function Lever({
  label, value, min, max, step, raw, onChange,
}: {
  label: string; value: string; min: number; max: number; step: number; raw: number; onChange: (n: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <label className="text-xs text-[var(--ink-2)]">{label}</label>
        <span className="text-sm font-semibold text-[var(--ink)] font-serif">{value}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={Math.min(max, Math.max(min, raw))}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--green)] cursor-pointer"
      />
    </div>
  );
}
