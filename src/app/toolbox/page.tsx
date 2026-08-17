'use client';

// The Toolbox — the whole workshop on its own page. Every tool in the
// product, arranged across the three times, one tap from anywhere via
// the top bar or ⇧X. Depthless: a directory has no rooms.

import FullToolMatrix from '@/components/toolbox/FullToolMatrix';
import { useLocale } from '@/lib/i18n/LocaleProvider';

export default function ToolboxPage() {
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-[var(--ink)]">🧰 {L('صندوق الأدوات', 'The Toolbox')}</h1>
        <p className="text-sm text-[var(--ink-2)]">
          {L('الورشة كاملة — كل أداة في المنتج، مصفوفةً عبر الأزمنة الثلاثة وبعمق كلٍّ منها.', 'The whole workshop — every tool in the product, arranged across the three times, each at its depth.')}
        </p>
      </div>
      <FullToolMatrix />
    </div>
  );
}
