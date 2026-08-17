'use client';

// The Log — the person's financial numbers as an honest spreadsheet.
// Months run across; line items run down, grouped into sections (assets,
// liabilities, flow) that collapse into their aggregate rows. This is the
// clearest possible answer to "where are ALL my numbers?": one grid, no
// interpretation — reading is here, editing stays in My Financial Numbers.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';

interface Snap {
  year: number; month: number;
  cash: number; stocks: number; real_estate: number; equity: number; other_assets: number;
  liabilities: number; income: number; expenses: number;
}

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_AR = ['ينا', 'فبر', 'مار', 'أبر', 'ماي', 'يون', 'يول', 'أغس', 'سبت', 'أكت', 'نوف', 'ديس'];
const SHOWN = 12; // the latest year of months on the grid

export default function LogTile() {
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const [snaps, setSnaps] = useState<Snap[] | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({ assets: true, liab: true, flow: true });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSnaps([]); return; }
      const { data } = await supabase
        .from('financial_snapshots')
        .select('year, month, cash, stocks, real_estate, equity, other_assets, liabilities, income, expenses')
        .eq('user_id', user.id)
        .order('year', { ascending: true })
        .order('month', { ascending: true });
      setSnaps((data as Snap[]) ?? []);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Latest months first — the freshest column sits beside the labels.
  const cols = useMemo(() => (snaps ?? []).slice(-SHOWN).reverse(), [snaps]);

  // Western digits like every other number surface in the product.
  const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
  const label = (s: Snap) => `${ar ? MONTHS_AR[s.month - 1] : MONTHS_EN[s.month - 1]} ${String(s.year).slice(2)}`;
  const assetsOf = (s: Snap) =>
    Number(s.cash) + Number(s.stocks) + Number(s.equity) + Number(s.real_estate) + Number(s.other_assets);

  if (snaps === null) {
    return (
      <div className="drv-num bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 mb-8 text-sm text-[var(--muted)]">
        {L('يفتح السِّجل…', 'Opening the Log…')}
      </div>
    );
  }

  if (snaps.length === 0) {
    return (
      <div className="drv-num bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 mb-8">
        <div className="font-serif text-lg font-semibold text-[var(--ink)] mb-1">📒 {L('السِّجل', 'The Log')}</div>
        <p className="text-xs text-[var(--muted)] leading-relaxed mb-3">
          {L('سيظهر هنا جدول أرقامك كاملاً — شهراً بجانب شهر — بعد أول تسجيل.', 'Your full table of numbers — month beside month — appears here after your first log.')}
        </p>
        <Link href="/financial-numbers" className="text-xs font-semibold text-white bg-[var(--green-dark)] rounded-lg px-4 py-2 inline-block">
          {L('سجّل شهرك الأول ←', 'Log your first month →')}
        </Link>
      </div>
    );
  }

  // ── the grid rows, by section ──
  type Row = { key: string; name: string; get: (s: Snap) => number; sub?: boolean };
  const SECTIONS: { key: string; icon: string; name: string; rows: Row[]; total: { name: string; get: (s: Snap) => number }; accent?: string }[] = [
    {
      key: 'assets', icon: '🏛', name: L('الأصول', 'Assets'),
      rows: [
        { key: 'cash', name: L('النقد', 'Cash'), get: (s) => Number(s.cash) },
        { key: 'stocks', name: L('الأسهم', 'Stocks'), get: (s) => Number(s.stocks) },
        { key: 'equity', name: L('حصص وملكيات', 'Equity stakes'), get: (s) => Number(s.equity) },
        { key: 're', name: L('العقار', 'Real estate'), get: (s) => Number(s.real_estate) },
        { key: 'other', name: L('أصول أخرى', 'Other assets'), get: (s) => Number(s.other_assets) },
      ],
      total: { name: L('إجمالي الأصول', 'Total assets'), get: assetsOf },
    },
    {
      key: 'liab', icon: '⛓', name: L('الالتزامات', 'Liabilities'),
      rows: [{ key: 'liab', name: L('إجمالي الديون', 'Total debts'), get: (s) => Number(s.liabilities) }],
      total: { name: L('إجمالي الالتزامات', 'Total liabilities'), get: (s) => Number(s.liabilities) },
      accent: 'var(--red-2)',
    },
    {
      key: 'flow', icon: '🔄', name: L('التدفق الشهري', 'Monthly flow'),
      rows: [
        { key: 'inc', name: L('الدخل', 'Income'), get: (s) => Number(s.income) },
        { key: 'exp', name: L('المصروف', 'Spending'), get: (s) => Number(s.expenses) },
      ],
      total: { name: L('المدَّخر', 'Saved'), get: (s) => Number(s.income) - Number(s.expenses) },
    },
  ];

  const th = 'p-2 text-[10px] text-[var(--muted)] font-semibold whitespace-nowrap text-start';
  const stickyCol = 'sticky start-0 bg-[var(--surface-card)] text-start whitespace-nowrap';

  return (
    <div className="drv-num bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 sm:p-6 mb-8">
      <div className="flex items-baseline justify-between gap-2 flex-wrap mb-1">
        <div className="font-serif text-lg font-semibold text-[var(--ink)]">📒 {L('السِّجل', 'The Log')}</div>
        <Link href="/financial-numbers" className="text-[11px] font-semibold text-[var(--green-dark)] hover:underline">
          {L('حدّث أرقامك ←', 'Update your numbers →')}
        </Link>
      </div>
      <p className="text-[11px] text-[var(--muted)] leading-relaxed mb-4">
        {L(
          `كل أرقامك في جدول واحد — أحدث ${Math.min(SHOWN, snaps.length)} شهراً، والأحدث أولاً. اضغط رأس القسم لطيّه إلى مجموعه.`,
          `All your numbers on one grid — the latest ${Math.min(SHOWN, snaps.length)} months, freshest first. Click a section header to fold it into its total.`
        )}
      </p>

      <div className="overflow-x-auto rounded-lg border border-[var(--border-faint)]">
        <table className="w-full text-[11px] border-collapse min-w-[560px]" style={{ fontVariantNumeric: 'tabular-nums' }}>
          <thead>
            <tr className="border-b-2 border-[var(--border-default)]">
              <th className={`${th} ${stickyCol} min-w-[130px]`}>{L('البند', 'Line item')}</th>
              {cols.map((s) => (
                <th key={`${s.year}-${s.month}`} className={`${th} text-end`} dir="ltr">{label(s)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SECTIONS.map((sec) => (
              <SectionRows
                key={sec.key}
                sec={sec}
                cols={cols}
                open={open[sec.key]}
                onToggle={() => setOpen((o) => ({ ...o, [sec.key]: !o[sec.key] }))}
                fmt={fmt}
                stickyCol={stickyCol}
              />
            ))}
            {/* ── net worth — the line everything above adds up to ── */}
            <tr className="border-t-2 border-[var(--border-default)] bg-[var(--green-bg)]/40">
              <td className={`p-2 font-bold text-[var(--green-dark)] ${stickyCol} !bg-transparent`}>
                💠 {L('صافي الثروة', 'Net worth')}
              </td>
              {cols.map((s) => {
                const nw = assetsOf(s) - Number(s.liabilities);
                return (
                  <td key={`${s.year}-${s.month}`} className="p-2 text-end font-bold" style={{ color: nw >= 0 ? 'var(--green-dark)' : 'var(--red-2)' }}>
                    {fmt(nw)}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-[var(--muted)] mt-2">
        {L('القيم بالريال السعودي. تفاصيل الأصول المفردة في المحفظة، وتفاصيل كل دين في الالتزامات.', 'Values in SAR. Individual asset detail lives in Holdings; per-debt detail in Commitments.')}
      </p>
    </div>
  );
}

function SectionRows({
  sec, cols, open, onToggle, fmt, stickyCol,
}: {
  sec: { key: string; icon: string; name: string; rows: { key: string; name: string; get: (s: never) => number }[]; total: { name: string; get: (s: never) => number }; accent?: string };
  cols: Snap[]; open: boolean; onToggle: () => void; fmt: (n: number) => string; stickyCol: string;
}) {
  const totalColor = sec.accent ?? 'var(--ink)';
  return (
    <>
      {/* section header = the aggregate row; clicking folds/unfolds detail */}
      <tr
        onClick={onToggle}
        className="cursor-pointer select-none border-t border-[var(--border-faint)] bg-[var(--surface-1)]/60 hover:bg-[var(--surface-1)]"
      >
        <td className={`p-2 font-semibold ${stickyCol} !bg-[var(--surface-1)]`}>
          <span className="inline-block w-3 text-[9px] text-[var(--muted)]">{open ? '▾' : '▸'}</span>
          {sec.icon} {open ? sec.name : sec.total.name}
        </td>
        {cols.map((s) => {
          const v = sec.total.get(s as never);
          return (
            <td key={`${s.year}-${s.month}`} className="p-2 text-end font-semibold" style={{ color: sec.key === 'flow' ? (v >= 0 ? 'var(--green-dark)' : 'var(--red-2)') : totalColor }}>
              {sec.key === 'flow' && v > 0 ? '+' : ''}{fmt(v)}
            </td>
          );
        })}
      </tr>
      {/* detail rows */}
      {open && sec.rows.map((row) => (
        <tr key={row.key} className="border-t border-[var(--border-faint)]">
          <td className={`p-2 ps-7 text-[var(--ink-2)] ${stickyCol}`}>{row.name}</td>
          {cols.map((s) => (
            <td key={`${s.year}-${s.month}`} className="p-2 text-end text-[var(--ink-2)]">{fmt(row.get(s as never))}</td>
          ))}
        </tr>
      ))}
    </>
  );
}
