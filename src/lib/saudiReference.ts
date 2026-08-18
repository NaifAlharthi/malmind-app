// src/lib/saudiReference.ts
// Sourced Saudi reference data — extracted from the founder's reference
// library, each block carrying its citation. These replace the earlier
// illustrative placeholders in the salaries / class / poverty / markets
// tools. Figures are point-in-time survey numbers, shown with sources.
//
// Sources:
//  [JISR]  دليل الرواتب في السعودية ٢٠٢٤–٢٠٢٥ (جسر) — survey of 3,000+
//          companies and 240,000+ employees; role averages by sector,
//          city averages, and the 2018→2023 national salary trend.
//  [GRC]   "The Composition of the Saudi Middle Class: A Preliminary
//          Study" (M. Alnuaim, Gulf Research Center) — household income
//          class bands and national poverty lines.
//  [KPMG]  "Analysis of Household Savings in Saudi Arabia" — GaStat
//          Household Income & Expenditure Survey figures and savings-
//          rate benchmarks.

// ── [JISR] role salary ranges (SAR/month) — min–max of the guide's
//    sector-by-sector averages for each role ──
export const SALARY_ROLES: { ar: string; en: string; lo: number; hi: number }[] = [
  { ar: 'الرئيس التنفيذي', en: 'CEO', lo: 13500, hi: 70000 },
  { ar: 'مدير مالي', en: 'Finance manager', lo: 10000, hi: 34500 },
  { ar: 'مدير التسويق والمبيعات', en: 'Marketing & sales manager', lo: 7000, hi: 32000 },
  { ar: 'مدير الشؤون القانونية', en: 'Legal affairs manager', lo: 9000, hi: 28000 },
  { ar: 'محلل مالي', en: 'Financial analyst', lo: 7500, hi: 18500 },
  { ar: 'أخصائي قانوني', en: 'Legal specialist', lo: 5000, hi: 11500 },
  { ar: 'أخصائي تسويق رقمي', en: 'Digital marketing specialist', lo: 5000, hi: 13000 },
  { ar: 'أخصائي موارد بشرية', en: 'HR specialist', lo: 5000, hi: 9500 },
  { ar: 'محاسب', en: 'Accountant', lo: 4000, hi: 8500 },
  { ar: 'أخصائي خدمة العملاء', en: 'Customer service specialist', lo: 4000, hi: 6500 },
];

// ── [JISR] city average employee salaries, 2024 (SAR/month) ──
export const SALARY_CITIES: { ar: string; en: string; avg: number }[] = [
  { ar: 'الرياض', en: 'Riyadh', avg: 8000 },
  { ar: 'جدة', en: 'Jeddah', avg: 7000 },
  { ar: 'المنطقة الشرقية', en: 'Eastern Province', avg: 6000 },
];

// ── [JISR] the national average-salary trend ──
export const SALARY_TREND = { from: { year: 2018, avg: 6600 }, to: { year: 2023, avg: 9600 } };

// ── [GRC] Saudi social-class bands by HOUSEHOLD monthly income (SAR) ──
export const CLASS_BANDS: { key: string; icon: string; ar: string; en: string; lo: number; hi: number | null }[] = [
  { key: 'lower', icon: '🌫', ar: 'الطبقة الدنيا', en: 'Lower class', lo: 0, hi: 3800 },
  { key: 'peripheral', icon: '🌤', ar: 'وسطى هامشية', en: 'Peripheral middle', lo: 3900, hi: 7700 },
  { key: 'basic', icon: '☀️', ar: 'وسطى أساسية', en: 'Basic middle', lo: 7700, hi: 22900 },
  { key: 'upper-mc', icon: '🌟', ar: 'وسطى عليا', en: 'Upper middle', lo: 22900, hi: 38200 },
  { key: 'upper', icon: '👑', ar: 'الطبقة العليا', en: 'Upper class', lo: 38200, hi: null },
];

// ── [GRC] national poverty lines (SAR/month) ──
export const POVERTY_LINES = {
  destitution: 1724, // family line of destitution
  absolute: 3817.5, // family line of absolute poverty (avg family of 7.6)
};

// ── [KPMG] household benchmarks (GaStat 2018 survey) ──
export const HOUSEHOLD = {
  avgMonthlyIncome: 14823,
  avgMonthlyConsumption: 14584,
  savingsRatePct: 2.4, // Saudi household savings rate (2013 baseline cited)
  visionTargetPct: 7.5, // the program target
  globalStandardPct: 10, // the recognized global minimum standard
};

// ── [GOSI] the social-insurance machine, from the organization's own
//    reports (Statistical Report 2022 EN; Annual Report 2024 for the
//    new-law retirement-age transition) ──
export const GOSI = {
  annuities: { totalPct: 18, employeePct: 9, employerPct: 9 },
  hazardsPct: 2, // occupational hazards — employer pays it all
  saned: {
    totalPct: 1.5, employeePct: 0.75, employerPct: 0.75,
    firstMonthsPct: 60, firstMonthsCap: 9000, // first three months
    afterPct: 50, afterCap: 7500, // every month after
  },
  minPension: 1983.75, // SAR/month, minimum periodic benefit
  retirementAge: 60, // Hijri, under the prior law
  newLawRetirementAge: 65, // gradual transition per the 2024 annual report
  accrualPerYearPct: 2.5, // Social Insurance Law: per contribution year, of the average contributory wage
  minMonths: 120, // minimum contribution months for a pension
  earlyRetirementMonths: 300, // early-retirement eligibility
  // contributory wage = basic salary + housing allowance
};

export const REF_SOURCES = {
  jisr: { ar: 'دليل الرواتب في السعودية ٢٠٢٤–٢٠٢٥ (جسر)', en: 'Jisr Saudi Salary Guide 2024–25' },
  grc: { ar: 'دراسة الطبقة الوسطى السعودية (مركز الخليج للأبحاث)', en: 'GRC — The Saudi Middle Class (Alnuaim)' },
  kpmg: { ar: 'تحليل مدخرات الأسر في السعودية (KPMG / الهيئة العامة للإحصاء)', en: 'KPMG — Household Savings in Saudi Arabia (GaStat)' },
  gosi: { ar: 'تقارير المؤسسة العامة للتأمينات الاجتماعية (الإحصائي ٢٠٢٢ والسنوي ٢٠٢٤)', en: 'GOSI Statistical Report 2022 & Annual Report 2024' },
};
