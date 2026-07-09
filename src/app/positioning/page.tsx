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
  Legend,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';

interface NetWorthRow {
  year: number;
  amount: number;
}

// Illustrative reference lines until we have enough real aggregate user data
// to compute these from actual MalMind users. National-average and
// higher-peer figures are placeholders for context, clearly not the
// logged-in user's own data.
const REFERENCE_MULTIPLIERS = { nationalAverage: 0.75, higherPeer: 6 };

export default function PositioningPage() {
  const router = useRouter();
  const supabase = createClient();
  const [rows, setRows] = useState<NetWorthRow[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [newAmount, setNewAmount] = useState('');

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
    if (profile?.name) setName(profile.name);

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

  const chartData = rows.map((r) => ({
    year: r.year,
    you: r.amount,
    nationalAverage: Math.round(r.amount * REFERENCE_MULTIPLIERS.nationalAverage),
    higherPeer: Math.round(r.amount * REFERENCE_MULTIPLIERS.higherPeer),
  }));

  const latest = chartData[chartData.length - 1];
  const gap = latest ? latest.nationalAverage - latest.you : 0;
  const isAhead = gap < 0;

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
              Your real logged snapshots, with illustrative reference lines
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
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    type="monotone"
                    dataKey="you"
                    name="You"
                    stroke="#8a99a8"
                    strokeWidth={3}
                  />
                  <Line
                    type="monotone"
                    dataKey="nationalAverage"
                    name="National average (illustrative)"
                    stroke="#2a78d6"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                  />
                  <Line
                    type="monotone"
                    dataKey="higherPeer"
                    name="Higher peer (illustrative)"
                    stroke="#141414"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div
            className={`rounded-xl p-5 border ${
              isAhead
                ? 'bg-[#E1F5EE] border-[#5DCAA5]'
                : 'bg-[#FBE9EC] border-[#E5A0AC]'
            }`}
          >
            <div className="font-serif text-lg font-medium text-[#141414] mb-1">
              {isAhead
                ? `You're ahead of the illustrative national average by SAR ${Math.abs(
                    gap
                  ).toLocaleString()}.`
                : `You're behind the illustrative national average by SAR ${Math.abs(
                    gap
                  ).toLocaleString()}.`}
            </div>
            <div className="text-sm text-[#3D3D3A]">
              The reference lines are placeholders until MalMind has enough
              real aggregate user data to compute genuine averages. Your own
              line is 100% real, from what you've logged.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
