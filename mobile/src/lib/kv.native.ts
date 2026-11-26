// Key-value storage on iPhone/Android: expo-sqlite's synchronous
// localStorage (the SDK 58 Supabase guide's recommended session store).
// The install import must run before anything reads `localStorage`.
import 'expo-sqlite/localStorage/install';

export const kv: Storage = globalThis.localStorage;
