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

export default function YearPlanPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [plan, setPlan] = useState<YearPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const currentYear = new Date().getFullYear();

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setUserId(user.id);

    const { data: profile } = await supabase
      .from('profiles')
      .select('monthly_income')
      .eq('id', user.id)
      .single();

    const { data } = await supabase
      .from('year_plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('year', currentYear)
      .maybeSingle();

    if (data) {
      setPlan(data as YearPlan);
    } else {
      // seed a default plan for this year using the profile's real income
      const { data: newPlan } = await supabase
        .from('year_plans')
        .insert({
          user_id: user.id,
          year: currentYear,
          opening_balance: 0,
          target_balance: (profile?.monthly_income || 10000) * 12 * 0.3,
          monthly_income: profile?.monthly_income || 10000,
          monthly_expenses: (profile?.monthly_income || 10000) * 0.6,
          save_rate: 20,
          invest_split: 50,
          expected_roi: 7,
        })
        .select()
        .single();
      if (newPlan) setPlan(newPlan as YearPlan);
    }
    setLoading(false);
  }, [supabase, router, currentYear]);

  useEffect(() => {
    load();
  }, [load]);

  async function updatePlan(patch: Partial<YearPlan>) {
    if (!plan) return;
    const updated = { ...plan, ...patch };
    setPlan(updated);
    await supabase.from('year_plans').update(patch).eq('id', plan.id);
  }

  if (loading || !plan) {
    return <div className="text-sm text-[var(--muted)]">Loading your year plan…</div>;
  }

  const disposable = plan.monthly_income - plan.monthly_expenses;
  const monthlySaved = disposable * (plan.save_rate / 100);
  const monthlyInvested = monthlySaved * (plan.invest_split / 100);
  const monthlyCash = monthlySaved - monthlyInvested;
  const annualSaved = monthlySaved * 12;
  const projectedYearEnd = plan.opening_balance + annualSaved;
  const gap = plan.target_balance - projectedYearEnd;

  return (
    <div>
      <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--green)] font-semibold mb-1">
        Decide
      </div>
      <h1 className="font-serif text-2xl font-semibold text-[var(--ink)] mb-1">
        Year Master Plan
      </h1>
      <p className="text-sm text-[var(--ink-2)] mb-6 max-w-xl">
        Your {plan.year} opening balance to your year-end target, with income
        trickling through spending, saving, and investing.
      </p>

      {/* hero */}
      <div className="bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] rounded-2xl p-6 mb-6 text-white">
        <div className="grid grid-cols-2 gap-6 mb-4">
          <div>
            <div className="text-[10px] text-[var(--gold)] mb-1">Opening balance</div>
            <div className="font-serif text-2xl font-bold">SAR {fmt(plan.opening_balance)}</div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--gold)] mb-1">Target by year end</div>
            <div className="font-serif text-2xl font-bold">SAR {fmt(plan.target_balance)}</div>
          </div>
        </div>
        <div className="pt-4 border-t border-white/10">
          <div className="text-xs text-white/60">
            {gap > 0
              ? `At this pace, you'll be SAR ${fmt(gap)} short of your target.`
              : `At this pace, you'll exceed your target by SAR ${fmt(Math.abs(gap))}.`}
          </div>
        </div>
      </div>

      {/* editable inputs */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 mb-6">
        <div className="text-sm font-medium mb-4">Adjust your plan</div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">Opening balance (SAR)</label>
            <input
              type="text"
              defaultValue={fmt(plan.opening_balance)}
              onBlur={(e) => {
                const val = parseFloat(e.target.value.replace(/[^0-9.]/g, ''));
                if (!isNaN(val)) updatePlan({ opening_balance: val });
              }}
              className="w-full border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">Target balance (SAR)</label>
            <input
              type="text"
              defaultValue={fmt(plan.target_balance)}
              onBlur={(e) => {
                const val = parseFloat(e.target.value.replace(/[^0-9.]/g, ''));
                if (!isNaN(val)) updatePlan({ target_balance: val });
              }}
              className="w-full border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">Monthly income (SAR)</label>
            <input
              type="text"
              defaultValue={fmt(plan.monthly_income)}
              onBlur={(e) => {
                const val = parseFloat(e.target.value.replace(/[^0-9.]/g, ''));
                if (!isNaN(val)) updatePlan({ monthly_income: val });
              }}
              className="w-full border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">Monthly expenses (SAR)</label>
            <input
              type="text"
              defaultValue={fmt(plan.monthly_expenses)}
              onBlur={(e) => {
                const val = parseFloat(e.target.value.replace(/[^0-9.]/g, ''));
                if (!isNaN(val)) updatePlan({ monthly_expenses: val });
              }}
              className="w-full border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">
              Save rate ({plan.save_rate}% of disposable)
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={plan.save_rate}
              onChange={(e) => updatePlan({ save_rate: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">
              Invest split ({plan.invest_split}% of savings)
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={plan.invest_split}
              onChange={(e) => updatePlan({ invest_split: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* trickle down */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl overflow-hidden">
        <div className="px-5 py-3 bg-[var(--surface-0)] text-sm font-medium">Monthly trickle-down</div>
        {[
          { label: 'Income', value: plan.monthly_income, color: 'var(--ink)' },
          { label: 'Expenses', value: -plan.monthly_expenses, color: 'var(--red-dark-text)' },
          { label: 'Disposable', value: disposable, color: 'var(--ink-2)' },
          { label: 'Saved', value: monthlySaved, color: 'var(--green-dark)' },
          { label: '  → Invested', value: monthlyInvested, color: 'var(--green)' },
          { label: '  → Cash', value: monthlyCash, color: 'var(--blue)' },
        ].map((row) => (
          <div key={row.label} className="px-5 py-2.5 flex justify-between items-center text-sm border-t border-[var(--border-faint)]">
            <span style={{ color: row.color }}>{row.label}</span>
            <span className="font-medium" style={{ color: row.color }}>
              {row.value >= 0 ? '+' : ''}SAR {fmt(row.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
