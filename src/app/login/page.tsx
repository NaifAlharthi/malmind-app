'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useT } from '@/lib/i18n/LocaleProvider';
import LanguageToggle from '@/components/shared/LanguageToggle';
import ContactModal from '@/components/shared/ContactModal';
import { applyLoginPrefs, rememberedEmail } from '@/lib/authPrefs';
import { hasAuthErrorInUrl } from '@/lib/authError';

type Mode = 'password' | 'link';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const t = useT();

  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null); // magic-link confirmation
  const [contactOpen, setContactOpen] = useState(false);
  const [notice, setNotice] = useState<boolean>(false); // expired/dead email link

  // Prefill the email we remembered last time (and reflect that as "remembered").
  useEffect(() => {
    const saved = rememberedEmail();
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
    // The auth callback lands here when an email link is dead or expired —
    // explain it and put them on the fastest path to a fresh link. Also catch
    // Supabase's own #error=access_denied fragments landing directly here.
    const reason = new URLSearchParams(window.location.search).get('reason');
    if (reason === 'link_expired' || reason === 'missing_code' || hasAuthErrorInUrl()) {
      setNotice(true); // translated at render time so it follows the locale
      setMode('link');
    }
  }, []);

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }
    // Persist the "keep me signed in" choice before we leave the page.
    applyLoginPrefs(remember, email);
    router.push('/home');
    router.refresh();
  }

  async function handleMagicLink(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        // Don't silently create accounts from the login page — that's signup's job.
        shouldCreateUser: false,
      },
    });

    // Remember the choice for when they come back through the link.
    applyLoginPrefs(remember, email);
    setLoading(false);

    // Treat "no such user" like success so we never reveal which emails exist;
    // only surface genuinely actionable errors (e.g. rate limiting).
    const benign = !error || /not\s*found|not\s*allowed|otp|signups?/i.test(error.message);
    if (benign) {
      setSentTo(email);
    } else {
      setError(error.message || t('auth.magic.error'));
    }
  }

  return (
    <div className="min-h-screen bg-[var(--surface-0)] flex items-center justify-center px-6">
      <div className="max-w-sm w-full bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-8">
        <div className="flex items-center justify-between mb-1">
          <div className="font-serif text-xl font-semibold flex items-center gap-1.5">
            Mal<span className="text-[var(--green)]">Mind</span>
            <span className="text-xs leading-none">🇸🇦</span>
          </div>
          <LanguageToggle />
        </div>
        <div className="text-[11px] text-[var(--green-dark)] mb-4">{t('common.madeForSaudi')}</div>

        {sentTo ? (
          <MagicLinkSent email={sentTo} onReset={() => setSentTo(null)} onResend={() => handleMagicLink()} loading={loading} />
        ) : (
          <>
            <h1 className="font-serif text-2xl font-semibold text-[var(--ink)] mb-1">
              {t('auth.login.title')}
            </h1>
            <p className="text-sm text-[var(--ink-2)] mb-5">
              {t('auth.login.subtitle')}
            </p>

            {notice && (
              <div className="text-xs text-[var(--gold-text-body)] bg-[var(--gold-bg)] border border-[var(--gold)] rounded-lg px-3 py-2.5 mb-4 leading-relaxed">
                {t('auth.login.linkExpired')}
              </div>
            )}

            {/* mode tabs */}
            <div className="flex bg-[var(--surface-1)] rounded-lg p-0.5 mb-5">
              <button
                type="button"
                onClick={() => { setMode('password'); setError(null); }}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs transition-colors ${
                  mode === 'password'
                    ? 'bg-[var(--surface-card)] text-[var(--ink)] font-medium shadow-sm'
                    : 'text-[var(--muted)] hover:text-[var(--ink-2)]'
                }`}
              >
                {t('auth.tab.password')}
              </button>
              <button
                type="button"
                onClick={() => { setMode('link'); setError(null); }}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs transition-colors ${
                  mode === 'link'
                    ? 'bg-[var(--surface-card)] text-[var(--ink)] font-medium shadow-sm'
                    : 'text-[var(--muted)] hover:text-[var(--ink-2)]'
                }`}
              >
                {t('auth.tab.link')}
              </button>
            </div>

            {mode === 'password' ? (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--green)]"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs text-[var(--ink-2)] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 accent-[var(--green-dark)] cursor-pointer"
                  />
                  {t('auth.rememberMe')}
                </label>

                {error && <ErrorBox>{error}</ErrorBox>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[var(--green-dark)] text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
                >
                  {loading ? t('auth.signingIn') : t('auth.signIn')}
                </button>
              </form>
            ) : (
              <form onSubmit={handleMagicLink} className="space-y-4">
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
                <p className="text-xs text-[var(--muted)] leading-relaxed">{t('auth.magic.hint')}</p>

                <label className="flex items-center gap-2 text-xs text-[var(--ink-2)] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 accent-[var(--green-dark)] cursor-pointer"
                  />
                  {t('auth.rememberMe')}
                </label>

                {error && <ErrorBox>{error}</ErrorBox>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[var(--green-dark)] text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
                >
                  {loading ? t('auth.magic.sending') : t('auth.magic.send')}
                </button>
              </form>
            )}
          </>
        )}

        <div className="text-xs text-[var(--muted)] mt-5 text-center">
          {t('auth.noAccount')}{' '}
          <a href="/signup" className="text-[var(--green-dark)] font-medium">
            {t('auth.signUpLink')}
          </a>
        </div>

        <div className="text-xs text-center mt-3 pt-3 border-t border-[var(--border-default)]">
          <button
            type="button"
            onClick={() => setContactOpen(true)}
            className="text-[var(--muted)] hover:text-[var(--green-dark)]"
          >
            {t('common.contactUs')}
          </button>
        </div>
      </div>

      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} source="login" />
    </div>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs text-[var(--red-dark-text)] bg-[var(--red-bg)] border border-[var(--red-border)] rounded-lg px-3 py-2">
      {children}
    </div>
  );
}

function MagicLinkSent({
  email,
  onReset,
  onResend,
  loading,
}: {
  email: string;
  onReset: () => void;
  onResend: () => void;
  loading: boolean;
}) {
  const t = useT();
  return (
    <div className="text-center py-2">
      <div className="w-12 h-12 rounded-full bg-[var(--green-bg)] border border-[var(--green-border)] flex items-center justify-center text-2xl mx-auto mb-4">
        ✉️
      </div>
      <h1 className="font-serif text-xl font-semibold text-[var(--ink)] mb-2">
        {t('auth.magic.sentTitle')}
      </h1>
      <p className="text-sm text-[var(--ink-2)] leading-relaxed mb-5">
        {t('auth.magic.sentBody', { email })}
      </p>
      <button
        onClick={onResend}
        disabled={loading}
        className="w-full bg-[var(--green-dark)] text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50 mb-2"
      >
        {loading ? t('auth.magic.sending') : t('auth.magic.resend')}
      </button>
      <button
        onClick={onReset}
        className="w-full text-xs text-[var(--muted)] hover:text-[var(--ink-2)] py-1"
      >
        {t('auth.magic.useDifferent')}
      </button>
    </div>
  );
}
