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

interface Profile {
  name: string;
  city: string | null;
  employment: string | null;
  monthly_income: number;
}

export default function HomePage() {
  const router = useRouter();
  const supabase = createClient();
  const { openEditProfile, profileVersion } = useProfileContext();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [chapterCount, setChapterCount] = useState(0);
  const [span, setSpan] = useState(0);
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

      <div className="bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] rounded-2xl p-6 my-6 text-white relative">
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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10">
          <div>
            <div className="text-[10px] text-white/45 mb-1">Monthly income</div>
            <div className="text-sm font-medium">
              SAR {Number(profile.monthly_income).toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-white/45 mb-1">Story span</div>
            <div className="text-sm font-medium">{span} years</div>
          </div>
          <div>
            <div className="text-[10px] text-white/45 mb-1">Chapters</div>
            <div className="text-sm font-medium">{chapterCount} recorded</div>
          </div>
        </div>
      </div>

      <div className="mb-2">
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

      <div className="mb-2">
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
