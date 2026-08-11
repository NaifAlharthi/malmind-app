'use client';

// Wraps every page and choreographs the depth-change transition: when the
// iceberg's level changes, one CSS animation sinks the current view away
// and raises the next in from the direction of travel, while a brief
// water-tint flash names the new depth. When diving deeper, the page then
// glides to the first tile that depth revealed. Everything is driven by
// CSS animations and their end events — no timer choreography to race.

import { useEffect, useRef, useState } from 'react';
import { useDepth } from '@/components/shared/ExperienceMode';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { DEPTH_META, type DepthLevel } from '@/lib/depth';

export default function DepthStage({ children }: { children: React.ReactNode }) {
  const { depth } = useDepth();
  const { locale } = useLocale();
  const ar = locale === 'ar';

  const prev = useRef<DepthLevel>(depth);
  const booted = useRef(false);
  const [shift, setShift] = useState<'down' | 'up' | null>(null);
  const [flash, setFlash] = useState<DepthLevel | null>(null);

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
    setFlash(depth);
    // drop the class for one frame so a same-direction change restarts it
    setShift(null);
    requestAnimationFrame(() => setShift(diving ? 'down' : 'up'));
  }, [depth]);

  // Once the new view has risen into place, glide to the first tile this
  // depth revealed (deeper only — surfacing keeps the reading position).
  const onStageAnimEnd = (e: React.AnimationEvent) => {
    if (!String(e.animationName).startsWith('mmDepthShift')) return;
    if (shift === 'down') {
      const el = document.querySelector(`[data-depth-first="${prev.current}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setShift(null);
  };

  return (
    <>
      <div className={shift ? `mm-depth-shift-${shift}` : ''} onAnimationEnd={onStageAnimEnd}>
        {children}
      </div>

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
            <div className="text-[11px] text-white/70 mt-1" dir="ltr">
              {ar ? DEPTH_META[flash].depth.ar : DEPTH_META[flash].depth.en} · {flash}/4
            </div>
          </div>
        </div>
      )}
    </>
  );
}
