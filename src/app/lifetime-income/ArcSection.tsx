'use client';

// The Arc of Earning — a whole working life on one chart: monthly income by
// age, rising, peaking, then stepping down into retirement income. The user's
// own arc is drawn against the average Saudi earner and higher/lower peers;
// beneath it, the cumulative lifetime totals and an interpretation of what a
// sum that size could actually hold — the Standard-of-Living philosophy
// applied to a lifetime.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceArea, ResponsiveContainer,
} from 'recharts';
import {
  buildArc, benchmarkArc, lifetimeTotal, bracketFor, whatItCouldHold,
  PEER_SCALES, ARC_DEFAULTS,
} from '@/lib/lifetimeArc';

const fmtC = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'K' : String(Math.round(n)));

export default function ArcSection({ currentAge, startAge, startIncome, currentIncome, ar }: {
  currentAge: number; startAge: number; startIncome: number; currentIncome: number; ar: boolean;
}) {
  const L = (a: string, e: string) => (ar ? a : e);
  const moneyC = (n: number) => (ar ? `${fmtC(n)} ريال` : `SAR ${fmtC(n)}`);
  const [retireAge, setRetireAge] = useState(ARC_DEFAULTS.retireAge);
  const [replacement, setReplacement] = useState(ARC_DEFAULTS.replacement);

  const endAge = ARC_DEFAULTS.endAge;
  const hasYou = currentIncome > 0 && currentAge > 0;

  const { rows, totals, peak, pension } = useMemo(() => {
    const you = hasYou
      ? buildArc({ startAge, startIncome, currentAge, currentIncome, retireAge, replacement, endAge })
      : [];
    const avg = benchmarkArc(retireAge, replacement, endAge, 1);
    const high = benchmarkArc(retireAge, replacement, endAge, PEER_SCALES.higher);
    const low = benchmarkArc(retireAge, replacement, endAge, PEER_SCALES.lower);
    const byAge = new Map<number, { age: number; you?: number; avg?: number; high?: number; low?: number }>();
    const put = (arc: typeof avg, key: 'you' | 'avg' | 'high' | 'low') =>
      arc.forEach((p) => {
        const row = byAge.get(p.age) ?? { age: p.age };
        row[key] = p.income;
        byAge.set(p.age, row);
      });
    put(avg, 'avg'); put(high, 'high'); put(low, 'low'); if (hasYou) put(you, 'you');
    const rows = [...byAge.values()].sort((a, b) => a.age - b.age);
    const youArc = hasYou ? you : avg;
    const plateau = youArc.find((p) => p.age === retireAge - 1)?.income ?? 0;
    return {
      rows,
      totals: { you: hasYou ? lifetimeTotal(you) : 0, avg: lifetimeTotal(avg), high: lifetimeTotal(high) },
      peak: plateau,
      pension: Math.round(plateau * replacement),
    };
  }, [hasYou, startAge, startIncome, currentAge, currentIncome, retireAge, replacement, endAge]);

  const total = hasYou ? totals.you : totals.avg;
  const ratio = totals.avg > 0 ? total / totals.avg : 1;
  const bracket = bracketFor(total);
  const holds = whatItCouldHold(total);

  return (
    <div className="mb-6">
      {/* ── the arc chart ── */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 mb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
          <div>
            <div className="text-sm font-medium text-[var(--ink)]">{L('قوس العمر الكاسب', 'The arc of your earning life')}</div>
            <div className="text-xs text-[var(--muted)]">
              {L('دخلك الشهري بحسب العمر: يصعد، يبلغ ذروته، ثم يهبط إلى دخل التقاعد', 'Monthly income by age: rising, peaking, then stepping down to retirement income')}
            </div>
          </div>
          {/* retirement assumptions */}
          <div className="flex items-center gap-2 text-[11px]">
            <label className="text-[var(--muted)]">{L('التقاعد عند', 'Retire at')}</label>
            <select value={retireAge} onChange={(e) => setRetireAge(Number(e.target.value))}
              className="bg-[var(--surface-0)] border border-[var(--border-default)] rounded-md px-2 py-1 outline-none">
              {[55, 60, 65].map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <label className="text-[var(--muted)]">{L('معاش', 'pension')}</label>
            <select value={replacement} onChange={(e) => setReplacement(Number(e.target.value))}
              className="bg-[var(--surface-0)] border border-[var(--border-default)] rounded-md px-2 py-1 outline-none">
              {[0.5, 0.65, 0.8].map((r) => <option key={r} value={r}>{Math.round(r * 100)}%</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-4 text-[11px] text-[var(--ink-2)] mb-2 flex-wrap">
          {hasYou && <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-[var(--green)] inline-block" />{L('أنت', 'You')}</span>}
          <span className="flex items-center gap-1.5"><span className="w-4 h-0 border-t-2 border-dashed border-[var(--gold)] inline-block" />{L('متوسط الكاسب السعودي', 'Average Saudi earner')}</span>
          <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-[var(--muted)] opacity-50 inline-block" />{L('أقران أعلى/أدنى', 'Higher / lower peers')}</span>
        </div>

        <div className="h-72" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 10, right: 12, left: 4, bottom: 0 }}>
              <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
              {/* retirement-income zone */}
              <ReferenceArea x1={retireAge} x2={endAge} fill="var(--gold)" fillOpacity={0.06}
                label={{ value: L('دخل التقاعد', 'Retirement income'), position: 'insideTopRight', fontSize: 10, fill: 'var(--gold)' }} />
              <XAxis dataKey="age" type="number" domain={['dataMin', 'dataMax']}
                ticks={Array.from({ length: 13 }, (_, i) => 20 + i * 5)}
                tick={{ fontSize: 10, fill: 'var(--muted)' }} tickLine={false}
                label={{ value: L('العمر', 'Age'), position: 'insideBottomRight', fontSize: 10, fill: 'var(--muted)', dy: -4 }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} tickFormatter={(v) => fmtC(Number(v))} width={44} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(v, name) => [moneyC(Number(v)) + L('/شهر', '/mo'),
                  name === 'you' ? L('أنت', 'You') : name === 'avg' ? L('المتوسط', 'Average') : name === 'high' ? L('أقران أعلى', 'Higher peers') : L('أقران أدنى', 'Lower peers')]}
                labelFormatter={(a) => `${L('العمر', 'Age')} ${a}`}
              />
              <Line type="monotone" dataKey="low" stroke="var(--muted)" strokeOpacity={0.4} strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="high" stroke="var(--muted)" strokeOpacity={0.4} strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="avg" stroke="var(--gold)" strokeDasharray="6 4" strokeWidth={2} dot={false} />
              {hasYou && <Line type="monotone" dataKey="you" stroke="var(--green)" strokeWidth={3} dot={false} />}
              {hasYou && (
                <ReferenceLine x={currentAge} stroke="var(--ink)" strokeDasharray="3 3"
                  label={{ value: L('أنت هنا', 'You are here'), position: 'top', fontSize: 10, fill: 'var(--ink-2)' }} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* the cumulative sums */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <StatCard label={hasYou ? L('دخل عمرك كاملاً', 'Your lifetime income') : L('دخل العمر (المتوسط)', 'Lifetime income (average)')}
            value={moneyC(total)} accent="var(--green-dark)" />
          <StatCard label={L('متوسط الكاسب السعودي', 'Average Saudi lifetime')} value={moneyC(totals.avg)} accent="var(--gold)" />
          <StatCard label={L('ذروة دخلك الشهري', 'Your peak monthly')} value={moneyC(peak)} accent="var(--ink)" />
          <StatCard label={L('معاش التقاعد المقدَّر', 'Estimated pension')} value={moneyC(pension) + L('/شهر', '/mo')} accent="var(--ink)" />
        </div>
        {hasYou && (
          <p className="text-[11px] text-[var(--ink-2)] mt-3">
            {ratio >= 1
              ? L(`قوسك ≈ ${ratio.toFixed(1)}× قوس الكاسب السعودي المتوسط.`, `Your arc ≈ ${ratio.toFixed(1)}× the average Saudi earning arc.`)
              : L(`قوسك ≈ ${Math.round(ratio * 100)}% من قوس الكاسب المتوسط — وكل تحسين في الدخل يرفع القوس كله.`, `Your arc ≈ ${Math.round(ratio * 100)}% of the average arc — and every income improvement lifts the whole curve.`)}
          </p>
        )}
      </div>

      {/* ── what a lifetime this size could hold ── */}
      <div className="bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] rounded-2xl p-6 text-white">
        <div className="text-[10px] tracking-[0.12em] uppercase text-[var(--gold)] mb-1.5">
          {L('ماذا يعني هذا الرقم كحياة؟', 'What does that number mean as a life?')}
        </div>
        <div className="font-serif text-xl font-semibold mb-2">
          {ar ? bracket.name.ar : bracket.name.en}
          <span className="text-white/50 text-sm font-normal ms-2">· {moneyC(total)}</span>
        </div>
        <p className="text-sm text-white/75 leading-relaxed max-w-2xl mb-4">{ar ? bracket.story.ar : bracket.story.en}</p>

        <div className="text-[10px] text-white/50 mb-2">
          {L('بعد تغطية أيام الحياة العادية (~نصف الدخل)، يتّسع هذا العمر لنحو:', 'After the ordinary days of living (~half of it), a lifetime this size holds roughly:')}
        </div>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 mb-4">
          {holds.map(({ item, count }) => (
            <div key={item.icon} className="flex items-center gap-2.5 text-[13px]">
              <span className="text-lg shrink-0">{item.icon}</span>
              <span className="text-white/85">
                {count > 1 && <strong className="text-[#7FE8C4]">{count}× </strong>}
                {ar ? item.label.ar : item.label.en}
              </span>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-white/60 leading-relaxed border-t border-white/10 pt-3">
          {L('لكن الكسب ليس الإبقاء — المخطط أدناه يُظهر كم من هذا العمر يبقى معك فعلاً بمعدل ادخارك. ', "But earning isn't keeping — the chart below shows how much of this lifetime actually stays with you at your save rate. ")}
          <Link href="/standard-of-living" className="underline text-[#7FE8C4]">{L('صمّم مستوى معيشتك ليحمي الفرق', 'Design your standard of living to protect the gap')}</Link>
        </p>
      </div>

      <p className="text-[10px] text-[var(--muted)] mt-2">
        {L('منحنيات المقارنة تقديرات توضيحية من سياق سوق العمل السعودي، وليست بياناتك.', 'Benchmark curves are illustrative estimates from Saudi labor-market context, not your data.')}
      </p>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="bg-[var(--surface-0)] border border-[var(--border-faint)] rounded-xl p-3">
      <div className="text-[10px] text-[var(--muted)] mb-0.5">{label}</div>
      <div className="font-serif text-lg font-bold" style={{ color: accent }}>{value}</div>
    </div>
  );
}
