'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { isDemoActive, exitDemo } from '@/lib/demoSupabase';
import { joinName } from '@/lib/name';
import { hasAuthErrorInUrl } from '@/lib/authError';
import { useT } from '@/lib/i18n/LocaleProvider';
import LanguageToggle from '@/components/shared/LanguageToggle';
import ContactModal from '@/components/shared/ContactModal';
import Splash from './Splash';
import PersonaPicker from './PersonaPicker';

export default function SignupPage() {
  const router = useRouter();
  const t = useT();

  // A failed email link (expired / already consumed by an inbox scanner) can
  // land here with #error=access_denied — route to recovery, not a dead end.
  useEffect(() => {
    if (hasAuthErrorInUrl()) router.replace('/login?reason=link_expired');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  // Email-confirmation flow: when Supabase requires the user to confirm their
  // address, signUp succeeds but returns NO session. We must not push them
  // into the (auth-guarded) app — show a clear "check your inbox" step.
  const [confirmSentTo, setConfirmSentTo] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // If the visitor was mid-demo, leave it — a real account always beats the
    // mock client (whose signUp is intentionally disabled).
    if (isDemoActive()) exitDemo();
    const client = createClient(); // fresh: guaranteed the REAL client now

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { name: joinName(firstName, lastName) }, // picked up by the handle_new_user() trigger
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);
    if (error) {
      // Friendlier message for the most common trip-up.
      if (/already registered/i.test(error.message)) {
        setError(t('auth.signup.exists'));
      } else {
        setError(error.message);
      }
      return;
    }
    // "Confirm email" ON in Supabase → user exists but no session yet: they
    // must click the link first. Only enter the app when we hold a session.
    if (data.session) {
      router.push('/onboarding?justSignedUp=1');
    } else {
      setConfirmSentTo(email);
    }
  }

  async function resendConfirmation() {
    if (!confirmSentTo) return;
    setResending(true);
    await createClient().auth.resend({
      type: 'signup',
      email: confirmSentTo,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setResending(false);
    setResent(true);
  }

  return (
    <div>
      <LanguageToggle className="fixed top-4 right-4 z-50 shadow-md" />
      <Splash />
      <PersonaPicker />
      <div id="signup-form" className="relative min-h-screen bg-[var(--surface-0)] flex items-center justify-center px-6 py-16 overflow-hidden">
      {/* soft brand glow tying the form to the splash above */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[560px] h-[360px] rounded-full blur-[130px] opacity-40 pointer-events-none"
        style={{ background: 'radial-gradient(circle, var(--green) 0%, transparent 70%)' }} aria-hidden />
      <div className="relative max-w-sm w-full bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-8 shadow-2xl shadow-black/10 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1" style={{ background: 'linear-gradient(90deg, #1D9E75, #17B8C9, #C9A84C)' }} aria-hidden />
        <div className="font-serif text-xl font-semibold mb-1 flex items-center gap-1.5">
          Mal<span className="text-[var(--green)]">Mind</span>
          <span className="text-xs leading-none">🇸🇦</span>
        </div>
        <div className="text-[11px] text-[var(--green-dark)] mb-4">{t('common.saudiFirst')}</div>
        {confirmSentTo ? (
          /* email-confirmation step — the account exists, the inbox holds the key */
          <div className="text-center py-2">
            <div className="w-12 h-12 rounded-full bg-[var(--green-bg)] border border-[var(--green-border)] flex items-center justify-center text-2xl mx-auto mb-4">
              ✉️
            </div>
            <h1 className="font-serif text-xl font-semibold text-[var(--ink)] mb-2">
              {t('auth.confirm.title')}
            </h1>
            <p className="text-sm text-[var(--ink-2)] leading-relaxed mb-1">
              {t('auth.confirm.body', { email: confirmSentTo })}
            </p>
            <p className="text-xs text-[var(--muted)] leading-relaxed mb-5">
              {t('auth.confirm.hint')}
            </p>
            <button
              onClick={resendConfirmation}
              disabled={resending || resent}
              className="w-full bg-[var(--green-dark)] text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50 mb-2"
            >
              {resent ? t('auth.confirm.resent') : resending ? t('auth.magic.sending') : t('auth.confirm.resend')}
            </button>
            <button
              onClick={() => { setConfirmSentTo(null); setResent(false); }}
              className="w-full text-xs text-[var(--muted)] hover:text-[var(--ink-2)] py-1"
            >
              {t('auth.magic.useDifferent')}
            </button>
          </div>
        ) : (
        <>
        <h1 className="font-serif text-2xl font-semibold text-[var(--ink)] mb-1">
          {t('auth.signup.title')}
        </h1>
        <p className="text-sm text-[var(--ink-2)] mb-6">
          {t('auth.signup.subtitle')}
        </p>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--muted)] block mb-1">{t('auth.firstName')}</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--green)]"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--muted)] block mb-1">{t('auth.lastName')}</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--green)]"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">{t('auth.email')}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--green)]"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">{t('auth.password')}</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--green)]"
            />
          </div>

          {error && (
            <div className="text-xs text-[var(--red-dark-text)] bg-[var(--red-bg)] border border-[var(--red-border)] rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--green-dark)] text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {loading ? t('auth.creating') : t('auth.createAccount')}
          </button>
        </form>

        <div className="text-xs text-[var(--muted)] mt-5 text-center">
          {t('auth.haveAccount')}{' '}
          <a href="/login" className="text-[var(--green-dark)] font-medium">
            {t('auth.loginLink')}
          </a>
          <span className="mx-2">·</span>
          <button type="button" onClick={() => setContactOpen(true)} className="text-[var(--green-dark)] font-medium">
            {t('common.contactUs')}
          </button>
        </div>

        {/* guest demo entry */}
        <div className="mt-6 pt-5 border-t border-[var(--border-default)]">
          <button
            type="button"
            onClick={() => document.getElementById('persona-picker')?.scrollIntoView({ behavior: 'smooth' })}
            className="w-full text-left bg-[var(--green-bg)] border border-[var(--green-border)] rounded-xl p-4 hover:border-[var(--green)] transition-colors group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-[var(--green-dark)]">
                {t('auth.demo.title')}
              </span>
              <span className="text-[var(--green-dark)] group-hover:translate-x-0.5 transition-transform">→</span>
            </div>
            <p className="text-xs text-[var(--ink-2)] leading-relaxed">
              {t('auth.demo.desc')}
            </p>
          </button>
        </div>
        </>
        )}
      </div>
      </div>
      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} source="signup" />
    </div>
  );
}
