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

interface Concern { types: string[]; text: string; none?: boolean; startedAt?: Record<string, string> }
interface Resolved { k?: string; text?: string; at: string; startedAt?: string | null; how?: { tools: string[]; note: string } }

// the product's rooms a concern is usually resolved in
const RESOLVE_TOOLS: { k: string; ar: string; en: string }[] = [
  { k: 'log', ar: 'السِّجل', en: 'The Log' },
  { k: 'budget', ar: 'الميزانية', en: 'Budgeting' },
  { k: 'whatif', ar: 'ماذا لو', en: 'What-if' },
  { k: 'payoff', ar: 'سداد الديون', en: 'Loan payoff' },
  { k: 'goal', ar: 'صندوق الهدف', en: 'Goal fund' },
  { k: 'freedom', ar: 'الحرية المالية', en: 'Freedom' },
  { k: 'brain', ar: 'العقل', en: 'The Brain' },
  { k: 'stack', ar: 'المكدّس اليومي', en: 'Daily stack' },
  { k: 'other', ar: 'غير ذلك', en: 'Other' },
];

const MONTHS_EN_S = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_AR_S = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const fmtDate = (iso: string | null | undefined, ar: boolean) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getDate()} ${(ar ? MONTHS_AR_S : MONTHS_EN_S)[d.getMonth()]} ${d.getFullYear()}`;
};

export default function HajisOpener() {
  const router = useRouter();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);

  const [concern, setConcern] = useState<Concern>({ types: [], text: '' });
  const [resolved, setResolved] = useState<Resolved[]>([]);
  // the "how was it resolved" mini-dialog, and the history popup
  const [resolveTarget, setResolveTarget] = useState<{ k?: string; text?: string } | null>(null);
  const [howTools, setHowTools] = useState<string[]>([]);
  const [howNote, setHowNote] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  // the sigh: options float away like a released breath, then a wave
  // of relief washes over the cleared room
  const [sighing, setSighing] = useState(false);
  const [relief, setRelief] = useState(false);
  const breatheOut = () => {
    setRelief(true);
    window.setTimeout(() => setRelief(false), 1800);
  };

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('mm-concern');
      if (raw) {
        const parsed = JSON.parse(raw);
        setConcern({
          types: Array.isArray(parsed.types) ? parsed.types : parsed.type ? [parsed.type] : [],
          text: parsed.text ?? '',
          none: !!parsed.none,
          startedAt: parsed.startedAt && typeof parsed.startedAt === 'object' ? parsed.startedAt : {},
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
    // stamp the day the work on this concern began
    const startedAt = { ...(concern.startedAt ?? {}) };
    if (!startedAt[k]) startedAt[k] = new Date().toISOString();
    saveConcern({ types, text: concern.text, none: false, startedAt });
  };
  const chooseNone = () => {
    // let the options drift away first — THEN the room clears
    setSighing(true);
    window.setTimeout(() => {
      saveConcern({ types: [], text: '', none: true, startedAt: concern.startedAt });
      setSighing(false);
      breatheOut();
    }, 750);
  };
  // step 1: the ✓ opens the "how" dialog; step 2 below actually resolves
  const openResolve = (entry: { k?: string; text?: string }) => {
    setHowTools([]);
    setHowNote('');
    setResolveTarget(entry);
  };
  const confirmResolve = () => {
    if (!resolveTarget) return;
    const entry: Resolved = {
      ...resolveTarget,
      at: new Date().toISOString(),
      startedAt: resolveTarget.k ? concern.startedAt?.[resolveTarget.k] ?? null : null,
      how: { tools: howTools, note: howNote.trim() },
    };
    const next = [...resolved, entry];
    try { window.localStorage.setItem('mm-concern-resolved', JSON.stringify(next)); } catch { /* ignore */ }
    setResolved(next);
    if (resolveTarget.k) saveConcern({ types: concern.types.filter((t) => t !== resolveTarget.k), text: concern.text, none: false, startedAt: concern.startedAt });
    else saveConcern({ types: concern.types, text: '', none: false, startedAt: concern.startedAt });
    setResolveTarget(null);
    breatheOut();
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
      {/* the sigh — concerns drift upward and dissolve like a released
          breath; then soft rings ripple out with the relief */}
      <style>{`
        @keyframes mmSighAway { 0% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); } 100% { opacity: 0; transform: translateY(-52px) scale(0.9); filter: blur(5px); } }
        .mm-sigh-away > * { animation: mmSighAway 0.7s ease-in forwards; }
        .mm-sigh-away > *:nth-child(2n) { animation-delay: 0.09s; }
        .mm-sigh-away > *:nth-child(3n) { animation-delay: 0.18s; }
        .mm-sigh-away > *:nth-child(5n) { animation-delay: 0.26s; }
        @keyframes mmReliefRing { 0% { transform: scale(0.15); opacity: 0.65; } 100% { transform: scale(2.8); opacity: 0; } }
        .mm-relief-ring { animation: mmReliefRing 1.5s ease-out forwards; }
        @keyframes mmReliefText { 0% { opacity: 0; transform: translateY(14px) scale(0.85); } 22% { opacity: 1; transform: translateY(0) scale(1.06); } 34% { transform: scale(1); } 70% { opacity: 1; transform: translateY(-6px); } 100% { opacity: 0; transform: translateY(-26px); } }
        .mm-relief-text { animation: mmReliefText 1.8s ease-out forwards; }
        @media (prefers-reduced-motion: reduce) { .mm-sigh-away > *, .mm-relief-ring, .mm-relief-text { animation: none; } .mm-relief-ring { opacity: 0; } }
      `}</style>

      {/* the wave of relief — rings + one long exhale */}
      {relief && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="mm-relief-ring absolute w-40 h-40 rounded-full border-2 border-[var(--gold)]/50"
              style={{ animationDelay: `${i * 0.18}s` }}
            />
          ))}
          <span className="mm-relief-text text-2xl sm:text-3xl font-serif font-bold text-[var(--gold)] drop-shadow-lg">
            😮‍💨 {L('يا للراحة…', 'What a relief…')}
          </span>
        </div>
      )}
      <div className="absolute -top-16 -end-16 w-72 h-72 rounded-full bg-[var(--gold)]/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -start-16 w-64 h-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />
      <div className="relative max-w-3xl mx-auto w-full">

        {/* the running score — concerns this product helped put to rest */}
        {resolved.length > 0 && (
          <div className="flex justify-center mb-4">
            <button
              onClick={() => setHistoryOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-4 py-1.5 text-[11px] font-semibold text-[var(--gold)] hover:bg-[var(--gold)]/20 transition-colors cursor-pointer"
              aria-haspopup="dialog"
            >
              🏆 {L(
                `${resolved.length} ${resolved.length === 1 ? 'هاجس حُلّ' : resolved.length === 2 ? 'هاجسان حُلّا' : 'هواجس حُلّت'} حتى الآن`,
                `${resolved.length} ${resolved.length === 1 ? 'concern' : 'concerns'} resolved so far`
              )}
              {lastResolvedName && <span className="text-white/60 font-normal">· {L('آخرها', 'latest')}: {lastResolvedName}</span>}
              <span className="text-white/50 font-normal">▾</span>
            </button>
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
                  onClick={() => openResolve({ text: concern.text.trim() })}
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
                    onClick={() => openResolve({ k: c.k })}
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
            {/* a clear mind gets a clear room — no options, no noise */}
            <p className="text-center text-[12px] text-white/60 mb-7 max-w-md mx-auto leading-relaxed">
              {L('نبقى معك على المراقبة — وذهنك صافٍ، فلا شيء يستدعي القلق الآن.', 'We keep watch with you — and your mind is clear: nothing calls for worry right now.')}
            </p>
            <div className="text-center">
              <button onClick={goToday} className="inline-block text-sm font-semibold text-[#2A1F05] bg-[var(--gold)] rounded-xl px-6 py-3 hover:translate-x-0.5 transition-transform cursor-pointer">
                {L('إلى «اليوم» حيث الفعل ←', 'To Today, where the action is →')}
              </button>
            </div>
            {/* the one quiet way back, should a season change */}
            <div className="text-center mt-4">
              <button
                onClick={() => saveConcern({ types: [], text: '', none: false, startedAt: concern.startedAt })}
                className="text-[11px] text-white/40 hover:text-white/75 underline underline-offset-4 transition-colors cursor-pointer"
              >
                {L('طرأ هاجس؟ اختره', 'A concern came up? Pick it')}
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
            {/* choose here, directly — up to three. When "nothing" is
                chosen they all drift away like a released breath */}
            <div className={`flex flex-wrap justify-center gap-2 mb-4 ${sighing ? 'mm-sigh-away pointer-events-none' : ''}`}>
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

      {/* ── "how was it resolved?" — the closing note before a concern
             joins the trophy shelf ── */}
      {resolveTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60" onClick={() => setResolveTarget(null)} />
          <div className="relative w-full max-w-md bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 text-start">
            <div className="font-serif text-base font-semibold text-[var(--ink)] mb-1">
              ✓ {L('كيف حُلّ هذا الهاجس؟', 'How was this concern resolved?')}
            </div>
            <p className="text-[11px] text-[var(--muted)] leading-relaxed mb-3">
              {L('سطران للتاريخ: ماذا فعلت، وأي الأدوات ساعدتك — لتقرأه لاحقاً بفخر.', 'Two lines for the record: what you did, and which tools helped — to read back later with pride.')}
            </p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {RESOLVE_TOOLS.map((tl) => {
                const on = howTools.includes(tl.k);
                return (
                  <button
                    key={tl.k}
                    onClick={() => setHowTools((p) => (on ? p.filter((x) => x !== tl.k) : [...p, tl.k]))}
                    aria-pressed={on}
                    className={`text-[10px] font-medium rounded-full px-2.5 py-1 border transition-colors cursor-pointer ${
                      on ? 'border-transparent bg-[var(--green-dark)] text-white' : 'border-[var(--border-default)] text-[var(--ink-2)] hover:border-[var(--green)]'
                    }`}
                  >
                    {ar ? tl.ar : tl.en}
                  </button>
                );
              })}
            </div>
            <textarea
              value={howNote}
              onChange={(e) => setHowNote(e.target.value)}
              rows={2}
              placeholder={L('ماذا فعلت؟ (اختياري)', 'What did you do? (optional)')}
              className="w-full bg-[var(--surface-1)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--green)] mb-3 resize-none"
            />
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setResolveTarget(null)} className="text-[11px] text-[var(--muted)] hover:text-[var(--ink)] px-3 py-2 cursor-pointer">
                {L('إلغاء', 'Cancel')}
              </button>
              <button onClick={confirmResolve} className="text-[11px] font-semibold text-white bg-[var(--green-dark)] rounded-lg px-4 py-2 cursor-pointer">
                🏆 {L('سجّله محلولاً', 'Mark it resolved')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── the trophy shelf — every concern this product helped put to
             rest: what it was, when work began, when it ended, and how ── */}
      {historyOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60" onClick={() => setHistoryOpen(false)} />
          <div className="relative w-full max-w-lg max-h-[80vh] overflow-y-auto bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 text-start">
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <div className="font-serif text-base font-semibold text-[var(--ink)]">🏆 {L('هواجس وضعناها خلفك', 'Concerns put behind you')}</div>
              <button onClick={() => setHistoryOpen(false)} className="text-[var(--muted)] hover:text-[var(--ink)] text-sm cursor-pointer" aria-label={L('أغلق', 'Close')}>✕</button>
            </div>
            <p className="text-[11px] text-[var(--muted)] leading-relaxed mb-4">
              {L('واحداً بعد الآخر — هذا سِجل ما قلق ثم انحلّ.', 'One after the other — the record of what worried you, then dissolved.')}
            </p>
            <div className="flex flex-col gap-2.5">
              {[...resolved].reverse().map((r, i) => {
                const meta = r.k ? HAJIS_TYPES_LITE.find((x) => x.k === r.k) : null;
                const name = meta ? (ar ? meta.ar : meta.en) : r.text ? `«${r.text}»` : L('هاجس', 'A concern');
                const started = fmtDate(r.startedAt, ar);
                const ended = fmtDate(r.at, ar);
                const days = r.startedAt && r.at ? Math.max(1, Math.round((new Date(r.at).getTime() - new Date(r.startedAt).getTime()) / 86400000)) : null;
                const tools = (r.how?.tools ?? []).map((k) => RESOLVE_TOOLS.find((t) => t.k === k)).filter(Boolean) as typeof RESOLVE_TOOLS;
                return (
                  <div key={i} className="rounded-xl border border-[var(--border-faint)] bg-[var(--surface-1)] px-3.5 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      {meta && <span className="text-base" aria-hidden>{meta.icon}</span>}
                      <span className="text-[12px] font-semibold text-[var(--ink)]">{name}</span>
                      <span className="ms-auto text-[10px] font-semibold text-[var(--green-dark)]">✓ {L('حُلّ', 'Resolved')}</span>
                    </div>
                    <div className="text-[10px] text-[var(--muted)]">
                      {started
                        ? L(`بدأ العمل عليه: ${started}`, `Work began: ${started}`)
                        : L('بداية العمل: غير مسجَّلة', 'Work began: not recorded')}
                      {ended && <> · {L(`اكتمل: ${ended}`, `Resolved: ${ended}`)}</>}
                      {days !== null && <> · {L(`خلال ${days} ${days === 1 ? 'يوم' : days === 2 ? 'يومين' : 'أيام'}`, `in ${days} ${days === 1 ? 'day' : 'days'}`)}</>}
                    </div>
                    {(tools.length > 0 || r.how?.note) && (
                      <div className="mt-2 pt-2 border-t border-[var(--border-faint)]">
                        {tools.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-1">
                            {tools.map((t) => (
                              <span key={t.k} className="text-[9px] font-medium rounded-full border border-[var(--green-border)] bg-[var(--green-bg)]/50 text-[var(--green-dark)] px-2 py-0.5">
                                {ar ? t.ar : t.en}
                              </span>
                            ))}
                          </div>
                        )}
                        {r.how?.note && <div className="text-[10px] text-[var(--ink-2)] leading-relaxed">{r.how.note}</div>}
                      </div>
                    )}
                    {!r.how?.tools?.length && !r.how?.note && (
                      <div className="mt-1 text-[9px] text-[var(--muted)] italic">{L('لم يُسجَّل كيف حُلّ.', 'How it was resolved was not recorded.')}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
