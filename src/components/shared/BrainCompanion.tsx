'use client';

// The Brain — MalMind's mascot, the face of all AI interaction, and now the
// resident tour guide. A voxel figure perched at the side of the screen,
// vertically centred on wherever you're looking. It narrates every page in a
// speech bubble ("you're viewing X, built to help you understand Y — walk out
// able to say Z"), can JUMP across the screen to point at a specific element
// with a spotlight, and lets the user choose how chatty it is: narrate every
// page, speak only when asked, or stay muted. Click it for its training panel
// and the door to the advisor.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Canvas, useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import {
  BRAIN_SOURCES, BRAIN_VOXELS, brainAppearance, cacheBrainLevel, cachedBrainLevel,
  computeBrainStats, type BrainStats,
} from '@/lib/brain';
import { getGuide, getGuideMode, setGuideMode, type GuideMode, type GuidePoint } from '@/lib/brainGuide';

const V = 0.17; // voxel size

function BrainFigure({ level, excitementRef }: { level: number; excitementRef: React.RefObject<number> }) {
  const group = useRef<Group>(null);
  const orbit = useRef<Group>(null);
  const look = brainAppearance(level);
  const voxels = useMemo(() => BRAIN_VOXELS.slice(0, look.voxelCount), [look.voxelCount]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const ex = Math.max(0, excitementRef.current ?? 0);
    if (group.current) {
      // Slow, breathing motion — excitement adds only a gentle lift, never a
      // frantic bounce.
      group.current.position.y = Math.sin(t * (1.1 + ex * 1.1)) * (0.045 + ex * 0.05) - 0.1;
      group.current.rotation.y = t * (0.18 + ex * 0.3);
      const squash = 1 + Math.sin(t * (1.1 + ex * 1.1)) * ex * 0.02;
      group.current.scale.set(1, squash, 1);
    }
    if (orbit.current) orbit.current.rotation.y = t * 0.7;
    if (excitementRef.current && excitementRef.current > 0) excitementRef.current *= 0.96;
  });

  return (
    <group ref={group}>
      {voxels.map((v, i) => {
        const kind = v.kind === 'groove' && !look.showGrooves ? 'flesh' : v.kind === 'synapse' && !look.showSynapses ? 'flesh' : v.kind;
        const color = kind === 'synapse' ? '#E4C465' : kind === 'groove' ? '#B76B84' : '#E8A0B4';
        return (
          <mesh key={i} position={[v.x * V, (v.y - 1.4) * V, v.z * V]}>
            <boxGeometry args={[V * 0.96, V * 0.96, V * 0.96]} />
            <meshStandardMaterial
              color={color}
              emissive={look.glow && kind === 'synapse' ? '#C9A84C' : '#000000'}
              emissiveIntensity={look.glow && kind === 'synapse' ? 0.55 : 0}
            />
          </mesh>
        );
      })}
      {/* brain stem */}
      <mesh position={[0, -3 * V + 0.35 * V, -0.5 * V]}>
        <boxGeometry args={[V * 1.4, V * 1.2, V * 1.4]} />
        <meshStandardMaterial color="#B76B84" />
      </mesh>
      {/* orbiting sparks at high levels */}
      {look.orbitals > 0 && (
        <group ref={orbit}>
          {Array.from({ length: look.orbitals }).map((_, i) => (
            <mesh key={i} position={[Math.cos((i * Math.PI * 2) / look.orbitals) * 0.85, 0.1 + i * 0.18, Math.sin((i * Math.PI * 2) / look.orbitals) * 0.85]}>
              <octahedronGeometry args={[0.07, 0]} />
              <meshStandardMaterial color="#E4C465" emissive="#C9A84C" emissiveIntensity={0.8} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

// While pointing: where the Brain flew to, and what it's spotlighting.
interface Pointing {
  point: GuidePoint;
  brain: { left: number; top: number };
  target: { left: number; top: number; width: number; height: number };
  brainOnLeft: boolean; // Brain sits to the target's left → points right
}

export default function BrainCompanion() {
  const supabase = createClient();
  const pathname = usePathname();
  const router = useRouter();
  const { t, locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const [stats, setStats] = useState<BrainStats | null>(null);
  const [open, setOpen] = useState(false);
  const excitementRef = useRef(0);

  // ── Guide state ──
  const guide = useMemo(() => getGuide(pathname), [pathname]);
  const [mode, setMode] = useState<GuideMode>('auto');
  const [bubbleOpen, setBubbleOpen] = useState(false);
  const [pointing, setPointing] = useState<Pointing | null>(null);
  const pointingTimer = useRef<number | null>(null);
  const settleGuard = useRef(0);

  useEffect(() => { setMode(getGuideMode()); }, []);

  // ── Shift+B (command mode) summons the Brain: it comments on the current
  // view and offers its ask box, ready to type into.
  const [ask, setAsk] = useState('');
  const askInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    // ⇧B toggles: first tap summons the figure's bubble, a second tap
    // (Shift still held) dismisses it — the reverse move.
    const onSummon = () => {
      endPointing();
      if (guide) {
        setOpen(false);
        // NOTE: the ask box is deliberately NOT auto-focused — focus landing
        // in the input would swallow the second ⇧B as typed text and break
        // the toggle. The box sits ready one click away instead.
        setBubbleOpen((was) => {
          if (!was) excitementRef.current = 0.8;
          return !was;
        });
      } else {
        setBubbleOpen(false);
        setOpen((was) => !was); // no page guide here — toggle the panel instead
      }
    };
    window.addEventListener('mm-brain-summon', onSummon);
    return () => window.removeEventListener('mm-brain-summon', onSummon);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guide]);

  function sendAsk(e?: React.FormEvent) {
    e?.preventDefault();
    const q = ask.trim();
    if (!q) return;
    try { window.sessionStorage.setItem('mm-ask', q); } catch { /* ignore */ }
    setAsk('');
    setBubbleOpen(false);
    router.push('/advisor');
  }

  // The demo tour runs its own spotlight walkthrough — stay quiet during it.
  const tourActive = () => {
    try {
      return window.localStorage.getItem('mm-demo') === '1' && window.localStorage.getItem('mm-demo-done') !== '1';
    } catch { return false; }
  };

  // Narrate on arrival (auto mode), and always stop pointing on navigation.
  useEffect(() => {
    endPointing();
    setBubbleOpen(mode === 'auto' && !!guide && !tourActive());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, mode, guide]);

  function chooseMode(m: GuideMode) {
    setGuideMode(m);
    setMode(m);
    if (m === 'off') { setBubbleOpen(false); endPointing(); }
    if (m === 'auto' && guide) setBubbleOpen(true);
  }

  function endPointing() {
    if (pointingTimer.current) { window.clearTimeout(pointingTimer.current); pointingTimer.current = null; }
    setPointing(null);
  }

  // Jump to an element and point at it: scroll it centre-screen, spotlight it,
  // and land the Brain beside it with a word about what it's looking at.
  const pointAt = useCallback((point: GuidePoint) => {
    const el = document.querySelector(point.selector);
    if (!el) return; // anchor not on screen (e.g. empty state) — stay put
    setBubbleOpen(false);
    // Instant scroll: smooth scrolling runs on rAF, which stalls entirely in
    // background tabs — and the Brain's own flight is the animation that
    // matters. The settle poll below still absorbs late layout shifts.
    el.scrollIntoView({ block: 'center', behavior: 'auto' });
    settleGuard.current = Date.now() + 3000; // our own scroll, not the user's

    const start = Date.now();
    let lastY = Number.NaN;
    const settle = () => {
      const y = window.scrollY;
      const moving = Number.isNaN(lastY) || Math.abs(y - lastY) >= 2;
      lastY = y;
      if (moving && Date.now() - start < 2000) { window.setTimeout(settle, 130); return; }

      const r = el.getBoundingClientRect();
      // Anchor to the centre of the VISIBLE part — tall sections can exceed
      // the viewport, and the Brain should hover next to what the eye sees.
      const visibleCenterY = (Math.max(r.top, 0) + Math.min(r.bottom, window.innerHeight)) / 2;
      const brainW = 96;
      const brainOnLeft = r.left > brainW + 24; // room on the left?
      const left = brainOnLeft ? Math.max(8, r.left - brainW - 16) : Math.min(window.innerWidth - brainW - 8, r.right + 16);
      const top = Math.max(8, Math.min(window.innerHeight - brainW - 8, visibleCenterY - brainW / 2));
      excitementRef.current = 1; // the jump — lively, not frantic
      setPointing({
        point,
        brain: { left, top },
        target: { left: r.left, top: r.top, width: r.width, height: r.height },
        brainOnLeft,
      });
      settleGuard.current = Date.now() + 500; // let the landing finish
      // Wander back to the perch after a good look.
      pointingTimer.current = window.setTimeout(() => { setPointing(null); setBubbleOpen(getGuideMode() === 'auto'); }, 9000);
    };
    window.setTimeout(settle, 260);
  }, []);

  // A real user scroll or resize while pointing → the spotlight is stale; let go.
  useEffect(() => {
    if (!pointing) return;
    const onMove = () => { if (Date.now() > settleGuard.current) endPointing(); };
    window.addEventListener('scroll', onMove, { passive: true });
    window.addEventListener('resize', onMove);
    return () => { window.removeEventListener('scroll', onMove); window.removeEventListener('resize', onMove); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointing]);

  // Train-o-meter: count rows across every table the Brain feeds on.
  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const counts: Record<string, number> = {};
    await Promise.all(
      BRAIN_SOURCES.map(async (s) => {
        try {
          const { data } = await supabase.from(s.key).select('id').eq('user_id', user.id);
          counts[s.key] = Array.isArray(data) ? data.length : 0;
        } catch {
          counts[s.key] = 0;
        }
      })
    );
    const { data: profile } = await supabase
      .from('profiles')
      .select('monthly_income, liquid_savings, monthly_debt_payments, has_health_insurance, age, monthly_housing_payment, monthly_investment_contribution')
      .eq('id', user.id)
      .single();

    const computed = computeBrainStats(counts, profile ?? null);
    cacheBrainLevel(computed.level.level); // for lightweight renders elsewhere
    setStats(computed);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  // A gentle stir on navigation and scroll — never a frenzy.
  useEffect(() => {
    excitementRef.current = 0.7;
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => {
      excitementRef.current = Math.min(0.5, (excitementRef.current ?? 0) + 0.1);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!stats) return null;
  const { level, nextLevel, xp, progressToNext, suggestions } = stats;
  const levelName = t(`brain.level.${level.level}.name`);
  const levelBlurb = t(`brain.level.${level.level}.blurb`);
  const nextName = nextLevel ? t(`brain.level.${nextLevel.level}.name`) : '';

  const pick = (l: { ar: string; en: string }) => (ar ? l.ar : l.en);
  const showChip = mode === 'manual' && !!guide && !bubbleOpen && !pointing && !tourActive();

  // Perch: side of the screen, centred on the viewport — or wherever it flew.
  // Always the inline-END side (left in Arabic, right in English), so it
  // never overlaps the iceberg rail perched on the start side.
  const brainStyle: React.CSSProperties = pointing
    ? { left: pointing.brain.left, top: pointing.brain.top, right: 'auto', transform: 'none' }
    : ar
      ? { left: 12, right: 'auto', top: '50%', transform: 'translateY(-50%)' }
      : { right: 12, left: 'auto', top: '50%', transform: 'translateY(-50%)' };

  return (
    <>
      {/* spotlight while pointing */}
      {pointing && (
        <div
          className="fixed z-[38] rounded-xl border-2 border-[#5DCAA5] pointer-events-none transition-all duration-300"
          style={{
            left: pointing.target.left - 6,
            top: pointing.target.top - 6,
            width: pointing.target.width + 12,
            height: pointing.target.height + 12,
            boxShadow: '0 0 0 9999px rgba(6, 18, 13, 0.45)',
          }}
          aria-hidden
        />
      )}

      {/* the floating Brain — perched mid-screen, or off pointing at something */}
      <button
        onClick={() => {
          if (pointing) { endPointing(); return; }
          setOpen((o) => !o);
          setBubbleOpen(false);
          excitementRef.current = 0.9;
        }}
        title={t('brain.tooltip', { level: level.level, name: levelName })}
        className="mm-brain fixed z-40 w-20 h-20 sm:w-24 sm:h-24 rounded-full cursor-pointer focus:outline-none transition-all duration-700"
        style={{ background: 'transparent', transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)', ...brainStyle }}
        aria-label={t('brain.open')}
      >
        <Canvas camera={{ position: [0, 0.2, 2.3], fov: 40 }} dpr={[1, 1.5]} gl={{ alpha: true }} style={{ pointerEvents: 'none' }}>
          <ambientLight intensity={0.85} />
          <directionalLight position={[3, 4, 5]} intensity={1.1} />
          <BrainFigure level={level.level} excitementRef={excitementRef} />
        </Canvas>
        {/* the pointing hand, aimed at the spotlighted element */}
        {pointing && (
          <span
            className="absolute top-1/2 -translate-y-1/2 text-2xl"
            style={{ [pointing.brainOnLeft ? 'right' : 'left']: -26, animation: 'mmPointNudge 0.9s ease-in-out infinite' }}
            aria-hidden
          >
            {pointing.brainOnLeft ? '👉' : '👈'}
          </span>
        )}
      </button>
      <style>{`@keyframes mmPointNudge { 0%,100% { transform: translateY(-50%) translateX(0); } 50% { transform: translateY(-50%) translateX(${'6px'}); } }`}</style>

      {/* "speak" chip in ask-first mode */}
      {showChip && (
        <button
          onClick={() => { setBubbleOpen(true); excitementRef.current = 0.8; }}
          className="fixed z-40 right-4 sm:right-6 w-8 h-8 rounded-full bg-[var(--surface-card)] border border-[var(--green-border)] shadow-lg text-sm flex items-center justify-center hover:border-[var(--green)]"
          style={{ top: 'calc(50% - 64px)' }}
          title={L('ماذا أرى هنا؟', 'What am I looking at?')}
          aria-label={L('اشرح هذه الصفحة', 'Explain this page')}
        >
          💬
        </button>
      )}

      {/* the talking bubble */}
      {bubbleOpen && guide && !open && !pointing && (
        <div
          className="fixed z-40 top-1/2 -translate-y-1/2 right-[96px] sm:right-[116px] w-[300px] max-w-[calc(100vw-120px)] bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl shadow-2xl p-4"
          role="dialog"
          aria-label={L('دليل الصفحة', 'Page guide')}
        >
          {/* speech tail toward the Brain */}
          <span className="absolute top-1/2 -translate-y-1/2 -right-[7px] w-3.5 h-3.5 rotate-45 bg-[var(--surface-card)] border-t border-r border-[var(--border-default)]" aria-hidden />

          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[10px] tracking-[0.12em] uppercase text-[var(--gold)]">{L('دليلك هنا', 'Your guide here')}</span>
            <button onClick={() => setBubbleOpen(false)} className="text-[var(--muted)] hover:text-[var(--ink)] text-xs" aria-label={L('إغلاق', 'Close')}>✕</button>
          </div>

          <p className="text-xs text-[var(--ink)] leading-relaxed mb-2">{pick(guide.what)}</p>
          <p className="text-[11px] text-[var(--green-dark)] leading-relaxed border-s-2 border-[var(--green-border)] ps-2.5 mb-3 italic">
            {pick(guide.opinion)}
          </p>

          {guide.points && guide.points.length > 0 && (
            <div className="mb-3">
              <div className="text-[10px] text-[var(--muted)] mb-1.5">{L('أرِني:', 'Show me:')}</div>
              <div className="flex gap-1.5 flex-wrap">
                {guide.points.map((p) => (
                  <button
                    key={p.selector}
                    onClick={() => pointAt(p)}
                    className="text-[10px] font-medium bg-[var(--green-bg)] border border-[var(--green-border)] text-[var(--green-dark)] rounded-full px-2.5 py-1 hover:border-[var(--green)]"
                  >
                    👉 {pick(p.label)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ask me about this view */}
          <form onSubmit={sendAsk} className="flex items-center gap-1.5 mb-2.5">
            <input
              ref={askInputRef}
              value={ask}
              onChange={(e) => setAsk(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') { e.currentTarget.blur(); setBubbleOpen(false); } }}
              placeholder={L('اسألني عن هذه الصفحة…', 'Ask me about this view…')}
              className="flex-1 min-w-0 bg-[var(--surface-0)] border border-[var(--border-default)] rounded-full px-3 py-1.5 text-[11px] outline-none focus:border-[var(--green)]"
            />
            <button
              type="submit"
              className="shrink-0 text-[11px] font-semibold bg-[var(--green-dark)] text-white rounded-full px-3 py-1.5"
            >
              {L('اسأل', 'Ask')}
            </button>
          </form>

          {/* how chatty should I be? */}
          <div className="flex items-center gap-1 pt-2 border-t border-[var(--border-faint)]">
            <span className="text-[10px] text-[var(--muted)] me-1">{L('وضعي:', 'My mode:')}</span>
            {([['auto', L('تلقائي', 'Auto')], ['manual', L('عند الطلب', 'On ask')], ['off', L('كتم', 'Mute')]] as [GuideMode, string][]).map(([m, label]) => (
              <button
                key={m}
                onClick={() => chooseMode(m)}
                className={`text-[10px] px-2 py-0.5 rounded-full border ${
                  mode === m
                    ? 'bg-[var(--ink)] text-[var(--surface-0)] border-[var(--ink)] font-semibold'
                    : 'bg-transparent text-[var(--muted)] border-[var(--border-medium)] hover:text-[var(--ink-2)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* mini-bubble while pointing */}
      {pointing && (
        <div
          className="fixed z-40 w-[240px] max-w-[70vw] bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl shadow-2xl p-3"
          style={{
            left: Math.max(8, Math.min(window.innerWidth - 250, pointing.brain.left - 70)),
            top: pointing.brain.top > 140 ? pointing.brain.top - 110 : pointing.brain.top + 104,
          }}
        >
          <p className="text-[11px] text-[var(--ink)] leading-relaxed">{pick(pointing.point.text)}</p>
          <button onClick={endPointing} className="text-[10px] text-[var(--muted)] hover:text-[var(--ink)] mt-1.5">
            {L('حسناً، فهمت', 'Got it')}
          </button>
        </div>
      )}

      {/* training panel */}
      {open && (
        <div className="mm-brain-panel fixed top-1/2 -translate-y-1/2 right-4 sm:right-[116px] z-50 w-80 max-w-[92vw] bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl shadow-2xl p-5">
          <div className="flex items-start justify-between mb-1">
            <div>
              <div className="text-[10px] tracking-[0.12em] uppercase text-[var(--gold)]">{t('brain.title')}</div>
              <div className="font-serif text-lg font-semibold text-[var(--ink)]">
                {t('brain.levelName', { level: level.level, name: levelName })}
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-[var(--muted)] hover:text-[var(--ink)] text-sm">✕</button>
          </div>
          <p className="text-xs text-[var(--ink-2)] leading-relaxed mb-3">{levelBlurb}</p>

          <div className="flex justify-between items-baseline mb-1">
            <span className="text-[10px] text-[var(--muted)]">{t('brain.synapses', { xp })}</span>
            <span className="text-[10px] text-[var(--muted)]">
              {nextLevel
                ? t('brain.toNext', { n: nextLevel.minXp - xp, level: nextLevel.level, name: nextName })
                : t('brain.fullyTrained')}
            </span>
          </div>
          <div className="h-2 bg-[var(--surface-1)] rounded-full overflow-hidden mb-4">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#1D9E75] to-[#5DCAA5] transition-all duration-700"
              style={{ width: `${Math.max(4, progressToNext * 100)}%` }}
            />
          </div>

          {/* page-guide mode — also the recovery path once muted */}
          <div className="flex items-center gap-1 mb-4">
            <span className="text-[10px] text-[var(--muted)] me-1">{L('دليل الصفحات:', 'Page guide:')}</span>
            {([['auto', L('تلقائي', 'Auto')], ['manual', L('عند الطلب', 'On ask')], ['off', L('كتم', 'Mute')]] as [GuideMode, string][]).map(([m, label]) => (
              <button
                key={m}
                onClick={() => chooseMode(m)}
                className={`text-[10px] px-2 py-0.5 rounded-full border ${
                  mode === m
                    ? 'bg-[var(--ink)] text-[var(--surface-0)] border-[var(--ink)] font-semibold'
                    : 'bg-transparent text-[var(--muted)] border-[var(--border-medium)] hover:text-[var(--ink-2)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {suggestions.length > 0 && (
            <div className="mb-4">
              <div className="text-[10px] tracking-[0.08em] uppercase text-[var(--muted)] mb-2">{t('brain.feed')}</div>
              <ul className="flex flex-col gap-1.5">
                {suggestions.map((s) => (
                  <li key={s.i18nKey} className="text-xs">
                    <Link href={s.href} onClick={() => setOpen(false)} className="flex items-center justify-between gap-2 text-[var(--ink-2)] hover:text-[var(--green-dark)] group">
                      <span className="group-hover:underline">{t(s.i18nKey)}</span>
                      <span className="text-[10px] text-[var(--gold)] whitespace-nowrap">+{s.possible - s.earned}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Link
            href="/advisor"
            onClick={() => setOpen(false)}
            className="block w-full text-center text-sm font-semibold bg-[var(--green-dark)] text-white rounded-lg px-4 py-2.5"
          >
            {t('brain.ask')}
          </Link>
          <p className="text-[10px] text-[var(--muted)] mt-2 text-center">
            {t('brain.footer')}
          </p>
        </div>
      )}
    </>
  );
}

// A small inline Brain for embedding next to UI (e.g. the hub pages' prompt
// bar). Purely presentational: renders at the last computed level (the
// floating companion keeps the cache warm) and links to the advisor.
export function MiniBrain({ className = '' }: { className?: string }) {
  const idleRef = useRef(0);
  const { t } = useLocale();
  return (
    <Link
      href="/advisor"
      title={t('brain.title')}
      aria-label={t('brain.open')}
      className={`block w-16 h-16 shrink-0 ${className}`}
    >
      <Canvas camera={{ position: [0, 0.2, 2.3], fov: 40 }} dpr={[1, 1.5]} gl={{ alpha: true }} style={{ pointerEvents: 'none' }}>
        <ambientLight intensity={0.85} />
        <directionalLight position={[3, 4, 5]} intensity={1.1} />
        <BrainFigure level={cachedBrainLevel()} excitementRef={idleRef} />
      </Canvas>
    </Link>
  );
}
