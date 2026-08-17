'use client';

// The focused editor — one Log line, nothing else. Every tile on the
// Log page sends its "update" link here with ?f=<line>: the income
// tile edits income only, the ownership tile edits equity only, and
// so on. The month's OTHER lines are never shown and never touched:
// saving merges the edited columns into the month's existing row (or,
// for a brand-new month, carries the rest forward transparently).

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';

interface Snap {
  year: number; month: number;
  cash: number; stocks: number; real_estate: number; equity: number; other_assets: number;
  liabilities: number; income: number; expenses: number;
}
type NumCol = 'cash' | 'stocks' | 'real_estate' | 'equity' | 'other_assets' | 'liabilities' | 'income' | 'expenses';

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

// which tile sent us, and which Log line(s) it owns
const FOCI: Record<string, { icon: string; nameAr: string; nameEn: string; cols: { col: NumCol; ar: string; en: string }[] }> = {
  income: { icon: '💰', nameAr: 'سطر الدخل', nameEn: 'the income line', cols: [{ col: 'income', ar: 'الدخل هذا الشهر', en: 'Income this month' }] },
  expenses: { icon: '🔥', nameAr: 'سطر المصروف', nameEn: 'the spending line', cols: [{ col: 'expenses', ar: 'المصروف هذا الشهر', en: 'Spending this month' }] },
  cash: { icon: '🏦', nameAr: 'سطر النقد', nameEn: 'the cash line', cols: [{ col: 'cash', ar: 'النقد', en: 'Cash' }] },
  stocks: { icon: '📈', nameAr: 'سطر الأسهم', nameEn: 'the stocks line', cols: [{ col: 'stocks', ar: 'قيمة الأسهم', en: 'Stocks value' }] },
  equity: { icon: '🏢', nameAr: 'سطر الحصص', nameEn: 'the equity line', cols: [{ col: 'equity', ar: 'قيمة الحصص الخاصة', en: 'Private stakes value' }] },
  property: {
    icon: '🐫', nameAr: 'سطرا العقار والأصول الأخرى', nameEn: 'the property & other lines',
    cols: [
      { col: 'real_estate', ar: 'العقار', en: 'Real estate' },
      { col: 'other_assets', ar: 'أصول أخرى (أرض، ذهب، مقتنيات…)', en: 'Other assets (land, gold, items…)' },
    ],
  },
  liabilities: { icon: '⛓', nameAr: 'سطر الالتزامات', nameEn: 'the liabilities line', cols: [{ col: 'liabilities', ar: 'إجمالي الالتزامات', en: 'Total liabilities' }] },
};

function FocusedEditor() {
  const supabase = createClient();
  const router = useRouter();
  const params = useSearchParams();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);

  const focus = FOCI[params.get('f') ?? ''] ?? FOCI.income;
  const [snaps, setSnaps] = useState<Snap[] | null>(null);
  const [ym, setYm] = useState<string>(''); // 'YYYY-MM'
  const [vals, setVals] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

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
      const arr = (data as Snap[]) ?? [];
      setSnaps(arr);
      const last = arr[arr.length - 1];
      const now = new Date();
      setYm(last ? `${last.year}-${String(last.month).padStart(2, '0')}` : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mkey = (y: number, m: number) => y * 12 + m;
  const parsed = useMemo(() => (ym ? { y: Number(ym.slice(0, 4)), m: Number(ym.slice(5, 7)) } : null), [ym]);
  // the month's row if it exists — else the nearest row before it,
  // whose values would carry forward into a new month
  const rowFor = useMemo(() => {
    if (!snaps || !parsed) return { exact: null as Snap | null, base: null as Snap | null };
    const exact = snaps.find((s) => s.year === parsed.y && s.month === parsed.m) ?? null;
    const before = snaps.filter((s) => mkey(s.year, s.month) <= mkey(parsed.y, parsed.m));
    return { exact, base: exact ?? before[before.length - 1] ?? null };
  }, [snaps, parsed]);

  // prefill the focused fields when the month changes (saving also
  // refreshes the local rows — that refresh must NOT clear the ✓)
  useEffect(() => {
    const next: Record<string, string> = {};
    for (const c of focus.cols) next[c.col] = rowFor.base ? String(Number(rowFor.base[c.col])) : '';
    setVals(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ym, focus]);

  const num = (v: string) => Number(String(v).replace(/[^\d.-]/g, '')) || 0;

  const save = async () => {
    if (!parsed) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // merge: the month's existing values (or the carried-forward base)
      // stay untouched; only the focused columns change
      const base = rowFor.exact ?? rowFor.base;
      const row: Record<string, number | string> = {
        user_id: user.id, year: parsed.y, month: parsed.m,
        cash: Number(base?.cash ?? 0), stocks: Number(base?.stocks ?? 0),
        real_estate: Number(base?.real_estate ?? 0), equity: Number(base?.equity ?? 0),
        other_assets: Number(base?.other_assets ?? 0), liabilities: Number(base?.liabilities ?? 0),
        income: rowFor.exact ? Number(base?.income ?? 0) : 0,
        expenses: rowFor.exact ? Number(base?.expenses ?? 0) : 0,
      };
      for (const c of focus.cols) row[c.col] = num(vals[c.col]);
      await supabase.from('financial_snapshots').upsert(row, { onConflict: 'user_id,year,month' });
      // refresh local copy so the note + prefill stay honest
      setSnaps((prev) => {
        const rest = (prev ?? []).filter((s) => !(s.year === parsed.y && s.month === parsed.m));
        rest.push({ year: parsed.y, month: parsed.m, ...row } as unknown as Snap);
        rest.sort((a, b) => a.year - b.year || a.month - b.month);
        return rest;
      });
      setSavedMsg(true);
    } finally {
      setSaving(false);
    }
  };

  if (snaps === null) {
    return <div className="text-sm text-[var(--muted)] p-6">{L('يُفتح المحرّر…', 'Opening the editor…')}</div>;
  }

  const monthName = parsed ? `${(ar ? MONTHS_AR : MONTHS_EN)[parsed.m - 1]} ${parsed.y}` : '';

  return (
    <div className="max-w-lg mx-auto">
      <Link href="/log" className="inline-block text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--ink)] mb-3">
        ← {L('عودة إلى السِّجل', 'Back to the Log')}
      </Link>

      <div className="drv-num bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6">
        <div className="font-serif text-lg font-semibold text-[var(--ink)] mb-1">
          {focus.icon} {L(`حدّث ${focus.nameAr}`, `Update ${focus.nameEn}`)}
        </div>
        <p className="text-[11px] text-[var(--muted)] leading-relaxed mb-4">
          {L(
            'هذا المحرّر يلمس هذا السطر فقط — بقية أسطر الشهر تبقى كما هي.',
            "This editor touches this line only — the month's other lines stay exactly as they are."
          )}
        </p>

        {/* which month */}
        <label className="block mb-4">
          <span className="block text-[10px] font-semibold text-[var(--muted)] mb-1">{L('الشهر', 'Month')}</span>
          <input
            type="month"
            value={ym}
            onChange={(e) => { setYm(e.target.value); setSavedMsg(false); }}
            className="w-full bg-[var(--surface-1)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--green)] [color-scheme:dark]"
            dir="ltr"
          />
        </label>

        {/* the focused line(s) — and nothing else */}
        {focus.cols.map((c) => (
          <label key={c.col} className="block mb-4">
            <span className="block text-[10px] font-semibold text-[var(--muted)] mb-1">{ar ? c.ar : c.en}</span>
            <input
              value={vals[c.col] ?? ''}
              onChange={(e) => setVals((p) => ({ ...p, [c.col]: e.target.value }))}
              inputMode="numeric"
              dir="ltr"
              className="w-full bg-[var(--surface-1)] border border-[var(--border-default)] rounded-lg px-3 py-2.5 text-base font-semibold text-[var(--ink)] outline-none focus:border-[var(--green)]"
              placeholder="0"
            />
          </label>
        ))}

        {/* honesty about new months */}
        {!rowFor.exact && (
          <p className="text-[10px] text-[var(--muted)] leading-relaxed mb-4">
            ℹ️ {rowFor.base
              ? L(
                  `${monthName} ليس في السِّجل بعد — سيُنشأ وتُحمل بقية الأرصدة من ${(ar ? MONTHS_AR : MONTHS_EN)[rowFor.base.month - 1]} ${rowFor.base.year}، ويبدأ دخله ومصروفه من صفر.`,
                  `${monthName} isn't in the Log yet — it will be created with balances carried from ${(ar ? MONTHS_AR : MONTHS_EN)[rowFor.base.month - 1]} ${rowFor.base.year}, and its income/spending starting at zero.`
                )
              : L(`${monthName} سيكون أول شهر في سِجلّك.`, `${monthName} will be the first month in your Log.`)}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving || !parsed}
            className="text-xs font-semibold text-white bg-[var(--green-dark)] rounded-lg px-5 py-2.5 disabled:opacity-50 cursor-pointer"
          >
            {saving ? '…' : L('احفظ السطر', 'Save the line')}
          </button>
          {savedMsg && (
            <span className="text-[11px] font-semibold text-[var(--green-dark)]">
              ✓ {L('حُفظ — والسِّجل كله يقرأه الآن.', 'Saved — the whole Log reads it now.')}
              {' '}<button onClick={() => router.push('/log')} className="underline cursor-pointer">{L('عودة', 'Go back')}</button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LogUpdatePage() {
  return (
    <Suspense fallback={<div className="text-sm text-[var(--muted)] p-6">…</div>}>
      <FocusedEditor />
    </Suspense>
  );
}
