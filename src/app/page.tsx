'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { hasAuthErrorInUrl } from '@/lib/authError';

export default function RootPage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // A failed email link (expired / already consumed) redirects here with
    // #error=access_denied — send the user to recovery, not a dead end.
    if (hasAuthErrorInUrl()) {
      router.replace('/login?reason=link_expired');
      return;
    }
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      // Signed-out visitors land on the signup page, which opens with the
      // animated product-story splash (login is one link away from there).
      router.replace(user ? '/home' : '/signup');
    })();
  }, [router, supabase]);

  return null;
}
