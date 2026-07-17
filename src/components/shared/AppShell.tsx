'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import EditProfileModal from './EditProfileModal';
import DemoTour from './DemoTour';
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
// own toolbox drawer of feature pages), so the sidebar stays calm: Home,
// the three views, and the Brain.
const VIEW_ITEMS = [
  { href: '/past', labelKey: 'nav.past', icon: '🕰' },
  { href: '/today', labelKey: 'nav.today', icon: '☀' },
  { href: '/future', labelKey: 'nav.future', icon: '🔭' },
];

const FULL_BLEED_PATHS = ['/', '/onboarding', '/login', '/signup'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { theme, toggleTheme } = useTheme();
  const { locale, setLocale, t } = useLocale();
  const [initials, setInitials] = useState('?');
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  function NavLink({ href, label, labelKey, icon }: { href: string; label?: string; labelKey?: string; icon: string }) {
    const hrefPath = href.split('?')[0];
    const active = pathname === hrefPath;
    return (
      <Link
        href={href}
        onClick={() => setSidebarOpen(false)}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
          active
            ? 'bg-[var(--ink)] text-[var(--surface-0)] font-medium'
            : 'text-[var(--ink-2)] hover:bg-[var(--surface-1)]'
        }`}
      >
        <span className="text-sm w-4 text-center">{icon}</span>
        <span className="truncate">{labelKey ? t(labelKey) : label}</span>
      </Link>
    );
  }

  return (
    <ProfileContext.Provider
      value={{ openEditProfile: () => setEditProfileOpen(true), profileVersion }}
    >
      <div className="min-h-screen bg-[var(--surface-0)] text-[var(--ink)] flex">
      {/* mobile top bar */}
      <div className="sm:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-[var(--surface-card)] border-b border-[var(--border-default)] flex items-center justify-between px-4">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-xl">
          ☰
        </button>
        <Link href="/home" className="font-serif text-lg font-semibold">
          Mal<span className="text-[var(--green)]">Mind</span>
        </Link>
        <button
          onClick={() => setEditProfileOpen(true)}
          title="Edit profile"
          className="w-7 h-7 rounded-full bg-[var(--green-bg)] border border-[var(--green-border)] flex items-center justify-center text-[10px] font-semibold text-[var(--green-dark)] hover:bg-[var(--green-hover-bg)] transition-colors"
        >
          {initials}
        </button>
      </div>

      {/* sidebar */}
      <aside
        data-open={sidebarOpen}
        className={`mm-sidebar fixed sm:sticky top-0 sm:top-0 left-0 h-screen w-64 bg-[var(--surface-card)] border-r border-[var(--border-default)] flex flex-col z-30 transition-transform sm:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } pt-14 sm:pt-0`}
      >
        <div className="hidden sm:flex items-center justify-between px-5 h-14 border-b border-[var(--border-default)]">
          <Link href="/home" className="font-serif text-xl font-semibold tracking-tight">
            Mal<span className="text-[var(--green)]">Mind</span>
          </Link>
          <button
            onClick={() => setEditProfileOpen(true)}
            title={t('common.editProfile')}
            className="w-7 h-7 rounded-full bg-[var(--green-bg)] border border-[var(--green-border)] flex items-center justify-center text-[10px] font-semibold text-[var(--green-dark)] hover:bg-[var(--green-hover-bg)] transition-colors"
          >
            {initials}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          <div>
            <NavLink href="/home" labelKey="nav.home" icon="⌂" />
          </div>

          <div>
            <div className="px-3 mb-1.5 text-[10px] font-semibold tracking-[0.08em] uppercase text-[var(--gold)]">
              {t('nav.section.views')}
            </div>
            <div className="space-y-0.5">
              {VIEW_ITEMS.map((item) => (
                <NavLink key={item.labelKey} {...item} />
              ))}
            </div>
          </div>

          <div>
            <div className="px-3 mb-1.5 text-[10px] font-semibold tracking-[0.08em] uppercase text-[var(--muted)]">
              {t('nav.section.alwaysOn')}
            </div>
            <NavLink href="/advisor" labelKey="nav.brain" icon="🧠" />
          </div>
        </div>

        <div className="p-3 border-t border-[var(--border-default)] space-y-0.5">
          {/* language switcher */}
          <div className="flex items-center gap-1 px-1 mb-1">
            <span className="text-sm w-4 text-center text-[var(--muted)]">🌐</span>
            <div className="flex-1 flex bg-[var(--surface-1)] rounded-lg p-0.5">
              <button
                onClick={() => setLocale('en')}
                className={`flex-1 rounded-md px-2 py-1 text-xs transition-colors ${
                  locale === 'en'
                    ? 'bg-[var(--surface-card)] text-[var(--ink)] font-medium shadow-sm'
                    : 'text-[var(--muted)] hover:text-[var(--ink-2)]'
                }`}
              >
                English
              </button>
              <button
                onClick={() => setLocale('ar')}
                className={`flex-1 rounded-md px-2 py-1 text-xs transition-colors ${
                  locale === 'ar'
                    ? 'bg-[var(--surface-card)] text-[var(--ink)] font-medium shadow-sm'
                    : 'text-[var(--muted)] hover:text-[var(--ink-2)]'
                }`}
              >
                العربية
              </button>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-2.5 text-start px-3 py-2 rounded-lg text-xs text-[var(--ink-2)] hover:bg-[var(--surface-1)]"
          >
            <span className="text-sm w-4 text-center">{theme === 'dark' ? '☀' : '☾'}</span>
            {theme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
          </button>
          <button
            onClick={handleSignOut}
            className="w-full text-start px-3 py-2 rounded-lg text-xs text-[var(--muted)] hover:bg-[var(--surface-1)]"
          >
            {t('common.signOut')}
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="sm:hidden fixed inset-0 bg-[var(--scrim)] z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex-1 min-w-0 px-6 py-8 pt-20 sm:pt-8 max-w-4xl mx-auto w-full">
        {children}
      </main>

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
