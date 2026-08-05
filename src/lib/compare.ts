// src/lib/compare.ts
// The Compare & Decide ENGINE — types and math only. All market data lives in
// lib/compareData.ts (the database of actual Saudi offerings), so growing the
// library is a data entry, never a feature build.

export interface L10n { ar: string; en: string }

export interface CostLine {
  label: L10n;
  amount: number; // SAR; for perUnit lines, SAR per one unit (negative = benefit)
}

export interface UsageOption {
  id: string;
  name: L10n;
  icon: string;
  note?: L10n; // the assumption/fine print behind the numbers
  fixedMonthly: CostLine[];
  perUnit: CostLine[];
}

// A decision where both sides share one usage dial (km driven, meals eaten,
// SAR spent on the card…). Cost(V) = fixed + perUnit × V.
export interface UsageScheme {
  kind: 'usage';
  question: L10n;
  unit: L10n;
  unitShort: L10n;
  minVolume: number;
  maxVolume: number;
  step: number;
  defaultVolume: number;
  options: UsageOption[];
  defaults: [string, string]; // option ids preselected left/right
}

// The currency duel: a loyalty mile as a unit vs the riyal as a unit.
// No routes — what matters is what one mile returns when redeemed.
export interface MilesProgram {
  id: string;
  name: L10n;
  typicalHalalas: [number, number]; // researched typical redemption band
  benchmarkHalalas: number;         // redeem when a redemption beats this
  earnExample: L10n;                // how people actually accumulate them
  note?: L10n;
}
export interface MilesScheme {
  kind: 'miles';
  question: L10n;
  defaultOfferHalalas: number; // starting position of "my redemption" dial
  programs: MilesProgram[];
}

export type Scheme = UsageScheme | MilesScheme;

// A generic life category ("Flying", "Food"…) wrapping one scheme. The chips
// row renders categories; the decision frame lives inside.
export interface Category {
  id: string;
  icon: string;
  name: L10n;
  scheme: Scheme;
}

// ── Math ────────────────────────────────────────────────────────────────
export function fixedTotal(o: UsageOption): number {
  return o.fixedMonthly.reduce((s, l) => s + l.amount, 0);
}
export function perUnitTotal(o: UsageOption): number {
  return o.perUnit.reduce((s, l) => s + l.amount, 0);
}
export function monthlyTotal(o: UsageOption, volume: number): number {
  return fixedTotal(o) + perUnitTotal(o) * volume;
}
export function costPerUnit(o: UsageOption, volume: number): number | null {
  return volume > 0 ? monthlyTotal(o, volume) / volume : null;
}
// Usage level where the two options cost the same; null if they never cross.
export function breakevenVolume(a: UsageOption, b: UsageOption): number | null {
  const slope = perUnitTotal(a) - perUnitTotal(b);
  if (Math.abs(slope) < 1e-9) return null;
  const v = (fixedTotal(b) - fixedTotal(a)) / slope;
  return v > 0 ? v : null;
}
