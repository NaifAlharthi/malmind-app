'use client';

// Wraps every page and choreographs the depth-change transition: when the
// iceberg's level changes, one CSS animation sinks the current view away
// and raises the next in from the direction of travel, while a brief
// water-tint flash names the new depth. Everything is driven by CSS
// animations and their end events — no timer choreography to race.
//
// Depth can be changed two ways: clicking the iceberg, or PUSHING —
// keep scrolling (wheel or arrow keys) past the page's edge, and once the
// push crosses a threshold the view dives to the next level (or surfaces
// to the previous). A small progress pill shows the pull building up.

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useDepth, useDrive } from '@/components/shared/ExperienceMode';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { DEPTH_META, type DepthLevel } from '@/lib/depth';
import type { PageNavDetail } from '@/lib/phoneNav';

// Pages where the depth system simply doesn't apply — no transitions, no
// edge-push, no flash. The home page is mission control, not a staged view.
const DEPTHLESS = ['/home'];

export default function DepthStage({ children }: { children: React.ReactNode }) {
  const { depth, setDepth } = useDepth();
  const { drive } = useDrive();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const pathname = usePathname();
  const depthlessRef = useRef(false);
  useEffect(() => { depthlessRef.current = DEPTHLESS.includes(pathname); }, [pathname]);

  const prev = useRef<DepthLevel>(depth);
  const booted = useRef(false);
  const [shift, setShift] = useState<'down' | 'up' | null>(null);
  const [flash, setFlash] = useState<DepthLevel | null>(null);

  // ── the phone's page-change theater: on small screens swipes and tab taps
  //    replace the timeline and the iceberg, but every crossing still plays
  //    a focus-segmenting sweep + a flash naming the destination ──
  const [pageShift, setPageShift] = useState<'left' | 'right' | null>(null);
  const [pageFlash, setPageFlash] = useState<PageNavDetail | null>(null);
  useEffect(() => {
    const onPageNav = (e: Event) => {
      const detail = (e as CustomEvent<PageNavDetail>).detail;
      if (!detail) return;
      setPageFlash(detail);
      // drop the class for one frame so back-to-back crossings restart it
      setPageShift(null);
      requestAnimationFrame(() => setPageShift(detail.dir));
    };
    window.addEventListener('mm-page-nav', onPageNav);
    return () => window.removeEventListener('mm-page-nav', onPageNav);
  }, []);

  // ── push-to-dive: overscroll past the page edge to change depth ──
  const depthRef = useRef(depth);
  useEffect(() => { depthRef.current = depth; }, [depth]);
  const setDepthRef = useRef(setDepth);
  useEffect(() => { setDepthRef.current = setDepth; }, [setDepth]);
  const acc = useRef(0);
  const accDir = useRef<1 | -1>(1);
  const lastPush = useRef(0);
  const coolUntil = useRef(0);
  const [pull, setPull] = useState<{ dir: 1 | -1; pct: number } | null>(null);

  useEffect(() => {
    const THRESHOLD = 420;
    const atBottom = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    const atTop = () => window.scrollY <= 4;
    const insideOwnScroller = (t: EventTarget | null) => {
      let el: Element | null = t instanceof Element ? t : null;
      while (el && el !== document.body) {
        const cs = getComputedStyle(el);
        if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 2) return true;
        el = el.parentElement;
      }
      return false;
    };
    const push = (delta: number, target: EventTarget | null) => {
      if (depthlessRef.current) return; // no edge-push on depthless pages
      const now = Date.now();
      if (now < coolUntil.current) return;
      if (target && insideOwnScroller(target)) return;
      const dir: 1 | -1 = delta > 0 ? 1 : -1;
      const d = depthRef.current;
      const eligible = dir === 1 ? atBottom() && d < 4 : atTop() && d > 1;
      if (!eligible) {
        if (acc.current > 0) { acc.current = 0; setPull(null); }
        return;
      }
      if (accDir.current !== dir || now - lastPush.current > 700) acc.current = 0;
      accDir.current = dir;
      lastPush.current = now;
      acc.current += Math.abs(delta);
      if (acc.current >= THRESHOLD) {
        acc.current = 0;
        setPull(null);
        coolUntil.current = now + 1100; // let the water transition finish
        setDepthRef.current((d + dir) as DepthLevel);
      } else {
        setPull({ dir, pct: Math.min(1, acc.current / THRESHOLD) });
      }
    };
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) push(e.deltaY, e.target);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey) return; // Shift+arrows belong to command mode
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown') push(160, null);
      else if (e.key === 'ArrowUp' || e.key === 'PageUp') push(-160, null);
    };
    // the pull fades if the pushing stops
    const tick = window.setInterval(() => {
      if (acc.current > 0 && Date.now() - lastPush.current > 700) { acc.current = 0; setPull(null); }
    }, 250);
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
      window.clearInterval(tick);
    };
  }, []);

  // The stored depth syncs in just after mount — that change must never
  // animate; only real clicks after this window do.
  useEffect(() => {
    const t = window.setTimeout(() => { booted.current = true; }, 150);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (prev.current === depth) return;
    const diving = depth > prev.current;
    prev.current = depth;
    if (!booted.current) return;
    if (depthlessRef.current) return; // no water theater on depthless pages
    setFlash(depth);
    // drop the class for one frame so a same-direction change restarts it
    setShift(null);
    requestAnimationFrame(() => setShift(diving ? 'down' : 'up'));
  }, [depth]);

  // Each depth reshuffles the page so its own focus leads — so every depth
  // change surfaces back to the top, where the new focus begins.
  useEffect(() => {
    if (shift) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [shift]);

  const onStageAnimEnd = (e: React.AnimationEvent) => {
    const name = String(e.animationName);
    if (name.startsWith('mmDepthShift')) setShift(null);
    else if (name.startsWith('mmPageShift')) setPageShift(null);
  };

  return (
    <>
      {/* data-drive lets .drv-story / .drv-num elements adapt to the drive:
          story-driven hides the numeric displays, numbers-driven hides the
          narrative, and "both" shows the full-fledged product */}
      <style>{`[data-drive='story'] .drv-num{display:none !important}[data-drive='numbers'] .drv-story{display:none !important}`}</style>
      <div
        className={shift ? `mm-depth-shift-${shift}` : pageShift ? `mm-page-shift-${pageShift}` : ''}
        data-drive={drive}
        onAnimationEnd={onStageAnimEnd}
      >
        {children}
      </div>

      {/* the pull indicator — the push building toward the next depth */}
      {pull && (() => {
        const target = Math.min(4, Math.max(1, depth + pull.dir)) as DepthLevel;
        const meta = DEPTH_META[target];
        return (
          <div className={`fixed ${pull.dir === 1 ? 'bottom-6' : 'top-24'} left-1/2 -translate-x-1/2 z-40 pointer-events-none`}>
            <div className="bg-[var(--surface-card)]/95 backdrop-blur border border-[var(--border-default)] rounded-full px-4 py-2 shadow-lg text-[11px] text-[var(--ink-2)] flex items-center gap-2.5">
              <span>{meta.icon}</span>
              <span className="whitespace-nowrap">
                {ar
                  ? pull.dir === 1 ? `واصِل للغوص إلى «${meta.name.ar}»` : `واصِل للصعود إلى «${meta.name.ar}»`
                  : pull.dir === 1 ? `Keep scrolling to dive to “${meta.name.en}”` : `Keep scrolling to surface to “${meta.name.en}”`}
              </span>
              <span className="w-16 h-1 rounded-full bg-[var(--surface-1)] overflow-hidden shrink-0">
                <span className="block h-full bg-[#5DCAA5] transition-[width] duration-100" style={{ width: `${Math.round(pull.pct * 100)}%` }} />
              </span>
            </div>
          </div>
        );
      })()}

      {/* the page flash — the destination's name, briefly, over a light
          scrim; quicker and quieter than the depth flash because page
          crossings are frequent on the phone */}
      {pageFlash !== null && (
        <div
          className="fixed inset-0 z-[85] pointer-events-none flex items-center justify-center"
          style={{
            background: 'linear-gradient(180deg, rgba(10,20,16,0.28) 0%, rgba(10,20,16,0.42) 100%)',
            animation: 'mmDepthFlash 640ms ease-in-out forwards',
          }}
          onAnimationEnd={() => setPageFlash(null)}
          aria-hidden="true"
        >
          <div className="text-center text-white" style={{ animation: 'mmDepthFlashLabel 640ms ease-in-out forwards' }}>
            <div className="text-3xl mb-1.5">{pageFlash.icon}</div>
            <div className="font-serif text-xl font-bold">{pageFlash.label}</div>
          </div>
        </div>
      )}

      {/* the depth flash — removes itself when its animation ends */}
      {flash !== null && (
        <div
          className="fixed inset-0 z-[85] pointer-events-none flex items-center justify-center"
          style={{
            background: 'linear-gradient(180deg, rgba(14,44,66,0.35) 0%, rgba(5,22,39,0.55) 100%)',
            animation: 'mmDepthFlash 1000ms ease-in-out forwards',
          }}
          onAnimationEnd={() => setFlash(null)}
          aria-hidden="true"
        >
          <div
            className="text-center text-white"
            style={{ animation: 'mmDepthFlashLabel 1000ms ease-in-out forwards' }}
          >
            <div className="text-4xl mb-2">{DEPTH_META[flash].icon}</div>
            <div className="font-serif text-2xl font-bold">{ar ? DEPTH_META[flash].name.ar : DEPTH_META[flash].name.en}</div>
            <div className="text-[11px] text-white/70 mt-1" dir="ltr">{flash}/4</div>
          </div>
        </div>
      )}
    </>
  );
}
