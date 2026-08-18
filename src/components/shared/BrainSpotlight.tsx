'use client';

// The Brain's pointing finger. Any link may carry ?spot=<id>; when the
// page opens, the tile tagged data-spot=<id> is scrolled to center and
// ringed in gold while the rest of the room dims — the tile itself is
// never covered: the ring is transparent inside, pointer-events pass
// through, and the dim is a shadow cast AROUND it, not over it.
// One tap, Escape, or twelve seconds releases the room.
//
// This is the interaction rail for the Brain: its reply chips can point
// at a specific tile (e.g. [spending](/log?spot=spending)), and once a
// live model drives the Brain it can aim the finger itself. Any tile
// anywhere joins the system by adding data-spot="<id>" to its root.

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from '@/lib/i18n/LocaleProvider';

function SpotlightInner() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const spot = params.get('spot');
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [visible, setVisible] = useState(false);
  const targetRef = useRef<HTMLElement | null>(null);

  // Dismissing also strips ?spot= from the URL so a refresh or back
  // doesn't point again at a moment nobody asked for.
  const dismiss = useCallback(() => {
    setVisible(false);
    setRect(null);
    targetRef.current = null;
    const rest = new URLSearchParams(params.toString());
    rest.delete('spot');
    const qs = rest.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [params, pathname, router]);

  // Find the tile — but don't trust the first sighting. The data-spot
  // wrapper exists before its tile's data arrives, and the tiles ABOVE
  // it keep expanding as their data lands, dragging the target around.
  // So: wait until the tile has real size AND a position that held
  // still across three checks, THEN scroll to center and ring it. If
  // it never settles (~6s: wrong depth, wrong page), clean the URL
  // quietly instead of pointing at nothing.
  useEffect(() => {
    if (!spot) return;
    let cancelled = false;
    let tries = 0;
    let stable = 0;
    let lastTop: number | null = null;
    const seek = () => {
      if (cancelled) return;
      const el = document.querySelector<HTMLElement>(`[data-spot="${CSS.escape(spot)}"]`);
      const r = el?.getBoundingClientRect();
      if (el && r && r.height > 40) {
        stable = lastTop !== null && Math.abs(r.top - lastTop) < 1 ? stable + 1 : 0;
        lastTop = r.top;
        if (stable >= 2) {
          targetRef.current = el;
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          window.setTimeout(() => { if (!cancelled) setVisible(true); }, 620);
          return;
        }
      }
      if (++tries < 40) window.setTimeout(seek, 160);
      else dismiss();
    };
    seek();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spot]);

  // While pointing, ride along with the tile through scroll, resize and
  // late layout shifts — the ring is re-measured every frame but only
  // re-rendered when the tile actually moved.
  useEffect(() => {
    if (!visible) return;
    let raf = 0;
    const tick = () => {
      const el = targetRef.current;
      if (el) {
        const r = el.getBoundingClientRect();
        setRect((prev) =>
          prev &&
          Math.abs(prev.top - r.top) < 0.5 && Math.abs(prev.left - r.left) < 0.5 &&
          Math.abs(prev.width - r.width) < 0.5 && Math.abs(prev.height - r.height) < 0.5
            ? prev
            : r,
        );
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  // Ways out: any tap, Escape, or a twelve-second sigh.
  useEffect(() => {
    if (!visible) return;
    const onDown = () => dismiss();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss(); };
    const t = window.setTimeout(dismiss, 12000);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
      window.clearTimeout(t);
    };
  }, [visible, dismiss]);

  if (!visible || !rect) return null;
  const pad = 8;
  const tagBelow = rect.top < 72; // tile hugging the top bar → tag flips under
  return (
    <div className="fixed inset-0 z-[70] pointer-events-none" aria-hidden>
      {/* the ring: transparent inside, giant shadow dims everything else */}
      <div
        className="absolute rounded-2xl mm-spot-ring"
        style={{
          top: rect.top - pad,
          left: rect.left - pad,
          width: rect.width + pad * 2,
          height: rect.height + pad * 2,
          boxShadow: '0 0 0 200vmax rgba(4, 31, 23, 0.42)',
        }}
      />
      {/* who's pointing */}
      <div
        className="absolute mm-spot-tag inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold text-white shadow-lg whitespace-nowrap"
        style={{
          top: tagBelow ? rect.bottom + pad + 10 : rect.top - pad - 32,
          // hug the ring's START corner: left edge in LTR, right edge in RTL
          ...(ar
            ? { right: Math.min(Math.max(8, window.innerWidth - rect.right - pad), window.innerWidth - 180) }
            : { left: Math.min(Math.max(8, rect.left - pad), window.innerWidth - 180) }),
          background: 'linear-gradient(120deg, #073626, #0A3A29)',
          border: '1px solid rgba(201, 168, 76, 0.6)',
        }}
      >
        🧠 {ar ? 'العقل يشير هنا' : 'the Brain points here'}
      </div>
    </div>
  );
}

// useSearchParams needs a Suspense fence around it.
export default function BrainSpotlight() {
  return (
    <Suspense fallback={null}>
      <SpotlightInner />
    </Suspense>
  );
}
