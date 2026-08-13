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
import DepthStage from './DepthStage';
import CommandMode from './CommandMode';
import { XModeProvider, XModeSwitcher, DriveSwitcher } from './ExperienceMode';
import { useTheme } from './ThemeProvider';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { clearEphemeral } from '@/lib/authPrefs';
import { useIsPhone } from '@/lib/useIsPhone';
import { PHONE_NAV, announcePageNav } from '@/lib/phoneNav';
import TouchNav from './TouchNav';

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

// Phase-1 phone companion pages live in PHONE_NAV (lib/phoneNav) — shared
// with the swipe navigator and the page-transition theater.

const FULL_BLEED_PATHS = ['/', '/onboarding', '/login', '/signup'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { theme, toggleTheme } = useTheme();
  const { locale, setLocale, t } = useLocale();
  const isPhone = useIsPhone();
  const [initials, setInitials] = useState('?');
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [profileVersion, setProfileVersion] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // While the page scrolls, the floating timeline fades out of the way so
  // the content behind it stays readable; it re-materializes on settle.
  const [scrolling, setScrolling] = useState(false);
  const scrollSettle = useRef<number | undefined>(undefined);
  useEffect(() => {
    const onScroll = () => {
      setScrolling(true);
      window.clearTimeout(scrollSettle.current);
      scrollSettle.current = window.setTimeout(() => setScrolling(false), 350);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.clearTimeout(scrollSettle.current);
    };
  }, []);

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

  // 2D navigation: a horizontal wheel tilt anywhere travels through time
  // (past · today · future), complementing the iceberg's vertical depth.
  // Content that genuinely scrolls horizontally keeps its scroll.
  const timeTiltCooldown = useRef(0);
  useEffect(() => {
    if (FULL_BLEED_PATHS.includes(pathname)) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) < 40 || Math.abs(e.deltaX) < Math.abs(e.deltaY) * 1.5) return;
      let el: Element | null = e.target instanceof Element ? e.target : null;
      while (el && el !== document.body) {
        const style = getComputedStyle(el);
        if ((style.overflowX === 'auto' || style.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 2) return;
        el = el.parentElement;
      }
      const now = Date.now();
      if (now - timeTiltCooldown.current < 700) return;
      timeTiltCooldown.current = now;
      const routes = ['/past', '/today', '/future'];
      const idx = routes.indexOf(pathname);
      const next = routes[Math.min(2, Math.max(0, (idx === -1 ? 1 : idx) + (e.deltaX > 0 ? 1 : -1)))];
      if (next !== pathname) router.push(next);
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    return () => window.removeEventListener('wheel', onWheel);
  }, [pathname, router]);

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

  // Mobile bottom tab. On phones a tab tap plays the same page-crossing
  // transition as a swipe — the sweep runs toward the side the target
  // page occupies on the strip (mirrored in RTL).
  function BottomTab({ href, labelKey, icon }: { href: string; labelKey: string; icon: string }) {
    const active = pathname === href.split('?')[0];
    const announceCrossing = () => {
      if (!isPhone || active) return;
      const from = PHONE_NAV.findIndex((p) => p.href === pathname);
      const to = PHONE_NAV.findIndex((p) => p.href === href);
      if (from === -1 || to === -1) return;
      const ar = locale === 'ar';
      const toHigher = to > from;
      announcePageNav({
        dir: toHigher ? (ar ? 'right' : 'left') : (ar ? 'left' : 'right'),
        icon,
        label: t(labelKey),
      });
    };
    return (
      <Link
        href={href}
        onClick={announceCrossing}
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/saudi-flag.svg" alt="" title={t('common.madeForSaudi')} aria-label={t('common.madeForSaudi')} className="h-3.5 w-[18px] rounded-[2px] object-cover" />
            </Link>

            {/* desktop nav: Home + the walking timeline + the Brain */}
            {/* the wordmark already goes home, so the pill can yield first when space runs out */}
            <TopNavLink href="/home" labelKey="nav.home" icon="⌂" className="hidden md:flex ms-2" compact />
            <TopNavLink href="/advisor" labelKey="nav.brain" icon="🧠" className="hidden sm:flex" compact />
            <TopNavLink href="/tour" labelKey="nav.tour" icon="🧭" className="hidden sm:flex" compact />

            {/* push utilities to the end (time travel floats at the bottom now) */}
            <div className="flex-1" />

            {/* utilities */}
            <div className="flex items-center gap-1 shrink-0">
              {/* experience mode + drive: desktop power dials — the phone
                  companion keeps its top bar to the essentials */}
              <div className="hidden sm:flex items-center gap-1">
                <XModeSwitcher />
                <DriveSwitcher className="me-1" />
              </div>
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

        {/* content clears the iceberg's lane on narrow widths (it floats in
            page-edge whitespace on lg+), so the rail never covers anything */}
        <main className="flex-1 min-w-0 px-6 py-8 pb-24 sm:pb-8 sm:pt-24 sm:ps-16 lg:ps-6 max-w-4xl mx-auto w-full">
          <DepthStage>{children}</DepthStage>
        </main>

        {/* ── the floating timeline: the horizontal (time) axis of the 2D map,
               hovering just below the top bar, facing the iceberg's vertical axis ── */}
        {/* the time axis floats everywhere — on home it's the invitation to
            travel; the walker rests at the present until you pick an era */}
        <div
          className={`hidden sm:block fixed top-[4.25rem] left-1/2 -translate-x-1/2 z-30 w-[360px] max-w-[70vw] bg-[var(--surface-card)]/92 backdrop-blur border border-[var(--border-default)] rounded-full px-6 shadow-lg transition-opacity duration-300 ${
            scrolling ? 'opacity-[0.15] pointer-events-none' : 'opacity-100'
          }`}
        >
          <TimelineNav />
        </div>

        {/* ── mobile bottom tab bar: phones get the phase-1 companion set ── */}
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-[var(--surface-card)] border-t border-[var(--border-default)] flex items-stretch">
          {(isPhone ? PHONE_NAV : NAV_ITEMS).map((item) => (
            <BottomTab key={item.href} {...item} />
          ))}
        </nav>

        {/* horizontal swipes walk the phone's page strip */}
        <TouchNav />

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
      <CommandMode />
      {/* the Brain's floating perch overlaps content on small screens —
          phones reach the Brain through its bottom tab instead */}
      {!isPhone && <BrainCompanion />}
      <EphemeralSessionGuard />
      </div>
    </ProfileContext.Provider>
    </XModeProvider>
  );
}
