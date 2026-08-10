'use client';

// The experience-mode context and its top-bar switcher. Switching modes also
// aligns the Brain's page guide with the chosen level of hand-holding:
// guided narrates every page, growing speaks on ask, pro stays quiet — the
// user can still retune the guide independently afterwards.

import { createContext, useContext, useEffect, useState } from 'react';
import { getXMode, storeXMode, XMODES, XMODE_META, type XMode } from '@/lib/experienceMode';
import { setGuideMode } from '@/lib/brainGuide';
import { useLocale } from '@/lib/i18n/LocaleProvider';

const XModeContext = createContext<{ mode: XMode; setMode: (m: XMode) => void }>({
  mode: 'guided',
  setMode: () => {},
});

export function useXMode() {
  return useContext(XModeContext);
}

export function XModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<XMode>('guided');

  useEffect(() => { setModeState(getXMode()); }, []);

  const setMode = (m: XMode) => {
    setModeState(m);
    storeXMode(m);
    // Hand-holding level drives the Brain guide's default posture.
    setGuideMode(m === 'guided' ? 'auto' : m === 'growing' ? 'manual' : 'off');
  };

  return <XModeContext.Provider value={{ mode, setMode }}>{children}</XModeContext.Provider>;
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
            <span className="hidden md:inline">{ar ? meta.label.ar : meta.label.en}</span>
          </button>
        );
      })}
    </div>
  );
}
