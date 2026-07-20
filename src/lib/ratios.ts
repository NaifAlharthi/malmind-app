// src/lib/ratios.ts
// Real computations for the twelve Ratios & Stats cards. Everything here
// is derived from the user's actual stored data - profile fields, net
// worth snapshots, and logged income/spending - never fabricated. Each
// ratio reports whether it has enough real data to compute at all.

export type Verdict = 'good' | 'watch' | 'attention';
export type Category = 'Liquidity' | 'Savings' | 'Debt' | 'Net worth' | 'Spending';
export type Locale = 'ar' | 'en';

export interface RatioInput {
  label: string;
  value: string;
  source: string;
}

export interface RatioResult {
  id: string;
  cat: Category;
  vital: boolean;
  title: string;
  ready: boolean; // enough real data to compute
  missingHint?: string; // shown when not ready
  value?: number;
  unit?: string;
  verdict?: Verdict;
  note?: string; // HTML-ish string with <strong> already applied by caller
  formula?: string;
  calc?: string;
  inputs?: RatioInput[];
  // viz-specific fields, only meaningful when ready
  viz?: Record<string, number | number[]>;
}

export interface FinancialSnapshot {
  monthlyIncome: number | null;
  age: number | null;
  liquidSavings: number | null;
  monthlyDebtPayments: number | null;
  totalDebt: number | null;
  monthlyHousingPayment: number | null;
  monthlyInvestmentContribution: number | null;
  netWorthByYear: { year: number; amount: number }[]; // chronological
  recentSpending: number[]; // logged monthly spending amounts, most recent last
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function computeRatios(s: FinancialSnapshot, locale: Locale = 'en'): RatioResult[] {
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const fmtSar = (n: number) =>
    ar ? `${Math.round(n).toLocaleString('en-US')} ريال` : 'SAR ' + Math.round(n).toLocaleString();
  // localized unit words
  const U = {
    months: L('شهر', 'months'),
    xAnnual: L('× الدخل السنوي', 'x annual income'),
    pctIncome: L('% من الدخل', '% of income'),
    pctYear: L('% سنوياً', '% / year'),
    pctFixed: L('% ثابت', '% fixed'),
    pctLiquid: L('% سائل', '% liquid'),
  };

  const results: RatioResult[] = [];
  const latestNW = s.netWorthByYear.length > 0 ? s.netWorthByYear[s.netWorthByYear.length - 1].amount : null;
  const avgSpending = avg(s.recentSpending);
  const annualIncome = s.monthlyIncome != null ? s.monthlyIncome * 12 : null;

  // 1. Emergency fund coverage (runway) — Liquidity, vital
  if (s.liquidSavings != null && avgSpending && avgSpending > 0) {
    const months = s.liquidSavings / avgSpending;
    const verdict: Verdict = months >= 6 ? 'good' : months >= 3 ? 'watch' : 'attention';
    results.push({
      id: 'runway', cat: 'Liquidity', vital: true, title: L('تغطية صندوق الطوارئ', 'Emergency fund coverage'), ready: true,
      value: Math.round(months * 10) / 10, unit: U.months, verdict,
      note: L(
        `يغطّي <strong>${months.toFixed(1)} أشهر</strong> من متوسط إنفاقك. يوصي أغلب المستشارين بـ 3–6 أشهر.`,
        `Covers <strong>${months.toFixed(1)} months</strong> of average spending. Most advisors recommend 3-6 months.`
      ),
      formula: L('المدخرات السائلة ÷ متوسط الإنفاق الشهري', 'Liquid savings / Average monthly spending'),
      calc: `${fmtSar(s.liquidSavings)} / ${fmtSar(avgSpending)} = ${months.toFixed(1)} ${U.months}`,
      inputs: [
        { label: L('المدخرات السائلة', 'Liquid savings'), value: fmtSar(s.liquidSavings), source: L('ذاتيّة، من ملفّك الشخصي', 'Self-reported, from your profile') },
        { label: L('متوسط الإنفاق الشهري', 'Average monthly spending'), value: fmtSar(avgSpending), source: L('من إدخالات الدخل/الإنفاق المسجّلة', 'From your logged income/spending entries') },
      ],
      viz: { monthsFilled: months, monthsTotal: 12 },
    });
  } else {
    results.push({ id: 'runway', cat: 'Liquidity', vital: true, title: L('تغطية صندوق الطوارئ', 'Emergency fund coverage'), ready: false, missingHint: L('حدّد مدخراتك السائلة في تعديل الملف الشخصي وسجّل بعض الأشهر في دخل العمر.', 'Set your liquid savings in Edit Profile and log some months in Lifetime Income.') });
  }

  // 2. Savings rate — Savings, vital
  if (s.monthlyIncome && avgSpending != null) {
    const rate = ((s.monthlyIncome - avgSpending) / s.monthlyIncome) * 100;
    const verdict: Verdict = rate >= 20 ? 'good' : rate >= 10 ? 'watch' : 'attention';
    results.push({
      id: 'split', cat: 'Savings', vital: true, title: L('معدّل الادّخار', 'Savings rate'), ready: true,
      value: Math.round(rate), unit: '%', verdict,
      note: L(
        `تحتفظ بـ <strong>${Math.round(rate)}%</strong> من دخلك. يوصي أغلب المخطّطين بـ 20% على الأقل.`,
        `You keep <strong>${Math.round(rate)}%</strong> of your income. Most planners recommend at least 20%.`
      ),
      formula: L('(الدخل − الإنفاق) ÷ الدخل', '(Income - Spending) / Income'),
      calc: `(${fmtSar(s.monthlyIncome)} - ${fmtSar(avgSpending)}) / ${fmtSar(s.monthlyIncome)} = ${Math.round(rate)}%`,
      inputs: [
        { label: L('الدخل الشهري', 'Monthly income'), value: fmtSar(s.monthlyIncome), source: L('من ملفّك الشخصي', 'From your profile') },
        { label: L('متوسط الإنفاق الشهري', 'Average monthly spending'), value: fmtSar(avgSpending), source: L('من إدخالات الدخل/الإنفاق المسجّلة', 'From your logged income/spending entries') },
      ],
      viz: { savedPct: Math.max(0, Math.min(100, rate)) },
    });
  } else {
    results.push({ id: 'split', cat: 'Savings', vital: true, title: L('معدّل الادّخار', 'Savings rate'), ready: false, missingHint: L('سجّل بضعة أشهر في دخل العمر لحساب هذا.', 'Log a few months in Lifetime Income to compute this.') });
  }

  // 3. Debt-to-income — Debt, vital
  if (s.monthlyDebtPayments != null && s.monthlyIncome) {
    const pct = (s.monthlyDebtPayments / s.monthlyIncome) * 100;
    const verdict: Verdict = pct <= 20 ? 'good' : pct <= 36 ? 'watch' : 'attention';
    results.push({
      id: 'claim', cat: 'Debt', vital: true, title: L('الدَّين إلى الدخل', 'Debt-to-income'), ready: true,
      value: Math.round(pct), unit: '%', verdict,
      note: L(
        `تلتهم دفعات الدَّين <strong>${Math.round(pct)}%</strong> من دخلك، وعادةً ما يضع المُقرضون حدّاً عند 36%.`,
        `Debt payments claim <strong>${Math.round(pct)}%</strong> of income, lenders typically cap this at 36%.`
      ),
      formula: L('دفعات الدَّين الشهرية ÷ الدخل الشهري', 'Monthly debt payments / Monthly income'),
      calc: `${fmtSar(s.monthlyDebtPayments)} / ${fmtSar(s.monthlyIncome)} = ${Math.round(pct)}%`,
      inputs: [
        { label: L('دفعات الدَّين الشهرية', 'Monthly debt payments'), value: fmtSar(s.monthlyDebtPayments), source: L('ذاتيّة، من ملفّك الشخصي', 'Self-reported, from your profile') },
        { label: L('الدخل الشهري', 'Monthly income'), value: fmtSar(s.monthlyIncome), source: L('من ملفّك الشخصي', 'From your profile') },
      ],
      viz: { claimPct: pct, ceilingPct: 36 },
    });
  } else {
    results.push({ id: 'claim', cat: 'Debt', vital: true, title: L('الدَّين إلى الدخل', 'Debt-to-income'), ready: false, missingHint: L('حدّد دفعات دَينك الشهرية في تعديل الملف الشخصي.', 'Set your monthly debt payments in Edit Profile.') });
  }

  // 4. Net worth to income (ladder) — Net worth, vital
  if (latestNW != null && annualIncome && s.age != null) {
    const multiple = latestNW / annualIncome;
    const verdict: Verdict = multiple >= 1 ? 'good' : multiple >= 0.5 ? 'watch' : 'attention';
    results.push({
      id: 'ladder', cat: 'Net worth', vital: true, title: L('صافي الثروة إلى الدخل', 'Net worth to income'), ready: true,
      value: Math.round(multiple * 10) / 10, unit: U.xAnnual, verdict,
      note: L(
        `صافي ثروتك يعادل <strong>${multiple.toFixed(1)}×</strong> دخلك السنوي في عمر ${s.age}.`,
        `Your net worth is <strong>${multiple.toFixed(1)}x</strong> your annual income at ${s.age}.`
      ),
      formula: L('إجمالي صافي الثروة ÷ الدخل السنوي', 'Total net worth / Annual income'),
      calc: `${fmtSar(latestNW)} / ${fmtSar(annualIncome)} = ${multiple.toFixed(1)}x`,
      inputs: [
        { label: L('إجمالي صافي الثروة', 'Total net worth'), value: fmtSar(latestNW), source: L('أحدث لقطة، من المركز المالي', 'Latest snapshot, from Financial Positioning') },
        { label: L('الدخل السنوي', 'Annual income'), value: fmtSar(annualIncome), source: L('الدخل الشهري × 12، من ملفّك الشخصي', 'Monthly income x 12, from your profile') },
      ],
      viz: { userAge: s.age, userMultiple: multiple },
    });
  } else {
    results.push({ id: 'ladder', cat: 'Net worth', vital: true, title: L('صافي الثروة إلى الدخل', 'Net worth to income'), ready: false, missingHint: L('سجّل لقطة صافي ثروة في المركز المالي وحدّد عمرك/دخلك في تعديل الملف الشخصي.', 'Log a net worth snapshot in Financial Positioning and set your age/income in Edit Profile.') });
  }

  // 5. Current ratio — Liquidity
  if (s.liquidSavings != null && s.monthlyDebtPayments != null && s.monthlyDebtPayments > 0) {
    const shortTermLiabilities = s.monthlyDebtPayments * 12;
    const ratio = s.liquidSavings / shortTermLiabilities;
    const verdict: Verdict = ratio >= 1.5 ? 'good' : ratio >= 1 ? 'watch' : 'attention';
    results.push({
      id: 'scale', cat: 'Liquidity', vital: false, title: L('النسبة الجارية', 'Current ratio'), ready: true,
      value: Math.round(ratio * 10) / 10, unit: 'x', verdict,
      note: L(
        `أصولك السائلة تفوق سنةً من دفعات الدَّين بنسبة <strong>${ratio.toFixed(1)} إلى 1</strong>.`,
        `Liquid assets outweigh a year of debt payments <strong>${ratio.toFixed(1)} to 1</strong>.`
      ),
      formula: L('المدخرات السائلة ÷ (دفعات الدَّين الشهرية × 12)', 'Liquid savings / (Monthly debt payments x 12)'),
      calc: `${fmtSar(s.liquidSavings)} / ${fmtSar(shortTermLiabilities)} = ${ratio.toFixed(1)}x`,
      inputs: [
        { label: L('المدخرات السائلة', 'Liquid savings'), value: fmtSar(s.liquidSavings), source: L('ذاتيّة، من ملفّك الشخصي', 'Self-reported, from your profile') },
        { label: L('سنة من دفعات الدَّين (بديل عن الالتزامات قصيرة الأجل)', 'A year of debt payments (proxy for short-term liabilities)'), value: fmtSar(shortTermLiabilities), source: L('دفعات الدَّين الشهرية × 12', 'Monthly debt payments x 12') },
      ],
      viz: { assets: s.liquidSavings, liabilities: shortTermLiabilities },
    });
  } else {
    results.push({ id: 'scale', cat: 'Liquidity', vital: false, title: L('النسبة الجارية', 'Current ratio'), ready: false, missingHint: L('حدّد مدخراتك السائلة ودفعات دَينك الشهرية في تعديل الملف الشخصي.', 'Set your liquid savings and monthly debt payments in Edit Profile.') });
  }

  // 6. Investment rate — Savings
  if (s.monthlyInvestmentContribution != null && s.monthlyIncome) {
    const pct = (s.monthlyInvestmentContribution / s.monthlyIncome) * 100;
    const verdict: Verdict = pct >= 15 ? 'good' : pct >= 5 ? 'watch' : 'attention';
    results.push({
      id: 'strip', cat: 'Savings', vital: false, title: L('معدّل الاستثمار', 'Investment rate'), ready: true,
      value: Math.round(pct), unit: U.pctIncome, verdict,
      note: L(
        `<strong>${Math.round(pct)}%</strong> من الدخل يذهب إلى الاستثمارات.`,
        `<strong>${Math.round(pct)}%</strong> of income goes into investments.`
      ),
      formula: L('مساهمة الاستثمار الشهرية ÷ الدخل الشهري', 'Monthly investment contribution / Monthly income'),
      calc: `${fmtSar(s.monthlyInvestmentContribution)} / ${fmtSar(s.monthlyIncome)} = ${Math.round(pct)}%`,
      inputs: [
        { label: L('مساهمة الاستثمار الشهرية', 'Monthly investment contribution'), value: fmtSar(s.monthlyInvestmentContribution), source: L('ذاتيّة، من ملفّك الشخصي', 'Self-reported, from your profile') },
        { label: L('الدخل الشهري', 'Monthly income'), value: fmtSar(s.monthlyIncome), source: L('من ملفّك الشخصي', 'From your profile') },
      ],
      viz: { investPct: Math.max(0, Math.min(100, pct)) },
    });
  } else {
    results.push({ id: 'strip', cat: 'Savings', vital: false, title: L('معدّل الاستثمار', 'Investment rate'), ready: false, missingHint: L('حدّد مساهمة استثمارك الشهرية في تعديل الملف الشخصي.', 'Set your monthly investment contribution in Edit Profile.') });
  }

  // 7. Debt-to-asset ratio — Debt
  if (s.totalDebt != null && latestNW != null) {
    const totalAssets = latestNW + s.totalDebt;
    const pct = totalAssets > 0 ? (s.totalDebt / totalAssets) * 100 : 0;
    const verdict: Verdict = pct <= 30 ? 'good' : pct <= 50 ? 'watch' : 'attention';
    results.push({
      id: 'ownership', cat: 'Debt', vital: false, title: L('نسبة الدَّين إلى الأصول', 'Debt-to-asset ratio'), ready: true,
      value: Math.round(pct), unit: '%', verdict,
      note: L(
        `يستحوذ الدَّين على <strong>${Math.round(pct)}%</strong> ممّا تملك.`,
        `Debt claims <strong>${Math.round(pct)}%</strong> of what you own.`
      ),
      formula: L('إجمالي الدَّين ÷ إجمالي الأصول (صافي الثروة + إجمالي الدَّين)', 'Total debt / Total assets (net worth + total debt)'),
      calc: `${fmtSar(s.totalDebt)} / ${fmtSar(totalAssets)} = ${Math.round(pct)}%`,
      inputs: [
        { label: L('إجمالي الدَّين', 'Total debt'), value: fmtSar(s.totalDebt), source: L('ذاتيّة، من ملفّك الشخصي', 'Self-reported, from your profile') },
        { label: L('إجمالي الأصول', 'Total assets'), value: fmtSar(totalAssets), source: L('أحدث صافي ثروة + إجمالي الدَّين', 'Latest net worth + total debt') },
      ],
      viz: { debtPct: pct },
    });
  } else {
    results.push({ id: 'ownership', cat: 'Debt', vital: false, title: L('نسبة الدَّين إلى الأصول', 'Debt-to-asset ratio'), ready: false, missingHint: L('حدّد إجمالي دَينك في تعديل الملف الشخصي وسجّل لقطة صافي ثروة.', 'Set your total debt in Edit Profile and log a net worth snapshot.') });
  }

  // 8. Housing cost ratio — Debt
  if (s.monthlyHousingPayment != null && s.monthlyIncome) {
    const pct = (s.monthlyHousingPayment / s.monthlyIncome) * 100;
    const verdict: Verdict = pct <= 28 ? 'good' : pct <= 36 ? 'watch' : 'attention';
    results.push({
      id: 'house', cat: 'Debt', vital: false, title: L('نسبة تكلفة السكن', 'Housing cost ratio'), ready: true,
      value: Math.round(pct), unit: U.pctIncome, verdict,
      note: L(
        `يأخذ السكن <strong>${Math.round(pct)}%</strong> من الدخل. القاعدة الكلاسيكية تضع حدّاً عند 28%.`,
        `Housing takes <strong>${Math.round(pct)}%</strong> of income. The classic guideline caps this at 28%.`
      ),
      formula: L('دفعة السكن الشهرية ÷ الدخل الشهري', 'Monthly housing payment / Monthly income'),
      calc: `${fmtSar(s.monthlyHousingPayment)} / ${fmtSar(s.monthlyIncome)} = ${Math.round(pct)}%`,
      inputs: [
        { label: L('دفعة السكن الشهرية', 'Monthly housing payment'), value: fmtSar(s.monthlyHousingPayment), source: L('ذاتيّة، من ملفّك الشخصي', 'Self-reported, from your profile') },
        { label: L('الدخل الشهري', 'Monthly income'), value: fmtSar(s.monthlyIncome), source: L('من ملفّك الشخصي', 'From your profile') },
      ],
      viz: { fillPct: pct, ceilingPct: 28 },
    });
  } else {
    results.push({ id: 'house', cat: 'Debt', vital: false, title: L('نسبة تكلفة السكن', 'Housing cost ratio'), ready: false, missingHint: L('حدّد دفعة سكنك الشهرية في تعديل الملف الشخصي.', 'Set your monthly housing payment in Edit Profile.') });
  }

  // 9. Net worth growth (YoY) — Net worth
  if (s.netWorthByYear.length >= 2) {
    const thisYear = s.netWorthByYear[s.netWorthByYear.length - 1];
    const lastYear = s.netWorthByYear[s.netWorthByYear.length - 2];
    const pct = lastYear.amount !== 0 ? ((thisYear.amount - lastYear.amount) / Math.abs(lastYear.amount)) * 100 : 0;
    const verdict: Verdict = pct >= 10 ? 'good' : pct >= 0 ? 'watch' : 'attention';
    results.push({
      id: 'yearbars', cat: 'Net worth', vital: false, title: L('نموّ صافي الثروة (سنوياً)', 'Net worth growth (YoY)'), ready: true,
      value: Math.round(pct), unit: U.pctYear, verdict,
      note: L(
        `${pct >= 0 ? 'نما' : 'انخفض'} صافي الثروة <strong>${Math.abs(Math.round(pct))}%</strong> من ${lastYear.year} إلى ${thisYear.year}.`,
        `Net worth ${pct >= 0 ? 'grew' : 'fell'} <strong>${Math.abs(Math.round(pct))}%</strong> from ${lastYear.year} to ${thisYear.year}.`
      ),
      formula: L('(هذه السنة − السنة الماضية) ÷ السنة الماضية', '(This year - Last year) / Last year'),
      calc: `(${fmtSar(thisYear.amount)} - ${fmtSar(lastYear.amount)}) / ${fmtSar(lastYear.amount)} = ${Math.round(pct)}%`,
      inputs: [
        { label: L(`صافي الثروة، ${thisYear.year}`, `Net worth, ${thisYear.year}`), value: fmtSar(thisYear.amount), source: L('من المركز المالي', 'From Financial Positioning') },
        { label: L(`صافي الثروة، ${lastYear.year}`, `Net worth, ${lastYear.year}`), value: fmtSar(lastYear.amount), source: L('من المركز المالي', 'From Financial Positioning') },
      ],
      viz: { years: s.netWorthByYear.slice(-5).map((r) => r.year), values: s.netWorthByYear.slice(-5).map((r) => r.amount) },
    });
  } else {
    results.push({ id: 'yearbars', cat: 'Net worth', vital: false, title: L('نموّ صافي الثروة (سنوياً)', 'Net worth growth (YoY)'), ready: false, missingHint: L('سجّل سنتين على الأقل من لقطات صافي الثروة في المركز المالي.', 'Log at least two years of net worth snapshots in Financial Positioning.') });
  }

  // 10. Fixed vs. discretionary — Spending
  if (avgSpending != null && (s.monthlyHousingPayment != null || s.monthlyDebtPayments != null)) {
    const fixed = (s.monthlyHousingPayment ?? 0) + (s.monthlyDebtPayments ?? 0);
    const fixedPct = avgSpending > 0 ? Math.min(100, (fixed / avgSpending) * 100) : 0;
    const verdict: Verdict = fixedPct <= 50 ? 'good' : fixedPct <= 65 ? 'watch' : 'attention';
    results.push({
      id: 'donut', cat: 'Spending', vital: false, title: L('ثابت مقابل اختياري', 'Fixed vs. discretionary'), ready: true,
      value: Math.round(fixedPct), unit: U.pctFixed, verdict,
      note: L(
        `<strong>${Math.round(fixedPct)}%</strong> من الإنفاق ثابت (سكن + دفعات دَين).`,
        `<strong>${Math.round(fixedPct)}%</strong> of spending is fixed (housing + debt payments).`
      ),
      formula: L('(دفعة السكن + دفعات الدَّين) ÷ متوسط الإنفاق الشهري', '(Housing payment + Debt payments) / Average monthly spending'),
      calc: `${fmtSar(fixed)} / ${fmtSar(avgSpending)} = ${Math.round(fixedPct)}%`,
      inputs: [
        { label: L('الإنفاق الثابت (سكن + دَين)', 'Fixed spending (housing + debt)'), value: fmtSar(fixed), source: L('من ملفّك الشخصي', 'From your profile') },
        { label: L('متوسط الإنفاق الشهري', 'Average monthly spending'), value: fmtSar(avgSpending), source: L('من إدخالات الدخل/الإنفاق المسجّلة', 'From your logged income/spending entries') },
      ],
      viz: { fixedPct },
    });
  } else {
    results.push({ id: 'donut', cat: 'Spending', vital: false, title: L('ثابت مقابل اختياري', 'Fixed vs. discretionary'), ready: false, missingHint: L('سجّل الإنفاق في دخل العمر وحدّد دفعات السكن/الدَّين في تعديل الملف الشخصي.', 'Log spending in Lifetime Income and set housing/debt payments in Edit Profile.') });
  }

  // 11. Spending-to-income (burn rate) — Spending
  if (avgSpending != null && s.monthlyIncome) {
    const pct = (avgSpending / s.monthlyIncome) * 100;
    const verdict: Verdict = pct <= 70 ? 'good' : pct <= 85 ? 'watch' : 'attention';
    results.push({
      id: 'candle', cat: 'Spending', vital: false, title: L('الإنفاق إلى الدخل (معدّل الحرق)', 'Spending-to-income (burn rate)'), ready: true,
      value: Math.round(pct), unit: U.pctIncome, verdict,
      note: L(
        `تنفق <strong>${Math.round(pct)}%</strong> ممّا تكسب.`,
        `You spend <strong>${Math.round(pct)}%</strong> of what you earn.`
      ),
      formula: L('متوسط الإنفاق الشهري ÷ الدخل الشهري', 'Average monthly spending / Monthly income'),
      calc: `${fmtSar(avgSpending)} / ${fmtSar(s.monthlyIncome)} = ${Math.round(pct)}%`,
      inputs: [
        { label: L('متوسط الإنفاق الشهري', 'Average monthly spending'), value: fmtSar(avgSpending), source: L('من إدخالات الدخل/الإنفاق المسجّلة', 'From your logged income/spending entries') },
        { label: L('الدخل الشهري', 'Monthly income'), value: fmtSar(s.monthlyIncome), source: L('من ملفّك الشخصي', 'From your profile') },
      ],
      viz: { burnPct: Math.min(100, pct) },
    });
  } else {
    results.push({ id: 'candle', cat: 'Spending', vital: false, title: L('الإنفاق إلى الدخل (معدّل الحرق)', 'Spending-to-income (burn rate)'), ready: false, missingHint: L('سجّل بضعة أشهر في دخل العمر لحساب هذا.', 'Log a few months in Lifetime Income to compute this.') });
  }

  // 12. Liquid vs. total net worth — Net worth
  if (s.liquidSavings != null && latestNW && latestNW > 0) {
    const pct = Math.min(100, (s.liquidSavings / latestNW) * 100);
    const verdict: Verdict = pct >= 15 && pct <= 40 ? 'good' : 'watch';
    results.push({
      id: 'layers', cat: 'Net worth', vital: false, title: L('السائل مقابل إجمالي صافي الثروة', 'Liquid vs. total net worth'), ready: true,
      value: Math.round(pct), unit: U.pctLiquid, verdict,
      note: L(
        `<strong>${Math.round(pct)}%</strong> من صافي الثروة سائل أو شبه سائل.`,
        `<strong>${Math.round(pct)}%</strong> of net worth is liquid or near-liquid.`
      ),
      formula: L('المدخرات السائلة ÷ إجمالي صافي الثروة', 'Liquid savings / Total net worth'),
      calc: `${fmtSar(s.liquidSavings)} / ${fmtSar(latestNW)} = ${Math.round(pct)}%`,
      inputs: [
        { label: L('المدخرات السائلة', 'Liquid savings'), value: fmtSar(s.liquidSavings), source: L('ذاتيّة، من ملفّك الشخصي', 'Self-reported, from your profile') },
        { label: L('إجمالي صافي الثروة', 'Total net worth'), value: fmtSar(latestNW), source: L('أحدث لقطة، من المركز المالي', 'Latest snapshot, from Financial Positioning') },
      ],
      viz: { liquidPct: pct },
    });
  } else {
    results.push({ id: 'layers', cat: 'Net worth', vital: false, title: L('السائل مقابل إجمالي صافي الثروة', 'Liquid vs. total net worth'), ready: false, missingHint: L('حدّد مدخراتك السائلة في تعديل الملف الشخصي وسجّل لقطة صافي ثروة.', 'Set your liquid savings in Edit Profile and log a net worth snapshot.') });
  }

  return results;
}

export function verdictLabel(v: Verdict, locale: Locale = 'en'): string {
  if (locale === 'ar') return v === 'good' ? 'سليم' : v === 'watch' ? 'راقِب' : 'يحتاج انتباهاً';
  return v === 'good' ? 'Healthy' : v === 'watch' ? 'Watch' : 'Needs attention';
}

export function zoneColor(v: Verdict): string {
  return v === 'good' ? 'var(--green)' : v === 'watch' ? 'var(--gold-2)' : 'var(--red)';
}
