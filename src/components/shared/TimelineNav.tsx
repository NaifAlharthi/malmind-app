'use client';

// A timeline for the three time-views. Past · Today · Future sit on a line,
// and a little figure walks along it to whichever view you open — passing
// through the present on its way between past and future. The band expands
// while the figure is walking, then settles back to save space. Time flows
// with the language: left→right in English, right→left in Arabic (الماضي
// starts on the right, exactly as the eye reads).

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useLocale } from '@/lib/i18n/LocaleProvider';

const NODES = [
  { key: 'past', href: '/past', labelKey: 'nav.past' },
  { key: 'today', href: '/today', labelKey: 'nav.today' },
  { key: 'future', href: '/future', labelKey: 'nav.future' },
];

function Walker() {
  return (
    <svg width="18" height="24" viewBox="0 0 20 26" fill="var(--ink)" aria-hidden="true">
      {/* back limbs */}
      <rect className="mm-limb mm-armB" x="9.2" y="8" width="1.5" height="6.5" rx="0.75" opacity="0.65" />
      <rect className="mm-limb mm-legB" x="9" y="14.5" width="1.9" height="9.5" rx="0.9" opacity="0.65" />
      {/* torso + head */}
      <circle cx="10" cy="4" r="3" />
      <rect x="9" y="7" width="2" height="8" rx="1" />
      {/* front limbs */}
      <rect className="mm-limb mm-legA" x="9" y="14.5" width="1.9" height="9.5" rx="0.9" />
      <rect className="mm-limb mm-armA" x="9.2" y="8" width="1.5" height="6.5" rx="0.75" />
    </svg>
  );
}

export default function TimelineNav({ className = '' }: { className?: string }) {
  const pathname = usePathname();
  const { t, locale } = useLocale();
  const ar = locale === 'ar';

  // Display order follows the reading direction: in Arabic the past sits on
  // the right, so the rendered (physical left→right) order is reversed.
  const display = ar ? [...NODES].reverse() : NODES;
  const idx = display.findIndex((n) => n.href === pathname);
  const onTimePage = idx !== -1;
  const activeIndex = onTimePage ? idx : 1; // rest at the present elsewhere

  const [walking, setWalking] = useState(false);
  const [dir, setDir] = useState(1); // 1 = facing forward/right, -1 = back/left
  const [expanded, setExpanded] = useState(false);
  const prev = useRef(activeIndex);

  // When the top bar gets crowded the band can be squeezed until the three
  // labels overlap — measure ourselves and drop to dots-only (tooltips keep
  // the names) whenever there isn't honest room for text.
  const rootRef = useRef<HTMLDivElement>(null);
  const [showLabels, setShowLabels] = useState(true);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setShowLabels(entry.contentRect.width >= 165);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (prev.current === activeIndex) return;
    setDir(activeIndex > prev.current ? 1 : -1);
    prev.current = activeIndex;
    setWalking(true);
    setExpanded(true);
    const timer = setTimeout(() => {
      setWalking(false);
      setExpanded(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [activeIndex]);

  const leftPct = ((activeIndex + 0.5) / NODES.length) * 100;

  return (
    <div ref={rootRef} dir="ltr" className={`mm-band relative ${expanded ? 'h-16' : 'h-12'} ${className}`}>
      {/* the line */}
      <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 h-[2px] rounded-full bg-[var(--border-medium)]" />
      {/* travelled segment: anchored on the past's side, up to the figure */}
      <div
        className="absolute top-1/2 -translate-y-1/2 h-[2px] rounded-full bg-[var(--green)] transition-[width] duration-700"
        style={
          ar
            ? { right: '0.75rem', width: `calc(${100 - leftPct}% - 0.75rem)` }
            : { left: '0.75rem', width: `calc(${leftPct}% - 0.75rem)` }
        }
      />

      {/* nodes */}
      <div className="absolute inset-0 flex">
        {display.map((n, i) => {
          const active = onTimePage && i === idx;
          return (
            <Link key={n.key} href={n.href} title={t(n.labelKey)} className="relative flex-1 group">
              <span
                className={`absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 rounded-full transition-all ${
                  active
                    ? 'w-2.5 h-2.5 bg-[var(--green)] ring-4 ring-[var(--green-bg)]'
                    : 'w-2 h-2 bg-[var(--border-strong)] group-hover:bg-[var(--muted)]'
                }`}
              />
              {showLabels && (
                <span
                  className={`absolute left-1/2 -translate-x-1/2 top-1/2 mt-2.5 whitespace-nowrap text-[10px] transition-colors ${
                    active ? 'text-[var(--ink)] font-semibold' : 'text-[var(--muted)] group-hover:text-[var(--ink-2)]'
                  }`}
                >
                  {t(n.labelKey)}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* the walking figure */}
      <div className={`mm-figure absolute bottom-1/2 z-10 ${walking ? 'mm-walking' : ''}`} style={{ left: `${leftPct}%` }}>
        <div className="mm-bobber">
          <div style={{ transform: `scaleX(${dir})`, transition: 'transform 0.2s ease' }}>
            <Walker />
          </div>
        </div>
      </div>
    </div>
  );
}
