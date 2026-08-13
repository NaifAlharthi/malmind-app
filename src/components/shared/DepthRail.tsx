'use client';

// The iceberg — the product's depth dial. A slim vertical rail perched on
// the start edge of the viewport (desktop only): the tip of an iceberg
// above a waterline, three chunks sinking below it, each wider than the
// one above. Each chunk is one DEPTH of the whole product:
//   1 essentials · 2 getting organized · 3 analysis · 4 full mastery
// Clicking a chunk simply sets the depth — the pages themselves stay
// exactly as they are and show more or fewer tiles/tools accordingly.
// The gold marker tracks the adopted depth; deeper chunks stay dim until
// reached. No overlays, no separate screens.

import { useCallback, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { useDepth } from '@/components/shared/ExperienceMode';
import { DEPTH_LEVELS, DEPTH_META, type DepthLevel } from '@/lib/depth';

export default function DepthRail() {
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = useCallback((a: string, e: string) => (ar ? a : e), [ar]);

  const { depth, setDepth } = useDepth();
  const [hover, setHover] = useState<DepthLevel | null>(null);
  const pathname = usePathname();

  // Home is on the grid too: its D1 is the hājis-only focus view, and the
  // iceberg is how you dive to the rest.
  void pathname;

  return (
    <div
      className="mm-depth-rail hidden sm:flex fixed start-3 top-1/2 -translate-y-1/2 z-30 flex-col items-center select-none scale-[0.8] lg:scale-100"
      aria-label={L('عمق الأدوات', 'Tool depth')}
    >
      <div className="text-[9px] text-[var(--muted)] mb-1 tracking-wide">{L('العمق', 'Depth')}</div>
      <div className="relative">
        <svg width="56" height="240" viewBox="0 0 56 240" aria-hidden="true">
          {/* waterline */}
          <line x1="0" y1="44" x2="56" y2="44" stroke="#4A85B9" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
          {/* the tip — the smallest piece, all that shows above water */}
          <polygon points="28,14 33,27 35,42 20,42 23,25" fill={hover === 1 || depth === 1 ? '#F3FAFF' : '#DDEEFA'} stroke="#9CC8E8" strokeWidth="1" />
          {/* submerged mass — each chunk wider than the one above it */}
          <polygon points="17,48 39,48 44,100 12,102" fill={hover === 2 || depth >= 2 ? '#7FB6DE' : '#5E9CCB'} opacity={depth >= 2 ? 1 : 0.55} />
          <polygon points="10,106 46,105 51,164 6,166" fill={hover === 3 || depth >= 3 ? '#3F7AAE' : '#2F6494'} opacity={depth >= 3 ? 1 : 0.55} />
          <polygon points="4,170 52,169 47,224 28,236 9,226" fill={hover === 4 || depth >= 4 ? '#1E4E7A' : '#153D63'} opacity={depth >= 4 ? 1 : 0.55} />
        </svg>

        {/* click zones + adopted-depth marker */}
        {DEPTH_LEVELS.map((lvl) => {
          const zones = [
            { top: 0, height: 44 },
            { top: 44, height: 60 },
            { top: 104, height: 64 },
            { top: 168, height: 72 },
          ][lvl - 1];
          const meta = DEPTH_META[lvl];
          return (
            <button
              key={lvl}
              onClick={() => setDepth(lvl)}
              onMouseEnter={() => setHover(lvl)}
              onMouseLeave={() => setHover(null)}
              className="absolute start-0 w-full cursor-pointer group"
              style={{ top: zones.top, height: zones.height }}
              title={`${meta.icon} ${ar ? meta.name.ar : meta.name.en}`}
              aria-label={ar ? meta.name.ar : meta.name.en}
              aria-pressed={depth === lvl}
            >
              {depth === lvl && (
                <span className="absolute top-1/2 -translate-y-1/2 -end-1.5 w-3 h-3 rounded-full bg-[var(--gold)] ring-2 ring-[var(--surface-0)]" />
              )}
              {/* hover flyout */}
              <span className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-full ms-2 whitespace-nowrap rounded-lg bg-[var(--surface-card)] border border-[var(--border-default)] px-2.5 py-1 text-[10px] text-[var(--ink-2)] opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                {meta.icon} {ar ? meta.name.ar : meta.name.en}
                {depth === lvl && <span className="text-[var(--gold)] font-semibold"> · {L('عمقك الحالي', 'your current depth')}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
