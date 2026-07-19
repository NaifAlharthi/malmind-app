'use client';

// The "?" explainer that sits on every insight card. Click it and the Brain
// steps in: what the card shows, how it's computed (when applicable), and
// what you can do about it — with a one-tap handoff into a real conversation
// with the Brain about exactly this topic (via the mm-ask sessionStorage
// handoff the advisor already understands).

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useLocale } from '@/lib/i18n/LocaleProvider';

const MiniBrain = dynamic(
  () => import('./BrainCompanion').then((m) => m.MiniBrain),
  { ssr: false, loading: () => <div className="w-16 h-16 shrink-0" /> }
);

export interface ExplainContent {
  title: string;
  what: string;
  how?: string;
  action?: string;
  /** The question handed to the advisor when the user wants to go deeper. */
  ask: string;
}

export default function ExplainButton({ content }: { content: ExplainContent }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { t } = useLocale();

  function askBrain() {
    try {
      window.sessionStorage.setItem('mm-ask', content.ask);
    } catch {}
    router.push('/advisor');
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={t('explain.eyebrow')}
        aria-label={t('explain.eyebrow')}
        className="w-[18px] h-[18px] rounded-full border border-[var(--border-medium)] text-[10px] leading-none text-[var(--muted)] hover:text-[var(--green-dark)] hover:border-[var(--green)] transition-colors flex items-center justify-center shrink-0"
      >
        ?
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-[var(--scrim-strong)] flex items-center justify-center px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 max-w-sm w-full max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-3">
              <MiniBrain />
              <div className="flex-1 min-w-0 pt-1">
                <div className="text-[10px] tracking-[0.12em] uppercase text-[var(--gold)]">
                  {t('explain.eyebrow')}
                </div>
                <div className="font-serif text-lg font-semibold text-[var(--ink)]">{content.title}</div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-[var(--muted)] hover:text-[var(--ink)] text-sm"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <Section label={t('explain.what')}>{content.what}</Section>
            {content.how && <Section label={t('explain.how')}>{content.how}</Section>}
            {content.action && <Section label={t('explain.action')}>{content.action}</Section>}

            <button
              onClick={askBrain}
              className="w-full mt-2 text-sm font-semibold bg-[var(--green-dark)] text-white rounded-lg px-4 py-2.5"
            >
              {t('explain.ask')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="text-[10px] tracking-[0.08em] uppercase text-[var(--muted)] mb-1">{label}</div>
      <p className="text-xs text-[var(--ink-2)] leading-relaxed">{children}</p>
    </div>
  );
}
