'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { useProfileContext } from '@/components/shared/AppShell';
import { firstNameOf } from '@/lib/name';

const Metaverse3D = dynamic(() => import('./Metaverse3D'), {
  ssr: false,
  loading: () => (
    <div className="h-[380px] rounded-2xl bg-[var(--surface-1)] border border-[var(--border-default)] flex items-center justify-center text-sm text-[var(--muted)] mb-6">
      Loading your world…
    </div>
  ),
});

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface Profile {
  name: string;
  city: string | null;
  employment: string | null;
  monthly_income: number;
}

interface Financials {
  netWorth: number;
  cash: number;
  investments: number;
  assets: number;
  liabilities: number;
  income: number;
  expenses: number;
  asOf: string;
}

function fmt(n: number) {
  return Math.round(n).toLocaleString();
}

export default function HomePage() {
  const router = useRouter();
  const supabase = createClient();
  const { openEditProfile, profileVersion } = useProfileContext();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [chapterCount, setChapterCount] = useState(0);
  const [span, setSpan] = useState(0);
  const [fin, setFin] = useState<Financials | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('name, city, employment, monthly_income')
      .eq('id', user.id)
      .single();

    if (profileData) setProfile(profileData as Profile);

    const { data: chapters } = await supabase
      .from('story_chapters')
      .select('start_year, end_year')
      .eq('user_id', user.id)
      .order('start_year', { ascending: true });

    if (chapters && chapters.length > 0) {
      setChapterCount(chapters.length);
      setSpan(
        chapters[chapters.length - 1].end_year - chapters[0].start_year
      );
    }

    // Latest month from My Financial Numbers = the user's current balances.
    const { data: snaps } = await supabase
      .from('financial_snapshots')
      .select('year, month, cash, stocks, real_estate, equity, other_assets, liabilities, income, expenses')
      .eq('user_id', user.id)
      .order('year', { ascending: true })
      .order('month', { ascending: true });

    if (snaps && snaps.length > 0) {
      const s = snaps[snaps.length - 1];
      const assets =
        Number(s.cash) + Number(s.stocks) + Number(s.real_estate) + Number(s.equity) + Number(s.other_assets);
      setFin({
        cash: Number(s.cash),
        investments: Number(s.stocks) + Number(s.equity),
        assets,
        liabilities: Number(s.liabilities),
        netWorth: assets - Number(s.liabilities),
        income: Number(s.income),
        expenses: Number(s.expenses),
        asOf: `${MONTHS[s.month - 1]} ${s.year}`,
      });
    } else {
      setFin(null);
    }

    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    load();
  }, [load, profileVersion]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) {
    return <div className="text-sm text-[var(--muted)]">Loading…</div>;
  }

  if (!profile || !profile.employment) {
    // Signed in, but hasn't completed onboarding yet.
    return (
      <div className="text-center py-12">
        <p className="text-sm text-[var(--ink-2)] mb-4">
          Let&apos;s get your profile set up first.
        </p>
        <Link
          href="/onboarding"
          className="text-sm bg-[var(--green-dark)] text-white rounded-lg px-4 py-2 font-medium"
        >
          Continue onboarding →
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-start mb-2">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-[var(--ink)]">
            Good to see you, {firstNameOf(profile.name)}
          </h1>
          <p className="text-sm text-[var(--ink-2)]">
            This is your real, saved account — not a demo.
          </p>
        </div>
        <button onClick={handleSignOut} className="text-xs text-[var(--muted)]">
          Sign out
        </button>
      </div>

      <Metaverse3D />

      <div data-tour="profile-card" className="bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] rounded-2xl p-6 my-6 text-white relative">
        <button
          onClick={openEditProfile}
          className="absolute top-6 right-6 text-xs text-white/70 hover:text-white border border-white/20 hover:border-white/40 rounded-lg px-3 py-1.5 transition-colors"
        >
          Edit
        </button>
        <div className="text-xs tracking-[0.1em] uppercase text-[var(--gold)] mb-1">
          Your profile
        </div>
        <div className="font-serif text-xl font-semibold">{firstNameOf(profile.name)}</div>
        <div className="text-xs text-white/50 mb-4">
          {profile.employment} · {profile.city}
        </div>

        {fin ? (
          <div className="pt-4 border-t border-white/10">
            <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
              <div>
                <div className="text-[10px] tracking-[0.08em] uppercase text-[var(--gold)] mb-1">
                  Net worth · as of {fin.asOf}
                </div>
                <div className="font-serif text-3xl font-bold">SAR {fmt(fin.netWorth)}</div>
              </div>
              <Link href="/financial-numbers" className="text-xs text-white/70 hover:text-white border border-white/20 hover:border-white/40 rounded-lg px-3 py-1.5 transition-colors">
                Update numbers →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Balance label="Cash" value={fin.cash} dot="#2a78d6" />
              <Balance label="Investments" value={fin.investments} dot="#17B8C9" />
              <Balance label="Total assets" value={fin.assets} dot="#E0559E" />
              <Balance label="Liabilities" value={fin.liabilities} dot="#E0922A" />
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/10">
              <MiniStat label="Monthly income" value={`SAR ${fmt(profile.monthly_income)}`} />
              <MiniStat label="Story span" value={`${span} years`} />
              <MiniStat label="Chapters" value={`${chapterCount} recorded`} />
            </div>
          </div>
        ) : (
          <div className="pt-4 border-t border-white/10">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
              <MiniStat label="Monthly income" value={`SAR ${fmt(profile.monthly_income)}`} />
              <MiniStat label="Story span" value={`${span} years`} />
              <MiniStat label="Chapters" value={`${chapterCount} recorded`} />
            </div>
            <Link
              href="/financial-numbers"
              className="inline-block text-xs font-medium bg-white/10 hover:bg-white/15 border border-white/20 rounded-lg px-3 py-2 transition-colors"
            >
              Log your balances in My Financial Numbers to see your net worth, cash, investments and liabilities here →
            </Link>
          </div>
        )}
      </div>

      <div data-tour="think-grid" className="mb-2">
        <div className="text-[10px] tracking-[0.08em] uppercase text-[var(--blue)] font-semibold mb-2">
          Think
        </div>
        <div className="grid sm:grid-cols-3 gap-3 mb-6">
          <ToolCard href="/story" icon="📖" title="My Financial Story" desc="Add chapters, build the archive." />
          <ToolCard href="/lifetime-income" icon="💰" title="Lifetime Income" desc="Every riyal earned and kept." />
          <ToolCard href="/positioning" icon="📊" title="Financial Positioning" desc="Log net worth, see your trajectory." />
          <ToolCard href="/velocity" icon="⏱" title="Velocity of Money" desc="Months to each milestone." />
          <ToolCard href="/doubling-path" icon="📈" title="Doubling Path" desc="When your portfolio doubles." />
          <ToolCard href="/ratios" icon="🩺" title="Ratios & Stats" desc="Your financial health, measured." />
        </div>
      </div>

      <div data-tour="decide-grid" className="mb-2">
        <div className="text-[10px] tracking-[0.08em] uppercase text-[var(--green)] font-semibold mb-2">
          Decide
        </div>
        <div className="grid sm:grid-cols-3 gap-3 mb-6">
          <ToolCard href="/standard-of-living?mode=plan" icon="🪜" title="Standard of Living" desc="Design your life's stepping stones." />
          <ToolCard href="/year-plan" icon="🗓" title="Year Master Plan" desc="This year's opening to target." />
          <ToolCard href="/waterfall" icon="💧" title="Money Waterfall" desc="Your plan, as a visual flow." />
          <ToolCard href="/goal-fund" icon="🎯" title="Goal Fund" desc="Save for one specific thing." />
          <ToolCard href="/budgeting" icon="🛋" title="Dynamic Budgeting" desc="What to buy, and when." />
          <ToolCard href="/advisor" icon="💬" title="AI Advisor" desc="Ask anything, in full context." />
        </div>
      </div>
    </div>
  );
}

function Balance({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="w-2 h-2 rounded-full" style={{ background: dot }} />
        <span className="text-[10px] text-white/45">{label}</span>
      </div>
      <div className="text-sm font-medium">SAR {fmt(value)}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-white/45 mb-1">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

function ToolCard({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 hover:border-[var(--green)] transition-colors"
    >
      <div className="text-lg mb-2">{icon}</div>
      <div className="font-medium text-sm text-[var(--ink)] mb-1">{title}</div>
      <div className="text-xs text-[var(--muted)] leading-relaxed">{desc}</div>
    </Link>
  );
}
