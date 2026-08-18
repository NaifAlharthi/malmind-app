'use client';

// Credit cards — the sharpest debt, watched closely. Reads the card
// book (managed in Commitments) and stages:
//   D1 · total card debt, total limits, utilization verdict (<30%)
//   D2 · every card's utilization bar
//   D3 · the payoff plan — months to clear at a chosen pace
//   D4 · the interest engine: APR lever and what carrying costs

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import ToolStage from '@/components/shared/ToolStage';

interface Card { name: string; balance: number; credit_limit: number; min_payment: number }

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

export default function CreditCardsPage() {
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const [cards, setCards] = useState<Card[] | null>(null);
  const [payPace, setPayPace] = useState(0);
  const [aprPct, setAprPct] = useState(24);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setCards([]); return; }
      const { data } = await supabase.from('credit_cards').select('name, balance, credit_limit, min_payment').eq('user_id', user.id);
      const rows = ((data as Card[]) ?? []).map((c) => ({
        name: c.name, balance: Number(c.balance) || 0, credit_limit: Number(c.credit_limit) || 0, min_payment: Number(c.min_payment) || 0,
      }));
      setCards(rows);
      const minSum = rows.reduce((a, c) => a + c.min_payment, 0);
      setPayPace(Math.max(500, Math.round(minSum * 2)));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const d = useMemo(() => {
    if (!cards) return null;
    const totalBalance = cards.reduce((a, c) => a + c.balance, 0);
    const totalLimit = cards.reduce((a, c) => a + c.credit_limit, 0);
    const minSum = cards.reduce((a, c) => a + c.min_payment, 0);
    const util = totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0;
    // months to clear at the chosen pace, interest compounding monthly
    const r = aprPct / 100 / 12;
    let months: number | null = null;
    let interestPaid = 0;
    if (totalBalance > 0 && payPace > totalBalance * r) {
      let b = totalBalance;
      months = 0;
      while (b > 0 && months < 600) {
        const interest = b * r;
        interestPaid += interest;
        b = b + interest - payPace;
        months++;
      }
    }
    return { totalBalance, totalLimit, minSum, util, months, interestPaid };
  }, [cards, payPace, aprPct]);

  if (cards === null || !d) return <div className="text-sm text-[var(--muted)]">…</div>;

  const utilTone = d.util <= 30 ? 'var(--green-dark)' : d.util <= 60 ? '#E0922A' : '#D64545';

  return (
    <div className="max-w-3xl">
      <div className="text-[10px] tracking-[0.12em] uppercase text-[var(--gold)] mb-1">☀ {L('اليوم', 'Today')}</div>
      <h1 className="font-serif text-3xl font-semibold text-[var(--ink)] mb-1">💳 {L('بطاقاتك الائتمانية', 'Credit cards')}</h1>
      <p className="text-sm text-[var(--ink-2)] mb-6 max-w-2xl">
        {L('أحدّ أنواع الدين — استخدامك ونسبته وخطة صفرِه.', 'The sharpest kind of debt — your utilization, its verdict, and the road to zero.')}
      </p>

      {cards.length === 0 ? (
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6">
          <p className="text-[12px] text-[var(--muted)] mb-3">{L('أضف بطاقاتك في «الالتزامات» — أرصدتها وحدودها.', 'Add your cards in Commitments — balances and limits.')}</p>
          <Link href="/commitments" className="text-xs font-semibold text-white bg-[var(--green-dark)] rounded-lg px-4 py-2 inline-block">{L('أضف بطاقة ←', 'Add a card →')}</Link>
        </div>
      ) : (
        <>
          {/* D1 · the verdict */}
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
            <div className="grid grid-cols-3 gap-2 mb-3">
              {([
                [L('إجمالي الأرصدة', 'Total balances'), fmt(d.totalBalance), '#D64545'],
                [L('إجمالي الحدود', 'Total limits'), fmt(d.totalLimit), 'var(--ink)'],
                [L('نسبة الاستخدام', 'Utilization'), `${Math.round(d.util)}%`, utilTone],
              ] as [string, string, string][]).map(([name, val, color]) => (
                <div key={name} className="bg-[var(--surface-1)] border border-[var(--border-faint)] rounded-xl px-3 py-2.5">
                  <div className="text-[9px] text-[var(--muted)]">{name}</div>
                  <div className="text-sm font-bold" style={{ color }} dir="ltr">{val}</div>
                </div>
              ))}
            </div>
            <div className="h-2 rounded-full bg-[var(--border-faint)] overflow-hidden" dir="ltr">
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, d.util)}%`, background: utilTone }} />
            </div>
            <div className="text-[10px] text-[var(--muted)] mt-1.5">
              {d.util <= 30
                ? L('تحت ٣٠٪ — النطاق الذي تحبه درجتك الائتمانية ✓', 'Under 30% — the range your credit score loves ✓')
                : L('فوق ٣٠٪ — النزول تحتها يحسّن درجتك الائتمانية', 'Above 30% — dropping under it lifts your credit score')}
            </div>
          </div>

          {/* D2 · every card */}
          <ToolStage level={2} title={L('بطاقة بطاقة', 'Card by card')}>
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
            <div className="flex flex-col gap-3">
              {cards.map((c) => {
                const u = c.credit_limit > 0 ? (c.balance / c.credit_limit) * 100 : 0;
                const tone = u <= 30 ? 'var(--green-dark)' : u <= 60 ? '#E0922A' : '#D64545';
                return (
                  <div key={c.name}>
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <span className="text-[11px] font-semibold text-[var(--ink)]">{c.name}</span>
                      <span className="text-[10px] text-[var(--ink-2)]" dir="ltr">{fmt(c.balance)} / {fmt(c.credit_limit)} · <span style={{ color: tone }}>{Math.round(u)}%</span></span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--border-faint)] overflow-hidden" dir="ltr">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, u)}%`, background: tone }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          </ToolStage>

          {/* D3 · the payoff plan */}
          <ToolStage level={3} title={L('خطة الصفر', 'The road to zero')}>
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
            <label className="block mb-3">
              <span className="flex justify-between text-[10px] font-semibold text-[var(--muted)] mb-1">
                <span>{L('كم تسدّد شهرياً؟', 'How much do you pay monthly?')}</span>
                <span className="text-[var(--ink)]" dir="ltr">{fmt(payPace)}</span>
              </span>
              <input type="range" min={Math.max(100, d.minSum)} max={Math.max(2000, d.totalBalance)} step={100} value={payPace} onChange={(e) => setPayPace(Number(e.target.value))} className="w-full accent-[var(--green)]" dir="ltr" />
            </label>
            <p className="text-xs text-[var(--ink-2)] leading-relaxed">
              {d.months !== null
                ? L(
                    `بهذا الإيقاع تصفّر البطاقات خلال ${d.months} شهراً — وتدفع ${fmt(d.interestPaid)} فوائد في الطريق. الحد الأدنى وحده (${fmt(d.minSum)}) يبقيك في الدوامة أطول بكثير.`,
                    `At this pace you zero the cards in ${d.months} months — paying ${fmt(d.interestPaid)} in interest on the way. Minimums alone (${fmt(d.minSum)}) keep you in the loop far longer.`
                  )
                : L('هذا الإيقاع لا يغطي حتى الفائدة الشهرية — ارفعه.', "This pace doesn't even cover the monthly interest — raise it.")}
            </p>
          </div>
          </ToolStage>

          {/* D4 · the interest engine */}
          <ToolStage level={4} title={L('محرّك الفائدة', 'The interest engine')}>
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
            <label className="block mb-2">
              <span className="flex justify-between text-[10px] font-semibold text-[var(--muted)] mb-1">
                <span>{L('معدل الفائدة السنوي المفترض ٪', 'Assumed APR %')}</span>
                <span className="text-[var(--ink)]" dir="ltr">{aprPct}%</span>
              </span>
              <input type="range" min={12} max={42} step={1} value={aprPct} onChange={(e) => setAprPct(Number(e.target.value))} className="w-full accent-[var(--green)]" dir="ltr" />
            </label>
            <p className="text-[11px] text-[var(--muted)] leading-relaxed">
              {L(
                `حمل ${fmt(d.totalBalance)} بفائدة ${aprPct}٪ يكلّف نحو ${fmt((d.totalBalance * aprPct) / 100 / 12)}/شهرياً لمجرد البقاء واقفاً.`,
                `Carrying ${fmt(d.totalBalance)} at ${aprPct}% costs ~${fmt((d.totalBalance * aprPct) / 100 / 12)}/mo just to stand still.`
              )}
            </p>
          </div>
          </ToolStage>

          <Link href="/commitments" className="block w-full text-center text-sm font-semibold bg-[var(--green-dark)] text-white rounded-xl px-4 py-3">
            {L('أدر بطاقاتك في «الالتزامات» ←', 'Manage cards in Commitments →')}
          </Link>
        </>
      )}
    </div>
  );
}
