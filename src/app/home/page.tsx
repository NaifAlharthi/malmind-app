'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useProfileContext } from '@/components/shared/AppShell';
import { useDrive, useDepth } from '@/components/shared/ExperienceMode';
import { useTheme } from '@/components/shared/ThemeProvider';
import { localizedFirstName } from '@/lib/name';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { clearEphemeral } from '@/lib/authPrefs';
import { TOOLS, type ViewKey } from '@/lib/toolbox';
import type { DepthLevel } from '@/lib/depth';
import { diagnoseQuadrant, QUADRANT_META, type QuadKey } from '@/lib/quadrant';
import { demoAr } from '@/lib/demoI18n';
import FoundationHub from '@/components/home/FoundationHub';
import LogTile from '@/components/home/LogTile';
import HajisOpener from '@/components/home/HajisOpener';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface Profile {
  name: string;
  city: string | null;
  employment: string | null;
  monthly_income: number;
  email: string | null;
  life_stage: string | null;
  persona: string | null;
  currency: string | null;
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
  const { theme, toggleTheme } = useTheme();
  const { t, locale, setLocale } = useLocale();
  const { drive } = useDrive();
  const { depth, setDepth } = useDepth();
  // Home vs Today, segmented: home is IDENTITY — who you are, your data,
  // and what MalMind is. The action happens on the timeline (T2 leads).
  //   D1 الرئيسي — the concern opener + the profile that talks
  //   D2 الأساس  — the foundation tower
  //   D3 السِّجل  — the Log
  //   D4 صندوق الأدوات الكامل — every tool on one wall
  // (Room names live in DEPTH_NAME_OVERRIDES['/home'] — the rail, flash and
  // dive hints all speak them. Your space is behind the avatar; the product
  // story is on /about.)
  // Symmetric on web and phone; fingers dive by pulling past the page edge.
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const sar = t('common.sar');
  const money = (n: number) => (ar ? `${fmt(n)} ${sar}` : `${sar} ${fmt(n)}`);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [quad, setQuad] = useState<QuadKey | null>(null);
  const [fin, setFin] = useState<Financials | null>(null);
  // The action surfaces (hājis, standing/next-action) live on T2 now —
  // home is identity: who you are, your data, and what MalMind is.
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }


    const { data: profileData } = await supabase
      .from('profiles')
      .select('name, city, employment, monthly_income, email, life_stage, persona, currency')
      .eq('id', user.id)
      .single();
    if (profileData) setProfile(profileData as Profile);

    const { data: snaps } = await supabase
      .from('financial_snapshots')
      .select('year, month, cash, stocks, real_estate, equity, other_assets, liabilities, income, expenses')
      .eq('user_id', user.id)
      .order('year', { ascending: true })
      .order('month', { ascending: true });
    if (snaps && snaps.length > 0) {
      const s = snaps[snaps.length - 1];
      const assets = Number(s.cash) + Number(s.stocks) + Number(s.real_estate) + Number(s.equity) + Number(s.other_assets);
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
      // Same diagnosis rule as the Today dashboard: averages over the last
      // six months of snapshots, against the latest asset base.
      const recent = snaps.slice(-6);
      setQuad(diagnoseQuadrant(
        recent.reduce((a, r) => a + Number(r.income), 0) / recent.length,
        recent.reduce((a, r) => a + Number(r.expenses), 0) / recent.length,
        assets,
      ));
    } else {
      setFin(null);
      setQuad(null);
    }


    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { load(); }, [load, profileVersion]);

  async function handleSignOut() {
    clearEphemeral();
    await supabase.auth.signOut();
    router.push('/login');
  }


  if (loading) {
    return <div className="text-sm text-[var(--muted)]">{t('common.loading')}</div>;
  }

  if (!profile || !profile.employment) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-[var(--ink-2)] mb-4">{t('home.onboard.prompt')}</p>
        <Link href="/onboarding" className="text-sm bg-[var(--green-dark)] text-white rounded-lg px-4 py-2 font-medium">
          {t('home.onboard.cta')}
        </Link>
      </div>
    );
  }


  return (
    <div>
      <div className="flex justify-between items-start mb-2">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-[var(--ink)]">
            {t('home.greeting', { name: localizedFirstName(profile.name, locale === 'ar') })}
          </h1>
          <p className="text-sm text-[var(--ink-2)]">{t('home.subtitle')}</p>
        </div>
        <button onClick={handleSignOut} className="text-xs text-[var(--muted)]">{t('common.signOut')}</button>
      </div>

      {/* the action surfaces (hājis, standing, next action) live on T2 —
          home is identity: who you are, your data, and what MalMind is */}

      {/* ── the hājis opener — the most important entry point, first thing:
             a snippet that hands you into Today, where the action lives ── */}
      {depth === 1 && <HajisOpener />}

      {/* ── the profile — home·D1: a name and a summary that TALKS about the
             person's situation; the numbers themselves live in the Log (D2)
             and on the timeline ── */}
      {depth === 1 && (
      <div data-tour="profile-card" className="bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] rounded-2xl p-6 my-6 text-white relative">
        <button
          onClick={openEditProfile}
          className="absolute top-6 end-6 text-xs text-white/70 hover:text-white border border-white/20 hover:border-white/40 rounded-lg px-3 py-1.5 transition-colors"
        >
          {t('common.edit')}
        </button>
        <div className="text-xs tracking-[0.1em] uppercase text-[var(--gold)] mb-1">{t('home.profile.eyebrow')}</div>
        <div className="font-serif text-2xl font-semibold">{localizedFirstName(profile.name, locale === 'ar')}</div>
        <div className="text-xs text-white/50">{demoAr(profile.employment, ar)} · {demoAr(profile.city, ar)}</div>

        <div className="pt-4 mt-4 border-t border-white/10">
          {quad ? (() => {
            const meta = QUADRANT_META[quad];
            const c = ar ? meta.ar : meta.en;
            return (
              <>
                <div className="text-[10px] tracking-[0.08em] uppercase text-white/45 mb-1.5">
                  {ar ? 'أين تقف الآن' : 'Where you stand now'}
                </div>
                <div className="font-serif text-xl sm:text-2xl font-bold flex items-center gap-2 flex-wrap">
                  <span>{meta.icon}</span>
                  <span>{c.title}</span>
                </div>
                <p className="text-sm text-white/75 leading-relaxed mt-2 max-w-xl">{c.meaning}</p>

                {/* the four stages, with the person's marker on their own */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                  {(['A', 'B', 'C', 'D'] as QuadKey[]).map((k) => {
                    const m = QUADRANT_META[k];
                    const cc = ar ? m.ar : m.en;
                    const here = k === quad;
                    return (
                      <div
                        key={k}
                        className={`rounded-xl p-3 border transition-colors ${
                          here
                            ? 'bg-[var(--gold)]/15 border-[var(--gold)]'
                            : 'bg-white/[0.04] border-white/10 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] font-bold text-white/40" dir="ltr">{k}</span>
                          <span className="text-sm leading-none">{m.icon}</span>
                          <span className={`text-xs font-semibold ${here ? 'text-white' : 'text-white/70'}`}>{cc.title}</span>
                        </div>
                        <div className="text-[9px] text-white/45 leading-relaxed">{cc.mood}</div>
                        {here && (
                          <div className="text-[9px] font-bold text-[var(--gold)] mt-1">
                            📍 {ar ? 'أنت هنا' : 'You are here'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <Link href="/today" className="inline-block text-xs font-semibold text-[#2A1F05] bg-[var(--gold)] rounded-lg px-3.5 py-2 mt-3.5">
                  {ar ? 'الخريطة كاملة في «اليوم» ←' : 'The full map in Today →'}
                </Link>
              </>
            );
          })() : (
            <Link href="/financial-numbers" className="inline-block text-xs font-medium bg-white/10 hover:bg-white/15 border border-white/20 rounded-lg px-3 py-2 transition-colors">
              {t('home.logPrompt')}
            </Link>
          )}
        </div>
      </div>
      )}


      {/* ── the foundation: enter · review · link the data everything reads — home·D2, the data room ── */}
      {depth === 2 && <FoundationHub />}

      {/* ── the Log: every number on one spreadsheet-like grid — home·D3 ── */}
      {depth === 3 && <LogTile />}

      {/* ── the FULL toolbox — home·D4: every tool on one wall ── */}
      {depth === 4 && <FullToolMatrix />}



    </div>
  );
}

// and walks anywhere in one tap.
function FullToolMatrix() {
  const { t, locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const VIEW_META: { key: ViewKey; icon: string; label: string }[] = [
    { key: 'past', icon: '🕰', label: t('nav.past') },
    { key: 'today', icon: '☀', label: t('nav.today') },
    { key: 'future', icon: '🔭', label: t('nav.future') },
  ];
  return (
    <div className="mb-8">
      <SectionHeading
        eyebrow={L('المصفوفة كاملة', 'The full matrix')}
        title={L('كل أداة، عبر الأزمنة الثلاثة', 'Every tool, across the three times')}
      />
      <div className="grid sm:grid-cols-3 gap-3">
        {VIEW_META.map((view) => (
          <div key={view.key} className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base leading-none">{view.icon}</span>
              <span className="text-sm font-semibold text-[var(--ink)]">{view.label}</span>
              <span className="ms-auto text-[10px] text-[var(--muted)]">{TOOLS[view.key].length}</span>
            </div>
            <div className="flex flex-col gap-1">
              {TOOLS[view.key].map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--surface-1)] transition-colors"
                >
                  <span className="text-sm leading-none">{tool.icon}</span>
                  <span className="text-xs text-[var(--ink-2)] group-hover:text-[var(--ink)] transition-colors">{t(tool.titleKey)}</span>
                  <span className="ms-auto text-[9px] text-[var(--muted)]" dir="ltr">D{tool.depth ?? 1}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title?: string }) {
  return (
    <div className="mb-3">
      <div className="text-[10px] tracking-[0.08em] uppercase text-[var(--gold)] font-semibold mb-1">{eyebrow}</div>
      {title && <div className="font-serif text-lg font-semibold text-[var(--ink)]">{title}</div>}
    </div>
  );
}

