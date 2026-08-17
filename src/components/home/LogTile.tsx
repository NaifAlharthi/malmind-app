'use client';

// The Log — the person's financial numbers as an honest spreadsheet.
// Months run across; line items run down, grouped into sections (assets,
// liabilities, flow) that collapse into their aggregate rows. This is the
// clearest possible answer to "where are ALL my numbers?": one grid, no
// interpretation — reading is here, editing stays in My Financial Numbers.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';

interface Snap {
  year: number; month: number;
  cash: number; stocks: number; real_estate: number; equity: number; other_assets: number;
  liabilities: number; income: number; expenses: number;
}

// Full month names — the shortcuts read as noise, especially in Arabic.
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const SHOWN = 12; // the latest year of months on the grid

export default function LogTile() {
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const [snaps, setSnaps] = useState<Snap[] | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [srcOpen, setSrcOpen] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({ assets: true, liab: true, flow: true });
  // chart controls: which lines are on, how far back, and at what grain
  const [lines, setLines] = useState<Record<string, boolean>>({ nw: true, income: true, expenses: true });
  const [range, setRange] = useState<6 | 12 | 24 | 0>(12); // 0 = all
  const [gran, setGran] = useState<'m' | 'q' | 'y'>('m');
  // a hand-picked window ('YYYY-MM' each end) overrides the presets
  const [custom, setCustom] = useState<{ from: string; to: string }>({ from: '', to: '' });

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
      // age powers the "share of your life on record" stat
      const { data: prof } = await supabase.from('profiles').select('age').eq('id', user.id).single();
      setAge((prof as { age: number | null } | null)?.age ?? null);
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
        {/* every way numbers enter the Log lives under this one door —
            manual, spreadsheet, banks, integrations */}
        <div className="relative">
          <button
            onClick={() => setSrcOpen((v) => !v)}
            className="text-[11px] font-semibold text-[var(--green-dark)] hover:underline cursor-pointer"
            aria-expanded={srcOpen}
          >
            {L('عدّل وحدّث أرقامك', 'Edit and update your numbers')} {srcOpen ? '▴' : '▾'}
          </button>
          {srcOpen && (
            <div className="absolute end-0 top-full mt-2 z-20 w-72 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl shadow-lg p-2 flex flex-col gap-1">
              {([
                {
                  icon: '✍️', live: true, href: '/financial-numbers',
                  name: L('إدخال يدوي', 'Manual entry'),
                  sub: L('سجّل شهرك في دقائق', 'Log your month in minutes'),
                },
                {
                  icon: '📄', live: true, href: '/financial-numbers',
                  name: L('اسحب جدولك', 'Drop your spreadsheet'),
                  sub: L('CSV/Excel يُحلَّل ويُقرأ بذكاء', 'CSV/Excel, smartly parsed'),
                },
                {
                  icon: '🏦', live: false,
                  name: L('واجهات البنوك', 'Bank APIs'),
                  sub: L('ربط مباشر بحساباتك — قادم', 'Direct account linking — coming'),
                },
                {
                  icon: '🔗', live: true, href: '/financial-numbers',
                  name: L('Google و Microsoft', 'Google & Microsoft'),
                  sub: L('Google Sheets الآن · Excel 365 قادم', 'Google Sheets now · Excel 365 coming'),
                },
              ] as { icon: string; live: boolean; href?: string; name: string; sub: string }[]).map((src) =>
                src.live && src.href ? (
                  <Link
                    key={src.name}
                    href={src.href}
                    className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-[var(--surface-1)] transition-colors"
                  >
                    <span className="text-base leading-none">{src.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] font-semibold text-[var(--ink)] group-hover:text-[var(--green-dark)] transition-colors">{src.name}</span>
                      <span className="block text-[9px] text-[var(--muted)]">{src.sub}</span>
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] shrink-0" title={L('متاح الآن', 'Available now')} />
                  </Link>
                ) : (
                  <div
                    key={src.name}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 opacity-70"
                  >
                    <span className="text-base leading-none">{src.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] font-semibold text-[var(--ink-2)]">{src.name}</span>
                      <span className="block text-[9px] text-[var(--muted)]">{src.sub}</span>
                    </span>
                    <span className="text-[8px] rounded-full border border-[var(--border-default)] text-[var(--muted)] px-1.5 py-0.5 shrink-0">
                      {L('قريباً', 'Soon')}
                    </span>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
      <p className="text-[11px] text-[var(--muted)] leading-relaxed mb-4">
        {L(
          `كل أرقامك في جدول واحد — أحدث ${Math.min(SHOWN, snaps.length)} شهراً، والأحدث أولاً. اضغط رأس القسم لطيّه إلى مجموعه.`,
          `All your numbers on one grid — the latest ${Math.min(SHOWN, snaps.length)} months, freshest first. Click a section header to fold it into its total.`
        )}
      </p>

      {/* ── the Log's vital signs: how much of your life this record
             already holds. Span runs from the earliest month to the
             latest; the life share needs the profile's age ── */}
      {(() => {
        const first = snaps[0];
        const last = snaps[snaps.length - 1];
        const spanMonths = (last.year * 12 + last.month) - (first.year * 12 + first.month) + 1;
        const spanY = Math.floor(spanMonths / 12);
        const spanM = spanMonths % 12;
        const dur = ar
          ? (spanY === 0 ? `${spanMonths} شهراً` : spanM === 0 ? `${spanY} ${spanY === 1 ? 'سنة' : 'سنوات'}` : `${spanY} ${spanY === 1 ? 'سنة' : 'سنوات'} و${spanM} ${spanM === 1 ? 'شهر' : 'أشهر'}`)
          : (spanY === 0 ? `${spanMonths} months` : spanM === 0 ? `${spanY} ${spanY === 1 ? 'year' : 'years'}` : `${spanY}y ${spanM}m`);
        const sinceLabel = `${ar ? MONTHS_AR[first.month - 1] : MONTHS_EN[first.month - 1]} ${first.year}`;
        const lifePct = age && age > 0 ? Math.min(100, (spanMonths / (age * 12)) * 100) : null;
        const lifePctLabel = lifePct === null ? null : lifePct < 10 ? lifePct.toFixed(1) : String(Math.round(lifePct));
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
            <div className="bg-[var(--surface-1)] border border-[var(--border-faint)] rounded-xl px-3.5 py-3">
              <div className="text-lg font-bold text-[var(--ink)] leading-tight">{sinceLabel}</div>
              <div className="text-[10px] text-[var(--muted)] mt-0.5">
                ⏮ {L('إلى هنا يعود سِجلّك — بياناتك ملكك منذ ذلك الحين', 'how far back your data goes — yours since then')}
              </div>
            </div>
            <div className="bg-[var(--surface-1)] border border-[var(--border-faint)] rounded-xl px-3.5 py-3">
              <div className="text-lg font-bold text-[var(--ink)] leading-tight">{dur}</div>
              <div className="text-[10px] text-[var(--muted)] mt-0.5">
                🗓 {snaps.length === spanMonths
                  ? L('مدى سِجلّك — دون شهر مفقود', 'of record — no month missing')
                  : L(`مدى السِّجل — ${snaps.length} شهراً مسجلاً`, `of record — ${snaps.length} months logged`)}
              </div>
            </div>
            {lifePct !== null && (
              <div className="bg-[var(--surface-1)] border border-[var(--border-faint)] rounded-xl px-3.5 py-3 col-span-2 sm:col-span-1">
                <div className="text-lg font-bold text-[var(--green-dark)] leading-tight">{lifePctLabel}%</div>
                <div className="text-[10px] text-[var(--muted)] mt-0.5">
                  🧬 {L('من حياتك موثَّقة هنا — وتزيد كل شهر', 'of your life captured here — growing monthly')}
                </div>
                <div className="h-1 rounded-full bg-[var(--border-faint)] mt-2 overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--green)]" style={{ width: `${Math.max(2, lifePct)}%` }} />
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* the chart leads; the cells follow below */}
      <LogChart snaps={snaps} lines={lines} setLines={setLines} range={range} setRange={setRange} gran={gran} setGran={setGran} custom={custom} setCustom={setCustom} ar={ar} />

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

// ── every row of the grid as a line, toggleable; period and grain dials ──
const SERIES: { key: string; nameAr: string; nameEn: string; color: string; kind: 'stock' | 'flow'; get: (s: Snap) => number }[] = [
  { key: 'nw', nameAr: 'صافي الثروة', nameEn: 'Net worth', color: '#1D9E75', kind: 'stock', get: (s) => Number(s.cash) + Number(s.stocks) + Number(s.equity) + Number(s.real_estate) + Number(s.other_assets) - Number(s.liabilities) },
  { key: 'totalAssets', nameAr: 'إجمالي الأصول', nameEn: 'Total assets', color: '#5DCAA5', kind: 'stock', get: (s) => Number(s.cash) + Number(s.stocks) + Number(s.equity) + Number(s.real_estate) + Number(s.other_assets) },
  { key: 'cash', nameAr: 'النقد', nameEn: 'Cash', color: '#2a78d6', kind: 'stock', get: (s) => Number(s.cash) },
  { key: 'stocks', nameAr: 'الأسهم', nameEn: 'Stocks', color: '#17B8C9', kind: 'stock', get: (s) => Number(s.stocks) },
  { key: 'equity', nameAr: 'حصص وملكيات', nameEn: 'Equity', color: '#7A5EA8', kind: 'stock', get: (s) => Number(s.equity) },
  { key: 're', nameAr: 'العقار', nameEn: 'Real estate', color: '#E0559E', kind: 'stock', get: (s) => Number(s.real_estate) },
  { key: 'other', nameAr: 'أصول أخرى', nameEn: 'Other', color: '#8AA097', kind: 'stock', get: (s) => Number(s.other_assets) },
  { key: 'liab', nameAr: 'الالتزامات', nameEn: 'Liabilities', color: '#E0922A', kind: 'stock', get: (s) => Number(s.liabilities) },
  { key: 'income', nameAr: 'الدخل', nameEn: 'Income', color: '#0E9F6E', kind: 'flow', get: (s) => Number(s.income) },
  { key: 'expenses', nameAr: 'المصروف', nameEn: 'Spending', color: '#D64545', kind: 'flow', get: (s) => Number(s.expenses) },
  { key: 'saved', nameAr: 'المدَّخر', nameEn: 'Saved', color: '#C9A84C', kind: 'flow', get: (s) => Number(s.income) - Number(s.expenses) },
];

function LogChart({
  snaps, lines, setLines, range, setRange, gran, setGran, custom, setCustom, ar,
}: {
  snaps: Snap[]; lines: Record<string, boolean>;
  setLines: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  range: 6 | 12 | 24 | 0; setRange: (r: 6 | 12 | 24 | 0) => void;
  gran: 'm' | 'q' | 'y'; setGran: (g: 'm' | 'q' | 'y') => void;
  custom: { from: string; to: string };
  setCustom: React.Dispatch<React.SetStateAction<{ from: string; to: string }>>;
  ar: boolean;
}) {
  const L = (a: string, e: string) => (ar ? a : e);
  const fmtCompact = (n: number) => {
    const a = Math.abs(n);
    if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (a >= 1_000) return `${Math.round(n / 1_000)}k`;
    return String(Math.round(n));
  };

  // slice the period, then bucket by grain: balances take the bucket's last
  // value (a balance IS a point in time); flows sum across the bucket
  // a set date range beats the preset window
  const hasCustom = !!(custom.from || custom.to);
  const data = useMemo(() => {
    const mkey = (y: number, m: number) => y * 12 + m;
    const parse = (v: string) => mkey(Number(v.slice(0, 4)), Number(v.slice(5, 7)));
    const win = hasCustom
      ? snaps.filter((s) => {
          const k = mkey(s.year, s.month);
          return (!custom.from || k >= parse(custom.from)) && (!custom.to || k <= parse(custom.to));
        })
      : range === 0 ? snaps : snaps.slice(-range);
    const bucketOf = (s: Snap) =>
      gran === 'm' ? `${s.year}-${String(s.month).padStart(2, '0')}`
      : gran === 'q' ? `${s.year}-Q${Math.ceil(s.month / 3)}`
      : String(s.year);
    const bucketLabel = (s: Snap) =>
      gran === 'm' ? `${(ar ? MONTHS_AR : MONTHS_EN)[s.month - 1]} ${String(s.year).slice(2)}`
      : gran === 'q' ? `Q${Math.ceil(s.month / 3)} ${String(s.year).slice(2)}`
      : String(s.year);
    const buckets = new Map<string, { label: string; members: Snap[] }>();
    for (const s of win) {
      const k = bucketOf(s);
      if (!buckets.has(k)) buckets.set(k, { label: bucketLabel(s), members: [] });
      buckets.get(k)!.members.push(s);
    }
    return [...buckets.values()].map(({ label, members }) => {
      const point: Record<string, number | string> = { label };
      for (const ser of SERIES) {
        point[ser.key] = ser.kind === 'stock'
          ? ser.get(members[members.length - 1])
          : members.reduce((acc, s) => acc + ser.get(s), 0);
      }
      return point;
    });
  }, [snaps, range, gran, ar, hasCustom, custom.from, custom.to]);

  const seg = (active: boolean) =>
    `px-2.5 py-1 text-[10px] font-medium transition-colors ${active ? 'bg-[var(--ink)] text-[var(--surface-0)]' : 'bg-[var(--surface-card)] text-[var(--ink-2)] hover:text-[var(--ink)]'}`;
  const anyOn = SERIES.some((s) => lines[s.key]);

  return (
    <div className="mb-5 pb-4 border-b border-[var(--border-faint)]">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="text-xs font-semibold text-[var(--ink)]">📈 {L('الأرقام عبر الزمن', 'The numbers across time')}</div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* period — presets step aside while a custom range is set */}
          <div className="inline-flex border border-[var(--border-default)] rounded-lg overflow-hidden" dir="ltr">
            {([6, 12, 24, 0] as const).map((r) => (
              <button key={r} onClick={() => { setCustom({ from: '', to: '' }); setRange(r); }} className={seg(!hasCustom && range === r)}>
                {r === 0 ? L('الكل', 'All') : r === 6 ? L('٦ أشهر', '6m') : r === 12 ? L('سنة', '1y') : L('سنتان', '2y')}
              </button>
            ))}
          </div>
          {/* or a hand-picked window: from month → to month */}
          <div className={`inline-flex items-center gap-1 border rounded-lg px-2 py-0.5 ${hasCustom ? 'border-[var(--green)]' : 'border-[var(--border-default)]'}`} dir="ltr">
            <input
              type="month"
              value={custom.from}
              onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
              className="bg-transparent text-[10px] text-[var(--ink-2)] outline-none w-[92px] [color-scheme:dark]"
              aria-label={L('من شهر', 'From month')}
            />
            <span className="text-[10px] text-[var(--muted)]">→</span>
            <input
              type="month"
              value={custom.to}
              onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
              className="bg-transparent text-[10px] text-[var(--ink-2)] outline-none w-[92px] [color-scheme:dark]"
              aria-label={L('إلى شهر', 'To month')}
            />
            {hasCustom && (
              <button onClick={() => setCustom({ from: '', to: '' })} className="text-[10px] text-[var(--muted)] hover:text-[var(--ink)] px-0.5" aria-label={L('امسح المدى', 'Clear range')}>
                ✕
              </button>
            )}
          </div>
          {/* grain */}
          <div className="inline-flex border border-[var(--border-default)] rounded-lg overflow-hidden" dir="ltr">
            {(['m', 'q', 'y'] as const).map((g) => (
              <button key={g} onClick={() => setGran(g)} className={seg(gran === g)}>
                {g === 'm' ? L('شهري', 'Monthly') : g === 'q' ? L('ربع سنوي', 'Quarterly') : L('سنوي', 'Yearly')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* the line switches — tick any row on or off */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {SERIES.map((ser) => {
          const on = !!lines[ser.key];
          return (
            <button
              key={ser.key}
              onClick={() => setLines((prev) => ({ ...prev, [ser.key]: !prev[ser.key] }))}
              aria-pressed={on}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium transition-all ${
                on ? 'border-transparent text-white' : 'border-[var(--border-default)] text-[var(--muted)] hover:text-[var(--ink-2)]'
              }`}
              style={on ? { background: ser.color } : undefined}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: on ? 'rgba(255,255,255,0.9)' : ser.color }} />
              {ar ? ser.nameAr : ser.nameEn}
            </button>
          );
        })}
      </div>

      {anyOn ? (
        <div className="h-56" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border-faint)" />
              {/* in Arabic the timeline reads right-to-left, like the language */}
              <XAxis dataKey="label" reversed={ar} tick={{ fontSize: 9, fill: 'var(--muted)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis orientation={ar ? 'right' : 'left'} tickFormatter={fmtCompact} tick={{ fontSize: 9, fill: 'var(--muted)' }} width={44} axisLine={false} tickLine={false} />
              <ReferenceLine y={0} stroke="var(--border-strong)" strokeDasharray="3 3" />
              <Tooltip
                formatter={(v, name) => [Math.round(Number(v)).toLocaleString('en-US'), name]}
                contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 11 }}
              />
              {SERIES.filter((ser) => lines[ser.key]).map((ser) => (
                <Line
                  key={ser.key}
                  type="monotone"
                  dataKey={ser.key}
                  name={ar ? ser.nameAr : ser.nameEn}
                  stroke={ser.color}
                  strokeWidth={ser.key === 'nw' ? 2.5 : 1.8}
                  dot={data.length <= 14}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-24 flex items-center justify-center text-[11px] text-[var(--muted)] border border-dashed border-[var(--border-default)] rounded-lg">
          {L('فعّل خطاً واحداً على الأقل ليظهر الرسم', 'Turn on at least one line to draw the chart')}
        </div>
      )}
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
