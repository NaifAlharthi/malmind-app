'use client';

// The three time views — Past / Today / Future — share this hub layout:
//   1. a summary of the section, computed from real data (the main focus);
//   2. an interactivity bar: the Brain beside a prompt field that sends the
//      user's question straight into the advisor;
//   3. a toolbox drawer that opens/closes on demand, holding the full set of
//      feature pages that belong to this view.
// The idea: never overwhelm — lead with meaning, keep power one click away.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { formatDual } from '@/lib/dates';
import { useXMode } from './ExperienceMode';
import { XMODE_RANK } from '@/lib/experienceMode';
import TodayDashboard from '@/components/today/TodayDashboard';

const MiniBrain = dynamic(
  () => import('./BrainCompanion').then((m) => m.MiniBrain),
  { ssr: false, loading: () => <div className="w-16 h-16 shrink-0" /> }
);

export type ViewKey = 'past' | 'today' | 'future';

interface HubTool {
  href: string;
  icon: string;
  titleKey: string;
  descKey: string;
  // Minimum experience mode that surfaces this tool by default:
  // 1 guided · 2 growing · 3 pro. Lower modes stage it behind "more tools" —
  // nothing is ever inaccessible.
  min?: number;
}

const TOOLS: Record<ViewKey, HubTool[]> = {
  past: [
    { href: '/story', icon: '📖', titleKey: 'home.card.story.title', descKey: 'home.card.story.desc' },
    { href: '/financial-numbers', icon: '📒', titleKey: 'hub.card.financialNumbers.title', descKey: 'hub.card.financialNumbers.desc' },
    { href: '/lifetime-income', icon: '💰', titleKey: 'home.card.lifetimeIncome.title', descKey: 'home.card.lifetimeIncome.desc', min: 2 },
  ],
  today: [
    { href: '/holdings', icon: '💼', titleKey: 'hub.card.holdings.title', descKey: 'hub.card.holdings.desc' },
    { href: '/commitments', icon: '🧾', titleKey: 'hub.card.commitments.title', descKey: 'hub.card.commitments.desc' },
    { href: '/positioning', icon: '📊', titleKey: 'home.card.positioning.title', descKey: 'home.card.positioning.desc', min: 2 },
    { href: '/ratios', icon: '🩺', titleKey: 'home.card.ratios.title', descKey: 'home.card.ratios.desc', min: 2 },
    { href: '/risks', icon: '🛡', titleKey: 'hub.card.risks.title', descKey: 'hub.card.risks.desc', min: 2 },
    { href: '/credit', icon: '📇', titleKey: 'hub.card.credit.title', descKey: 'hub.card.credit.desc', min: 3 },
    { href: '/velocity', icon: '⏱', titleKey: 'home.card.velocity.title', descKey: 'home.card.velocity.desc', min: 2 },
    { href: '/standard-of-living?mode=track', icon: '🪜', titleKey: 'hub.card.solTracked.title', descKey: 'hub.card.solTracked.desc', min: 2 },
  ],
  future: [
    { href: '/freedom', icon: '🕊', titleKey: 'hub.card.freedom.title', descKey: 'hub.card.freedom.desc' },
    { href: '/what-if', icon: '🔮', titleKey: 'hub.card.whatIf.title', descKey: 'hub.card.whatIf.desc', min: 2 },
    { href: '/compare', icon: '⚖️', titleKey: 'hub.card.compare.title', descKey: 'hub.card.compare.desc' },
    { href: '/doubling-path', icon: '📈', titleKey: 'home.card.doubling.title', descKey: 'home.card.doubling.desc', min: 3 },
    { href: '/goal-fund', icon: '🎯', titleKey: 'home.card.goalFund.title', descKey: 'home.card.goalFund.desc' },
    { href: '/year-plan', icon: '🗓', titleKey: 'home.card.yearPlan.title', descKey: 'home.card.yearPlan.desc', min: 2 },
    { href: '/waterfall', icon: '💧', titleKey: 'home.card.waterfall.title', descKey: 'home.card.waterfall.desc', min: 3 },
    { href: '/budgeting', icon: '🛋', titleKey: 'home.card.budgeting.title', descKey: 'home.card.budgeting.desc', min: 2 },
    { href: '/standard-of-living?mode=plan', icon: '🪜', titleKey: 'home.card.sol.title', descKey: 'home.card.sol.desc' },
    { href: '/lifetime-income', icon: '🛤', titleKey: 'hub.card.incomeAhead.title', descKey: 'hub.card.incomeAhead.desc', min: 2 },
  ],
};

const VIEW_ICON: Record<ViewKey, string> = { past: '🕰', today: '☀', future: '🔭' };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface Snap {
  year: number;
  month: number;
  cash: number;
  stocks: number;
  real_estate: number;
  equity: number;
  other_assets: number;
  liabilities: number;
  income: number;
  expenses: number;
}

interface Bundle {
  snaps: Snap[];
  chapters: { start_year: number; end_year: number }[];
  goals: number;
  scenarios: number;
  plans: number;
}

interface Tile {
  label: string;
  value: string;
  accent?: string;
  sub?: string;
  big?: boolean;
}

function fmt(n: number) {
  return Math.round(n).toLocaleString();
}

function assetsOf(s: Snap) {
  return Number(s.cash) + Number(s.stocks) + Number(s.real_estate) + Number(s.equity) + Number(s.other_assets);
}

function netWorthOf(s: Snap) {
  return assetsOf(s) - Number(s.liabilities);
}

export default function HubPage({ view }: { view: ViewKey }) {
  const router = useRouter();
  const supabase = createClient();
  const { t, locale } = useLocale();
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [question, setQuestion] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const sar = t('common.sar');
  const money = useCallback(
    (n: number) => (locale === 'ar' ? `${fmt(n)} ${sar}` : `${sar} ${fmt(n)}`),
    [locale, sar]
  );

  // Remember the drawer state per view.
  useEffect(() => {
    try {
      setDrawerOpen(window.localStorage.getItem(`mm-drawer-${view}`) === '1');
    } catch {}
  }, [view]);
  function toggleDrawer() {
    setDrawerOpen((o) => {
      try {
        window.localStorage.setItem(`mm-drawer-${view}`, o ? '0' : '1');
      } catch {}
      return !o;
    });
  }

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const count = async (table: string) => {
        try {
          const { data } = await supabase.from(table).select('id').eq('user_id', user.id);
          return Array.isArray(data) ? data.length : 0;
        } catch {
          return 0;
        }
      };
      const [snapsRes, chaptersRes, goals, scenarios, plans] = await Promise.all([
        supabase
          .from('financial_snapshots')
          .select('year, month, cash, stocks, real_estate, equity, other_assets, liabilities, income, expenses')
          .eq('user_id', user.id)
          .order('year', { ascending: true })
          .order('month', { ascending: true }),
        supabase.from('story_chapters').select('start_year, end_year').eq('user_id', user.id),
        count('goal_funds'),
        count('what_if_scenarios'),
        count('year_plans'),
      ]);
      setBundle({
        snaps: (snapsRes.data as Snap[]) ?? [],
        chapters: (chaptersRes.data as { start_year: number; end_year: number }[]) ?? [],
        goals,
        scenarios,
        plans,
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  function ask(e?: React.FormEvent) {
    e?.preventDefault();
    const q = question.trim();
    if (!q) return;
    try {
      window.sessionStorage.setItem('mm-ask', q);
    } catch {}
    router.push('/advisor');
  }

  const tools = TOOLS[view];
  // Experience mode stages advanced tools behind a reveal (guided < growing < pro).
  const { mode: xmode } = useXMode();
  const [showAllTools, setShowAllTools] = useState(false);
  const stagedTools = tools.filter((tl) => (tl.min ?? 1) <= XMODE_RANK[xmode]);

  // ── Per-view summary tiles ────────────────────────────────────────────
  const tiles = useMemo<Tile[]>(() => {
    if (!bundle) return [];
    const { snaps, chapters } = bundle;
    const latest = snaps[snaps.length - 1];
    const first = snaps[0];
    const label = (s: Snap) => `${MONTHS[s.month - 1]} ${s.year}`;

    if (view === 'past') {
      const span =
        chapters.length > 0
          ? Math.max(...chapters.map((c) => c.end_year)) - Math.min(...chapters.map((c) => c.start_year))
          : 0;
      const totalIncome = snaps.reduce((s, x) => s + Number(x.income), 0);
      const journey =
        latest && first && snaps.length >= 2
          ? { from: netWorthOf(first), to: netWorthOf(latest) }
          : null;
      return [
        { label: t('hub.sum.monthsLogged'), value: String(snaps.length), sub: latest ? `${label(first)} → ${label(latest)}` : undefined },
        journey
          ? {
              label: t('hub.sum.journey'),
              value: money(journey.to),
              sub: `${journey.to - journey.from >= 0 ? '▲' : '▼'} ${money(Math.abs(journey.to - journey.from))}${journey.from !== 0 ? ` (${(((journey.to - journey.from) / Math.abs(journey.from)) * 100).toFixed(1)}%)` : ''}`,
              accent: journey.to - journey.from >= 0 ? 'var(--green-dark)' : 'var(--red-2)',
            }
          : { label: t('hub.sum.journey'), value: '—' },
        { label: t('hub.sum.chapters'), value: String(chapters.length), sub: span > 0 ? t('home.stat.yearsValue', { n: span }) : undefined },
        { label: t('hub.sum.totalIncome'), value: money(totalIncome) },
      ];
    }

    // 'today' renders the TodayDashboard instead of tiles.
    if (view === 'today') return [];

    // future
    const pace5y =
      latest && first && snaps.length >= 2
        ? netWorthOf(latest) + ((netWorthOf(latest) - netWorthOf(first)) / (snaps.length - 1)) * 60
        : null;
    return [
      pace5y !== null
        ? { label: t('hub.sum.pace5y'), value: money(pace5y), accent: 'var(--green-dark)', big: true }
        : { label: t('hub.sum.pace5y'), value: '—', big: true },
      { label: t('hub.sum.goals'), value: String(bundle.goals) },
      { label: t('hub.sum.scenarios'), value: String(bundle.scenarios) },
      { label: t('hub.sum.plans'), value: String(bundle.plans) },
    ];
  }, [bundle, view, t, money]);

  const hasData = (bundle?.snaps.length ?? 0) > 0;

  return (
    <div>
      {/* ── 1. The summary: the main focus ── */}
      <div className="text-[10px] tracking-[0.12em] uppercase text-[var(--gold)] mb-1">
        {t('hub.eyebrow')}
      </div>
      <h1 className="font-serif text-3xl font-semibold text-[var(--ink)] mb-1">
        {VIEW_ICON[view]} {t(`hub.${view}.title`)}
      </h1>
      <p className="text-sm text-[var(--ink-2)] mb-1.5 max-w-2xl">{t(`hub.${view}.tagline`)}</p>
      {view === 'today' && (
        <p className="text-[11px] text-[var(--muted)] mb-6">📅 {formatDual(new Date(), locale)}</p>
      )}
      {view !== 'today' && <div className="mb-6" />}

      {view === 'today' ? (
        <TodayDashboard />
      ) : bundle === null ? (
        <div className="text-sm text-[var(--muted)] mb-6">{t('common.loading')}</div>
      ) : !hasData && view !== 'future' ? (
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 mb-6 text-sm text-[var(--muted)]">
          {t('hub.sum.needData')}{' '}
          <Link href="/financial-numbers" className="text-[var(--green-dark)] font-medium underline">
            →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
          {tiles.map((tile) => (
            <div
              key={tile.label}
              className={`bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-4 ${
                tile.big ? 'col-span-2' : ''
              }`}
            >
              <div className="text-[10px] text-[var(--muted)] mb-1">{tile.label}</div>
              <div
                className={`font-serif font-bold ${tile.big ? 'text-2xl' : 'text-lg'}`}
                style={{ color: tile.accent ?? 'var(--ink)' }}
              >
                {tile.value}
              </div>
              {tile.sub && <div className="text-[11px] text-[var(--muted)] mt-0.5">{tile.sub}</div>}
            </div>
          ))}
        </div>
      )}

      {/* ── 2. The interactivity bar: the Brain + a prompt ── */}
      <form
        onSubmit={ask}
        className="flex items-center gap-3 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-3 mb-6"
      >
        <MiniBrain />
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t(`hub.ask.${view}`)}
          className="flex-1 min-w-0 bg-[var(--surface-0)] border border-[var(--border-default)] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[var(--green)]"
        />
        <button
          type="submit"
          className="shrink-0 text-sm font-semibold bg-[var(--green-dark)] text-white rounded-full px-5 py-2.5"
        >
          {t('hub.ask.send')}
        </button>
      </form>

      {/* ── 3. The toolbox drawer ── */}
      <button
        onClick={toggleDrawer}
        className="w-full flex items-center justify-between bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl px-5 py-3.5 text-sm font-medium text-[var(--ink)] hover:border-[var(--green)] transition-colors"
      >
        <span>
          {drawerOpen ? t('hub.tools.hide') : t('hub.tools.show', { n: tools.length })}
        </span>
        <span className="text-[var(--muted)]">{drawerOpen ? '▴' : '▾'}</span>
      </button>

      {drawerOpen && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
            {(showAllTools ? tools : stagedTools).map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 hover:border-[var(--green)] transition-colors"
              >
                <div className="text-lg mb-2">{tool.icon}</div>
                <div className="font-medium text-sm text-[var(--ink)] mb-1">{t(tool.titleKey)}</div>
                <div className="text-xs text-[var(--muted)] leading-relaxed">{t(tool.descKey)}</div>
              </Link>
            ))}
          </div>
          {/* lower experience modes stage advanced tools — never remove them */}
          {!showAllTools && stagedTools.length < tools.length && (
            <button
              onClick={() => setShowAllTools(true)}
              className="w-full mt-3 text-xs font-medium text-[var(--green-dark)] bg-[var(--green-bg)] border border-dashed border-[var(--green-border)] rounded-2xl px-5 py-3 hover:border-[var(--green)]"
            >
              {locale === 'ar'
                ? `أظهِر ${tools.length - stagedTools.length} أدوات متقدمة أيضاً ▾`
                : `Show ${tools.length - stagedTools.length} more advanced tools ▾`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
