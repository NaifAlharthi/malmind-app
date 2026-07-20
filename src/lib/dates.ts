// src/lib/dates.ts
// Bilingual date formatting, including the Hijri (Umm al-Qura) calendar used
// across Saudi Arabia — shown alongside the Gregorian date to deepen the
// local feel. Uses the browser's Intl, so no data tables to maintain.

import type { Locale } from './i18n/config';

/** Gregorian date, e.g. "20 July 2026" / "٢٠ يوليو ٢٠٢٦". */
export function formatGregorian(d: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : 'en', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

/** Hijri (Umm al-Qura) date with era, e.g. "5 Muharram 1448 AH" / "٥ محرم ١٤٤٨ هـ". */
export function formatHijri(d: Date, locale: Locale): string {
  const base = locale === 'ar' ? 'ar-SA' : 'en-US';
  try {
    return new Intl.DateTimeFormat(`${base}-u-ca-islamic-umalqura`, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      era: 'short',
    }).format(d);
  } catch {
    // Older engines may not know the Umm al-Qura variant.
    return new Intl.DateTimeFormat(`${base}-u-ca-islamic`, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  }
}

/** Both calendars in one string, Gregorian · Hijri. */
export function formatDual(d: Date, locale: Locale): string {
  return `${formatGregorian(d, locale)} · ${formatHijri(d, locale)}`;
}
