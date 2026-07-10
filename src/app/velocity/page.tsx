'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { useProfileContext } from '@/components/shared/AppShell';
import {
  MILESTONES, FOCUS_MILESTONES, SCENARIOS,
  computeDisposable, scenarioDisposable, timeToTargetMonths, monthsToWords,
} from '@/lib/velocity';

function fmt(n: number) {
  return Math.round(n).toLocaleString();
}

function fmtCompact(n: number) {
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 1 : 1) + 'M';
  if (n >= 1e3) return Math.round(n / 1e3) + 'K';
  return String(Math.round(n));
}

type Unit = 'months' | 'years';

export default function VelocityPage() {
  const router = useRouter();
  const supabase = createClient();
  const { openEditProfile } = useProfileContext();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [salary, setSalary] = useState(0);
  const [sideIncome, setSideIncome] = useState('0');
  const [expense, setExpense] = useState('0');

  const [activeScenarioKeys, setActiveScenarioKeys] = useState<string[]>(SCENARIOS.map((s) => s.key));
  const [unit, setUnit] = useState<Unit>('months');
  const [focusTarget, setFocusTarget] = useState(1000000);
  const [reflection, setReflection] = useState<'yes' | 'no' | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('monthly_income, side_income, monthly_expense')
        .eq('id', user.id)
        .single();

      if (profile) {
        setSalary(Number(profile.monthly_income) || 0);
        if (profile.side_income != null) setSideIncome(String(profile.side_income));
        if (profile.monthly_expense != null) setExpense(String(profile.monthly_expense));
      }
      setLoading(false);
    })();
  }, [supabase, router]);

  async function saveAssumptions() {
    if (!userId) return;
    setSaving(true);
    setSaved(false);
    await supabase
      .from('profiles')
      .update({
        side_income: parseFloat(sideIncome) || 0,
        monthly_expense: parseFloat(expense) || 0,
      })
      .eq('id', userId);
    setSaving(false);
    setSaved(true);
  }

  const disposable = computeDisposable(salary, parseFloat(sideIncome) || 0, parseFloat(expense) || 0);
  const baseDisposable = scenarioDisposable(disposable, SCENARIOS[0]);

  const chartData = useMemo(
    () =>
      MILESTONES.map((m) => {
        const point: Record<string, number | string | null> = { milestone: fmtCompact(m), milestoneFull: `SAR ${fmt(m)}` };
        for (const sc of SCENARIOS) {
          if (!activeScenarioKeys.includes(sc.key)) continue;
          const d = scenarioDisposable(disposable, sc);
          const months = timeToTargetMonths(m, d);
          if (!Number.isFinite(months)) {
            point[sc.key] = null;
          } else {
            const val = unit === 'months' ? months : months / 12;
            point[sc.key] = Number(val.toFixed(unit === 'months' ? 1 : 2));
          }
        }
        return point;
      }),
    [disposable, activeScenarioKeys, unit]
  );

  function toggleScenario(key: string) {
    if (key === 'none') return; // always shown, can't be turned off
    setActiveScenarioKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
    setReflection(null);
  }

  const baseMonths = timeToTargetMonths(focusTarget, baseDisposable);
  const activeMortgages = SCENARIOS.filter((s) => s.key !== 'none' && activeScenarioKeys.includes(s.key));

  if (loading) {
    return <div className="text-sm text-[#898781]">Loading…</div>;
  }

  if (!salary) {
    return (
      <div className="bg-white border border-black/10 rounded-2xl p-8 text-center">
        <p className="text-sm text-[#3D3D3A] mb-4">
          Set your monthly income in your profile to see your velocity of money.
        </p>
        <button
          onClick={openEditProfile}
          className="text-sm bg-[#085041] text-white rounded-lg px-4 py-2 font-medium"
        >
          Set your income →
        </button>
      </div>
    );
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
        Wealth reframed as time — how long each milestone takes at your real pace of saving,
        and what changes when life adds a mortgage.
      </p>

      {/* inputs */}
      <div className="bg-white border border-black/10 rounded-2xl p-5 mb-5">
        <div className="text-[11px] tracking-[0.1em] uppercase text-[#898781] mb-4">
          Your monthly numbers
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-xs text-[#898781] block mb-1">Main salary</label>
            <div className="border border-black/10 rounded-lg px-3 py-2 text-sm bg-[#F5F4F0] text-[#3D3D3A]">
              SAR {fmt(salary)}
            </div>
          </div>
          <div>
            <label className="text-xs text-[#898781] block mb-1">Side income</label>
            <div className="flex items-center border border-black/10 rounded-lg px-3 focus-within:border-[#1D9E75]">
              <span className="text-xs text-[#898781] mr-1">SAR</span>
              <input
                value={sideIncome}
                onChange={(e) => setSideIncome(e.target.value)}
                className="w-full py-2 text-sm outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-[#898781] block mb-1">Average monthly expense</label>
            <div className="flex items-center border border-black/10 rounded-lg px-3 focus-within:border-[#1D9E75]">
              <span className="text-xs text-[#898781] mr-1">SAR</span>
              <input
                value={expense}
                onChange={(e) => setExpense(e.target.value)}
                className="w-full py-2 text-sm outline-none"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap pt-3 border-t border-black/10">
          <button
            onClick={saveAssumptions}
            disabled={saving}
            className="text-sm bg-[#085041] text-white rounded-lg px-4 py-2 font-medium disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save assumptions'}
          </button>
          {saved && <span className="text-xs text-[#1D9E75]">Saved to your profile.</span>}
          <span className="text-sm text-[#3D3D3A]">
            Disposable each month: <strong className="text-[#1D9E75] font-serif text-base">SAR {fmt(disposable)}</strong>
          </span>
          <span className="text-xs text-[#898781]">
            Salary comes from your profile — edit it from the home page.
          </span>
        </div>
      </div>

      {/* mortgage toggles */}
      <div className="flex items-center gap-2 flex-wrap mb-5">
        <span className="text-xs text-[#3D3D3A] mr-1">Compare with a mortgage:</span>
        {SCENARIOS.map((sc) => (
          <button
            key={sc.key}
            onClick={() => toggleScenario(sc.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
              activeScenarioKeys.includes(sc.key)
                ? 'bg-[#141414] border-[#141414] text-white'
                : 'bg-white border-black/15 text-[#3D3D3A]'
            } ${sc.key === 'none' ? 'cursor-default' : ''}`}
          >
            <span className="w-2 h-2 rounded-sm" style={{ background: sc.color }} />
            {sc.label}
          </button>
        ))}
      </div>

      {/* chart */}
      <div className="bg-white border border-black/10 rounded-2xl p-6 mb-5">
        <div className="flex justify-between items-start mb-1">
          <div>
            <div className="text-sm font-medium text-[#141414]">Time to reach each milestone</div>
            <div className="text-xs text-[#898781]">Each bar is how long that target takes at your pace</div>
          </div>
          <div className="inline-flex border border-black/10 rounded-lg overflow-hidden shrink-0">
            <button
              onClick={() => setUnit('months')}
              className={`px-3 py-1.5 text-xs font-medium ${unit === 'months' ? 'bg-[#141414] text-white' : 'bg-white text-[#3D3D3A]'}`}
            >
              Months
            </button>
            <button
              onClick={() => setUnit('years')}
              className={`px-3 py-1.5 text-xs font-medium ${unit === 'years' ? 'bg-[#141414] text-white' : 'bg-white text-[#3D3D3A]'}`}
            >
              Years
            </button>
          </div>
        </div>
        <div className="h-80 mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid stroke="#ececE6" />
              <XAxis dataKey="milestone" tick={{ fontSize: 10, fill: '#898781' }} />
              <YAxis
                tick={{ fontSize: 10, fill: '#898781' }}
                label={{ value: unit === 'months' ? 'Months' : 'Years', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#898781' }}
              />
              <Tooltip
                formatter={(value, name) => {
                  if (value == null) return ['out of reach', name];
                  return [`${value} ${unit}`, name];
                }}
              />
              {SCENARIOS.filter((s) => activeScenarioKeys.includes(s.key)).map((s) => (
                <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[3, 3, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* focus target */}
      <div className="flex items-center gap-3 flex-wrap mb-5">
        <span className="text-sm text-[#3D3D3A]">Focus on a target:</span>
        <div className="flex gap-1.5 flex-wrap">
          {FOCUS_MILESTONES.map((m) => (
            <button
              key={m}
              onClick={() => { setFocusTarget(m); setReflection(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs border ${
                focusTarget === m
                  ? 'bg-[#E1F5EE] border-[#1D9E75] text-[#085041] font-medium'
                  : 'bg-white border-black/15 text-[#3D3D3A]'
              }`}
            >
              SAR {fmt(m)}
            </button>
          ))}
        </div>
      </div>

      {/* verdict */}
      <div className="bg-white border-[1.5px] border-[#1D9E75] rounded-2xl p-6">
        <div className="text-[11px] tracking-[0.1em] uppercase text-[#1D9E75] mb-3">The reality check</div>
        <div className="font-serif text-lg text-[#141414] leading-relaxed mb-2">
          At your current pace, reaching <strong className="text-[#085041] font-semibold">SAR {fmt(focusTarget)}</strong>{' '}
          takes <strong className="text-[#085041] font-semibold">{monthsToWords(baseMonths)}</strong>.
        </div>
        <div className="text-sm text-[#3D3D3A] leading-relaxed mb-5">
          {activeMortgages.length > 0 ? (
            <>
              Add a mortgage and the same goal stretches further:{' '}
              {activeMortgages.map((sc, i) => {
                const m = timeToTargetMonths(focusTarget, scenarioDisposable(disposable, sc));
                return (
                  <span key={sc.key}>
                    <span className="inline-block bg-[#F5F4F0] border border-black/10 rounded px-1.5 py-0.5 font-medium text-[#141414]">
                      {sc.label}: {monthsToWords(m)}
                    </span>
                    {i < activeMortgages.length - 1 ? ' ' : ''}
                  </span>
                );
              })}
              . The bigger your monthly commitment, the slower your wealth actually accumulates — even though it
              doesn&apos;t feel that way day to day.
            </>
          ) : (
            <>
              This assumes you save every riyal of disposable income — which rarely happens in real life. The real
              number is almost always longer.
            </>
          )}
        </div>

        <div className="text-sm font-medium text-[#141414] mb-3">Is this what you expected?</div>
        <div className="flex gap-2.5 flex-wrap mb-4">
          <button
            onClick={() => setReflection('yes')}
            className="px-4 py-2.5 rounded-lg text-xs font-medium border border-black/15 hover:bg-[#E1F5EE] hover:border-[#1D9E75] hover:text-[#085041] transition-colors"
          >
            Yes — I&apos;m on track
          </button>
          <button
            onClick={() => setReflection('no')}
            className="px-4 py-2.5 rounded-lg text-xs font-medium border border-black/15 hover:bg-[#FAEEDA] hover:border-[#eda100] hover:text-[#633806] transition-colors"
          >
            No — that&apos;s longer than I thought
          </button>
        </div>

        {reflection && (
          <div className="pt-4 border-t border-black/10">
            {reflection === 'yes' ? (
              <>
                <div className="text-sm text-[#3D3D3A] leading-relaxed mb-4">
                  Good — that means your expectations are grounded in reality, which already puts you ahead of most
                  people. Keep your pace steady and protect your disposable income. The main risk now isn&apos;t
                  speed, it&apos;s <strong className="text-[#141414] font-medium">lifestyle creep</strong> — letting
                  expenses rise as income does.
                </div>
                <div className="flex flex-col gap-2">
                  <LeverRow icon="🔒" title="Lock in your pace" desc="Automate the disposable amount into savings before you can spend it" impact="Stay on track" />
                  <LeverRow icon="📊" title="Set a lifestyle-creep alert" desc="Get warned if expenses climb faster than income" impact="Protect speed" />
                </div>
              </>
            ) : (
              <>
                <div className="text-sm text-[#3D3D3A] leading-relaxed mb-4">
                  That gap between what you expected and what&apos;s real is the most valuable thing this tool can
                  show you. The good news: the timeline isn&apos;t fixed — it bends fast when you pull the right
                  levers. Here&apos;s what would change your trajectory toward{' '}
                  <strong className="text-[#141414] font-medium">SAR {fmt(focusTarget)}</strong>:
                </div>
                <div className="flex flex-col gap-2">
                  <LeverRow
                    icon="📈" title="Grow income by 20%" desc="A raise, a bigger side income, or a new skill"
                    impact={`~${monthsToWords(baseMonths - timeToTargetMonths(focusTarget, baseDisposable * 1.2))} sooner`}
                  />
                  <LeverRow icon="✂️" title="Cut SAR 1,000 from monthly expense" desc="Redirect it straight into wealth-building" impact="Faster pace" />
                  <LeverRow icon="🏡" title="Rethink the mortgage size" desc="A smaller installment keeps more disposable income working for you" impact="Big effect" />
                  <LeverRow icon="💬" title="Build a plan with your advisor" desc="Let MalMind map a realistic path to your number" impact="Personalized" />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LeverRow({ icon, title, desc, impact }: { icon: string; title: string; desc: string; impact: string }) {
  return (
    <div className="flex items-center gap-3 bg-[#F5F4F0] border border-black/10 rounded-lg px-4 py-3 hover:border-[#1D9E75] transition-colors">
      <span className="text-lg">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[#141414]">{title}</div>
        <div className="text-xs text-[#898781]">{desc}</div>
      </div>
      <span className="text-xs font-semibold text-[#1D9E75] whitespace-nowrap">{impact}</span>
    </div>
  );
}
