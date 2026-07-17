'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ComposedChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import GoogleSheetSync from './GoogleSheetSync';
import {
  buildSeries, metricStat, RANGE_VIEWS, DEFAULT_RANGE_VIEW,
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

  const chartData = useMemo(() => buildSeries(rows, view), [rows, view]);

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

          {/* net worth / assets / liabilities */}
          <ChartCard
            title="Net worth, assets & liabilities over time"
            footer={
              <SeriesStats
                points={chartData}
                metrics={[
                  { key: 'netWorth', label: 'Net worth', good: true },
                  { key: 'assets', label: 'Total assets', good: true },
                  { key: 'liabilities', label: 'Liabilities', good: false },
                ]}
              />
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid stroke="var(--border-default)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} tickFormatter={fmtCompact} />
                <Tooltip formatter={(v) => `SAR ${fmt(Number(v))}`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="assets" name="Assets" stroke="#E0559E" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="liabilities" name="Liabilities" stroke="#17B8C9" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="netWorth" name="Net worth" stroke="#1D9E75" strokeWidth={3} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* asset composition */}
          <ChartCard
            title="Asset composition over time"
            footer={
              <SeriesStats
                points={chartData}
                metrics={ASSET_METRICS.map((m) => ({ key: m.key as NumericKey, label: m.label, good: true }))}
              />
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid stroke="var(--border-default)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} tickFormatter={fmtCompact} />
                <Tooltip formatter={(v) => `SAR ${fmt(Number(v))}`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {ASSET_METRICS.map((m) => (
                  <Bar key={m.key} dataKey={m.key} name={m.label} stackId="a" fill={m.color} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* income vs expenses */}
          <ChartCard title="Income vs expenses" footer={<CashflowStats points={chartData} />}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid stroke="var(--border-default)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} tickFormatter={fmtCompact} />
                <Tooltip formatter={(v) => `SAR ${fmt(Number(v))}`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="income" name="Income" fill="#1D9E75" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#E0922A" radius={[3, 3, 0, 0]} />
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
}: {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-6">
      <div className="text-sm font-medium text-[var(--ink)] mb-4">{title}</div>
      <div className="h-64">{children}</div>
      {footer && (
        <div className="mt-4 pt-4 border-t border-[var(--border-default)]">{footer}</div>
      )}
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
