'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { joinName } from '@/lib/name';

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
    <div className="min-h-screen bg-[#F5F4F0] flex items-center justify-center px-6">
      <div className="max-w-sm w-full bg-white border border-black/10 rounded-2xl p-8">
        <div className="font-serif text-xl font-semibold mb-1">
          Mal<span className="text-[#1D9E75]">Mind</span>
        </div>
        <h1 className="font-serif text-2xl font-semibold text-[#141414] mb-1">
          Create your account
        </h1>
        <p className="text-sm text-[#3D3D3A] mb-6">
          Your data is yours — stored securely, never used to train any model.
        </p>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#898781] block mb-1">First name</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1D9E75]"
              />
            </div>
            <div>
              <label className="text-xs text-[#898781] block mb-1">Last name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1D9E75]"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-[#898781] block mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1D9E75]"
            />
          </div>
          <div>
            <label className="text-xs text-[#898781] block mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1D9E75]"
            />
          </div>

          {error && (
            <div className="text-xs text-[#A32D2D] bg-[#FBE9EC] border border-[#E5A0AC] rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#085041] text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <div className="text-xs text-[#898781] mt-5 text-center">
          Already have an account?{' '}
          <a href="/login" className="text-[#085041] font-medium">
            Log in
          </a>
        </div>
      </div>
    </div>
  );
}
