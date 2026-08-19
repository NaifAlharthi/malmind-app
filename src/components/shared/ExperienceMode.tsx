'use client';

// The experience-mode context and its top-bar switcher. Switching modes also
// aligns the Brain's page guide with the chosen level of hand-holding:
// guided narrates every page, growing speaks on ask, pro stays quiet — the
// user can still retune the guide independently afterwards.

import { createContext, useContext, useEffect, useState } from 'react';
import { getXMode, storeXMode, XMODES, XMODE_META, type XMode } from '@/lib/experienceMode';
import { getStoredDepth, storeDepth, type DepthLevel } from '@/lib/depth';
import { getStoredDrive, storeDrive, DRIVES, DRIVE_META, type Drive } from '@/lib/drive';
import { getStoredTier, storeTier, TIER_META, type TierKey } from '@/lib/tier';
import { setGuideMode } from '@/lib/brainGuide';
import { useLocale } from '@/lib/i18n/LocaleProvider';

const XModeContext = createContext<{
  mode: XMode;
  setMode: (m: XMode) => void;
  depth: DepthLevel;
  setDepth: (d: DepthLevel) => void;
  drive: Drive;
  setDrive: (d: Drive) => void;
  tier: TierKey;
  setTier: (t: TierKey) => void;
}>({
  mode: 'guided',
  setMode: () => {},
  depth: 1,
  setDepth: () => {},
  drive: 'both',
  setDrive: () => {},
  tier: 'pro',
  setTier: () => {},
});

export function useXMode() {
  return useContext(XModeContext);
}

// The iceberg's depth — how much of the tool drawer is on the surface.
export function useDepth() {
  const { depth, setDepth } = useContext(XModeContext);
  return { depth, setDepth };
}

// What drives this person: story, numbers, or the blend.
export function useDrive() {
  const { drive, setDrive } = useContext(XModeContext);
  return { drive, setDrive };
}

// The subscription tier — a ceiling on the depth dial. Everything the
// product stages by depth (hub drawers, dashboard layouts, home rooms,
// ToolStage sections inside every tool) is gated by it for free.
export function useTier() {
  const { tier, setTier, depth } = useContext(XModeContext);
  return { tier, setTier, maxDepth: TIER_META[tier].maxDepth, depth };
}

// Each mode implies a natural starting depth; the iceberg then lets the
// person dive deeper (or resurface) independently at any time.
const MODE_DEPTH: Record<XMode, DepthLevel> = { guided: 1, growing: 2, pro: 4 };

export function XModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<XMode>('guided');
  const [depth, setDepthState] = useState<DepthLevel>(1);
  const [drive, setDriveState] = useState<Drive>('both');
  const [tier, setTierState] = useState<TierKey>('pro');

  useEffect(() => {
    const t = getStoredTier();
    setModeState(getXMode());
    setTierState(t);
    // depth never boots above the plan's ceiling
    setDepthState(Math.min(getStoredDepth(), TIER_META[t].maxDepth) as DepthLevel);
    setDriveState(getStoredDrive());
  }, []);

  // every road to a depth passes through the plan's ceiling
  const clamp = (d: DepthLevel, t: TierKey) => Math.min(d, TIER_META[t].maxDepth) as DepthLevel;

  const setMode = (m: XMode) => {
    setModeState(m);
    storeXMode(m);
    // Hand-holding level drives the Brain guide's default posture…
    // No mode forces auto-narration — the bubble opening itself on page
    // arrival is an explicit opt-in from the Brain's own controls.
    setGuideMode(m === 'pro' ? 'off' : 'manual');
    // …and resets the iceberg to the mode's natural depth (ceiling applies).
    const d = clamp(MODE_DEPTH[m], tier);
    setDepthState(d);
    storeDepth(d);
  };

  const setDepth = (d: DepthLevel) => {
    const c = clamp(d, tier);
    setDepthState(c);
    storeDepth(c);
  };

  const setTier = (t: TierKey) => {
    setTierState(t);
    storeTier(t);
    // a lowered ceiling pulls the dial up to the surface with it
    setDepthState((prev) => {
      const c = clamp(prev, t);
      storeDepth(c);
      return c;
    });
  };

  const setDrive = (d: Drive) => {
    setDriveState(d);
    storeDrive(d);
  };

  return <XModeContext.Provider value={{ mode, setMode, depth, setDepth, drive, setDrive, tier, setTier }}>{children}</XModeContext.Provider>;
}

// The three-option segmented control for the top bar — only the chosen one
// highlighted; icons alone on small screens, labels from sm up.
export function XModeSwitcher({ className = '' }: { className?: string }) {
  const { mode, setMode } = useXMode();
  const { locale } = useLocale();
  const ar = locale === 'ar';

  return (
    <div className={`flex items-center bg-[var(--surface-1)] border border-[var(--border-default)] rounded-full p-0.5 ${className}`} role="radiogroup">
      {XMODES.map((m) => {
        const meta = XMODE_META[m];
        const active = mode === m;
        return (
          <button
            key={m}
            role="radio"
            aria-checked={active}
            onClick={() => setMode(m)}
            title={ar ? meta.desc.ar : meta.desc.en}
            className={`flex items-center gap-1 rounded-full px-2 sm:px-2.5 py-1 text-[11px] transition-colors whitespace-nowrap ${
              active
                ? 'bg-[var(--ink)] text-[var(--surface-0)] font-semibold shadow-sm'
                : 'text-[var(--muted)] hover:text-[var(--ink-2)]'
            }`}
          >
            <span className="leading-none">{meta.icon}</span>
            <span className="hidden lg:inline">{ar ? meta.label.ar : meta.label.en}</span>
          </button>
        );
      })}
    </div>
  );
}

// The drive switcher — story · numbers · story & numbers — same dress as
// the mode switcher, one dial to its side.
export function DriveSwitcher({ className = '' }: { className?: string }) {
  const { drive, setDrive } = useDrive();
  const { locale } = useLocale();
  const ar = locale === 'ar';

  return (
    <div className={`flex items-center bg-[var(--surface-1)] border border-[var(--border-default)] rounded-full p-0.5 ${className}`} role="radiogroup">
      {DRIVES.map((d) => {
        const meta = DRIVE_META[d];
        const active = drive === d;
        return (
          <button
            key={d}
            role="radio"
            aria-checked={active}
            onClick={() => setDrive(d)}
            title={ar ? meta.desc.ar : meta.desc.en}
            className={`flex items-center gap-1 rounded-full px-2 sm:px-2.5 py-1 text-[11px] transition-colors whitespace-nowrap ${
              active
                ? 'bg-[var(--ink)] text-[var(--surface-0)] font-semibold shadow-sm'
                : 'text-[var(--muted)] hover:text-[var(--ink-2)]'
            }`}
          >
            <span className="leading-none">{meta.icon}</span>
            <span className="hidden lg:inline">{ar ? meta.label.ar : meta.label.en}</span>
          </button>
        );
      })}
    </div>
  );
}
