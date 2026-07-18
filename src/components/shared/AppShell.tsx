'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import EditProfileModal from './EditProfileModal';
import DemoTour from './DemoTour';
import TimelineNav from './TimelineNav';
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

  // Desktop top-bar nav pill.
  function TopNavLink({ href, labelKey, icon, className = '' }: { href: string; labelKey: string; icon: string; className?: string }) {
    const active = pathname === href.split('?')[0];
    return (
      <Link
        href={href}
        className={`items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors shrink-0 ${
          active
            ? 'bg-[var(--ink)] text-[var(--surface-0)] font-medium'
            : 'text-[var(--ink-2)] hover:bg-[var(--surface-1)]'
        } ${className}`}
      >
        <span>{icon}</span>
        <span>{t(labelKey)}</span>
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
    <ProfileContext.Provider
      value={{ openEditProfile: () => setEditProfileOpen(true), profileVersion }}
    >
      <div className="min-h-screen bg-[var(--surface-0)] text-[var(--ink)] flex flex-col">
        {/* ── top bar ── */}
        <header className="sticky top-0 z-40 bg-[var(--surface-card)]/95 backdrop-blur border-b border-[var(--border-default)]">
          <div className="max-w-4xl mx-auto min-h-14 px-4 sm:px-6 flex items-center gap-2">
            <Link href="/home" className="font-serif text-lg font-semibold tracking-tight shrink-0">
              Mal<span className="text-[var(--green)]">Mind</span>
            </Link>

            {/* desktop nav: Home + the walking timeline + the Brain */}
            <TopNavLink href="/home" labelKey="nav.home" icon="⌂" className="hidden sm:flex ms-2" />
            <TimelineNav className="hidden sm:block flex-1 min-w-0 mx-1" />
            <TopNavLink href="/advisor" labelKey="nav.brain" icon="🧠" className="hidden sm:flex" />

            {/* mobile: push utilities to the right (nav lives in the bottom bar) */}
            <div className="flex-1 sm:hidden" />

            {/* utilities */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
                title={t('common.language')}
                className="h-8 px-2 rounded-lg text-xs text-[var(--ink-2)] hover:bg-[var(--surface-1)] flex items-center gap-1"
              >
                <span>🌐</span>
                <span className="font-medium">{locale === 'en' ? 'ع' : 'EN'}</span>
              </button>
              <button
                onClick={toggleTheme}
                title={theme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
                className="h-8 w-8 rounded-lg text-[var(--ink-2)] hover:bg-[var(--surface-1)] flex items-center justify-center text-sm"
              >
                {theme === 'dark' ? '☀' : '☾'}
              </button>
              <button
                onClick={() => setEditProfileOpen(true)}
                title={t('common.editProfile')}
                className="w-8 h-8 rounded-full bg-[var(--green-bg)] border border-[var(--green-border)] flex items-center justify-center text-[10px] font-semibold text-[var(--green-dark)] hover:bg-[var(--green-hover-bg)] transition-colors"
              >
                {initials}
              </button>
              <button
                onClick={handleSignOut}
                title={t('common.signOut')}
                className="h-8 px-2 rounded-lg text-xs text-[var(--muted)] hover:bg-[var(--surface-1)] flex items-center"
              >
                <span className="hidden sm:inline">{t('common.signOut')}</span>
                <span className="sm:hidden text-sm">⏻</span>
              </button>
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
      <BrainCompanion />
      <EphemeralSessionGuard />
      </div>
    </ProfileContext.Provider>
  );
}
