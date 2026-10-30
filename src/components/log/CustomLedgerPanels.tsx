'use client';

// The two drawer panels behind user-created ledgers:
//   AddLedgerPicker    — the ＋ tile's contents: predefined Saudi-life
//                        ledgers in one tap, or a custom one (name, icon,
//                        balance vs flow, in vs out)
//   CustomLedgerPanel  — one ledger's record: headline, its line over
//                        time, an add-a-month row, and the entries list

import { useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { PRESETS, CUSTOM_ICONS, ledgerHeadline, type CustomLedger, type Preset } from '@/lib/customLedgers';

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
const thisMonth = () => new Date().toISOString().slice(0, 7);
const monthLabel = (m: string, ar: boolean) => `${(ar ? MONTHS_AR : MONTHS_EN)[Number(m.slice(5, 7)) - 1]} ${m.slice(2, 4)}`;

export function AddLedgerPicker({
  ar, existing, onCreate,
}: {
  ar: boolean;
  existing: CustomLedger[];
  onCreate: (l: Omit<CustomLedger, 'id' | 'entries'>) => void;
}) {
  const L = (a: string, e: string) => (ar ? a : e);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(CUSTOM_ICONS[0]);
  const [kind, setKind] = useState<CustomLedger['kind']>('balance');
  const [direction, setDirection] = useState<'in' | 'out'>('out');
  const taken = new Set(existing.map((l) => l.preset).filter(Boolean));

  const pickPreset = (p: Preset) =>
    onCreate({ name: ar ? p.name.ar : p.name.en, icon: p.icon, kind: p.kind, direction: p.direction, preset: p.key });

  const seg = (on: boolean) =>
    `px-3 py-1.5 text-[11px] font-medium ${on ? 'bg-[var(--ink)] text-[var(--surface-0)]' : 'text-[var(--ink-2)]'}`;

  return (
    <div>
      <div className="text-sm font-semibold text-[var(--ink)] mb-1">＋ {L('دفتر جديد', 'A new ledger')}</div>
      <p className="text-[11px] text-[var(--muted)] leading-relaxed mb-3">
        {L('اختر مجالاً جاهزاً بنقرة، أو أنشئ دفترك الخاص لأي جانب من حياتك المالية.', 'Pick a ready-made area in one tap, or create your own for any corner of your financial life.')}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
        {PRESETS.map((p) => {
          const used = taken.has(p.key);
          return (
            <button
              key={p.key}
              onClick={() => !used && pickPreset(p)}
              disabled={used}
              className="text-start rounded-xl border border-[var(--border-faint)] bg-[var(--surface-1)] px-3 py-2.5 hover:border-[var(--green)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <div className="text-lg leading-none mb-1">{p.icon}</div>
              <div className="text-[11px] font-semibold text-[var(--ink)] leading-tight">{ar ? p.name.ar : p.name.en}</div>
              <div className="text-[9px] text-[var(--muted)] mt-0.5">
                {used ? L('مضاف ✓', 'added ✓') : `${p.kind === 'balance' ? L('قيمة', 'value') : p.direction === 'in' ? L('دخل', 'in') : L('صرف', 'out')} · ${ar ? p.hint.ar : p.hint.en}`}
              </div>
            </button>
          );
        })}
      </div>

      {/* or one of your own */}
      <div className="rounded-xl border border-dashed border-[var(--border-default)] p-3">
        <div className="text-[11px] font-semibold text-[var(--ink)] mb-2">✨ {L('أو دفترك الخاص', 'Or your own')}</div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={L('اسم الدفتر — مثلاً: مزرعة العائلة', "Ledger name — e.g. the family farm")}
            className="flex-1 min-w-[180px] bg-[var(--surface-0)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 text-[12px] outline-none focus:border-[var(--green)]"
          />
          <div className="inline-flex border border-[var(--border-default)] rounded-lg overflow-hidden">
            <button onClick={() => setKind('balance')} className={seg(kind === 'balance')}>{L('قيمة تتغيّر', 'A value')}</button>
            <button onClick={() => setKind('flow')} className={seg(kind === 'flow')}>{L('مبالغ شهرية', 'Monthly amounts')}</button>
          </div>
          {kind === 'flow' && (
            <div className="inline-flex border border-[var(--border-default)] rounded-lg overflow-hidden">
              <button onClick={() => setDirection('in')} className={seg(direction === 'in')}>{L('تدخل', 'In')}</button>
              <button onClick={() => setDirection('out')} className={seg(direction === 'out')}>{L('تخرج', 'Out')}</button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1 mb-3">
          {CUSTOM_ICONS.map((ic) => (
            <button
              key={ic}
              onClick={() => setIcon(ic)}
              className={`w-8 h-8 rounded-lg text-base cursor-pointer ${icon === ic ? 'bg-[var(--green-bg)] ring-1 ring-[var(--green)]' : 'hover:bg-[var(--surface-1)]'}`}
            >
              {ic}
            </button>
          ))}
        </div>
        <button
          onClick={() => { if (name.trim()) onCreate({ name: name.trim(), icon, kind, direction: kind === 'flow' ? direction : null, preset: null }); }}
          disabled={!name.trim()}
          className="text-[11px] font-semibold text-white bg-[var(--green-dark)] rounded-lg px-4 py-2 disabled:opacity-40 cursor-pointer"
        >
          {L('أنشئ الدفتر', 'Create the ledger')}
        </button>
      </div>
    </div>
  );
}

export function CustomLedgerPanel({
  ar, ledger, onChange, onDelete,
}: {
  ar: boolean;
  ledger: CustomLedger;
  onChange: (l: CustomLedger) => void;
  onDelete: () => void;
}) {
  const L = (a: string, e: string) => (ar ? a : e);
  const [month, setMonth] = useState(thisMonth());
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const sorted = [...ledger.entries].sort((a, b) => a.month.localeCompare(b.month));
  const head = ledgerHeadline(ledger);
  const series = sorted.slice(-12).map((e) => ({ label: monthLabel(e.month, ar), value: e.amount }));
  const color = ledger.kind === 'balance' ? '#17B8C9' : ledger.direction === 'in' ? '#1D9E75' : '#D64545';
  const avg = ledger.kind === 'flow' && sorted.length
    ? sorted.slice(-6).reduce((a, e) => a + e.amount, 0) / Math.min(6, sorted.length)
    : null;

  const add = () => {
    const v = Number(amount.replace(/[^\d.-]/g, ''));
    if (!/^\d{4}-\d{2}$/.test(month) || !Number.isFinite(v) || amount.trim() === '') return;
    const entries = ledger.entries.filter((e) => e.month !== month);
    entries.push({ month, amount: v, ...(note.trim() ? { note: note.trim() } : {}) });
    onChange({ ...ledger, entries });
    setAmount('');
    setNote('');
  };

  const axisTick = { fontSize: 9, fill: 'var(--muted)' };
  const tip = { background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 11 };

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 flex-wrap mb-1">
        <div className="font-serif text-lg font-semibold text-[var(--ink)]">{ledger.icon} {ledger.name}</div>
        <button
          onClick={() => { if (window.confirm(L(`حذف دفتر «${ledger.name}» وكل قيوده؟`, `Delete the «${ledger.name}» ledger and all its entries?`))) onDelete(); }}
          className="text-[10px] text-[var(--muted)] hover:text-[var(--red-2)] cursor-pointer"
        >
          {L('حذف الدفتر', 'Delete ledger')}
        </button>
      </div>
      <p className="text-[11px] text-[var(--muted)] mb-3">
        {ledger.kind === 'balance'
          ? L('قيمة تُحدّثها بين وقت وآخر — سجّل ما تساويه في كل شهر تراجعها فيه.', 'A value you re-state over time — log what it is worth whenever you check.')
          : ledger.direction === 'in'
            ? L('مبالغ تدخل شهرياً — سجّل كل شهر ما وصلك.', 'Money coming in — log what arrived each month.')
            : L('مبالغ تخرج شهرياً — سجّل كل شهر ما صُرف.', 'Money going out — log what left each month.')}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
        <div className="bg-[var(--surface-1)] border border-[var(--border-faint)] rounded-xl px-3 py-2.5">
          <div className="text-[9px] text-[var(--muted)]">{head.label === 'latest' ? L('آخر قيمة', 'Latest value') : L(`مجموع ${new Date().getFullYear()}`, `${new Date().getFullYear()} so far`)}</div>
          <div className="text-sm font-bold" style={{ color }} dir="ltr">{head.value === null ? '—' : fmt(head.value)}</div>
        </div>
        {avg !== null && (
          <div className="bg-[var(--surface-1)] border border-[var(--border-faint)] rounded-xl px-3 py-2.5">
            <div className="text-[9px] text-[var(--muted)]">{L('متوسط آخر ٦ أشهر', '6-mo average')}</div>
            <div className="text-sm font-bold text-[var(--ink)]" dir="ltr">{fmt(avg)}</div>
          </div>
        )}
        <div className="bg-[var(--surface-1)] border border-[var(--border-faint)] rounded-xl px-3 py-2.5">
          <div className="text-[9px] text-[var(--muted)]">{L('أشهر مسجّلة', 'Months logged')}</div>
          <div className="text-sm font-bold text-[var(--ink)]" dir="ltr">{sorted.length}</div>
        </div>
      </div>

      {series.length >= 2 && (
        <div className="h-36 mb-3" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            {ledger.kind === 'balance' ? (
              <LineChart data={series} margin={{ top: 4, right: 6, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border-faint)" />
                <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} reversed={ar} interval="preserveStartEnd" />
                <YAxis tick={axisTick} width={44} axisLine={false} tickLine={false} orientation={ar ? 'right' : 'left'} tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                <Tooltip contentStyle={tip} formatter={(v) => fmt(Number(v))} />
                <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 2.5 }} isAnimationActive={false} />
              </LineChart>
            ) : (
              <BarChart data={series} margin={{ top: 4, right: 6, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border-faint)" />
                <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} reversed={ar} interval="preserveStartEnd" />
                <YAxis tick={axisTick} width={44} axisLine={false} tickLine={false} orientation={ar ? 'right' : 'left'} tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                <Tooltip contentStyle={tip} formatter={(v) => fmt(Number(v))} />
                <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {/* log a month */}
      <div className="flex flex-wrap items-center gap-2 mb-3 rounded-xl border border-[var(--border-faint)] bg-[var(--surface-1)]/60 p-2.5">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          dir="ltr"
          className="bg-[var(--surface-0)] border border-[var(--border-default)] rounded-lg px-2 py-1.5 text-[11px] outline-none focus:border-[var(--green)] [color-scheme:dark]"
        />
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder={ledger.kind === 'balance' ? L('القيمة', 'Value') : L('المبلغ', 'Amount')}
          inputMode="decimal"
          dir="ltr"
          className="w-28 bg-[var(--surface-0)] border border-[var(--border-default)] rounded-lg px-2 py-1.5 text-[11px] outline-none focus:border-[var(--green)]"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder={L('ملاحظة (اختياري)', 'Note (optional)')}
          className="flex-1 min-w-[120px] bg-[var(--surface-0)] border border-[var(--border-default)] rounded-lg px-2 py-1.5 text-[11px] outline-none focus:border-[var(--green)]"
        />
        <button onClick={add} className="text-[11px] font-semibold text-white bg-[var(--green-dark)] rounded-lg px-3 py-1.5 cursor-pointer">
          {L('سجّل', 'Log it')}
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="text-[11px] text-[var(--muted)]">{L('لا قيود بعد — سجّل أول شهر أعلاه.', 'No entries yet — log your first month above.')}</p>
      ) : (
        <div className="flex flex-col divide-y divide-[var(--border-faint)] max-h-56 overflow-y-auto">
          {[...sorted].reverse().map((e) => (
            <div key={e.month} className="flex items-center gap-3 py-1.5 text-[11px]">
              <span className="w-16 text-[var(--muted)] shrink-0" dir="ltr">{monthLabel(e.month, ar)}</span>
              <span className="font-semibold text-[var(--ink)] shrink-0" dir="ltr">{fmt(e.amount)}</span>
              <span className="flex-1 min-w-0 truncate text-[var(--muted)]">{e.note ?? ''}</span>
              <button
                onClick={() => onChange({ ...ledger, entries: ledger.entries.filter((x) => x.month !== e.month) })}
                className="text-[10px] text-[var(--muted)] hover:text-[var(--red-2)] px-1 cursor-pointer"
                aria-label={L('احذف القيد', 'Delete entry')}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
