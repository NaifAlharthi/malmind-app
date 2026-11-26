// What the Brain's approved plan actually does — applied to the persona's
// demo world, so after the Showcase you can open the app as that person and
// find the plan carried out: the card paid off, the new ledgers, the cash
// moved. Each change mirrors one action in lib/showcase.ts (shared with the
// website), computed from the same demo rows. Demo memory only — a
// signed-in account's data is never touched.

import type { CustomLedger, LedgerEntry } from '@shared/ledgerPresets';

type Row = Record<string, unknown>;
type Db = Record<string, Row[]>;
const num = (v: unknown) => Number(v) || 0;

const ymOf = (r: Row) => `${num(r.year)}-${String(num(r.month)).padStart(2, '0')}`;
function snaps(db: Db): Row[] {
  return [...(db.financial_snapshots ?? [])].sort((a, b) => num(a.year) * 12 + num(a.month) - (num(b.year) * 12 + num(b.month)));
}
function latest(db: Db): Row {
  const s = snaps(db);
  return s[s.length - 1];
}
/** shift fields of the latest month (in place, so the Log shows it) */
function adjustLatest(db: Db, delta: Partial<Record<string, number>>) {
  const row = latest(db);
  for (const [k, v] of Object.entries(delta)) row[k] = num(row[k]) + (v ?? 0);
}
function addLedger(db: Db, personaId: string, l: Omit<CustomLedger, 'id' | 'preset'> & { key: string }) {
  const { key, ...rest } = l;
  const list = (db.custom_ledgers ?? []) as unknown as CustomLedger[];
  const ledger: CustomLedger = { ...rest, id: `showcase-${personaId}-${key}`, preset: null };
  db.custom_ledgers = [...list.filter((x) => x.id !== ledger.id), ledger] as unknown as Row[];
}
const entry = (month: string, amount: number): LedgerEntry => ({ month, amount: Math.round(amount) });

const EFFECTS: Record<string, (db: Db, L: (ar: string, en: string) => string) => void> = {
  // stop the bleed: cancel the overlaps, downgrade the gym, clear the card
  // from savings, start the emergency fund, cap dining
  faisal: (db, L) => {
    const ym = ymOf(latest(db));
    const cut = new Set(['Shahid VIP', 'Anghami Plus', 'PlayStation Plus']);
    db.subscriptions = (db.subscriptions ?? [])
      .filter((s) => !cut.has(String(s.name)))
      .map((s) => (s.name === 'Gym (premium)' ? { ...s, name: 'Gym (standard)', amount: 150 } : s));
    const card = (db.credit_cards ?? [])[0];
    const owed = card ? num(card.balance) : 0;
    db.credit_cards = (db.credit_cards ?? []).map((c) => ({ ...c, balance: 0 }));
    db.liabilities = (db.liabilities ?? []).map((l) => (l.kind === 'credit_card' ? { ...l, balance: 0, monthly_payment: 0 } : l));
    adjustLatest(db, { cash: -owed, liabilities: -owed });
    addLedger(db, 'faisal', { key: 'emergency', name: L('صندوق الطوارئ', 'Emergency fund'), icon: '🛟', kind: 'balance', direction: null, entries: [entry(ym, 500)] });
    // the dining history the cap now governs
    const dining = num((db.expenses ?? []).find((e) => e.name === 'Dining & cafés')?.amount) || 2200;
    addLedger(db, 'faisal', {
      key: 'dining', name: L('المطاعم والمقاهي (سقف 1,400)', 'Dining & cafés (cap 1,400)'), icon: '🍽', kind: 'flow', direction: 'out',
      entries: snaps(db).slice(-6).map((s) => entry(ymOf(s), dining)),
    });
  },

  // the decision, made: the education fund opens at 1,500 a month
  reem: (db, L) => {
    const ym = ymOf(latest(db));
    const s = latest(db);
    const start = num(s.income) - num(s.expenses) + 700;
    addLedger(db, 'reem', { key: 'education', name: L('تعليم الأبناء', "Kids' education"), icon: '🎓', kind: 'balance', direction: null, entries: [entry(ym, start)] });
  },

  // numbers that tell the truth: the unlogged side income, back-filled;
  // the smoothing buffer; the first pay-yourself-first transfer
  layla: (db, L) => {
    const all = snaps(db);
    const first = all[0];
    const last = all[all.length - 1];
    const logged = all.slice(1).reduce((a, s) => a + num(s.income) - num(s.expenses), 0);
    const unlogged = (num(last.cash) - num(first.cash) - logged) / (all.length - 1);
    const spendAvg = all.reduce((a, s) => a + num(s.expenses), 0) / all.length;
    const incAvg = all.reduce((a, s) => a + num(s.income), 0) / all.length;
    const ym = ymOf(last);
    addLedger(db, 'layla', {
      key: 'side', name: L('المشاريع الجانبية', 'Side projects'), icon: '💻', kind: 'flow', direction: 'in',
      entries: all.slice(1).map((s) => entry(ymOf(s), unlogged)),
    });
    addLedger(db, 'layla', { key: 'buffer', name: L('وسادة التنعيم', 'Smoothing buffer'), icon: '🛟', kind: 'balance', direction: null, entries: [entry(ym, spendAvg)] });
    addLedger(db, 'layla', { key: 'first10k', name: L('أول 10 آلاف', 'First 10,000'), icon: '🎯', kind: 'balance', direction: null, entries: [entry(ym, (incAvg + unlogged) * 0.15)] });
  },

  // the wealth, put to work: pay down the Murabaha, diversify the idle
  // cash (60% sukuk, 40% global index), and open the waqf
  khalid: (db, L) => {
    const s = latest(db);
    const ym = ymOf(s);
    const reserve = num(s.expenses) * 6;
    const idle = num(s.cash) - reserve;
    const payDown = 300000;
    const diversify = idle - payDown;
    adjustLatest(db, { cash: -idle, liabilities: -payDown, other_assets: diversify * 0.6, stocks: diversify * 0.4 });
    db.loans = (db.loans ?? []).map((l) => {
      if (!String(l.name).startsWith('Stock finance')) return l;
      const bal = num(l.balance);
      return { ...l, balance: bal - payDown, monthly_payment: Math.round(num(l.monthly_payment) * ((bal - payDown) / bal)) };
    });
    const rental = num((db.assets ?? []).find((a) => a.name === 'Rental building (Riyadh)')?.value);
    addLedger(db, 'khalid', { key: 'waqf', name: L('الوقف العائلي', 'Family waqf'), icon: '🕌', kind: 'flow', direction: 'out', entries: [entry(ym, (rental * 0.06 * 0.2) / 12)] });
    addLedger(db, 'khalid', { key: 'diversified', name: L('صكوك ومؤشر عالمي', 'Sukuk & global index'), icon: '🌍', kind: 'balance', direction: null, entries: [entry(ym, diversify)] });
  },
};

/** The approved plan's changes for a scenario, as a demo-world mutation. */
export function showcaseEffect(scenarioId: string, ar: boolean): (db: Db) => void {
  const fx = EFFECTS[scenarioId];
  return (db) => fx?.(db, (a, e) => (ar ? a : e));
}

/** Where, after the plan, the change shows — per scenario, on the phone. */
export const SHOWCASE_SEE: Record<string, { ar: string; en: string }> = {
  faisal: { ar: 'السِّجل: البطاقة مسدّدة، ودفترا «صندوق الطوارئ» و«المطاعم» جديدان', en: 'The Log: the card paid off, new Emergency-fund and Dining ledgers' },
  reem: { ar: 'السِّجل: دفتر «تعليم الأبناء» بأول ١٬٥٠٠', en: "The Log: a Kids' education ledger with its first 1,500" },
  layla: { ar: 'السِّجل: دخل المشاريع الجانبية مسجّلاً، والوسادة، و«أول ١٠ آلاف»', en: 'The Log: side-project income logged, the buffer, and First 10,000' },
  khalid: { ar: 'السِّجل واليوم: التمويل أقل، والنقد موظَّف، ووقف عائلي', en: 'The Log and Today: less debt, the cash at work, a family waqf' },
};

/** Where the closing button lands: the Log, with the plan's new ledger open. */
export const SHOWCASE_OPEN: Record<string, string> = {
  faisal: '/log?spot=custom:showcase-faisal-emergency',
  reem: '/log?spot=custom:showcase-reem-education',
  layla: '/log?spot=custom:showcase-layla-side',
  khalid: '/log?spot=custom:showcase-khalid-diversified',
};

/** The Brain's links to website-only screens, kept inside the app. */
export const IN_APP: Record<string, string> = { '/what-if': '/log', '/holdings': '/log', '/ratios': '/today' };
