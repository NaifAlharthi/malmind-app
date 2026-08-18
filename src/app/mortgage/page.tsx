'use client';

// Mortgage — the biggest decision most people ever price. Wired to the
// Log (income, deployable cash) and staged:
//   D1 · the payment and the honest affordability verdict (DSR)
//   D2 · the amortization arc — balance, totals, interest share
//   D3 · the scenario grid — terms and rates side by side
//   D4 · the early-payoff engine + the Saudi doors (Sakani/REDF)

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import ToolStage from '@/components/shared/ToolStage';

interface Snap { year: number; month: number; cash: number; income: number; expenses: number }

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
const fmtCompact = (n: number) => (Math.abs(n) >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n)));
const MTG_KEY = 'mm-mortgage';

const payment = (principal: number, ratePct: number, years: number) => {
  const r = ratePct / 100 / 12;
  const n = years * 12;
  if (principal <= 0 || n <= 0) return 0;
  return r > 0 ? (principal * r) / (1 - Math.pow(1 + r, -n)) : principal / n;
};

export default function MortgagePage() {
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const [snaps, setSnaps] = useState<Snap[] | null>(null);
  const [price, setPrice] = useState(900000);
  const [downPct, setDownPct] = useState(10);
  const [ratePct, setRatePct] = useState(5.5);
  const [years, setYears] = useState(25);
  const [extra, setExtra] = useState(0);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(MTG_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p.price) setPrice(p.price);
        if (p.downPct != null) setDownPct(p.downPct);
        if (p.ratePct != null) setRatePct(p.ratePct);
        if (p.years) setYears(p.years);
      }
    } catch { /* ignore */ }
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSnaps([]); return; }
      const { data } = await supabase.from('financial_snapshots')
        .select('year, month, cash, income, expenses').eq('user_id', user.id)
        .order('year', { ascending: true }).order('month', { ascending: true });
      setSnaps((data as Snap[]) ?? []);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem(MTG_KEY, JSON.stringify({ price, downPct, ratePct, years })); } catch { /* ignore */ }
  }, [price, downPct, ratePct, years]);

  const me = useMemo(() => {
    if (!snaps || snaps.length === 0) return null;
    const recent = snaps.slice(-6);
    const avgIncome = recent.reduce((a, s) => a + Number(s.income), 0) / recent.length;
    const avgExpenses = recent.reduce((a, s) => a + Number(s.expenses), 0) / recent.length;
    const cash = Number(snaps[snaps.length - 1].cash);
    return { avgIncome, cash, deployable: Math.max(0, cash - avgExpenses * 6) };
  }, [snaps]);

  const d = useMemo(() => {
    const down = (price * downPct) / 100;
    const principal = price - down;
    const pay = payment(principal, ratePct, years);
    const totalPaid = pay * years * 12 + down;
    const totalInterest = totalPaid - price;
    // balance arc, yearly points; and the early-payoff variant
    const r = ratePct / 100 / 12;
    const arc: { y: number; balance: number }[] = [];
    let b = principal;
    for (let m = 1; m <= years * 12; m++) {
      b = b * (1 + r) - pay;
      if (m % 12 === 0) arc.push({ y: m / 12, balance: Math.max(0, Math.round(b)) });
    }
    let earlyMonths: number | null = null;
    let earlyInterest = 0;
    if (extra > 0 && principal > 0) {
      let eb = principal; earlyMonths = 0;
      while (eb > 0 && earlyMonths < years * 12) {
        const i = eb * r; earlyInterest += i;
        eb = eb + i - (pay + extra); earlyMonths++;
      }
    }
    const dsr = 0; // computed below with income
    return { down, principal, pay, totalPaid, totalInterest, arc, earlyMonths, earlyInterest, dsr };
  }, [price, downPct, ratePct, years, extra]);

  if (snaps === null) return <div className="text-sm text-[var(--muted)]">…</div>;

  const dsr = me && me.avgIncome > 0 ? (d.pay / me.avgIncome) * 100 : null;
  const dsrTone = dsr === null ? 'var(--muted)' : dsr <= 33 ? 'var(--green-dark)' : dsr <= 45 ? '#E0922A' : '#D64545';
  const downOk = me ? me.deployable >= d.down : null;

  const lever = (label: string, val: number, min: number, max: number, step: number, set: (n: number) => void, show: string) => (
    <label className="block">
      <span className="flex justify-between text-[10px] font-semibold text-[var(--muted)] mb-1">
        <span>{label}</span><span className="text-[var(--ink)]" dir="ltr">{show}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={val} onChange={(e) => set(Number(e.target.value))} className="w-full accent-[var(--green)]" dir="ltr" />
    </label>
  );

  return (
    <div className="max-w-3xl">
      <div className="text-[10px] tracking-[0.12em] uppercase text-[var(--gold)] mb-1">🔭 {L('المستقبل', 'The Future')}</div>
      <h1 className="font-serif text-3xl font-semibold text-[var(--ink)] mb-1">🏠 {L('الرهن العقاري', 'Mortgage')}</h1>
      <p className="text-sm text-[var(--ink-2)] mb-6 max-w-2xl">
        {L('أكبر قرار تموّله في حياتك — مُسعّراً بدخلك أنت.', 'The biggest purchase you will ever finance — priced against YOUR income.')}
      </p>

      {/* D1 · the payment + the verdict */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4 mb-4">
          {lever(L('سعر العقار', 'Home price'), price, 300000, 5000000, 50000, setPrice, fmt(price))}
          {lever(L('الدفعة الأولى ٪', 'Down payment %'), downPct, 5, 50, 5, setDownPct, `${downPct}% = ${fmt(d.down)}`)}
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {([
            [L('القسط الشهري', 'Monthly payment'), fmt(d.pay), 'var(--ink)'],
            [L('من دخلك (DSR)', 'Of your income (DSR)'), dsr === null ? '—' : `${Math.round(dsr)}%`, dsrTone],
            [L('التمويل المطلوب', 'Financed amount'), fmt(d.principal), 'var(--ink)'],
          ] as [string, string, string][]).map(([name, val, color]) => (
            <div key={name} className="bg-[var(--surface-1)] border border-[var(--border-faint)] rounded-xl px-3 py-2.5">
              <div className="text-[9px] text-[var(--muted)]">{name}</div>
              <div className="text-sm font-bold" style={{ color }} dir="ltr">{val}</div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-[var(--border-faint)] bg-[var(--surface-1)] px-3.5 py-2.5 text-[11px] text-[var(--ink-2)] leading-relaxed">
          {dsr === null
            ? <>{L('سجّل دخلك في ', 'Log your income in ')}<Link href="/log" className="text-[var(--green-dark)] font-semibold hover:underline">{L('السِّجل', 'the Log')}</Link>{L(' ليُحكم على القسط بدخلك.', ' and the payment gets judged against it.')}</>
            : dsr <= 33
              ? L(`قسط مريح — ${Math.round(dsr!)}٪ من دخلك، تحت عتبة الـ٣٣٪ الصحية. `, `A comfortable payment — ${Math.round(dsr!)}% of income, under the healthy 33% line. `)
              : dsr <= 45
                ? L(`قسط مشدود — ${Math.round(dsr!)}٪ من دخلك؛ فوق الصحي وتحت أقصى ما تسمح به الجهات عادة.`, `A tight payment — ${Math.round(dsr!)}% of income; above healthy, below typical regulatory ceilings.`)
                : L(`قسط خانق — ${Math.round(dsr!)}٪ من دخلك؛ خفّض السعر أو ارفع الدفعة الأولى.`, `A choking payment — ${Math.round(dsr!)}% of income; lower the price or raise the down payment.`)}
          {downOk !== null && (
            <> {downOk
              ? L(`ودفعتك الأولى (${fmt(d.down)}) ضمن نقدك القابل للاستخدام ✓`, `Your down payment (${fmt(d.down)}) fits your deployable cash ✓`)
              : L(`ودفعتك الأولى (${fmt(d.down)}) فوق نقدك القابل للاستخدام (${fmt(me!.deployable)}) ⚠️`, `Your down payment (${fmt(d.down)}) exceeds your deployable cash (${fmt(me!.deployable)}) ⚠️`)}</>
          )}
        </div>
      </div>

      {/* D2 · the arc */}
      <ToolStage level={2} title={L('قوس السداد', 'The amortization arc')}>
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
        <div className="grid grid-cols-2 gap-2 mb-3">
          {([
            [L('الإجمالي المدفوع', 'Total paid'), fmt(d.totalPaid)],
            [L('منه فوائد/أرباح', 'Of it, financing cost'), fmt(d.totalInterest)],
          ] as [string, string][]).map(([name, val]) => (
            <div key={name} className="bg-[var(--surface-1)] border border-[var(--border-faint)] rounded-xl px-3 py-2.5">
              <div className="text-[9px] text-[var(--muted)]">{name}</div>
              <div className="text-sm font-bold text-[var(--ink)]" dir="ltr">{val}</div>
            </div>
          ))}
        </div>
        <div className="h-40" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={d.arc} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border-faint)" />
              <XAxis dataKey="y" tick={{ fontSize: 9, fill: 'var(--muted)' }} interval="preserveStartEnd" reversed={ar} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: 'var(--muted)' }} tickFormatter={fmtCompact} width={50} orientation={ar ? 'right' : 'left'} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 11 }} formatter={(v) => fmt(Number(v))} labelFormatter={(y) => L(`السنة ${y}`, `Year ${y}`)} />
              <Line type="monotone" dataKey="balance" name={L('الرصيد المتبقي', 'Remaining balance')} stroke="#E0922A" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      </ToolStage>

      {/* D3 · the scenario grid */}
      <ToolStage level={3} title={L('شبكة السيناريوهات', 'The scenario grid')}>
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4 mb-4">
          {lever(L('معدل التمويل ٪', 'Rate %'), ratePct, 3, 9, 0.25, setRatePct, `${ratePct}%`)}
          {lever(L('سنوات التمويل', 'Term (years)'), years, 10, 30, 5, setYears, String(years))}
        </div>
        <div className="overflow-x-auto" dir="ltr">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-[var(--border-faint)]">
                <th className="p-2 text-[10px] text-[var(--muted)] font-semibold text-start">{L('المدة ↓ · المعدل ←', 'Term ↓ · Rate →')}</th>
                {[ratePct - 1, ratePct, ratePct + 1].map((r) => (
                  <th key={r} className="p-2 text-[10px] text-[var(--muted)] font-semibold text-end">{r.toFixed(2)}%</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[15, 20, 25, 30].map((yr) => (
                <tr key={yr} className="border-b border-[var(--border-faint)]/60">
                  <td className="p-2 font-semibold text-[var(--ink)]">{yr} {L('سنة', 'y')}</td>
                  {[ratePct - 1, ratePct, ratePct + 1].map((r) => {
                    const p = payment(d.principal, r, yr);
                    const hot = yr === years && Math.abs(r - ratePct) < 0.01;
                    return <td key={r} className={`p-2 text-end ${hot ? 'font-bold text-[var(--green-dark)]' : 'text-[var(--ink-2)]'}`}>{fmt(p)}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </ToolStage>

      {/* D4 · the early-payoff engine */}
      <ToolStage level={4} title={L('محرّك السداد المبكر', 'The early-payoff engine')}>
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
        {lever(L('دفعة إضافية شهرياً', 'Extra per month'), extra, 0, 10000, 250, setExtra, fmt(extra))}
        {extra > 0 && d.earlyMonths !== null && (
          <p className="text-xs text-[var(--ink-2)] leading-relaxed mt-3">
            ⚡ {L(
              `بإضافة ${fmt(extra)}/شهرياً ينتهي التمويل خلال ${Math.floor(d.earlyMonths / 12)} سنة و${d.earlyMonths % 12} شهراً بدلاً من ${years} سنة — وتوفّر نحو ${fmt(Math.max(0, d.totalInterest - d.earlyInterest))} من كلفة التمويل.`,
              `Adding ${fmt(extra)}/mo ends the financing in ${Math.floor(d.earlyMonths / 12)}y ${d.earlyMonths % 12}m instead of ${years}y — saving ~${fmt(Math.max(0, d.totalInterest - d.earlyInterest))} in financing cost.`
            )}
          </p>
        )}
        <p className="text-[10px] text-[var(--muted)] leading-relaxed mt-3">
          🇸🇦 {L(
            'الأبواب السعودية: برنامج «سكني» والدعم السكني (REDF) قد يغيّران المعادلة كلها — تحقق من أهليتك قبل التسعير التجاري.',
            'The Saudi doors: the Sakani program and REDF housing support can change the whole equation — check your eligibility before commercial pricing.'
          )}
        </p>
      </div>
      </ToolStage>

      <Link
        href="/advisor"
        className="block w-full text-center text-sm font-semibold bg-[var(--green-dark)] text-white rounded-xl px-4 py-3"
        onClick={() => { try { window.sessionStorage.setItem('mm-ask', `I'm pricing a mortgage: home ${price}, down ${downPct}%, rate ${ratePct}%, ${years} years → payment ${Math.round(d.pay)}. Given my income and cash, is this wise — and should I consider Sakani/REDF first?`); } catch { /* ignore */ } }}
      >
        🧠 {L('اعرضه على العقل ←', 'Put it to the Brain →')}
      </Link>
    </div>
  );
}
