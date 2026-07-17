'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ComposedChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceArea,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import GoogleSheetSync from './GoogleSheetSync';
import {
  bucketSeries, granularityOf, windowBucketsOf, metricStat, RANGE_VIEWS, DEFAULT_RANGE_VIEW,
  type RangeView, type SeriesPoint, type NumericKey,
} from '@/lib/financialSeries';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// The asset components that stack up into total assets.
const ASSET_METRICS = [
  { key: 'cash', label: 'Cash', color: '#2a78d6' },
  { key: 'stocks', label: 'Stocks', color: '#17B8C9' },
  { key: 'real_estate', label: 'Real estate', color: '#E0559E' },
  { key: 'equity', label: 'Equity', color: '#E0922A' },
  { key: 'other_assets', label: 'Other assets', color: '#9AA0A6' },
] as const;

// Every editable numeric column, in table/CSV order.
const ALL_METRICS = [
  ...ASSET_METRICS.map((m) => ({ key: m.key, label: m.label })),
  { key: 'liabilities', label: 'Liabilities' },
  { key: 'income', label: 'Income' },
  { key: 'expenses', label: 'Expenses' },
] as const;

type MetricKey = (typeof ALL_METRICS)[number]['key'];

// A selected span on the charts, keyed by the x-axis category labels.
interface Band {
  start: string;
  end: string;
}
// The subset of Recharts' mouse-event state we use.
interface ChartMouse {
  activeLabel?: string | number;
}

interface Snapshot {
  id: string;
  year: number;
  month: number;
  cash: number;
  stocks: number;
  real_estate: number;
  equity: number;
  other_assets: number;
  liabilities: number;
  income: number;
  expenses: number;
}

function fmt(n: number) {
  return Math.round(n).toLocaleString();
}

function fmtCompact(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${Math.round(n / 1e3)}K`;
  return String(Math.round(n));
}

function emptyForm() {
  const now = new Date();
  return {
    year: String(now.getFullYear()),
    month: String(now.getMonth() + 1),
    cash: '', stocks: '', real_estate: '', equity: '', other_assets: '',
    liabilities: '', income: '', expenses: '',
  } as Record<string, string>;
}

export default function FinancialNumbersPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [rows, setRows] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, string>>(emptyForm);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [view, setView] = useState<RangeView>(DEFAULT_RANGE_VIEW);

  const load = useCallback(
    async (uid: string) => {
      const { data } = await supabase
        .from('financial_snapshots')
        .select('*')
        .eq('user_id', uid)
        .order('year', { ascending: true })
        .order('month', { ascending: true });
      if (data) setRows(data as Snapshot[]);
    },
    [supabase]
  );

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);
      await load(user.id);
      setLoading(false);
    })();
  }, [supabase, router, load]);

  // ── Windowed view: resolution (view) sets the width, a sliding window sets
  // which slice of history is shown; arrows + the scrubber pan it. ──────────
  const gran = granularityOf(view);
  const fullSeries = useMemo(() => bucketSeries(rows, gran), [rows, gran]);
  const windowWidth = (() => {
    const w = windowBucketsOf(view);
    const n = Math.max(1, fullSeries.length);
    return Number.isFinite(w) ? Math.min(w, n) : n;
  })();
  const maxStart = Math.max(0, fullSeries.length - windowWidth);
  const [winStart, setWinStart] = useState(0);
  // Anchor to the most recent window whenever the resolution or data changes.
  useEffect(() => {
    setWinStart(Math.max(0, fullSeries.length - windowWidth));
  }, [view, rows, fullSeries.length, windowWidth]);
  const clampedStart = Math.min(Math.max(0, winStart), maxStart);
  const canPan = maxStart > 0;
  const panStep = Math.max(1, Math.round(windowWidth / 3));

  const chartData = useMemo(
    () => fullSeries.slice(clampedStart, clampedStart + windowWidth),
    [fullSeries, clampedStart, windowWidth]
  );

  // ── Drag-to-select a sub-range on the charts ──────────────────────────
  // All three charts share the same x categories (chartData labels), so one
  // selection drives the shaded band + stats on every chart at once.
  const [drag, setDrag] = useState<Band | null>(null); // live, while dragging
  const [sel, setSel] = useState<Band | null>(null); // committed selection
  const dragRef = useRef<Band | null>(null); // latest drag, readable in mouseup
  const pressedRef = useRef(false); // mouse button held on a chart
  const activeBand = drag ?? sel;

  const bandIndices = useCallback(
    (b: Band | null): [number, number] | null => {
      if (!b) return null;
      const a = chartData.findIndex((p) => p.label === b.start);
      const c = chartData.findIndex((p) => p.label === b.end);
      if (a < 0 || c < 0) return null;
      return [Math.min(a, c), Math.max(a, c)];
    },
    [chartData]
  );

  // Reset any stale selection when the underlying series or window changes
  // (labels may no longer exist, or fall outside the visible window).
  useEffect(() => {
    setSel(null);
    setDrag(null);
  }, [view, rows, clampedStart]);

  const selIdx = bandIndices(sel);
  const statPoints = selIdx ? chartData.slice(selIdx[0], selIdx[1] + 1) : chartData;

  const onDown = (e: ChartMouse) => {
    pressedRef.current = true;
    const l = e?.activeLabel;
    // Recharts may report an absent or empty category on the initial press
    // (it only resolves the hovered label once the pointer moves) — the first
    // move starts the band in that case.
    if (l == null || l === '') return;
    const b = { start: String(l), end: String(l) };
    dragRef.current = b;
    setDrag(b);
  };
  const onMove = (e: ChartMouse) => {
    if (!pressedRef.current) return;
    const l = e?.activeLabel;
    if (l == null || l === '') return;
    const b = dragRef.current
      ? { start: dragRef.current.start, end: String(l) }
      : { start: String(l), end: String(l) };
    dragRef.current = b;
    setDrag(b);
  };
  const onUp = () => {
    pressedRef.current = false;
    const d = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (d) setSel(d.start === d.end ? null : d);
  };
  const chartHandlers = { onMouseDown: onDown, onMouseMove: onMove, onMouseUp: onUp, onMouseLeave: onUp };

  // Delta bubble text for a balance metric across the active band.
  const balanceBubble = (key: NumericKey, good: boolean) => {
    const idx = bandIndices(activeBand);
    if (!idx || idx[0] === idx[1]) return null;
    const a = chartData[idx[0]][key] as number;
    const b = chartData[idx[1]][key] as number;
    const abs = b - a;
    const pct = a !== 0 ? (abs / Math.abs(a)) * 100 : null;
    const favourable = abs === 0 ? true : abs > 0 === good;
    const sign = abs > 0 ? '+' : abs < 0 ? '−' : '';
    return {
      text: `${pct !== null ? signedPct(pct) + ' · ' : ''}${sign}SAR ${fmt(Math.abs(abs))}`,
      color: abs === 0 ? '#9C9A92' : favourable ? '#1D9E75' : '#C0392B',
    };
  };
  const cashflowBubble = () => {
    const idx = bandIndices(activeBand);
    if (!idx || idx[0] === idx[1]) return null;
    const slice = chartData.slice(idx[0], idx[1] + 1);
    const net = slice.reduce((s, p) => s + p.income - p.expenses, 0);
    return {
      text: `Net ${net < 0 ? '−' : '+'}SAR ${fmt(Math.abs(net))} saved`,
      color: net >= 0 ? '#1D9E75' : '#C0392B',
    };
  };

  const latest = rows[rows.length - 1];
  const latestAssets = latest ? latest.cash + latest.stocks + latest.real_estate + latest.equity + latest.other_assets : 0;
  const latestNetWorth = latest ? latestAssets - latest.liabilities : 0;

  function num(v: string) {
    return parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0;
  }

  async function saveRow() {
    if (!userId) return;
    const year = parseInt(form.year);
    const month = parseInt(form.month);
    if (!year || !month) return;
    const payload: Record<string, unknown> = { user_id: userId, year, month };
    for (const m of ALL_METRICS) payload[m.key] = num(form[m.key]);
    const { error } = await supabase
      .from('financial_snapshots')
      .upsert(payload, { onConflict: 'user_id,year,month' });
    if (!error) {
      setForm(emptyForm());
      load(userId);
    }
  }

  function editRow(r: Snapshot) {
    setForm({
      year: String(r.year), month: String(r.month),
      cash: String(r.cash), stocks: String(r.stocks), real_estate: String(r.real_estate),
      equity: String(r.equity), other_assets: String(r.other_assets),
      liabilities: String(r.liabilities), income: String(r.income), expenses: String(r.expenses),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteRow(id: string) {
    if (!userId) return;
    await supabase.from('financial_snapshots').delete().eq('id', id);
    load(userId);
  }

  function exportCsv() {
    const header = ['Year', 'Month', ...ALL_METRICS.map((m) => m.label), 'Total assets', 'Net worth'];
    const lines = rows.map((r) => {
      const assets = r.cash + r.stocks + r.real_estate + r.equity + r.other_assets;
      return [r.year, r.month, ...ALL_METRICS.map((m) => r[m.key]), assets, assets - r.liabilities].join(',');
    });
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-financial-numbers.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importCsv() {
    if (!userId) return;
    const lines = importText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    // Skip a header row if its first cell isn't a number.
    const first = lines[0].split(/[,\t]/)[0].trim();
    const dataLines = /^\d+$/.test(first) ? lines : lines.slice(1);
    const payloads = dataLines
      .map((l) => {
        const c = l.split(/[,\t]/).map((x) => x.trim());
        const year = parseInt(c[0]);
        const month = parseInt(c[1]);
        if (!year || !month || month < 1 || month > 12) return null;
        const row: Record<string, unknown> = { user_id: userId, year, month };
        ALL_METRICS.forEach((m, i) => {
          row[m.key] = parseFloat(String(c[2 + i] ?? '').replace(/[^0-9.-]/g, '')) || 0;
        });
        return row;
      })
      .filter(Boolean) as Record<string, unknown>[];

    if (payloads.length === 0) {
      setImportMsg('No valid rows found. Expected: year, month, cash, stocks, real estate, equity, other assets, liabilities, income, expenses.');
      return;
    }
    const { error } = await supabase.from('financial_snapshots').upsert(payloads, { onConflict: 'user_id,year,month' });
    if (error) {
      setImportMsg(`Import failed: ${error.message}`);
    } else {
      setImportMsg(`Imported ${payloads.length} row${payloads.length === 1 ? '' : 's'}.`);
      setImportText('');
      load(userId);
    }
  }

  if (loading) {
    return <div className="text-sm text-[var(--muted)]">Loading your financial numbers…</div>;
  }

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-[var(--ink)] mb-1">My Financial Numbers</h1>
      <p className="text-sm text-[var(--ink-2)] mb-6 max-w-2xl">
        Your financial statement over time. Log your balances month by month — cash, investments, property,
        liabilities, income and spending — and watch your net worth, asset mix, and cash flow build into a real
        timeline. Import a spreadsheet to start fast, or export yours anytime.
      </p>

      {latest && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatTile label="Net worth" value={`SAR ${fmt(latestNetWorth)}`} accent="var(--green-dark)" />
          <StatTile label="Total assets" value={`SAR ${fmt(latestAssets)}`} accent="#E0559E" />
          <StatTile label="Liabilities" value={`SAR ${fmt(latest.liabilities)}`} accent="#17B8C9" />
          <StatTile label="Months logged" value={String(rows.length)} accent="var(--ink)" />
        </div>
      )}

      {/* add / edit a month */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-6">
        <div className="text-[11px] tracking-[0.1em] uppercase text-[var(--muted)] mb-3">Log a month</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-3">
          <Field label="Year">
            <input value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
              className="w-full bg-[var(--surface-1)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--ink)] outline-none" />
          </Field>
          <Field label="Month">
            <select value={form.month} onChange={(e) => setForm((f) => ({ ...f, month: e.target.value }))}
              className="w-full bg-[var(--surface-1)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--ink)] outline-none">
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </Field>
          {ALL_METRICS.map((m) => (
            <Field key={m.key} label={`${m.label} (SAR)`}>
              <input value={form[m.key]} onChange={(e) => setForm((f) => ({ ...f, [m.key]: e.target.value }))} placeholder="0"
                className="w-full bg-[var(--surface-1)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--green)]" />
            </Field>
          ))}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={saveRow} className="text-sm bg-[var(--green-dark)] text-white rounded-lg px-4 py-2 font-medium">
            Save month
          </button>
          <button onClick={() => setForm(emptyForm())} className="text-xs text-[var(--muted)]">Clear</button>
          <span className="text-xs text-[var(--muted)]">Saving a month that already exists updates it.</span>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-8 text-center text-sm text-[var(--muted)] mb-6">
          Log your first month above, or import a spreadsheet below, to start your financial timeline.
        </div>
      ) : (
        <>
          <div data-tour="fn-charts">
          {/* time-range control shared by the charts below */}
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <div className="text-[11px] tracking-[0.1em] uppercase text-[var(--muted)]">Chart view</div>
            <RangeSelector value={view} onChange={setView} />
          </div>

          {/* pan the visible window through history: arrows + range scrubber */}
          {canPan && (
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => setWinStart(Math.max(0, clampedStart - panStep))}
                disabled={clampedStart <= 0}
                title="Earlier"
                className="w-7 h-7 rounded-lg border border-[var(--border-default)] text-[var(--ink-2)] hover:bg-[var(--surface-1)] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
              >
                ‹
              </button>
              <input
                type="range"
                min={0}
                max={maxStart}
                value={clampedStart}
                onChange={(e) => setWinStart(Number(e.target.value))}
                className="flex-1 accent-[var(--green)] cursor-pointer"
                aria-label="Scroll date range"
              />
              <button
                onClick={() => setWinStart(Math.min(maxStart, clampedStart + panStep))}
                disabled={clampedStart >= maxStart}
                title="Later"
                className="w-7 h-7 rounded-lg border border-[var(--border-default)] text-[var(--ink-2)] hover:bg-[var(--surface-1)] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
              >
                ›
              </button>
              <span className="text-xs text-[var(--muted)] whitespace-nowrap min-w-[7rem] text-right">
                {chartData[0]?.label} → {chartData[chartData.length - 1]?.label}
              </span>
              <button
                onClick={() => setWinStart(maxStart)}
                disabled={clampedStart >= maxStart}
                className="text-xs text-[var(--green-dark)] font-medium disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
              >
                Latest ⇥
              </button>
            </div>
          )}

          {/* selection state / hint for the drag-to-analyse interaction */}
          <div className="flex items-center gap-2 mb-3 text-xs">
            {sel ? (
              <>
                <span className="inline-flex items-center gap-1.5 bg-[var(--green-bg)] border border-[var(--green-border)] text-[var(--green-dark)] rounded-full px-3 py-1 font-medium">
                  Selected · {sel.start} → {sel.end}
                </span>
                <button onClick={() => setSel(null)} className="text-[var(--muted)] hover:text-[var(--ink)] underline">
                  Clear
                </button>
              </>
            ) : (
              <span className="text-[var(--muted)]">
                Tip: click and drag across any chart to analyse a specific span — the shaded band and all stats update to it.
              </span>
            )}
          </div>

          {/* net worth / assets / liabilities */}
          <ChartCard
            title="Net worth, assets & liabilities over time"
            badge={!activeBand ? <MetricBadge points={statPoints} metricKey="netWorth" label="Net worth" good /> : null}
            footer={
              <SeriesStats
                points={statPoints}
                metrics={[
                  { key: 'netWorth', label: 'Net worth', good: true },
                  { key: 'assets', label: 'Total assets', good: true },
                  { key: 'liabilities', label: 'Liabilities', good: false },
                ]}
              />
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} {...chartHandlers}>
                <CartesianGrid stroke="var(--border-default)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} tickFormatter={fmtCompact} />
                <Tooltip formatter={(v) => `SAR ${fmt(Number(v))}`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="assets" name="Assets" stroke="#E0559E" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="liabilities" name="Liabilities" stroke="#17B8C9" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="netWorth" name="Net worth" stroke="#1D9E75" strokeWidth={3} dot={false} />
                {selectionBand(activeBand, balanceBubble('netWorth', true))}
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* asset composition */}
          <ChartCard
            title="Asset composition over time"
            badge={!activeBand ? <MetricBadge points={statPoints} metricKey="assets" label="Total assets" good /> : null}
            footer={
              <SeriesStats
                points={statPoints}
                metrics={ASSET_METRICS.map((m) => ({ key: m.key as NumericKey, label: m.label, good: true }))}
              />
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} {...chartHandlers}>
                <CartesianGrid stroke="var(--border-default)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} tickFormatter={fmtCompact} />
                <Tooltip formatter={(v) => `SAR ${fmt(Number(v))}`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {ASSET_METRICS.map((m) => (
                  <Bar key={m.key} dataKey={m.key} name={m.label} stackId="a" fill={m.color} />
                ))}
                {selectionBand(activeBand, balanceBubble('assets', true))}
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* income vs expenses */}
          <ChartCard
            title="Income vs expenses"
            badge={!activeBand ? <SavingsBadge points={statPoints} /> : null}
            footer={<CashflowStats points={statPoints} />}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} {...chartHandlers}>
                <CartesianGrid stroke="var(--border-default)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} tickFormatter={fmtCompact} />
                <Tooltip formatter={(v) => `SAR ${fmt(Number(v))}`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="income" name="Income" fill="#1D9E75" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#E0922A" radius={[3, 3, 0, 0]} />
                {selectionBand(activeBand, cashflowBubble())}
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          </div>

          {/* the spreadsheet */}
          <div data-tour="fn-sheet" className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-6">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="text-[11px] tracking-[0.1em] uppercase text-[var(--muted)]">The spreadsheet</div>
              <button onClick={exportCsv} className="text-xs font-medium text-[var(--green-dark)] bg-[var(--green-bg)] border border-[var(--green-border)] rounded-lg px-3 py-1.5">
                Export CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs whitespace-nowrap">
                <thead>
                  <tr className="text-[var(--muted)] text-left">
                    <th className="py-2 pr-4 font-medium">Month</th>
                    {ALL_METRICS.map((m) => (
                      <th key={m.key} className="py-2 px-3 font-medium text-right">{m.label}</th>
                    ))}
                    <th className="py-2 px-3 font-medium text-right">Net worth</th>
                    <th className="py-2 pl-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const assets = r.cash + r.stocks + r.real_estate + r.equity + r.other_assets;
                    return (
                      <tr key={r.id} className="border-t border-[var(--border-default)] hover:bg-[var(--surface-1)] cursor-pointer" onClick={() => editRow(r)}>
                        <td className="py-2 pr-4 text-[var(--ink)] font-medium">{MONTHS[r.month - 1]} {r.year}</td>
                        {ALL_METRICS.map((m) => (
                          <td key={m.key} className="py-2 px-3 text-right text-[var(--ink-2)]">{fmt(r[m.key])}</td>
                        ))}
                        <td className="py-2 px-3 text-right font-semibold text-[var(--green-dark)]">{fmt(assets - r.liabilities)}</td>
                        <td className="py-2 pl-3 text-right">
                          <button onClick={(e) => { e.stopPropagation(); deleteRow(r.id); }} className="text-[var(--muted)] hover:text-[#C0504D]" title="Delete">✕</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-[var(--muted)] mt-3">Tip: click any row to load it into the form above and edit it.</p>
          </div>
        </>
      )}

      {/* Google Sheets two-way sync */}
      <GoogleSheetSync onSynced={() => userId && load(userId)} />

      {/* CSV import */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5">
        <button onClick={() => setImportOpen((o) => !o)} className="text-sm font-medium text-[var(--ink)]">
          {importOpen ? '▾' : '▸'} Import from a spreadsheet
        </button>
        {importOpen && (
          <div className="mt-3">
            <p className="text-xs text-[var(--muted)] mb-2">
              Paste rows (comma or tab separated), one month per line, in this column order:
              <span className="block mt-1 font-mono text-[var(--ink-2)]">year, month, cash, stocks, real estate, equity, other assets, liabilities, income, expenses</span>
              A header row is fine — it&apos;s skipped automatically.
            </p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={5}
              placeholder={'2026,1,50000,120000,900000,30000,0,175000,40000,18000\n2026,2,55000,128000,900000,30000,0,172000,40000,17500'}
              className="w-full bg-[var(--surface-1)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--ink)] outline-none focus:border-[var(--green)]"
            />
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <button onClick={importCsv} className="text-sm bg-[var(--green-dark)] text-white rounded-lg px-4 py-2 font-medium">Import rows</button>
              {importMsg && <span className="text-xs text-[var(--ink-2)]">{importMsg}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-4">
      <div className="text-[10px] text-[var(--muted)] mb-1">{label}</div>
      <div className="font-serif text-lg font-bold" style={{ color: accent }}>{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] text-[var(--muted)] block mb-1">{label}</label>
      {children}
    </div>
  );
}

function RangeSelector({ value, onChange }: { value: RangeView; onChange: (v: RangeView) => void }) {
  return (
    <div className="flex flex-wrap gap-1 bg-[var(--surface-1)] rounded-lg p-1">
      {RANGE_VIEWS.map((v) => (
        <button
          key={v.key}
          onClick={() => onChange(v.key)}
          className={`text-xs rounded-md px-2.5 py-1 transition-colors ${
            value === v.key
              ? 'bg-[var(--surface-card)] text-[var(--ink)] font-medium shadow-sm'
              : 'text-[var(--muted)] hover:text-[var(--ink-2)]'
          }`}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}

function ChartCard({
  title,
  children,
  footer,
  badge,
}: {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-6 select-none">
      <div className="text-sm font-medium text-[var(--ink)] mb-4">{title}</div>
      <div className="h-64 relative">
        {children}
        {badge && <div className="absolute top-0 right-1 pointer-events-none">{badge}</div>}
      </div>
      {footer && (
        <div className="mt-4 pt-4 border-t border-[var(--border-default)]">{footer}</div>
      )}
    </div>
  );
}

// ── On-canvas change elements ────────────────────────────────────────────

interface Bubble {
  text: string;
  color: string;
}

// The shaded selection band drawn on a chart, with an optional delta label.
// Returned as a bare ReferenceArea element (not a component) so Recharts,
// which matches children by element type, actually renders it.
function selectionBand(band: Band | null, bubble: Bubble | null) {
  if (!band) return null;
  return (
    <ReferenceArea
      x1={band.start}
      x2={band.end}
      fill="var(--green)"
      fillOpacity={0.1}
      stroke="var(--green)"
      strokeOpacity={0.45}
      label={
        bubble
          ? { value: bubble.text, position: 'insideTop', fill: bubble.color, fontSize: 12 }
          : undefined
      }
    />
  );
}

// Always-on corner badge: headline % change for a balance metric over the
// currently shown series.
function MetricBadge({
  points,
  metricKey,
  label,
  good,
}: {
  points: SeriesPoint[];
  metricKey: NumericKey;
  label: string;
  good: boolean;
}) {
  if (points.length < 2) return null;
  const s = metricStat(points, metricKey);
  if (s.deltaPct === null) return null;
  const up = s.deltaAbs > 0;
  const favourable = s.deltaAbs === 0 ? true : up === good;
  const color = s.deltaAbs === 0 ? 'var(--muted)' : favourable ? 'var(--green-dark)' : 'var(--red-2)';
  return (
    <div
      className="flex items-center gap-1 text-[11px] font-semibold rounded-full px-2 py-0.5 border"
      style={{ color, borderColor: color, background: 'var(--surface-card)' }}
    >
      <span className="text-[9px] font-normal text-[var(--muted)]">{label}</span>
      {s.deltaAbs === 0 ? '—' : `${up ? '▲' : '▼'} ${signedPct(s.deltaPct)}`}
    </div>
  );
}

// Always-on corner badge for the cash-flow chart: savings rate over the view.
function SavingsBadge({ points }: { points: SeriesPoint[] }) {
  if (points.length === 0) return null;
  const inc = metricStat(points, 'income');
  const exp = metricStat(points, 'expenses');
  if (inc.total <= 0) return null;
  const rate = ((inc.total - exp.total) / inc.total) * 100;
  const color = rate >= 0 ? 'var(--green-dark)' : 'var(--red-2)';
  return (
    <div
      className="flex items-center gap-1 text-[11px] font-semibold rounded-full px-2 py-0.5 border"
      style={{ color, borderColor: color, background: 'var(--surface-card)' }}
    >
      <span className="text-[9px] font-normal text-[var(--muted)]">Savings rate</span>
      {Math.round(rate)}%
    </div>
  );
}

// ── Statistical analysis UI ──────────────────────────────────────────────

function signedPct(pct: number): string {
  return `${pct >= 0 ? '+' : '−'}${Math.abs(pct).toFixed(1)}%`;
}

// A nominal (SAR) + percentage delta, coloured by whether the move is good.
// `good` says which direction is favourable (up for net worth, down for debt).
function DeltaText({ abs, pct, good }: { abs: number; pct: number | null; good: boolean }) {
  if (abs === 0) {
    return <div className="text-[11px] text-[var(--muted)]">No change</div>;
  }
  const up = abs > 0;
  const favourable = up === good;
  const color = favourable ? 'var(--green-dark)' : 'var(--red-2)';
  return (
    <div className="text-[11px] font-medium" style={{ color }}>
      {up ? '▲' : '▼'} SAR {fmt(Math.abs(abs))}
      {pct !== null && <span className="opacity-80"> ({signedPct(pct)})</span>}
    </div>
  );
}

function StatPill({
  label,
  value,
  valueColor,
  sub,
  delta,
}: {
  label: string;
  value: string;
  valueColor?: string;
  sub?: string;
  delta?: { abs: number; pct: number | null; good: boolean };
}) {
  return (
    <div>
      <div className="text-[10px] text-[var(--muted)] mb-0.5">{label}</div>
      <div className="text-sm font-semibold" style={{ color: valueColor ?? 'var(--ink)' }}>
        {value}
      </div>
      {delta && <div className="mt-0.5"><DeltaText {...delta} /></div>}
      {sub && <div className="text-[10px] text-[var(--muted)] mt-0.5">{sub}</div>}
    </div>
  );
}

// Latest value + change across the visible view, for a set of balance metrics.
function SeriesStats({
  points,
  metrics,
}: {
  points: SeriesPoint[];
  metrics: { key: NumericKey; label: string; good: boolean }[];
}) {
  if (points.length === 0) return null;
  const hasDelta = points.length >= 2;
  const firstLabel = points[0].label;
  const lastLabel = points[points.length - 1].label;

  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--muted)] mb-2">
        {hasDelta ? `Change · ${firstLabel} → ${lastLabel}` : `As of ${lastLabel}`}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
        {metrics.map((m) => {
          const s = metricStat(points, m.key);
          return (
            <StatPill
              key={m.key}
              label={m.label}
              value={`SAR ${fmt(s.last)}`}
              delta={hasDelta ? { abs: s.deltaAbs, pct: s.deltaPct, good: m.good } : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}

// Cash-flow summary: totals, net saved and savings rate over the visible view.
function CashflowStats({ points }: { points: SeriesPoint[] }) {
  if (points.length === 0) return null;
  const inc = metricStat(points, 'income');
  const exp = metricStat(points, 'expenses');
  const netSaved = inc.total - exp.total;
  const rate = inc.total > 0 ? (netSaved / inc.total) * 100 : null;
  const per = points.length > 1 ? 'period' : 'month';
  const firstLabel = points[0].label;
  const lastLabel = points[points.length - 1].label;

  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--muted)] mb-2">
        Cash flow · {firstLabel} → {lastLabel}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
        <StatPill
          label="Total income"
          value={`SAR ${fmt(inc.total)}`}
          sub={`avg SAR ${fmt(inc.avg)}/${per}`}
        />
        <StatPill
          label="Total expenses"
          value={`SAR ${fmt(exp.total)}`}
          sub={`avg SAR ${fmt(exp.avg)}/${per}`}
        />
        <StatPill
          label="Net saved"
          value={`SAR ${fmt(netSaved)}`}
          valueColor={netSaved >= 0 ? 'var(--green-dark)' : 'var(--red-2)'}
        />
        <StatPill
          label="Savings rate"
          value={rate !== null ? `${Math.round(rate)}%` : '—'}
          valueColor={rate !== null && rate >= 0 ? 'var(--green-dark)' : 'var(--red-2)'}
        />
      </div>
    </div>
  );
}
