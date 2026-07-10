'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function fmt(n: number) {
  return Math.round(n).toLocaleString();
}

const MILESTONES = [50000, 100000, 250000, 500000, 1000000];

export default function VelocityPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [currentSavings, setCurrentSavings] = useState('0');
  const [saveRate, setSaveRate] = useState(20);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('monthly_income')
      .eq('id', user.id)
      .single();
    if (profile) setMonthlyIncome(profile.monthly_income || 0);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <div className="text-sm text-[#898781]">Loading…</div>;
  }

  const startingSavings = parseFloat(currentSavings.replace(/[^0-9.]/g, '')) || 0;
  const monthlySaved = monthlyIncome * (saveRate / 100);

  function monthsTo(target: number) {
    if (monthlySaved <= 0) return Infinity;
    const remaining = target - startingSavings;
    if (remaining <= 0) return 0;
    return Math.ceil(remaining / monthlySaved);
  }

  return (
    <div>
      <div className="text-[10px] tracking-[0.1em] uppercase text-[#4A78C4] font-semibold mb-1">
        Think
      </div>
      <h1 className="font-serif text-2xl font-semibold text-[#141414] mb-1">
        Velocity of Money
      </h1>
      <p className="text-sm text-[#3D3D3A] mb-6 max-w-xl">
        Wealth reframed as time — how many months until you reach each target,
        at your real pace.
      </p>

      <div className="bg-white border border-black/10 rounded-2xl p-6 mb-6">
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-[#898781] block mb-1">Monthly income (SAR)</label>
            <div className="text-sm font-medium py-2">{fmt(monthlyIncome)} (from your profile)</div>
          </div>
          <div>
            <label className="text-xs text-[#898781] block mb-1">Current savings (SAR)</label>
            <input
              value={currentSavings}
              onChange={(e) => setCurrentSavings(e.target.value)}
              className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-[#898781] block mb-1">
              Save rate ({saveRate}%)
            </label>
            <input
              type="range"
              min="0"
              max="80"
              value={saveRate}
              onChange={(e) => setSaveRate(parseInt(e.target.value))}
              className="w-full mt-2"
            />
          </div>
        </div>
        <div className="text-xs text-[#898781] mt-3">
          Saving SAR {fmt(monthlySaved)}/month at this rate.
        </div>
      </div>

      <div className="space-y-3">
        {MILESTONES.map((m) => {
          const months = monthsTo(m);
          const years = months === Infinity ? null : (months / 12).toFixed(1);
          return (
            <div key={m} className="bg-white border border-black/10 rounded-xl p-4 flex justify-between items-center">
              <div>
                <div className="font-serif text-lg font-bold">SAR {fmt(m)}</div>
                <div className="text-xs text-[#898781]">Milestone</div>
              </div>
              <div className="text-right">
                <div className="font-serif text-lg font-bold text-[#085041]">
                  {months === Infinity
                    ? '—'
                    : months === 0
                    ? 'Already there'
                    : `${months} months`}
                </div>
                <div className="text-xs text-[#898781]">
                  {years ? `≈ ${years} years` : 'Increase your save rate'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
