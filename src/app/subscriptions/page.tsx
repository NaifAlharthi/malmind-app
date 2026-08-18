'use client';

// Subscriptions — the quiet drain, examined. Reads the subscriptions
// book (managed in Commitments) and the Log's income, and stages:
//   D1 · the monthly total and what it eats of income
//   D2 · every subscription, weighed and annualized
//   D3 · the cut list — the biggest drains and what cutting returns
//   D4 · the opportunity cost engine: the same money, invested

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import ToolStage from '@/components/shared/ToolStage';

interface Sub { name: string; amount: number; billing_cycle: string; category: string | null }

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

export default function SubscriptionsPage() {
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const [subs, setSubs] = useState<Sub[] | null>(null);
  const [avgIncome, setAvgIncome] = useState(0);
  const [roiPct] = useState(7);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSubs([]); return; }
      const [{ data }, { data: snaps }] = await Promise.all([
        supabase.from('subscriptions').select('name, amount, billing_cycle, category').eq('user_id', user.id),
        supabase.from('financial_snapshots').select('year, month, income').eq('user_id', user.id)
          .order('year', { ascending: true }).order('month', { ascending: true }),
      ]);
      setSubs(((data as Sub[]) ?? []).map((s) => ({ ...s, amount: Number(s.amount) || 0 })));
      const arr = (snaps ?? []) as { income: number }[];
      const recent = arr.slice(-6);
      setAvgIncome(recent.length ? recent.reduce((a, s) => a + Number(s.income), 0) / recent.length : 0);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const d = useMemo(() => {
    if (!subs) return null;
    const monthlyOf = (s: Sub) => (s.billing_cycle === 'yearly' ? s.amount / 12 : s.amount);
    const rows = subs.map((s) => ({ ...s, monthly: monthlyOf(s) })).sort((a, b) => b.monthly - a.monthly);
    const totalMonthly = rows.reduce((a, s) => a + s.monthly, 0);
    // ten years of the same money, compounding monthly at roiPct
    const r = roiPct / 100 / 12;
    const n = 120;
    const invested = totalMonthly * ((Math.pow(1 + r, n) - 1) / r);
    return { rows, totalMonthly, annual: totalMonthly * 12, invested };
  }, [subs, roiPct]);

  if (subs === null || !d) return <div className="text-sm text-[var(--muted)]">…</div>;

  return (
    <div className="max-w-3xl">
      <div className="text-[10px] tracking-[0.12em] uppercase text-[var(--gold)] mb-1">☀ {L('اليوم', 'Today')}</div>
      <h1 className="font-serif text-3xl font-semibold text-[var(--ink)] mb-1">📅 {L('اشتراكاتك', 'Subscriptions')}</h1>
      <p className="text-sm text-[var(--ink-2)] mb-6 max-w-2xl">
        {L('النزيف الهادئ — ما يغادر وحده كل شهر، موزوناً ومقارناً بدخلك.', 'The quiet drain — what leaves on its own every month, weighed against your income.')}
      </p>

      {subs.length === 0 ? (
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6">
          <p className="text-[12px] text-[var(--muted)] mb-3">{L('سمِّ اشتراكاتك في «الالتزامات» — وتُوزن هنا.', 'Name your subscriptions in Commitments — they get weighed here.')}</p>
          <Link href="/commitments" className="text-xs font-semibold text-white bg-[var(--green-dark)] rounded-lg px-4 py-2 inline-block">{L('أضف اشتراكاً ←', 'Add a subscription →')}</Link>
        </div>
      ) : (
        <>
          {/* D1 · the total and its bite */}
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
            <div className="grid grid-cols-3 gap-2">
              {([
                [L('شهرياً', 'Per month'), fmt(d.totalMonthly), '#D64545'],
                [L('سنوياً', 'Per year'), fmt(d.annual), '#E0922A'],
                [L('من دخلك', 'Of your income'), avgIncome > 0 ? `${((d.totalMonthly / avgIncome) * 100).toFixed(1)}%` : '—', 'var(--ink)'],
              ] as [string, string, string][]).map(([name, val, color]) => (
                <div key={name} className="bg-[var(--surface-1)] border border-[var(--border-faint)] rounded-xl px-3 py-2.5">
                  <div className="text-[9px] text-[var(--muted)]">{name}</div>
                  <div className="text-sm font-bold" style={{ color }} dir="ltr">{val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* D2 · every subscription, weighed */}
          <ToolStage level={2} title={L('كل اشتراك بوزنه', 'Every subscription, weighed')}>
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
            <div className="flex flex-col gap-2.5">
              {d.rows.map((s) => (
                <div key={s.name} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-semibold text-[var(--ink)] truncate">
                      {s.name}
                      {s.billing_cycle === 'yearly' && <span className="ms-2 text-[8px] text-[var(--muted)] border border-[var(--border-faint)] rounded-full px-1.5 py-0.5">{L('سنوي', 'yearly')}</span>}
                    </span>
                    <span className="block h-1.5 rounded-full bg-[var(--border-faint)] overflow-hidden mt-1" dir="ltr">
                      <span className="block h-full rounded-full bg-[#7A5EA8]" style={{ width: `${Math.max(3, (s.monthly / (d.rows[0]?.monthly || 1)) * 100)}%` }} />
                    </span>
                  </span>
                  <span className="text-[11px] font-bold text-[var(--ink)] whitespace-nowrap" dir="ltr">{fmt(s.monthly)}/{L('ش', 'mo')}</span>
                </div>
              ))}
            </div>
          </div>
          </ToolStage>

          {/* D3 · the cut list */}
          <ToolStage level={3} title={L('قائمة القصّ', 'The cut list')}>
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
            <div className="text-sm font-medium text-[var(--ink)] mb-2">✂️ {L('لو قصصت الأثقل ثلاثة', 'If you cut the heaviest three')}</div>
            {(() => {
              const top3 = d.rows.slice(0, 3);
              const saved = top3.reduce((a, s) => a + s.monthly, 0);
              return (
                <p className="text-xs text-[var(--ink-2)] leading-relaxed">
                  {top3.map((s) => s.name).join(' · ')} ⇒ {L(
                    `${fmt(saved)}/شهرياً تعود إليك — أي ${fmt(saved * 12)} في السنة.`,
                    `${fmt(saved)}/mo back in your pocket — ${fmt(saved * 12)} a year.`
                  )}
                </p>
              );
            })()}
          </div>
          </ToolStage>

          {/* D4 · the opportunity engine */}
          <ToolStage level={4} title={L('محرّك تكلفة الفرصة', 'The opportunity-cost engine')}>
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
            <p className="text-xs text-[var(--ink-2)] leading-relaxed">
              💡 {L(
                `المبلغ نفسه (${fmt(d.totalMonthly)}/شهرياً) مستثمراً بعائد ${roiPct}٪ لعشر سنوات يصبح ${fmt(d.invested)} — هذا هو الوجه الآخر لكل اشتراك.`,
                `The same ${fmt(d.totalMonthly)}/mo invested at ${roiPct}% for ten years becomes ${fmt(d.invested)} — the other face of every subscription.`
              )}
            </p>
          </div>
          </ToolStage>

          <Link href="/commitments" className="block w-full text-center text-sm font-semibold bg-[var(--green-dark)] text-white rounded-xl px-4 py-3">
            {L('أدر اشتراكاتك في «الالتزامات» ←', 'Manage them in Commitments →')}
          </Link>
        </>
      )}
    </div>
  );
}
