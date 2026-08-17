'use client';

// The integrations tile on the Log page — the record's INLETS, in the
// open. Four ways numbers reach the Log: your hands, your spreadsheet,
// your bank (coming), and your Google/Microsoft world — with the live
// Google Sheets connection status shown honestly.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/lib/i18n/LocaleProvider';

export default function IntegrationsTile() {
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const [google, setGoogle] = useState<{ connected: boolean; email: string | null } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/integrations/google/status');
        if (r.ok) {
          const j = await r.json();
          setGoogle({ connected: !!j.connected, email: j.email ?? null });
        } else {
          setGoogle({ connected: false, email: null });
        }
      } catch {
        setGoogle({ connected: false, email: null });
      }
    })();
  }, []);

  const DOORS: { icon: string; live: boolean; href?: string; name: string; sub: string; status?: string }[] = [
    {
      icon: '✍️', live: true, href: '/financial-numbers',
      name: L('إدخال يدوي', 'Manual entry'),
      sub: L('سجّل شهرك في دقائق — أنت مصدر الحقيقة', 'Log your month in minutes — you are the source of truth'),
    },
    {
      icon: '📄', live: true, href: '/financial-numbers',
      name: L('اسحب جدولك', 'Drop your spreadsheet'),
      sub: L('CSV/Excel يُحلَّل ويُقرأ بذكاء ويصبّ في السِّجل', 'CSV/Excel, smartly parsed straight into the Log'),
    },
    {
      icon: '🔗', live: true, href: '/financial-numbers',
      name: L('Google و Microsoft', 'Google & Microsoft'),
      sub: L('مزامنة Google Sheets بالاتجاهين · Excel 365 قادم', 'Two-way Google Sheets sync · Excel 365 coming'),
      status: google === null
        ? undefined
        : google.connected
          ? L(`متصل${google.email ? ` — ${google.email}` : ''}`, `Connected${google.email ? ` — ${google.email}` : ''}`)
          : L('غير متصل بعد', 'Not connected yet'),
    },
    {
      icon: '🏦', live: false,
      name: L('واجهات البنوك', 'Bank APIs'),
      sub: L('ربط مباشر بحساباتك — قادم', 'Direct account linking — coming'),
    },
  ];

  return (
    <div className="drv-num bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 sm:p-6 mb-8">
      <div className="font-serif text-lg font-semibold text-[var(--ink)] mb-1">🔌 {L('الروافد — من أين يمتلئ السِّجل', 'Integrations — the record’s inlets')}</div>
      <p className="text-[11px] text-[var(--muted)] leading-relaxed mb-4">
        {L(
          'كل طريقٍ تدخل منه الأرقام إلى سِجلّك. يدخل الرقم مرة واحدة هنا — وتقرؤه كل أداة في المنتج.',
          'Every road a number takes into your record. It enters once here — and every tool in the product reads it.'
        )}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {DOORS.map((d) =>
          d.live && d.href ? (
            <Link
              key={d.name}
              href={d.href}
              className="group flex items-center gap-3 bg-[var(--surface-1)] border border-[var(--border-faint)] rounded-xl px-3.5 py-3 hover:border-[var(--green)] transition-colors"
            >
              <span className="text-xl leading-none shrink-0">{d.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-semibold text-[var(--ink)] group-hover:text-[var(--green-dark)] transition-colors">{d.name}</span>
                <span className="block text-[10px] text-[var(--muted)] leading-relaxed">{d.sub}</span>
                {d.status && (
                  <span className={`block text-[9px] font-semibold mt-0.5 ${d.status.startsWith(L('متصل', 'Connected')) ? 'text-[var(--green-dark)]' : 'text-[var(--muted)]'}`}>
                    {d.status}
                  </span>
                )}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] shrink-0" title={L('متاح الآن', 'Available now')} />
            </Link>
          ) : (
            <div
              key={d.name}
              className="flex items-center gap-3 bg-[var(--surface-1)]/50 border border-dashed border-[var(--border-faint)] rounded-xl px-3.5 py-3 opacity-75"
            >
              <span className="text-xl leading-none shrink-0">{d.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-semibold text-[var(--ink-2)]">{d.name}</span>
                <span className="block text-[10px] text-[var(--muted)] leading-relaxed">{d.sub}</span>
              </span>
              <span className="text-[8px] rounded-full border border-[var(--border-default)] text-[var(--muted)] px-1.5 py-0.5 shrink-0">
                {L('قريباً', 'Soon')}
              </span>
            </div>
          )
        )}
      </div>
    </div>
  );
}
