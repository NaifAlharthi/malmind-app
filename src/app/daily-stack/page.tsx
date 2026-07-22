'use client';

// The Daily Stack — a day of spending as a stack of choices, and the snowball
// it becomes when repeated. Ties daily choices to the pace shown on Velocity.

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import {
  PERIODS, periodLabel, periodPer, scaleToPeriod, buildDailyItems, byCategory, sumBy,
  futureValue, DEFAULT_RETURN, DEBT_RATE, KIND_COLOR,
  type Period, type StackItem, type Kind,
} from '@/lib/dailyStack';
import { timeToTargetMonths, monthsToWords, FOCUS_MILESTONES } from '@/lib/velocity';

const fmt = (n: number) => Math.round(n).toLocaleString();
const fmtC = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'K' : String(Math.round(n)));
const KIND_ORDER: Record<Kind, number> = { need: 0, debt: 1, want: 2 };

export default function DailyStackPage() {
  const router = useRouter();
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const money = (n: number) => (ar ? `${fmt(n)} ريال` : `SAR ${fmt(n)}`);
  const moneyC = (n: number) => (ar ? `${fmtC(n)} ريال` : `SAR ${fmtC(n)}`);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<StackItem[]>([]);
  const [dailyIncome, setDailyIncome] = useState(0);
  const [period, setPeriod] = useState<Period>('day');
  const [target, setTarget] = useState(100000);
  const [trim, setTrim] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const [{ data: profile }, { data: exp }, { data: subs }, { data: loans }] = await Promise.all([
        supabase.from('profiles').select('monthly_income, side_income').eq('id', user.id).single(),
        supabase.from('expenses').select('name, category, amount, frequency').eq('user_id', user.id),
        supabase.from('subscriptions').select('name, amount, billing_cycle, category').eq('user_id', user.id),
        supabase.from('loans').select('name, monthly_payment, loan_type').eq('user_id', user.id),
      ]);
      const monthlyIncome = (Number(profile?.monthly_income) || 0) + (Number(profile?.side_income) || 0);
      setDailyIncome(monthlyIncome / 30.44);
      setItems(buildDailyItems(
        (exp ?? []) as never, (subs ?? []) as never, (loans ?? []) as never,
      ));
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cats = useMemo(() => byCategory(items).sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || b.daily - a.daily), [items]);
  const dailySpend = useMemo(() => sumBy(items), [items]);
  const dailySurplus = dailyIncome - dailySpend;
  const biggestWant = useMemo(() => items.filter((i) => i.kind === 'want').sort((a, b) => b.daily - a.daily)[0] ?? null, [items]);

  // "Trim your biggest want" what-if.
  const effSurplus = dailySurplus + (trim && biggestWant ? biggestWant.daily : 0);

  if (loading) return <div className="text-sm text-[var(--muted)]">{L('جارٍ بناء كومة يومك…', 'Building your daily stack…')}</div>;

  const spendPeriod = scaleToPeriod(dailySpend, period);
  const incomePeriod = scaleToPeriod(dailyIncome, period);
  const surplusPeriod = scaleToPeriod(dailySurplus, period);
  const positive = dailySurplus >= 0;

  const needD = sumBy(items, 'need'), wantD = sumBy(items, 'want'), debtD = sumBy(items, 'debt');

  // The snowball: surplus invested; the shadow: your spend, had it been invested.
  const snowY = [10, 20, 30];
  const snowball = (y: number) => futureValue(Math.max(0, dailySurplus), y, DEFAULT_RETURN);
  const shadow = (y: number) => futureValue(dailySpend, y, DEFAULT_RETURN);
  const deficitMonster = (y: number) => futureValue(Math.max(0, -dailySurplus), y, DEBT_RATE);
  const snowSeries = Array.from({ length: 31 }, (_, y) => ({
    y, wealth: Math.round(snowball(y)), shadow: Math.round(shadow(y)),
  }));

  // Velocity link: months to target at the (optionally trimmed) surplus.
  const monthlyDisp = Math.max(0, dailySurplus) * 30.44;
  const monthlyDispTrim = Math.max(0, effSurplus) * 30.44;
  const monthsNow = timeToTargetMonths(target, monthlyDisp);
  const monthsTrim = timeToTargetMonths(target, monthlyDispTrim);

  return (
    <div>
      <div className="mb-1 text-[10px] tracking-[0.1em] uppercase text-[var(--blue)] font-semibold">{L('عدسة اليوم', "Today's lens")}</div>
      <h1 className="font-serif text-2xl font-semibold text-[var(--ink)] mb-1">{L('كومة اليوم', 'The Daily Stack')}</h1>
      <p className="text-sm text-[var(--ink-2)] mb-5 max-w-2xl">
        {L(
          'يومك ليس يوماً واحداً — بل كومة من الاختيارات تتكرّر. شاهِد ماذا يكلّفك مستوى معيشتك يومياً، وكيف يتحوّل التكرار إلى كرة ثلج تُنمّي ثروتك أو وحشٍ دوريّ يلتهمها.',
          "A day is never just a day — it's a stack of choices that repeats. See what your standard of living costs, day by day, and how repetition turns into a snowball that grows your wealth — or a cyclical monster that eats it."
        )}
      </p>

      {/* period lens toggle */}
      <div className="flex items-center gap-2 flex-wrap mb-5">
        <span className="text-xs text-[var(--muted)]">{L('انظر إلى حياتك بوحدة:', 'View your life by the:')}</span>
        <div className="inline-flex border border-[var(--border-default)] rounded-lg overflow-hidden">
          {PERIODS.map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3.5 py-1.5 text-xs font-medium ${period === p ? 'bg-[var(--ink)] text-[var(--surface-0)]' : 'bg-[var(--surface-card)] text-[var(--ink-2)]'}`}>
              {periodLabel(p, locale)}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-8 text-center text-sm text-[var(--muted)] mb-6">
          {L('لا مصروفات مسجَّلة بعد. أضِف مصروفاتك واشتراكاتك لبناء كومتك.', 'No expenses logged yet. Add your expenses and subscriptions to build your stack.')}{' '}
          <Link href="/commitments" className="text-[var(--green-dark)] font-medium">{L('أضِف الآن', 'Add now')}</Link>
        </div>
      ) : (
        <>
          {/* ── The stack ── */}
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 mb-6">
            <div className="flex items-baseline justify-between gap-3 flex-wrap mb-4">
              <div>
                <div className="text-sm font-medium text-[var(--ink)]">{L('كومة اختياراتك', 'Your stack of choices')}</div>
                <div className="text-xs text-[var(--muted)]">{L(`ما يكلّفه مستوى معيشتك ${periodPer(period, locale)}`, `What your standard of living costs ${periodPer(period, locale)}`)}</div>
              </div>
              <div className="text-end">
                <div className="font-serif text-2xl font-bold text-[var(--ink)]">{money(spendPeriod)}</div>
                <div className="text-[11px] text-[var(--muted)]">{L('إجمالي الإنفاق', 'total spend')} · {periodLabel(period, locale)}</div>
              </div>
            </div>

            <div className="flex gap-5 items-stretch">
              {/* the stacked bricks */}
              <div className="flex flex-col-reverse rounded-xl overflow-hidden border border-[var(--border-faint)]" style={{ width: 190, height: 340 }} dir="ltr">
                {cats.map((c) => {
                  const h = (c.daily / dailySpend) * 100;
                  const tall = h > 9;
                  return (
                    <div key={c.category} className="relative flex items-center px-2.5 border-t border-white/10 first:border-t-0"
                      style={{ height: `${h}%`, background: `linear-gradient(90deg, ${KIND_COLOR[c.kind]}e6, ${KIND_COLOR[c.kind]}b3)` }}
                      title={`${c.category}: ${money(scaleToPeriod(c.daily, period))}`}>
                      {tall && (
                        <div className="text-white min-w-0">
                          <div className="text-[11px] font-semibold leading-tight truncate">{c.icon} {c.category}</div>
                          <div className="text-[10px] text-white/85">{money(scaleToPeriod(c.daily, period))}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* readout */}
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <Row label={L('الدخل', 'Income')} value={money(incomePeriod)} color="var(--green-dark)" />
                  <Row label={L('الإنفاق', 'Spending')} value={`− ${money(spendPeriod)}`} color="var(--ink-2)" />
                  <div className="h-px bg-[var(--border-default)] my-2" />
                  <Row label={positive ? L('يبقى معك', 'You keep') : L('العجز', 'Shortfall')} value={`${positive ? '+' : '−'} ${money(Math.abs(surplusPeriod))}`} color={positive ? 'var(--green-dark)' : 'var(--red-2)'} bold />
                </div>

                {/* need / want / debt split of the stack */}
                <div className="mt-4">
                  <div className="text-[10px] text-[var(--muted)] mb-1.5">{L('من ماذا تتكوّن كومتك', 'What your stack is made of')}</div>
                  <div className="flex h-2.5 rounded-full overflow-hidden mb-2" dir="ltr">
                    {(['need', 'want', 'debt'] as Kind[]).map((k) => {
                      const v = k === 'need' ? needD : k === 'want' ? wantD : debtD;
                      return v > 0 ? <div key={k} style={{ width: `${(v / dailySpend) * 100}%`, background: KIND_COLOR[k] }} /> : null;
                    })}
                  </div>
                  <div className="flex gap-3 flex-wrap text-[11px]">
                    <Chip color={KIND_COLOR.need} label={L('احتياجات', 'Needs')} v={money(scaleToPeriod(needD, period))} />
                    <Chip color={KIND_COLOR.want} label={L('اختيارات', 'Wants')} v={money(scaleToPeriod(wantD, period))} />
                    {debtD > 0 && <Chip color={KIND_COLOR.debt} label={L('ديون', 'Debt')} v={money(scaleToPeriod(debtD, period))} />}
                  </div>
                  <p className="text-[11px] text-[var(--muted)] mt-2 leading-relaxed">
                    {L(
                      `«الاختيارات» هي ما بيدك تغييره اليوم — وهي ${Math.round((wantD / dailySpend) * 100)}% من كومتك.`,
                      `“Wants” are what you can change today — and they're ${Math.round((wantD / dailySpend) * 100)}% of your stack.`
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── The cycle: snowball vs monster ── */}
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 mb-6">
            <div className="text-sm font-medium text-[var(--ink)] mb-1">{L('يوم واحد، مكرّراً: كرة الثلج مقابل الوحش', 'One day, repeated: the snowball vs the monster')}</div>
            <div className="text-xs text-[var(--muted)] mb-4 max-w-2xl">
              {L(
                `اليوم يتكرّر، فيتراكم. ما تحتفظ به يُستثمَر وينمو ككرة ثلج؛ وما تنفقه — لو استُثمِر بدلاً من ذلك — هو الوحش الدوريّ الذي تتخلّى عنه. (بافتراض عائد ${Math.round(DEFAULT_RETURN * 100)}٪ سنوياً)`,
                `The day repeats, so it compounds. What you keep gets invested and grows like a snowball; what you spend — had it been invested instead — is the cyclical monster you give up. (assuming ~${Math.round(DEFAULT_RETURN * 100)}% a year)`
              )}
            </div>

            {positive ? (
              <div className="grid sm:grid-cols-3 gap-3 mb-4">
                {snowY.map((y) => (
                  <div key={y} className="rounded-xl p-3.5 bg-[var(--green-bg)] border border-[var(--green-border)]">
                    <div className="text-[10px] text-[var(--muted)] mb-0.5">{L('كرة الثلج', 'Snowball')} · {y} {L('سنة', 'yrs')}</div>
                    <div className="font-serif text-xl font-bold text-[var(--green-dark)]">+{moneyC(snowball(y))}</div>
                    <div className="text-[10px] text-[var(--muted)] mt-0.5">{L('من فائضك المستثمَر', 'from your invested surplus')}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid sm:grid-cols-3 gap-3 mb-4">
                {snowY.map((y) => (
                  <div key={y} className="rounded-xl p-3.5 bg-[var(--red-bg)] border border-[var(--red-soft)]">
                    <div className="text-[10px] text-[var(--muted)] mb-0.5">{L('الوحش (عجز)', 'Monster (deficit)')} · {y} {L('سنة', 'yrs')}</div>
                    <div className="font-serif text-xl font-bold text-[var(--red-2)]">−{moneyC(deficitMonster(y))}</div>
                    <div className="text-[10px] text-[var(--muted)] mt-0.5">{L(`تراكم العجز عند ${Math.round(DEBT_RATE * 100)}٪`, `deficit compounding at ${Math.round(DEBT_RATE * 100)}%`)}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="h-44 mt-2" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={snowSeries} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dsWealth" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--green)" stopOpacity={0.4} /><stop offset="100%" stopColor="var(--green)" stopOpacity={0} /></linearGradient>
                    <linearGradient id="dsShadow" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--gold)" stopOpacity={0.28} /><stop offset="100%" stopColor="var(--gold)" stopOpacity={0} /></linearGradient>
                  </defs>
                  <XAxis dataKey="y" tick={{ fontSize: 9, fill: 'var(--muted)' }} tickFormatter={(v) => `${v}${L('س', 'y')}`} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: 'var(--muted)' }} tickFormatter={(v) => fmtC(Number(v))} width={40} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v, n) => [money(Number(v)), n === 'wealth' ? L('كرة الثلج', 'Snowball') : L('لو استُثمِر إنفاقك', 'If spend were invested')]} labelFormatter={(y) => `${y} ${L('سنة', 'years')}`} />
                  <Area type="monotone" dataKey="shadow" stroke="var(--gold)" strokeWidth={1.5} strokeDasharray="4 3" fill="url(#dsShadow)" name="shadow" />
                  <Area type="monotone" dataKey="wealth" stroke="var(--green)" strokeWidth={2.5} fill="url(#dsWealth)" name="wealth" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 justify-center text-[10px] text-[var(--ink-2)] mt-1">
              <span className="flex items-center gap-1.5"><span className="w-3.5 h-0.5 bg-[var(--green)] inline-block" />{L('كرة الثلج (فائضك)', 'Snowball (your surplus)')}</span>
              <span className="flex items-center gap-1.5"><span className="w-3.5 h-0 border-t border-dashed border-[var(--gold)] inline-block" />{L('الوحش (لو استُثمِر إنفاقك)', 'Monster (spend, if invested)')}</span>
            </div>
          </div>

          {/* ── Velocity connection ── */}
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
              <div className="text-sm font-medium text-[var(--ink)]">{L('كيف تصنع اختياراتك سرعتك', 'How your choices set your speed')}</div>
              <Link href="/velocity" className="text-[11px] text-[var(--green-dark)] font-medium">{L('سرعة المال →', 'Velocity of Money →')}</Link>
            </div>
            <div className="text-xs text-[var(--muted)] mb-3">{L('كل اختيار يومي يغيّر وتيرتك نحو هدفك.', 'Every daily choice changes your pace toward a target.')}</div>

            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className="text-xs text-[var(--ink-2)]">{L('الهدف:', 'Target:')}</span>
              {FOCUS_MILESTONES.map((m) => (
                <button key={m} onClick={() => setTarget(m)}
                  className={`px-3 py-1 rounded-full text-[11px] font-medium border ${target === m ? 'bg-[var(--green-bg)] border-[var(--green)] text-[var(--green-dark)]' : 'bg-[var(--surface-card)] border-[var(--border-medium)] text-[var(--ink-2)]'}`}>
                  {moneyC(m)}
                </button>
              ))}
            </div>

            <div className="rounded-xl bg-[var(--surface-1)] border border-[var(--border-default)] p-4">
              {monthlyDisp > 0 ? (
                <div className="text-sm text-[var(--ink)]">
                  {L('بفائضك الحالي، تبلغ ', 'At your current surplus, you reach ')}
                  <strong>{moneyC(target)}</strong>{L(' خلال ', ' in ')}
                  <strong className="text-[var(--green-dark)]">{monthsToWords(monthsNow, locale)}</strong>.
                </div>
              ) : (
                <div className="text-sm text-[var(--red-dark-text)]">{L('لا فائض حالياً — إنفاقك يساوي دخلك أو يتجاوزه.', "No surplus right now — your spending meets or beats your income.")}</div>
              )}

              {biggestWant && (
                <label className="flex items-center gap-2 mt-3 text-xs text-[var(--ink-2)] cursor-pointer select-none">
                  <input type="checkbox" checked={trim} onChange={(e) => setTrim(e.target.checked)} className="w-4 h-4 accent-[var(--green-dark)]" />
                  {L(`جرّب حذف أكبر اختيار: ${biggestWant.icon} ${biggestWant.label} (${money(scaleToPeriod(biggestWant.daily, period))} ${periodPer(period, locale)})`,
                    `Try cutting your biggest want: ${biggestWant.icon} ${biggestWant.label} (${money(scaleToPeriod(biggestWant.daily, period))} ${periodPer(period, locale)})`)}
                </label>
              )}
              {trim && biggestWant && monthlyDispTrim > 0 && (
                <div className="text-xs mt-2 text-[var(--green-dark)]">
                  {L('→ تصل خلال ', '→ you reach it in ')}<strong>{monthsToWords(monthsTrim, locale)}</strong>
                  {Number.isFinite(monthsNow) && monthsTrim < monthsNow && L(` — أسرع بـ ${monthsToWords(monthsNow - monthsTrim, locale)}.`, ` — that's ${monthsToWords(monthsNow - monthsTrim, locale)} sooner.`)}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 items-start bg-[var(--gold-bg)] border border-[var(--gold)] rounded-xl p-4">
            <div className="w-7 h-7 rounded-full bg-[var(--gold)] flex items-center justify-center font-serif font-semibold text-white text-sm shrink-0">M</div>
            <div className="text-xs text-[var(--gold-text-body)] leading-relaxed">
              <strong className="text-[var(--gold-text-strong)]">{L('اليوم هو أصغر رافعة لديك — وأقواها.', 'The day is your smallest lever — and your strongest.')}</strong>{' '}
              {L('غيّر اختياراً يومياً واحداً، وشاهِد كرة الثلج تكبر والوحش يصغر.', 'Change one daily choice, and watch the snowball grow while the monster shrinks.')}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, value, color, bold }: { label: string; value: string; color: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5">
      <span className="text-xs text-[var(--muted)]">{label}</span>
      <span className={`${bold ? 'font-serif text-lg font-bold' : 'text-sm font-medium'}`} style={{ color }}>{value}</span>
    </div>
  );
}
function Chip({ color, label, v }: { color: string; label: string; v: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[var(--ink-2)]">
      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />{label} · <strong className="text-[var(--ink)] font-medium">{v}</strong>
    </span>
  );
}
