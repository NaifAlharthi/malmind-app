'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ComposedChart, Bar, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { buildProjection, monthLabel } from '@/lib/lifetimeProjection';

function fmt(n: number) {
  return Math.round(n).toLocaleString();
}

function fmtCompact(n: number) {
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 1 : 2) + 'M';
  if (n >= 1e3) return Math.round(n / 1e3) + 'K';
  return Math.round(n).toString();
}

type ChartMode = 'earned' | 'split';
type Reflection = 'happy' | 'unsure' | 'unhappy';

export default function UnderstandView() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentIncome, setCurrentIncome] = useState(0);

  const [startYear, setStartYear] = useState(new Date().getFullYear() - 5);
  const [startIncome, setStartIncome] = useState('');
  const [saveRatePct, setSaveRatePct] = useState('20');
  const [chartMode, setChartMode] = useState<ChartMode>('earned');
  const [reflection, setReflection] = useState<Reflection | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data } = await supabase
        .from('profiles')
        .select('monthly_income, career_start_year, career_start_income, lifetime_save_rate')
        .eq('id', user.id)
        .single();

      if (data) {
        setCurrentIncome(Number(data.monthly_income) || 0);
        if (data.career_start_year) setStartYear(data.career_start_year);
        if (data.career_start_income != null) setStartIncome(String(data.career_start_income));
        if (data.lifetime_save_rate != null) setSaveRatePct(String(data.lifetime_save_rate));
      }
      setLoading(false);
    })();
  }, [supabase]);

  async function saveAssumptions() {
    if (!userId) return;
    setSaving(true);
    setSaved(false);
    await supabase
      .from('profiles')
      .update({
        career_start_year: startYear,
        career_start_income: parseFloat(startIncome) || 0,
        lifetime_save_rate: parseFloat(saveRatePct) || 0,
      })
      .eq('id', userId);
    setSaving(false);
    setSaved(true);
  }

  const series = useMemo(
    () =>
      buildProjection({
        startYear,
        startIncome: parseFloat(startIncome) || 0,
        currentIncome,
        saveRate: (parseFloat(saveRatePct) || 0) / 100,
      }),
    [startYear, startIncome, currentIncome, saveRatePct]
  );

  const last = series[series.length - 1];
  const earned = last?.cumulativeIncome ?? 0;
  const kept = last?.cumulativeSaved ?? 0;
  const spent = earned - kept;
  const keptPct = earned > 0 ? (kept / earned) * 100 : 0;

  const chartData = series.map((p) => {
    const keptShare = p.cumulativeIncome > 0 ? (p.cumulativeSaved / p.cumulativeIncome) * 100 : 0;
    return {
      label: monthLabel(p),
      cumulativeIncome: p.cumulativeIncome,
      cumulativeSaved: p.cumulativeSaved,
      keptShare,
      spentShare: 100 - keptShare,
    };
  });

  const tickInterval = Math.max(0, Math.floor(chartData.length / 8) - 1);

  if (loading) {
    return <div className="text-sm text-[#898781]">Loading…</div>;
  }

  return (
    <div>
      {/* assumptions */}
      <div className="bg-white border border-black/10 rounded-2xl p-5 mb-6">
        <div className="text-[11px] tracking-[0.1em] uppercase text-[#898781] mb-4">
          A rough sketch of your earning life
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="text-xs text-[#898781] block mb-1">Career start year</label>
            <input
              type="number"
              value={startYear}
              onChange={(e) => setStartYear(parseInt(e.target.value) || startYear)}
              className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1D9E75]"
            />
          </div>
          <div>
            <label className="text-xs text-[#898781] block mb-1">Starting monthly income</label>
            <div className="flex items-center border border-black/10 rounded-lg px-3 focus-within:border-[#1D9E75]">
              <span className="text-xs text-[#898781] mr-1">SAR</span>
              <input
                value={startIncome}
                onChange={(e) => setStartIncome(e.target.value)}
                placeholder="e.g. 6,000"
                className="w-full py-2 text-sm outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-[#898781] block mb-1">Current monthly income</label>
            <div className="border border-black/10 rounded-lg px-3 py-2 text-sm bg-[#F5F4F0] text-[#3D3D3A]">
              SAR {fmt(currentIncome)}
            </div>
          </div>
          <div>
            <label className="text-xs text-[#898781] block mb-1">Roughly, % you save</label>
            <div className="flex items-center border border-black/10 rounded-lg px-3 focus-within:border-[#1D9E75]">
              <input
                value={saveRatePct}
                onChange={(e) => setSaveRatePct(e.target.value)}
                className="w-full py-2 text-sm outline-none"
              />
              <span className="text-xs text-[#898781] ml-1">%</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={saveAssumptions}
            disabled={saving}
            className="text-sm bg-[#085041] text-white rounded-lg px-4 py-2 font-medium disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save assumptions'}
          </button>
          {saved && <span className="text-xs text-[#1D9E75]">Saved to your profile.</span>}
          <span className="text-xs text-[#898781]">
            Current income comes from your profile — edit it from the home page.
          </span>
        </div>
      </div>

      {/* chart mode toggle */}
      <div className="inline-flex border border-black/10 rounded-lg overflow-hidden mb-4">
        <button
          onClick={() => setChartMode('earned')}
          className={`px-4 py-2 text-xs font-medium ${chartMode === 'earned' ? 'bg-[#141414] text-white' : 'bg-white text-[#3D3D3A]'}`}
        >
          What you&apos;ve earned vs kept
        </button>
        <button
          onClick={() => setChartMode('split')}
          className={`px-4 py-2 text-xs font-medium ${chartMode === 'split' ? 'bg-[#141414] text-white' : 'bg-white text-[#3D3D3A]'}`}
        >
          Income vs spending, over time
        </button>
      </div>

      {/* chart */}
      {chartMode === 'earned' ? (
        <div className="bg-white border border-black/10 rounded-2xl p-6 mb-6">
          <div className="text-sm font-medium mb-1">Accumulated income over your life</div>
          <div className="text-xs text-[#898781] mb-4">
            Every riyal you&apos;ve earned, stacked up month after month — a projection, not logged data
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid stroke="#ececE6" />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#898781' }} interval={tickInterval} angle={-45} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10, fill: '#898781' }} tickFormatter={(v) => fmtCompact(v)} />
                <Tooltip formatter={(v: number) => `SAR ${fmt(v)}`} />
                <Bar dataKey="cumulativeIncome" name="Total earned (cumulative)" fill="#4A78C4" />
                <Line type="monotone" dataKey="cumulativeSaved" name="What actually stayed (savings)" stroke="#C0504D" strokeWidth={2.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-black/10 rounded-2xl p-6 mb-4">
          <div className="text-sm font-medium mb-1">Of everything you earned, how much did you keep?</div>
          <div className="text-xs text-[#898781] mb-4">
            The blue area climbing means you kept a bigger share over time
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid stroke="#ececE6" />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#898781' }} interval={tickInterval} angle={-45} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10, fill: '#898781' }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                <Tooltip formatter={(v: number) => `${v.toFixed(0)}%`} />
                <Area type="monotone" dataKey="keptShare" name="Kept" stackId="a" stroke="#4A78C4" fill="#B8CCE8" />
                <Area type="monotone" dataKey="spentShare" name="Spent" stackId="a" stroke="#C0504D" fill="#E8C4C2" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-3 items-start bg-[#FAF6EA] border border-[#C9A84C] rounded-xl p-4 mt-4">
            <div className="w-7 h-7 rounded-full bg-[#C9A84C] flex items-center justify-center font-serif font-semibold text-white text-sm shrink-0">
              M
            </div>
            <div className="text-xs text-[#5A4A1A] leading-relaxed">
              <strong className="text-[#3A2F0A]">How to read this.</strong> Each point shows what
              share of your total lifetime income you&apos;ve kept versus spent up to that moment.
              When the blue rises, your saving discipline is improving. A sudden jump usually means
              a big one-off — a bonus saved, or a major purchase that pushed spending up.
            </div>
          </div>
        </div>
      )}

      {/* the big reveal */}
      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-white border border-[#4A78C4] rounded-2xl p-5">
          <div className="text-[11px] tracking-[0.08em] uppercase text-[#898781] mb-2">You&apos;ve earned</div>
          <div className="font-serif text-2xl font-semibold text-[#4A78C4] mb-1">SAR {fmtCompact(earned)}</div>
          <div className="text-xs text-[#3D3D3A]">across your working life so far</div>
        </div>
        <div className="bg-white border border-[#1D9E75] rounded-2xl p-5">
          <div className="text-[11px] tracking-[0.08em] uppercase text-[#898781] mb-2">You kept</div>
          <div className="font-serif text-2xl font-semibold text-[#085041] mb-1">SAR {fmtCompact(kept)}</div>
          <div className="text-xs text-[#3D3D3A]">that&apos;s {keptPct.toFixed(0)}% of everything you earned</div>
        </div>
        <div className="bg-white border border-[#C0504D] rounded-2xl p-5">
          <div className="text-[11px] tracking-[0.08em] uppercase text-[#898781] mb-2">You spent</div>
          <div className="font-serif text-2xl font-semibold text-[#C0504D] mb-1">SAR {fmtCompact(spent)}</div>
          <div className="text-xs text-[#3D3D3A]">{(100 - keptPct).toFixed(0)}% flowed through and is gone</div>
        </div>
      </div>

      {/* reflection */}
      <div className="bg-white border-[1.5px] border-[#1D9E75] rounded-2xl p-6 mb-6">
        <div className="text-[11px] tracking-[0.1em] uppercase text-[#1D9E75] mb-3">
          The question that matters
        </div>
        <div className="font-serif text-lg text-[#141414] leading-relaxed mb-2">
          Over your working life, about <strong className="text-[#085041] font-semibold">SAR {fmt(earned)}</strong> has
          passed through your hands. You kept <strong className="text-[#085041] font-semibold">SAR {fmt(kept)}</strong>.
        </div>
        <div className="text-sm text-[#3D3D3A] leading-relaxed mb-5">
          Most people have never seen this number. Earning SAR {fmtCompact(earned)} sounds like a lot
          — and it is. But {(100 - keptPct).toFixed(0)}% of it is already gone. The point isn&apos;t
          guilt: some of that spending bought a real, good life. The point is to look honestly and ask
          whether it bought the life you wanted.
        </div>
        <div className="text-sm font-medium text-[#141414] mb-3">
          Looking at this — are you happy with it?
        </div>
        <div className="flex gap-2.5 flex-wrap mb-4">
          <button
            onClick={() => setReflection('happy')}
            className="px-4 py-2.5 rounded-lg text-xs font-medium border border-black/15 hover:bg-[#E1F5EE] hover:border-[#1D9E75] hover:text-[#085041] transition-colors"
          >
            Yes, I&apos;m happy
          </button>
          <button
            onClick={() => setReflection('unsure')}
            className="px-4 py-2.5 rounded-lg text-xs font-medium border border-black/15 hover:bg-[#FAF6EA] hover:border-[#C9A84C] hover:text-[#633806] transition-colors"
          >
            I&apos;m not sure
          </button>
          <button
            onClick={() => setReflection('unhappy')}
            className="px-4 py-2.5 rounded-lg text-xs font-medium border border-black/15 hover:bg-[#E8C4C2] hover:border-[#C0504D] hover:text-[#7A2F2C] transition-colors"
          >
            No, this worries me
          </button>
        </div>

        {reflection && (
          <div className="pt-4 border-t border-black/10 text-sm text-[#3D3D3A] leading-relaxed">
            {reflection === 'happy' && (
              <>
                That&apos;s a good place to be — and rarer than you&apos;d think. If you&apos;re keeping{' '}
                {keptPct.toFixed(0)}% and feel your spending bought a life you value, you&apos;ve solved
                the part most people struggle with. From here, the move is to make the kept portion{' '}
                <strong className="text-[#141414] font-medium">work harder</strong> — invested rather
                than idle. Want to see what that SAR {fmtCompact(kept)} could become on the Doubling Path?
              </>
            )}
            {reflection === 'unsure' && (
              <>
                That uncertainty is worth sitting with — it usually means some spending served you well
                and some didn&apos;t, and you can&apos;t yet tell which. The most useful exercise: think
                about the last year. Can you point to what your spending{' '}
                <strong className="text-[#141414] font-medium">bought you</strong> — progress, joy, or
                neither? MalMind can help you trace it month by month.
              </>
            )}
            {reflection === 'unhappy' && (
              <>
                Naming that is the hard part, and you just did it. The good news: this curve isn&apos;t
                fixed — it&apos;s the result of habits, and habits change faster than you&apos;d expect.
                You don&apos;t need to become frugal or joyless. You need to find the spending that
                bought <strong className="text-[#141414] font-medium">neither progress nor enjoyment</strong>{' '}
                — the invisible leak — and redirect just that.
              </>
            )}
          </div>
        )}
      </div>

      {/* alignment lenses */}
      <div className="mb-6">
        <div className="font-serif text-lg font-medium text-[#141414] mb-1">
          It&apos;s not about spending less — it&apos;s about spending right
        </div>
        <div className="text-sm text-[#3D3D3A] mb-4">
          Money spent on a life you love isn&apos;t wasted. Let&apos;s look at whether yours bought what
          matters to you.
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <LensCard icon="🎯" title="Did it move you toward your goals?" desc="Compare what you spent against the goals you say matter — a home, family, freedom. Spending that bought progress is spending that worked." />
          <LensCard icon="😊" title="Did it buy real enjoyment?" desc="Travel, experiences, time with people you love — these are what money is for. The question is whether your spending actually delivered them." />
          <LensCard icon="💨" title="Or did it just evaporate?" desc="Much spending leaves no trace — neither progress nor joy. Finding this invisible leak is the single biggest opportunity in most people's finances." />
          <LensCard icon="⚖️" title="Is the balance right for your stage?" desc="A 25-year-old and a 45-year-old should keep different shares. MalMind weighs your ratio against where you are in life — not a generic rule." />
        </div>
      </div>

      {/* nudge */}
      <div className="flex gap-3 items-start bg-[#FAF6EA] border border-[#C9A84C] rounded-xl p-4">
        <div className="w-7 h-7 rounded-full bg-[#C9A84C] flex items-center justify-center font-serif font-semibold text-white text-sm shrink-0">
          M
        </div>
        <div className="text-xs text-[#5A4A1A] leading-relaxed">
          <strong className="text-[#3A2F0A]">MalMind keeps this in view.</strong> This lifetime picture
          becomes part of how I understand you. When you&apos;re weighing a big purchase later, I can
          show you what it does to this curve — not to stop you, but so you see it against everything
          you&apos;ve earned and kept. A good life needs spending. The goal is making sure yours buys the
          life you actually want.
        </div>
      </div>
    </div>
  );
}

function LensCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-white border border-black/10 rounded-xl p-4 hover:border-[#1D9E75] transition-colors">
      <div className="flex items-center gap-2.5 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-medium text-[#141414]">{title}</span>
      </div>
      <div className="text-xs text-[#3D3D3A] leading-relaxed">{desc}</div>
    </div>
  );
}
