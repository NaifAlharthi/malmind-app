'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Profile {
  name: string;
  city: string | null;
  employment: string | null;
  monthly_income: number;
}

export default function HomePage() {
  const router = useRouter();
  const supabase = createClient();
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
  }, [load]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) {
    return <div className="text-sm text-[#898781]">Loading…</div>;
  }

  if (!profile || !profile.employment) {
    // Signed in, but hasn't completed onboarding yet.
    return (
      <div className="text-center py-12">
        <p className="text-sm text-[#3D3D3A] mb-4">
          Let&apos;s get your profile set up first.
        </p>
        <Link
          href="/onboarding"
          className="text-sm bg-[#085041] text-white rounded-lg px-4 py-2 font-medium"
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
          <h1 className="font-serif text-2xl font-semibold text-[#141414]">
            Good to see you, {profile.name}
          </h1>
          <p className="text-sm text-[#3D3D3A]">
            This is your real, saved account — not a demo.
          </p>
        </div>
        <button onClick={handleSignOut} className="text-xs text-[#898781]">
          Sign out
        </button>
      </div>

      <div className="bg-gradient-to-br from-[#0F2A1E] to-[#0A1A12] rounded-2xl p-6 my-6 text-white">
        <div className="text-xs tracking-[0.1em] uppercase text-[#C9A84C] mb-1">
          Your profile
        </div>
        <div className="font-serif text-xl font-semibold">{profile.name}</div>
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

      <div className="grid sm:grid-cols-3 gap-4 mt-6">
        <Link
          href="/story"
          className="bg-white border border-black/10 rounded-2xl p-5 hover:border-[#1D9E75] transition-colors"
        >
          <div className="text-lg mb-2">📖</div>
          <div className="font-medium text-sm text-[#141414] mb-1">
            My Financial Story
          </div>
          <div className="text-xs text-[#898781] leading-relaxed">
            Add chapters, tell your story, build the archive.
          </div>
        </Link>
        <Link
          href="/positioning"
          className="bg-white border border-black/10 rounded-2xl p-5 hover:border-[#1D9E75] transition-colors"
        >
          <div className="text-lg mb-2">📊</div>
          <div className="font-medium text-sm text-[#141414] mb-1">
            Financial Positioning
          </div>
          <div className="text-xs text-[#898781] leading-relaxed">
            Log real net worth snapshots and see your trajectory.
          </div>
        </Link>
        <Link
          href="/advisor"
          className="bg-white border border-black/10 rounded-2xl p-5 hover:border-[#1D9E75] transition-colors"
        >
          <div className="text-lg mb-2">💬</div>
          <div className="font-medium text-sm text-[#141414] mb-1">
            AI Advisor
          </div>
          <div className="text-xs text-[#898781] leading-relaxed">
            Ask anything — it already knows your real profile and story.
          </div>
        </Link>
      </div>
    </div>
  );
}
