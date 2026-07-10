'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { firstNameOf } from '@/lib/name';
import UnderstandPositioning from './UnderstandPositioning';

type PageMode = 'log' | 'understand';

interface NetWorthRow {
  year: number;
  amount: number;
}

export default function PositioningPage() {
  const router = useRouter();
  const supabase = createClient();
  const [rows, setRows] = useState<NetWorthRow[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [newAmount, setNewAmount] = useState('');
  const [mode, setMode] = useState<PageMode>('log');

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single();
    if (profile?.name) setName(firstNameOf(profile.name));

    const { data } = await supabase
      .from('net_worth_snapshots')
      .select('year, amount')
      .eq('user_id', user.id)
      .order('year', { ascending: true });

    if (data) setRows(data as NetWorthRow[]);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function addSnapshot() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const amount = parseFloat(newAmount.replace(/[^0-9.]/g, ''));
    if (!amount) return;

    const { error } = await supabase.from('net_worth_snapshots').upsert(
      { user_id: user.id, year: newYear, amount },
      { onConflict: 'user_id,year' }
    );
    if (!error) {
      setNewAmount('');
      loadData();
    }
  }

  const chartData = rows.map((r) => ({ year: r.year, you: r.amount }));

  if (loading) {
    return <div className="text-sm text-[#898781]">Loading your positioning…</div>;
  }

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-[#141414] mb-1">
        Financial Positioning
      </h1>
      <p className="text-sm text-[#3D3D3A] mb-6 max-w-xl">
        {name ? `${name}'s` : 'Your'} real net worth history, logged by you.
      </p>

      <div className="inline-flex border border-black/10 rounded-lg overflow-hidden mb-6">
        <button
          onClick={() => setMode('log')}
          className={`px-4 py-2 text-xs font-medium ${mode === 'log' ? 'bg-[#141414] text-white' : 'bg-white text-[#3D3D3A]'}`}
        >
          Log your net worth
        </button>
        <button
          onClick={() => setMode('understand')}
          className={`px-4 py-2 text-xs font-medium ${mode === 'understand' ? 'bg-[#141414] text-white' : 'bg-white text-[#3D3D3A]'}`}
        >
          Understand your positioning
        </button>
      </div>

      {mode === 'understand' && <UnderstandPositioning />}

      {mode === 'log' && (
      <>
      {/* add a real snapshot */}
      <div className="bg-white border border-black/10 rounded-2xl p-5 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-[#898781] block mb-1">Year</label>
          <input
            type="number"
            value={newYear}
            onChange={(e) => setNewYear(parseInt(e.target.value) || newYear)}
            className="w-24 border border-black/10 rounded-lg px-3 py-2 text-sm outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-[#898781] block mb-1">
            Net worth (SAR)
          </label>
          <input
            type="text"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            placeholder="e.g. 250,000"
            className="w-40 border border-black/10 rounded-lg px-3 py-2 text-sm outline-none"
          />
        </div>
        <button
          onClick={addSnapshot}
          className="text-sm bg-[#085041] text-white rounded-lg px-4 py-2 font-medium"
        >
          Save snapshot
        </button>
      </div>

      {chartData.length === 0 ? (
        <div className="bg-white border border-black/10 rounded-2xl p-8 text-center text-sm text-[#898781]">
          Add a net worth snapshot above to see your real positioning chart.
        </div>
      ) : (
        <>
          <div className="bg-white border border-black/10 rounded-2xl p-6 mb-6">
            <div className="text-sm font-medium text-[#141414] mb-1">
              Net worth over time
            </div>
            <div className="text-xs text-[#898781] mb-4">
              Your real logged snapshots
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid stroke="#ececE6" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#898781' }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#898781' }}
                    tickFormatter={(v) =>
                      v >= 1000000
                        ? `${(v / 1000000).toFixed(1)}M`
                        : `${Math.round(v / 1000)}K`
                    }
                  />
                  <Tooltip
                    formatter={(value) => `SAR ${Number(value).toLocaleString()}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="you"
                    name="You"
                    stroke="#1D9E75"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="text-xs text-[#898781]">
            Want to see how this compares to peers? Check the{' '}
            <button onClick={() => setMode('understand')} className="text-[#085041] font-medium">
              Understand your positioning
            </button>{' '}
            tab.
          </div>
        </>
      )}
      </>
      )}
    </div>
  );
}
