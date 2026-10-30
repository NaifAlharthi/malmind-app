// src/lib/customLedgers.ts
// User-created ledgers — the areas of a financial life the fixed Log
// lines don't name: gold, crypto, end-of-service, rent coming in, school
// fees going out, zakat. Two kinds:
//   · balance — a value you re-state over time (what is it worth now?)
//   · flow    — amounts that come in or go out, month by month
// Each ledger keeps its own entries (one per month; re-entering a month
// replaces it). Stored in Supabase (supabase/schema_part21.sql); until
// that table exists, the ledgers live in this browser instead, so the
// feature works before the migration is run.

import type { createClient } from '@/lib/supabase/client';

type Client = ReturnType<typeof createClient>;

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

const localKey = (uid: string) => `mm-custom-ledgers:${uid}`;

function readLocal(uid: string): CustomLedger[] {
  try { return JSON.parse(window.localStorage.getItem(localKey(uid)) || '[]'); } catch { return []; }
}
function writeLocal(uid: string, list: CustomLedger[]) {
  try { window.localStorage.setItem(localKey(uid), JSON.stringify(list)); } catch { /* ignore */ }
}

export type Store = 'db' | 'local';

export async function loadLedgers(supabase: Client, uid: string): Promise<{ list: CustomLedger[]; store: Store }> {
  const { data, error } = await supabase
    .from('custom_ledgers')
    .select('id, name, icon, kind, direction, preset, entries')
    .eq('user_id', uid)
    .order('created_at', { ascending: true });
  if (error) return { list: readLocal(uid), store: 'local' };
  return { list: ((data as CustomLedger[]) ?? []).map((l) => ({ ...l, entries: l.entries ?? [] })), store: 'db' };
}

/** Writes one ledger; returns the store that accepted it. */
export async function saveLedger(supabase: Client, uid: string, store: Store, ledger: CustomLedger, all: CustomLedger[]): Promise<Store> {
  const nextAll = all.some((l) => l.id === ledger.id) ? all.map((l) => (l.id === ledger.id ? ledger : l)) : [...all, ledger];
  if (store === 'db') {
    const { error } = await supabase.from('custom_ledgers').upsert(
      { id: ledger.id, user_id: uid, name: ledger.name, icon: ledger.icon, kind: ledger.kind, direction: ledger.direction, preset: ledger.preset, entries: ledger.entries },
      { onConflict: 'id' },
    );
    if (!error) return 'db';
  }
  writeLocal(uid, nextAll);
  return 'local';
}

export async function deleteLedger(supabase: Client, uid: string, store: Store, id: string, all: CustomLedger[]) {
  if (store === 'db') await supabase.from('custom_ledgers').delete().eq('id', id).eq('user_id', uid);
  else writeLocal(uid, all.filter((l) => l.id !== id));
}

/** The headline a ledger's big button carries. */
export function ledgerHeadline(l: CustomLedger): { value: number | null; label: 'latest' | 'year' } {
  if (l.entries.length === 0) return { value: null, label: l.kind === 'balance' ? 'latest' : 'year' };
  const sorted = [...l.entries].sort((a, b) => a.month.localeCompare(b.month));
  if (l.kind === 'balance') return { value: sorted[sorted.length - 1].amount, label: 'latest' };
  const year = String(new Date().getFullYear());
  return { value: sorted.filter((e) => e.month.startsWith(year)).reduce((a, e) => a + e.amount, 0), label: 'year' };
}
