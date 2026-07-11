'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { useProfileContext } from '@/components/shared/AppShell';
import {
  LIFE_EXPECTANCY, COMPARISON_HORIZON_YEARS, ROI_PRESETS,
  doublingYears, buildMilestones, comparisonValue, fmtMonthYear,
} from '@/lib/doublingPath';

function fmt(n: number) {
  return Math.round(n).toLocaleString();
}

function fmtCompact(n: number) {
  if (n >= 1e9) return (n / 1e9).toFixed(n >= 1e10 ? 0 : 1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M';
  if (n >= 1e3) return Math.round(n / 1e3) + 'K';
  return String(Math.round(n));
}

type Scale = 'log' | 'linear';

export default function DoublingPathPage() {
  const router = useRouter();
  const supabase = createClient();
  const { openEditProfile } = useProfileContext();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [portfolioValue, setPortfolioValue] = useState('100000');
  const [roi, setRoi] = useState('8');
  const [scale, setScale] = useState<Scale>('log');
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
    })();
  }, [supabase, router]);

  async function saveSettings(roiOverride?: number) {
    if (!userId) return;
    const val = parseFloat(portfolioValue.replace(/[^0-9.]/g, '')) || 0;
    const roiVal = roiOverride ?? (parseFloat(roi) || 0);
    await supabase
      .from('investment_settings')
      .upsert({ user_id: userId, portfolio_value: val, expected_roi: roiVal }, { onConflict: 'user_id' });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const amount = parseFloat(portfolioValue.replace(/[^0-9.]/g, '')) || 0;
  const roiNum = parseFloat(roi) || 0;
  const dy = roiNum > 0 ? doublingYears(roiNum) : Infinity;

  const milestones = useMemo(
    () => (age && roiNum > 0 ? buildMilestones(amount, age, roiNum) : []),
    [amount, age, roiNum]
  );

  const shown = milestones.filter((m) => m.ageThen <= 90);
  const reachable = milestones.filter((m) => m.ageThen <= LIFE_EXPECTANCY);
  const bigMilestone = reachable.length >= 5 ? reachable[4] : reachable[reachable.length - 1];
  const firstDouble = milestones[0];

  const chartData = shown.map((m) => ({
    iter: m.iter,
    value: m.value,
    age: Math.round(m.ageThen * 10) / 10,
    label: fmtMonthYear(m.date),
  }));

  if (loading) {
    return <div className="text-sm text-[var(--muted)]">Loading…</div>;
  }

  if (!age) {
    return (
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-8 text-center">
        <p className="text-sm text-[var(--ink-2)] mb-4">
          Set your age in your profile to see the doubling path.
        </p>
        <button
          onClick={openEditProfile}
          className="text-sm bg-[var(--green-dark)] text-white rounded-lg px-4 py-2 font-medium"
        >
          Set your age →
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--blue)] font-semibold mb-1">
        Think
      </div>
      <h1 className="font-serif text-2xl font-semibold text-[var(--ink)] mb-1">
        The Doubling Path
      </h1>
      <p className="text-sm text-[var(--ink-2)] mb-6 max-w-xl">
        Compounding is impossible to feel as a percentage. So instead, this shows you every time
        your portfolio doubles — and exactly how old you&apos;ll be when it happens.
      </p>

      {/* inputs */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-5">
        <div className="text-[11px] tracking-[0.1em] uppercase text-[var(--muted)] mb-4">
          Your investment picture
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">Current portfolio value</label>
            <div className="flex items-center border border-[var(--border-default)] rounded-lg px-3 focus-within:border-[var(--green)]">
              <span className="text-xs text-[var(--muted)] mr-1">SAR</span>
              <input
                value={portfolioValue}
                onChange={(e) => setPortfolioValue(e.target.value)}
                onBlur={() => saveSettings()}
                className="w-full py-2 text-sm outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">Your age today</label>
            <div className="border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm bg-[var(--surface-0)] text-[var(--ink-2)]">
              {age} years
            </div>
          </div>
          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">Average annual return (ROI)</label>
            <div className="flex items-center border border-[var(--border-default)] rounded-lg px-3 focus-within:border-[var(--green)]">
              <input
                value={roi}
                onChange={(e) => setRoi(e.target.value)}
                onBlur={() => saveSettings()}
                className="w-full py-2 text-sm outline-none"
              />
              <span className="text-xs text-[var(--muted)] ml-1">%</span>
            </div>
            <div className="flex gap-1.5 flex-wrap mt-2">
              {ROI_PRESETS.map((p) => (
                <button
                  key={p.roi}
                  onClick={() => { setRoi(String(p.roi)); saveSettings(p.roi); }}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-[var(--border-medium)] text-[var(--ink-2)] hover:border-[var(--green)] hover:text-[var(--green-dark)]"
                >
                  {p.roi}% <span className="text-[var(--muted)]">{p.note}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 pt-3 mt-2 border-t border-[var(--border-default)]">
          <span className="text-xs text-[var(--muted)]">
            Age comes from your profile — edit it from the home page.
          </span>
          {saved && <span className="text-xs text-[var(--green)]">Saved.</span>}
        </div>
      </div>

      {/* doubling readout */}
      <div className="flex items-baseline gap-2.5 flex-wrap bg-[var(--green-bg)] border border-[var(--green-border)] rounded-xl px-5 py-4 mb-5">
        <span className="text-sm text-[var(--green-dark)]">At this return, your money doubles every</span>
        <span className="font-serif text-2xl font-semibold text-[var(--green-dark)]">
          {Number.isFinite(dy) ? `${dy.toFixed(1)} years` : '—'}
        </span>
        {Number.isFinite(dy) && (
          <span className="text-sm text-[var(--green-dark)]">(about every {Math.round(dy * 12)} months)</span>
        )}
      </div>

      {/* hero statement */}
      {bigMilestone && firstDouble && (
        <div className="bg-[var(--surface-card)] border-[1.5px] border-[var(--green)] rounded-2xl p-6 mb-5">
          <div className="text-[11px] tracking-[0.1em] uppercase text-[var(--green)] mb-3">If you keep this up</div>
          <div className="font-serif text-xl text-[var(--ink)] leading-relaxed">
            Your portfolio first doubles to <strong className="text-[var(--green-dark)] font-semibold">SAR {fmt(firstDouble.value)}</strong>{' '}
            by age <strong className="text-[var(--green-dark)] font-semibold">{Math.round(firstDouble.ageThen)}</strong>. Keep the same
            return and it reaches <strong className="text-[var(--green-dark)] font-semibold">SAR {fmt(bigMilestone.value)}</strong> by age{' '}
            <strong className="text-[var(--green-dark)] font-semibold">{Math.round(bigMilestone.ageThen)}</strong> — without you adding
            another riyal. That&apos;s the quiet power of compounding.
          </div>
        </div>
      )}

      {/* chart */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 mb-5">
        <div className="flex justify-between items-start mb-1">
          <div>
            <div className="text-sm font-medium text-[var(--ink)]">The doubling path</div>
            <div className="text-xs text-[var(--muted)] mb-1">Each bar is a doubling. The line is your age.</div>
            <div className="flex gap-3.5 text-[11px] text-[var(--ink-2)]">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[var(--green)] inline-block" />Portfolio value</span>
              <span className="flex items-center gap-1.5"><span className="w-3.5 h-0.5 rounded-sm bg-[var(--gold)] inline-block" />Your age</span>
            </div>
          </div>
          <div className="inline-flex border border-[var(--border-default)] rounded-lg overflow-hidden shrink-0">
            <button
              onClick={() => setScale('log')}
              className={`px-3 py-1.5 text-xs font-medium ${scale === 'log' ? 'bg-[var(--ink)] text-[var(--surface-0)]' : 'bg-[var(--surface-card)] text-[var(--ink-2)]'}`}
            >
              Log scale
            </button>
            <button
              onClick={() => setScale('linear')}
              className={`px-3 py-1.5 text-xs font-medium ${scale === 'linear' ? 'bg-[var(--ink)] text-[var(--surface-0)]' : 'bg-[var(--surface-card)] text-[var(--ink-2)]'}`}
            >
              Linear
            </button>
          </div>
        </div>
        <div className="h-80 mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid stroke="var(--chart-grid)" />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--muted)' }} angle={-45} textAnchor="end" height={55} />
              <YAxis
                yAxisId="value"
                scale={scale === 'log' ? 'log' : 'linear'}
                domain={scale === 'log' ? ['auto', 'auto'] : [0, 'auto']}
                tick={{ fontSize: 10, fill: 'var(--muted)' }}
                tickFormatter={(v) => `${fmtCompact(Number(v))}`}
              />
              <YAxis
                yAxisId="age"
                orientation="right"
                tick={{ fontSize: 10, fill: 'var(--gold)' }}
                domain={[Math.max(0, age - 2), 90]}
              />
              <Tooltip
                formatter={(value, name) => {
                  if (name === 'age') return [`${value} years old`, 'Your age'];
                  return [`SAR ${fmt(Number(value))}`, 'Portfolio value'];
                }}
              />
              <Bar yAxisId="value" dataKey="value" name="value" fill="var(--green)" radius={[3, 3, 0, 0]} />
              <Line yAxisId="age" type="monotone" dataKey="age" name="age" stroke="var(--gold)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--gold)' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* milestone list */}
      <div className="mb-5">
        <div className="text-[11px] tracking-[0.1em] uppercase text-[var(--muted)] mb-3">
          Every doubling, and how old you&apos;ll be
        </div>
        <div className="flex flex-col">
          {shown.map((m, i) => (
            <div
              key={m.iter}
              className={`grid grid-cols-[40px_1fr_auto_auto] gap-4 items-center px-4 py-3 border border-[var(--border-default)] ${
                i > 0 ? 'border-t-0' : ''
              } ${i === 0 ? 'rounded-t-xl' : ''} ${i === shown.length - 1 ? 'rounded-b-xl' : ''} ${
                bigMilestone && m.iter === bigMilestone.iter ? 'bg-[var(--green-bg)] border-[var(--green-border)]' : 'bg-[var(--surface-card)]'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                  bigMilestone && m.iter === bigMilestone.iter ? 'bg-[var(--green)] text-white' : 'bg-[var(--surface-1)] text-[var(--ink-2)]'
                }`}
              >
                {m.iter}
              </div>
              <div>
                <div className="font-serif text-base font-semibold text-[var(--ink)]">SAR {fmt(m.value)}</div>
                <div className="text-xs text-[var(--muted)]">
                  {fmtMonthYear(m.date)} · {m.yearsFromNow.toFixed(1)} years from now
                </div>
              </div>
              <div className="text-xs text-[var(--muted)] text-right whitespace-nowrap">
                {Math.pow(2, m.iter).toLocaleString()}×
              </div>
              <div className="text-right">
                <div className="text-base font-semibold text-[var(--green-dark)]">{Math.round(m.ageThen)}</div>
                <div className="text-[10px] text-[var(--muted)]">your age</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* reality note */}
      <NudgeBanner>
        <strong className="text-[var(--gold-text-strong)]">A note on keeping it real.</strong> This assumes you sustain{' '}
        {roiNum.toFixed(1)}% every single year — which is hard. Markets have bad years, and the later
        milestones sit beyond a normal lifetime. The point isn&apos;t the fantasy number at the end —
        it&apos;s the <strong className="text-[var(--gold-text-strong)]">first three or four doublings</strong>, which
        are very real and happen during your working life. That&apos;s where the focus belongs.
      </NudgeBanner>

      {/* ROI comparison */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 my-5">
        <div className="font-serif text-lg font-medium text-[var(--ink)] mb-1">Why the return rate is everything</div>
        <div className="text-sm text-[var(--ink-2)] mb-4">
          Same SAR {fmt(amount)}, {COMPARISON_HORIZON_YEARS} years of growth. Only the return changes. This is
          where you&apos;d land by age {Math.round(age + COMPARISON_HORIZON_YEARS)}.
        </div>
        <ComparisonRows amount={amount} userRoi={roiNum} />
      </div>

      {/* levers */}
      <div className="mb-2">
        <div className="font-serif text-lg font-medium text-[var(--ink)] mb-1">Bend the path</div>
        <div className="text-sm text-[var(--ink-2)] mb-4">
          Each move becomes part of your holistic plan that MalMind tracks — and reminds you of when a
          decision would slow you down.
        </div>
        <div className="flex flex-col gap-2">
          <LeverRow icon="➕" title="Keep adding to the portfolio" desc="This path assumes you never add a single riyal — monthly contributions reach every milestone sooner" tag="Add to plan" />
          <LeverRow icon="📊" title="Improve your average return" desc="Even 2–3 extra points of ROI dramatically shortens the time between doublings" tag="Explore" />
          <LeverRow icon="🛡" title="Protect against the downside" desc="A single bad year resets the clock — diversification keeps the compounding intact" tag="Add to plan" />
          <LeverRow icon="💬" title="Build a real investment plan" desc="Let your advisor turn this projection into a Sharia-aware, diversified strategy" tag="Personalized" />
        </div>
      </div>
    </div>
  );
}

function ComparisonRows({ amount, userRoi }: { amount: number; userRoi: number }) {
  const rois = [...ROI_PRESETS.map((p) => p.roi), userRoi];
  const uniqueRois = Array.from(new Set(rois)).sort((a, b) => a - b);
  const results = uniqueRois.map((r) => ({ roi: r, value: comparisonValue(amount, r) }));
  const maxVal = Math.max(...results.map((r) => r.value));
  const colors: Record<number, string> = { 5: 'var(--chart-neutral-1)', 8: 'var(--blue-2)', 12: 'var(--green)', 20: 'var(--gold)' };

  return (
    <div className="flex flex-col gap-2.5">
      {results.map((r) => {
        const pct = Math.max(6, (Math.log(r.value) / Math.log(maxVal)) * 100);
        const isUser = Math.abs(r.roi - userRoi) < 0.05;
        const color = isUser ? 'var(--green-dark)' : colors[Math.round(r.roi)] || 'var(--green)';
        const preset = ROI_PRESETS.find((p) => p.roi === Math.round(r.roi));
        const note = isUser ? 'your rate' : preset?.note ?? '';
        return (
          <div key={r.roi} className="grid grid-cols-[90px_1fr_auto] gap-3.5 items-center">
            <div className="text-sm font-semibold text-[var(--ink)]">
              {r.roi.toFixed(1)}%
              <div className="text-[11px] text-[var(--muted)] font-normal">{note}</div>
            </div>
            <div className="h-7 bg-[var(--surface-0)] rounded-md overflow-hidden relative">
              <div
                className="h-full rounded-md flex items-center pl-2.5 text-[11px] text-white font-medium whitespace-nowrap"
                style={{ width: `${pct}%`, background: color }}
              >
                {fmtCompact(r.value)}
              </div>
            </div>
            <div className="text-sm font-semibold text-[var(--green-dark)] whitespace-nowrap text-right">
              SAR {fmt(r.value)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LeverRow({ icon, title, desc, tag }: { icon: string; title: string; desc: string; tag: string }) {
  return (
    <div className="flex items-center gap-3 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-lg px-4 py-3 hover:border-[var(--green)] transition-colors">
      <span className="text-lg">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[var(--ink)]">{title}</div>
        <div className="text-xs text-[var(--muted)]">{desc}</div>
      </div>
      <span className="text-[11px] font-semibold text-[var(--green)] bg-[var(--green-bg)] border border-[var(--green-border)] px-2.5 py-1 rounded-full whitespace-nowrap">
        {tag}
      </span>
    </div>
  );
}

function NudgeBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start bg-[var(--gold-bg)] border border-[var(--gold)] rounded-xl p-4">
      <div className="w-7 h-7 rounded-full bg-[var(--gold)] flex items-center justify-center font-serif font-semibold text-white text-sm shrink-0">
        M
      </div>
      <div className="text-xs text-[var(--gold-text-body)] leading-relaxed">{children}</div>
    </div>
  );
}
