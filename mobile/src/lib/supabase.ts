// The same Supabase project as malmind.ai — one account, one Log, on
// every surface. Keys come from .env.local (EXPO_PUBLIC_SUPABASE_*).
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { kv } from '@/lib/kv';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = !!url && !!anonKey;

export const supabase = createClient(url ?? 'https://not-configured.supabase.co', anonKey ?? 'not-configured', {
  auth: {
    storage: kv,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refresh tokens only while the app is in the foreground.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
