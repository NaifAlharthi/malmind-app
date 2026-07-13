'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { joinName } from '@/lib/name';
import { enterDemo } from '@/lib/demoSupabase';

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
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
    <div className="min-h-screen bg-[var(--surface-0)] flex items-center justify-center px-6">
      <div className="max-w-sm w-full bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-8">
        <div className="font-serif text-xl font-semibold mb-1">
          Mal<span className="text-[var(--green)]">Mind</span>
        </div>
        <h1 className="font-serif text-2xl font-semibold text-[var(--ink)] mb-1">
          Create your account
        </h1>
        <p className="text-sm text-[var(--ink-2)] mb-6">
          Your data is yours — stored securely, never used to train any model.
        </p>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--muted)] block mb-1">First name</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--green)]"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--muted)] block mb-1">Last name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--green)]"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--green)]"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">Password</label>
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
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <div className="text-xs text-[var(--muted)] mt-5 text-center">
          Already have an account?{' '}
          <a href="/login" className="text-[var(--green-dark)] font-medium">
            Log in
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
                ✦ Just looking? Take the tour
              </span>
              <span className="text-[var(--green-dark)] group-hover:translate-x-0.5 transition-transform">→</span>
            </div>
            <p className="text-xs text-[var(--ink-2)] leading-relaxed">
              Explore the full product as Sara — a guided, two-minute walkthrough of every
              feature with real-feeling data. No account, nothing saved.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
