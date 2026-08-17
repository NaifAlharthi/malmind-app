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
      className="drv-story group w-full text-start bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] rounded-2xl mb-6 p-7 sm:p-12 text-white relative overflow-hidden hover:brightness-110 transition-all min-h-[52vh] flex flex-col justify-center"
    >
      <div className="absolute -top-16 -end-16 w-72 h-72 rounded-full bg-[var(--gold)]/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -start-16 w-64 h-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />
      <div className="relative max-w-3xl mx-auto w-full">
        <div className="text-[11px] tracking-[0.16em] uppercase text-[var(--gold)] font-semibold mb-3 text-center">
          {hasAny
            ? L('هواجسك تنتظرك حيث الفعل', 'Your concerns await where the action is')
            : L('قبل الأرقام', 'Before the numbers')}
        </div>

        {hasAny ? (
          <>
            {concern.text.trim() && (
              <div className="font-serif text-2xl sm:text-4xl font-bold leading-snug text-center mb-6">
                «{concern.text.trim()}»
              </div>
            )}
            {/* each concern gets a real card now that the room is its own */}
            <div className={`grid gap-3 mb-7 ${chosen.length === 1 ? 'max-w-sm mx-auto' : chosen.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
              {chosen.map((c) => (
                <span key={c.k} className="flex flex-col items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-4 py-5 text-center">
                  <span className="text-3xl" aria-hidden>{c.icon}</span>
                  <span className="text-sm font-semibold text-white/95 leading-snug">{ar ? c.ar : c.en}</span>
                  <span className="text-[10px] text-white/55">{L('نتابعه بأرقامك في «اليوم»', 'Tracked with your numbers in Today')}</span>
                </span>
              ))}
            </div>
            <div className="text-center">
              <span className="inline-block text-sm font-semibold text-[#2A1F05] bg-[var(--gold)] rounded-xl px-6 py-3 group-hover:translate-x-0.5 transition-transform">
                {L('تابِعها في «اليوم» ←', 'Follow them in Today →')}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="font-serif text-2xl sm:text-4xl font-bold leading-snug text-center mb-6">
              {L('ما أكبر هاجس يشغل بالك هذه الأيام؟', "What's the biggest thing on your mind these days?")}
            </div>
            {/* a taste of the concerns people bring — any tap heads to Today */}
            <div className="flex flex-wrap justify-center gap-2 mb-7">
              {HAJIS_TYPES_LITE.slice(0, 8).map((c) => (
                <span key={c.k} className="inline-flex items-center gap-1.5 text-xs border border-white/25 rounded-full px-3.5 py-2 text-white/90 group-hover:border-white/40 transition-colors">
                  <span>{c.icon}</span><span>{ar ? c.ar : c.en}</span>
                </span>
              ))}
            </div>
            <div className="text-center">
              <span className="inline-block text-sm font-semibold text-[#2A1F05] bg-[var(--gold)] rounded-xl px-6 py-3 group-hover:translate-x-0.5 transition-transform">
                {L('أخبرنا في «اليوم» ←', 'Tell us in Today →')}
              </span>
            </div>
          </>
        )}

        {/* what happens after the tap — three quiet promises */}
        <div className="grid sm:grid-cols-3 gap-3 mt-9 pt-6 border-t border-white/10 text-center">
          {([
            ['🧠', L('العقل يقرأ صورتك كاملة', 'The Brain reads your whole picture')],
            ['📒', L('الإجابات من سِجلّك أنت، لا من قواعد عامة', 'Answers come from YOUR Log, not generic rules')],
            ['☀', L('الفعل كله يعيش في «اليوم»', 'All the action lives in Today')],
          ] as [string, string][]).map(([icon, line]) => (
            <span key={line} className="text-[11px] text-white/60 leading-relaxed">
              <span className="block text-lg mb-1" aria-hidden>{icon}</span>
              {line}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
