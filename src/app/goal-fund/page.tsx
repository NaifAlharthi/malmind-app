'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface GoalFund {
  id: string;
  name: string;
  target_amount: number;
  monthly_contribution: number;
  maturity_years: number;
  expected_return: number;
  start_date: string;
}

interface Actual {
  month_index: number;
  actual_amount: number;
}

function fmt(n: number) {
  return Math.round(n).toLocaleString();
}

export default function GoalFundPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [funds, setFunds] = useState<GoalFund[]>([]);
  const [activeFundId, setActiveFundId] = useState<string | null>(null);
  const [actuals, setActuals] = useState<Actual[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // form fields for creating a new fund
  const [name, setName] = useState("My Child's 18th Birthday Fund");
  const [monthly, setMonthly] = useState('1500');
  const [years, setYears] = useState('18');
  const [roi, setRoi] = useState('3');

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setUserId(user.id);

    const { data } = await supabase
      .from('goal_funds')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (data) {
      setFunds(data as GoalFund[]);
      if (data.length > 0 && !activeFundId) setActiveFundId(data[0].id);
    }
    setLoading(false);
  }, [supabase, router, activeFundId]);

  useEffect(() => {
    load();
  }, [load]);

  const loadActuals = useCallback(
    async (fundId: string) => {
      const { data } = await supabase
        .from('goal_fund_actuals')
        .select('month_index, actual_amount')
        .eq('goal_fund_id', fundId)
        .order('month_index', { ascending: true });
      if (data) setActuals(data as Actual[]);
    },
    [supabase]
  );

  useEffect(() => {
    if (activeFundId) loadActuals(activeFundId);
  }, [activeFundId, loadActuals]);

  async function createFund() {
    if (!userId) return;
    const monthlyNum = parseFloat(monthly.replace(/[^0-9.]/g, '')) || 0;
    const yearsNum = parseFloat(years) || 1;
    const roiNum = parseFloat(roi) || 0;

    const { data, error } = await supabase
      .from('goal_funds')
      .insert({
        user_id: userId,
        name,
        monthly_contribution: monthlyNum,
        maturity_years: yearsNum,
        expected_return: roiNum,
        target_amount: computeTarget(monthlyNum, yearsNum, roiNum),
        start_date: new Date().toISOString().slice(0, 10),
      })
      .select()
      .single();

    if (!error && data) {
      setFunds((prev) => [...prev, data as GoalFund]);
      setActiveFundId(data.id);
      setCreating(false);
    }
  }

  async function deleteFund(id: string) {
    await supabase.from('goal_funds').delete().eq('id', id);
    setFunds((prev) => prev.filter((f) => f.id !== id));
    if (activeFundId === id) setActiveFundId(funds[0]?.id ?? null);
  }

  function computeTarget(monthlyAmt: number, yrs: number, roiPct: number) {
    const totalMonths = Math.round(yrs * 12);
    const monthlyRoi = roiPct / 100 / 12;
    if (monthlyRoi > 0) {
      return monthlyAmt * ((Math.pow(1 + monthlyRoi, totalMonths) - 1) / monthlyRoi);
    }
    return monthlyAmt * totalMonths;
  }

  async function logActual(monthIndex: number, amount: number) {
    if (!activeFundId || !userId) return;
    await supabase.from('goal_fund_actuals').upsert(
      {
        goal_fund_id: activeFundId,
        user_id: userId,
        month_index: monthIndex,
        actual_amount: amount,
      },
      { onConflict: 'goal_fund_id,month_index' }
    );
    loadActuals(activeFundId);
  }

  const activeFund = funds.find((f) => f.id === activeFundId);
  const totalMonths = activeFund ? Math.round(activeFund.maturity_years * 12) : 0;
  const monthlyRoi = activeFund ? activeFund.expected_return / 100 / 12 : 0;

  const cumActual = actuals.reduce((s, a) => s + a.actual_amount, 0);
  const pctToGoal = activeFund && activeFund.target_amount > 0
    ? Math.min(999, (cumActual / activeFund.target_amount) * 100)
    : 0;

  if (loading) {
    return <div className="text-sm text-[#898781]">Loading your goal funds…</div>;
  }

  return (
    <div>
      <div className="text-[10px] tracking-[0.1em] uppercase text-[#1D9E75] font-semibold mb-1">
        Decide
      </div>
      <h1 className="font-serif text-2xl font-semibold text-[#141414] mb-1">
        Goal Fund
      </h1>
      <p className="text-sm text-[#3D3D3A] mb-6 max-w-xl">
        A house down payment, your child&apos;s 18th birthday, Hajj — any goal
        with a target and a date, tracked against your real monthly saving.
      </p>

      {/* fund selector */}
      <div className="flex gap-2 flex-wrap mb-6">
        {funds.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFundId(f.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium border ${
              activeFundId === f.id
                ? 'bg-[#141414] text-white border-[#141414]'
                : 'bg-white text-[#3D3D3A] border-black/10'
            }`}
          >
            {f.name}
          </button>
        ))}
        <button
          onClick={() => setCreating(true)}
          className="px-4 py-2 rounded-full text-sm font-medium bg-[#E1F5EE] text-[#085041] border border-[#5DCAA5]"
        >
          + New fund
        </button>
      </div>

      {creating && (
        <div className="bg-white border border-black/10 rounded-2xl p-6 mb-6">
          <div className="font-serif text-lg font-medium mb-4">New goal fund</div>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div className="sm:col-span-2">
              <label className="text-xs text-[#898781] block mb-1">
                What are you saving for?
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-[#898781] block mb-1">
                Monthly saving (SAR)
              </label>
              <input
                value={monthly}
                onChange={(e) => setMonthly(e.target.value)}
                className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-[#898781] block mb-1">
                Years to maturity
              </label>
              <input
                value={years}
                onChange={(e) => setYears(e.target.value)}
                className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-[#898781] block mb-1">
                Expected annual return (%)
              </label>
              <input
                value={roi}
                onChange={(e) => setRoi(e.target.value)}
                className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={createFund}
              className="text-sm bg-[#085041] text-white rounded-lg px-4 py-2 font-medium"
            >
              Create fund
            </button>
            <button
              onClick={() => setCreating(false)}
              className="text-sm text-[#898781] px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!activeFund && !creating && (
        <div className="bg-white border border-black/10 rounded-2xl p-8 text-center text-sm text-[#898781]">
          Create your first goal fund to get started.
        </div>
      )}

      {activeFund && (
        <>
          {/* hero */}
          <div className="bg-gradient-to-br from-[#0F2A1E] to-[#0A1A12] rounded-2xl p-6 mb-4 text-white">
            <div className="text-xs tracking-[0.1em] uppercase text-[#C9A84C] mb-1">
              Target at maturity
            </div>
            <div className="font-serif text-3xl font-bold mb-1">
              SAR {fmt(activeFund.target_amount)}
            </div>
            <div className="text-xs text-white/50 mb-4">{activeFund.name}</div>
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
              <div>
                <div className="text-[10px] text-white/45 mb-1">Monthly</div>
                <div className="text-sm font-medium">
                  SAR {fmt(activeFund.monthly_contribution)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-white/45 mb-1">Duration</div>
                <div className="text-sm font-medium">{totalMonths} months</div>
              </div>
              <div>
                <div className="text-[10px] text-white/45 mb-1">Return</div>
                <div className="text-sm font-medium">{activeFund.expected_return}%/yr</div>
              </div>
            </div>
          </div>

          {/* progress */}
          <div className="bg-white border border-black/10 rounded-2xl p-6 mb-6 flex items-center gap-6">
            <div className="relative w-28 h-28 flex-shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#EFEDE8" strokeWidth="10" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#1D9E75"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 42}
                  strokeDashoffset={2 * Math.PI * 42 * (1 - Math.min(1, pctToGoal / 100))}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="font-serif text-lg font-bold text-[#085041]">
                  {pctToGoal.toFixed(1)}%
                </div>
                <div className="text-[9px] text-[#898781]">of goal</div>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-[#141414]">
                SAR {fmt(cumActual)} saved so far
              </div>
              <div className="text-xs text-[#898781] mt-1">
                Across {actuals.length} logged month{actuals.length === 1 ? '' : 's'}
              </div>
              <button
                onClick={() => deleteFund(activeFund.id)}
                className="text-xs text-[#A32D2D] mt-3"
              >
                Delete this fund
              </button>
            </div>
          </div>

          {/* monthly tracker */}
          <div className="bg-white border border-black/10 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 bg-[#F5F4F0] text-xs font-semibold text-[#898781] grid grid-cols-4 gap-3">
              <span>Month</span>
              <span>Target</span>
              <span>Actual</span>
              <span className="text-right">Difference</span>
            </div>
            {Array.from({ length: Math.min(totalMonths, 24) }, (_, i) => i + 1).map((m) => {
              const actualRow = actuals.find((a) => a.month_index === m);
              const diff = actualRow ? actualRow.actual_amount - activeFund.monthly_contribution : null;
              return (
                <div
                  key={m}
                  className="px-5 py-2.5 grid grid-cols-4 gap-3 items-center text-sm border-t border-black/5"
                >
                  <span className="text-[#898781] text-xs">Month {m}</span>
                  <span className="text-[#3D3D3A]">
                    SAR {fmt(activeFund.monthly_contribution)}
                  </span>
                  <input
                    type="text"
                    defaultValue={actualRow ? fmt(actualRow.actual_amount) : ''}
                    placeholder="—"
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value.replace(/[^0-9.]/g, ''));
                      if (!isNaN(val)) logActual(m, val);
                    }}
                    className="w-full bg-[#F5F4F0] border border-black/10 rounded-md px-2 py-1 text-xs outline-none"
                  />
                  <span
                    className={`text-right text-xs font-medium ${
                      diff === null
                        ? 'text-[#898781]'
                        : diff >= 0
                        ? 'text-[#085041]'
                        : 'text-[#A32D2D]'
                    }`}
                  >
                    {diff === null ? '—' : `${diff >= 0 ? '+' : ''}${fmt(diff)}`}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
