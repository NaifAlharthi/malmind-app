'use client';

// The liabilities tile on the Log page — the debt book, itemised.
// Every loan and card the user has named, each drawn as a paid-vs-
// remaining bar (the founder's own spreadsheet visual), totaled, and
// compared against the single liabilities line the Log carries.
// Managing debts stays in Commitments; reading stays here.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';

interface Debt {
  id: string;
  name: string;
  kind: string; // loan · mortgage · debt · card
  original: number | null; // for cards: the credit limit
  balance: number;
  monthly: number;
}

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

export default function LiabilitiesTile() {
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const [debts, setDebts] = useState<Debt[] | null>(null);
  const [loggedLiab, setLoggedLiab] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setDebts([]); return; }
      const [{ data: loans }, { data: liabs }, { data: cards }, { data: snaps }] = await Promise.all([
        supabase.from('loans').select('id, name, loan_type, original_amount, balance, monthly_payment').eq('user_id', user.id),
        supabase.from('liabilities').select('id, name, original_amount, balance, monthly_payment').eq('user_id', user.id),
        supabase.from('credit_cards').select('id, name, balance, credit_limit, min_payment').eq('user_id', user.id),
        supabase.from('financial_snapshots').select('year, month, liabilities').eq('user_id', user.id)
          .order('year', { ascending: true }).order('month', { ascending: true }),
      ]);
      const arr = (snaps ?? []) as { liabilities: number }[];
      setLoggedLiab(arr.length ? Number(arr[arr.length - 1].liabilities) : null);
      setDebts([
        ...((loans ?? []) as Record<string, unknown>[]).map((r) => ({
          id: `loan-${r.id}`, name: String(r.name),
          kind: r.loan_type === 'mortgage' ? L('رهن عقاري', 'Mortgage') : L('قرض', 'Loan'),
          original: r.original_amount != null && Number(r.original_amount) > 0 ? Number(r.original_amount) : null,
          balance: Number(r.balance) || 0, monthly: Number(r.monthly_payment) || 0,
        })),
        ...((liabs ?? []) as Record<string, unknown>[]).map((r) => ({
          id: `liab-${r.id}`, name: String(r.name), kind: L('دين', 'Debt'),
          original: r.original_amount != null && Number(r.original_amount) > 0 ? Number(r.original_amount) : null,
          balance: Number(r.balance) || 0, monthly: Number(r.monthly_payment) || 0,
        })),
        ...((cards ?? []) as Record<string, unknown>[]).map((r) => ({
          id: `card-${r.id}`, name: String(r.name), kind: L('بطاقة', 'Card'),
          original: r.credit_limit != null && Number(r.credit_limit) > 0 ? Number(r.credit_limit) : null,
          balance: Number(r.balance) || 0, monthly: Number(r.min_payment) || 0,
        })),
      ]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (debts === null) {
    return (
      <div className="drv-num bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 mb-8 text-sm text-[var(--muted)]">
        {L('يُفتح دفتر الديون…', 'Opening the debt book…')}
      </div>
    );
  }

  if (debts.length === 0) {
    return (
      <div className="drv-num bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 sm:p-6 mb-8">
        <div className="font-serif text-lg font-semibold text-[var(--ink)] mb-1">⛓ {L('التزاماتك', 'Liabilities')}</div>
        <p className="text-[11px] text-[var(--muted)] leading-relaxed mb-3">
          {L(
            'سمِّ كل قرضٍ وبطاقةٍ ودين — وسيرسم هذا الجزء لكلٍّ منها شريط «المسدَّد مقابل المتبقي» ويجمعها في صورة واحدة.',
            "Name every loan, card and debt — this tile will draw each one's paid-vs-remaining bar and total them into one picture."
          )}
        </p>
        <Link href="/commitments" className="text-xs font-semibold text-white bg-[var(--green-dark)] rounded-lg px-4 py-2 inline-block">
          {L('ارسم خريطة ديونك ←', 'Map your debts →')}
        </Link>
      </div>
    );
  }

  const totalBalance = debts.reduce((s, d) => s + d.balance, 0);
  const withOriginal = debts.filter((d) => d.original !== null);
  const totalOriginal = withOriginal.reduce((s, d) => s + (d.original ?? 0), 0);
  const totalPaid = withOriginal.reduce((s, d) => s + Math.max(0, (d.original ?? 0) - d.balance), 0);
  const monthlyServicing = debts.reduce((s, d) => s + d.monthly, 0);
  const drift = loggedLiab !== null ? totalBalance - loggedLiab : null;

  const bar = (paid: number, remaining: number) => {
    const total = paid + remaining;
    if (total <= 0) return null;
    return (
      <div className="h-2.5 rounded-full overflow-hidden flex bg-[var(--border-faint)]" dir="ltr">
        <div className="h-full" style={{ width: `${(paid / total) * 100}%`, background: '#3B6FD4' }} />
        <div className="h-full" style={{ width: `${(remaining / total) * 100}%`, background: '#17B8C9' }} />
      </div>
    );
  };

  return (
    <div className="drv-num bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 sm:p-6 mb-8">
      <div className="flex items-baseline justify-between gap-2 flex-wrap mb-1">
        <div className="font-serif text-lg font-semibold text-[var(--ink)]">⛓ {L('التزاماتك', 'Liabilities')}</div>
        <Link href="/commitments" className="text-[11px] font-semibold text-[var(--green-dark)] hover:underline">
          {L('أدرها في الالتزامات ←', 'Manage in Commitments →')}
        </Link>
      </div>
      <p className="text-[11px] text-[var(--muted)] leading-relaxed mb-3">
        {L(
          'كل دين باسمه: الأزرق ما سدّدته، والفيروزي ما بقي. الخدمة الشهرية في الأسفل.',
          "Every debt by name: blue is what you've paid, teal what remains. Monthly servicing sits at the bottom."
        )}
      </p>

      {/* the legend, once */}
      <div className="flex items-center gap-3 mb-3 text-[9px] text-[var(--muted)]" dir="ltr">
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#3B6FD4' }} /> {L('مسدَّد', 'Paid')}</span>
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#17B8C9' }} /> {L('متبقٍ', 'Remaining')}</span>
      </div>

      <div className="flex flex-col gap-3">
        {debts.map((d) => {
          const paid = d.original !== null ? Math.max(0, d.original - d.balance) : null;
          return (
            <div key={d.id}>
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <div className="text-[11px] font-semibold text-[var(--ink)]">
                  {d.name}
                  <span className="ms-2 text-[9px] font-medium text-[var(--muted)] border border-[var(--border-faint)] rounded-full px-1.5 py-0.5">{d.kind}</span>
                </div>
                <div className="text-[10px] text-[var(--ink-2)] whitespace-nowrap" dir="ltr">
                  {paid !== null
                    ? <>{fmt(paid)} <span className="text-[var(--muted)]">{L('من', 'of')}</span> {fmt(d.original!)}</>
                    : <>{fmt(d.balance)} {L('متبقٍ', 'remaining')}</>}
                </div>
              </div>
              {paid !== null ? bar(paid, d.balance) : bar(0, d.balance)}
            </div>
          );
        })}

        {/* the whole book in one bar */}
        {totalOriginal > 0 && (
          <div className="pt-2 border-t border-[var(--border-faint)]">
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <div className="text-[11px] font-bold text-[var(--ink)]">{L('الكل', 'All')}</div>
              <div className="text-[10px] font-semibold text-[var(--ink-2)]" dir="ltr">
                {fmt(totalPaid)} <span className="text-[var(--muted)]">{L('من', 'of')}</span> {fmt(totalOriginal)}
              </div>
            </div>
            {bar(totalPaid, Math.max(0, totalOriginal - totalPaid))}
          </div>
        )}
      </div>

      {/* servicing + the drift against the Log's single line */}
      <div className="mt-3 flex items-center justify-between gap-3 flex-wrap rounded-xl border border-[var(--border-faint)] bg-[var(--surface-1)] px-3.5 py-2.5">
        <div className="text-[11px] text-[var(--ink-2)]">
          <span className="font-semibold" dir="ltr">{fmt(totalBalance)}</span> {L('إجمالي المتبقي', 'total remaining')}
          {monthlyServicing > 0 && <> · <span className="font-semibold" dir="ltr">{fmt(monthlyServicing)}</span>{L('/شهرياً خدمةً للدين', '/mo in debt servicing')}</>}
          {drift !== null && Math.abs(drift) >= 1 && (
            <span className="text-[var(--muted)]"> · {L(
              `سطر السِّجل يقول ${fmt(loggedLiab!)} (${drift >= 0 ? '+' : '−'}${fmt(Math.abs(drift))} فرقاً)`,
              `the Log's line says ${fmt(loggedLiab!)} (${drift >= 0 ? '+' : '−'}${fmt(Math.abs(drift))} apart)`
            )}</span>
          )}
        </div>
        <Link href="/commitments" className="text-[10px] font-semibold text-[var(--green-dark)] border border-[var(--green-border)] rounded-lg px-3 py-1.5 hover:bg-[var(--green-bg)] transition-colors whitespace-nowrap">
          {L('حدّث دفترك ←', 'Update the book →')}
        </Link>
      </div>
    </div>
  );
}
