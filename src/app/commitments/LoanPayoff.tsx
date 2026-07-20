'use client';

// Feature: loan/mortgage/liability payoff tracking. Reads loans +
// liabilities, and for every debt with a known original amount shows how
// much has been paid vs what remains - as 100%-stacked bars (like a
// paydown chart) plus a detail table with months-to-payoff. Debts missing
// their original amount get an inline "set it" input. Also accepts a
// dropped/pasted CSV so a whole loan book can be imported at once.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';

interface DebtRow {
  id: string;
  source: 'loans' | 'liabilities';
  name: string;
  original: number | null;
  balance: number;
  monthly: number;
}

function fmt(n: number) {
  return Math.round(n).toLocaleString();
}

export default function LoanPayoff({ version, onChanged }: { version: number; onChanged: () => void }) {
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const money = (n: number) => (ar ? `${fmt(n)} ريال` : `SAR ${fmt(n)}`);
  const [userId, setUserId] = useState<string | null>(null);
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [pending, setPending] = useState<Record<string, string>>({});
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const load = useCallback(async (uid: string) => {
    const [{ data: loans }, { data: liabilities }] = await Promise.all([
      supabase.from('loans').select('id, name, original_amount, balance, monthly_payment').eq('user_id', uid).order('created_at', { ascending: true }),
      supabase.from('liabilities').select('id, name, original_amount, balance, monthly_payment').eq('user_id', uid).order('created_at', { ascending: true }),
    ]);
    const all: DebtRow[] = [
      ...(loans ?? []).map((r) => ({
        id: String(r.id), source: 'loans' as const, name: String(r.name),
        original: r.original_amount != null ? Number(r.original_amount) : null,
        balance: Number(r.balance) || 0, monthly: Number(r.monthly_payment) || 0,
      })),
      ...(liabilities ?? []).map((r) => ({
        id: String(r.id), source: 'liabilities' as const, name: String(r.name),
        original: r.original_amount != null ? Number(r.original_amount) : null,
        balance: Number(r.balance) || 0, monthly: Number(r.monthly_payment) || 0,
      })),
    ];
    setDebts(all);
  }, [supabase]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      load(user.id);
    })();
  }, [supabase, load, version]);

  const tracked = useMemo(() => debts.filter((d) => d.original != null && d.original > 0), [debts]);
  const untracked = useMemo(() => debts.filter((d) => d.original == null || d.original <= 0), [debts]);

  const rows = useMemo(() => {
    const items = tracked.map((d) => {
      const paid = Math.max(0, (d.original ?? 0) - d.balance);
      const paidPct = d.original ? (paid / d.original) * 100 : 0;
      const monthsLeft = d.monthly > 0 ? Math.ceil(d.balance / d.monthly) : null;
      return { ...d, paid, paidPct, monthsLeft };
    });
    const totalOriginal = items.reduce((s, i) => s + (i.original ?? 0), 0);
    const totalPaid = items.reduce((s, i) => s + i.paid, 0);
    const totalBalance = items.reduce((s, i) => s + i.balance, 0);
    return { items, totalOriginal, totalPaid, totalBalance, totalPct: totalOriginal > 0 ? (totalPaid / totalOriginal) * 100 : 0 };
  }, [tracked]);

  async function setOriginal(d: DebtRow) {
    const v = parseFloat(String(pending[d.id] ?? '').replace(/[^0-9.]/g, ''));
    if (!v || !userId) return;
    await supabase.from(d.source).update({ original_amount: v }).eq('id', d.id);
    setPending((p) => ({ ...p, [d.id]: '' }));
    load(userId);
    onChanged();
  }

  const parseAndImport = useCallback(async (text: string) => {
    if (!userId) return;
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const dataLines = lines.filter((l) => !/^name[,\t]/i.test(l));
    const loanRows: Record<string, unknown>[] = [];
    const liabilityRows: Record<string, unknown>[] = [];
    for (const line of dataLines) {
      const c = line.split(/[,\t;]/).map((x) => x.trim());
      if (c.length < 4) continue;
      const [name, type, original, balance, monthly, rate] = c;
      const num = (s?: string) => parseFloat(String(s ?? '').replace(/[^0-9.]/g, '')) || 0;
      if (!name || !num(original)) continue;
      const t = (type || 'loan').toLowerCase();
      if (t === 'liability') {
        liabilityRows.push({ user_id: userId, name, kind: 'other', original_amount: num(original), balance: num(balance), monthly_payment: num(monthly) });
      } else {
        loanRows.push({
          user_id: userId, name, loan_type: t === 'mortgage' ? 'mortgage' : 'loan',
          original_amount: num(original), balance: num(balance), monthly_payment: num(monthly), interest_rate: num(rate),
        });
      }
    }
    if (loanRows.length === 0 && liabilityRows.length === 0) {
      setImportMsg(L('لا صفوف صحيحة. المتوقّع: الاسم، النوع (قرض/رهن/خصم)، الأصلي، الرصيد، الشهري، النسبة.', 'No valid rows. Expected: name, type (loan/mortgage/liability), original, balance, monthly, rate.'));
      return;
    }
    if (loanRows.length) await supabase.from('loans').insert(loanRows);
    if (liabilityRows.length) await supabase.from('liabilities').insert(liabilityRows);
    const nAdded = loanRows.length + liabilityRows.length;
    setImportMsg(L(`تم استيراد ${nAdded} ديناً.`, `Imported ${nAdded} debt${nAdded === 1 ? '' : 's'}.`));
    setImportText('');
    load(userId);
    onChanged();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, supabase, load, onChanged, ar]);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => parseAndImport(String(reader.result ?? ''));
    reader.readAsText(file);
  }

  if (debts.length === 0) return null;

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
      <div className="flex items-center gap-2.5 mb-1">
        <span className="text-lg">📉</span>
        <h2 className="font-serif text-lg font-semibold text-[var(--ink)]">{L('تقدّم السداد', 'Payoff progress')}</h2>
      </div>
      <p className="text-xs text-[var(--muted)] mb-4 max-w-xl">
        {L(
          'كل دَين كرحلة: كم من المبلغ الأصلي قضيت عليه فعلاً، وكم تبقّى، وكم شهراً من الدفعات يفصلك عن الصفر.',
          "Every debt as a journey: how much of the original amount you've already killed, what remains, and how many months of payments stand between you and zero."
        )}
      </p>

      {rows.items.length > 0 && (
        <>
          {/* summary tiles */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-[var(--surface-1)] border border-[var(--border-default)] rounded-xl p-3">
              <div className="text-[10px] text-[var(--muted)] mb-1">{L('إجمالي المقترَض', 'Borrowed in total')}</div>
              <div className="font-serif text-base font-bold text-[var(--ink)]">{money(rows.totalOriginal)}</div>
            </div>
            <div className="bg-[var(--surface-1)] border border-[var(--border-default)] rounded-xl p-3">
              <div className="text-[10px] text-[var(--muted)] mb-1">{L('المُسدَّد حتى الآن', 'Paid off so far')}</div>
              <div className="font-serif text-base font-bold text-[#4A78C4]">{money(rows.totalPaid)} · {rows.totalPct.toFixed(1)}%</div>
            </div>
            <div className="bg-[var(--surface-1)] border border-[var(--border-default)] rounded-xl p-3">
              <div className="text-[10px] text-[var(--muted)] mb-1">{L('المتبقّي', 'Still remaining')}</div>
              <div className="font-serif text-base font-bold text-[var(--green-dark)]">{money(rows.totalBalance)}</div>
            </div>
          </div>

          {/* stacked payoff bars */}
          <div className="flex flex-col gap-3 mb-5">
            {[...rows.items, { id: 'all', name: L('كل الديون', 'All debts'), paid: rows.totalPaid, balance: rows.totalBalance, paidPct: rows.totalPct, monthsLeft: null, original: rows.totalOriginal, monthly: 0, source: 'loans' as const }].map((d) => (
              <div key={d.id}>
                <div className="flex justify-between items-baseline mb-1">
                  <span className={`text-xs ${d.id === 'all' ? 'font-bold' : 'font-medium'} text-[var(--ink)]`}>{d.name}</span>
                  <span className="text-[10px] text-[var(--muted)]">
                    {d.paidPct.toFixed(1)}% {L('مُسدَّد', 'paid')}{d.monthsLeft != null ? ` · ${L(`~${d.monthsLeft} شهراً للصفر`, `~${d.monthsLeft} months to zero`)}` : ''}
                  </span>
                </div>
                <div className="h-7 rounded-md overflow-hidden flex bg-[var(--surface-1)]">
                  {d.paidPct > 0 && (
                    <div className="h-full bg-[#4A78C4] flex items-center ps-2 text-[10px] text-white font-medium whitespace-nowrap overflow-hidden" style={{ width: `${Math.max(d.paidPct, 3)}%` }}>
                      {d.paidPct >= 12 ? money(d.paid) : ''}
                    </div>
                  )}
                  <div className="h-full bg-[#7fb069] flex items-center justify-end pe-2 text-[10px] text-white font-medium whitespace-nowrap overflow-hidden" style={{ width: `${Math.max(100 - d.paidPct, 3)}%` }}>
                    {100 - d.paidPct >= 12 ? money(d.balance) : ''}
                  </div>
                </div>
              </div>
            ))}
            <div className="flex gap-4 text-[10px] text-[var(--ink-2)]">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#4A78C4] inline-block" />{L('مُسدَّد', 'Paid')}</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#7fb069] inline-block" />{L('متبقٍّ', 'Remaining')}</span>
            </div>
          </div>

          {/* detail table */}
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-xs whitespace-nowrap">
              <thead>
                <tr className="text-[var(--muted)] text-start">
                  <th className="py-1.5 pe-4 font-medium text-start">{L('الدَّين', 'Debt')}</th>
                  <th className="py-1.5 px-3 font-medium text-end">{L('الأصلي', 'Original')}</th>
                  <th className="py-1.5 px-3 font-medium text-end">{L('مُسدَّد (ريال)', 'Paid (SAR)')}</th>
                  <th className="py-1.5 px-3 font-medium text-end">{L('مُسدَّد (%)', 'Paid (%)')}</th>
                  <th className="py-1.5 px-3 font-medium text-end">{L('متبقٍّ (ريال)', 'Remaining (SAR)')}</th>
                  <th className="py-1.5 px-3 font-medium text-end">{L('متبقٍّ (%)', 'Remaining (%)')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.items.map((d) => (
                  <tr key={d.id} className="border-t border-[var(--border-default)]">
                    <td className="py-1.5 pe-4 text-[var(--ink)] font-medium">{d.name}</td>
                    <td className="py-1.5 px-3 text-end text-[var(--ink-2)]">{fmt(d.original ?? 0)}</td>
                    <td className="py-1.5 px-3 text-end text-[#4A78C4] font-semibold">{fmt(d.paid)}</td>
                    <td className="py-1.5 px-3 text-end text-[var(--ink-2)]">{d.paidPct.toFixed(2)}%</td>
                    <td className="py-1.5 px-3 text-end text-[var(--green-dark)] font-semibold">{fmt(d.balance)}</td>
                    <td className="py-1.5 px-3 text-end text-[var(--ink-2)]">{(100 - d.paidPct).toFixed(2)}%</td>
                  </tr>
                ))}
                <tr className="border-t border-[var(--border-default)] font-bold">
                  <td className="py-1.5 pe-4 text-[var(--ink)]">{L('الكل', 'All')}</td>
                  <td className="py-1.5 px-3 text-end text-[var(--ink-2)]">{fmt(rows.totalOriginal)}</td>
                  <td className="py-1.5 px-3 text-end text-[#4A78C4]">{fmt(rows.totalPaid)}</td>
                  <td className="py-1.5 px-3 text-end text-[var(--ink-2)]">{rows.totalPct.toFixed(2)}%</td>
                  <td className="py-1.5 px-3 text-end text-[var(--green-dark)]">{fmt(rows.totalBalance)}</td>
                  <td className="py-1.5 px-3 text-end text-[var(--ink-2)]">{(100 - rows.totalPct).toFixed(2)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* debts missing their original amount */}
      {untracked.length > 0 && (
        <div className="mb-4">
          <div className="text-[11px] tracking-[0.08em] uppercase text-[var(--muted)] mb-2">
            {L('أضِف المبلغ الأصلي لبدء تتبّع السداد', 'Add the original amount to start tracking payoff')}
          </div>
          <div className="flex flex-col gap-2">
            {untracked.map((d) => (
              <div key={d.id} className="flex items-center gap-2 flex-wrap text-xs bg-[var(--surface-1)] border border-[var(--border-default)] rounded-lg px-3 py-2">
                <span className="text-[var(--ink)] font-medium flex-1 min-w-[120px]">{d.name}</span>
                <span className="text-[var(--muted)]">{L('الرصيد', 'balance')} {money(d.balance)}</span>
                <input
                  value={pending[d.id] ?? ''}
                  onChange={(e) => setPending((p) => ({ ...p, [d.id]: e.target.value }))}
                  placeholder={L('المبلغ الأصلي', 'Original amount')}
                  className="w-32 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--ink)] outline-none focus:border-[var(--green)]"
                />
                <button onClick={() => setOriginal(d)} className="text-xs font-medium text-white bg-[var(--green-dark)] rounded-lg px-3 py-1.5">
                  {L('تتبّع', 'Track')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* file drop / paste import */}
      <button onClick={() => setImportOpen((o) => !o)} className="text-xs font-medium text-[var(--ink)]">
        {importOpen ? '▾' : '▸'} {L('استيراد القروض من ملف', 'Import loans from a file')}
      </button>
      {importOpen && (
        <div className="mt-2">
          <div
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-[var(--border-medium)] rounded-xl p-4 text-center text-xs text-[var(--muted)] mb-2"
          >
            {L('أسقِط ملف .csv هنا — دَين في كل سطر:', 'Drop a .csv here — one debt per line:')}{' '}
            <span className="font-mono text-[var(--ink-2)]" dir="ltr">name, type (loan/mortgage/liability), original, balance, monthly, rate</span>
          </div>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={3}
            placeholder={'Car loan,loan,68000,42000,1900,4.5\nHome mortgage,mortgage,350000,315000,2400,3.1'}
            className="w-full bg-[var(--surface-1)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--ink)] outline-none focus:border-[var(--green)]"
          />
          <div className="flex items-center gap-3 mt-2">
            <button onClick={() => parseAndImport(importText)} className="text-xs font-medium text-white bg-[var(--green-dark)] rounded-lg px-3 py-1.5">
              {L('استيراد الصفوف', 'Import rows')}
            </button>
            {importMsg && <span className="text-xs text-[var(--ink-2)]">{importMsg}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
