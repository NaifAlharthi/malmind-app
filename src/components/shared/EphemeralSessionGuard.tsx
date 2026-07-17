'use client';

// Enforces "keep me signed in = off". When a session is tagged ephemeral
// (see authPrefs), this signs the user out the first time the app loads in a
// brand-new browser session — i.e. after the browser was fully closed and
// reopened. A reload or in-app navigation keeps you signed in (sessionStorage
// survives those); only a cold start clears it.
//
// The tricky case is opening a *second tab* while another is still open —
// that tab also has empty sessionStorage but must NOT sign out. We resolve it
// by asking peer tabs over a BroadcastChannel: if any living tab answers, this
// is a continuation, not a cold start.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  clearEphemeral,
  isEphemeralSession,
  markSessionAlive,
  sessionMarkedAlive,
} from '@/lib/authPrefs';

const CHANNEL = 'mm-session';

export default function EphemeralSessionGuard() {
  const router = useRouter();

  useEffect(() => {
    if (!isEphemeralSession()) return;

    // Same tab continuing (reload / navigation) — already vouched for.
    if (sessionMarkedAlive()) return;

    const bc = 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL) : null;
    let alivePeer = false;

    if (bc) {
      bc.onmessage = (e) => {
        // Answer "who's there?" only if we ourselves are an established tab.
        if (e.data === 'who?' && sessionMarkedAlive()) bc.postMessage('here');
        if (e.data === 'here') alivePeer = true;
      };
      bc.postMessage('who?');
    }

    // Give peers a moment to answer before deciding this is a cold start.
    const timer = setTimeout(async () => {
      if (alivePeer) {
        markSessionAlive(); // continuation — remember that for this tab
        bc?.close();
        return;
      }
      // No living peer → the browser was closed and reopened. Honor the
      // user's "don't keep me signed in" choice.
      bc?.close();
      clearEphemeral();
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace('/login');
    }, 200);

    return () => {
      clearTimeout(timer);
      bc?.close();
    };
  }, [router]);

  return null;
}
