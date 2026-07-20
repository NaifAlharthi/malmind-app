// src/lib/i18n/config.ts
// Locale primitives shared by the provider, the pre-hydration script, and
// any component that needs to reason about direction without pulling in the
// full dictionary.

export type Locale = 'en' | 'ar';

export const LOCALES: Locale[] = ['en', 'ar'];
// MalMind is Saudi-first: a visitor with no saved preference lands in Arabic.
export const DEFAULT_LOCALE: Locale = 'ar';
export const LOCALE_STORAGE_KEY = 'malmind-locale';

// Right-to-left locales. Arabic is the only one today, but keeping this as a
// set means adding Hebrew/Farsi/Urdu later is a one-line change.
const RTL_LOCALES = new Set<Locale>(['ar']);

export function isRtl(locale: Locale): boolean {
  return RTL_LOCALES.has(locale);
}

export function dirFor(locale: Locale): 'rtl' | 'ltr' {
  return isRtl(locale) ? 'rtl' : 'ltr';
}

// Native names, shown in the language switcher so each option reads in its
// own script regardless of the current UI language.
export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  ar: 'العربية',
};

export function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'ar';
}
