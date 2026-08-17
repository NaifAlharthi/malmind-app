'use client';

// The income tile on the Log page — where the whole flow BEGINS.
// The Log's income line explored: the recent months as bars against
// your usual pace, the records, and — because income is the source of
// everything below it — a closing line that hands the flow onward:
// what spending takes, and what survives to build the balance sheet.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';

interface Snap { year: number; month: number; income: number; expenses: number }

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
const fmtCompact = (n: number) => (Math.abs(n) >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n)));

export default function IncomeTile() {
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const [snaps, setSnaps] = useState<Snap[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSnaps([]); return; }
      const { data } = await supabase
        .from('financial_snapshots')
        .select('year, month, income, expenses')
        .eq('user_id', user.id)
        .order('year', { ascending: true })
        .order('month', { ascending: true });
      setSnaps((data as Snap[]) ?? []);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const d = useMemo(() => {
    if (!snaps || snaps.length === 0) return null;
    const recent = snaps.slice(-6);
    const avgIncome = recent.reduce((a, s) => a + Number(s.income), 0) / recent.length;
    const avgExpenses = recent.reduce((a, s) => a + Number(s.expenses), 0) / recent.length;
    const best = [...snaps].sort((a, b) => Number(b.income) - Number(a.income))[0];
    const thisYear = snaps[snaps.length - 1].year;
    const ytd = snaps.filter((s) => s.year === thisYear).reduce((a, s) => a + Number(s.income), 0);
    const allTime = snaps.reduce((a, s) => a + Number(s.income), 0);
    const series = snaps.slice(-12).map((s) => ({
      label: `${(ar ? MONTHS_AR : MONTHS_EN)[s.month - 1]} ${String(s.year).slice(2)}`,
      income: Number(s.income),
    }));
    return { avgIncome, avgExpenses, best, thisYear, ytd, allTime, series };
  }, [snaps, ar]);

  if (snaps === null) {
    return (
      <div className="drv-num bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 mb-8 text-sm text-[var(--muted)]">
        {L('يُقرأ الدخل…', 'Reading income…')}
      </div>
    );
  }
  if (!d) {
    return (
      <div className="drv-num bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 sm:p-6 mb-8">
        <div className="font-serif text-lg font-semibold text-[var(--ink)] mb-1">💰 {L('الدخل', 'Income')}</div>
        <p className="text-[11px] text-[var(--muted)] leading-relaxed mb-3">
          {L('الدخل هو منبع كل ما تحته — سجّل أول شهر ليبدأ النهر.', 'Income is the source of everything below it — log a first month and the river starts.')}
        </p>
        <Link href="/financial-numbers" className="text-xs font-semibold text-white bg-[var(--green-dark)] rounded-lg px-4 py-2 inline-block">
          {L('سجّل دخلك ←', 'Record your income →')}
        </Link>
      </div>
    );
  }

  const { avgIncome, avgExpenses, best, thisYear, ytd, allTime, series } = d;
  const saved = avgIncome - avgExpenses;
  const axisTick = { fontSize: 9, fill: 'var(--muted)' };

  return (
    <div className="drv-num bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 sm:p-6 mb-8">
      <div className="flex items-baseline justify-between gap-2 flex-wrap mb-1">
        <div className="font-serif text-lg font-semibold text-[var(--ink)]">💰 {L('الدخل — أول النهر', 'Income — where the flow begins')}</div>
        <Link href="/log/update?f=income" className="text-[11px] font-semibold text-[var(--green-dark)] hover:underline">
          {L('حدّث هذا السطر ←', 'Update this line →')}
        </Link>
      </div>
      <p className="text-[11px] text-[var(--muted)] leading-relaxed mb-4">
        {L('ما يدخل شهراً بشهر، مقابل إيقاعك المعتاد.', 'What comes in, month by month, against your usual pace.')}
      </p>

      {/* the stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {([
          [L('متوسط ٦ أشهر', '6-mo average'), `${fmt(avgIncome)}`],
          [L('أفضل شهر', 'Best month'), `${fmt(Number(best.income))}`, `${(ar ? MONTHS_AR : MONTHS_EN)[best.month - 1]} ${best.year}`],
          [L(`دخل ${thisYear}`, `${thisYear} so far`), `${fmt(ytd)}`],
          [L('منذ بداية السِّجل', 'All-time on record'), `${fmt(allTime)}`],
        ] as [string, string, string?][]).map(([name, val, sub]) => (
          <div key={name} className="bg-[var(--surface-1)] border border-[var(--border-faint)] rounded-xl px-3 py-2.5">
            <div className="text-[9px] text-[var(--muted)]">{name}</div>
            <div className="text-sm font-bold text-[#0E9F6E]" dir="ltr">{val}</div>
            {sub && <div className="text-[9px] text-[var(--muted)]">{sub}</div>}
          </div>
        ))}
      </div>

      {/* the last 12 months as bars, the average as a line to beat */}
      <div className="h-36" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={series} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border-faint)" />
            <XAxis dataKey="label" tick={axisTick} interval="preserveStartEnd" reversed={ar} axisLine={false} tickLine={false} />
            <YAxis tick={axisTick} tickFormatter={fmtCompact} width={40} orientation={ar ? 'right' : 'left'} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 11 }} formatter={(v) => fmt(Number(v))} />
            <ReferenceLine y={avgIncome} stroke="var(--gold)" strokeDasharray="5 4" label={{ value: L('إيقاعك', 'your pace'), fontSize: 9, fill: 'var(--gold)', position: 'insideTopLeft' }} />
            <Bar dataKey="income" name={L('الدخل', 'Income')} fill="#0E9F6E" isAnimationActive={false} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* the hand-off: income flows into spending below */}
      <div className="mt-3 rounded-xl border border-[var(--border-faint)] bg-[var(--surface-1)] px-3.5 py-2.5 text-[11px] text-[var(--ink-2)]">
        {saved >= 0
          ? L(
              `من كل شهر يأخذ المصروف نحو ${fmt(avgExpenses)} ↓ — ويعبر نحو ${fmt(saved)} إلى ميزانيتك: محافظك وأصولك وسداد ديونك.`,
              `Each month, spending takes ~${fmt(avgExpenses)} ↓ — and ~${fmt(saved)} crosses over into your balance sheet: portfolios, assets and debt payoff.`
            )
          : L(
              `المصروف (${fmt(avgExpenses)}) يأخذ الدخل كله ويزيد ${fmt(-saved)} — لا شيء يعبر إلى ميزانيتك حالياً ↓`,
              `Spending (${fmt(avgExpenses)}) takes it all and ${fmt(-saved)} more — nothing crosses into your balance sheet right now ↓`
            )}
      </div>
    </div>
  );
}
