// Each tab is its own native stack, so its title is the system's large
// title — big at the top, shrinking into the bar as you scroll, like
// Settings or Wallet. On iOS 26 the bar is Liquid Glass; before that, a
// translucent blur. In Arabic the bar is laid out right-to-left (the root
// layout sets the router's direction).

import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { isLiquidGlassAvailable } from 'expo-glass-effect';

import { C } from '@/lib/theme';

const GLASS = Platform.OS === 'ios' && isLiquidGlassAvailable();

export function headerOptions(large: boolean) {
  return {
    headerShown: true,
    headerLargeTitleEnabled: large,
    headerLargeTitleShadowVisible: false,
    headerShadowVisible: false,
    headerTintColor: C.greenText,
    headerTitleStyle: { color: C.ink },
    headerLargeTitleStyle: { color: C.ink },
    contentStyle: { backgroundColor: C.bg },
    // iOS 26: leave the bar alone and it becomes Liquid Glass; older iOS:
    // a translucent material; the browser preview: a plain bar
    ...(Platform.OS === 'ios'
      ? (GLASS ? {} : { headerTransparent: true, headerBlurEffect: 'systemChromeMaterialDark' as const })
      : { headerStyle: { backgroundColor: C.bg } }),
  };
}

export function TabStack({ title, large = true }: { title: string; large?: boolean }) {
  return <Stack screenOptions={{ ...headerOptions(large), title }} />;
}
