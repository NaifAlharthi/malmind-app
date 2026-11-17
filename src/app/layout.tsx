import type { Metadata } from 'next';
import Script from 'next/script';
import localFont from 'next/font/local';
import './globals.css';
import AppShell from '@/components/shared/AppShell';
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

// Microsoft Clarity — heatmaps (click, scroll, mouse movement) and session
// replays. Off unless NEXT_PUBLIC_CLARITY_ID is set; the id is validated
// before it is inlined. Each session is tagged demo vs real and by
// language so their heatmaps can be filtered apart. Financial numbers are
// masked: AppShell marks the app's <main> with data-clarity-mask.
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID ?? '';
const clarityScript = (id: string) => `
(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${id}");
try {
  var demo = localStorage.getItem('mm-demo') === '1';
  window.clarity('set', 'mode', demo ? 'demo' : 'real');
  if (demo) window.clarity('set', 'persona', localStorage.getItem('mm-demo-persona') || 'unknown');
  window.clarity('set', 'lang', localStorage.getItem('malmind-locale') || 'ar');
} catch (e) {}
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
        {/^[a-z0-9]{6,20}$/i.test(CLARITY_ID) && (
          <Script id="clarity" strategy="lazyOnload">
            {clarityScript(CLARITY_ID)}
          </Script>
        )}
        <ThemeProvider>
          <LocaleProvider>
            {/* web and mobile stay symmetrical — one product, both surfaces */}
            <AppShell>{children}</AppShell>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
