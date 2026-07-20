'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { joinName } from '@/lib/name';
import { enterDemo } from '@/lib/demoSupabase';
import { useT } from '@/lib/i18n/LocaleProvider';
import LanguageToggle from '@/components/shared/LanguageToggle';
import Splash from './Splash';

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const t = useT();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: joinName(firstName, lastName) }, // picked up by the handle_new_user() trigger
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push('/onboarding?justSignedUp=1');
  }

  return (
    <div>
      <LanguageToggle className="fixed top-4 right-4 z-50 shadow-md" />
      <Splash />
      <div id="signup-form" className="min-h-screen bg-[var(--surface-0)] flex items-center justify-center px-6 py-16">
      <div className="max-w-sm w-full bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-8">
        <div className="font-serif text-xl font-semibold mb-1 flex items-center gap-1.5">
          Mal<span className="text-[var(--green)]">Mind</span>
          <span className="text-xs leading-none">🇸🇦</span>
        </div>
        <div className="text-[11px] text-[var(--green-dark)] mb-4">{t('common.saudiFirst')}</div>
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
        </div>

        {/* guest demo entry */}
        <div className="mt-6 pt-5 border-t border-[var(--border-default)]">
          <button
            type="button"
            onClick={() => {
              enterDemo();
              router.push('/home');
            }}
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
      </div>
      </div>
    </div>
  );
}
