import { Redirect } from 'expo-router';

import { Loading } from '@/components/ui';
import { useStore } from '@/lib/store';

// The front door: the welcome screen until you're someone — a persona or
// a signed-in account — then straight to Home.
export default function Index() {
  const { mode } = useStore();
  if (mode === 'loading') return <Loading />;
  return <Redirect href={mode === 'signedOut' ? '/welcome' : '/home'} />;
}
