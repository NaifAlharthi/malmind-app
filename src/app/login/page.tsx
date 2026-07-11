'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push('/home');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[var(--surface-0)] flex items-center justify-center px-6">
      <div className="max-w-sm w-full bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-8">
        <div className="font-serif text-xl font-semibold mb-1">
          Mal<span className="text-[var(--green)]">Mind</span>
        </div>
        <h1 className="font-serif text-2xl font-semibold text-[var(--ink)] mb-1">
          Welcome back
        </h1>
        <p className="text-sm text-[var(--ink-2)] mb-6">
          Log in to pick up right where you left off.
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
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
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <div className="text-xs text-[var(--muted)] mt-5 text-center">
          New to MalMind?{' '}
          <a href="/signup" className="text-[var(--green-dark)] font-medium">
            Create an account
          </a>
        </div>
      </div>
    </div>
  );
}
