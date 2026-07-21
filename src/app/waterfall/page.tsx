'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';

interface YearPlan {
  id: string;
  year: number;
  opening_balance: number;
  target_balance: number;
  monthly_income: number;
  monthly_expenses: number;
  save_rate: number;
  invest_split: number;
  expected_roi: number;
}

function fmt(n: number) {
  return Math.round(n).toLocaleString();
}

export default function WaterfallPage() {
  const router = useRouter();
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const money = (n: number) => (ar ? `${fmt(n)} ريال` : `SAR ${fmt(n)}`);
  const [plan, setPlan] = useState<YearPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const currentYear = new Date().getFullYear();

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    const { data } = await supabase
      .from('year_plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('year', currentYear)
      .maybeSingle();
    if (data) setPlan(data as YearPlan);
    setLoading(false);
  }, [supabase, router, currentYear]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <div className="text-sm text-[var(--muted)]">{L('جارٍ تحميل شلّالك…', 'Loading your waterfall…')}</div>;
  }

  if (!plan) {
    return (
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-8 text-center text-sm text-[var(--muted)]">
        {L('أعِدّ خطتك السنوية الرئيسية أولاً — تعرض هذه الشاشة الأرقام نفسها، كتدفّق.', 'Set up your Year Master Plan first — this view shows the same numbers, as a flow.')}
      </div>
    );
  }

  const annualIncome = plan.monthly_income * 12;
  const annualExpenses = plan.monthly_expenses * 12;
  const disposable = annualIncome - annualExpenses;
  const saved = disposable * (plan.save_rate / 100);
  const invested = saved * (plan.invest_split / 100);
  const cash = saved - invested;
  const investReturn = invested * (plan.expected_roi / 100);
  const yearEnd = plan.opening_balance + saved + investReturn;
  const gap = plan.target_balance - yearEnd;

  const maxVal = Math.max(annualIncome, plan.target_balance, yearEnd) * 1.1;
  const barH = (v: number) => Math.max(4, (v / maxVal) * 220);

  return (
    <div>
      <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--green)] font-semibold mb-1">
        {L('قرّر', 'Decide')}
      </div>
      <h1 className="font-serif text-2xl font-semibold text-[var(--ink)] mb-1">
        {L('شلّال المال', 'Money Waterfall')}
      </h1>
      <p className="text-sm text-[var(--ink-2)] mb-6 max-w-xl">
        {L(
          `شاهِد مال ${plan.year} يُحرَق ويُدَّخر ويُستثمَر ويسدّ الفجوة — الأرقام نفسها من خطتك السنوية الرئيسية، محسوسةً كتدفّق.`,
          `Watch ${plan.year}'s money burn, save, invest, and fill the gap — same numbers as your Year Master Plan, felt as a flow.`
        )}
      </p>

      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 overflow-x-auto">
        <div className="flex items-end gap-4 min-w-[600px]" style={{ height: 260 }}>
          {[
            { label: L('الافتتاحي', 'Opening'), value: plan.opening_balance, color: 'var(--chart-neutral-1)' },
            { label: L('الدخل', 'Income'), value: annualIncome, color: 'var(--ink)' },
            { label: L('المحروق', 'Burned'), value: -annualExpenses, color: 'var(--red)' },
            { label: L('المُدَّخر', 'Saved'), value: saved, color: 'var(--green-dark)' },
            { label: L('المُستثمَر', 'Invested'), value: invested, color: 'var(--green)' },
            { label: L('النقد', 'Cash'), value: cash, color: 'var(--blue)' },
            { label: L('العائد', 'Return'), value: investReturn, color: 'var(--gold)' },
            { label: L('نهاية السنة', 'Year end'), value: yearEnd, color: 'var(--ink)' },
            { label: L('الهدف', 'Target'), value: plan.target_balance, color: 'var(--muted)' },
          ].map((bar) => (
            <div key={bar.label} className="flex flex-col items-center flex-1">
              <div className="text-[10px] font-semibold mb-1" style={{ color: bar.color }}>
                {bar.value >= 0 ? '' : '-'}{money(Math.abs(bar.value))}
              </div>
              <div
                className="w-full rounded-t-md"
                style={{
                  height: barH(Math.abs(bar.value)),
                  backgroundColor: bar.color,
                  opacity: 0.85,
                }}
              />
              <div className="text-[10px] text-[var(--muted)] mt-2">{bar.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div
        className={`rounded-xl p-5 mt-6 border ${
          gap <= 0 ? 'bg-[var(--green-bg)] border-[var(--green-border)]' : 'bg-[var(--red-bg)] border-[var(--red-border)]'
        }`}
      >
        <div className="font-serif text-lg font-medium mb-1">
          {gap <= 0
            ? L(`يُتوقّع أن تتجاوز هدفك بمقدار ${money(Math.abs(gap))}.`, `You're projected to exceed your target by ${money(Math.abs(gap))}.`)
            : L(`توجد فجوة قدرها ${money(gap)} حتى هدفك — فكّر في رفع معدّل ادّخارك في الخطة السنوية الرئيسية.`, `There's a gap of ${money(gap)} to your target — consider raising your save rate on the Year Master Plan.`)}
        </div>
      </div>
    </div>
  );
}
