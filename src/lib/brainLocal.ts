// src/lib/brainLocal.ts
// The web's door to the Brain's local thinking layer: it loads the signed-
// in person's Log and profile, then hands them to the pure composers in
// brainCompose.ts (shared with the iPhone app). Answers come back in the
// rich-message format the advisor page renders — charts, tool chips, and
// /log?spot= pointing — with NO model call, so demo personas get a working
// Brain and real users a fallback when the live model is unreachable.

import { createClient } from '@/lib/supabase/client';
import { buildBrainContext, type BrainContext } from '@/lib/brainCompose';

export { composeLocalReply, composeBriefing, buildBrainContext } from '@/lib/brainCompose';
export type { BrainContext } from '@/lib/brainCompose';

export async function loadBrainContext(): Promise<BrainContext | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data: snapsRaw }, { data: prof }] = await Promise.all([
    supabase.from('financial_snapshots')
      .select('year, month, income, expenses, cash, stocks, equity, real_estate, other_assets, liabilities')
      .eq('user_id', user.id)
      .order('year', { ascending: true }).order('month', { ascending: true }),
    supabase.from('profiles').select('name, age').eq('id', user.id).single(),
  ]);
  return buildBrainContext(
    (snapsRaw as Record<string, unknown>[] | null) ?? [],
    prof as { name: string | null; age: number | null } | null,
  );
}

export function isDemoMode(): boolean {
  try { return window.localStorage.getItem('mm-demo') === '1'; } catch { return false; }
}