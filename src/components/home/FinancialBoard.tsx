'use client';

// The financial board — home·D4's opening wall. The deepest room shows
// the FULL display: every balance with its trend, the monthly flow, the
// ratios with their zones, and the long charts — all derived from the
// Log (financial_snapshots), nothing re-entered. Bloomberg-dense, one
// glance = the whole machine.

import { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, BarChart, Bar, Cell, ComposedChart, AreaChart, Area } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';

interface Snap {
  year: number; month: number;
  cash: number; stocks: number; real_estate: number; equity: number; other_assets: number;
  liabilities: number; income: number; expenses: number;
}

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

const assetsOf = (s: Snap) =>
  Number(s.cash) + Number(s.stocks) + Number(s.equity) + Number(s.real_estate) + Number(s.other_assets);
const investedOf = (s: Snap) => Number(s.stocks) + Number(s.equity);
const nwOf = (s: Snap) => assetsOf(s) - Number(s.liabilities);

const fmtCompact = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(Math.round(n));
};
const fmtFull = (n: number) => Math.round(n).toLocaleString('en-US');

export default function FinancialBoard() {
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const [snaps, setSnaps] = useState<Snap[] | null>(null);
  // age anchors the doubling path; the expected ROI sets its rhythm
  const [age, setAge] = useState<number | null>(null);
  const [roi, setRoi] = useState<number>(7);

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
      const { data: prof } = await supabase.from('profiles').select('age').eq('id', user.id).single();
      setAge((prof as { age: number | null } | null)?.age ?? null);
      const { data: inv } = await supabase.from('investment_settings').select('expected_roi').eq('user_id', user.id).maybeSingle();
      const r = Number((inv as { expected_roi: number | null } | null)?.expected_roi);
      if (r > 0 && r < 100) setRoi(r);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const d = useMemo(() => {
    if (!snaps || snaps.length === 0) return null;
    const latest = snaps[snaps.length - 1];
    const prev = snaps.length > 1 ? snaps[snaps.length - 2] : null;
    const recent = snaps.slice(-6);
    const avgIncome = recent.reduce((a, s) => a + Number(s.income), 0) / recent.length;
    const avgExpenses = recent.reduce((a, s) => a + Number(s.expenses), 0) / recent.length;
    const series = snaps.slice(-24).map((s) => ({
      label: `${(ar ? MONTHS_AR : MONTHS_EN)[s.month - 1]} ${String(s.year).slice(2)}`,
      nw: nwOf(s), assets: assetsOf(s), cash: Number(s.cash), invested: investedOf(s),
      property: Number(s.real_estate) + Number(s.other_assets), liab: Number(s.liabilities),
      income: Number(s.income), expenses: Number(s.expenses),
    }));

    // ── the gallery runs the FULL record: ratios month by month ──
    const gallery = snaps.map((s, i) => {
      const a = assetsOf(s);
      const cashV = Number(s.cash);
      const liabV = Number(s.liabilities);
      const prevA = i > 0 ? assetsOf(snaps[i - 1]) : 0;
      const trail = snaps.slice(Math.max(0, i - 5), i + 1);
      const trailExp = trail.reduce((acc, t) => acc + Number(t.expenses), 0) / trail.length;
      const trail12 = snaps.slice(Math.max(0, i - 11), i + 1);
      const annualInc = trail12.reduce((acc, t) => acc + Number(t.income), 0) * (12 / trail12.length);
      return {
        label: `${(ar ? MONTHS_AR : MONTHS_EN)[s.month - 1]} ${String(s.year).slice(2)}`,
        deltaAssets: prevA > 0 ? ((a - prevA) / prevA) * 100 : 0,
        cash: cashV, invested: investedOf(s),
        property: Number(s.real_estate), other: Number(s.other_assets),
        liquidity: a > 0 ? (cashV / a) * 100 : 0,
        dta: a > 0 ? (liabV / a) * 100 : 0,
        safeMonths: trailExp > 0 ? cashV / trailExp : 0,
        dtai: annualInc > 0 ? (liabV / annualInc) * 100 : 0,
      };
    });

    // yearly aggregate income (partial years included as-is)
    const byYear = new Map<number, number>();
    for (const s of snaps) byYear.set(s.year, (byYear.get(s.year) ?? 0) + Number(s.income));
    const yearly = [...byYear.entries()].map(([y, inc]) => ({ label: String(y), income: inc }));

    return { latest, prev, avgIncome, avgExpenses, series, gallery, yearly };
  }, [snaps, ar]);

  if (snaps === null) {
    return (
      <div className="drv-num bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 mb-8 text-sm text-[var(--muted)]">
        {L('تُفتح لوحة الأرقام…', 'Opening the board…')}
      </div>
    );
  }
  if (!d) {
    return (
      <div className="drv-num bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 mb-8 text-sm text-[var(--muted)]">
        📊 {L('تمتلئ هذه اللوحة بأرقامك بعد أول تسجيل في السِّجل.', 'This board fills with your numbers after your first Log entry.')}
      </div>
    );
  }

  const { latest, prev, avgIncome, avgExpenses, series, gallery, yearly } = d;
  const saved = avgIncome - avgExpenses;
  const savingsRate = avgIncome > 0 ? (saved / avgIncome) * 100 : 0;
  const assets = assetsOf(latest);
  const cash = Number(latest.cash);
  const invested = investedOf(latest);
  const property = Number(latest.real_estate) + Number(latest.other_assets);
  const liab = Number(latest.liabilities);
  const netWorth = assets - liab;
  const runway = avgExpenses > 0 ? cash / avgExpenses : 0;
  const debtToAssets = assets > 0 ? (liab / assets) * 100 : 0;
  const liquidity = assets > 0 ? (cash / assets) * 100 : 0;
  const investedShare = assets > 0 ? (invested / assets) * 100 : 0;
  const wealthMultiple = avgIncome > 0 ? netWorth / (avgIncome * 12) : 0;

  // ── the balance scorecards: value, month-over-month, sparkline ──
  const BALANCES: { key: keyof (typeof series)[number]; name: string; color: string; value: number; prevValue: number | null }[] = [
    { key: 'nw', name: L('صافي الثروة', 'Net worth'), color: '#1D9E75', value: netWorth, prevValue: prev ? nwOf(prev) : null },
    { key: 'assets', name: L('إجمالي الأصول', 'Total assets'), color: '#4C9F87', value: assets, prevValue: prev ? assetsOf(prev) : null },
    { key: 'cash', name: L('النقد', 'Cash'), color: '#3B6FD4', value: cash, prevValue: prev ? Number(prev.cash) : null },
    { key: 'invested', name: L('المستثمَر', 'Invested'), color: '#17B8C9', value: invested, prevValue: prev ? investedOf(prev) : null },
    { key: 'property', name: L('عقار وأصول أخرى', 'Property & other'), color: '#E0559E', value: property, prevValue: prev ? Number(prev.real_estate) + Number(prev.other_assets) : null },
    { key: 'liab', name: L('الالتزامات', 'Liabilities'), color: '#E0922A', value: liab, prevValue: prev ? Number(prev.liabilities) : null },
  ];

  // ── the ratio tiles: value on a zone band + verdict ──
  // tone by position; for liabilities-like ratios lower is better
  type Tone = 'good' | 'warn' | 'bad';
  const toneColor: Record<Tone, string> = { good: 'var(--green-dark)', warn: '#E0922A', bad: '#D64545' };
  const toneBg: Record<Tone, string> = { good: 'var(--green-bg)', warn: 'rgba(224,146,42,0.12)', bad: 'rgba(214,69,69,0.12)' };
  const RATIOS: {
    name: string; display: string; pos: number; zones: [number, Tone][]; tone: Tone; verdict: string; hint: string;
  }[] = [
    {
      name: L('معدل الادخار', 'Savings rate'), display: `${Math.round(savingsRate)}%`,
      pos: Math.max(0, Math.min(100, (savingsRate / 50) * 100)),
      zones: [[20, 'bad'], [20, 'warn'], [60, 'good']],
      tone: savingsRate >= 10 ? 'good' : savingsRate > 0 ? 'warn' : 'bad',
      verdict: savingsRate >= 30 ? L('ممتاز', 'Excellent') : savingsRate >= 10 ? L('سليم', 'Healthy') : savingsRate > 0 ? L('ضيّق', 'Thin') : L('استنزاف', 'Draining'),
      hint: L('المدَّخر ÷ الدخل', 'saved ÷ income'),
    },
    {
      name: L('غطاء المصاريف', 'Cash runway'), display: `${runway.toFixed(1)} ${L('شهر', 'mo')}`,
      pos: Math.max(0, Math.min(100, (runway / 12) * 100)),
      zones: [[25, 'bad'], [25, 'warn'], [50, 'good']],
      tone: runway >= 6 ? 'good' : runway >= 3 ? 'warn' : 'bad',
      verdict: runway >= 6 ? L('حصين', 'Fortified') : runway >= 3 ? L('مقبول', 'Adequate') : L('مكشوف', 'Exposed'),
      hint: L('النقد ÷ متوسط المصروف', 'cash ÷ avg spending'),
    },
    {
      name: L('الدين إلى الأصول', 'Debt-to-assets'), display: `${Math.round(debtToAssets)}%`,
      pos: Math.max(0, Math.min(100, debtToAssets)),
      zones: [[30, 'good'], [30, 'warn'], [40, 'bad']],
      tone: debtToAssets <= 30 ? 'good' : debtToAssets <= 60 ? 'warn' : 'bad',
      verdict: debtToAssets <= 30 ? L('خفيف', 'Light') : debtToAssets <= 60 ? L('مُثقَل', 'Loaded') : L('خطِر', 'Heavy'),
      hint: L('الالتزامات ÷ الأصول', 'liabilities ÷ assets'),
    },
    {
      name: L('السيولة', 'Liquidity'), display: `${Math.round(liquidity)}%`,
      pos: Math.max(0, Math.min(100, liquidity)),
      zones: [[10, 'bad'], [20, 'warn'], [70, 'good']],
      tone: liquidity >= 30 ? 'good' : liquidity >= 10 ? 'warn' : 'bad',
      verdict: liquidity >= 30 ? L('سائل', 'Liquid') : liquidity >= 10 ? L('محدود', 'Limited') : L('جامد', 'Frozen'),
      hint: L('النقد ÷ الأصول', 'cash ÷ assets'),
    },
    {
      name: L('حصة الاستثمار', 'Invested share'), display: `${Math.round(investedShare)}%`,
      pos: Math.max(0, Math.min(100, investedShare)),
      zones: [[20, 'warn'], [60, 'good'], [20, 'warn']],
      tone: investedShare >= 20 && investedShare <= 80 ? 'good' : 'warn',
      verdict: investedShare >= 20 && investedShare <= 80 ? L('يعمل', 'Working') : investedShare < 20 ? L('خامل', 'Idle') : L('مركَّز', 'Concentrated'),
      hint: L('الأسهم والحصص ÷ الأصول', 'stocks + equity ÷ assets'),
    },
    {
      name: L('مضاعف الثروة', 'Wealth multiple'), display: `${wealthMultiple.toFixed(1)}×`,
      pos: Math.max(0, Math.min(100, (wealthMultiple / 5) * 100)),
      zones: [[20, 'bad'], [40, 'warn'], [40, 'good']],
      tone: wealthMultiple >= 3 ? 'good' : wealthMultiple >= 1 ? 'warn' : 'bad',
      verdict: wealthMultiple >= 3 ? L('راسخ', 'Established') : wealthMultiple >= 1 ? L('ينمو', 'Growing') : L('يبدأ', 'Starting'),
      hint: L('صافي الثروة ÷ دخل سنة', 'net worth ÷ annual income'),
    },
  ];

  const delta = (v: number, p: number | null) => {
    if (p === null || p === 0) return null;
    const pct = ((v - p) / Math.abs(p)) * 100;
    return { pct, up: pct >= 0 };
  };

  const axisTick = { fontSize: 9, fill: 'var(--muted)' };

  return (
    <div className="drv-num bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 sm:p-6 mb-8">
      <div className="font-serif text-lg font-semibold text-[var(--ink)] mb-1">🧮 {L('لوحة الأرقام الكاملة', 'The full board')}</div>
      <p className="text-[11px] text-[var(--muted)] leading-relaxed mb-4">
        {L(
          'أعقد عرض لأرقامك: كل رصيد ومساره، التدفق الشهري، النسب بمناطقها، والمنحنيات الطويلة — كلها من سِجلّك.',
          'Your numbers at full complexity: every balance with its trend, the monthly flow, the ratios with their zones, and the long curves — all from your Log.'
        )}
      </p>

      {/* ── balances: six scorecards, each with its own spark ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
        {BALANCES.map((b) => {
          const dl = delta(b.value, b.prevValue);
          return (
            <div key={b.key as string} className="bg-[var(--surface-1)] border border-[var(--border-faint)] rounded-xl p-3 min-w-0">
              <div className="text-[9px] text-[var(--muted)] mb-0.5 truncate">{b.name}</div>
              <div className="text-base font-bold leading-tight" style={{ color: b.color }} dir="ltr">{fmtFull(b.value)}</div>
              {dl && (
                <div className={`text-[9px] font-semibold ${dl.up ? 'text-[var(--green-dark)]' : 'text-[#D64545]'}`} dir="ltr">
                  {dl.up ? '▲' : '▼'} {Math.abs(dl.pct).toFixed(1)}% {L('عن الشهر الماضي', 'MoM')}
                </div>
              )}
              <div className="h-8 mt-1.5 -mx-1" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
                    <Line type="monotone" dataKey={b.key as string} stroke={b.color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── the monthly flow, averaged over the recent six ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {([
          [L('الدخل / شهر', 'Income / mo'), fmtFull(avgIncome), '#0E9F6E'],
          [L('المصروف / شهر', 'Spending / mo'), fmtFull(avgExpenses), '#D64545'],
          [L('المدَّخر / شهر', 'Saved / mo'), fmtFull(saved), '#C9A84C'],
          [L('معدل الادخار', 'Savings rate'), `${Math.round(savingsRate)}%`, savingsRate >= 10 ? '#0E9F6E' : '#E0922A'],
        ] as [string, string, string][]).map(([name, val, color]) => (
          <div key={name} className="bg-[var(--surface-1)] border border-[var(--border-faint)] rounded-xl px-3 py-2.5">
            <div className="text-[9px] text-[var(--muted)]">{name}</div>
            <div className="text-sm font-bold" style={{ color }} dir="ltr">{val}</div>
          </div>
        ))}
      </div>

      {/* ── the ratio wall: zone bands with the marker where you stand ── */}
      <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--muted)] font-semibold mb-2">{L('النسب', 'Ratios')}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-5">
        {RATIOS.map((r) => (
          <div key={r.name} className="bg-[var(--surface-1)] border border-[var(--border-faint)] rounded-xl p-3">
            <div className="flex items-baseline justify-between gap-2 mb-0.5">
              <div className="text-[10px] font-semibold text-[var(--ink-2)]">{r.name}</div>
              <span className="text-[9px] font-semibold rounded-full px-2 py-0.5" style={{ color: toneColor[r.tone], background: toneBg[r.tone] }}>
                {r.verdict}
              </span>
            </div>
            <div className="text-lg font-bold text-[var(--ink)]" dir="ltr">{r.display}</div>
            <div className="relative h-1.5 rounded-full overflow-hidden flex mt-2" dir="ltr">
              {r.zones.map(([w, t], i) => (
                <div key={i} className="h-full" style={{ width: `${w}%`, background: toneColor[t], opacity: 0.35 }} />
              ))}
              <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[var(--ink)] ring-2 ring-[var(--surface-1)]" style={{ left: `calc(${r.pos}% - 4px)` }} />
            </div>
            <div className="text-[8px] text-[var(--muted)] mt-1.5">{r.hint}</div>
          </div>
        ))}
      </div>

      {/* ── the long curves ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <div className="text-[10px] font-semibold text-[var(--ink-2)] mb-1.5">📈 {L('صافي الثروة عبر الزمن', 'Net worth over time')}</div>
          <div className="h-40" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border-faint)" />
                <XAxis dataKey="label" tick={axisTick} interval="preserveStartEnd" reversed={ar} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} tickFormatter={fmtCompact} width={44} orientation={ar ? 'right' : 'left'} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 11 }} formatter={(v) => fmtFull(Number(v))} />
                <ReferenceLine y={0} stroke="var(--border-medium)" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="nw" name={L('صافي الثروة', 'Net worth')} stroke="#1D9E75" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="liab" name={L('الالتزامات', 'Liabilities')} stroke="#E0922A" strokeWidth={1.5} dot={false} strokeDasharray="5 4" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <div className="text-[10px] font-semibold text-[var(--ink-2)] mb-1.5">🔄 {L('الدخل مقابل المصروف', 'Income vs spending')}</div>
          <div className="h-40" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border-faint)" />
                <XAxis dataKey="label" tick={axisTick} interval="preserveStartEnd" reversed={ar} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} tickFormatter={fmtCompact} width={44} orientation={ar ? 'right' : 'left'} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 11 }} formatter={(v) => fmtFull(Number(v))} />
                <Line type="monotone" dataKey="income" name={L('الدخل', 'Income')} stroke="#0E9F6E" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="expenses" name={L('المصروف', 'Spending')} stroke="#D64545" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── the asset mix, one proportional band ── */}
      <div className="mt-4">
        <div className="text-[10px] font-semibold text-[var(--ink-2)] mb-1.5">🏛 {L('تكوين الأصول الآن', 'Asset mix now')}</div>
        {assets > 0 ? (
          <>
            <div className="h-3 rounded-full overflow-hidden flex" dir="ltr">
              {([
                [cash, '#3B6FD4', L('النقد', 'Cash')],
                [Number(latest.stocks), '#17B8C9', L('الأسهم', 'Stocks')],
                [Number(latest.equity), '#7A5EA8', L('حصص', 'Equity')],
                [Number(latest.real_estate), '#E0559E', L('عقار', 'Real estate')],
                [Number(latest.other_assets), '#8AA097', L('أخرى', 'Other')],
              ] as [number, string, string][]).filter(([v]) => v > 0).map(([v, color, name]) => (
                <div key={name} className="h-full" style={{ width: `${(v / assets) * 100}%`, background: color }} title={`${name}: ${fmtFull(v)}`} />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
              {([
                [cash, '#3B6FD4', L('النقد', 'Cash')],
                [Number(latest.stocks), '#17B8C9', L('الأسهم', 'Stocks')],
                [Number(latest.equity), '#7A5EA8', L('حصص', 'Equity')],
                [Number(latest.real_estate), '#E0559E', L('عقار', 'Real estate')],
                [Number(latest.other_assets), '#8AA097', L('أخرى', 'Other')],
              ] as [number, string, string][]).filter(([v]) => v > 0).map(([v, color, name]) => (
                <span key={name} className="inline-flex items-center gap-1 text-[9px] text-[var(--muted)]">
                  <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                  {name} · <span dir="ltr">{Math.round((v / assets) * 100)}%</span>
                </span>
              ))}
            </div>
          </>
        ) : (
          <div className="text-[10px] text-[var(--muted)]">{L('لا أصول مسجلة بعد.', 'No assets logged yet.')}</div>
        )}
      </div>

      {/* ── the gallery: every indicator at full length, the founder's
             spreadsheet walls rebuilt from the Log ── */}
      {(() => {
        const tipStyle = { background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 11 };
        const pct = (v: unknown) => `${Number(v).toFixed(1)}%`;
        const nowYear = latest.year;
        // 12 months forward: what cash becomes at your real pace vs a
        // life where every riyal of income were saved
        const projection = Array.from({ length: 13 }, (_, m) => {
          const mi = (latest.month - 1 + m) % 12;
          const yr = latest.year + Math.floor((latest.month - 1 + m) / 12);
          return {
            label: `${(ar ? MONTHS_AR : MONTHS_EN)[mi]} ${String(yr).slice(2)}`,
            realistic: Math.round(cash + saved * m),
            full: Math.round(cash + avgIncome * m),
          };
        });
        // the doubling path: invested money doubling every 72/ROI years,
        // with your age riding the line to 70
        const doublingYears = 72 / roi;
        const startVal = invested > 0 ? invested : cash;
        const doubling = age && startVal > 0 ? (() => {
          const rows: { label: string; amount: number; age: number }[] = [];
          let v = startVal; let a = age;
          while (a <= 70 && rows.length < 13) {
            rows.push({ label: String(nowYear + Math.round(a - age)), amount: Math.round(v), age: Math.round(a) });
            v *= 2; a += doublingYears;
          }
          return rows;
        })() : null;
        const card = (title: string, body: React.ReactNode) => (
          <div key={title}>
            <div className="text-[10px] font-semibold text-[var(--ink-2)] mb-1.5">{title}</div>
            <div className="h-40" dir="ltr">{body}</div>
          </div>
        );
        return (
          <div className="mt-5 pt-4 border-t border-[var(--border-faint)]">
            <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--muted)] font-semibold mb-3">
              {L('المعرض — كل مؤشر بطوله الكامل', 'The gallery — every indicator, full length')}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-4 gap-y-5">
              {card(`📊 ${L('تغيّر الأصول شهرياً %', 'Delta assets, monthly %')}`, (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gallery} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--border-faint)" />
                    <XAxis dataKey="label" tick={axisTick} interval="preserveStartEnd" reversed={ar} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} tickFormatter={(v) => `${v}%`} width={44} orientation={ar ? 'right' : 'left'} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tipStyle} formatter={pct} />
                    <ReferenceLine y={0} stroke="var(--border-medium)" />
                    <Bar dataKey="deltaAssets" name={L('التغيّر', 'Delta')} isAnimationActive={false}>
                      {gallery.map((p, i) => <Cell key={i} fill={p.deltaAssets >= 0 ? '#3B6FD4' : '#D64545'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ))}
              {card(`🏛 ${L('تكوين الأصول عبر الزمن', 'Asset composition over time')}`, (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={gallery} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--border-faint)" />
                    <XAxis dataKey="label" tick={axisTick} interval="preserveStartEnd" reversed={ar} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} tickFormatter={fmtCompact} width={44} orientation={ar ? 'right' : 'left'} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tipStyle} formatter={(v) => fmtFull(Number(v))} />
                    <Area type="monotone" dataKey="cash" name={L('النقد', 'Cash')} stackId="1" stroke="#3B6FD4" fill="#3B6FD4" fillOpacity={0.7} />
                    <Area type="monotone" dataKey="invested" name={L('المستثمَر', 'Invested')} stackId="1" stroke="#17B8C9" fill="#17B8C9" fillOpacity={0.7} />
                    <Area type="monotone" dataKey="property" name={L('العقار', 'Real estate')} stackId="1" stroke="#E0559E" fill="#E0559E" fillOpacity={0.7} />
                    <Area type="monotone" dataKey="other" name={L('أخرى', 'Other')} stackId="1" stroke="#8AA097" fill="#8AA097" fillOpacity={0.7} />
                  </AreaChart>
                </ResponsiveContainer>
              ))}
              {card(`💧 ${L('السيولة عبر الزمن', 'Liquidity over time')}`, (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={gallery} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--border-faint)" />
                    <XAxis dataKey="label" tick={axisTick} interval="preserveStartEnd" reversed={ar} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} tickFormatter={(v) => `${v}%`} width={44} orientation={ar ? 'right' : 'left'} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tipStyle} formatter={pct} />
                    <ReferenceLine y={4} stroke="var(--gold)" strokeDasharray="5 4" label={{ value: L('عتبة الاستثمار ٤٪', 'Investment 4%'), fontSize: 9, fill: 'var(--gold)', position: 'insideTopLeft' }} />
                    <Line type="monotone" dataKey="liquidity" name={L('السيولة', 'Liquidity')} stroke="#3B6FD4" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ))}
              {card(`⚖️ ${L('الدين إلى الأصول', 'Debt-to-assets')}`, (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={gallery} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--border-faint)" />
                    <XAxis dataKey="label" tick={axisTick} interval="preserveStartEnd" reversed={ar} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} tickFormatter={(v) => `${v}%`} width={44} orientation={ar ? 'right' : 'left'} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tipStyle} formatter={pct} />
                    <ReferenceLine y={100} stroke="#D64545" strokeDasharray="5 4" label={{ value: L('نقطة التعادل', 'Breakeven'), fontSize: 9, fill: '#D64545', position: 'insideTopLeft' }} />
                    <Line type="monotone" dataKey="dta" name={L('دين/أصول', 'Debt/assets')} stroke="#E0922A" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ))}
              {card(`🛡 ${L('أشهر الأمان', 'Safe months')}`, (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={gallery} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--border-faint)" />
                    <XAxis dataKey="label" tick={axisTick} interval="preserveStartEnd" reversed={ar} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} width={44} orientation={ar ? 'right' : 'left'} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tipStyle} formatter={(v) => Number(v).toFixed(1)} />
                    <ReferenceLine y={6} stroke="#D64545" strokeDasharray="5 4" label={{ value: L('الحد الأدنى (٦)', 'Bare minimum (6)'), fontSize: 9, fill: '#D64545', position: 'insideTopLeft' }} />
                    <ReferenceLine y={12} stroke="var(--green)" strokeDasharray="5 4" label={{ value: L('حاجة سنة (١٢)', 'Year need (12)'), fontSize: 9, fill: 'var(--green)', position: 'insideTopLeft' }} />
                    <ReferenceLine y={24} stroke="var(--green)" strokeDasharray="2 4" label={{ value: L('حاجة سنتين', '2-year need'), fontSize: 9, fill: 'var(--green)', position: 'insideTopLeft' }} />
                    <Line type="monotone" dataKey="safeMonths" name={L('أشهر الأمان', 'Safe months')} stroke="#3B6FD4" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ))}
              {card(`🪙 ${L('الدين إلى الدخل السنوي', 'Debt-to-annual-income')}`, (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={gallery} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--border-faint)" />
                    <XAxis dataKey="label" tick={axisTick} interval="preserveStartEnd" reversed={ar} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} tickFormatter={(v) => `${v}%`} width={44} orientation={ar ? 'right' : 'left'} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tipStyle} formatter={pct} />
                    <Line type="monotone" dataKey="dtai" name={L('دين/دخل سنوي', 'Debt/annual income')} stroke="#7A5EA8" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ))}
              {card(`💰 ${L('مجموع الدخل سنةً بسنة', 'Aggregate income by year')}`, (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={yearly} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--border-faint)" />
                    <XAxis dataKey="label" tick={axisTick} reversed={ar} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} tickFormatter={fmtCompact} width={44} orientation={ar ? 'right' : 'left'} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tipStyle} formatter={(v) => fmtFull(Number(v))} />
                    <Bar dataKey="income" name={L('الدخل', 'Income')} fill="#0E9F6E" isAnimationActive={false} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ))}
              {card(`🔮 ${L('إسقاط النقد ١٢ شهراً — واقعي مقابل ادخارٍ كامل', 'Cash projection, 12 months — realistic vs 100% saving')}`, (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={projection} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--border-faint)" />
                    <XAxis dataKey="label" tick={axisTick} interval="preserveStartEnd" reversed={ar} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} tickFormatter={fmtCompact} width={44} orientation={ar ? 'right' : 'left'} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tipStyle} formatter={(v) => fmtFull(Number(v))} />
                    <Line type="monotone" dataKey="full" name={L('ادخار ١٠٠٪', '100% saving')} stroke="#D64545" strokeWidth={2} dot={false} strokeDasharray="6 4" />
                    <Line type="monotone" dataKey="realistic" name={L('الواقعي', 'Realistic')} stroke="#3B6FD4" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ))}
              {doubling && card(`♻️ ${L(`مسار المضاعفة — كل ${doublingYears.toFixed(1)} سنة عند ${roi}٪`, `The doubling path — every ${doublingYears.toFixed(1)}y at ${roi}%`)}`, (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={doubling} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--border-faint)" />
                    <XAxis dataKey="label" tick={axisTick} interval="preserveStartEnd" reversed={ar} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="amt" tick={axisTick} tickFormatter={fmtCompact} width={44} orientation={ar ? 'right' : 'left'} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="age" tick={axisTick} width={30} orientation={ar ? 'left' : 'right'} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tipStyle} formatter={(v, name) => (name === L('العمر حينها', 'Age then') ? v : fmtFull(Number(v)))} />
                    <Bar yAxisId="amt" dataKey="amount" name={L('المبلغ', 'Amount')} fill="#17B8C9" isAnimationActive={false} radius={[3, 3, 0, 0]} />
                    <Line yAxisId="age" type="monotone" dataKey="age" name={L('العمر حينها', 'Age then')} stroke="#5DCAA5" strokeWidth={2} dot={{ r: 2.5 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
