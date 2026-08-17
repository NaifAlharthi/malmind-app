'use client';

// The Monthly Pulse — home·D3. The room between existence and full
// complexity: D2 asks "does each block exist?", D4 shows every number
// at every depth — this room asks the question in between: "how did
// the blocks MOVE this month?" One month's story: the deltas, the
// biggest mover, the streak, and how the month compares to your pace.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { useDepth } from '@/components/shared/ExperienceMode';

interface Snap {
  year: number; month: number;
  cash: number; stocks: number; real_estate: number; equity: number; other_assets: number;
  liabilities: number; income: number; expenses: number;
}

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

const assetsOf = (s: Snap) =>
  Number(s.cash) + Number(s.stocks) + Number(s.equity) + Number(s.real_estate) + Number(s.other_assets);
const nwOf = (s: Snap) => assetsOf(s) - Number(s.liabilities);
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

export default function MonthlyPulse() {
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const { setDepth } = useDepth();
  const [snaps, setSnaps] = useState<Snap[] | null>(null);

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

  const d = useMemo(() => {
    if (!snaps || snaps.length === 0) return null;
    const latest = snaps[snaps.length - 1];
    const prev = snaps.length > 1 ? snaps[snaps.length - 2] : null;
    const recent = snaps.slice(-6);
    const avgSaved = recent.reduce((a, s) => a + Number(s.income) - Number(s.expenses), 0) / recent.length;
    // the streak: consecutive months ending at the latest one
    let streak = 1;
    for (let i = snaps.length - 1; i > 0; i--) {
      const a = snaps[i], b = snaps[i - 1];
      if (a.year * 12 + a.month - (b.year * 12 + b.month) === 1) streak++;
      else break;
    }
    return { latest, prev, avgSaved, streak };
  }, [snaps]);

  if (snaps === null) {
    return (
      <div className="drv-num bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 mb-8 text-sm text-[var(--muted)]">
        {L('يُجَسّ النبض…', 'Taking the pulse…')}
      </div>
    );
  }
  if (!d) {
    return (
      <div className="drv-num bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 mb-8">
        <div className="font-serif text-lg font-semibold text-[var(--ink)] mb-1">🫀 {L('نبض الشهر', 'The Monthly Pulse')}</div>
        <p className="text-xs text-[var(--muted)] leading-relaxed mb-3">
          {L('بعد أول شهر في سِجلّك، تحكي هذه الغرفة قصة كل شهر: ماذا تحرّك، وأين، ولماذا يهم.', "After your first month in the Log, this room tells each month's story: what moved, where, and why it matters.")}
        </p>
        <Link href="/log" className="text-xs font-semibold text-white bg-[var(--green-dark)] rounded-lg px-4 py-2 inline-block">
          {L('سجّل شهرك الأول ←', 'Log your first month →')}
        </Link>
      </div>
    );
  }

  const { latest, prev, avgSaved, streak } = d;
  const saved = Number(latest.income) - Number(latest.expenses);
  const rate = Number(latest.income) > 0 ? Math.round((saved / Number(latest.income)) * 100) : 0;
  const nwDelta = prev ? nwOf(latest) - nwOf(prev) : null;
  const monthName = `${(ar ? MONTHS_AR : MONTHS_EN)[latest.month - 1]} ${latest.year}`;

  // the biggest mover among the balances, month over month
  const movers = prev ? ([
    [L('النقد', 'Cash'), Number(latest.cash), Number(prev.cash)],
    [L('المستثمَر', 'Invested'), Number(latest.stocks) + Number(latest.equity), Number(prev.stocks) + Number(prev.equity)],
    [L('العقار وأصول أخرى', 'Property & other'), Number(latest.real_estate) + Number(latest.other_assets), Number(prev.real_estate) + Number(prev.other_assets)],
    [L('الالتزامات', 'Liabilities'), Number(latest.liabilities), Number(prev.liabilities)],
  ] as [string, number, number][]) : [];
  const biggest = movers
    .filter(([, , p]) => p !== 0)
    .map(([name, v, p]) => ({ name, pct: ((v - p) / Math.abs(p)) * 100, delta: v - p }))
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))[0] ?? null;

  const vsPace = saved - avgSaved;

  const CARDS: { name: string; value: number; prevValue: number | null; goodWhenUp: boolean }[] = [
    { name: L('الدخل', 'Income'), value: Number(latest.income), prevValue: prev ? Number(prev.income) : null, goodWhenUp: true },
    { name: L('المصروف', 'Spending'), value: Number(latest.expenses), prevValue: prev ? Number(prev.expenses) : null, goodWhenUp: false },
    { name: L('المدَّخر', 'Saved'), value: saved, prevValue: prev ? Number(prev.income) - Number(prev.expenses) : null, goodWhenUp: true },
    { name: L('صافي الثروة', 'Net worth'), value: nwOf(latest), prevValue: prev ? nwOf(prev) : null, goodWhenUp: true },
  ];

  return (
    <div className="drv-num bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 sm:p-6 mb-8">
      <div className="flex items-baseline justify-between gap-2 flex-wrap mb-1">
        <div className="font-serif text-lg font-semibold text-[var(--ink)]">🫀 {L('نبض الشهر', 'The Monthly Pulse')}</div>
        <div className="text-[11px] font-semibold text-[var(--muted)]">{monthName}</div>
      </div>
      {/* the month in one sentence */}
      <p className="text-xs text-[var(--ink-2)] leading-relaxed mb-4">
        {saved >= 0
          ? L(`ادّخرت ${fmt(saved)} هذا الشهر (${rate}٪ من دخلك)`, `You saved ${fmt(saved)} this month (${rate}% of income)`)
          : L(`أنفقت فوق دخلك ${fmt(-saved)} هذا الشهر`, `You outspent your income by ${fmt(-saved)} this month`)}
        {nwDelta !== null && (
          <> · {nwDelta >= 0
            ? L(`وصافي ثروتك ارتفع ${fmt(nwDelta)}`, `and your net worth rose ${fmt(nwDelta)}`)
            : L(`وصافي ثروتك انخفض ${fmt(-nwDelta)}`, `and your net worth fell ${fmt(-nwDelta)}`)}.</>
        )}
      </p>

      {/* the four vitals, each against last month */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {CARDS.map((c) => {
          const dl = c.prevValue !== null && c.prevValue !== 0 ? ((c.value - c.prevValue) / Math.abs(c.prevValue)) * 100 : null;
          const up = dl !== null && dl >= 0;
          const good = dl === null ? true : up === c.goodWhenUp;
          return (
            <div key={c.name} className="bg-[var(--surface-1)] border border-[var(--border-faint)] rounded-xl px-3 py-2.5">
              <div className="text-[9px] text-[var(--muted)]">{c.name}</div>
              <div className="text-sm font-bold text-[var(--ink)]" dir="ltr">{fmt(c.value)}</div>
              {dl !== null && (
                <div className={`text-[9px] font-semibold ${good ? 'text-[var(--green-dark)]' : 'text-[#D64545]'}`} dir="ltr">
                  {up ? '▲' : '▼'} {Math.abs(dl).toFixed(1)}% {L('عن الشهر الماضي', 'MoM')}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* what stood out */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
        {biggest && (
          <div className="bg-[var(--surface-1)] border border-[var(--border-faint)] rounded-xl px-3.5 py-3">
            <div className="text-[9px] text-[var(--muted)] mb-0.5">⚡ {L('أكبر حركة هذا الشهر', "The month's biggest mover")}</div>
            <div className="text-[12px] font-bold text-[var(--ink)]">
              {biggest.name}
              <span className={`ms-2 text-[11px] ${biggest.delta >= 0 ? 'text-[var(--green-dark)]' : 'text-[#D64545]'}`} dir="ltr">
                {biggest.delta >= 0 ? '+' : '−'}{fmt(Math.abs(biggest.delta))} ({Math.abs(biggest.pct).toFixed(1)}%)
              </span>
            </div>
          </div>
        )}
        <div className="bg-[var(--surface-1)] border border-[var(--border-faint)] rounded-xl px-3.5 py-3">
          <div className="text-[9px] text-[var(--muted)] mb-0.5">🔥 {L('سلسلة التسجيل', 'Logging streak')}</div>
          <div className="text-[12px] font-bold text-[var(--ink)]">
            {L(`${streak} ${streak === 1 ? 'شهر' : streak === 2 ? 'شهران' : 'أشهر'} متتالية`, `${streak} ${streak === 1 ? 'month' : 'months'} in a row`)}
          </div>
        </div>
        <div className="bg-[var(--surface-1)] border border-[var(--border-faint)] rounded-xl px-3.5 py-3">
          <div className="text-[9px] text-[var(--muted)] mb-0.5">🎯 {L('مقابل إيقاعك (متوسط ٦ أشهر)', 'vs your pace (6-mo avg)')}</div>
          <div className={`text-[12px] font-bold ${vsPace >= 0 ? 'text-[var(--green-dark)]' : 'text-[#D64545]'}`} dir="ltr">
            {vsPace >= 0 ? '+' : '−'}{fmt(Math.abs(vsPace))} {L(vsPace >= 0 ? 'فوق المعتاد' : 'دون المعتاد', vsPace >= 0 ? 'above usual' : 'below usual')}
          </div>
        </div>
      </div>

      {/* the doors on: shallower asks "does it exist?", deeper shows all */}
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/log" className="text-[11px] font-semibold text-white bg-[var(--green-dark)] rounded-lg px-3.5 py-2">
          📒 {L('افتح السِّجل كاملاً ←', 'Open the full Log →')}
        </Link>
        <button
          onClick={() => setDepth(4)}
          className="text-[11px] font-semibold text-[var(--green-dark)] border border-[var(--green-border)] rounded-lg px-3.5 py-2 cursor-pointer hover:bg-[var(--green-bg)] transition-colors"
        >
          🧮 {L('اغطس إلى النظرة الكاملة ↓', 'Dive to the full overview ↓')}
        </button>
      </div>
    </div>
  );
}
