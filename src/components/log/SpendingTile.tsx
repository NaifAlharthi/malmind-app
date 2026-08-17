'use client';

// The spending tile on the Log page — where income leaves. The Log's
// expenses line explored: the recent months as bars, and the split
// that matters — FIXED (subscriptions + debt servicing, the part that
// leaves on its own) versus VARIABLE (the part you steer). The fixed
// share ties this tile to the debt book below; what survives both is
// the saved flow that builds the balance sheet.

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

export default function SpendingTile() {
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const [snaps, setSnaps] = useState<Snap[] | null>(null);
  const [fixed, setFixed] = useState<{ subs: number; servicing: number }>({ subs: 0, servicing: 0 });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSnaps([]); return; }
      const [{ data }, { data: subs }, { data: loans }, { data: liabs }, { data: cards }] = await Promise.all([
        supabase.from('financial_snapshots').select('year, month, income, expenses').eq('user_id', user.id)
          .order('year', { ascending: true }).order('month', { ascending: true }),
        supabase.from('subscriptions').select('name, amount, billing_cycle, category').eq('user_id', user.id),
        supabase.from('loans').select('id, name, original_amount, balance, monthly_payment').eq('user_id', user.id),
        supabase.from('liabilities').select('id, name, original_amount, balance, monthly_payment').eq('user_id', user.id),
        supabase.from('credit_cards').select('id, name, balance, credit_limit, min_payment').eq('user_id', user.id),
      ]);
      setSnaps((data as Snap[]) ?? []);
      const subsMonthly = ((subs ?? []) as Record<string, unknown>[])
        .reduce((s, r) => s + (String(r.billing_cycle) === 'yearly' ? Number(r.amount) / 12 : Number(r.amount)) || 0, 0);
      const servicing =
        ((loans ?? []) as Record<string, unknown>[]).reduce((s, r) => s + (Number(r.monthly_payment) || 0), 0) +
        ((liabs ?? []) as Record<string, unknown>[]).reduce((s, r) => s + (Number(r.monthly_payment) || 0), 0) +
        ((cards ?? []) as Record<string, unknown>[]).reduce((s, r) => s + (Number(r.min_payment) || 0), 0);
      setFixed({ subs: subsMonthly, servicing });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const d = useMemo(() => {
    if (!snaps || snaps.length === 0) return null;
    const recent = snaps.slice(-6);
    const avgIncome = recent.reduce((a, s) => a + Number(s.income), 0) / recent.length;
    const avgExpenses = recent.reduce((a, s) => a + Number(s.expenses), 0) / recent.length;
    const highest = [...snaps].sort((a, b) => Number(b.expenses) - Number(a.expenses))[0];
    const series = snaps.slice(-12).map((s) => ({
      label: `${(ar ? MONTHS_AR : MONTHS_EN)[s.month - 1]} ${String(s.year).slice(2)}`,
      expenses: Number(s.expenses),
    }));
    return { avgIncome, avgExpenses, highest, series };
  }, [snaps, ar]);

  if (snaps === null) {
    return (
      <div className="drv-num bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 mb-8 text-sm text-[var(--muted)]">
        {L('يُقرأ المصروف…', 'Reading spending…')}
      </div>
    );
  }
  if (!d) {
    return (
      <div className="drv-num bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 sm:p-6 mb-8">
        <div className="font-serif text-lg font-semibold text-[var(--ink)] mb-1">🔥 {L('المصروف', 'Spending')}</div>
        <p className="text-[11px] text-[var(--muted)] leading-relaxed mb-3">
          {L('حيث يغادر الدخل — سجّل أول شهر لترى أين يذهب.', 'Where income leaves — log a first month to see where it goes.')}
        </p>
        <Link href="/financial-numbers" className="text-xs font-semibold text-white bg-[var(--green-dark)] rounded-lg px-4 py-2 inline-block">
          {L('سجّل مصروفك ←', 'Record your spending →')}
        </Link>
      </div>
    );
  }

  const { avgIncome, avgExpenses, highest, series } = d;
  const fixedTotal = fixed.subs + fixed.servicing;
  const variable = Math.max(0, avgExpenses - fixedTotal);
  const pctOfIncome = avgIncome > 0 ? Math.round((avgExpenses / avgIncome) * 100) : null;
  const saved = avgIncome - avgExpenses;
  const axisTick = { fontSize: 9, fill: 'var(--muted)' };

  return (
    <div className="drv-num bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 sm:p-6 mb-8">
      <div className="flex items-baseline justify-between gap-2 flex-wrap mb-1">
        <div className="font-serif text-lg font-semibold text-[var(--ink)]">🔥 {L('المصروف — حيث يغادر الدخل', 'Spending — where income leaves')}</div>
        <Link href="/financial-numbers" className="text-[11px] font-semibold text-[var(--green-dark)] hover:underline">
          {L('حدّثه في أرقامك ←', 'Update in your numbers →')}
        </Link>
      </div>
      <p className="text-[11px] text-[var(--muted)] leading-relaxed mb-4">
        {L(
          'ما يخرج شهراً بشهر — ومقداره الثابت الذي يغادر وحده قبل أن تلمسه.',
          'What leaves, month by month — and the fixed share that walks out on its own before you touch it.'
        )}
      </p>

      {/* the stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {([
          [L('متوسط ٦ أشهر', '6-mo average'), fmt(avgExpenses), undefined],
          [L('أعلى شهر', 'Highest month'), fmt(Number(highest.expenses)), `${(ar ? MONTHS_AR : MONTHS_EN)[highest.month - 1]} ${highest.year}`],
          [L('من دخلك', 'Of your income'), pctOfIncome === null ? '—' : `${pctOfIncome}%`, undefined],
          [L('الثابت شهرياً', 'Fixed per month'), fmt(fixedTotal), L('اشتراكات وخدمة ديون', 'subscriptions + debt servicing')],
        ] as [string, string, string | undefined][]).map(([name, val, sub]) => (
          <div key={name} className="bg-[var(--surface-1)] border border-[var(--border-faint)] rounded-xl px-3 py-2.5">
            <div className="text-[9px] text-[var(--muted)]">{name}</div>
            <div className="text-sm font-bold text-[#D64545]" dir="ltr">{val}</div>
            {sub && <div className="text-[9px] text-[var(--muted)]">{sub}</div>}
          </div>
        ))}
      </div>

      {/* fixed vs variable — the split that decides how steerable the month is */}
      {avgExpenses > 0 && (
        <div className="mb-4">
          <div className="h-3 rounded-full overflow-hidden flex" dir="ltr">
            {fixed.servicing > 0 && <div className="h-full" style={{ width: `${Math.min(100, (fixed.servicing / avgExpenses) * 100)}%`, background: '#E0922A' }} title={L('خدمة الديون', 'Debt servicing')} />}
            {fixed.subs > 0 && <div className="h-full" style={{ width: `${Math.min(100, (fixed.subs / avgExpenses) * 100)}%`, background: '#7A5EA8' }} title={L('اشتراكات', 'Subscriptions')} />}
            <div className="h-full flex-1" style={{ background: '#D64545', opacity: 0.55 }} title={L('متغيّر', 'Variable')} />
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[9px] text-[var(--muted)]" dir="ltr">
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#E0922A' }} /> {L('خدمة الديون', 'Debt servicing')} · {fmt(fixed.servicing)}</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#7A5EA8' }} /> {L('اشتراكات', 'Subscriptions')} · {fmt(fixed.subs)}</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#D64545', opacity: 0.55 }} /> {L('متغيّر — بيدك', 'Variable — yours to steer')} · {fmt(variable)}</span>
          </div>
        </div>
      )}

      {/* the last 12 months as bars, the average as the line to stay under */}
      <div className="h-36" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={series} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border-faint)" />
            <XAxis dataKey="label" tick={axisTick} interval="preserveStartEnd" reversed={ar} axisLine={false} tickLine={false} />
            <YAxis tick={axisTick} tickFormatter={fmtCompact} width={40} orientation={ar ? 'right' : 'left'} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 11 }} formatter={(v) => fmt(Number(v))} />
            <ReferenceLine y={avgExpenses} stroke="var(--gold)" strokeDasharray="5 4" label={{ value: L('إيقاعك', 'your pace'), fontSize: 9, fill: 'var(--gold)', position: 'insideTopLeft' }} />
            <Bar dataKey="expenses" name={L('المصروف', 'Spending')} fill="#D64545" isAnimationActive={false} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* the hand-off: servicing ties to the debt book; the survivor flows on */}
      <div className="mt-3 rounded-xl border border-[var(--border-faint)] bg-[var(--surface-1)] px-3.5 py-2.5 text-[11px] text-[var(--ink-2)]">
        {fixed.servicing > 0 && (
          <>⛓ {L(
            `${fmt(fixed.servicing)}/شهرياً من هذا المصروف يسدّد دفتر الديون أدناه`,
            `${fmt(fixed.servicing)}/mo of this spending pays the debt book below`
          )} · </>
        )}
        {saved >= 0
          ? L(`وما ينجو — نحو ${fmt(saved)} — يعبر إلى محافظك وأصولك ↓`, `and what survives — ~${fmt(saved)} — crosses into your portfolios and assets ↓`)
          : L(`ولا ينجو شيء هذا الإيقاع — العجز ${fmt(-saved)} شهرياً يؤكل من أصولك ↓`, `and at this pace nothing survives — the ${fmt(-saved)}/mo gap eats from your assets ↓`)}
      </div>
    </div>
  );
}
