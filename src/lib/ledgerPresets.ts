// src/lib/ledgerPresets.ts
// User-created ledgers, the pure part: the shapes, the predefined
// Saudi-life ledgers, the icon set, and the headline a ledger's big
// button carries. Shared by the web (customLedgers.ts adds storage) and
// the iPhone app (mobile/), so both offer the same presets and read a
// ledger the same way. Keep it free of framework and network imports.
export interface LedgerEntry { month: string; amount: number; note?: string } // month = 'YYYY-MM'

export interface CustomLedger {
  id: string;
  name: string;
  icon: string;
  kind: 'balance' | 'flow';
  direction: 'in' | 'out' | null; // flows only
  preset: string | null;
  entries: LedgerEntry[];
}

export interface Preset {
  key: string; icon: string; kind: CustomLedger['kind']; direction: CustomLedger['direction'];
  name: { ar: string; en: string };
  hint: { ar: string; en: string };
}

export const PRESETS: Preset[] = [
  { key: 'gold', icon: '🪙', kind: 'balance', direction: null, name: { ar: 'الذهب والمعادن', en: 'Gold & metals' }, hint: { ar: 'قيمته اليوم', en: 'what it is worth today' } },
  { key: 'crypto', icon: '₿', kind: 'balance', direction: null, name: { ar: 'العملات الرقمية', en: 'Crypto' }, hint: { ar: 'قيمة المحفظة', en: 'wallet value' } },
  { key: 'eos', icon: '🏛', kind: 'balance', direction: null, name: { ar: 'مكافأة نهاية الخدمة', en: 'End-of-service' }, hint: { ar: 'المستحق حتى الآن', en: 'accrued so far' } },
  { key: 'car', icon: '🚗', kind: 'balance', direction: null, name: { ar: 'قيمة السيارة', en: 'Car value' }, hint: { ar: 'تتبّع الإهلاك', en: 'track depreciation' } },
  { key: 'rent', icon: '🏘', kind: 'flow', direction: 'in', name: { ar: 'دخل الإيجار', en: 'Rental income' }, hint: { ar: 'ما يدخل شهرياً', en: 'what comes in monthly' } },
  { key: 'side', icon: '🧑‍💼', kind: 'flow', direction: 'in', name: { ar: 'عمل جانبي', en: 'Side business' }, hint: { ar: 'صافي ما يدخل', en: 'net coming in' } },
  { key: 'school', icon: '🎓', kind: 'flow', direction: 'out', name: { ar: 'تعليم الأبناء', en: "Kids' education" }, hint: { ar: 'الرسوم والمستلزمات', en: 'fees and supplies' } },
  { key: 'travel', icon: '✈️', kind: 'flow', direction: 'out', name: { ar: 'السفر', en: 'Travel' }, hint: { ar: 'ما يُصرف على الرحلات', en: 'spent on trips' } },
  { key: 'zakat', icon: '🤲', kind: 'flow', direction: 'out', name: { ar: 'الزكاة والصدقات', en: 'Zakat & charity' }, hint: { ar: 'ما تعطيه', en: 'what you give' } },
  { key: 'family', icon: '👨‍👩‍👧', kind: 'flow', direction: 'out', name: { ar: 'دعم الأسرة', en: 'Family support' }, hint: { ar: 'ما يذهب للأهل', en: 'what goes to family' } },
];

export const CUSTOM_ICONS = ['📒', '💎', '🏠', '🚘', '🐪', '🌴', '🎁', '⚽', '🩺', '🕌', '🧾', '💼'];


/** The headline a ledger's big button carries. */
export function ledgerHeadline(l: CustomLedger): { value: number | null; label: 'latest' | 'year' } {
  if (l.entries.length === 0) return { value: null, label: l.kind === 'balance' ? 'latest' : 'year' };
  const sorted = [...l.entries].sort((a, b) => a.month.localeCompare(b.month));
  if (l.kind === 'balance') return { value: sorted[sorted.length - 1].amount, label: 'latest' };
  const year = String(new Date().getFullYear());
  return { value: sorted.filter((e) => e.month.startsWith(year)).reduce((a, e) => a + e.amount, 0), label: 'year' };
}
