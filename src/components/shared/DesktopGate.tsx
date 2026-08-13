'use client';

// MalMind's phone experience is a companion, phase one: the door (landing,
// signup, login, onboarding) and the daily loop — Home with the hājis, the
// Brain, and the Daily Stack for quick capture. The deep dashboards and
// modeling tools remain desktop-only for now: instead of serving a phone a
// broken desktop layout, this gate names the situation and walks the user
// back to what their phone does well. It never appears on desktop.

import { Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { useIsPhone } from '@/lib/useIsPhone';

// The phase-1 companion surface: everything a phone opens freely.
const MOBILE_OK = ['/', '/login', '/signup', '/onboarding', '/home', '/advisor', '/daily-stack'];

function GateInner() {
  const pathname = usePathname();
  const params = useSearchParams();
  const { locale, setLocale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);

  const phone = useIsPhone();

  if (!phone || MOBILE_OK.includes(pathname)) return null;

  // Fresh from the confirmation email — lead with the good news.
  const justSignedUp = params.get('justSignedUp') === '1';

  return (
    <div className="fixed inset-0 z-[200] bg-[var(--surface-0)] text-[var(--ink)] overflow-y-auto overflow-x-hidden">
      <div className="min-h-full flex flex-col items-center justify-center px-6 py-12 text-center relative">
        {/* soft brand glow — clipped to the viewport: if it overflows the
            gate's scroll container, iOS Safari's RTL hit-testing drifts and
            taps land beside the buttons they aim at */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[480px] h-[300px] rounded-full blur-[120px] opacity-30"
            style={{ background: 'radial-gradient(circle, var(--green) 0%, transparent 70%)' }}
          />
        </div>

        <button
          onClick={() => setLocale(ar ? 'en' : 'ar')}
          className="absolute top-4 end-4 text-xs text-[var(--muted)] border border-[var(--border-default)] rounded-full px-3 py-1.5"
        >
          {ar ? 'English' : 'العربية'}
        </button>

        <div className="relative max-w-sm w-full">
          <div className="font-serif text-2xl font-semibold flex items-center justify-center gap-2 mb-6">
            <span>Mal<span className="text-[var(--green)]">Mind</span></span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/saudi-flag.svg" alt="" className="h-4 w-[21px] rounded-[2px] object-cover" />
          </div>

          {justSignedUp && (
            <div className="flex items-center justify-center gap-2 bg-[var(--green-bg)] border border-[var(--green-border)] text-[var(--green-dark)] rounded-xl px-4 py-3 text-sm font-medium mb-6">
              <span aria-hidden>✓</span>
              {L('تم تفعيل حسابك بنجاح — كل شيء جاهز.', 'Your account is confirmed — everything is ready.')}
            </div>
          )}

          {/* a friendly monitor, drawn inline */}
          <svg viewBox="0 0 64 48" className="w-20 h-15 mx-auto mb-5 text-[var(--green-dark)]" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="6" y="6" width="52" height="32" rx="4" />
            <path d="M26 44h12M32 38v6" />
            <path d="M18 22l6 5 10-11" strokeWidth="3" className="text-[var(--green)]" stroke="currentColor" />
          </svg>

          <h1 className="font-serif text-xl font-semibold mb-3">
            {L('هذه الأداة على الكمبيوتر — حالياً', 'This tool lives on desktop — for now')}
          </h1>
          <p className="text-sm text-[var(--ink-2)] leading-relaxed mb-2">
            {L(
              'اللوحات العميقة وأدوات النمذجة صُمّمت للشاشات الكبيرة، حيث تظهر صورتك المالية كاملة كما تستحق. جوالك يفتح الرئيسية والعقل وكومة اليوم — والبقية بانتظارك على الكمبيوتر.',
              'The deep dashboards and modeling tools are designed for big screens, where your full financial picture shows the way it deserves. Your phone opens Home, the Brain, and the Daily Stack — the rest awaits you on a computer.'
            )}
          </p>
          <p className="text-xs text-[var(--muted)] leading-relaxed mb-6">
            {L('التجربة الكاملة للجوال قادمة في مرحلة لاحقة.', 'The full phone experience is coming in a later phase.')}
          </p>

          {/* This button must always work. Instrumentation showed taps on the
              gate can deliver pointerdown and then never complete the click
              gesture (mobile Safari), so navigation fires imperatively on the
              earliest event that provably arrives — the href stays as the
              no-JS fallback. */}
          <a
            href="/home"
            onPointerDown={() => window.location.assign('/home')}
            onClick={(e) => { e.preventDefault(); window.location.assign('/home'); }}
            className="block w-full bg-[var(--green-dark)] text-white rounded-xl py-3 text-sm font-semibold mb-4 select-none touch-manipulation"
          >
            {L('خذني للرئيسية ←', 'Take me home →')}
          </a>

          <p className="text-[11px] text-[var(--muted)] leading-relaxed">
            {L(
              'حسابك وبياناتك واحدة في كل مكان — افتح malmind.ai من الكمبيوتر وستجد كل شيء بانتظارك.',
              'Your account and data are the same everywhere — open malmind.ai on a computer and everything is waiting.'
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function DesktopGate() {
  // useSearchParams needs a Suspense boundary in the app router.
  return (
    <Suspense fallback={null}>
      <GateInner />
    </Suspense>
  );
}
