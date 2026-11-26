// The app's single source of state: who you are (a demo persona or a
// signed-in account) and your financial record. Two backends behind one
// interface:
//   · demo — the website's four personas (shared demoWorld.ts), held in
//            memory; edits persist until you leave the persona
//   · live — the same Supabase tables malmind.ai reads and writes
// Screens read `data` and call the actions; none of them knows which
// backend is behind it.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';

import { buildDemoDb, getPersona } from '@shared/demoWorld';
import type { CustomLedger } from '@shared/ledgerPresets';
import { kv } from '@/lib/kv';
import { supabase, supabaseConfigured } from '@/lib/supabase';

export type Mode = 'loading' | 'signedOut' | 'demo' | 'live';

export const FIELDS = ['cash', 'stocks', 'equity', 'real_estate', 'other_assets', 'liabilities', 'income', 'expenses'] as const;
export type Field = (typeof FIELDS)[number];

export type Snap = { year: number; month: number } & Record<Field, number>;

export interface Profile { name: string | null; age: number | null; careerStartYear: number | null }
export interface Debt { id: string; name: string; kind: 'loan' | 'mortgage' | 'debt' | 'card'; original: number | null; balance: number; monthly: number }
export interface CreditReport { date: string; score: number }
export interface Subscription { name: string; amount: number; cycle: string }

export interface Data {
  snaps: Snap[]; // ascending by month
  profile: Profile;
  credit: CreditReport[]; // ascending by date
  debts: Debt[];
  subs: Subscription[];
  ledgers: CustomLedger[];
  /** Where custom ledgers are kept: the account, this phone, or demo memory. */
  ledgerStore: 'db' | 'device' | 'memory';
}

const EMPTY: Data = {
  snaps: [], profile: { name: null, age: null, careerStartYear: null },
  credit: [], debts: [], subs: [], ledgers: [], ledgerStore: 'memory',
};

type Row = Record<string, unknown>;
const num = (v: unknown) => Number(v) || 0;
const optNum = (v: unknown) => (v == null || v === '' ? null : Number(v));

function toSnap(r: Row): Snap {
  const s = { year: num(r.year), month: num(r.month) } as Snap;
  for (const f of FIELDS) s[f] = num(r[f]);
  return s;
}
const byMonth = (a: Snap, b: Snap) => a.year - b.year || a.month - b.month;

function shape(t: {
  snaps: Row[]; profile: Row | null; credit: Row[]; loans: Row[]; liabs: Row[]; cards: Row[]; subs: Row[];
}): Omit<Data, 'ledgers' | 'ledgerStore'> {
  return {
    snaps: t.snaps.map(toSnap).sort(byMonth),
    profile: {
      name: (t.profile?.name as string | null) ?? null,
      age: optNum(t.profile?.age),
      careerStartYear: optNum(t.profile?.career_start_year),
    },
    credit: t.credit
      .filter((r) => r.molim_score != null)
      .map((r) => ({ date: String(r.report_date), score: num(r.molim_score) }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    debts: [
      ...t.loans.map((r) => ({
        id: `loan-${r.id}`, name: String(r.name), kind: (r.loan_type === 'mortgage' ? 'mortgage' : 'loan') as Debt['kind'],
        original: num(r.original_amount) > 0 ? num(r.original_amount) : null, balance: num(r.balance), monthly: num(r.monthly_payment),
      })),
      ...t.liabs.map((r) => ({
        id: `liab-${r.id}`, name: String(r.name), kind: 'debt' as const,
        original: num(r.original_amount) > 0 ? num(r.original_amount) : null, balance: num(r.balance), monthly: num(r.monthly_payment),
      })),
      ...t.cards.map((r) => ({
        id: `card-${r.id}`, name: String(r.name), kind: 'card' as const,
        original: num(r.credit_limit) > 0 ? num(r.credit_limit) : null, balance: num(r.balance), monthly: num(r.min_payment),
      })),
    ],
    subs: t.subs.map((r) => ({ name: String(r.name), amount: num(r.amount), cycle: String(r.billing_cycle ?? 'monthly') })),
  };
}

// ── demo backend: the persona's world, in memory ──
let demoDb: Record<string, Row[]> | null = null;
let demoFor: string | null = null;
function demoTables(personaId: string) {
  if (!demoDb || demoFor !== personaId) {
    demoDb = buildDemoDb(personaId);
    demoFor = personaId;
  }
  return demoDb;
}

// ── live backend: Supabase, with a device fallback for custom ledgers ──
const deviceLedgerKey = (uid: string) => `mm-custom-ledgers:${uid}`;
function readDeviceLedgers(uid: string): CustomLedger[] {
  try { return JSON.parse(kv.getItem(deviceLedgerKey(uid)) || '[]'); } catch { return []; }
}
function writeDeviceLedgers(uid: string, list: CustomLedger[]) {
  try { kv.setItem(deviceLedgerKey(uid), JSON.stringify(list)); } catch { /* ignore */ }
}

async function loadLive(uid: string): Promise<Data> {
  const q = (table: string, cols: string) => supabase.from(table).select(cols).eq('user_id', uid);
  const [snaps, profile, credit, loans, liabs, cards, subs, ledgers] = await Promise.all([
    q('financial_snapshots', 'year, month, cash, stocks, equity, real_estate, other_assets, liabilities, income, expenses'),
    supabase.from('profiles').select('name, age, career_start_year').eq('id', uid).maybeSingle(),
    q('credit_snapshots', 'report_date, molim_score'),
    q('loans', 'id, name, loan_type, original_amount, balance, monthly_payment'),
    q('liabilities', 'id, name, original_amount, balance, monthly_payment'),
    q('credit_cards', 'id, name, balance, credit_limit, min_payment'),
    q('subscriptions', 'name, amount, billing_cycle'),
    supabase.from('custom_ledgers').select('id, name, icon, kind, direction, preset, entries').eq('user_id', uid).order('created_at', { ascending: true }),
  ]);
  const rows = (r: { data: unknown }) => ((r.data as Row[] | null) ?? []);
  // the custom_ledgers table arrives with schema_part21.sql; until then,
  // ledgers live on this phone
  const ledgerStore: Data['ledgerStore'] = ledgers.error ? 'device' : 'db';
  return {
    ...shape({
      snaps: rows(snaps), profile: (profile.data as Row | null) ?? null, credit: rows(credit),
      loans: rows(loans), liabs: rows(liabs), cards: rows(cards), subs: rows(subs),
    }),
    ledgers: ledgerStore === 'db'
      ? rows(ledgers).map((l) => ({ ...(l as unknown as CustomLedger), entries: (l.entries as CustomLedger['entries']) ?? [] }))
      : readDeviceLedgers(uid),
    ledgerStore,
  };
}

function loadDemo(personaId: string): Data {
  const db = demoTables(personaId);
  const t = (name: string) => db[name] ?? [];
  return {
    ...shape({
      snaps: t('financial_snapshots'), profile: t('profiles')[0] ?? null, credit: t('credit_snapshots'),
      loans: t('loans'), liabs: t('liabilities'), cards: t('credit_cards'), subs: t('subscriptions'),
    }),
    ledgers: (t('custom_ledgers') as unknown as CustomLedger[]) ?? [],
    ledgerStore: 'memory',
  };
}

// ── the context ──
interface Store {
  mode: Mode;
  personaId: string | null;
  email: string | null;
  data: Data;
  refreshing: boolean;
  refresh: () => Promise<void>;
  enterDemo: (personaId: string) => void;
  leaveDemo: () => void;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  /** Upserts whole months (one per year+month). Returns an error message or null. */
  saveMonths: (snaps: Snap[]) => Promise<string | null>;
  deleteMonth: (year: number, month: number) => Promise<string | null>;
  saveLedger: (ledger: CustomLedger) => Promise<void>;
  deleteLedger: (id: string) => Promise<void>;
}

const Ctx = createContext<Store | null>(null);
const PERSONA_KEY = 'mm-demo-persona';

export function AppProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>('loading');
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [data, setData] = useState<Data>(EMPTY);
  const [refreshing, setRefreshing] = useState(false);
  // the ledger actions merge into the latest list without re-subscribing
  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);

  const uid = session?.user.id ?? null;

  const load = useCallback(async (m: Mode, persona: string | null, userId: string | null) => {
    if (m === 'demo' && persona) setData(loadDemo(persona));
    else if (m === 'live' && userId) setData(await loadLive(userId));
    else setData(EMPTY);
  }, []);

  // boot: a remembered persona wins; otherwise a stored session; otherwise the welcome door
  useEffect(() => {
    let persona: string | null = null;
    try { persona = kv.getItem(PERSONA_KEY); } catch { /* ignore */ }
    (async () => {
      const { data: { session: s } } = supabaseConfigured
        ? await supabase.auth.getSession()
        : { data: { session: null } };
      setSession(s);
      if (persona) {
        setPersonaId(persona);
        setMode('demo');
        await load('demo', persona, null);
      } else if (s) {
        setMode('live');
        await load('live', null, s.user.id);
      } else {
        setMode('signedOut');
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try { await load(mode, personaId, uid); } finally { setRefreshing(false); }
  }, [load, mode, personaId, uid]);

  const store = useMemo<Store>(() => ({
    mode, personaId, email: session?.user.email ?? null, data, refreshing, refresh,

    enterDemo: (id) => {
      try { kv.setItem(PERSONA_KEY, id); } catch { /* ignore */ }
      demoDb = null; // a fresh, untouched world each time
      setPersonaId(id);
      setMode('demo');
      setData(loadDemo(id));
    },

    leaveDemo: () => {
      try { kv.removeItem(PERSONA_KEY); } catch { /* ignore */ }
      demoDb = null;
      setPersonaId(null);
      if (session) { setMode('live'); load('live', null, session.user.id); }
      else { setMode('signedOut'); setData(EMPTY); }
    },

    signIn: async (email, password) => {
      if (!supabaseConfigured) return 'The app has no Supabase keys (mobile/.env.local).';
      const { data: res, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error || !res.session) return error?.message ?? 'Sign-in failed.';
      try { kv.removeItem(PERSONA_KEY); } catch { /* ignore */ }
      setPersonaId(null);
      setSession(res.session);
      setMode('live');
      await load('live', null, res.session.user.id);
      return null;
    },

    signOut: async () => {
      await supabase.auth.signOut();
      setSession(null);
      setMode('signedOut');
      setData(EMPTY);
    },

    saveMonths: async (snaps) => {
      if (snaps.length === 0) return null;
      if (mode === 'demo' && personaId) {
        const rows = demoTables(personaId).financial_snapshots;
        for (const s of snaps) {
          const at = rows.findIndex((r) => num(r.year) === s.year && num(r.month) === s.month);
          if (at >= 0) rows[at] = { ...rows[at], ...s };
          else rows.push({ id: `demo-${s.year}-${s.month}`, user_id: `demo-${personaId}`, ...s });
        }
      } else if (mode === 'live' && uid) {
        const { error } = await supabase.from('financial_snapshots').upsert(
          snaps.map((s) => ({ user_id: uid, ...s })),
          { onConflict: 'user_id,year,month' },
        );
        if (error) return error.message;
      } else return 'Not signed in.';
      setData((d) => {
        const keep = d.snaps.filter((x) => !snaps.some((s) => s.year === x.year && s.month === x.month));
        return { ...d, snaps: [...keep, ...snaps].sort(byMonth) };
      });
      return null;
    },

    deleteMonth: async (year, month) => {
      if (mode === 'demo' && personaId) {
        const db = demoTables(personaId);
        db.financial_snapshots = db.financial_snapshots.filter((r) => !(num(r.year) === year && num(r.month) === month));
      } else if (mode === 'live' && uid) {
        const { error } = await supabase.from('financial_snapshots').delete().eq('user_id', uid).eq('year', year).eq('month', month);
        if (error) return error.message;
      } else return 'Not signed in.';
      setData((d) => ({ ...d, snaps: d.snaps.filter((x) => !(x.year === year && x.month === month)) }));
      return null;
    },

    saveLedger: async (ledger) => {
      const all = dataRef.current.ledgers.some((l) => l.id === ledger.id)
        ? dataRef.current.ledgers.map((l) => (l.id === ledger.id ? ledger : l))
        : [...dataRef.current.ledgers, ledger];
      setData((d) => ({ ...d, ledgers: all }));
      if (mode === 'demo' && personaId) {
        demoTables(personaId).custom_ledgers = all as unknown as Row[];
      } else if (mode === 'live' && uid) {
        if (dataRef.current.ledgerStore === 'db') {
          const { error } = await supabase.from('custom_ledgers').upsert(
            { id: ledger.id, user_id: uid, name: ledger.name, icon: ledger.icon, kind: ledger.kind, direction: ledger.direction, preset: ledger.preset, entries: ledger.entries },
            { onConflict: 'id' },
          );
          if (!error) return;
          setData((d) => ({ ...d, ledgerStore: 'device' }));
        }
        writeDeviceLedgers(uid, all);
      }
    },

    deleteLedger: async (id) => {
      const all = dataRef.current.ledgers.filter((l) => l.id !== id);
      setData((d) => ({ ...d, ledgers: all }));
      if (mode === 'demo' && personaId) demoTables(personaId).custom_ledgers = all as unknown as Row[];
      else if (mode === 'live' && uid) {
        if (dataRef.current.ledgerStore === 'db') await supabase.from('custom_ledgers').delete().eq('id', id).eq('user_id', uid);
        else writeDeviceLedgers(uid, all);
      }
    },
  }), [mode, personaId, session, data, refreshing, refresh, load, uid]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore must be used within AppProvider');
  return v;
}

/** The first name to greet: the persona's own (localized) or the profile's. */
export function useFirstName(ar: boolean): string | null {
  const { mode, personaId, data } = useStore();
  if (mode === 'demo' && personaId) {
    const p = getPersona(personaId);
    return ar ? p.firstNameAr : p.firstName;
  }
  return data.profile.name ? data.profile.name.trim().split(/\s+/)[0] : null;
}
