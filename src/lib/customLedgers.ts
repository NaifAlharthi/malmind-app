// src/lib/customLedgers.ts
// User-created ledgers — the areas of a financial life the fixed Log
// lines don't name: gold, crypto, end-of-service, rent coming in, school
// fees going out, zakat. Two kinds:
//   · balance — a value you re-state over time (what is it worth now?)
//   · flow    — amounts that come in or go out, month by month
// Each ledger keeps its own entries (one per month; re-entering a month
// replaces it). Stored in Supabase (supabase/schema_part21.sql); until
// that table exists, the ledgers live in this browser instead, so the
// feature works before the migration is run. The shapes and presets live
// in ledgerPresets.ts, shared with the iPhone app.

import type { createClient } from '@/lib/supabase/client';
import type { CustomLedger } from '@/lib/ledgerPresets';

export { PRESETS, CUSTOM_ICONS, ledgerHeadline } from '@/lib/ledgerPresets';
export type { LedgerEntry, CustomLedger, Preset } from '@/lib/ledgerPresets';

type Client = ReturnType<typeof createClient>;

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
