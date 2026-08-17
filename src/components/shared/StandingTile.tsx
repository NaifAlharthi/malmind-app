'use client';

// Where you stand · the next actionable item — the action greeting. Lives
// on T2 (the Today control room): a live verdict of the month, one curated
// next action rotated per visit, and an enrichment nugget that provokes
// financial thinking. Home stays for identity; the action happens here.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { QUADRANT_META, type QuadKey } from '@/lib/quadrant';
import { futureValue, DEFAULT_RETURN } from '@/lib/dailyStack';

export interface StandingFin {
  income: number;
  expenses: number;
  cash: number;
  netWorth: number;
}

function fmt(n: number) { return Math.round(n).toLocaleString(); }

export default function StandingTile({
  fin, prevNw, goalCount, quad,
}: {
  fin: StandingFin | null;
  prevNw: number | null;
  goalCount: number;
  quad: QuadKey | null;
}) {
  const { t, locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const sar = t('common.sar');
  const money = (n: number) => (ar ? `${fmt(n)} ${sar}` : `${sar} ${fmt(n)}`);

  // the curated next action rotates once per visit
  const [visitIdx, setVisitIdx] = useState(0);
  useEffect(() => {
    try {
      const n = (Number(window.localStorage.getItem('mm-action-visit')) || 0) + 1;
      window.localStorage.setItem('mm-action-visit', String(n));
      setVisitIdx(n);
    } catch { /* ignore */ }
  }, []);

  if (!fin) return null;
  return (
    <>
      {(() => {
        const surplus = fin.income - fin.expenses;
        const nwDelta = prevNw !== null ? fin.netWorth - prevNw : null;
        const qc = quad ? (ar ? QUADRANT_META[quad].ar : QUADRANT_META[quad].en) : null;

        // Curated next actions — every applicable rule joins the pool, and
        // the visit counter rotates which one greets you today.
        const pool: { icon: string; title: string; body: string; cta: string; href: string }[] = [];
        if (surplus < 0) {
          pool.push({
            icon: '🩸',
            title: L('أوقف نزيف هذا الشهر', "Stop this month's bleed"),
            body: L(
              `مصروفك تجاوز دخلك بـ${money(Math.abs(surplus))} هذا الشهر. افتح كومة اليوم وقلّم اختياراً واحداً متكرراً — الصغير المتكرر أخطر من الكبير العابر.`,
              `Spending beat income by ${money(Math.abs(surplus))} this month. Open the Daily Stack and trim one recurring choice — the small repeating one outweighs the big one-off.`
            ),
            cta: L('افتح كومة اليوم ←', 'Open the Daily Stack →'), href: '/daily-stack',
          });
        }
        if (surplus > 0) {
          pool.push({
            icon: '❄️',
            title: L('كرة الثلج تنتظر فائضك', 'Your surplus wants to snowball'),
            body: L(
              `فائض هذا الشهر ${money(surplus)}. لو تكرر واستُثمر، يصبح نحو ${money(futureValue(surplus, 20, DEFAULT_RETURN))} خلال ٢٠ سنة — حوّله قبل أن يراه المصروف.`,
              `This month's surplus is ${money(surplus)}. Repeated and invested, it becomes about ${money(futureValue(surplus, 20, DEFAULT_RETURN))} in 20 years — move it before spending sees it.`
            ),
            cta: L('شاهد سرعة مالك ←', 'See your money’s velocity →'), href: '/velocity',
          });
        }
        if (fin.cash > 6 * Math.max(1, fin.expenses)) {
          pool.push({
            icon: '🧊',
            title: L('نقدك الخامل يذوب بهدوء', 'Your idle cash is quietly melting'),
            body: L(
              `${money(fin.cash)} نقداً — أكثر من ستة أشهر مصاريف. ما فوق الطوارئ يخسر قيمته للتضخم كل سنة؛ فكّر في تشغيل جزء منه.`,
              `${money(fin.cash)} in cash — over six months of costs. Whatever exceeds the emergency cushion loses value to inflation yearly; consider putting part to work.`
            ),
            cta: L('قارن أين يعمل الريال ←', 'Compare where the riyal works →'), href: '/compare',
          });
        }
        if (goalCount === 0) {
          pool.push({
            icon: '🎯',
            title: L('حلمك الكبير بلا اسم بعد', 'Your big dream has no name yet'),
            body: L(
              'الهدف الذي له اسمٌ ورقمٌ شهري يتحقق؛ والنية الغامضة لا تتحقق. سمِّ خطوتك الكبيرة القادمة — عمرة، دفعة أولى، سنة تفرّغ — وأعطها وتيرة.',
              'A goal with a name and a monthly number gets funded; a vague intention does not. Name your next big thing — a down payment, a sabbatical — and give it a pace.'
            ),
            cta: L('ابدأ صندوق هدف ←', 'Start a goal fund →'), href: '/goal-fund',
          });
        }
        pool.push({
          icon: '🔭',
          title: L('تأمل: أين تقف بعد خمس سنوات؟', 'Contemplate: where do you stand in five years?'),
          body: L(
            'خذ دقيقة مع «ماذا لو»: جرّب علاوة، أو سكناً أرخص، أو استثماراً شهرياً — وشاهد أثر القرار على مستقبلك بالأرقام قبل أن تعيشه.',
            'Take a minute with What-If: try a raise, cheaper housing, or monthly investing — and watch the decision reshape your future in numbers before you live it.'
          ),
          cta: L('افتح ماذا لو ←', 'Open What-If →'), href: '/what-if',
        });
        const action = pool[visitIdx % pool.length];

        // A rotating provocation — one idea per visit that grows general
        // financial literacy, not tied to the user's own numbers.
        const NUGGETS: { ar: string; en: string }[] = [
          {
            ar: 'قاعدة ٧٢: اقسم ٧٢ على العائد السنوي تعرف كم سنة يحتاج مالك ليتضاعف — عند ٧٪ يتضاعف كل ~١٠ سنوات.',
            en: 'The Rule of 72: divide 72 by the annual return to know how many years money needs to double — at 7% it doubles every ~10 years.',
          },
          {
            ar: 'التضخم ضريبةٌ صامتة: ٣٪ سنوياً تكفي لتبخير نصف قوة نقدك الراكد خلال ٢٣ سنة.',
            en: 'Inflation is a silent tax: 3% a year is enough to evaporate half your idle cash’s power in 23 years.',
          },
          {
            ar: 'تكلفة الفرصة: ثمن أي شيء ليس سعره، بل ما كان سيصيره ذلك المال لو بقي يعمل.',
            en: 'Opportunity cost: the price of anything is not its tag — it is what that money would have become had it kept working.',
          },
          {
            ar: 'الفائدة المركّبة تعمل في الاتجاهين: من يفهمها يكسبها، ومن يتجاهلها يدفعها لغيره.',
            en: 'Compound interest works both ways: those who understand it earn it; those who ignore it pay it to someone else.',
          },
          {
            ar: 'متوسط التكلفة: مبلغ ثابت يُستثمر كل شهر يشتري تلقائياً أكثر حين تهبط السوق — الانضباط يغلب التوقيت.',
            en: 'Cost averaging: a fixed monthly investment automatically buys more when markets fall — discipline beats timing.',
          },
          {
            ar: 'الدخل ليس ثروة: الثروة ما يبقى ويعمل بعد المصروف؛ كم من صاحب دخلٍ مرتفع فقيرٌ في ميزانيته العمومية.',
            en: 'Income is not wealth: wealth is what stays and works after spending — many high earners are balance-sheet poor.',
          },
          {
            ar: 'قاعدة ٤٪: كل ألف ريال من مصروفك الشهري تحتاج نحو ٣٠٠ ألف مستثمرة لتغطيها إلى الأبد.',
            en: 'The 4% rule: every SAR 1,000 of monthly spending needs about SAR 300K invested to cover it forever.',
          },
          {
            ar: 'أول مئة ألف هي الأصعب — بعدها يبدأ التراكم يحمل معك طرف الحِمل.',
            en: 'The first hundred thousand is the hardest — after it, compounding starts carrying its share of the load.',
          },
          {
            ar: 'خطر التسلسل: متوسط عائد جيد قد يُفلسك إن جاءت السنوات السيئة أولاً وأنت تسحب منه.',
            en: 'Sequence risk: a good average return can still ruin you if the bad years come first while you are withdrawing.',
          },
          {
            ar: 'سيولةٌ بلا عائد أمانٌ يذوب، وعائدٌ بلا سيولة قيدٌ يخنق — الحكمة في النسبة لا في التطرف.',
            en: 'Liquidity without return is safety that melts; return without liquidity is a chain that chokes — wisdom is in the ratio, not the extreme.',
          },
        ];
        const nugget = NUGGETS[visitIdx % NUGGETS.length];

        return (
          <div className="bg-[var(--surface-card)] border border-[var(--gold)]/40 rounded-2xl mt-4 mb-6 grid md:grid-cols-2 overflow-hidden">
            {/* where you stand as of today */}
            <div className="drv-num p-5">
              <div className="text-[10px] tracking-[0.12em] uppercase text-[var(--gold)] font-semibold mb-2.5">
                {L('أين تقف اليوم', 'Where you stand today')}
              </div>
              <div className="flex items-baseline gap-2.5 flex-wrap mb-1">
                <span className="font-serif text-3xl font-bold" style={{ color: fin.netWorth >= 0 ? 'var(--ink)' : 'var(--red-2)' }}>
                  {money(fin.netWorth)}
                </span>
                {nwDelta !== null && nwDelta !== 0 && (
                  <span className={`text-xs font-semibold ${nwDelta > 0 ? 'text-[var(--green-dark)]' : 'text-[var(--red-2)]'}`}>
                    {nwDelta > 0 ? '▲' : '▼'} {money(Math.abs(nwDelta))} {L('عن الشهر الماضي', 'vs last month')}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[var(--muted)] mb-3">{L('صافي ثروتك الآن', 'Your net worth right now')}</div>
              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                {qc && quad && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-1)] border border-[var(--border-default)] px-2.5 py-1 text-[var(--ink-2)]">
                    {QUADRANT_META[quad].icon} {qc.title}
                  </span>
                )}
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 border ${
                  surplus >= 0
                    ? 'bg-[var(--green-bg)] border-[var(--green-border)] text-[var(--green-dark)]'
                    : 'bg-[var(--gold-bg)] border-[var(--gold)]/40 text-[var(--gold-text-alt)]'
                }`}>
                  {surplus >= 0 ? L(`فائض الشهر ${money(surplus)}`, `Month's surplus ${money(surplus)}`) : L(`عجز الشهر ${money(Math.abs(surplus))}`, `Month's deficit ${money(Math.abs(surplus))}`)}
                </span>
              </div>
            </div>

            {/* next actionable item — divided by a line, rotating every visit */}
            <div className="drv-story p-5 border-t md:border-t-0 md:border-s border-[var(--border-default)]">
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="text-[10px] tracking-[0.12em] uppercase text-[var(--gold)] font-semibold">
                  {L('خطوتك التالية', 'Next actionable item')}
                </div>
                <span className="text-[9px] text-[var(--muted)]">{L('تتجدد مع كل زيارة', 'refreshes every visit')}</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-xl shrink-0">{action.icon}</span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[var(--ink)] mb-1">{action.title}</div>
                  <p className="text-[11px] text-[var(--ink-2)] leading-relaxed mb-2.5">{action.body}</p>
                  <Link href={action.href} className="inline-block text-xs font-semibold text-[var(--green-dark)] bg-[var(--green-bg)] border border-[var(--green-border)] rounded-lg px-3 py-1.5">
                    {action.cta}
                  </Link>
                </div>
              </div>
            </div>

            {/* a provocation for the financially curious — rotates per visit */}
            <div className="drv-story md:col-span-2 border-t border-[var(--border-default)] px-5 py-3 flex items-start gap-2.5 bg-[var(--surface-0)]/40">
              <span className="text-sm shrink-0 mt-px">💡</span>
              <p className="text-[11px] leading-relaxed text-[var(--ink-2)] min-w-0">
                <span className="text-[10px] tracking-[0.1em] uppercase text-[var(--gold)] font-semibold me-2">{L('إثراء', 'Enrich')}</span>
                {ar ? nugget.ar : nugget.en}
              </p>
            </div>
          </div>
        );
      })()}
    </>
  );
}
