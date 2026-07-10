'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ComposedChart, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { useProfileContext } from '@/components/shared/AppShell';
import {
  BENCHMARK_START_AGE, buildBenchmarkCurves, buildYouSeries, computeGapAndGain,
} from '@/lib/positioningBenchmarks';

function fmt(n: number) {
  return Math.round(n).toLocaleString();
}

type SubView = 'stand' | 'quad';
type Peer = 'similar' | 'upper' | 'lower';

interface QuadDef {
  title: string;
  move: string;
  step: 'A' | 'B' | 'C' | 'D';
  detail: string;
  levers: { ic: string; t: string; d: string; tag: string }[];
}

const QUAD_DATA: Record<string, QuadDef> = {
  poor: {
    title: "You're in build mode", move: 'Generate income and assets', step: 'A',
    detail: "Right now the priority isn't saving or investing — it's raising your income floor and creating your first assets. This is the most common starting point and the most fixable. Every riyal of new income here has outsized impact because you're building from a low base.",
    levers: [
      { ic: '📈', t: 'Raise your income floor', d: 'A higher-paying role, a certification, or a side income — modeled in the Velocity tool', tag: 'Start here' },
      { ic: '🧾', t: 'Stop the leaks first', d: 'Find the expenses quietly draining your low base in the Budgeting tool', tag: 'Quick win' },
      { ic: '💬', t: 'Map a 12-month income plan', d: 'Let your advisor sequence realistic steps to your next income level', tag: 'Plan' },
    ],
  },
  stuck: {
    title: "You're stuck at break-even", move: 'Create surplus and saving', step: 'B',
    detail: "Your income covers your outflow, but there's nothing left to build with. You're not going backward — but you're not moving forward either. The single move that matters is opening a gap between what you earn and what you spend, then protecting it.",
    levers: [
      { ic: '✂️', t: 'Engineer a surplus', d: 'Find and lock SAR 1,000–2,000/month of breathing room in the Budgeting tool', tag: 'Core move' },
      { ic: '🔒', t: 'Automate it before you see it', d: 'Move the surplus to savings on payday so it never gets spent', tag: 'Protect' },
      { ic: '📊', t: 'Watch for lifestyle creep', d: 'MalMind flags when expenses rise as fast as income', tag: 'Add to plan' },
    ],
  },
  behind: {
    title: "You're slipping backward", move: 'Flip the balance', step: 'B',
    detail: "Your liabilities and outflow currently outweigh your income — debt payments, financing, and commitments are larger than what's coming in. This is urgent but recoverable. The goal is to flip the two bars: shrink the red, grow the green, in that order.",
    levers: [
      { ic: '🏠', t: 'Restructure heavy commitments', d: 'A long car loan or oversized mortgage may be the single biggest drag — rethink the size', tag: 'Urgent' },
      { ic: '🧾', t: 'Triage outflow now', d: 'Separate essential from discretionary and cut hard, temporarily', tag: 'Stabilize' },
      { ic: '💬', t: 'Build a recovery sequence', d: 'Your advisor orders which liabilities to tackle first for fastest relief', tag: 'Plan' },
    ],
  },
  wealthy: {
    title: "You're ready to multiply", move: 'Multiply the surplus', step: 'D',
    detail: "You have a healthy, durable surplus — the hard part is done. The risk now isn't falling behind, it's letting good money sit idle. The move is to make the difference between income and outflow work: invest it, deploy it, and look into opportunities that multiply it by N rather than add to it.",
    levers: [
      { ic: '📈', t: 'Put the surplus to work', d: 'Diversify across Tadawul, sukuk, real estate, and gold — the Doubling Path tool projects each', tag: 'Deploy' },
      { ic: '🏡', t: 'Look into income-producing assets', d: 'Property and ventures that generate cash flow, not just appreciation', tag: 'Multiply' },
      { ic: '💬', t: 'Design a wealth strategy', d: 'Your advisor builds a deployment plan matched to your risk and goals', tag: 'Plan' },
    ],
  },
};

const LADDER_STEPS: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];

export default function UnderstandPositioning() {
  const supabase = createClient();
  const { openEditProfile } = useProfileContext();

  const [loading, setLoading] = useState(true);
  const [age, setAge] = useState<number | null>(null);
  const [incomeByYear, setIncomeByYear] = useState<{ year: number; value: number }[]>([]);
  const [netWorthByYear, setNetWorthByYear] = useState<{ year: number; value: number }[]>([]);

  const [subView, setSubView] = useState<SubView>('stand');
  const [peer, setPeer] = useState<Peer>('similar');
  const [selectedQuad, setSelectedQuad] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: profile }, { data: incomeRows }, { data: netWorthRows }] = await Promise.all([
        supabase.from('profiles').select('age').eq('id', user.id).single(),
        supabase.from('income_entries').select('year, income').eq('user_id', user.id),
        supabase.from('net_worth_snapshots').select('year, amount').eq('user_id', user.id),
      ]);

      if (profile?.age) setAge(profile.age);
      if (incomeRows) setIncomeByYear(incomeRows.map((r) => ({ year: r.year, value: Number(r.income) })));
      if (netWorthRows) setNetWorthByYear(netWorthRows.map((r) => ({ year: r.year, value: Number(r.amount) })));
      setLoading(false);
    })();
  }, [supabase]);

  const currentYear = new Date().getFullYear();
  const minAge = BENCHMARK_START_AGE;
  const maxAge = age ? Math.max(minAge, age) : minAge;

  const youIncome = useMemo(
    () => (age ? buildYouSeries(incomeByYear, age, currentYear, minAge, maxAge) : []),
    [incomeByYear, age, currentYear, minAge, maxAge]
  );
  const youNetWorth = useMemo(
    () => (age ? buildYouSeries(netWorthByYear, age, currentYear, minAge, maxAge) : []),
    [netWorthByYear, age, currentYear, minAge, maxAge]
  );
  const benchmarks = useMemo(() => buildBenchmarkCurves(minAge, maxAge), [minAge, maxAge]);

  const compareIncome = peer === 'upper' ? benchmarks.incomeHigher : benchmarks.incomeNational;
  const compareNetworth = peer === 'upper' ? benchmarks.networthHigher : benchmarks.networthNational;

  const ages = useMemo(() => {
    const arr: number[] = [];
    for (let a = minAge; a <= maxAge; a++) arr.push(a);
    return arr;
  }, [minAge, maxAge]);

  const incomeChartData = ages.map((a, i) => {
    const you = youIncome[i] ?? null;
    const compare = compareIncome[i];
    const base = you != null ? Math.min(you, compare) : 0;
    const gapValue = you != null ? Math.max(compare - you, 0) : 0;
    const gainValue = you != null ? Math.max(you - compare, 0) : 0;
    return {
      age: a,
      you,
      national: benchmarks.incomeNational[i],
      higher: benchmarks.incomeHigher[i],
      base,
      gapValue,
      gainValue,
    };
  });

  const networthChartData = ages.map((a, i) => ({
    age: a,
    you: youNetWorth[i] ?? null,
    national: benchmarks.networthNational[i],
    higher: benchmarks.networthHigher[i],
  }));

  const hasIncomeData = youIncome.some((v) => v != null);
  const hasNetWorthData = youNetWorth.some((v) => v != null);

  const { missedTotal, gainTotal } = computeGapAndGain(youIncome, compareIncome);
  const compareName = peer === 'upper' ? 'higher-earning peers' : 'the national average';

  if (loading) {
    return <div className="text-sm text-[#898781]">Loading…</div>;
  }

  if (!age) {
    return (
      <div className="bg-white border border-black/10 rounded-2xl p-8 text-center">
        <p className="text-sm text-[#3D3D3A] mb-4">
          Set your age in your profile to see how your income and net worth compare by age.
        </p>
        <button
          onClick={openEditProfile}
          className="text-sm bg-[#085041] text-white rounded-lg px-4 py-2 font-medium"
        >
          Set your age →
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="inline-flex border border-black/10 rounded-lg overflow-hidden mb-6">
        <button
          onClick={() => setSubView('stand')}
          className={`px-4 py-2 text-xs font-medium ${subView === 'stand' ? 'bg-[#141414] text-white' : 'bg-white text-[#3D3D3A]'}`}
        >
          Where you stand
        </button>
        <button
          onClick={() => setSubView('quad')}
          className={`px-4 py-2 text-xs font-medium ${subView === 'quad' ? 'bg-[#141414] text-white' : 'bg-white text-[#3D3D3A]'}`}
        >
          What to do about it
        </button>
      </div>

      {subView === 'stand' && (
        <div>
          <div className="flex items-center gap-2.5 mb-5 flex-wrap">
            <span className="text-xs text-[#898781]">Compare yourself to:</span>
            {(['similar', 'upper', 'lower'] as Peer[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeer(p)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium border ${
                  peer === p
                    ? 'bg-[#E1F5EE] border-[#1D9E75] text-[#085041]'
                    : 'bg-white border-black/15 text-[#3D3D3A]'
                }`}
              >
                {p === 'similar' ? 'Similar peers' : p === 'upper' ? 'Higher earners' : 'National average'}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-white border border-black/10 rounded-2xl p-5">
              <div className="text-sm font-medium text-[#141414]">Monthly income</div>
              <div className="text-xs text-[#898781] mb-3">
                {hasIncomeData
                  ? `Your earning trajectory, age ${minAge} to ${maxAge}`
                  : `Log income in Lifetime Income to see your own trajectory here`}
              </div>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={incomeChartData}>
                    <CartesianGrid stroke="#ececE6" />
                    <XAxis dataKey="age" tick={{ fontSize: 10, fill: '#898781' }} tickFormatter={(v) => `${v}`} />
                    <YAxis tick={{ fontSize: 10, fill: '#898781' }} tickFormatter={(v) => `${Math.round(v / 1000)}K`} />
                    <Tooltip
                      labelFormatter={(v) => `Age ${v}`}
                      formatter={(value: number, key: string) => {
                        if (key === 'base' || key === 'gapValue' || key === 'gainValue') return [undefined, undefined];
                        return [`SAR ${fmt(value)}`, key === 'you' ? 'You' : key === 'national' ? 'National avg' : 'Higher peer'];
                      }}
                    />
                    <Area dataKey="base" stackId="fill" stroke="none" fill="transparent" legendType="none" />
                    <Area dataKey="gapValue" stackId="fill" stroke="none" fill="#D4537E" fillOpacity={0.22} legendType="none" />
                    <Area dataKey="gainValue" stackId="fill" stroke="none" fill="#97C459" fillOpacity={0.3} legendType="none" />
                    <Line type="monotone" dataKey="national" name="National avg" stroke="#2a78d6" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="higher" name="Higher peer" stroke="#141414" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="you" name="You" stroke="#8a99a8" strokeWidth={3} dot={false} connectNulls={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-3 flex-wrap justify-center text-[10px] text-[#3D3D3A] mt-2">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#D4537E', opacity: 0.5 }} />Missed opportunity</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#97C459', opacity: 0.6 }} />Realized gain</span>
              </div>
            </div>

            <div className="bg-white border border-black/10 rounded-2xl p-5">
              <div className="text-sm font-medium text-[#141414]">Net worth</div>
              <div className="text-xs text-[#898781] mb-3">
                {hasNetWorthData
                  ? `What you've built, age ${minAge} to ${maxAge}`
                  : `Log a net worth snapshot to see your own trajectory here`}
              </div>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={networthChartData}>
                    <CartesianGrid stroke="#ececE6" />
                    <XAxis dataKey="age" tick={{ fontSize: 10, fill: '#898781' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#898781' }} tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${Math.round(v / 1000)}K`)} />
                    <Tooltip
                      labelFormatter={(v) => `Age ${v}`}
                      formatter={(value: number, key: string) => [`SAR ${fmt(value)}`, key === 'you' ? 'You' : key === 'national' ? 'National avg' : 'Higher peer']}
                    />
                    <Line type="monotone" dataKey="national" name="National avg" stroke="#2a78d6" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="higher" name="Higher peer" stroke="#141414" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="you" name="You" stroke="#8a99a8" strokeWidth={3} dot={false} connectNulls={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-white border-[1.5px] border-[#D4537E] rounded-2xl p-6 mb-4">
            <div className="text-[11px] tracking-[0.1em] uppercase text-[#D4537E] mb-3">The missed opportunity</div>
            {hasIncomeData ? (
              <>
                <div className="font-serif text-xl text-[#141414] leading-relaxed mb-2">
                  {peer === 'upper' ? (
                    <>Against higher earners, you left roughly <strong className="text-[#D4537E] font-semibold">SAR {fmt(missedTotal)}</strong> on the table so far.</>
                  ) : (
                    <>You earned about <strong className="text-[#D4537E] font-semibold">SAR {fmt(missedTotal)}</strong> less than {compareName} during your slower-start years.</>
                  )}
                </div>
                <div className="text-sm text-[#3D3D3A] leading-relaxed">
                  This is the cumulative income difference versus {compareName}, using only the years you&apos;ve actually
                  logged. It&apos;s not a verdict — it&apos;s a measure of the distance, so you know exactly what you&apos;re
                  catching up to.
                </div>
              </>
            ) : (
              <div className="text-sm text-[#3D3D3A] leading-relaxed">
                Log some income entries in <Link href="/lifetime-income" className="text-[#085041] font-medium">Lifetime Income</Link> to see how your earnings compare against {compareName}.
              </div>
            )}
          </div>

          {hasIncomeData && gainTotal > 0 && (
            <div className="bg-[#E1F5EE] border border-[#5DCAA5] rounded-2xl p-5 mb-6 flex gap-4 items-start">
              <div className="text-xl">📈</div>
              <div>
                <div className="text-sm font-semibold text-[#085041] mb-1">But you&apos;ve started closing the gap</div>
                <div className="text-sm text-[#2C5040] leading-relaxed">
                  In the years you&apos;ve pulled above {compareName}, that recovery is worth about{' '}
                  <strong>SAR {fmt(gainTotal)}</strong> — proof the trajectory is yours to bend. The question now is how
                  fast you close the rest.
                </div>
              </div>
            </div>
          )}

          <div className="mb-6">
            <div className="text-[11px] tracking-[0.1em] uppercase text-[#898781] mb-3">
              Why the gap opened — in a Saudi context
            </div>
            <div className="grid sm:grid-cols-2 gap-2.5">
              <WhyCard icon="🎓" title="Late start after graduation" desc="Many Saudis enter the workforce at 23–24 after university. Those extra 2–3 years of zero income, while higher peers earned early, compound into a large lifetime gap." />
              <WhyCard icon="💼" title="Public vs. private sector path" desc="Government roles offer stability but slower salary growth. Higher peers often took private-sector or entrepreneurial risk that paid off in faster income jumps." />
              <WhyCard icon="🏠" title="Renting instead of owning early" desc="Years of rent with no equity, while peers used REDF support to buy and build property wealth, is one of the biggest silent drivers of the net-worth gap." />
              <WhyCard icon="💸" title="No early investing habit" desc="Money sat in current accounts earning nothing instead of compounding in Tadawul, sukuk, or gold. Time in the market — not timing — is what peers had." />
            </div>
          </div>

          <div className="mb-6">
            <div className="font-serif text-lg font-medium text-[#141414] mb-1">How to make up the gap</div>
            <div className="text-sm text-[#3D3D3A] mb-4">
              These aren&apos;t generic tips — each one becomes part of your holistic plan that MalMind tracks and protects.
            </div>
            <div className="flex flex-col gap-2">
              <LeverRow icon="📈" title="Add a second income stream" desc="Model a side income in the Velocity tool and watch your trajectory bend upward" tag="Add to plan" />
              <LeverRow icon="🏡" title="Move from renting to owning" desc="Check REDF eligibility — equity is the fastest net-worth catch-up lever you have" tag="Add to plan" />
              <LeverRow icon="💾" title="Start investing your disposable income" desc="Even a modest monthly amount compounds — the Doubling Path tool projects it forward" tag="Add to plan" />
              <LeverRow icon="💬" title="Build a catch-up plan with your advisor" desc="Let MalMind sequence these moves into a realistic path to close the gap" tag="Personalized" />
            </div>
          </div>

          <NudgeBanner>
            <strong className="text-[#3A2F0A]">MalMind remembers this.</strong> Your gap and your catch-up plan are now
            part of your holistic financial picture. Next time you&apos;re about to make a decision that widens the gap
            — a big discretionary purchase, a longer car loan, dipping into savings — I&apos;ll quietly remind you what
            it costs against this plan. Not to judge, just so the choice is yours with eyes open.
          </NudgeBanner>
        </div>
      )}

      {subView === 'quad' && (
        <div>
          <p className="text-sm text-[#3D3D3A] leading-relaxed mb-5 max-w-xl">
            Your trajectory tells you <em>where</em> you are. This tells you <em>what kind</em> of situation you&apos;re
            in — and the single most important move from here. Tap the quadrant that sounds like you.
          </p>

          <div className="bg-white border border-black/10 rounded-2xl p-4 mb-6">
            <div className="grid grid-cols-2 gap-2 relative">
              <QuadCard
                q="stuck" active={selectedQuad === 'stuck'} onClick={() => setSelectedQuad('stuck')}
                title={'"I\'m stuck and going nowhere"'} mood="Income covers outflow, but nothing's left over" move="→ Create surplus / saving"
                incomeH={54} outflowH={52}
              />
              <QuadCard
                q="wealthy" active={selectedQuad === 'wealthy'} onClick={() => setSelectedQuad('wealthy')}
                title={'"I\'m wealthy, now what?"'} mood="Strong surplus — but is it working hard enough?" move="→ Multiply the surplus"
                incomeH={62} outflowH={40}
              />
              <QuadCard
                q="poor" active={selectedQuad === 'poor'} onClick={() => setSelectedQuad('poor')}
                title={'"I\'m poor"'} mood="Not enough income or assets to build on yet" move="→ Generate income / assets"
                incomeH={28} outflowH={50}
              />
              <QuadCard
                q="behind" active={selectedQuad === 'behind'} onClick={() => setSelectedQuad('behind')}
                title={'"I\'m not catching up"'} mood="Liabilities outweigh income — slipping backward" move="→ Flip the balance"
                incomeH={38} outflowH={58}
              />
            </div>
          </div>

          {selectedQuad ? (
            <div className="bg-white border-[1.5px] border-[#1D9E75] rounded-2xl p-6">
              <div className="text-[11px] tracking-[0.1em] uppercase text-[#1D9E75] mb-3">Your situation</div>
              <div className="font-serif text-lg text-[#141414] leading-relaxed mb-2">
                <strong className="font-semibold">{QUAD_DATA[selectedQuad].title}.</strong> The move that matters most:{' '}
                <strong className="font-semibold">{QUAD_DATA[selectedQuad].move.toLowerCase()}</strong>.
              </div>
              <div className="text-sm text-[#3D3D3A] leading-relaxed mb-5">{QUAD_DATA[selectedQuad].detail}</div>

              <div className="flex items-center gap-2 mb-5 flex-wrap">
                <span className="text-xs text-[#898781] mr-1">Maturity path:</span>
                {LADDER_STEPS.map((s, i) => (
                  <span key={s} className="flex items-center gap-2">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-[1.5px] ${
                        QUAD_DATA[selectedQuad].step === s
                          ? 'bg-[#1D9E75] border-[#1D9E75] text-white'
                          : 'bg-white border-black/15 text-[#898781]'
                      }`}
                    >
                      {s}
                    </span>
                    {i < LADDER_STEPS.length - 1 && <span className="text-black/20 text-xs">→</span>}
                  </span>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                {QUAD_DATA[selectedQuad].levers.map((l) => (
                  <LeverRow key={l.t} icon={l.ic} title={l.t} desc={l.d} tag={l.tag} />
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-black/10 rounded-2xl p-8 text-center text-sm text-[#898781]">
              Tap the quadrant above that sounds like you.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WhyCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-white border border-black/10 rounded-lg p-3.5">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-base">{icon}</span>
        <span className="text-sm font-medium text-[#141414]">{title}</span>
      </div>
      <div className="text-xs text-[#3D3D3A] leading-relaxed">{desc}</div>
    </div>
  );
}

function LeverRow({ icon, title, desc, tag }: { icon: string; title: string; desc: string; tag: string }) {
  return (
    <div className="flex items-center gap-3 bg-white border border-black/10 rounded-lg px-4 py-3 hover:border-[#1D9E75] transition-colors">
      <span className="text-lg">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[#141414]">{title}</div>
        <div className="text-xs text-[#898781]">{desc}</div>
      </div>
      <span className="text-[11px] font-semibold text-[#1D9E75] bg-[#E1F5EE] border border-[#5DCAA5] px-2.5 py-1 rounded-full whitespace-nowrap">
        {tag}
      </span>
    </div>
  );
}

function NudgeBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start bg-[#FAF6EA] border border-[#C9A84C] rounded-xl p-4">
      <div className="w-7 h-7 rounded-full bg-[#C9A84C] flex items-center justify-center font-serif font-semibold text-white text-sm shrink-0">
        M
      </div>
      <div className="text-xs text-[#5A4A1A] leading-relaxed">{children}</div>
    </div>
  );
}

function QuadCard({
  q, active, onClick, title, mood, move, incomeH, outflowH,
}: {
  q: string; active: boolean; onClick: () => void; title: string; mood: string; move: string;
  incomeH: number; outflowH: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left p-4 rounded-xl border transition-colors ${
        active ? 'border-[#1D9E75] bg-[#E1F5EE]' : 'border-black/10 bg-white hover:bg-[#F5F4F0]'
      }`}
    >
      <div className="text-sm font-semibold text-[#141414] mb-1">{title}</div>
      <div className="text-xs text-[#898781] italic mb-3">{mood}</div>
      <div
        className={`text-xs font-medium text-[#085041] inline-block px-2.5 py-1 rounded-full border mb-3 ${
          active ? 'bg-white border-[#5DCAA5]' : 'bg-[#E1F5EE] border-[#5DCAA5]'
        }`}
      >
        {move}
      </div>
      <div className="flex gap-4 items-end h-16">
        <div className="flex flex-col items-center gap-1">
          <div className="w-8 rounded-t" style={{ height: incomeH, background: '#1D9E75' }} />
          <div className="text-[9px] text-[#898781]">Income</div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-8 rounded-t" style={{ height: outflowH, background: '#C0392B' }} />
          <div className="text-[9px] text-[#898781]">Outflow</div>
        </div>
      </div>
    </button>
  );
}
