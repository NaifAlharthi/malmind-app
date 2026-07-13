import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import AppShell from '@/components/shared/AppShell';
import ThemeProvider from '@/components/shared/ThemeProvider';
import { Analytics } from '@vercel/analytics/next';

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans">
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
