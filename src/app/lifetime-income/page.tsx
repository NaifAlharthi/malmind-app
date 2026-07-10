'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';

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
    return <div className="text-sm text-[#898781]">Loading your income history…</div>;
  }

  return (
    <div>
      <div className="text-[10px] tracking-[0.1em] uppercase text-[#4A78C4] font-semibold mb-1">
        Think
      </div>
      <h1 className="font-serif text-2xl font-semibold text-[#141414] mb-1">
        Lifetime Income
      </h1>
      <p className="text-sm text-[#3D3D3A] mb-6 max-w-xl">
        Every riyal you&apos;ve earned, logged month by month, and how much
        actually stayed with you.
      </p>

      {/* log entry */}
      <div className="bg-white border border-black/10 rounded-2xl p-5 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-[#898781] block mb-1">Year</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value) || year)}
            className="w-24 border border-black/10 rounded-lg px-3 py-2 text-sm outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-[#898781] block mb-1">Month</label>
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="border border-black/10 rounded-lg px-3 py-2 text-sm outline-none"
          >
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-[#898781] block mb-1">Income (SAR)</label>
          <input
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            placeholder="e.g. 12,000"
            className="w-36 border border-black/10 rounded-lg px-3 py-2 text-sm outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-[#898781] block mb-1">Spending (SAR)</label>
          <input
            value={spending}
            onChange={(e) => setSpending(e.target.value)}
            placeholder="e.g. 8,500"
            className="w-36 border border-black/10 rounded-lg px-3 py-2 text-sm outline-none"
          />
        </div>
        <button
          onClick={addEntry}
          className="text-sm bg-[#085041] text-white rounded-lg px-4 py-2 font-medium"
        >
          Log this month
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="bg-white border border-black/10 rounded-2xl p-8 text-center text-sm text-[#898781]">
          Log your first month above to see your lifetime income build up.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-gradient-to-br from-[#0F2A1E] to-[#0A1A12] rounded-xl p-4 text-white">
              <div className="text-[10px] text-[#C9A84C] mb-1">Total earned</div>
              <div className="font-serif text-lg font-bold">SAR {fmt(totalIncome)}</div>
            </div>
            <div className="bg-white border border-black/10 rounded-xl p-4">
              <div className="text-[10px] text-[#898781] mb-1">Total kept</div>
              <div className="font-serif text-lg font-bold">SAR {fmt(totalKept)}</div>
            </div>
            <div className="bg-white border border-black/10 rounded-xl p-4">
              <div className="text-[10px] text-[#898781] mb-1">Kept rate</div>
              <div className="font-serif text-lg font-bold">{keptPct.toFixed(1)}%</div>
            </div>
          </div>

          <div className="bg-white border border-black/10 rounded-2xl p-6 mb-6">
            <div className="text-sm font-medium mb-1">Cumulative income vs kept</div>
            <div className="text-xs text-[#898781] mb-4">Real, logged data over time</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid stroke="#ececE6" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#898781' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#898781' }} tickFormatter={(v) => `${Math.round(v/1000)}K`} />
                  <Tooltip formatter={(v) => `SAR ${Number(v).toLocaleString()}`} />
                  <Line type="monotone" dataKey="cumulativeIncome" name="Cumulative income" stroke="#8a99a8" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="cumulativeKept" name="Cumulative kept" stroke="#1D9E75" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border border-black/10 rounded-2xl p-6">
            <div className="text-sm font-medium mb-1">By year</div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearTotals}>
                  <CartesianGrid stroke="#ececE6" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#898781' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#898781' }} tickFormatter={(v) => `${Math.round(v/1000)}K`} />
                  <Tooltip formatter={(v) => `SAR ${Number(v).toLocaleString()}`} />
                  <Bar dataKey="income" name="Income" fill="#8a99a8" radius={[4,4,0,0]} />
                  <Bar dataKey="spending" name="Spending" fill="#D89A3E" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
