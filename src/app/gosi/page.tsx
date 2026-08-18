'use client';

// GOSI — the state's layer of your retirement, explained from the
// organization's own reports and computed on YOUR wage from the Log:
//   D1 · your GOSI card — what leaves your payslip, what it builds
//   D2 · the machine's anatomy — three branches, who pays what
//   D3 · SANED — the net under your income if the job ever stops
//   D4 · the horizon — the pension math, the 65 transition, the gap
// Figures from GOSI's Statistical Report 2022 (EN) and the 2024
// Annual Report; the pension estimate is an approximation — the
// official number lives in your GOSI account.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import ToolStage from '@/components/shared/ToolStage';
import { GOSI, REF_SOURCES } from '@/lib/saudiReference';

interface Snap { year: number; month: number; income: number; expenses: number }
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

export default function GosiPage() {
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const [snaps, setSnaps] = useState<Snap[] | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [careerStart, setCareerStart] = useState<number | null>(null);
  const [retireAge, setRetireAge] = useState(GOSI.retirementAge);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSnaps([]); return; }
      const [{ data }, { data: prof }] = await Promise.all([
        supabase.from('financial_snapshots').select('year, month, income, expenses').eq('user_id', user.id)
          .order('year', { ascending: true }).order('month', { ascending: true }),
        supabase.from('profiles').select('age, career_start_year').eq('id', user.id).single(),
      ]);
      setSnaps((data as Snap[]) ?? []);
      const p = prof as { age: number | null; career_start_year: number | null } | null;
      setAge(p?.age ?? null);
      setCareerStart(p?.career_start_year ?? null);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const d = useMemo(() => {
    if (!snaps || snaps.length === 0) return null;
    const recent = snaps.slice(-6);
    const avgIncome = recent.reduce((a, s) => a + Number(s.income), 0) / recent.length;
    const avgExpenses = recent.reduce((a, s) => a + Number(s.expenses), 0) / recent.length;
    // contributory wage = basic + housing; from a total package,
    // basic ≈ total/1.35 and housing ≈ 25% of basic
    const contributoryWage = (avgIncome / 1.35) * 1.25;
    const yourMonthly = contributoryWage * ((GOSI.annuities.employeePct + GOSI.saned.employeePct) / 100);
    const employerMonthly = contributoryWage * ((GOSI.annuities.employerPct + GOSI.hazardsPct + GOSI.saned.employerPct) / 100);
    const nowYear = new Date().getFullYear();
    const startYear = careerStart ?? (age ? nowYear - age + 22 : null);
    const yearsSoFar = startYear ? Math.max(0, nowYear - startYear) : 0;
    const yearsAtRetire = age ? yearsSoFar + Math.max(0, retireAge - age) : yearsSoFar;
    const replacement = Math.min(1, (yearsAtRetire * GOSI.accrualPerYearPct) / 100);
    const pension = Math.max(GOSI.minPension, replacement * contributoryWage);
    // SANED, on their wage
    const saned1 = Math.min(GOSI.saned.firstMonthsCap, contributoryWage * (GOSI.saned.firstMonthsPct / 100));
    const saned2 = Math.min(GOSI.saned.afterCap, contributoryWage * (GOSI.saned.afterPct / 100));
    return { avgIncome, avgExpenses, contributoryWage, yourMonthly, employerMonthly, yearsSoFar, yearsAtRetire, replacement, pension, saned1, saned2 };
  }, [snaps, age, careerStart, retireAge]);

  if (snaps === null) return <div className="text-sm text-[var(--muted)]">…</div>;

  return (
    <div className="max-w-3xl">
      <div className="text-[10px] tracking-[0.12em] uppercase text-[var(--gold)] mb-1">🔭 {L('المستقبل', 'The Future')}</div>
      <h1 className="font-serif text-3xl font-semibold text-[var(--ink)] mb-1">🏛 {L('التأمينات الاجتماعية (GOSI)', 'GOSI')}</h1>
      <p className="text-sm text-[var(--ink-2)] mb-6 max-w-2xl">
        {L('طبقة الدولة في تقاعدك — من تقارير المؤسسة نفسها، محسوبةً على أجرك أنت.', "The state's layer of your retirement — from the organization's own reports, computed on YOUR wage.")}
      </p>

      {!d ? (
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 text-[12px] text-[var(--muted)] leading-relaxed">
          {L('سجّل دخلاً في ', 'Log income in ')}<Link href="/log" className="text-[var(--green-dark)] font-semibold hover:underline">{L('السِّجل', 'the Log')}</Link>{L(' لتُحسب تأميناتك عليه.', ' and your GOSI gets computed on it.')}
        </div>
      ) : (
        <>
          {/* D1 · your GOSI card */}
          <div className="bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] rounded-2xl p-6 text-white mb-4">
            <div className="grid grid-cols-3 gap-3 text-center mb-4">
              {([
                [L('أجرك الخاضع ≈', 'Contributory wage ≈'), fmt(d.contributoryWage)],
                [L('يُقتطع منك شهرياً', 'Leaves your payslip'), fmt(d.yourMonthly)],
                [L('يدفعه صاحب العمل', 'Your employer pays'), fmt(d.employerMonthly)],
              ] as [string, string][]).map(([name, val]) => (
                <div key={name}>
                  <div className="text-[10px] text-white/50 mb-0.5">{name}</div>
                  <div className="font-serif text-xl font-bold" dir="ltr">{val}</div>
                </div>
              ))}
            </div>
            <div className="text-center text-[11px] text-white/60 pt-3 border-t border-white/10">
              {L(
                `${d.yearsSoFar} سنة اشتراك حتى اليوم — وعند ${retireAge} يصبح معاشك التقريبي ${fmt(d.pension)}/شهرياً (${Math.round(d.replacement * 100)}٪ من أجرك الخاضع).`,
                `${d.yearsSoFar} contribution years so far — at ${retireAge}, your approximate pension is ${fmt(d.pension)}/mo (${Math.round(d.replacement * 100)}% of your contributory wage).`
              )}
            </div>
          </div>

          {/* D2 · the anatomy */}
          <ToolStage level={2} title={L('تشريح الآلة', "The machine's anatomy")}>
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
            <div className="text-sm font-medium text-[var(--ink)] mb-3">⚙️ {L('ثلاثة فروع، واقتطاع واحد', 'Three branches, one deduction')}</div>
            <div className="overflow-x-auto" dir="ltr">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-[var(--border-faint)]">
                    {[L('الفرع', 'Branch'), L('المجموع', 'Total'), L('أنت', 'You'), L('صاحب العمل', 'Employer')].map((h) => (
                      <th key={h} className="p-2 text-[10px] text-[var(--muted)] font-semibold text-start">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {([
                    [L('المعاشات', 'Annuities'), `${GOSI.annuities.totalPct}%`, `${GOSI.annuities.employeePct}%`, `${GOSI.annuities.employerPct}%`],
                    [L('الأخطار المهنية', 'Occupational hazards'), `${GOSI.hazardsPct}%`, '—', `${GOSI.hazardsPct}%`],
                    [L('ساند (التعطل)', 'SANED (unemployment)'), `${GOSI.saned.totalPct}%`, `${GOSI.saned.employeePct}%`, `${GOSI.saned.employerPct}%`],
                  ] as string[][]).map((row) => (
                    <tr key={row[0]} className="border-b border-[var(--border-faint)]/60">
                      {row.map((c, i) => <td key={i} className={`p-2 ${i === 0 ? 'font-semibold text-[var(--ink)]' : 'text-[var(--ink-2)]'}`}>{c}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-[var(--muted)] leading-relaxed mt-2">
              {L(
                `الأجر الخاضع = الأساسي + بدل السكن. الحد الأدنى للمعاش ${fmt(GOSI.minPension)} ريال. أهلية المعاش من ${GOSI.minMonths} شهر اشتراك، والتقاعد المبكر من ${GOSI.earlyRetirementMonths} شهراً.`,
                `Contributory wage = basic + housing. Minimum pension ${fmt(GOSI.minPension)} SAR. Pension eligibility from ${GOSI.minMonths} contribution months; early retirement from ${GOSI.earlyRetirementMonths}.`
              )}
            </p>
          </div>
          </ToolStage>

          {/* D3 · SANED, the net */}
          <ToolStage level={3} title={L('ساند — الشبكة تحت دخلك', 'SANED — the net under your income')}>
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
            <p className="text-xs text-[var(--ink-2)] leading-relaxed mb-3">
              {L(
                `لو توقفت وظيفتك لظرف خارج إرادتك، يدفع ساند ${GOSI.saned.firstMonthsPct}٪ من متوسط أجرك الخاضع لأول ثلاثة أشهر ثم ${GOSI.saned.afterPct}٪ بعدها — على أجرك أنت:`,
                `If your job stops for reasons beyond you, SANED pays ${GOSI.saned.firstMonthsPct}% of your average contributory wage for the first three months, then ${GOSI.saned.afterPct}% after — on YOUR wage:`
              )}
            </p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {([
                [L('الأشهر ١–٣', 'Months 1–3'), `${fmt(d.saned1)}/${L('ش', 'mo')}`],
                [L('بعدها', 'After that'), `${fmt(d.saned2)}/${L('ش', 'mo')}`],
              ] as [string, string][]).map(([name, val]) => (
                <div key={name} className="bg-[var(--surface-1)] border border-[var(--border-faint)] rounded-xl px-3 py-2.5">
                  <div className="text-[9px] text-[var(--muted)]">{name}</div>
                  <div className="text-sm font-bold text-[var(--ink)]" dir="ltr">{val}</div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[var(--ink-2)] leading-relaxed">
              {d.saned1 >= d.avgExpenses
                ? L('يغطي ساند مصروفك الشهري كاملاً في الأشهر الأولى ✓ — مع درعك النقدي، سقوط الدخل ليس سقوطاً حراً.', 'SANED covers your full monthly spending in the first months ✓ — with your cash shield, losing income is not a free fall.')
                : L(`يغطي ساند ${Math.round((d.saned1 / d.avgExpenses) * 100)}٪ من مصروفك — درعك النقدي يسدّ الباقي؛ راجع «خط الفقر» لعدد أشهر صمودك.`, `SANED covers ${Math.round((d.saned1 / d.avgExpenses) * 100)}% of your spending — your cash shield fills the rest; see The Poverty Line for your holding months.`)}
            </p>
          </div>
          </ToolStage>

          {/* D4 · the horizon */}
          <ToolStage level={4} title={L('الأفق — معاشك والتحوّل إلى ٦٥', 'The horizon — your pension and the 65 transition')}>
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
            <label className="block mb-3">
              <span className="flex justify-between text-[10px] font-semibold text-[var(--muted)] mb-1">
                <span>{L('سن التقاعد المفترض', 'Assumed retirement age')}</span>
                <span className="text-[var(--ink)]" dir="ltr">{retireAge}</span>
              </span>
              <input type="range" min={Math.max((age ?? 25) + 1, 55)} max={GOSI.newLawRetirementAge} step={1} value={retireAge} onChange={(e) => setRetireAge(Number(e.target.value))} className="w-full accent-[var(--green)]" dir="ltr" />
            </label>
            <p className="text-xs text-[var(--ink-2)] leading-relaxed mb-2">
              {L(
                `المعادلة: ${GOSI.accrualPerYearPct}٪ عن كل سنة اشتراك × متوسط الأجر الخاضع، بسقف ١٠٠٪. عند ${retireAge} تكون سنواتك ${d.yearsAtRetire} ⇒ معاش ${fmt(d.pension)}/شهرياً — يغطي ${d.avgExpenses > 0 ? Math.round((d.pension / d.avgExpenses) * 100) : 0}٪ من مصروفك اليوم؛ والباقي وظيفة محفظتك في «التقاعد».`,
                `The formula: ${GOSI.accrualPerYearPct}% per contribution year × the average contributory wage, capped at 100%. At ${retireAge} your years are ${d.yearsAtRetire} ⇒ a ${fmt(d.pension)}/mo pension — covering ${d.avgExpenses > 0 ? Math.round((d.pension / d.avgExpenses) * 100) : 0}% of today's spending; the rest is your portfolio's job in Retirement.`
              )}
            </p>
            <p className="text-[10px] text-[var(--muted)] leading-relaxed">
              {L(
                `⏳ النظام الجديد يرفع سن التقاعد تدريجياً إلى ${GOSI.newLawRetirementAge} (التقرير السنوي ٢٠٢٤) — كلما كنت أصغر، كان أفقك أقرب إلى ٦٥.`,
                `⏳ The new law raises the retirement age gradually to ${GOSI.newLawRetirementAge} (2024 annual report) — the younger you are, the closer your horizon sits to 65.`
              )}
            </p>
          </div>
          </ToolStage>

          <div className="flex flex-col sm:flex-row gap-2">
            <Link href="/retirement" className="flex-1 text-center text-sm font-semibold bg-[var(--green-dark)] text-white rounded-xl px-4 py-3">
              🌅 {L('اجمعها مع محفظتك — التقاعد ←', 'Combine it with your pot — Retirement →')}
            </Link>
          </div>
          <p className="text-[9px] text-[var(--muted)] leading-relaxed mt-3">
            {L(`الأرقام من: ${REF_SOURCES.gosi.ar} — والتقدير تقريبي؛ رقمك الرسمي في حسابك لدى المؤسسة.`, `Figures: ${REF_SOURCES.gosi.en} — estimates are approximate; your official number lives in your GOSI account.`)}
          </p>
        </>
      )}
    </div>
  );
}
