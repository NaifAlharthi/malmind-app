// src/lib/goalFund.ts
// Math and presets for the Goal Fund tool: solving monthly <-> target
// amounts under a compounding return, building the month-by-month target
// ladder, and comparing it against what's actually been logged.

export interface GoalPreset {
  id: string;
  icon: string;
  name: string;
  years: number;
}

export const PRESETS: GoalPreset[] = [
  { id: 'child', icon: '👶', name: "My Child's 18th Birthday Fund", years: 18 },
  { id: 'hajj', icon: '🕋', name: 'Hajj & Umrah Fund', years: 3 },
  { id: 'wedding', icon: '💍', name: 'Wedding Fund', years: 4 },
  { id: 'home', icon: '🏡', name: 'Home Down Payment', years: 5 },
  { id: 'retirement', icon: '🌇', name: 'Retirement Top-Up', years: 20 },
  { id: 'custom', icon: '🎯', name: 'Custom Goal', years: 10 },
];

// Full Arabic names (used as the default fund name) and short chip labels.
export const PRESET_NAMES_AR: Record<string, string> = {
  child: 'صندوق عيد ميلاد طفلي الـ18',
  hajj: 'صندوق الحج والعمرة',
  wedding: 'صندوق الزواج',
  home: 'دفعة تملّك المنزل',
  retirement: 'تعزيز التقاعد',
  custom: 'هدف مخصّص',
};

export const PRESET_CHIPS_AR: Record<string, string> = {
  child: 'الطفل عند 18',
  hajj: 'الحج والعمرة',
  wedding: 'الزواج',
  home: 'دفعة المنزل',
  retirement: 'التقاعد',
  custom: 'مخصّص',
};

export function targetFromMonthly(monthly: number, years: number, roiPct: number): number {
  const totalMonths = Math.round(years * 12);
  const monthlyRoi = roiPct / 100 / 12;
  if (monthlyRoi > 0) {
    return monthly * ((Math.pow(1 + monthlyRoi, totalMonths) - 1) / monthlyRoi);
  }
  return monthly * totalMonths;
}

export function monthlyFromTarget(target: number, years: number, roiPct: number): number {
  const totalMonths = Math.round(years * 12);
  const monthlyRoi = roiPct / 100 / 12;
  if (monthlyRoi > 0) {
    return target / ((Math.pow(1 + monthlyRoi, totalMonths) - 1) / monthlyRoi);
  }
  return target / totalMonths;
}

export interface FundMonth {
  m: number; // 1-indexed month
  target: number; // this month's contribution
  cumTarget: number; // cumulative target ladder including compounding
  actualLogged: number | null;
  cumActual: number;
}

export function buildFundSeries(
  monthly: number,
  years: number,
  roiPct: number,
  actuals: Record<number, number>
): FundMonth[] {
  const totalMonths = Math.round(years * 12);
  const monthlyRoi = roiPct / 100 / 12;

  const series: FundMonth[] = [];
  for (let m = 1; m <= totalMonths; m++) {
    const cumTarget =
      monthlyRoi > 0
        ? monthly * ((Math.pow(1 + monthlyRoi, m) - 1) / monthlyRoi)
        : monthly * m;
    series.push({
      m,
      target: monthly,
      cumTarget,
      actualLogged: actuals[m] ?? null,
      cumActual: 0,
    });
  }

  let running = 0;
  for (const s of series) {
    if (s.actualLogged !== null) running += s.actualLogged;
    s.cumActual = running;
  }
  return series;
}

export type FundStatus = 'not-started' | 'ahead' | 'ontrack' | 'behind';

export function fundStatus(series: FundMonth[]): FundStatus {
  const logged = series.filter((s) => s.actualLogged !== null);
  if (logged.length === 0) return 'not-started';
  const last = logged[logged.length - 1];
  const expectedByNow = last.cumTarget;
  if (last.cumActual > expectedByNow * 1.03) return 'ahead';
  if (last.cumActual < expectedByNow * 0.97) return 'behind';
  return 'ontrack';
}

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// offsetMonths=0 returns startDate's own month.
export function monthLabel(startDate: Date, offsetMonths: number, locale: 'ar' | 'en' = 'en'): string {
  const d = new Date(startDate.getFullYear(), startDate.getMonth() + offsetMonths, 1);
  if (locale === 'ar') {
    const name = new Intl.DateTimeFormat('ar', { month: 'short' }).format(d);
    return `${name} ${d.getFullYear()}`;
  }
  return `${MONTH_NAMES_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}
