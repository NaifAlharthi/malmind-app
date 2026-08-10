'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import EditProfileModal from './EditProfileModal';
import DemoTour from './DemoTour';
import TimelineNav from './TimelineNav';
import DepthRail from './DepthRail';
import { XModeProvider, XModeSwitcher } from './ExperienceMode';
import { useTheme } from './ThemeProvider';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { clearEphemeral } from '@/lib/authPrefs';

// Enforces "keep me signed in = off"; browser-only, so load it lazily.
const EphemeralSessionGuard = dynamic(() => import('./EphemeralSessionGuard'), { ssr: false });

// The Brain renders WebGL, which only exists in the browser.
const BrainCompanion = dynamic(() => import('./BrainCompanion'), { ssr: false });

interface ProfileContextValue {
  openEditProfile: () => void;
  profileVersion: number;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

// Lets any page inside AppShell (e.g. the home page's own "Edit" button)
// open the same profile modal as the sidebar avatar, and know when the
// profile has changed elsewhere so it can refetch its own copy.
export function useProfileContext() {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error('useProfileContext must be used within AppShell');
  }
  return ctx;
}

// The whole product hangs off three time views (each hub page carries its
// own toolbox drawer of feature pages), so the nav stays calm: Home, the
// three views, and the Brain — a single row that lives in the top bar on
// desktop and a bottom tab bar on mobile.
const NAV_ITEMS = [
  { href: '/home', labelKey: 'nav.home', icon: '⌂' },
  { href: '/past', labelKey: 'nav.past', icon: '🕰' },
  { href: '/today', labelKey: 'nav.today', icon: '☀' },
  { href: '/future', labelKey: 'nav.future', icon: '🔭' },
  { href: '/advisor', labelKey: 'nav.brain', icon: '🧠' },
];

const FULL_BLEED_PATHS = ['/', '/onboarding', '/login', '/signup'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { theme, toggleTheme } = useTheme();
  const { locale, setLocale, t } = useLocale();
  const [initials, setInitials] = useState('?');
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [profileVersion, setProfileVersion] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // The ☰ menu closes on outside click or Escape.
  useEffect(() => {
    if (!moreOpen) return;
    const onDown = (e: PointerEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [moreOpen]);

  useEffect(() => {
    if (FULL_BLEED_PATHS.includes(pathname)) return;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();
      if (data?.name) setInitials(data.name.charAt(0).toUpperCase());
    })();
  }, [pathname, supabase, profileVersion]);

  if (FULL_BLEED_PATHS.includes(pathname)) {
    return <>{children}</>;
  }

  async function handleSignOut() {
    clearEphemeral();
    await supabase.auth.signOut();
    router.push('/login');
  }

  // Desktop top-bar nav pill. `compact` pills drop their text below md so the
  // bar never overflows at tablet widths — the tooltip keeps the name.
  function TopNavLink({ href, labelKey, icon, className = '', compact = false }: { href: string; labelKey: string; icon: string; className?: string; compact?: boolean }) {
    const active = pathname === href.split('?')[0];
    return (
      <Link
        href={href}
        title={t(labelKey)}
        className={`items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors shrink-0 ${
          active
            ? 'bg-[var(--ink)] text-[var(--surface-0)] font-medium'
            : 'text-[var(--ink-2)] hover:bg-[var(--surface-1)]'
        } ${className}`}
      >
        <span>{icon}</span>
        <span className={compact ? 'hidden md:inline' : ''}>{t(labelKey)}</span>
      </Link>
    );
  }

  // Mobile bottom tab.
  function BottomTab({ href, labelKey, icon }: { href: string; labelKey: string; icon: string }) {
    const active = pathname === href.split('?')[0];
    return (
      <Link
        href={href}
        className={`flex-1 flex flex-col items-center justify-center gap-0.5 ${
          active ? 'text-[var(--green-dark)]' : 'text-[var(--muted)]'
        }`}
      >
        <span className="text-lg leading-none">{icon}</span>
        <span className={`text-[10px] ${active ? 'font-semibold' : ''}`}>{t(labelKey)}</span>
      </Link>
    );
  }

  return (
    <XModeProvider>
    <ProfileContext.Provider
      value={{ openEditProfile: () => setEditProfileOpen(true), profileVersion }}
    >
      <div className="min-h-screen bg-[var(--surface-0)] text-[var(--ink)] flex flex-col">
        {/* ── top bar ── */}
        <header className="sticky top-0 z-40 bg-[var(--surface-card)]/95 backdrop-blur border-b border-[var(--border-default)]">
          <div className="max-w-6xl mx-auto min-h-14 px-4 sm:px-6 flex items-center gap-2">
            <Link href="/home" className="font-serif text-lg font-semibold tracking-tight shrink-0 flex items-center gap-1.5">
              <span>Mal<span className="text-[var(--green)]">Mind</span></span>
              <span className="text-[11px] leading-none" title={t('common.madeForSaudi')} aria-label={t('common.madeForSaudi')}>🇸🇦</span>
            </Link>

            {/* desktop nav: Home + the walking timeline + the Brain */}
            {/* the wordmark already goes home, so the pill can yield first when space runs out */}
            <TopNavLink href="/home" labelKey="nav.home" icon="⌂" className="hidden md:flex ms-2" compact />
            <TimelineNav className="hidden sm:block flex-1 min-w-[120px] mx-1" />
            <TopNavLink href="/advisor" labelKey="nav.brain" icon="🧠" className="hidden sm:flex" compact />
            <TopNavLink href="/tour" labelKey="nav.tour" icon="🧭" className="hidden sm:flex" compact />

            {/* mobile: push utilities to the right (nav lives in the bottom bar) */}
            <div className="flex-1 sm:hidden" />

            {/* utilities */}
            <div className="flex items-center gap-1 shrink-0">
              {/* experience mode: hold-my-hand · getting a hold · pro */}
              <XModeSwitcher className="me-1" />
              <button
                onClick={() => setEditProfileOpen(true)}
                title={t('common.editProfile')}
                className="w-8 h-8 rounded-full bg-[var(--green-bg)] border border-[var(--green-border)] flex items-center justify-center text-[10px] font-semibold text-[var(--green-dark)] hover:bg-[var(--green-hover-bg)] transition-colors"
              >
                {initials}
              </button>

              {/* ☰ more: language · theme · sign out */}
              <div ref={moreRef} className="relative">
                <button
                  onClick={() => setMoreOpen((o) => !o)}
                  title={t('common.more')}
                  aria-haspopup="menu"
                  aria-expanded={moreOpen}
                  className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${
                    moreOpen ? 'bg-[var(--surface-1)] text-[var(--ink)]' : 'text-[var(--ink-2)] hover:bg-[var(--surface-1)]'
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                    <line x1="2.5" y1="4.5" x2="13.5" y2="4.5" />
                    <line x1="2.5" y1="8" x2="13.5" y2="8" />
                    <line x1="2.5" y1="11.5" x2="13.5" y2="11.5" />
                  </svg>
                </button>
                {moreOpen && (
                  <div
                    role="menu"
                    className="absolute end-0 top-full mt-1.5 z-50 min-w-44 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] shadow-lg py-1.5 text-sm"
                  >
                    <button
                      role="menuitem"
                      onClick={() => { setLocale(locale === 'en' ? 'ar' : 'en'); setMoreOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[var(--ink-2)] hover:bg-[var(--surface-1)] text-start"
                    >
                      <span>🌐</span>
                      <span>{locale === 'en' ? 'العربية' : 'English'}</span>
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => { toggleTheme(); setMoreOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[var(--ink-2)] hover:bg-[var(--surface-1)] text-start"
                    >
                      <span>{theme === 'dark' ? '☀' : '☾'}</span>
                      <span>{theme === 'dark' ? t('common.lightMode') : t('common.darkMode')}</span>
                    </button>
                    <div className="my-1.5 border-t border-[var(--border-default)]" />
                    <button
                      role="menuitem"
                      onClick={() => { setMoreOpen(false); handleSignOut(); }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[var(--muted)] hover:bg-[var(--surface-1)] hover:text-[var(--ink-2)] text-start"
                    >
                      <span>⏻</span>
                      <span>{t('common.signOut')}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 min-w-0 px-6 py-8 pb-24 sm:pb-8 max-w-4xl mx-auto w-full">
          {children}
        </main>

        {/* ── mobile bottom tab bar ── */}
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-[var(--surface-card)] border-t border-[var(--border-default)] flex items-stretch">
          {NAV_ITEMS.map((item) => (
            <BottomTab key={item.href} {...item} />
          ))}
        </nav>

      <EditProfileModal
        open={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        onSaved={(updated) => {
          setInitials(updated.name.charAt(0).toUpperCase() || '?');
          setProfileVersion((v) => v + 1);
        }}
      />
      <DemoTour />
      <DepthRail />
      <BrainCompanion />
      <EphemeralSessionGuard />
      </div>
    </ProfileContext.Provider>
    </XModeProvider>
  );
}
