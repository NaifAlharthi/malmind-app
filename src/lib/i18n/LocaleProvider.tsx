'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  dirFor,
  isLocale,
  type Locale,
} from './config';
import { DICTIONARIES } from './dictionaries';

type Vars = Record<string, string | number>;

interface LocaleContextValue {
  locale: Locale;
  dir: 'rtl' | 'ltr';
  isRtl: boolean;
  setLocale: (next: Locale) => void;
  toggleLocale: () => void;
  /** Translate a dotted key, with {placeholder} interpolation and EN fallback. */
  t: (key: string, vars?: Vars) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}

/** Convenience: just the translate function. */
export function useT() {
  return useLocale().t;
}

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name) =>
    name in vars ? String(vars[name]) : whole
  );
}

// The <html lang>/<html dir> are already correct before hydration thanks to
// the blocking inline script in layout.tsx — this brings React state in sync
// with it and persists future changes, exactly like ThemeProvider.
export default function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const current = document.documentElement.getAttribute('lang');
    if (isLocale(current)) setLocaleState(current);
  }, []);

  const applyLocale = useCallback((next: Locale) => {
    const root = document.documentElement;
    root.setAttribute('lang', next);
    root.setAttribute('dir', dirFor(next));
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* private mode / storage disabled — non-fatal */
    }
    setLocaleState(next);
  }, []);

  const setLocale = useCallback((next: Locale) => applyLocale(next), [applyLocale]);
  const toggleLocale = useCallback(
    () => applyLocale(locale === 'ar' ? 'en' : 'ar'),
    [applyLocale, locale]
  );

  const t = useCallback(
    (key: string, vars?: Vars) => {
      const table = DICTIONARIES[locale];
      const value = table[key] ?? DICTIONARIES.en[key] ?? key;
      return interpolate(value, vars);
    },
    [locale]
  );

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, dir: dirFor(locale), isRtl: dirFor(locale) === 'rtl', setLocale, toggleLocale, t }),
    [locale, setLocale, toggleLocale, t]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
