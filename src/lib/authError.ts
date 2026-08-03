// src/lib/authError.ts
// Supabase reports failed email links (expired, already used — often consumed
// by an inbox's link-scanner before the human ever clicks) by redirecting to
// the Site URL with error params, usually in the URL FRAGMENT:
//   #error=access_denied&error_code=otp_expired&error_description=...
// Fragments never reach server routes, so client pages call this on mount to
// catch the error and route the user to a recovery path instead of a silent
// "access denied" dead end.

export function hasAuthErrorInUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const query = new URLSearchParams(window.location.search);
  return Boolean(
    hash.get('error') || hash.get('error_code') || query.get('error') || query.get('error_code')
  );
}
