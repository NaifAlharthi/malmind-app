import type { Metadata } from 'next';
import './globals.css';
import AppShell from '@/components/shared/AppShell';

export const metadata: Metadata = {
  title: 'MalMind — Your money, finally understood.',
  description:
    'MalMind is a financial thinking companion for Saudi Arabia. Understand your past, see your present clearly, and plan your future with an AI advisor that knows your real story.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
