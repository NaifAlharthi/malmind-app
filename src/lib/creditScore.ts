// src/lib/creditScore.ts
// The Credit Standing engine. Everything is computed from the SIMAH / MOLIM
// report data the user records — never fabricated. The MOLIM score itself is
// user-entered (it only ships in SIMAH's paid "Smart" report), so we store
// the official number and interpret it against published-style bands; all the
// derived signals (good/bad-debt split, utilisation, DBR, access-to-credit)
// come from the individual accounts.
//
// Nothing here is a lending decision or investment advice — SAMA's Responsible
// Lending caps and typical broker practice are used only to give the user an
// educational, illustrative sense of headroom.

export type Locale = 'ar' | 'en';

// ── The MOLIM 300–900 scale, split into MalMind's five reading bands ────────
// Exact cut-offs are set by SIMAH and each lender; these are a clean, honest
// interpretation for orientation, not an official mapping.
export type BandKey = 'weak' | 'fair' | 'good' | 'veryGood' | 'excellent';

export interface Band {
  key: BandKey;
  min: number;
  max: number;
  color: string;
}

export const SCORE_MIN = 300;
export const SCORE_MAX = 900;

export const BANDS: Band[] = [
  { key: 'weak', min: 300, max: 579, color: '#C0504D' },
  { key: 'fair', min: 580, max: 669, color: '#D89A3E' },
  { key: 'good', min: 670, max: 739, color: '#4A78C4' },
  { key: 'veryGood', min: 740, max: 799, color: '#1D9E75' },
  { key: 'excellent', min: 800, max: 900, color: '#0B7A5A' },
];

export function bandFor(score: number): Band {
  return BANDS.find((b) => score >= b.min && score <= b.max) ?? BANDS[0];
}

export function bandLabel(key: BandKey, locale: Locale = 'en'): string {
  const ar = locale === 'ar';
  switch (key) {
    case 'weak': return ar ? 'ضعيف' : 'Weak';
    case 'fair': return ar ? 'مقبول' : 'Fair';
    case 'good': return ar ? 'جيّد' : 'Good';
    case 'veryGood': return ar ? 'جيّد جداً' : 'Very good';
    case 'excellent': return ar ? 'ممتاز' : 'Excellent';
  }
}

export function bandBlurb(key: BandKey, locale: Locale = 'en'): string {
  const ar = locale === 'ar';
  switch (key) {
    case 'weak':
      return ar
        ? 'يراك المُقرضون عالي المخاطر. التمويل الجديد صعب وأغلى. أهمّ خطوة: انتظام السداد التامّ وتقليص الأرصدة الدوّارة.'
        : 'Lenders read you as high-risk. New financing is hard and pricier. The one move that matters: flawless on-time payments and shrinking revolving balances.';
    case 'fair':
      return ar
        ? 'قابل للتمويل لكن بشروط أضعف. أنت على بُعد عادات قليلة من فئة «الجيّد» — الانتظام والاستخدام المنخفض يرفعانك.'
        : "Financeable, but on weaker terms. You're a few habits away from the Good band — consistency and low utilisation lift you.";
    case 'good':
      return ar
        ? 'وضع سليم. تتأهّل لأغلب المنتجات بأسعار معقولة. الحفاظ على السجل النظيف يبني نحو «الجيّد جداً».'
        : 'A healthy standing. You qualify for most products at reasonable rates. Keeping the record clean builds toward Very good.';
    case 'veryGood':
      return ar
        ? 'وضع قويّ. تتأهّل لأفضل الشروف تقريباً. حافظ على انخفاض الاستخدام وتنوّع المنتجات.'
        : 'A strong standing. You qualify for near-best terms. Keep utilisation low and your product mix varied.';
    case 'excellent':
      return ar
        ? 'في القمّة. أفضل الأسعار والحدود متاحة لك. المخاطرة الوحيدة هي الرضا المفرط — استمرّ كما أنت.'
        : "Top of the scale. The best rates and limits are open to you. The only risk is complacency — keep doing exactly this.";
  }
}

// ── Debt classification: good (builds wealth), bad (consumes it), neutral ───
export type ProductType =
  | 'mortgage' | 'stock_finance' | 'sme_finance'
  | 'personal_loan' | 'auto_loan' | 'credit_card'
  | 'telecom' | 'utility' | 'other';

export type DebtClass = 'good' | 'bad' | 'neutral' | 'leveraged';

export const PRODUCT_TYPES: ProductType[] = [
  'mortgage', 'stock_finance', 'sme_finance', 'personal_loan',
  'auto_loan', 'credit_card', 'telecom', 'utility', 'other',
];

export function productLabel(t: ProductType, locale: Locale = 'en'): string {
  const ar = locale === 'ar';
  switch (t) {
    case 'mortgage': return ar ? 'رهن عقاري' : 'Mortgage';
    case 'stock_finance': return ar ? 'تمويل أسهم (مرابحة)' : 'Stock finance (Murabaha)';
    case 'sme_finance': return ar ? 'تمويل منشأة' : 'Business finance';
    case 'personal_loan': return ar ? 'قرض شخصي' : 'Personal loan';
    case 'auto_loan': return ar ? 'تمويل سيارة' : 'Auto finance';
    case 'credit_card': return ar ? 'بطاقة ائتمانية' : 'Credit card';
    case 'telecom': return ar ? 'اتصالات' : 'Telecom';
    case 'utility': return ar ? 'خدمة/مرافق' : 'Utility';
    case 'other': return ar ? 'أخرى' : 'Other';
  }
}

// A credit card only counts as "bad" when it carries a balance; paid in full
// it's a neutral tool that quietly builds history.
export function classifyDebt(t: ProductType, outstanding: number): DebtClass {
  switch (t) {
    case 'mortgage':
    case 'sme_finance':
      return 'good';
    case 'stock_finance':
      return 'leveraged';
    case 'personal_loan':
    case 'auto_loan':
      return 'bad';
    case 'credit_card':
      return outstanding > 0 ? 'bad' : 'neutral';
    case 'telecom':
    case 'utility':
    case 'other':
    default:
      return 'neutral';
  }
}

export function debtClassLabel(c: DebtClass, locale: Locale = 'en'): string {
  const ar = locale === 'ar';
  switch (c) {
    case 'good': return ar ? 'دَين جيّد' : 'Good debt';
    case 'bad': return ar ? 'دَين مُثقِل' : 'Bad debt';
    case 'leveraged': return ar ? 'دَين برافعة' : 'Leveraged';
    case 'neutral': return ar ? 'محايد' : 'Neutral';
  }
}

export function debtClassColor(c: DebtClass): string {
  switch (c) {
    case 'good': return '#1D9E75';
    case 'bad': return '#C0504D';
    case 'leveraged': return '#D89A3E';
    case 'neutral': return '#8a99a8';
  }
}

export function debtClassWhy(c: DebtClass, t: ProductType, locale: Locale = 'en'): string {
  const ar = locale === 'ar';
  if (c === 'good') {
    return ar
      ? 'مرتبط بأصل يبني ثروتك — تسديده يزيد ملكيتك.'
      : 'Backed by an asset that builds your wealth — paying it down grows what you own.';
  }
  if (c === 'leveraged') {
    return ar
      ? 'تمويل لشراء أصول متقلّبة. يضخّم الأرباح والخسائر معاً — يحتاج مراقبة.'
      : 'Financing to hold volatile assets. It magnifies gains and losses alike — watch it closely.';
  }
  if (c === 'bad') {
    return t === 'credit_card'
      ? (ar ? 'رصيد دوّار على البطاقة — من أغلى أنواع الدَّين وأسرعها تراكماً.' : 'A revolving card balance — among the most expensive debt there is, and the fastest to compound.')
      : (ar ? 'تمويل استهلاكي على أصل يتناقص أو لا أصل له — يسحب من ثروتك.' : 'Consumer financing on a depreciating or asset-free purchase — it drains wealth.');
  }
  return ar
    ? 'حساب خدمة يبني سجلّك الائتماني دون أن يكون دَيناً يُثقِلك.'
    : 'A service account that builds your credit record without weighing on you as debt.';
}

// ── Metrics computed from a snapshot's accounts ─────────────────────────────
export interface CreditAccount {
  id: string;
  product_type: ProductType;
  creditor: string | null;
  credit_limit: number;
  outstanding: number;
  installment: number;
  past_due: number;
  issue_date: string | null;
  status: string;
  payment_status: string;
}

export interface CreditSnapshotInput {
  report_date: string;
  molim_score: number | null;
  monthly_income: number;
  first_account_date: string | null;
  num_defaulted: number;
  total_defaulted: number;
  num_inquiries: number;
  bounced_cheques: number;
}

export interface CreditMetrics {
  totalLimits: number;
  totalOutstanding: number;
  cardLimits: number;
  cardBalances: number;
  cardUtilisation: number | null;     // %
  totalInstallments: number;
  mortgageInstallments: number;
  nonMortgageInstallments: number;
  dbr: number | null;                 // total, %
  nonMortgageDbr: number | null;      // %
  goodTotal: number;                  // outstanding
  badTotal: number;
  leveragedTotal: number;
  neutralTotal: number;
  activeCount: number;
  creditAgeMonths: number | null;
  hasPastDue: boolean;
  anyDefault: boolean;
}

function monthsBetween(fromISO: string, to = new Date()): number {
  const f = new Date(fromISO);
  if (Number.isNaN(f.getTime())) return 0;
  return Math.max(0, (to.getFullYear() - f.getFullYear()) * 12 + (to.getMonth() - f.getMonth()));
}

export function computeMetrics(snap: CreditSnapshotInput, accounts: CreditAccount[]): CreditMetrics {
  const active = accounts.filter((a) => a.status !== 'closed');
  let totalLimits = 0, totalOutstanding = 0, cardLimits = 0, cardBalances = 0;
  let totalInstallments = 0, mortgageInstallments = 0;
  let goodTotal = 0, badTotal = 0, leveragedTotal = 0, neutralTotal = 0;
  let hasPastDue = false;

  for (const a of active) {
    totalLimits += a.credit_limit || 0;
    totalOutstanding += a.outstanding || 0;
    totalInstallments += a.installment || 0;
    if (a.product_type === 'mortgage') mortgageInstallments += a.installment || 0;
    if (a.product_type === 'credit_card') {
      cardLimits += a.credit_limit || 0;
      cardBalances += a.outstanding || 0;
    }
    if ((a.past_due || 0) > 0) hasPastDue = true;
    const cls = classifyDebt(a.product_type, a.outstanding || 0);
    if (cls === 'good') goodTotal += a.outstanding || 0;
    else if (cls === 'bad') badTotal += a.outstanding || 0;
    else if (cls === 'leveraged') leveragedTotal += a.outstanding || 0;
    else neutralTotal += a.outstanding || 0;
  }

  const nonMortgageInstallments = totalInstallments - mortgageInstallments;
  const income = snap.monthly_income || 0;

  return {
    totalLimits,
    totalOutstanding,
    cardLimits,
    cardBalances,
    cardUtilisation: cardLimits > 0 ? (cardBalances / cardLimits) * 100 : null,
    totalInstallments,
    mortgageInstallments,
    nonMortgageInstallments,
    dbr: income > 0 ? (totalInstallments / income) * 100 : null,
    nonMortgageDbr: income > 0 ? (nonMortgageInstallments / income) * 100 : null,
    goodTotal,
    badTotal,
    leveragedTotal,
    neutralTotal,
    activeCount: active.length,
    creditAgeMonths: snap.first_account_date ? monthsBetween(snap.first_account_date) : null,
    hasPastDue,
    anyDefault: (snap.num_defaulted || 0) > 0 || (snap.total_defaulted || 0) > 0,
  };
}

// ── SIMAH-style factor read-out (descriptive, not a fabricated sub-score) ───
export type FactorRating = 'strong' | 'ok' | 'weak' | 'unknown';

export interface FactorReading {
  key: string;
  rating: FactorRating;
  weightPct: number;     // rough SIMAH-style weighting, for orientation
}

export function readFactors(snap: CreditSnapshotInput, m: CreditMetrics): FactorReading[] {
  const out: FactorReading[] = [];

  // Payment history (~35%)
  let payment: FactorRating = 'strong';
  if (m.anyDefault) payment = 'weak';
  else if (m.hasPastDue || snap.bounced_cheques > 0) payment = 'ok';
  out.push({ key: 'payment', rating: payment, weightPct: 35 });

  // Utilisation / amounts owed (~30%)
  let util: FactorRating = 'unknown';
  if (m.cardUtilisation != null) {
    util = m.cardUtilisation <= 30 ? 'strong' : m.cardUtilisation <= 50 ? 'ok' : 'weak';
  }
  out.push({ key: 'utilisation', rating: util, weightPct: 30 });

  // Length of history (~15%)
  let age: FactorRating = 'unknown';
  if (m.creditAgeMonths != null) {
    age = m.creditAgeMonths >= 84 ? 'strong' : m.creditAgeMonths >= 36 ? 'ok' : 'weak';
  }
  out.push({ key: 'age', rating: age, weightPct: 15 });

  // Credit mix (~10%)
  const good = m.goodTotal > 0 || m.leveragedTotal > 0;
  const revolving = m.cardLimits > 0;
  const mix: FactorRating = good && revolving ? 'strong' : (good || revolving) ? 'ok' : 'weak';
  out.push({ key: 'mix', rating: mix, weightPct: 10 });

  // New credit / enquiries (~10%)
  const inq: FactorRating = snap.num_inquiries <= 1 ? 'strong' : snap.num_inquiries <= 3 ? 'ok' : 'weak';
  out.push({ key: 'inquiries', rating: inq, weightPct: 10 });

  return out;
}

export function factorLabel(key: string, locale: Locale = 'en'): string {
  const ar = locale === 'ar';
  switch (key) {
    case 'payment': return ar ? 'انتظام السداد' : 'Payment history';
    case 'utilisation': return ar ? 'نسبة استخدام البطاقات' : 'Card utilisation';
    case 'age': return ar ? 'عمر السجل الائتماني' : 'Length of history';
    case 'mix': return ar ? 'تنوّع المنتجات' : 'Credit mix';
    case 'inquiries': return ar ? 'الاستعلامات الحديثة' : 'Recent enquiries';
    default: return key;
  }
}

export function factorDetail(key: string, snap: CreditSnapshotInput, m: CreditMetrics, locale: Locale = 'en'): string {
  const ar = locale === 'ar';
  switch (key) {
    case 'payment':
      if (m.anyDefault) return ar ? 'يوجد تعثّر مسجَّل — أثقل عامل سلبي.' : 'A default is on record — the heaviest negative factor.';
      if (m.hasPastDue || snap.bounced_cheques > 0) return ar ? 'توجد متأخّرات أو شيكات مرتجعة.' : 'Some past-due amounts or bounced cheques.';
      return ar ? 'كل الدفعات في وقتها — العامل الأقوى.' : 'Every payment on time — your strongest factor.';
    case 'utilisation':
      if (m.cardUtilisation == null) return ar ? 'لا توجد بطاقات لقياسها.' : 'No cards to measure.';
      return ar ? `تستخدم ${Math.round(m.cardUtilisation)}% من حدود بطاقاتك.` : `You're using ${Math.round(m.cardUtilisation)}% of your card limits.`;
    case 'age':
      if (m.creditAgeMonths == null) return ar ? 'أضِف تاريخ أوّل حساب.' : 'Add your first-account date.';
      { const y = Math.floor(m.creditAgeMonths / 12); return ar ? `سجلّك عمره نحو ${y} سنة.` : `Your record is about ${y} years old.`; }
    case 'mix':
      return ar ? 'مزيج من الدَّين المنتج والبطاقات يقرأ إيجاباً.' : 'A blend of productive debt and cards reads well.';
    case 'inquiries':
      return ar ? `${snap.num_inquiries} استعلام حديث.` : `${snap.num_inquiries} recent enquir${snap.num_inquiries === 1 ? 'y' : 'ies'}.`;
    default: return '';
  }
}

// ── Access to credit & margin — SAMA-caps + typical practice, illustrative ──
// SAMA Responsible Lending: consumer (non-mortgage) monthly deductions are
// generally capped near 33% of net salary; total including real-estate near
// 65% for citizens. These are the caps we measure headroom against.
export const DBR_NON_MORTGAGE_CAP = 33;
export const DBR_TOTAL_CAP = 65;

export interface CreditAccess {
  personalLoanMonthlyRoom: number;   // SAR/month still available under the 33% cap
  personalLoanPrincipal: number;     // rough principal that room supports
  cardHeadroom: number;              // illustrative total card limit you might reach
  cardHeadroomExtra: number;         // above current card limits
  marginLow: number;                 // illustrative margin against marketable holdings
  marginHigh: number;
  eligible: boolean;                 // score good enough for meaningful new credit
}

// Rough principal a given monthly payment supports over `months` at `annualRate`.
function principalFromPayment(payment: number, annualRate: number, months: number): number {
  if (payment <= 0) return 0;
  const r = annualRate / 100 / 12;
  if (r === 0) return payment * months;
  return payment * (1 - Math.pow(1 + r, -months)) / r;
}

export function computeAccess(
  score: number | null,
  m: CreditMetrics,
  monthlyIncome: number,
  marketablePortfolio: number,
): CreditAccess {
  const band = score != null ? bandFor(score).key : 'good';
  const eligible = score == null ? false : score >= 580; // below "Fair" → little room

  // Personal-loan room under the 33% non-mortgage cap.
  const cap = (DBR_NON_MORTGAGE_CAP / 100) * monthlyIncome;
  const personalLoanMonthlyRoom = Math.max(0, cap - m.nonMortgageInstallments);
  // Assume a 60-month tenor at an illustrative ~8% annual rate.
  const personalLoanPrincipal = eligible ? principalFromPayment(personalLoanMonthlyRoom, 8, 60) : 0;

  // Card headroom as an illustrative multiple of monthly income by band.
  const cardMultiple: Record<BandKey, number> = {
    weak: 0.25, fair: 1, good: 2, veryGood: 3, excellent: 4,
  };
  const cardHeadroom = eligible ? cardMultiple[band] * monthlyIncome : 0;
  const cardHeadroomExtra = Math.max(0, cardHeadroom - m.cardLimits);

  // Margin: brokers may extend leverage against marketable securities for
  // qualified investors — illustrative 0.5×–1× of the marketable portfolio.
  const marginLow = eligible ? marketablePortfolio * 0.5 : 0;
  const marginHigh = eligible ? marketablePortfolio * 1.0 : 0;

  return {
    personalLoanMonthlyRoom,
    personalLoanPrincipal,
    cardHeadroom,
    cardHeadroomExtra,
    marginLow,
    marginHigh,
    eligible,
  };
}

// ── Trend helper: score delta between two snapshots ─────────────────────────
export function scoreDelta(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null) return null;
  return current - previous;
}

// ═══════════════════════════════════════════════════════════════════════════
// Parser — pull fields out of a pasted SIMAH "Basic Credit Report" text dump.
// Best-effort and forgiving: it prefills the guided form, which the user then
// corrects. Never assume it's complete.
// ═══════════════════════════════════════════════════════════════════════════
export interface ParsedReport {
  snapshot: Partial<CreditSnapshotInput>;
  accounts: Partial<CreditAccount>[];
}

function num(s: string | undefined): number {
  if (!s) return 0;
  const v = parseFloat(s.replace(/[^0-9.]/g, ''));
  return Number.isFinite(v) ? v : 0;
}

// SIMAH prints dates as DD/MM/YYYY; convert to ISO YYYY-MM-DD.
function isoDate(dmy: string | undefined): string | null {
  if (!dmy) return null;
  const m = dmy.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

const PRODUCT_MAP: [RegExp, ProductType][] = [
  [/mortgage/i, 'mortgage'],
  [/stock finance|murabaha/i, 'stock_finance'],
  [/credit card/i, 'credit_card'],
  [/personal loan|consumer|tayseer/i, 'personal_loan'],
  [/auto|car|vehicle/i, 'auto_loan'],
  [/sme|business|corporate/i, 'sme_finance'],
  [/mobile|telecom|phone/i, 'telecom'],
  [/internet|utility|water|electric/i, 'utility'],
];

function mapProduct(label: string): ProductType {
  for (const [re, t] of PRODUCT_MAP) if (re.test(label)) return t;
  return 'other';
}

export function parseSimahReport(text: string): ParsedReport {
  const snapshot: Partial<CreditSnapshotInput> = {};

  const grabDate = (re: RegExp) => isoDate(text.match(re)?.[1]);
  const grabNum = (re: RegExp) => {
    const m = text.match(re);
    return m ? num(m[1]) : undefined;
  };

  snapshot.report_date = grabDate(/Date\s*&\s*Time\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i) ?? undefined;
  snapshot.first_account_date = grabDate(/First Account Issue Date\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i);
  const nd = grabNum(/Number of Defaulted Products\s*:?\s*(\d+)/i);
  if (nd != null) snapshot.num_defaulted = nd;
  const td = grabNum(/Total Outstanding Defaulted Balance\s*:?\s*([\d,.]+)/i);
  if (td != null) snapshot.total_defaulted = td;

  // Count enquiries and bounced cheques from their sections if present.
  const enquiryMatches = text.match(/Previous Enquiries[\s\S]*?(?=Enforcement|Narratives|Disclaimer|$)/i)?.[0] ?? '';
  const enquiryDates = enquiryMatches.match(/\d{2}\/\d{2}\/\d{4}/g);
  if (enquiryDates) snapshot.num_inquiries = enquiryDates.length;
  if (/No Bounced Cheques/i.test(text)) snapshot.bounced_cheques = 0;

  // Accounts from the "Active Products Summary" block. SIMAH's PDF-to-text is
  // noisy, so we scan line-by-line and keep rows that start with a known type.
  const accounts: Partial<CreditAccount>[] = [];
  const summary = text.match(/Active Products Summary([\s\S]*?)(?=Active Guaranteed|Defaulted Products|$)/i)?.[1] ?? '';
  for (const rawLine of summary.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    const typeMatch = line.match(/^(Credit Card|Stock Finance(?:\s+Murabaha)?|Mortgage|Mobile Phone|Internet Service|Personal Loan|Auto\s*\w*|Consumer\s*\w*|SME\s*\w*)/i);
    if (!typeMatch) continue;
    const nums = line.match(/[\d,]+\.\d{2}/g) ?? [];
    // Heuristic: on a summary row the numbers read as
    // installment, credit limit, outstanding (some may be missing).
    const [a, b, c] = nums.map(num);
    accounts.push({
      product_type: mapProduct(typeMatch[1]),
      installment: nums.length >= 3 ? a : 0,
      credit_limit: nums.length >= 3 ? b : (nums.length === 2 ? a : 0),
      outstanding: nums.length >= 3 ? c : (nums.length >= 1 ? nums.map(num)[nums.length - 1] : 0),
      status: /Close/i.test(line) ? 'closed' : 'active',
      payment_status: /current/i.test(line) ? 'current' : 'current',
    });
  }

  return { snapshot, accounts };
}
