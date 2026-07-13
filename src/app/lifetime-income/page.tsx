'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import UnderstandView from './UnderstandView';
import IncomeAhead from './IncomeAhead';

type PageMode = 'log' | 'understand' | 'ahead';

interface IncomeEntry {
  id: string;
  year: number;
  month: number;
  income: number;
  spending: number;
}

function fmt(n: number) {
  return Math.round(n).toLocaleString();
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function LifetimeIncomePage() {
  const router = useRouter();
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [entries, setEntries] = useState<IncomeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<PageMode>('log');

  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [income, setIncome] = useState('');
  const [spending, setSpending] = useState('');

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setUserId(user.id);

    const { data } = await supabase
      .from('income_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('year', { ascending: true })
      .order('month', { ascending: true });

    if (data) setEntries(data as IncomeEntry[]);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function addEntry() {
    if (!userId) return;
    const incomeNum = parseFloat(income.replace(/[^0-9.]/g, '')) || 0;
    const spendingNum = parseFloat(spending.replace(/[^0-9.]/g, '')) || 0;
    if (!incomeNum) return;

    const { error } = await supabase.from('income_entries').upsert(
      { user_id: userId, year, month, income: incomeNum, spending: spendingNum },
      { onConflict: 'user_id,year,month' }
    );
    if (!error) {
      setIncome('');
      setSpending('');
      load();
    }
  }

  const totalIncome = entries.reduce((s, e) => s + e.income, 0);
  const totalSpending = entries.reduce((s, e) => s + e.spending, 0);
  const totalKept = totalIncome - totalSpending;
  const keptPct = totalIncome > 0 ? (totalKept / totalIncome) * 100 : 0;

  let cumIncome = 0;
  let cumKept = 0;
  const chartData = entries.map((e) => {
    cumIncome += e.income;
    cumKept += e.income - e.spending;
    return {
      label: `${MONTH_NAMES[e.month - 1]} ${e.year}`,
      cumulativeIncome: cumIncome,
      cumulativeKept: cumKept,
    };
  });

  const yearTotals = Object.values(
    entries.reduce((acc, e) => {
      acc[e.year] = acc[e.year] || { year: e.year, income: 0, spending: 0 };
      acc[e.year].income += e.income;
      acc[e.year].spending += e.spending;
      return acc;
    }, {} as Record<number, { year: number; income: number; spending: number }>)
  );

  if (loading) {
    return <div className="text-sm text-[var(--muted)]">Loading your income history…</div>;
  }

  return (
    <div>
      <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--blue)] font-semibold mb-1">
        Think
      </div>
      <h1 className="font-serif text-2xl font-semibold text-[var(--ink)] mb-1">
        Lifetime Income
      </h1>
      <p className="text-sm text-[var(--ink-2)] mb-6 max-w-xl">
        Every riyal you&apos;ve earned, logged month by month, and how much
        actually stayed with you.
      </p>

      <div className="inline-flex border border-[var(--border-default)] rounded-lg overflow-hidden mb-6">
        <button
          onClick={() => setMode('log')}
          className={`px-4 py-2 text-xs font-medium ${mode === 'log' ? 'bg-[var(--ink)] text-[var(--surface-0)]' : 'bg-[var(--surface-card)] text-[var(--ink-2)]'}`}
        >
          Log your real income
        </button>
        <button
          onClick={() => setMode('understand')}
          className={`px-4 py-2 text-xs font-medium ${mode === 'understand' ? 'bg-[var(--ink)] text-[var(--surface-0)]' : 'bg-[var(--surface-card)] text-[var(--ink-2)]'}`}
        >
          Understand your lifetime income
        </button>
        <button
          onClick={() => setMode('ahead')}
          className={`px-4 py-2 text-xs font-medium ${mode === 'ahead' ? 'bg-[var(--ink)] text-[var(--surface-0)]' : 'bg-[var(--surface-card)] text-[var(--ink-2)]'}`}
        >
          Money on the way
        </button>
      </div>

      {mode === 'understand' && <UnderstandView />}

      {mode === 'ahead' && <IncomeAhead />}

      {mode === 'log' && (
      <>
      {/* log entry */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-[var(--muted)] block mb-1">Year</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value) || year)}
            className="w-24 border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-[var(--muted)] block mb-1">Month</label>
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm outline-none"
          >
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-[var(--muted)] block mb-1">Income (SAR)</label>
          <input
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            placeholder="e.g. 12,000"
            className="w-36 border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-[var(--muted)] block mb-1">Spending (SAR)</label>
          <input
            value={spending}
            onChange={(e) => setSpending(e.target.value)}
            placeholder="e.g. 8,500"
            className="w-36 border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm outline-none"
          />
        </div>
        <button
          onClick={addEntry}
          className="text-sm bg-[var(--green-dark)] text-white rounded-lg px-4 py-2 font-medium"
        >
          Log this month
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-8 text-center text-sm text-[var(--muted)]">
          Log your first month above to see your lifetime income build up.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] rounded-xl p-4 text-white">
              <div className="text-[10px] text-[var(--gold)] mb-1">Total earned</div>
              <div className="font-serif text-lg font-bold">SAR {fmt(totalIncome)}</div>
            </div>
            <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-4">
              <div className="text-[10px] text-[var(--muted)] mb-1">Total kept</div>
              <div className="font-serif text-lg font-bold">SAR {fmt(totalKept)}</div>
            </div>
            <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-4">
              <div className="text-[10px] text-[var(--muted)] mb-1">Kept rate</div>
              <div className="font-serif text-lg font-bold">{keptPct.toFixed(1)}%</div>
            </div>
          </div>

          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 mb-6">
            <div className="text-sm font-medium mb-1">Cumulative income vs kept</div>
            <div className="text-xs text-[var(--muted)] mb-4">Real, logged data over time</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid stroke="var(--chart-grid)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} tickFormatter={(v) => `${Math.round(v/1000)}K`} />
                  <Tooltip formatter={(v) => `SAR ${Number(v).toLocaleString()}`} />
                  <Line type="monotone" dataKey="cumulativeIncome" name="Cumulative income" stroke="var(--chart-neutral-1)" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="cumulativeKept" name="Cumulative kept" stroke="var(--green)" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6">
            <div className="text-sm font-medium mb-1">By year</div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearTotals}>
                  <CartesianGrid stroke="var(--chart-grid)" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--muted)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} tickFormatter={(v) => `${Math.round(v/1000)}K`} />
                  <Tooltip formatter={(v) => `SAR ${Number(v).toLocaleString()}`} />
                  <Bar dataKey="income" name="Income" fill="var(--chart-neutral-1)" radius={[4,4,0,0]} />
                  <Bar dataKey="spending" name="Spending" fill="var(--gold-2)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
      </>
      )}
    </div>
  );
}
