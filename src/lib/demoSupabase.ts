// src/lib/demoSupabase.ts
// Guest demo mode's engine. When the demo flag is on, createClient() (in
// lib/supabase/client.ts) returns this in-memory mock instead of the real
// Supabase browser client. It mimics the small slice of the Supabase API
// the app actually uses - auth.getUser/signOut and the from().select()...
// query-builder chains - backed by Sara's demo dataset. Every page then
// renders fully populated with zero changes, and writes mutate the
// in-memory world so the demo is interactive (nothing is ever persisted).

import { buildDemoDb, personaUser } from './demoWorld';

type Row = Record<string, unknown>;
type QueryResult = { data: unknown; error: { message: string } | null };

const DEMO_FLAG = 'mm-demo';
const DEMO_PERSONA_KEY = 'mm-demo-persona';
export const DEMO_STEP_KEY = 'mm-demo-step';
export const DEMO_DONE_KEY = 'mm-demo-done';
const DEFAULT_PERSONA = 'faisal';

export function isDemoActive(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(DEMO_FLAG) === '1';
  } catch {
    return false;
  }
}

// Which persona the guest is exploring as (A·layla, B·faisal, C·reem, D·khalid).
export function getActivePersona(): string {
  if (typeof window === 'undefined') return DEFAULT_PERSONA;
  try {
    return window.localStorage.getItem(DEMO_PERSONA_KEY) || DEFAULT_PERSONA;
  } catch {
    return DEFAULT_PERSONA;
  }
}

export function enterDemo(personaId: string = DEFAULT_PERSONA) {
  window.localStorage.setItem(DEMO_FLAG, '1');
  window.localStorage.setItem(DEMO_PERSONA_KEY, personaId);
  window.localStorage.setItem(DEMO_STEP_KEY, '0');
  window.localStorage.removeItem(DEMO_DONE_KEY);
  db = buildDemoDb(personaId); // fresh world for the chosen persona
}

export function exitDemo() {
  window.localStorage.removeItem(DEMO_FLAG);
  window.localStorage.removeItem(DEMO_PERSONA_KEY);
  window.localStorage.removeItem(DEMO_STEP_KEY);
  window.localStorage.removeItem(DEMO_DONE_KEY);
  db = null;
}

// ── The in-memory world (survives client-side navigation; resets on reload) ──
let db: Record<string, Row[]> | null = null;

function tableRows(table: string): Row[] {
  if (!db) db = buildDemoDb(getActivePersona());
  if (!db[table]) db[table] = [];
  return db[table];
}

// ── Query builder ────────────────────────────────────────────────────
type Op = 'select' | 'insert' | 'upsert' | 'update' | 'delete';

class DemoQuery implements PromiseLike<QueryResult> {
  private op: Op = 'select';
  private payload: Row | Row[] | null = null;
  private patch: Row | null = null;
  private conflictCols: string[] | null = null;
  private filters: Array<(r: Row) => boolean> = [];
  private orders: Array<[string, boolean]> = [];
  private wantSingle = false;
  private returnRows = false;

  constructor(private table: string) {}

  select(_cols?: string) {
    if (this.op !== 'select') this.returnRows = true;
    return this;
  }
  insert(payload: Row | Row[]) {
    this.op = 'insert';
    this.payload = payload;
    return this;
  }
  upsert(payload: Row | Row[], opts?: { onConflict?: string }) {
    this.op = 'upsert';
    this.payload = payload;
    this.conflictCols = opts?.onConflict ? opts.onConflict.split(',').map((s) => s.trim()) : null;
    return this;
  }
  update(patch: Row) {
    this.op = 'update';
    this.patch = patch;
    return this;
  }
  delete() {
    this.op = 'delete';
    return this;
  }
  eq(col: string, val: unknown) {
    this.filters.push((r) => r[col] === val);
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orders.push([col, opts?.ascending !== false]);
    return this;
  }
  single() {
    this.wantSingle = true;
    return this;
  }
  maybeSingle() {
    this.wantSingle = true;
    return this;
  }

  private matching(rows: Row[]): Row[] {
    return rows.filter((r) => this.filters.every((f) => f(r)));
  }

  private exec(): QueryResult {
    const rows = tableRows(this.table);

    if (this.op === 'select') {
      let out = this.matching(rows).slice();
      for (const [col, asc] of this.orders) {
        out.sort((a, b) => {
          const av = a[col] as number | string;
          const bv = b[col] as number | string;
          if (av === bv) return 0;
          return (av > bv ? 1 : -1) * (asc ? 1 : -1);
        });
      }
      // multiple .order() calls: primary first — re-sort stably in reverse order
      if (this.orders.length > 1) {
        out = this.matching(rows).slice().sort((a, b) => {
          for (const [col, asc] of this.orders) {
            const av = a[col] as number | string;
            const bv = b[col] as number | string;
            if (av !== bv) return (av > bv ? 1 : -1) * (asc ? 1 : -1);
          }
          return 0;
        });
      }
      if (this.wantSingle) return { data: out[0] ?? null, error: null };
      return { data: out, error: null };
    }

    if (this.op === 'insert') {
      const uid = personaUser(getActivePersona()).id;
      const list = Array.isArray(this.payload) ? this.payload : [this.payload!];
      const added = list.map((p) => ({
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        user_id: uid,
        ...p,
      }));
      rows.push(...added);
      if (this.returnRows) return { data: this.wantSingle ? added[0] : added, error: null };
      return { data: null, error: null };
    }

    if (this.op === 'upsert') {
      const uid = personaUser(getActivePersona()).id;
      const list = Array.isArray(this.payload) ? this.payload : [this.payload!];
      const cols = this.conflictCols ?? ['id'];
      for (const p of list) {
        const existing = rows.find((r) => cols.every((c) => r[c] === (p as Row)[c]));
        if (existing) {
          Object.assign(existing, p);
        } else {
          rows.push({ id: crypto.randomUUID(), created_at: new Date().toISOString(), user_id: uid, ...p });
        }
      }
      return { data: null, error: null };
    }

    if (this.op === 'update') {
      for (const r of this.matching(rows)) Object.assign(r, this.patch);
      return { data: null, error: null };
    }

    // delete
    const keep = rows.filter((r) => !this.filters.every((f) => f(r)));
    rows.length = 0;
    rows.push(...keep);
    return { data: null, error: null };
  }

  then<T1 = QueryResult, T2 = never>(
    onfulfilled?: ((value: QueryResult) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null
  ): Promise<T1 | T2> {
    return Promise.resolve(this.exec()).then(onfulfilled, onrejected);
  }
}

// ── The mock client ──────────────────────────────────────────────────
// The signed-in "user" reflects whichever persona the guest chose.
function activeDemoUser() {
  return personaUser(getActivePersona());
}

// IMPORTANT: a singleton, matching @supabase/ssr's createBrowserClient
// behaviour. Pages put the client in useEffect/useCallback dependency
// arrays — a fresh object per call would re-fire every effect on every
// render and loop the whole app.
let cachedClient: ReturnType<typeof buildDemoClient> | null = null;

export function createDemoClient() {
  if (!cachedClient) cachedClient = buildDemoClient();
  return cachedClient;
}

function buildDemoClient() {
  return {
    from(table: string) {
      return new DemoQuery(table);
    },
    auth: {
      async getUser() {
        return { data: { user: activeDemoUser() }, error: null };
      },
      async getSession() {
        return { data: { session: { user: activeDemoUser() } }, error: null };
      },
      async signOut() {
        exitDemo();
        return { error: null };
      },
      async signUp() {
        return { data: { user: null }, error: { message: 'Sign-ups are disabled inside the demo — exit the demo first.' } };
      },
      async signInWithPassword() {
        return { data: { user: null }, error: { message: 'Sign-in is disabled inside the demo — exit the demo first.' } };
      },
    },
  };
}
