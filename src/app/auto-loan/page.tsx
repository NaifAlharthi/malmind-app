'use client';

// Auto loan — the depreciating purchase, priced honestly. Wired to the
// Log's income and staged:
//   D1 · the payment and its bite of income (≤10% healthy)
//   D2 · the true cost — financing + depreciation together
//   D3 · finance vs cash — what the difference becomes invested
//   D4 · the 20/4/10 rule, checked against YOUR numbers

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import ToolStage from '@/components/shared/ToolStage';

interface Snap { year: number; month: number; income: number; expenses: number; cash: number }
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
const KEY = 'mm-autoloan';

export default function AutoLoanPage() {
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const [snaps, setSnaps] = useState<Snap[] | null>(null);
  const [price, setPrice] = useState(120000);
  const [downPct, setDownPct] = useState(20);
  const [ratePct, setRatePct] = useState(6);
  const [years, setYears] = useState(4);

  useEffect(() => {
    try { const raw = window.localStorage.getItem(KEY); if (raw) { const p = JSON.parse(raw); if (p.price) setPrice(p.price); if (p.downPct != null) setDownPct(p.downPct); if (p.ratePct != null) setRatePct(p.ratePct); if (p.years) setYears(p.years); } } catch { /* ignore */ }
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSnaps([]); return; }
      const { data } = await supabase.from('financial_snapshots').select('year, month, income, expenses, cash').eq('user_id', user.id)
        .order('year', { ascending: true }).order('month', { ascending: true });
      setSnaps((data as Snap[]) ?? []);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { try { window.localStorage.setItem(KEY, JSON.stringify({ price, downPct, ratePct, years })); } catch { /* ignore */ } }, [price, downPct, ratePct, years]);

  const me = useMemo(() => {
    if (!snaps || snaps.length === 0) return null;
    const recent = snaps.slice(-6);
    return {
      avgIncome: recent.reduce((a, s) => a + Number(s.income), 0) / recent.length,
      cash: Number(snaps[snaps.length - 1].cash),
    };
  }, [snaps]);

  const d = useMemo(() => {
    const down = (price * downPct) / 100;
    const principal = price - down;
    const r = ratePct / 100 / 12;
    const n = years * 12;
    const pay = principal > 0 ? (r > 0 ? (principal * r) / (1 - Math.pow(1 + r, -n)) : principal / n) : 0;
    const totalFinancing = pay * n + down - price;
    const value5y = price * 0.45; // a car keeps roughly 45% after five years
    const trueCost = totalFinancing + (price - value5y);
    // finance vs cash: invest the freed cash (price - down… actually the payment stream) at 7%
    const ir = 0.07 / 12;
    const investedPayments = pay * ((Math.pow(1 + ir, n) - 1) / ir);
    return { down, principal, pay, totalFinancing, value5y, trueCost, investedPayments };
  }, [price, downPct, ratePct, years]);

  if (snaps === null) return <div className="text-sm text-[var(--muted)]">…</div>;
  const bite = me && me.avgIncome > 0 ? (d.pay / me.avgIncome) * 100 : null;
  const biteTone = bite === null ? 'var(--muted)' : bite <= 10 ? 'var(--green-dark)' : bite <= 15 ? '#E0922A' : '#D64545';
  const rule = me ? { down: downPct >= 20, term: years <= 4, bite: bite !== null && bite <= 10 } : null;

  const lever = (label: string, val: number, min: number, max: number, step: number, set: (n: number) => void, show: string) => (
    <label className="block">
      <span className="flex justify-between text-[10px] font-semibold text-[var(--muted)] mb-1"><span>{label}</span><span className="text-[var(--ink)]" dir="ltr">{show}</span></span>
      <input type="range" min={min} max={max} step={step} value={val} onChange={(e) => set(Number(e.target.value))} className="w-full accent-[var(--green)]" dir="ltr" />
    </label>
  );

  return (
    <div className="max-w-3xl">
      <div className="text-[10px] tracking-[0.12em] uppercase text-[var(--gold)] mb-1">🔭 {L('المستقبل', 'The Future')}</div>
      <h1 className="font-serif text-3xl font-semibold text-[var(--ink)] mb-1">🚗 {L('قرض السيارة', 'Auto loan')}</h1>
      <p className="text-sm text-[var(--ink-2)] mb-6 max-w-2xl">{L('شراء يفقد قيمته — مسعّراً بصدق وبدخلك أنت.', 'A purchase that loses value — priced honestly, against your income.')}</p>

      {/* D1 */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4 mb-4">
          {lever(L('سعر السيارة', 'Car price'), price, 40000, 500000, 5000, setPrice, fmt(price))}
          {lever(L('الدفعة الأولى ٪', 'Down %'), downPct, 0, 50, 5, setDownPct, `${downPct}% = ${fmt(d.down)}`)}
          {lever(L('المعدل ٪', 'Rate %'), ratePct, 2, 12, 0.5, setRatePct, `${ratePct}%`)}
          {lever(L('السنوات', 'Years'), years, 1, 7, 1, setYears, String(years))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[var(--surface-1)] border border-[var(--border-faint)] rounded-xl px-3 py-2.5">
            <div className="text-[9px] text-[var(--muted)]">{L('القسط الشهري', 'Monthly payment')}</div>
            <div className="text-sm font-bold text-[var(--ink)]" dir="ltr">{fmt(d.pay)}</div>
          </div>
          <div className="bg-[var(--surface-1)] border border-[var(--border-faint)] rounded-xl px-3 py-2.5">
            <div className="text-[9px] text-[var(--muted)]">{L('من دخلك', 'Of your income')}</div>
            <div className="text-sm font-bold" style={{ color: biteTone }} dir="ltr">{bite === null ? '—' : `${bite.toFixed(1)}%`}</div>
          </div>
        </div>
        {bite !== null && (
          <div className="text-[10px] text-[var(--muted)] mt-2">
            {bite <= 10 ? L('ضمن العتبة الصحية (≤١٠٪ من الدخل) ✓', 'Within the healthy line (≤10% of income) ✓') : L('فوق العتبة الصحية (١٠٪) — سيارة أصغر أو دفعة أكبر', 'Above the healthy 10% line — smaller car, or bigger down payment')}
          </div>
        )}
      </div>

      {/* D2 · the true cost */}
      <ToolStage level={2} title={L('التكلفة الحقيقية', 'The true cost')}>
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
        <div className="grid grid-cols-3 gap-2 mb-2">
          {([
            [L('كلفة التمويل', 'Financing cost'), fmt(d.totalFinancing), '#E0922A'],
            [L('قيمتها بعد ٥ سنوات ≈', 'Worth after 5y ≈'), fmt(d.value5y), 'var(--muted)'],
            [L('الكلفة الحقيقية ≈', 'True cost ≈'), fmt(d.trueCost), '#D64545'],
          ] as [string, string, string][]).map(([name, val, color]) => (
            <div key={name} className="bg-[var(--surface-1)] border border-[var(--border-faint)] rounded-xl px-3 py-2.5">
              <div className="text-[9px] text-[var(--muted)]">{name}</div>
              <div className="text-sm font-bold" style={{ color }} dir="ltr">{val}</div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[var(--muted)] leading-relaxed">{L('الكلفة الحقيقية = التمويل + ما تفقده السيارة من قيمتها — الرقم الذي لا يُذكر في المعرض.', "True cost = financing + what the car itself sheds — the number the showroom never says.")}</p>
      </div>
      </ToolStage>

      {/* D3 · finance vs cash */}
      <ToolStage level={3} title={L('تمويل أم نقد؟', 'Finance or cash?')}>
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
        <p className="text-xs text-[var(--ink-2)] leading-relaxed">
          {me && me.cash >= price
            ? L(
                `نقدك (${fmt(me.cash)}) يغطي الشراء نقداً — لكن قسط الـ${fmt(d.pay)} نفسه مستثمَراً بعائد ٧٪ طوال المدة يصبح ${fmt(d.investedPayments)}. إن كان عائدك المتوقع أعلى من معدل التمويل، التمويلُ مع استثمار الفارق قد يغلب.`,
                `Your cash (${fmt(me.cash)}) covers buying outright — but the ${fmt(d.pay)} payment itself invested at 7% over the term becomes ${fmt(d.investedPayments)}. If your expected return beats the loan rate, financing while investing the difference can win.`
              )
            : L(
                `نقدك الحالي لا يغطي الشراء نقداً، فالمقارنة محسومة عملياً للتمويل — والسؤال الحقيقي: هل القسط ضمن العتبة الصحية أعلاه؟`,
                `Your current cash doesn't cover buying outright, so financing decides itself — the real question is whether the payment sits under the healthy line above.`
              )}
        </p>
      </div>
      </ToolStage>

      {/* D4 · the 20/4/10 rule */}
      <ToolStage level={4} title={L('قاعدة 20/4/10', 'The 20/4/10 rule')}>
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
        <div className="flex flex-col gap-1.5">
          {rule && ([
            [rule.down, L(`٢٠٪ دفعة أولى على الأقل — أنت على ${downPct}٪`, `20% down at least — you're at ${downPct}%`)],
            [rule.term, L(`٤ سنوات كحد أقصى — أنت على ${years}`, `4 years max — you're at ${years}`)],
            [rule.bite, L(`≤١٠٪ من الدخل للقسط — أنت على ${bite === null ? '—' : bite.toFixed(1) + '٪'}`, `≤10% of income on the payment — you're at ${bite === null ? '—' : bite.toFixed(1) + '%'}`)],
          ] as [boolean, string][]).map(([ok, line]) => (
            <div key={line} className="flex items-center gap-2 text-[11px] text-[var(--ink-2)]">
              <span className={ok ? 'text-[var(--green-dark)]' : 'text-[#D64545]'}>{ok ? '✓' : '✗'}</span>{line}
            </div>
          ))}
        </div>
      </div>
      </ToolStage>

      <Link href="/compare" className="block w-full text-center text-sm font-semibold bg-[var(--green-dark)] text-white rounded-xl px-4 py-3">
        ⚖️ {L('قارنها بقرارات كبرى أخرى ←', 'Weigh it against other big decisions →')}
      </Link>
    </div>
  );
}
