'use client';

// The hājis hero — home·D1's only resident. It opens by asking for the
// person's MAJOR concern (choosing "nothing right now" is a first-class
// answer — some seasons carry no big worry), tracks the ones being
// tackled, lets each be marked RESOLVED, and keeps the running count of
// concerns the product has helped put to rest — one after the other.
// The action itself always lives in Today.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { HAJIS_TYPES_LITE } from '@/components/shared/HajisBlock';
import { announcePageNav } from '@/lib/phoneNav';

interface Concern { types: string[]; text: string; none?: boolean }
interface Resolved { k?: string; text?: string; at: string }

export default function HajisOpener() {
  const router = useRouter();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);

  const [concern, setConcern] = useState<Concern>({ types: [], text: '' });
  const [resolved, setResolved] = useState<Resolved[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('mm-concern');
      if (raw) {
        const parsed = JSON.parse(raw);
        setConcern({
          types: Array.isArray(parsed.types) ? parsed.types : parsed.type ? [parsed.type] : [],
          text: parsed.text ?? '',
          none: !!parsed.none,
        });
      }
      const rawR = window.localStorage.getItem('mm-concern-resolved');
      if (rawR) {
        const parsedR = JSON.parse(rawR);
        if (Array.isArray(parsedR)) setResolved(parsedR);
      }
    } catch { /* ignore */ }
  }, []);

  const saveConcern = (c: Concern) => {
    try { window.localStorage.setItem('mm-concern', JSON.stringify(c)); } catch { /* ignore */ }
    setConcern(c);
  };
  const pick = (k: string) => {
    const types = concern.types.includes(k) ? concern.types : [...concern.types, k].slice(0, 3);
    saveConcern({ types, text: concern.text, none: false });
  };
  const chooseNone = () => saveConcern({ types: [], text: '', none: true });
  const resolve = (entry: { k?: string; text?: string }) => {
    const next = [...resolved, { ...entry, at: new Date().toISOString() }];
    try { window.localStorage.setItem('mm-concern-resolved', JSON.stringify(next)); } catch { /* ignore */ }
    setResolved(next);
    if (entry.k) saveConcern({ types: concern.types.filter((t) => t !== entry.k), text: concern.text, none: false });
    else saveConcern({ types: concern.types, text: '', none: false });
  };

  const chosen = concern.types
    .map((k) => HAJIS_TYPES_LITE.find((x) => x.k === k))
    .filter((x): x is (typeof HAJIS_TYPES_LITE)[number] => !!x);
  const hasAny = chosen.length > 0 || !!concern.text.trim();

  const goToday = () => {
    announcePageNav({ dir: ar ? 'right' : 'left', icon: '☀', label: L('اليوم', 'Today') });
    router.push('/today');
  };

  const lastResolved = resolved[resolved.length - 1];
  const lastResolvedName = lastResolved
    ? lastResolved.k
      ? (() => { const t = HAJIS_TYPES_LITE.find((x) => x.k === lastResolved.k); return t ? (ar ? t.ar : t.en) : null; })()
      : lastResolved.text ? `«${lastResolved.text}»` : null
    : null;

  return (
    <div className="drv-story w-full bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] rounded-2xl mb-6 p-7 sm:p-12 text-white relative overflow-hidden min-h-[52vh] flex flex-col justify-center">
      <div className="absolute -top-16 -end-16 w-72 h-72 rounded-full bg-[var(--gold)]/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -start-16 w-64 h-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />
      <div className="relative max-w-3xl mx-auto w-full">

        {/* the running score — concerns this product helped put to rest */}
        {resolved.length > 0 && (
          <div className="flex justify-center mb-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-4 py-1.5 text-[11px] font-semibold text-[var(--gold)]">
              🏆 {L(
                `${resolved.length} ${resolved.length === 1 ? 'هاجس حُلّ' : resolved.length === 2 ? 'هاجسان حُلّا' : 'هواجس حُلّت'} حتى الآن`,
                `${resolved.length} ${resolved.length === 1 ? 'concern' : 'concerns'} resolved so far`
              )}
              {lastResolvedName && <span className="text-white/60 font-normal">· {L('آخرها', 'latest')}: {lastResolvedName}</span>}
            </span>
          </div>
        )}

        {hasAny ? (
          <>
            <div className="text-[11px] tracking-[0.16em] uppercase text-[var(--gold)] font-semibold mb-3 text-center">
              {L('هواجسك قيد المعالجة — واحداً بعد الآخر', 'Your concerns, being tackled — one after the other')}
            </div>
            {concern.text.trim() && (
              <div className="text-center mb-5">
                <div className="font-serif text-2xl sm:text-3xl font-bold leading-snug">«{concern.text.trim()}»</div>
                <button
                  onClick={() => resolve({ text: concern.text.trim() })}
                  className="mt-2 text-[10px] font-semibold text-white/60 hover:text-[var(--gold)] border border-white/20 hover:border-[var(--gold)]/50 rounded-full px-3 py-1 transition-colors cursor-pointer"
                >
                  ✓ {L('حُلّ هذا الهاجس', 'This one is resolved')}
                </button>
              </div>
            )}
            <div className={`grid gap-3 mb-7 ${chosen.length === 1 ? 'max-w-sm mx-auto' : chosen.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
              {chosen.map((c) => (
                <div key={c.k} className="flex flex-col items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-4 py-5 text-center">
                  <span className="text-3xl" aria-hidden>{c.icon}</span>
                  <span className="text-sm font-semibold text-white/95 leading-snug">{ar ? c.ar : c.en}</span>
                  <span className="text-[10px] text-white/55">{L('نتابعه بأرقامك في «اليوم»', 'Tracked with your numbers in Today')}</span>
                  <button
                    onClick={() => resolve({ k: c.k })}
                    className="text-[10px] font-semibold text-white/60 hover:text-[var(--gold)] border border-white/20 hover:border-[var(--gold)]/50 rounded-full px-3 py-1 transition-colors cursor-pointer"
                  >
                    ✓ {L('حُلّ', 'Resolved')}
                  </button>
                </div>
              ))}
            </div>
            <div className="text-center">
              <button onClick={goToday} className="inline-block text-sm font-semibold text-[#2A1F05] bg-[var(--gold)] rounded-xl px-6 py-3 hover:translate-x-0.5 transition-transform cursor-pointer">
                {L('تابِعها في «اليوم» ←', 'Follow them in Today →')}
              </button>
            </div>
          </>
        ) : concern.none ? (
          <>
            <div className="text-[11px] tracking-[0.16em] uppercase text-[var(--gold)] font-semibold mb-3 text-center">
              {L('صافي البال', 'Clear-minded')}
            </div>
            <div className="font-serif text-2xl sm:text-4xl font-bold leading-snug text-center mb-4">
              {L('لا هاجس كبير هذه الفترة — وهذا إنجاز بحد ذاته.', 'No major concern this season — that is an achievement in itself.')}
            </div>
            <p className="text-center text-[12px] text-white/60 mb-7 max-w-md mx-auto leading-relaxed">
              {L('نبقى معك على المراقبة. ومتى طرأ هاجس، اختره من هنا ونتولاه معاً.', "We keep watch with you. Whenever one arises, pick it here and we'll take it on together.")}
            </p>
            <div className="flex flex-wrap justify-center gap-2 mb-7">
              {HAJIS_TYPES_LITE.slice(0, 8).map((c) => (
                <button key={c.k} onClick={() => pick(c.k)} className="inline-flex items-center gap-1.5 text-xs border border-white/25 rounded-full px-3.5 py-2 text-white/90 hover:border-[var(--gold)]/60 hover:text-white transition-colors cursor-pointer">
                  <span>{c.icon}</span><span>{ar ? c.ar : c.en}</span>
                </button>
              ))}
            </div>
            <div className="text-center">
              <button onClick={goToday} className="inline-block text-sm font-semibold text-[#2A1F05] bg-[var(--gold)] rounded-xl px-6 py-3 hover:translate-x-0.5 transition-transform cursor-pointer">
                {L('إلى «اليوم» حيث الفعل ←', 'To Today, where the action is →')}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-[11px] tracking-[0.16em] uppercase text-[var(--gold)] font-semibold mb-3 text-center">
              {L('قبل الأرقام', 'Before the numbers')}
            </div>
            <div className="font-serif text-2xl sm:text-4xl font-bold leading-snug text-center mb-6">
              {L('ما أكبر هاجس يشغل بالك هذه الأيام؟', "What's the biggest thing on your mind these days?")}
            </div>
            {/* choose here, directly — up to three */}
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {HAJIS_TYPES_LITE.slice(0, 8).map((c) => (
                <button key={c.k} onClick={() => pick(c.k)} className="inline-flex items-center gap-1.5 text-xs border border-white/25 rounded-full px-3.5 py-2 text-white/90 hover:border-[var(--gold)]/60 hover:text-white transition-colors cursor-pointer">
                  <span>{c.icon}</span><span>{ar ? c.ar : c.en}</span>
                </button>
              ))}
            </div>
            {/* no concern is a valid answer */}
            <div className="text-center mb-7">
              <button onClick={chooseNone} className="text-[11px] text-white/50 hover:text-white/80 underline underline-offset-4 transition-colors cursor-pointer">
                {L('لا شيء كبير يشغلني حالياً', 'Nothing major on my mind right now')}
              </button>
            </div>
            <div className="text-center">
              <button onClick={goToday} className="inline-block text-sm font-semibold text-[#2A1F05] bg-[var(--gold)] rounded-xl px-6 py-3 hover:translate-x-0.5 transition-transform cursor-pointer">
                {L('أو أخبرنا بكلماتك في «اليوم» ←', 'Or tell us in your own words in Today →')}
              </button>
            </div>
          </>
        )}

        {/* what happens after the choice — three quiet promises */}
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
    </div>
  );
}
