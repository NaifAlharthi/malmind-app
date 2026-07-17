// src/lib/authPrefs.ts
// "Keep me signed in" preferences.
//
// Supabase (@supabase/ssr) always writes 400-day persistent auth cookies and
// gives no per-login way to shorten them — it hard-codes the cookie maxAge.
// So "keep me signed in = off" is enforced on the client: we tag the session
// as ephemeral and sign the user out the next time they open the app in a
// fresh browser session (see EphemeralSessionGuard). We also remember the
// email address when the box is checked, to prefill it next time.

const REMEMBER_EMAIL = 'mm-remember-email'; // localStorage: last email to prefill
const EPHEMERAL = 'mm-ephemeral'; // localStorage: '1' = end session on browser close
const ALIVE = 'mm-session-alive'; // sessionStorage: this browser session is a continuation

function ls(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
function ss(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Record the user's choice at login time. */
export function applyLoginPrefs(remember: boolean, email: string) {
  const l = ls();
  const s = ss();
  if (!l) return;
  if (remember) {
    l.setItem(REMEMBER_EMAIL, email);
    l.removeItem(EPHEMERAL);
    s?.removeItem(ALIVE);
  } else {
    l.removeItem(REMEMBER_EMAIL);
    l.setItem(EPHEMERAL, '1');
    // The tab we're logging in from is a valid continuation, so mark it alive
    // — only a *new* browser session (fresh sessionStorage) should sign out.
    s?.setItem(ALIVE, '1');
  }
}

/** Email to prefill on the login form (empty string if none remembered). */
export function rememberedEmail(): string {
  return ls()?.getItem(REMEMBER_EMAIL) ?? '';
}

export function isEphemeralSession(): boolean {
  return ls()?.getItem(EPHEMERAL) === '1';
}

export function sessionMarkedAlive(): boolean {
  return ss()?.getItem(ALIVE) === '1';
}

export function markSessionAlive() {
  ss()?.setItem(ALIVE, '1');
}

/** Clear the ephemeral tagging (on explicit sign-out, or after enforcing it). */
export function clearEphemeral() {
  ls()?.removeItem(EPHEMERAL);
  ss()?.removeItem(ALIVE);
}
