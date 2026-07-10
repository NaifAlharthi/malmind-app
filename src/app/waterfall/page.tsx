'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface YearPlan {
  id: string;
  year: number;
  opening_balance: number;
  target_balance: number;
  monthly_income: number;
  monthly_expenses: number;
  save_rate: number;
  invest_split: number;
  expected_roi: number;
}

function fmt(n: number) {
  return Math.round(n).toLocaleString();
}

export default function WaterfallPage() {
  const router = useRouter();
  const supabase = createClient();
  const [plan, setPlan] = useState<YearPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const currentYear = new Date().getFullYear();

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    const { data } = await supabase
      .from('year_plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('year', currentYear)
      .maybeSingle();
    if (data) setPlan(data as YearPlan);
    setLoading(false);
  }, [supabase, router, currentYear]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <div className="text-sm text-[#898781]">Loading your waterfall…</div>;
  }

  if (!plan) {
    return (
      <div className="bg-white border border-black/10 rounded-2xl p-8 text-center text-sm text-[#898781]">
        Set up your Year Master Plan first — this view shows the same numbers,
        as a flow.
      </div>
    );
  }

  const annualIncome = plan.monthly_income * 12;
  const annualExpenses = plan.monthly_expenses * 12;
  const disposable = annualIncome - annualExpenses;
  const saved = disposable * (plan.save_rate / 100);
  const invested = saved * (plan.invest_split / 100);
  const cash = saved - invested;
  const investReturn = invested * (plan.expected_roi / 100);
  const yearEnd = plan.opening_balance + saved + investReturn;
  const gap = plan.target_balance - yearEnd;

  const maxVal = Math.max(annualIncome, plan.target_balance, yearEnd) * 1.1;
  const barH = (v: number) => Math.max(4, (v / maxVal) * 220);

  return (
    <div>
      <div className="text-[10px] tracking-[0.1em] uppercase text-[#1D9E75] font-semibold mb-1">
        Decide
      </div>
      <h1 className="font-serif text-2xl font-semibold text-[#141414] mb-1">
        Money Waterfall
      </h1>
      <p className="text-sm text-[#3D3D3A] mb-6 max-w-xl">
        Watch {plan.year}&apos;s money burn, save, invest, and fill the gap —
        same numbers as your Year Master Plan, felt as a flow.
      </p>

      <div className="bg-white border border-black/10 rounded-2xl p-6 overflow-x-auto">
        <div className="flex items-end gap-4 min-w-[600px]" style={{ height: 260 }}>
          {[
            { label: 'Opening', value: plan.opening_balance, color: '#8a99a8' },
            { label: 'Income', value: annualIncome, color: '#141414' },
            { label: 'Burned', value: -annualExpenses, color: '#C0504D' },
            { label: 'Saved', value: saved, color: '#085041' },
            { label: 'Invested', value: invested, color: '#1D9E75' },
            { label: 'Cash', value: cash, color: '#4A78C4' },
            { label: 'Return', value: investReturn, color: '#C9A84C' },
            { label: 'Year end', value: yearEnd, color: '#141414' },
            { label: 'Target', value: plan.target_balance, color: '#898781' },
          ].map((bar) => (
            <div key={bar.label} className="flex flex-col items-center flex-1">
              <div className="text-[10px] font-semibold mb-1" style={{ color: bar.color }}>
                {bar.value >= 0 ? '' : '-'}SAR {fmt(Math.abs(bar.value))}
              </div>
              <div
                className="w-full rounded-t-md"
                style={{
                  height: barH(Math.abs(bar.value)),
                  backgroundColor: bar.color,
                  opacity: 0.85,
                }}
              />
              <div className="text-[10px] text-[#898781] mt-2">{bar.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div
        className={`rounded-xl p-5 mt-6 border ${
          gap <= 0 ? 'bg-[#E1F5EE] border-[#5DCAA5]' : 'bg-[#FBE9EC] border-[#E5A0AC]'
        }`}
      >
        <div className="font-serif text-lg font-medium mb-1">
          {gap <= 0
            ? `You're projected to exceed your target by SAR ${fmt(Math.abs(gap))}.`
            : `There's a gap of SAR ${fmt(gap)} to your target — consider raising your save rate on the Year Master Plan.`}
        </div>
      </div>
    </div>
  );
}
