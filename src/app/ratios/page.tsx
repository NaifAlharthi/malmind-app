'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function fmt(n: number) {
  return Math.round(n).toLocaleString();
}

interface Ratio {
  title: string;
  value: string;
  verdict: 'good' | 'watch' | 'attention';
  note: string;
}

export default function RatiosPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [ratios, setRatios] = useState<Ratio[]>([]);
  const [dataAvailable, setDataAvailable] = useState(false);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const [
      { data: profile },
      { data: netWorthRows },
      { data: yearPlan },
      { data: budgetItems },
      { data: goalFunds },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('net_worth_snapshots').select('year, amount').eq('user_id', user.id).order('year', { ascending: true }),
      supabase.from('year_plans').select('*').eq('user_id', user.id).eq('year', new Date().getFullYear()).maybeSingle(),
      supabase.from('budget_items').select('cost, phase').eq('user_id', user.id),
      supabase.from('goal_funds').select('monthly_contribution').eq('user_id', user.id),
    ]);

    const computed: Ratio[] = [];
    let hasAnyData = false;

    // Savings rate — from the year plan
    if (yearPlan) {
      hasAnyData = true;
      const disposable = yearPlan.monthly_income - yearPlan.monthly_expenses;
      const savingsRate = yearPlan.monthly_income > 0 ? (disposable * (yearPlan.save_rate / 100) / yearPlan.monthly_income) * 100 : 0;
      computed.push({
        title: 'Savings rate',
        value: `${savingsRate.toFixed(1)}%`,
        verdict: savingsRate >= 20 ? 'good' : savingsRate >= 10 ? 'watch' : 'attention',
        note: `You keep ${savingsRate.toFixed(1)}% of your income, based on your Year Master Plan.`,
      });

      const burnRate = yearPlan.monthly_income > 0 ? (yearPlan.monthly_expenses / yearPlan.monthly_income) * 100 : 0;
      computed.push({
        title: 'Spending-to-income',
        value: `${burnRate.toFixed(1)}%`,
        verdict: burnRate <= 70 ? 'good' : burnRate <= 85 ? 'watch' : 'attention',
        note: `You spend ${burnRate.toFixed(1)}% of what you earn each month.`,
      });
    }

    // Net worth to income — from real snapshots + profile
    if (netWorthRows && netWorthRows.length > 0 && profile?.monthly_income) {
      hasAnyData = true;
      const latestNW = netWorthRows[netWorthRows.length - 1].amount;
      const annualIncome = profile.monthly_income * 12;
      const multiple = annualIncome > 0 ? latestNW / annualIncome : 0;
      computed.push({
        title: 'Net worth to income',
        value: `${multiple.toFixed(2)}×`,
        verdict: multiple >= 2 ? 'good' : multiple >= 1 ? 'watch' : 'attention',
        note: `Your logged net worth is ${multiple.toFixed(2)}× your annual income.`,
      });

      if (netWorthRows.length >= 2) {
        const prev = netWorthRows[netWorthRows.length - 2].amount;
        const growth = prev > 0 ? ((latestNW - prev) / prev) * 100 : 0;
        computed.push({
          title: 'Net worth growth',
          value: `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`,
          verdict: growth >= 8 ? 'good' : growth >= 0 ? 'watch' : 'attention',
          note: `Net worth changed ${growth.toFixed(1)}% between your last two logged snapshots.`,
        });
      }
    }

    // Budget commitment ratio
    if (budgetItems && budgetItems.length > 0) {
      hasAnyData = true;
      const total = budgetItems.reduce((s, i) => s + i.cost, 0);
      const phase1 = budgetItems.filter((i) => i.phase === 1).reduce((s, i) => s + i.cost, 0);
      const essentialShare = total > 0 ? (phase1 / total) * 100 : 0;
      computed.push({
        title: 'Essential purchase share',
        value: `${essentialShare.toFixed(0)}%`,
        verdict: essentialShare >= 40 ? 'good' : 'watch',
        note: `${essentialShare.toFixed(0)}% of your planned purchases (SAR ${fmt(total)} total) are Phase 1 essentials.`,
      });
    }

    // Goal commitment vs income
    if (goalFunds && goalFunds.length > 0 && profile?.monthly_income) {
      hasAnyData = true;
      const totalCommitted = goalFunds.reduce((s, g) => s + g.monthly_contribution, 0);
      const commitRate = profile.monthly_income > 0 ? (totalCommitted / profile.monthly_income) * 100 : 0;
      computed.push({
        title: 'Goal commitment rate',
        value: `${commitRate.toFixed(1)}%`,
        verdict: commitRate <= 30 ? 'good' : commitRate <= 50 ? 'watch' : 'attention',
        note: `You've committed SAR ${fmt(totalCommitted)}/month across ${goalFunds.length} goal fund${goalFunds.length === 1 ? '' : 's'}.`,
      });
    }

    setRatios(computed);
    setDataAvailable(hasAnyData);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <div className="text-sm text-[#898781]">Computing your ratios…</div>;
  }

  return (
    <div>
      <div className="text-[10px] tracking-[0.1em] uppercase text-[#4A78C4] font-semibold mb-1">
        Think
      </div>
      <h1 className="font-serif text-2xl font-semibold text-[#141414] mb-1">
        Ratios &amp; Stats
      </h1>
      <p className="text-sm text-[#3D3D3A] mb-6 max-w-xl">
        The handful of numbers that tell you if things are healthy — computed
        live from what you&apos;ve actually entered across MalMind.
      </p>

      {!dataAvailable ? (
        <div className="bg-white border border-black/10 rounded-2xl p-8 text-center text-sm text-[#898781]">
          Fill in your Year Master Plan, log a net worth snapshot, or add a
          goal fund — your ratios will appear here automatically, computed
          from real data across every tool.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {ratios.map((r) => (
            <div key={r.title} className="bg-white border border-black/10 rounded-xl p-5">
              <div className="flex justify-between items-start mb-2">
                <div className="text-xs font-semibold text-[#141414]">{r.title}</div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    r.verdict === 'good'
                      ? 'bg-[#E1F5EE] text-[#085041]'
                      : r.verdict === 'watch'
                      ? 'bg-[#FBF1E0] text-[#8A6416]'
                      : 'bg-[#FBE9EC] text-[#A32D2D]'
                  }`}
                >
                  {r.verdict === 'good' ? 'Healthy' : r.verdict === 'watch' ? 'Watch' : 'Needs attention'}
                </span>
              </div>
              <div className="font-serif text-2xl font-bold text-[#141414] mb-2">{r.value}</div>
              <div className="text-xs text-[#3D3D3A]">{r.note}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
