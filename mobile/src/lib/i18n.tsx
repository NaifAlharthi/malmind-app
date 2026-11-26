// Language and direction. Arabic is the default, like the website.
//
// Direction is handled in JavaScript, not by the native RTL switch: Expo Go
// resets I18nManager on every launch, and a JS-driven direction also lets
// the language change instantly without reloading the app. Components read
// `row` (flexDirection for a horizontal line in reading order) and `start`
// (textAlign for the reading edge). Both stay correct even if the native
// layout ever is RTL (e.g. a future build with RTL enabled).

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { I18nManager } from 'react-native';
import { getLocales } from 'expo-localization';

import { DICTIONARIES } from '@shared/i18n/dictionaries';
import { kv } from '@/lib/kv';

export type Locale = 'ar' | 'en';

interface LocaleCtx {
  locale: Locale;
  ar: boolean;
  setLocale: (l: Locale) => void;
  /** Pick the Arabic or English string. */
  L: (a: string, e: string) => string;
  /** The website's shared dictionary, with {name}-style placeholders. */
  t: (key: string, vars?: Record<string, string | number>) => string;
  row: 'row' | 'row-reverse';
  start: 'left' | 'right';
  end: 'left' | 'right';
}

const KEY = 'malmind-locale';

function initialLocale(): Locale {
  try {
    const saved = kv.getItem(KEY);
    if (saved === 'ar' || saved === 'en') return saved;
  } catch { /* storage unavailable */ }
  // Arabic-first: English only when the phone itself is English-first.
  const device = getLocales()[0]?.languageCode;
  return device === 'en' ? 'en' : 'ar';
}

const Ctx = createContext<LocaleCtx | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const value = useMemo<LocaleCtx>(() => {
    const ar = locale === 'ar';
    // react-native-web's I18nManager has no isRTL field (undefined), so
    // coerce: an undefined must read as "not RTL", never as a mismatch
    const nativeRTL = I18nManager.isRTL === true;
    // When native layout is already RTL, 'row' already runs right-to-left
    // and textAlign 'left'/'right' are swapped by the platform.
    const row = ar !== nativeRTL ? 'row-reverse' : 'row';
    const startPhysical = ar ? 'right' : 'left';
    const endPhysical = ar ? 'left' : 'right';
    const swap = (s: 'left' | 'right') => (nativeRTL ? (s === 'left' ? 'right' : 'left') : s);
    const dict = DICTIONARIES[locale];
    return {
      locale,
      ar,
      setLocale: (l) => {
        try { kv.setItem(KEY, l); } catch { /* ignore */ }
        setLocaleState(l);
      },
      L: (a, e) => (ar ? a : e),
      t: (key, vars) => {
        let s = dict[key] ?? DICTIONARIES.en[key] ?? key;
        if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
        return s;
      },
      row,
      start: swap(startPhysical),
      end: swap(endPhysical),
    };
  }, [locale]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLocale(): LocaleCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useLocale must be used within LocaleProvider');
  return v;
}

/** A compact month label for charts and grid headers. Arabic month names
 *  are short already and don't abbreviate, so Arabic keeps them whole. */
export function monthShort(month: number, year: number, ar: boolean): string {
  return ar
    ? `${MONTHS_AR[month - 1]} ${String(year).slice(2)}`
    : `${MONTHS_EN[month - 1].slice(0, 3)} ${String(year).slice(2)}`;
}

export const MONTHS_EN =['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
