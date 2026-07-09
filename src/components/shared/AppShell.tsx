'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const NAV_ITEMS = [
  { href: '/home', label: 'Home' },
  { href: '/story', label: 'My Financial Story' },
  { href: '/positioning', label: 'Positioning' },
  { href: '/advisor', label: 'Advisor' },
];

const FULL_BLEED_PATHS = ['/', '/onboarding', '/login', '/signup'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const supabase = createClient();
  const [initials, setInitials] = useState('?');

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

  return (
    <div className="min-h-screen bg-[#F5F4F0] text-[#141414]">
      <nav className="sticky top-0 z-30 h-14 bg-white border-b border-black/10 flex items-center justify-between px-6">
        <Link href="/home" className="font-serif text-xl font-semibold tracking-tight">
          Mal<span className="text-[#1D9E75]">Mind</span>
        </Link>
        <div className="hidden sm:flex gap-1 bg-[#EFEDE8] rounded-lg p-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? 'bg-white text-[#141414] shadow-sm'
                    : 'text-[#898781] hover:text-[#3D3D3A]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
        <div className="w-8 h-8 rounded-full bg-[#E1F5EE] border border-[#5DCAA5] flex items-center justify-center text-xs font-semibold text-[#085041]">
          {initials}
        </div>
      </nav>

      <div className="sm:hidden flex gap-1 bg-white border-b border-black/10 px-3 py-2 overflow-x-auto">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
                active ? 'bg-[#141414] text-white' : 'text-[#898781]'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
