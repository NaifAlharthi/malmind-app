'use client';

// "Money on the way": how much of this year's income is still ahead of
// you, month by month until December - by source - and what realistically
// survives it under three consumption scenarios (lean / current pace /
// heavy), because nobody keeps 100% of what's coming.

import { useEffect, useMemo, useState } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { useProfileContext } from '@/components/shared/AppShell';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmt(n: number) {
  return Math.round(n).toLocaleString();
}

export default function IncomeAhead() {
  const supabase = createClient();
  const { openEditProfile } = useProfileContext();
  const [loading, setLoading] = useState(true);
  const [salary, setSalary] = useState(0);
  const [sideIncome, setSideIncome] = useState(0);
  const [avgSpend, setAvgSpend] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: profile }, { data: entries }] = await Promise.all([
        supabase.from('profiles').select('monthly_income, side_income, monthly_expense').eq('id', user.id).single(),
        supabase.from('income_entries').select('year, month, spending').eq('user_id', user.id).order('year', { ascending: true }).order('month', { ascending: true }),
      ]);

      setSalary(Number(profile?.monthly_income) || 0);
      setSideIncome(Number(profile?.side_income) || 0);

      const recent = (entries ?? []).slice(-6).map((e) => Number(e.spending)).filter((v) => v > 0);
      if (recent.length > 0) setAvgSpend(recent.reduce((a, b) => a + b, 0) / recent.length);
      else if (profile?.monthly_expense != null && Number(profile.monthly_expense) > 0) setAvgSpend(Number(profile.monthly_expense));
      else setAvgSpend(null);

      setLoading(false);
    })();
  }, [supabase]);

  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const monthIdx = now.getMonth(); // 0-based; current month counts as "ahead"
  const monthsAhead = 12 - monthIdx;

  const totalMonthly = salary + sideIncome;
  const aheadTotal = totalMonthly * monthsAhead;
  const annualTotal = totalMonthly * 12;
  const receivedSoFar = totalMonthly * monthIdx;

  const scenarios = useMemo(() => {
    if (avgSpend == null || totalMonthly <= 0) return null;
    const make = (label: string, spend: number, note: string) => ({
      label,
      spend,
      keptMonthly: Math.max(0, totalMonthly - spend),
      keptByDec: Math.max(0, totalMonthly - spend) * monthsAhead,
      note,
    });
    return [
      make('Lean months', avgSpend * 0.85, 'spending 15% below your average'),
      make('Your current pace', avgSpend, 'your real average spending'),
      make('Heavy months', avgSpend * 1.15, 'spending 15% above your average'),
    ];
  }, [avgSpend, totalMonthly, monthsAhead]);

  const chartData = useMemo(() => {
    let cumIn = 0;
    let cumLean = 0, cumCurrent = 0, cumHeavy = 0;
    return MONTHS.map((label, i) => {
      cumIn += totalMonthly;
      const isAhead = i >= monthIdx;
      if (isAhead && scenarios) {
        cumLean += scenarios[0].keptMonthly;
        cumCurrent += scenarios[1].keptMonthly;
        cumHeavy += scenarios[2].keptMonthly;
      }
      return {
        label,
        incoming: isAhead ? totalMonthly : 0,
        received: isAhead ? 0 : totalMonthly,
        cumulativeIncome: cumIn,
        keptLean: isAhead && scenarios ? Math.round(cumLean) : null,
        keptCurrent: isAhead && scenarios ? Math.round(cumCurrent) : null,
        keptHeavy: isAhead && scenarios ? Math.round(cumHeavy) : null,
      };
    });
  }, [totalMonthly, monthIdx, scenarios]);

  if (loading) {
    return <div className="text-sm text-[var(--muted)]">Loading…</div>;
  }

  if (!totalMonthly) {
    return (
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-8 text-center">
        <p className="text-sm text-[var(--ink-2)] mb-4">Set your monthly income to see what&apos;s still on the way this year.</p>
        <button onClick={openEditProfile} className="text-sm bg-[var(--green-dark)] text-white rounded-lg px-4 py-2 font-medium">
          Set your income →
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* headline tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] rounded-xl p-4">
          <div className="text-[10px] text-[var(--gold)] mb-1">Still on the way in {currentYear}</div>
          <div className="font-serif text-xl font-bold text-white">SAR {fmt(aheadTotal)}</div>
          <div className="text-[10px] text-white/50 mt-0.5">{MONTHS[monthIdx]}–Dec · {monthsAhead} payment{monthsAhead === 1 ? '' : 's'}</div>
        </div>
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-4">
          <div className="text-[10px] text-[var(--muted)] mb-1">You bring in yearly</div>
          <div className="font-serif text-xl font-bold text-[var(--ink)]">SAR {fmt(annualTotal)}</div>
        </div>
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-4">
          <div className="text-[10px] text-[var(--muted)] mb-1">Already received this year</div>
          <div className="font-serif text-xl font-bold text-[var(--ink)]">SAR {fmt(receivedSoFar)}</div>
        </div>
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-4">
          <div className="text-[10px] text-[var(--muted)] mb-1">Arriving monthly</div>
          <div className="font-serif text-xl font-bold text-[var(--green-dark)]">SAR {fmt(totalMonthly)}</div>
        </div>
      </div>

      {/* sources */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-5">
        <div className="text-[11px] tracking-[0.1em] uppercase text-[var(--muted)] mb-3">Where the inflow comes from</div>
        <div className="flex flex-col gap-2">
          <SourceBar label="Salary" amount={salary} total={totalMonthly} color="#1D9E75" />
          {sideIncome > 0 ? (
            <SourceBar label="Side income" amount={sideIncome} total={totalMonthly} color="#4A78C4" />
          ) : (
            <p className="text-[11px] text-[var(--muted)]">
              100% of your inflow rides on one source. Add a side income in Edit Profile when it exists — and see the
              Risks page for why it matters.
            </p>
          )}
        </div>
      </div>

      {/* the chart */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-5">
        <div className="text-sm font-medium text-[var(--ink)] mb-1">{currentYear}, month by month</div>
        <div className="text-xs text-[var(--muted)] mb-3">
          Bars are payments — grey already landed, green still ahead. The lines show what realistically piles up from
          the money ahead under three spending scenarios.
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid stroke="var(--border-default)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}K`} />
              <Tooltip formatter={(v, name) => (v == null ? ['—', String(name)] : [`SAR ${fmt(Number(v))}`, String(name)])} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="received" name="Already received" stackId="in" fill="#8a99a8" radius={[3, 3, 0, 0]} />
              <Bar dataKey="incoming" name="Still ahead" stackId="in" fill="#1D9E75" radius={[3, 3, 0, 0]} />
              {scenarios && (
                <>
                  <Line type="monotone" dataKey="keptLean" name="Piled up — lean" stroke="#4A78C4" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="keptCurrent" name="Piled up — current pace" stroke="#D89A3E" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="keptHeavy" name="Piled up — heavy" stroke="#C0504D" strokeWidth={2} strokeDasharray="4 3" dot={false} />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* scenarios */}
      {scenarios ? (
        <div className="grid sm:grid-cols-3 gap-3 mb-5">
          {scenarios.map((s, i) => (
            <div key={s.label} className={`rounded-2xl p-5 border ${i === 1 ? 'border-[var(--green-border)] bg-[var(--green-bg)]' : 'border-[var(--border-default)] bg-[var(--surface-card)]'}`}>
              <div className="text-[11px] tracking-[0.08em] uppercase text-[var(--muted)] mb-2">{s.label}</div>
              <div className={`font-serif text-2xl font-bold mb-1 ${i === 1 ? 'text-[var(--green-dark)]' : 'text-[var(--ink)]'}`}>
                SAR {fmt(s.keptByDec)}
              </div>
              <div className="text-xs text-[var(--ink-2)] leading-relaxed">
                piled up by December — keeping SAR {fmt(s.keptMonthly)}/month with {s.note} (SAR {fmt(s.spend)}/mo).
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-5 text-xs text-[var(--muted)]">
          Log a few months of spending (here in the Log tab, or in My Financial Numbers) and this view adds three
          realistic keep-scenarios — because nobody keeps 100% of what&apos;s coming.
        </div>
      )}

      <div className="flex gap-3 items-start bg-[#FAF6EA] border border-[var(--gold)] rounded-xl p-4">
        <div className="w-7 h-7 rounded-full bg-[var(--gold)] flex items-center justify-center font-serif font-semibold text-white text-sm shrink-0">M</div>
        <div className="text-xs text-[#5A4A1A] leading-relaxed">
          <strong className="text-[#3A2F0A]">This is planning fuel.</strong> The money still ahead of you this year is
          the most decidable money you have — it hasn&apos;t arrived, so nothing has claimed it yet. Route it on
          purpose: a goal fund, an investment plan, a payoff push — before the months arrive and route it for you.
        </div>
      </div>
    </div>
  );
}

function SourceBar({ label, amount, total, color }: { label: string; amount: number; total: number; color: string }) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <div className="grid grid-cols-[90px_1fr_auto] gap-3 items-center">
      <span className="text-xs font-medium text-[var(--ink)]">{label}</span>
      <div className="h-5 bg-[var(--surface-1)] rounded overflow-hidden">
        <div className="h-full rounded flex items-center pl-2 text-[10px] text-white font-medium" style={{ width: `${Math.max(pct, 4)}%`, background: color }}>
          {pct > 20 ? `${pct.toFixed(0)}%` : ''}
        </div>
      </div>
      <span className="text-[11px] text-[var(--muted)] whitespace-nowrap">SAR {Math.round(amount).toLocaleString()}/mo</span>
    </div>
  );
}
