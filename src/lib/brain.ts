// src/lib/brain.ts
// The Brain's training engine. The Brain is MalMind's mascot and the face
// of all AI interaction - and it literally grows with the user: every
// piece of real data fed into the product, and every conversation held
// with it, earns synapses (XP). Levels unlock visible complexity in the
// floating voxel figure. Everything is computed from real row counts -
// there is no separate "score" stored anywhere.

export interface BrainSourceDef {
  key: string;
  label: string; // how to earn it, phrased as an action
  href: string;
  xpEach: number;
  cap: number; // max XP this source can contribute
}

// Row-count sources: XP = min(count * xpEach, cap)
export const BRAIN_SOURCES: BrainSourceDef[] = [
  { key: 'financial_snapshots', label: 'Log months in My Financial Numbers', href: '/financial-numbers', xpEach: 8, cap: 96 },
  { key: 'advisor_messages', label: 'Talk with the Brain (AI advisor)', href: '/advisor', xpEach: 3, cap: 60 },
  { key: 'story_chapters', label: 'Write chapters of your Financial Story', href: '/story', xpEach: 8, cap: 48 },
  { key: 'income_entries', label: 'Log income months in Lifetime Income', href: '/lifetime-income', xpEach: 4, cap: 48 },
  { key: 'net_worth_snapshots', label: 'Log net worth snapshots', href: '/positioning', xpEach: 6, cap: 48 },
  { key: 'assets', label: 'Add your assets & investments', href: '/holdings', xpEach: 6, cap: 36 },
  { key: 'goal_funds', label: 'Create a goal fund', href: '/goal-fund', xpEach: 10, cap: 30 },
  { key: 'life_phases', label: 'Design your life phases', href: '/standard-of-living?mode=plan', xpEach: 8, cap: 24 },
  { key: 'what_if_scenarios', label: 'Save a What-if scenario', href: '/what-if', xpEach: 8, cap: 24 },
  { key: 'loans', label: 'Add your loans & mortgages', href: '/commitments', xpEach: 5, cap: 20 },
  { key: 'liabilities', label: 'Record what you owe', href: '/holdings', xpEach: 4, cap: 20 },
  { key: 'subscriptions', label: 'List your subscriptions', href: '/commitments', xpEach: 3, cap: 18 },
  { key: 'expenses', label: 'Capture recurring expenses', href: '/holdings', xpEach: 3, cap: 18 },
  { key: 'credit_cards', label: 'Add your credit cards', href: '/commitments', xpEach: 4, cap: 12 },
  { key: 'year_plans', label: 'Set this year\'s master plan', href: '/year-plan', xpEach: 10, cap: 10 },
];

// Profile-field sources: XP granted when the field is set.
export const BRAIN_PROFILE_FIELDS: { key: string; label: string; xp: number }[] = [
  { key: 'monthly_income', label: 'Set your monthly income', xp: 15 },
  { key: 'liquid_savings', label: 'Set your liquid savings', xp: 10 },
  { key: 'monthly_debt_payments', label: 'Set your monthly debt payments', xp: 10 },
  { key: 'has_health_insurance', label: 'Answer the insurance question (Risks)', xp: 10 },
  { key: 'age', label: 'Set your age', xp: 5 },
  { key: 'monthly_housing_payment', label: 'Set your housing payment', xp: 5 },
  { key: 'monthly_investment_contribution', label: 'Set your monthly investing', xp: 5 },
];

export interface BrainLevel {
  level: number;
  name: string;
  minXp: number;
  blurb: string;
}

export const BRAIN_LEVELS: BrainLevel[] = [
  { level: 1, name: 'Spark', minXp: 0, blurb: 'A newborn mind. Feed it your first numbers and watch it take shape.' },
  { level: 2, name: 'Forming', minXp: 40, blurb: 'The first folds are forming. It knows who you are — barely.' },
  { level: 3, name: 'Thinking', minXp: 110, blurb: 'Grooves and patterns. It can follow your money now.' },
  { level: 4, name: 'Reasoning', minXp: 200, blurb: 'Synapses firing. It connects your tools to each other.' },
  { level: 5, name: 'Wise', minXp: 320, blurb: 'Ideas orbit it. It sees around corners you haven\'t turned yet.' },
  { level: 6, name: 'Mastermind', minXp: 460, blurb: 'Fully lit. Few Brains ever get this well-fed.' },
];

export interface BrainSourceStatus {
  label: string; // English fallback label
  i18nKey: string; // dictionary key so the UI can localize the label
  href: string;
  earned: number;
  possible: number;
}

export interface BrainStats {
  xp: number;
  maxXp: number;
  level: BrainLevel;
  nextLevel: BrainLevel | null;
  progressToNext: number; // 0..1 within current level band
  suggestions: BrainSourceStatus[]; // best next feeds, highest headroom first
}

export function computeBrainStats(
  counts: Record<string, number>,
  profile: Record<string, unknown> | null
): BrainStats {
  let xp = 0;
  const statuses: BrainSourceStatus[] = [];

  for (const s of BRAIN_SOURCES) {
    const earned = Math.min((counts[s.key] ?? 0) * s.xpEach, s.cap);
    xp += earned;
    statuses.push({ label: s.label, i18nKey: `brain.src.${s.key}`, href: s.href, earned, possible: s.cap });
  }

  for (const f of BRAIN_PROFILE_FIELDS) {
    const v = profile?.[f.key];
    const set = v !== null && v !== undefined && v !== '' && !(typeof v === 'number' && v === 0);
    if (set) xp += f.xp;
    statuses.push({ label: f.label, i18nKey: `brain.field.${f.key}`, href: '/home', earned: set ? f.xp : 0, possible: f.xp });
  }

  const maxXp =
    BRAIN_SOURCES.reduce((s, x) => s + x.cap, 0) + BRAIN_PROFILE_FIELDS.reduce((s, x) => s + x.xp, 0);

  let level = BRAIN_LEVELS[0];
  for (const l of BRAIN_LEVELS) if (xp >= l.minXp) level = l;
  const nextLevel = BRAIN_LEVELS.find((l) => l.minXp > xp) ?? null;
  const progressToNext = nextLevel
    ? Math.min(1, (xp - level.minXp) / (nextLevel.minXp - level.minXp))
    : 1;

  const suggestions = statuses
    .filter((s) => s.possible - s.earned > 0)
    .sort((a, b) => b.possible - b.earned - (a.possible - a.earned))
    .slice(0, 3);

  return { xp, maxXp, level, nextLevel, progressToNext, suggestions };
}

// ── The voxel body ───────────────────────────────────────────────────
// A deterministic blocky brain: an ellipsoid of unit voxels with a
// central fissure, sorted core-out so lower levels render a smaller,
// simpler blob and higher levels grow the full anatomy.

export interface Voxel {
  x: number;
  y: number;
  z: number;
  kind: 'flesh' | 'groove' | 'synapse';
}

function buildVoxels(): Voxel[] {
  const out: Voxel[] = [];
  for (let x = -3; x <= 3; x++) {
    if (x === 0) continue; // the fissure between hemispheres
    for (let y = 0; y <= 3; y++) {
      for (let z = -2; z <= 2; z++) {
        const e = (x / 3.6) ** 2 + ((y - 1.4) / 2.1) ** 2 + (z / 2.5) ** 2;
        if (e > 1) continue;
        const isGroove = (Math.abs(x) + y * 2 + Math.abs(z)) % 4 === 0;
        const isSurface = e > 0.55;
        const isSynapse = isSurface && (x * 7 + y * 5 + z * 3) % 6 === 0;
        out.push({ x, y, z, kind: isSynapse ? 'synapse' : isGroove ? 'groove' : 'flesh' });
      }
    }
  }
  // core-out ordering so slicing the array grows the brain naturally
  return out.sort(
    (a, b) =>
      a.x ** 2 + (a.y - 1.4) ** 2 + a.z ** 2 - (b.x ** 2 + (b.y - 1.4) ** 2 + b.z ** 2)
  );
}

export const BRAIN_VOXELS: Voxel[] = buildVoxels();

// What each level renders.
export function brainAppearance(level: number) {
  const total = BRAIN_VOXELS.length;
  return {
    voxelCount: Math.max(6, Math.round(total * [0.35, 0.6, 0.8, 1, 1, 1][Math.min(level, 6) - 1])),
    showGrooves: level >= 3,
    showSynapses: level >= 4,
    orbitals: level >= 6 ? 2 : level >= 5 ? 1 : 0,
    glow: level >= 6,
  };
}
