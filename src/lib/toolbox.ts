// src/lib/toolbox.ts
// The canonical tool drawer: every feature page, which time view it belongs
// to, and the iceberg depth at which it surfaces. Plain data — shared by the
// hub drawers (HubPage) and the iceberg's dive (DepthRail) so both always
// tell the same story about what lives at each depth.

import type { DepthLevel } from '@/lib/depth';

export type ViewKey = 'past' | 'today' | 'future';

export interface HubTool {
  href: string;
  icon: string;
  titleKey: string;
  descKey: string;
  // The iceberg depth at which this tool surfaces: 1 essentials ·
  // 2 getting organized · 3 analysis · 4 full mastery. Drawers show tools
  // whose depth ≤ the chosen depth — nothing is ever inaccessible, diving
  // deeper simply reveals more.
  depth?: DepthLevel;
}

// The product as a 3×4 matrix — time (past · today · future) crossed with
// depth (essentials · organized · analysis · mastery). Each cell is a chunk
// of the full product; sinking one depth level opens the next band of
// complexity across all three time views at once:
//   D1 the picture   — your story & ledger · what you own/owe · the dream
//   D2 the discipline — daily choices, exposure & living standard · budgets, plans, comparisons
//   D3 the reading    — the earned arc · ratios, peers, velocity · scenarios
//   D4 the mastery    — borrowing power · allocation engines (waterfall, doubling)
export const TOOLS: Record<ViewKey, HubTool[]> = {
  past: [
    { href: '/story', icon: '📖', titleKey: 'home.card.story.title', descKey: 'home.card.story.desc' },
    { href: '/financial-numbers', icon: '📒', titleKey: 'hub.card.financialNumbers.title', descKey: 'hub.card.financialNumbers.desc' },
    { href: '/lifetime-income', icon: '💰', titleKey: 'home.card.lifetimeIncome.title', descKey: 'home.card.lifetimeIncome.desc', depth: 3 },
  ],
  today: [
    { href: '/holdings', icon: '💼', titleKey: 'hub.card.holdings.title', descKey: 'hub.card.holdings.desc' },
    { href: '/commitments', icon: '🧾', titleKey: 'hub.card.commitments.title', descKey: 'hub.card.commitments.desc' },
    { href: '/daily-stack', icon: '🥞', titleKey: 'hub.card.dailyStack.title', descKey: 'hub.card.dailyStack.desc', depth: 2 },
    { href: '/risks', icon: '🛡', titleKey: 'hub.card.risks.title', descKey: 'hub.card.risks.desc', depth: 2 },
    { href: '/standard-of-living?mode=track', icon: '🪜', titleKey: 'hub.card.solTracked.title', descKey: 'hub.card.solTracked.desc', depth: 2 },
    { href: '/positioning', icon: '📊', titleKey: 'home.card.positioning.title', descKey: 'home.card.positioning.desc', depth: 3 },
    { href: '/ratios', icon: '🩺', titleKey: 'home.card.ratios.title', descKey: 'home.card.ratios.desc', depth: 3 },
    { href: '/velocity', icon: '⏱', titleKey: 'home.card.velocity.title', descKey: 'home.card.velocity.desc', depth: 3 },
    { href: '/credit', icon: '📇', titleKey: 'hub.card.credit.title', descKey: 'hub.card.credit.desc', depth: 4 },
    { href: '/markets', icon: '🌐', titleKey: 'hub.card.markets.title', descKey: 'hub.card.markets.desc', depth: 3 },
    { href: '/subscriptions', icon: '📅', titleKey: 'hub.card.subs.title', descKey: 'hub.card.subs.desc', depth: 2 },
    { href: '/credit-cards', icon: '💳', titleKey: 'hub.card.cards.title', descKey: 'hub.card.cards.desc', depth: 2 },
    { href: '/class', icon: '🎖', titleKey: 'hub.card.class.title', descKey: 'hub.card.class.desc', depth: 3 },
    { href: '/salaries', icon: '🪙', titleKey: 'hub.card.salaries.title', descKey: 'hub.card.salaries.desc', depth: 2 },
    { href: '/insurance', icon: '☂️', titleKey: 'hub.card.insurance.title', descKey: 'hub.card.insurance.desc', depth: 2 },
    { href: '/poverty', icon: '🛟', titleKey: 'hub.card.poverty.title', descKey: 'hub.card.poverty.desc', depth: 3 },
  ],
  future: [
    { href: '/freedom', icon: '🕊', titleKey: 'hub.card.freedom.title', descKey: 'hub.card.freedom.desc' },
    { href: '/goal-fund', icon: '🎯', titleKey: 'home.card.goalFund.title', descKey: 'home.card.goalFund.desc' },
    { href: '/budgeting', icon: '🛋', titleKey: 'home.card.budgeting.title', descKey: 'home.card.budgeting.desc', depth: 2 },
    { href: '/year-plan', icon: '🗓', titleKey: 'home.card.yearPlan.title', descKey: 'home.card.yearPlan.desc', depth: 2 },
    { href: '/compare', icon: '⚖️', titleKey: 'hub.card.compare.title', descKey: 'hub.card.compare.desc', depth: 2 },
    { href: '/standard-of-living?mode=plan', icon: '🪜', titleKey: 'home.card.sol.title', descKey: 'home.card.sol.desc', depth: 2 },
    { href: '/what-if', icon: '🔮', titleKey: 'hub.card.whatIf.title', descKey: 'hub.card.whatIf.desc', depth: 3 },
    { href: '/lifetime-income', icon: '🛤', titleKey: 'hub.card.incomeAhead.title', descKey: 'hub.card.incomeAhead.desc', depth: 3 },
    { href: '/doubling-path', icon: '📈', titleKey: 'home.card.doubling.title', descKey: 'home.card.doubling.desc', depth: 4 },
    { href: '/waterfall', icon: '💧', titleKey: 'home.card.waterfall.title', descKey: 'home.card.waterfall.desc', depth: 4 },
    { href: '/luxury', icon: '👑', titleKey: 'hub.card.luxury.title', descKey: 'hub.card.luxury.desc', depth: 4 },
    { href: '/business', icon: '🚀', titleKey: 'hub.card.business.title', descKey: 'hub.card.business.desc', depth: 2 },
    { href: '/mortgage', icon: '🏠', titleKey: 'hub.card.mortgage.title', descKey: 'hub.card.mortgage.desc', depth: 3 },
    { href: '/auto-loan', icon: '🚙', titleKey: 'hub.card.autoLoan.title', descKey: 'hub.card.autoLoan.desc', depth: 2 },
    { href: '/retirement', icon: '🌅', titleKey: 'hub.card.retirement.title', descKey: 'hub.card.retirement.desc', depth: 2 },
    { href: '/gosi', icon: '🏛', titleKey: 'hub.card.gosi.title', descKey: 'hub.card.gosi.desc', depth: 2 },
    { href: '/family', icon: '👨‍👩‍👧', titleKey: 'hub.card.family.title', descKey: 'hub.card.family.desc', depth: 2 },
  ],
};

// Everything that surfaces exactly AT a given depth (the "newly unlocked"
// set the dive shows per level), preserving hub order.
export function toolsUnlockedAt(depth: DepthLevel): Record<ViewKey, HubTool[]> {
  const at = (v: ViewKey) => TOOLS[v].filter((tl) => (tl.depth ?? 1) === depth);
  return { past: at('past'), today: at('today'), future: at('future') };
}

export function countStaged(view: ViewKey, depth: DepthLevel): number {
  return TOOLS[view].filter((tl) => (tl.depth ?? 1) <= depth).length;
}

// The full 3×4 matrix as counts — how many tools live in each (time, depth)
// cell. Feeds the dive's product map.
export function toolMatrix(): Record<ViewKey, Record<DepthLevel, number>> {
  const cell = (v: ViewKey, d: DepthLevel) => TOOLS[v].filter((tl) => (tl.depth ?? 1) === d).length;
  const row = (v: ViewKey) => ({ 1: cell(v, 1), 2: cell(v, 2), 3: cell(v, 3), 4: cell(v, 4) });
  return { past: row('past'), today: row('today'), future: row('future') };
}
