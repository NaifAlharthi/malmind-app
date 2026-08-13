'use client';

// MalMind is desktop-first — for now. Phones can land, sign up, and confirm
// their email (those pages are mobile-proper), but the product itself is
// designed for a big screen. Instead of serving a phone a broken desktop
// layout, this gate covers the app with a clear, warm "continue on your
// computer" screen. It lifts automatically the moment the viewport is
// desktop-sized, and never appears on the public/auth pages.

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useLocale } from '@/lib/i18n/LocaleProvider';

// Pages a phone may use freely: landing, sign-up, sign-in. Everything past
// the door needs a desktop — for now.
const MOBILE_OK = ['/', '/login', '/signup'];

function isPhone() {
  // A phone is a phone: small viewport, or a mobile user agent (catches
  // landscape phones whose width sneaks past the breakpoint). Tablets and
  // narrow desktop windows are left alone.
  return (
    window.matchMedia('(max-width: 767px)').matches &&
    window.matchMedia('(pointer: coarse)').matches
  ) || /Android.*Mobile|iPhone|iPod/i.test(navigator.userAgent);
}

function GateInner() {
  const pathname = usePathname();
  const params = useSearchParams();
  const { locale, setLocale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);

  const [phone, setPhone] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const update = () => setPhone(isPhone());
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  if (!phone || MOBILE_OK.includes(pathname)) return null;

  // Fresh from the confirmation email — lead with the good news.
  const justSignedUp = params.get('justSignedUp') === '1';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText('https://www.malmind.ai');
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — the address is printed on screen anyway */
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[var(--surface-0)] text-[var(--ink)] overflow-y-auto">
      <div className="min-h-full flex flex-col items-center justify-center px-6 py-12 text-center relative">
        {/* soft brand glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[480px] h-[300px] rounded-full blur-[120px] opacity-30 pointer-events-none"
          style={{ background: 'radial-gradient(circle, var(--green) 0%, transparent 70%)' }}
          aria-hidden
        />

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
            {L('التجربة الكاملة على الكمبيوتر — حالياً', 'The full experience is on desktop — for now')}
          </h1>
          <p className="text-sm text-[var(--ink-2)] leading-relaxed mb-2">
            {L(
              'صمّمنا مال مايند أولاً للشاشات الكبيرة، حيث تظهر صورتك المالية كاملة كما تستحق. افتح الرابط من جهاز كمبيوتر لتكمل رحلتك.',
              'MalMind is designed for big screens first, where your full financial picture shows the way it deserves. Open the link on a computer to continue your journey.'
            )}
          </p>
          <p className="text-xs text-[var(--muted)] leading-relaxed mb-7">
            {L('نسخة الجوال قادمة في مرحلة لاحقة.', 'A phone experience is coming in a later phase.')}
          </p>

          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl px-4 py-3 flex items-center justify-between gap-3 mb-3">
            <span className="font-mono text-sm text-[var(--ink)]" dir="ltr">www.malmind.ai</span>
            <button
              onClick={copyLink}
              className="text-xs font-medium text-[var(--green-dark)] bg-[var(--green-bg)] border border-[var(--green-border)] rounded-lg px-3 py-1.5 shrink-0"
            >
              {copied ? L('نُسخ ✓', 'Copied ✓') : L('انسخ الرابط', 'Copy link')}
            </button>
          </div>

          <p className="text-[11px] text-[var(--muted)] leading-relaxed">
            {L(
              'حسابك وبياناتك بانتظارك — سجّل دخولك من الكمبيوتر بنفس البريد وكلمة المرور.',
              'Your account and data are waiting — sign in on your computer with the same email and password.'
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
