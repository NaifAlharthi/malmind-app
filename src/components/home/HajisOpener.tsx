'use client';

// The hājis opener — the most important entry point, first thing on home.
// A compact snippet only: it names the person's concerns (or invites them
// to name one) and every interaction jumps to Today, where the real hājis
// and the action live. Home stays the lobby; this is its handshake.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { HAJIS_TYPES_LITE } from '@/components/shared/HajisBlock';
import { announcePageNav } from '@/lib/phoneNav';

export default function HajisOpener() {
  const router = useRouter();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);

  const [concern, setConcern] = useState<{ types: string[]; text: string }>({ types: [], text: '' });
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('mm-concern');
      if (raw) {
        const parsed = JSON.parse(raw);
        setConcern({
          types: Array.isArray(parsed.types) ? parsed.types : parsed.type ? [parsed.type] : [],
          text: parsed.text ?? '',
        });
      }
    } catch { /* ignore */ }
  }, []);

  const chosen = concern.types
    .map((k) => HAJIS_TYPES_LITE.find((x) => x.k === k))
    .filter((x): x is (typeof HAJIS_TYPES_LITE)[number] => !!x);
  const hasAny = chosen.length > 0 || !!concern.text.trim();

  const goToday = () => {
    // the same crossing theater as a tab tap or a swipe
    announcePageNav({ dir: ar ? 'right' : 'left', icon: '☀', label: L('اليوم', 'Today') });
    router.push('/today');
  };

  return (
    <button
      onClick={goToday}
      className="drv-story group w-full text-start bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] rounded-2xl mb-6 p-5 sm:p-6 text-white relative overflow-hidden hover:brightness-110 transition-all"
    >
      <div className="absolute -top-12 -end-12 w-44 h-44 rounded-full bg-[var(--gold)]/10 blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="text-[10px] tracking-[0.14em] uppercase text-[var(--gold)] font-semibold mb-1.5">
          {hasAny
            ? L('هواجسك تنتظرك حيث الفعل', 'Your concerns await where the action is')
            : L('قبل الأرقام', 'Before the numbers')}
        </div>

        {hasAny ? (
          <div className="flex items-center gap-2 flex-wrap">
            {concern.text.trim() && (
              <span className="font-serif text-lg font-bold leading-snug">«{concern.text.trim()}»</span>
            )}
            {chosen.map((c) => (
              <span key={c.k} className="inline-flex items-center gap-1.5 text-xs border border-white/25 rounded-full px-3 py-1.5 text-white/90">
                <span>{c.icon}</span><span>{ar ? c.ar : c.en}</span>
              </span>
            ))}
            <span className="ms-auto shrink-0 text-xs font-semibold text-[#2A1F05] bg-[var(--gold)] rounded-lg px-3.5 py-2 group-hover:translate-x-0.5 transition-transform">
              {L('تابِعها في «اليوم» ←', 'Follow them in Today →')}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-serif text-xl sm:text-2xl font-bold leading-snug">
              {L('ما أكبر هاجس يشغل بالك هذه الأيام؟', "What's the biggest thing on your mind these days?")}
            </span>
            <span className="ms-auto shrink-0 text-xs font-semibold text-[#2A1F05] bg-[var(--gold)] rounded-lg px-3.5 py-2 group-hover:translate-x-0.5 transition-transform">
              {L('أخبرنا في «اليوم» ←', 'Tell us in Today →')}
            </span>
          </div>
        )}
      </div>
    </button>
  );
}
