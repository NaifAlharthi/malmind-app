'use client';

// Compact EN/AR switch for full-bleed pages (login, signup) that render
// outside the AppShell sidebar and so don't get its language switcher.

import { useLocale } from '@/lib/i18n/LocaleProvider';

export default function LanguageToggle({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useLocale();
  return (
    <div className={`inline-flex bg-[var(--surface-1)] rounded-lg p-0.5 text-xs ${className}`}>
      <button
        onClick={() => setLocale('en')}
        className={`rounded-md px-2.5 py-1 transition-colors ${
          locale === 'en'
            ? 'bg-[var(--surface-card)] text-[var(--ink)] font-medium shadow-sm'
            : 'text-[var(--muted)] hover:text-[var(--ink-2)]'
        }`}
      >
        English
      </button>
      <button
        onClick={() => setLocale('ar')}
        className={`rounded-md px-2.5 py-1 transition-colors ${
          locale === 'ar'
            ? 'bg-[var(--surface-card)] text-[var(--ink)] font-medium shadow-sm'
            : 'text-[var(--muted)] hover:text-[var(--ink-2)]'
        }`}
      >
        العربية
      </button>
    </div>
  );
}
