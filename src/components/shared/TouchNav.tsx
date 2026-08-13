'use client';

// The phone's answer to the desktop's 2D map: with no timeline pill and no
// iceberg on a small screen, horizontal finger swipes walk the companion
// page strip (Home · Daily Stack · Brain) — and every crossing plays the
// same focus-segmenting transition the desktop gets, so a page change
// always FEELS like travel, never like a teleport. Vertical stays pure
// scrolling: reading is sacred.

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { useIsPhone } from '@/lib/useIsPhone';
import { PHONE_NAV, announcePageNav } from '@/lib/phoneNav';

const MIN_TRAVEL = 72; // px of finger travel that counts as a swipe
const MAX_TIME = 650; // ms — a swipe is a flick, not a slow drag
const COOLDOWN = 900; // ms between page crossings

export default function TouchNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { locale, t } = useLocale();
  const isPhone = useIsPhone();

  // Handlers live once; the changing values ride in refs.
  const ctx = useRef({ pathname, ar: locale === 'ar', t });
  useEffect(() => { ctx.current = { pathname, ar: locale === 'ar', t }; }, [pathname, locale, t]);

  const start = useRef<{ x: number; y: number; at: number; eligible: boolean } | null>(null);
  const lastNav = useRef(0);

  useEffect(() => {
    if (!isPhone) return;

    const insideHorizontalScroller = (target: EventTarget | null) => {
      let el: Element | null = target instanceof Element ? target : null;
      while (el && el !== document.body) {
        const cs = getComputedStyle(el);
        if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 2) return true;
        el = el.parentElement;
      }
      return false;
    };

    const onStart = (e: TouchEvent) => {
      const t0 = e.touches[0];
      const tgt = e.target as HTMLElement | null;
      const typing = !!tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable);
      start.current = {
        x: t0.clientX,
        y: t0.clientY,
        at: Date.now(),
        eligible: !typing && !insideHorizontalScroller(e.target),
      };
    };

    const onEnd = (e: TouchEvent) => {
      const s = start.current;
      start.current = null;
      if (!s || !s.eligible) return;
      const now = Date.now();
      if (now - lastNav.current < COOLDOWN) return;
      if (now - s.at > MAX_TIME) return;
      const t0 = e.changedTouches[0];
      const dx = t0.clientX - s.x;
      const dy = t0.clientY - s.y;
      if (Math.abs(dx) < MIN_TRAVEL || Math.abs(dx) < Math.abs(dy) * 1.7) return;

      const { pathname: path, ar, t: tt } = ctx.current;
      const idx = PHONE_NAV.findIndex((p) => p.href === path);
      if (idx === -1) return; // not on the page strip (gate, auth, tools)

      // Dragging the page strip: a leftward swipe reveals the page sitting
      // on the RIGHT side of the screen. Which index that is depends on the
      // reading direction — the strip lays out with the locale.
      const revealsRight = dx < 0;
      const delta = revealsRight ? (ar ? -1 : 1) : (ar ? 1 : -1);
      const target = PHONE_NAV[idx + delta];
      if (!target) return; // edge of the strip — nothing beyond

      lastNav.current = now;
      announcePageNav({
        dir: revealsRight ? 'left' : 'right',
        icon: target.icon,
        label: tt(target.labelKey),
      });
      router.push(target.href);
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isPhone, router]);

  return null;
}
