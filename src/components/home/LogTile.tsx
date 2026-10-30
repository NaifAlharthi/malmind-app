'use client';

// The Log — the person's financial numbers as an honest spreadsheet.
// Months run across; line items run down, grouped into sections (assets,
// liabilities, flow) that collapse into their aggregate rows. This is the
// clearest possible answer to "where are ALL my numbers?": one grid, no
// interpretation. Editing happens IN the grid: edit mode turns every cell
// into an input, totals and net worth recalculate live, any month can be
// opened or added, and one Save upserts every touched month.

import { useEffect, useMemo, useRef, useState } from 'react';
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

type Field = 'cash' | 'stocks' | 'equity' | 'real_estate' | 'other_assets' | 'liabilities' | 'income' | 'expenses';
const FIELDS: Field[] = ['cash', 'stocks', 'equity', 'real_estate', 'other_assets', 'liabilities', 'income', 'expenses'];
const mkey = (s: { year: number; month: number }) => `${s.year}-${s.month}`;
const parseNum = (v: string) => Number(v.replace(/[^\d.-]/g, '')) || 0;

export default function LogTile() {
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const [snaps, setSnaps] = useState<Snap[] | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [careerStart, setCareerStart] = useState<number | null>(null);
  const [srcOpen, setSrcOpen] = useState(false);
  const [backfillOpen, setBackfillOpen] = useState(false);
  // the grid opens folded to its totals — calm first, detail on request
  const [open, setOpen] = useState<Record<string, boolean>>({ assets: false, liab: false, flow: false });
  // chart controls: which lines are on, how far back, and at what grain
  const [lines, setLines] = useState<Record<string, boolean>>({ nw: true, income: true, expenses: true });
  const [range, setRange] = useState<6 | 12 | 24 | 0>(12); // 0 = all
  const [gran, setGran] = useState<'m' | 'q' | 'y'>('m');
  // a hand-picked window ('YYYY-MM' each end) overrides the presets
  const [custom, setCustom] = useState<{ from: string; to: string }>({ from: '', to: '' });
  // in-place editing: typed values per month, months opened beyond the
  // grid (new ones, or older ones pulled in), and the save state
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Partial<Record<Field, string>>>>({});
  const [extra, setExtra] = useState<Snap[]>([]);
  const [pickMonth, setPickMonth] = useState('');
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);

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
      // age powers the "share of your life on record" stat; career start
      // anchors where the backfill panel says your financial life began
      const { data: prof } = await supabase.from('profiles').select('age, career_start_year').eq('id', user.id).single();
      const p = prof as { age: number | null; career_start_year: number | null } | null;
      setAge(p?.age ?? null);
      setCareerStart(p?.career_start_year ?? null);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Chronological — time flows in the reading direction, oldest first, so
  // the freshest month sits at the far end (left→right in English,
  // right→left in Arabic, like the chart above it).
  const cols = useMemo(() => (snaps ?? []).slice(-SHOWN), [snaps]);

  // the grid opens scrolled to its freshest month
  const gridRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = gridRef.current;
    if (el) el.scrollLeft = ar ? -el.scrollWidth : el.scrollWidth;
  }, [snaps, editing, ar]);

  // A backfilled year lands straight into local state too, so the life
  // bar and every chart tick up the moment a row saves.
  const addSnap = (s: Snap) =>
    setSnaps((prev) => {
      const next = (prev ?? []).filter((x) => !(x.year === s.year && x.month === s.month));
      next.push(s);
      next.sort((a, b) => a.year - b.year || a.month - b.month);
      return next;
    });

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

  // ── in-place editing ──
  const exists = (s: { year: number; month: number }) => snaps.some((x) => mkey(x) === mkey(s));
  const extraOnly = extra.filter((e) => !cols.some((c) => mkey(c) === mkey(e)));
  const shownCols = editing
    ? [...extraOnly, ...cols].sort((a, b) => a.year - b.year || a.month - b.month)
    : cols;
  // typed drafts laid over the stored values — totals read these, live
  const merged = (s: Snap): Snap => {
    const d = drafts[mkey(s)];
    if (!d) return s;
    const out = { ...s };
    for (const f of FIELDS) if (d[f] !== undefined) out[f] = parseNum(d[f]!);
    return out;
  };
  const viewCols = shownCols.map(merged);
  const dirtyKeys = new Set<string>([
    ...Object.keys(drafts),
    ...extra.filter((e) => !exists(e)).map(mkey),
  ]);

  const setCell = (s: Snap, f: Field, v: string) => {
    setFlash(null);
    setDrafts((p) => ({ ...p, [mkey(s)]: { ...p[mkey(s)], [f]: v } }));
  };

  // open any month: an existing older month is pulled onto the grid; a new
  // month starts as a copy of the latest one, so you only type what changed
  const addMonth = () => {
    if (!/^\d{4}-\d{2}$/.test(pickMonth)) return;
    const y = Number(pickMonth.slice(0, 4));
    const m = Number(pickMonth.slice(5, 7));
    const found = snaps.find((s) => s.year === y && s.month === m);
    const latest = snaps[snaps.length - 1];
    const col: Snap = found ?? { ...latest, year: y, month: m };
    if (!extra.some((e) => mkey(e) === mkey(col))) setExtra((p) => [...p, col]);
    setPickMonth('');
  };

  const dropMonth = async (s: Snap) => {
    if (!exists(s)) {
      setExtra((p) => p.filter((e) => mkey(e) !== mkey(s)));
      setDrafts((p) => { const n = { ...p }; delete n[mkey(s)]; return n; });
      return;
    }
    const name = label(s);
    if (!window.confirm(L(`حذف شهر ${name} من السِّجل نهائياً؟`, `Delete ${name} from the Log permanently?`))) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('financial_snapshots').delete()
      .eq('user_id', user.id).eq('year', s.year).eq('month', s.month);
    if (error) { setFlash({ ok: false, text: L('تعذّر الحذف — حاول مجدداً.', 'Could not delete — try again.') }); return; }
    setSnaps((p) => (p ?? []).filter((x) => mkey(x) !== mkey(s)));
    setExtra((p) => p.filter((e) => mkey(e) !== mkey(s)));
    setDrafts((p) => { const n = { ...p }; delete n[mkey(s)]; return n; });
    setFlash({ ok: true, text: L(`حُذف ${name}.`, `${name} deleted.`) });
  };

  const save = async () => {
    if (dirtyKeys.size === 0) { setEditing(false); return; }
    setSaving(true);
    setFlash(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const all = [...snaps, ...extra];
      const rows = [...dirtyKeys]
        .map((k) => all.find((s) => mkey(s) === k))
        .filter((s): s is Snap => !!s)
        .map(merged);
      const { error } = await supabase.from('financial_snapshots').upsert(
        rows.map((s) => ({
          user_id: user.id, year: s.year, month: s.month,
          cash: s.cash, stocks: s.stocks, equity: s.equity, real_estate: s.real_estate,
          other_assets: s.other_assets, liabilities: s.liabilities, income: s.income, expenses: s.expenses,
        })),
        { onConflict: 'user_id,year,month' },
      );
      if (error) {
        setFlash({ ok: false, text: L('تعذّر الحفظ — لم يُفقد شيء، حاول مجدداً.', 'Could not save — nothing was lost, try again.') });
        return;
      }
      rows.forEach(addSnap);
      setDrafts({});
      setExtra([]);
      setEditing(false);
      setFlash({ ok: true, text: L(`✓ حُفظ ${rows.length} ${rows.length === 1 ? 'شهر' : 'أشهر'}.`, `✓ Saved ${rows.length} ${rows.length === 1 ? 'month' : 'months'}.`) });
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    if (dirtyKeys.size > 0 && !window.confirm(L('تجاهل التعديلات غير المحفوظة؟', 'Discard unsaved changes?'))) return;
    setDrafts({});
    setExtra([]);
    setEditing(false);
    setFlash(null);
  };

  // ── the grid rows, by section ──
  type Row = { key: string; name: string; get: (s: Snap) => number; field: Field };
  const SECTIONS: { key: string; icon: string; name: string; rows: Row[]; total: { name: string; get: (s: Snap) => number }; accent?: string }[] = [
    {
      key: 'assets', icon: '🏛', name: L('الأصول', 'Assets'),
      rows: [
        { key: 'cash', field: 'cash', name: L('النقد', 'Cash'), get: (s) => Number(s.cash) },
        { key: 'stocks', field: 'stocks', name: L('الأسهم', 'Stocks'), get: (s) => Number(s.stocks) },
        { key: 'equity', field: 'equity', name: L('حصص وملكيات', 'Equity stakes'), get: (s) => Number(s.equity) },
        { key: 're', field: 'real_estate', name: L('العقار', 'Real estate'), get: (s) => Number(s.real_estate) },
        { key: 'other', field: 'other_assets', name: L('أصول أخرى', 'Other assets'), get: (s) => Number(s.other_assets) },
      ],
      total: { name: L('إجمالي الأصول', 'Total assets'), get: assetsOf },
    },
    {
      key: 'liab', icon: '⛓', name: L('الالتزامات', 'Liabilities'),
      rows: [{ key: 'liab', field: 'liabilities', name: L('إجمالي الديون', 'Total debts'), get: (s) => Number(s.liabilities) }],
      total: { name: L('إجمالي الالتزامات', 'Total liabilities'), get: (s) => Number(s.liabilities) },
      accent: 'var(--red-2)',
    },
    {
      key: 'flow', icon: '🔄', name: L('التدفق الشهري', 'Monthly flow'),
      rows: [
        { key: 'inc', field: 'income', name: L('الدخل', 'Income'), get: (s) => Number(s.income) },
        { key: 'exp', field: 'expenses', name: L('المصروف', 'Spending'), get: (s) => Number(s.expenses) },
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
        {/* editing happens right here in the grid; bulk imports and
            connections sit behind the secondary menu */}
        <div className="relative flex items-center gap-2">
          {!editing && (
            <button
              onClick={() => { setEditing(true); setSrcOpen(false); setFlash(null); }}
              className="text-[11px] font-semibold text-white bg-[var(--green-dark)] rounded-lg px-3 py-1.5 cursor-pointer"
            >
              ✏️ {L('عدّل الأرقام هنا', 'Edit numbers here')}
            </button>
          )}
          <button
            onClick={() => setSrcOpen((v) => !v)}
            className="text-[11px] font-semibold text-[var(--green-dark)] border border-[var(--green-border)] rounded-lg px-3 py-1.5 hover:bg-[var(--green-bg)] cursor-pointer"
            aria-expanded={srcOpen}
          >
            {L('استيراد وربط', 'Import & connect')} {srcOpen ? '▴' : '▾'}
          </button>
          {srcOpen && (
            <div className="absolute end-0 top-full mt-2 z-20 w-72 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl shadow-lg p-2 flex flex-col gap-1">
              {([
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
                {
                  icon: '🗂', live: true, href: '/financial-numbers',
                  name: L('المحرّر الكامل', 'The full editor'),
                  sub: L('كل الأشهر والتفاصيل في صفحة «أرقامي المالية»', 'Every month and detail, in My Financial Numbers'),
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
          `كل أرقامك في جدول واحد — آخر ${Math.min(SHOWN, snaps.length)} شهراً بترتيبها الزمني، والأحدث في الطرف. يبدأ مطوياً إلى مجاميعه؛ اضغط أي قسم لفتح تفاصيله.`,
          `All your numbers on one grid — the last ${Math.min(SHOWN, snaps.length)} months in time order, freshest at the far end. It rests folded to its totals; click any section to open its detail.`
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
              {/* a span, not a point: from the first logged month up to now */}
              <div className="text-lg font-bold text-[var(--ink)] leading-tight">
                {sinceLabel}
                <span className="text-sm font-semibold text-[var(--muted)]"> — {L('حتى اليوم', 'to today')}</span>
              </div>
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
              <button
                onClick={() => setBackfillOpen((v) => !v)}
                aria-expanded={backfillOpen}
                className={`text-start bg-[var(--surface-1)] border rounded-xl px-3.5 py-3 col-span-2 sm:col-span-1 transition-colors cursor-pointer ${backfillOpen ? 'border-[var(--green)]' : 'border-[var(--border-faint)] hover:border-[var(--green)]'}`}
              >
                <div className="text-lg font-bold text-[var(--green-dark)] leading-tight">{lifePctLabel}%</div>
                <div className="text-[10px] text-[var(--muted)] mt-0.5">
                  🧬 {L('من حياتك موثَّقة هنا — وتزيد كل شهر', 'of your life captured here — growing monthly')}
                </div>
                <div className="h-1 rounded-full bg-[var(--border-faint)] mt-2 overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--green)] transition-all duration-700" style={{ width: `${Math.max(2, lifePct)}%` }} />
                </div>
                <div className="text-[9px] font-semibold text-[var(--green-dark)] mt-1.5">
                  {backfillOpen ? L('▴ أغلق', '▴ close') : L('▾ التقط ماضيك المفقود', '▾ capture your missing past')}
                </div>
              </button>
            )}
          </div>
        );
      })()}

      {/* ── the backfill room: click the life stat, reclaim your past ── */}
      {backfillOpen && (
        <BackfillPanel snaps={snaps} age={age} careerStart={careerStart} ar={ar} supabase={supabase} onSaved={addSnap} />
      )}

      {/* the chart leads; the cells follow below */}
      <LogChart snaps={snaps} lines={lines} setLines={setLines} range={range} setRange={setRange} gran={gran} setGran={setGran} custom={custom} setCustom={setCustom} ar={ar} />

      {/* ── the edit bar: open/add any month, then save once ── */}
      {editing && (
        <div className="flex flex-wrap items-center gap-2 mb-2 rounded-xl border border-[var(--gold)] bg-[var(--gold)]/5 px-3 py-2">
          <span className="text-[11px] text-[var(--ink-2)] flex-1 min-w-[200px]">
            ✏️ {L('اكتب فوق أي رقم — المجاميع وصافي الثروة تتحدّث فوراً.', 'Type over any number — totals and net worth update as you go.')}
          </span>
          <div className="inline-flex items-center gap-1.5 border border-[var(--border-default)] rounded-lg ps-2 pe-1 py-0.5" dir="ltr">
            <input
              type="month"
              value={pickMonth}
              onChange={(e) => setPickMonth(e.target.value)}
              className="bg-transparent text-[10px] text-[var(--ink-2)] outline-none w-[104px] [color-scheme:dark]"
              aria-label={L('اختر شهراً', 'Pick a month')}
            />
            <button
              onClick={addMonth}
              disabled={!pickMonth}
              className="text-[10px] font-semibold text-[var(--green-dark)] rounded-md px-2 py-1 hover:bg-[var(--green-bg)] disabled:opacity-40 cursor-pointer"
            >
              {L('＋ افتح الشهر', '＋ Open month')}
            </button>
          </div>
          <button onClick={cancel} className="text-[11px] font-medium text-[var(--ink-2)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 cursor-pointer">
            {L('إلغاء', 'Cancel')}
          </button>
          <button onClick={save} disabled={saving} className="text-[11px] font-semibold text-white bg-[var(--green-dark)] rounded-lg px-3 py-1.5 disabled:opacity-50 cursor-pointer">
            {saving
              ? L('يحفظ…', 'Saving…')
              : dirtyKeys.size > 0
                ? L(`احفظ (${dirtyKeys.size} ${dirtyKeys.size === 1 ? 'شهر' : 'أشهر'})`, `Save (${dirtyKeys.size} ${dirtyKeys.size === 1 ? 'month' : 'months'})`)
                : L('تم', 'Done')}
          </button>
        </div>
      )}
      {flash && (
        <p className={`text-[11px] font-semibold mb-2 ${flash.ok ? 'text-[var(--green-dark)]' : 'text-[var(--red-2)]'}`}>{flash.text}</p>
      )}

      <div ref={gridRef} className={`overflow-x-auto rounded-lg border ${editing ? 'border-[var(--gold)]' : 'border-[var(--border-faint)]'}`}>
        <table className="w-full text-[11px] border-collapse min-w-[560px]" style={{ fontVariantNumeric: 'tabular-nums' }}>
          <thead>
            <tr className="border-b-2 border-[var(--border-default)]">
              <th className={`${th} ${stickyCol} min-w-[130px]`}>{L('البند', 'Line item')}</th>
              {viewCols.map((s) => (
                <th key={mkey(s)} className="p-2 text-[10px] text-[var(--muted)] font-semibold whitespace-nowrap text-end">
                  <span className="inline-flex items-center gap-1" dir="ltr">
                    {label(s)}
                    {editing && !exists(s) && (
                      <span className="text-[8px] font-bold text-[var(--gold)] border border-[var(--gold)] rounded px-1">{L('جديد', 'new')}</span>
                    )}
                    {editing && (
                      <button
                        onClick={() => dropMonth(s)}
                        title={exists(s) ? L('احذف هذا الشهر', 'Delete this month') : L('أزِل', 'Remove')}
                        className="text-[10px] text-[var(--muted)] hover:text-[var(--red-2)] px-0.5 cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SECTIONS.map((sec) => (
              <SectionRows
                key={sec.key}
                sec={sec}
                cols={viewCols}
                open={editing || open[sec.key]}
                onToggle={() => { if (!editing) setOpen((o) => ({ ...o, [sec.key]: !o[sec.key] })); }}
                fmt={fmt}
                stickyCol={stickyCol}
                editing={editing}
                draftOf={(s, f) => drafts[mkey(s)]?.[f]}
                onCell={setCell}
              />
            ))}
            {/* ── net worth — the line everything above adds up to ── */}
            <tr className="border-t-2 border-[var(--border-default)] bg-[var(--green-bg)]/40">
              <td className={`p-2 font-bold text-[var(--green-dark)] ${stickyCol} !bg-transparent`}>
                💠 {L('صافي الثروة', 'Net worth')}
              </td>
              {viewCols.map((s) => {
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
      {/* the grid rests at its totals — and while it's folded, it says
          why this one record is worth keeping, then invites the unfold */}
      {!editing && (() => {
        const anyOpen = Object.values(open).some(Boolean);
        const hidden = SECTIONS.filter((s) => !open[s.key]).reduce((a, s) => a + s.rows.length, 0);
        const toggle = () => setOpen(anyOpen ? { assets: false, liab: false, flow: false } : { assets: true, liab: true, flow: true });
        if (anyOpen) {
          return (
            <button
              onClick={toggle}
              className="w-full mt-2 text-[11px] font-semibold text-[var(--green-dark)] border border-dashed border-[var(--green-border)] rounded-lg py-2 hover:bg-[var(--green-bg)]/50 transition-colors cursor-pointer"
            >
              {L('▴ اطوِ الجدول إلى مجاميعه', '▴ Fold back to the totals')}
            </button>
          );
        }
        return (
          <div className="mt-3 rounded-xl border border-[var(--green-border)] bg-[var(--green-bg)]/40 p-4">
            <div className="text-[13px] font-semibold text-[var(--ink)] mb-1">
              {L('حياتك المالية كلها — في سِجلّ واحد', 'Your whole financial life — in one record')}
            </div>
            <p className="text-[11px] text-[var(--ink-2)] leading-relaxed mb-3">
              {L(
                'ما يملكه بنكك ووسيطك وتطبيق أقساطك وجداولك، مجموعاً هنا شهراً بجانب شهر. نطويه لك إلى ما يهم، والتفاصيل كاملة تحت يدك متى احتجتها.',
                'What your bank, your broker, your installment app and your spreadsheets each hold — gathered here, month beside month. We fold it to what matters; every detail is one tap away when you need it.'
              )}
            </p>
            <div className="grid sm:grid-cols-3 gap-2 mb-3">
              {([
                ['🧭', L('مكانٌ واحد', 'One place'), L('لا تبحث في خمسة تطبيقات لتعرف أين تقف.', 'No more five apps to learn where you stand.')],
                ['🔗', L('يُدخَل مرة، وتقرؤه كل أداة', 'Entered once, read everywhere'), L('كل رقم هنا يغذّي الأدوات الـ٣٧ والعقل تلقائياً.', 'Every number here feeds all 37 tools and the Brain automatically.')],
                ['📈', L('تاريخك يتراكم لك', 'A history that compounds'), L('كل شهر تسجّله يجعل قراءات المنتج أدق.', 'Every month you log makes every reading sharper.')],
              ] as [string, string, string][]).map(([icon, title, sub]) => (
                <div key={title} className="rounded-lg bg-[var(--surface-card)] border border-[var(--border-faint)] px-3 py-2.5">
                  <div className="text-[11px] font-semibold text-[var(--ink)]">{icon} {title}</div>
                  <div className="text-[10px] text-[var(--muted)] leading-relaxed mt-0.5">{sub}</div>
                </div>
              ))}
            </div>
            <button
              onClick={toggle}
              className="w-full text-[11px] font-semibold text-white bg-[var(--green-dark)] rounded-lg py-2 cursor-pointer"
            >
              {L(`▾ افتح التفاصيل خلف هذه المجاميع — ${hidden} بنود`, `▾ Open the detail behind these totals — ${hidden} more lines`)}
            </button>
          </div>
        );
      })()}
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

// ── the backfill room ──
// The trick that makes reclaiming years painless: the PAST doesn't need
// monthly resolution. One year-end line per missing year gives every
// chart its long arc; monthly detail stays available for the meticulous.
// Rows save straight into financial_snapshots as December entries, and
// the missing list shrinks as you go — the life bar climbs live.
function BackfillPanel({
  snaps, age, careerStart, ar, supabase, onSaved,
}: {
  snaps: Snap[]; age: number | null; careerStart: number | null; ar: boolean;
  supabase: ReturnType<typeof createClient>;
  onSaved: (s: Snap) => void;
}) {
  const L = (a: string, e: string) => (ar ? a : e);
  const [rows, setRows] = useState<Record<number, { income: string; spending: string; cash: string; debt: string }>>({});
  const [busy, setBusy] = useState<number | null>(null);

  const first = snaps[0];
  const nowYear = new Date().getFullYear();
  // where the financial life begins: career start if we know it,
  // an 18th birthday if we know the age, five years back otherwise
  const lifeStart = careerStart ?? (age ? nowYear - age + 18 : first.year - 5);
  const years: number[] = [];
  for (let y = first.year - 1; y >= lifeStart; y--) {
    if (!snaps.some((s) => s.year === y)) years.push(y);
  }
  const yearlyMins = Math.max(1, Math.ceil(years.length * 0.5));
  const monthlyEntries = years.length * 12;

  const num = (v: string) => Number(v.replace(/[^\d.-]/g, '')) || 0;
  const save = async (y: number) => {
    const r = rows[y] ?? { income: '', spending: '', cash: '', debt: '' };
    setBusy(y);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('financial_snapshots').upsert(
        { user_id: user.id, year: y, month: 12, cash: num(r.cash), liabilities: num(r.debt), income: num(r.income), expenses: num(r.spending) },
        { onConflict: 'user_id,year,month' },
      );
      onSaved({ year: y, month: 12, cash: num(r.cash), stocks: 0, real_estate: 0, equity: 0, other_assets: 0, liabilities: num(r.debt), income: num(r.income), expenses: num(r.spending) });
    } finally {
      setBusy(null);
    }
  };

  const monthName = (ar ? MONTHS_AR : MONTHS_EN)[first.month - 1];

  if (years.length === 0) {
    return (
      <div className="mb-4 rounded-xl border border-[var(--green-border)] bg-[var(--green-bg)]/50 p-4 text-[11px] text-[var(--ink-2)] leading-relaxed">
        🎉 {L(
          `سِجلّك يصل أصلاً إلى بداية حياتك المالية (${lifeStart}) — لا سنوات مفقودة. كل شهر جديد يرفع النسبة من تلقاء نفسه.`,
          `Your record already reaches the start of your financial life (${lifeStart}) — no missing years. Every new month lifts the share on its own.`
        )}
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface-1)]/60 p-4">
      <div className="text-xs font-semibold text-[var(--ink)] mb-1">🕰 {L('التقط ماضيك', 'Capture your past')}</div>
      <p className="text-[11px] text-[var(--muted)] leading-relaxed mb-3">
        {L(
          `سِجلّك يبدأ من ${monthName} ${first.year}، وحياتك المالية بدأت تقريباً في ${lifeStart} — بين الاثنين ${years.length} ${years.length === 1 ? 'سنة مفقودة' : 'سنوات مفقودة'}. لا يحتاج الماضي دقةً شهرية: سطرٌ واحد بأرقام نهاية كل سنة يرسم القوس الكامل لقصتك.`,
          `Your record starts ${monthName} ${first.year}; your financial life began around ${lifeStart} — ${years.length} missing ${years.length === 1 ? 'year' : 'years'} in between. The past doesn't need monthly precision: one line of year-end figures per year draws your story's full arc.`
        )}
      </p>

      {/* the three roads back, priced honestly in effort */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--green)] bg-[var(--green-bg)]/60 px-2.5 py-1 text-[10px] font-semibold text-[var(--green-dark)]">
          ⚡ {L(`تعبئة سنوية هنا — ${years.length} ${years.length === 1 ? 'إدخال' : 'إدخالات'} · نحو ${yearlyMins} ${yearlyMins === 1 ? 'دقيقة' : 'دقائق'}`, `Yearly sketch, right here — ${years.length} ${years.length === 1 ? 'entry' : 'entries'} · ~${yearlyMins} min`)}
        </span>
        <Link href="/financial-numbers" className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] px-2.5 py-1 text-[10px] font-medium text-[var(--ink-2)] hover:border-[var(--green)]">
          📄 {L('عندك كشوفات؟ اسحب جدولاً — مرة واحدة، ~١٠ دقائق', 'Have statements? Drop a spreadsheet — once, ~10 min')}
        </Link>
        <Link href="/financial-numbers" className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] px-2.5 py-1 text-[10px] font-medium text-[var(--ink-2)] hover:border-[var(--green)]">
          ✍️ {L(`تفصيل شهري كامل — حتى ${monthlyEntries} إدخالاً`, `Full monthly detail — up to ${monthlyEntries} entries`)}
        </Link>
      </div>

      {/* one line per missing year, newest first — saved years vanish
          from this list and the life bar above climbs immediately */}
      <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pe-1">
        {years.map((y) => {
          const r = rows[y] ?? { income: '', spending: '', cash: '', debt: '' };
          const set = (k: keyof typeof r, v: string) => setRows((p) => ({ ...p, [y]: { ...r, [k]: v } }));
          const fields: [keyof typeof r, string][] = [
            ['income', L('الدخل/شهر', 'Income/mo')],
            ['spending', L('المصروف/شهر', 'Spending/mo')],
            ['cash', L('المدَّخرات', 'Savings')],
            ['debt', L('الديون', 'Debts')],
          ];
          return (
            <div key={y} className="grid grid-cols-2 sm:grid-cols-[48px_1fr_1fr_1fr_1fr_auto] gap-1.5 items-center">
              <div className="text-[11px] font-bold text-[var(--ink)] col-span-2 sm:col-span-1" dir="ltr">{y}</div>
              {fields.map(([k, ph]) => (
                <input
                  key={k}
                  value={r[k]}
                  onChange={(e) => set(k, e.target.value)}
                  placeholder={ph}
                  inputMode="numeric"
                  dir="ltr"
                  className="bg-[var(--surface-card)] border border-[var(--border-faint)] rounded-lg px-2 py-1.5 text-[11px] text-[var(--ink)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--green)] w-full min-w-0"
                />
              ))}
              <button
                onClick={() => save(y)}
                disabled={busy === y}
                className="col-span-2 sm:col-span-1 text-[10px] font-semibold text-white bg-[var(--green-dark)] rounded-lg px-3 py-1.5 disabled:opacity-50 cursor-pointer"
              >
                {busy === y ? '…' : L('احفظ', 'Save')}
              </button>
            </div>
          );
        })}
      </div>
      <p className="text-[9px] text-[var(--muted)] mt-2.5">
        {L('تُحفظ كأرقام ديسمبر لكل سنة — ويمكنك صقلها لاحقاً في «أرقامي المالية».', 'Saved as each year\'s December figures — refine them any time in My Financial Numbers.')}
      </p>
    </div>
  );
}

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
  sec, cols, open, onToggle, fmt, stickyCol, editing, draftOf, onCell,
}: {
  sec: { key: string; icon: string; name: string; rows: { key: string; name: string; field: Field; get: (s: never) => number }[]; total: { name: string; get: (s: never) => number }; accent?: string };
  cols: Snap[]; open: boolean; onToggle: () => void; fmt: (n: number) => string; stickyCol: string;
  editing: boolean;
  draftOf: (s: Snap, f: Field) => string | undefined;
  onCell: (s: Snap, f: Field, v: string) => void;
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
          {cols.map((s) => {
            if (!editing) {
              return <td key={`${s.year}-${s.month}`} className="p-2 text-end text-[var(--ink-2)]">{fmt(row.get(s as never))}</td>;
            }
            const draft = draftOf(s, row.field);
            return (
              <td key={`${s.year}-${s.month}`} className="px-1.5 py-1 text-end">
                <input
                  value={draft ?? String(Math.round(row.get(s as never)))}
                  onChange={(e) => onCell(s, row.field, e.target.value)}
                  onFocus={(e) => e.target.select()}
                  inputMode="decimal"
                  dir="ltr"
                  aria-label={`${row.name} ${s.month}/${s.year}`}
                  className={`w-[92px] bg-[var(--surface-0)] border rounded-md px-1.5 py-1 text-[11px] text-end text-[var(--ink)] outline-none focus:border-[var(--green)] ${draft !== undefined ? 'border-[var(--gold)]' : 'border-[var(--border-faint)]'}`}
                />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
