'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const START_ITEMS = [
  { href: '/home', label: 'Home', icon: '⌂' },
  { href: '/story', label: 'My Financial Story', icon: '📖' },
];

const THINK_ITEMS = [
  { href: '/lifetime-income', label: 'Lifetime income', icon: '💰' },
  { href: '/positioning', label: 'Financial positioning', icon: '📊' },
  { href: '/velocity', label: 'Velocity of money', icon: '⏱' },
  { href: '/doubling-path', label: 'Doubling path', icon: '📈' },
  { href: '/ratios', label: 'Ratios & stats', icon: '🩺' },
  { href: '/standard-of-living?mode=track', label: 'Standard of living — tracked', icon: '🪜' },
];

const DECIDE_ITEMS = [
  { href: '/standard-of-living?mode=plan', label: 'Standard of living — design', icon: '🪜' },
  { href: '/year-plan', label: 'Year master plan', icon: '🗓' },
  { href: '/waterfall', label: 'Money waterfall', icon: '💧' },
  { href: '/goal-fund', label: 'Goal fund', icon: '🎯' },
  { href: '/budgeting', label: 'Dynamic budgeting', icon: '🛋' },
];

const FULL_BLEED_PATHS = ['/', '/onboarding', '/login', '/signup'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [initials, setInitials] = useState('?');
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
  }, [pathname, supabase]);

  if (FULL_BLEED_PATHS.includes(pathname)) {
    return <>{children}</>;
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  function NavLink({ href, label, icon }: { href: string; label: string; icon: string }) {
    const hrefPath = href.split('?')[0];
    const active = pathname === hrefPath;
    return (
      <Link
        href={href}
        onClick={() => setSidebarOpen(false)}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
          active
            ? 'bg-[#141414] text-white font-medium'
            : 'text-[#3D3D3A] hover:bg-[#EFEDE8]'
        }`}
      >
        <span className="text-sm w-4 text-center">{icon}</span>
        <span className="truncate">{label}</span>
      </Link>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F4F0] text-[#141414] flex">
      {/* mobile top bar */}
      <div className="sm:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-white border-b border-black/10 flex items-center justify-between px-4">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-xl">
          ☰
        </button>
        <Link href="/home" className="font-serif text-lg font-semibold">
          Mal<span className="text-[#1D9E75]">Mind</span>
        </Link>
        <div className="w-7 h-7 rounded-full bg-[#E1F5EE] border border-[#5DCAA5] flex items-center justify-center text-[10px] font-semibold text-[#085041]">
          {initials}
        </div>
      </div>

      {/* sidebar */}
      <aside
        className={`fixed sm:sticky top-0 sm:top-0 left-0 h-screen w-64 bg-white border-r border-black/10 flex flex-col z-30 transition-transform sm:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } pt-14 sm:pt-0`}
      >
        <div className="hidden sm:flex items-center justify-between px-5 h-14 border-b border-black/10">
          <Link href="/home" className="font-serif text-xl font-semibold tracking-tight">
            Mal<span className="text-[#1D9E75]">Mind</span>
          </Link>
          <div className="w-7 h-7 rounded-full bg-[#E1F5EE] border border-[#5DCAA5] flex items-center justify-center text-[10px] font-semibold text-[#085041]">
            {initials}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          <div>
            {START_ITEMS.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </div>

          <div>
            <div className="px-3 mb-1.5 text-[10px] font-semibold tracking-[0.08em] uppercase text-[#4A78C4]">
              Think
            </div>
            <div className="space-y-0.5">
              {THINK_ITEMS.map((item) => (
                <NavLink key={item.label} {...item} />
              ))}
            </div>
          </div>

          <div>
            <div className="px-3 mb-1.5 text-[10px] font-semibold tracking-[0.08em] uppercase text-[#1D9E75]">
              Decide
            </div>
            <div className="space-y-0.5">
              {DECIDE_ITEMS.map((item) => (
                <NavLink key={item.label} {...item} />
              ))}
            </div>
          </div>

          <div>
            <div className="px-3 mb-1.5 text-[10px] font-semibold tracking-[0.08em] uppercase text-[#898781]">
              Always on
            </div>
            <NavLink href="/advisor" label="AI advisor" icon="💬" />
          </div>
        </div>

        <div className="p-3 border-t border-black/10">
          <button
            onClick={handleSignOut}
            className="w-full text-left px-3 py-2 rounded-lg text-xs text-[#898781] hover:bg-[#EFEDE8]"
          >
            Sign out
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="sm:hidden fixed inset-0 bg-black/30 z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex-1 min-w-0 px-6 py-8 pt-20 sm:pt-8 max-w-4xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
