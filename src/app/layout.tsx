import type { Metadata } from 'next';
import Script from 'next/script';
import localFont from 'next/font/local';
import './globals.css';
import AppShell from '@/components/shared/AppShell';
import DesktopGate from '@/components/shared/DesktopGate';
import ThemeProvider from '@/components/shared/ThemeProvider';
import LocaleProvider from '@/lib/i18n/LocaleProvider';

// RB — the licensed Saudi Arabic face. Exposed as a CSS variable; the
// [lang="ar"] font stacks in globals.css put it first, so Arabic text
// renders in RB while English keeps the existing Latin stacks.
const rb = localFont({
  src: './fonts/RB.ttf',
  variable: '--font-rb',
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  title: 'MalMind — Your money, finally understood.',
  description:
    'MalMind is a financial thinking companion for Saudi Arabia. Understand your past, see your present clearly, and plan your future with an AI advisor that knows your real story.',
};

// Applied before hydration so the correct theme paints on first frame —
// without this, a dark-mode user would see a flash of the light page.
const THEME_INIT_SCRIPT = `
(function() {
  try {
    var stored = localStorage.getItem('malmind-theme');
    var theme = stored === 'dark' || stored === 'light'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

// Set the correct language + direction before hydration so an Arabic user
// sees a right-to-left page on the first frame, with no LTR flash.
const LOCALE_INIT_SCRIPT = `
(function() {
  try {
    var stored = localStorage.getItem('malmind-locale');
    var locale = stored === 'ar' || stored === 'en' ? stored : 'ar';
    var el = document.documentElement;
    el.setAttribute('lang', locale);
    el.setAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`h-full antialiased ${rb.variable}`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans">
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <Script id="locale-init" strategy="beforeInteractive">
          {LOCALE_INIT_SCRIPT}
        </Script>
        <ThemeProvider>
          <LocaleProvider>
            <AppShell>{children}</AppShell>
            {/* phones may land, sign up, and confirm — the app itself asks
                for a desktop until the mobile experience ships */}
            <DesktopGate />
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
