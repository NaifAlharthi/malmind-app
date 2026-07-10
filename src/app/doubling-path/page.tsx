'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function fmt(n: number) {
  return n >= 1e9
    ? `${(n / 1e9).toFixed(2)}B`
    : n >= 1e6
    ? `${(n / 1e6).toFixed(2)}M`
    : Math.round(n).toLocaleString();
}

export default function DoublingPathPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [portfolioValue, setPortfolioValue] = useState('100000');
  const [roi, setRoi] = useState('8');
  const [age, setAge] = useState(30);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setUserId(user.id);

    const [{ data: settings }, { data: profile }] = await Promise.all([
      supabase.from('investment_settings').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('profiles').select('age').eq('id', user.id).single(),
    ]);

    if (settings) {
      setPortfolioValue(String(settings.portfolio_value));
      setRoi(String(settings.expected_roi));
    }
    if (profile?.age) setAge(profile.age);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveSettings() {
    if (!userId) return;
    const val = parseFloat(portfolioValue.replace(/[^0-9.]/g, '')) || 0;
    const roiVal = parseFloat(roi) || 0;
    await supabase.from('investment_settings').upsert(
      { user_id: userId, portfolio_value: val, expected_roi: roiVal },
      { onConflict: 'user_id' }
    );
  }

  if (loading) {
    return <div className="text-sm text-[#898781]">Loading…</div>;
  }

  const startValue = parseFloat(portfolioValue.replace(/[^0-9.]/g, '')) || 0;
  const roiNum = parseFloat(roi) || 0;
  const yearsPerDouble = roiNum > 0 ? Math.log(2) / Math.log(1 + roiNum / 100) : Infinity;

  const doublings = [];
  let current = startValue;
  let yearsElapsed = 0;
  for (let i = 0; i < 8 && current < 1e12; i++) {
    current *= 2;
    yearsElapsed += yearsPerDouble;
    doublings.push({
      n: i + 1,
      value: current,
      years: yearsElapsed,
      ageAtDoubling: age + yearsElapsed,
    });
  }

  return (
    <div>
      <div className="text-[10px] tracking-[0.1em] uppercase text-[#4A78C4] font-semibold mb-1">
        Think
      </div>
      <h1 className="font-serif text-2xl font-semibold text-[#141414] mb-1">
        Doubling Path
      </h1>
      <p className="text-sm text-[#3D3D3A] mb-6 max-w-xl">
        Every time your portfolio doubles, and exactly how old you&apos;ll be
        when it happens.
      </p>

      <div className="bg-white border border-black/10 rounded-2xl p-6 mb-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-[#898781] block mb-1">Current portfolio (SAR)</label>
            <input
              value={portfolioValue}
              onChange={(e) => setPortfolioValue(e.target.value)}
              onBlur={saveSettings}
              className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-[#898781] block mb-1">Expected annual return (%)</label>
            <input
              value={roi}
              onChange={(e) => setRoi(e.target.value)}
              onBlur={saveSettings}
              className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none"
            />
          </div>
        </div>
        <div className="text-xs text-[#898781] mt-3">
          At {roi}% annual return, your money doubles roughly every{' '}
          {yearsPerDouble === Infinity ? '—' : yearsPerDouble.toFixed(1)} years.
        </div>
      </div>

      <div className="space-y-2">
        {doublings.map((d) => (
          <div
            key={d.n}
            className="bg-white border border-black/10 rounded-xl p-4 flex justify-between items-center"
          >
            <div>
              <div className="text-xs text-[#898781]">Doubling #{d.n}</div>
              <div className="font-serif text-lg font-bold">SAR {fmt(d.value)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-[#085041]">
                Age {Math.round(d.ageAtDoubling)}
              </div>
              <div className="text-xs text-[#898781]">
                {d.years.toFixed(1)} years from now
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
