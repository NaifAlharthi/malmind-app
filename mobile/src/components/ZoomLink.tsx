// A tappable surface that opens a pushed screen. On iPhone (iOS 18+) the
// surface zooms open into the screen (expo-router's Link.AppleZoom). Off
// iPhone it simply navigates: Link's web handler only accepts real click
// events, and a Press surface hands it a press event, so the link would
// silently do nothing there.

import { Platform } from 'react-native';
import { Link, router } from 'expo-router';

import { Press, type PressProps } from '@/components/ui';

export function ZoomLink({ href, children, ...press }: { href: string } & Omit<PressProps, 'onPress'>) {
  if (Platform.OS === 'ios') {
    return (
      <Link href={href} asChild>
        <Link.AppleZoom>
          <Press {...press}>{children}</Press>
        </Link.AppleZoom>
      </Link>
    );
  }
  return <Press {...press} onPress={() => router.push(href as never)}>{children}</Press>;
}
