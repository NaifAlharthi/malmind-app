'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function RootPage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
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
