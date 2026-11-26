import { useEffect } from 'react';
import { DarkTheme, LocaleProvider as RouterDirection, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { headerOptions } from '@/components/TabStack';
import { LocaleProvider, useLocale } from '@/lib/i18n';
import { AppProvider, useStore } from '@/lib/store';
import { C } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: C.bg, card: C.card, text: C.ink, border: C.border, primary: C.greenText },
};

function Routes() {
  const { L, ar } = useLocale();
  const { mode } = useStore();

  // keep the splash up until we know who you are
  useEffect(() => {
    if (mode !== 'loading') SplashScreen.hideAsync();
  }, [mode]);

  const pushed = (title: string) => ({
    ...headerOptions(false),
    title,
    headerBackTitle: L('رجوع', 'Back'),
    headerBackButtonDisplayMode: 'minimal' as const,
  });

  return (
    // Expo Go can't flip the app's native layout, but the router can: in
    // Arabic every native bar runs right-to-left — titles on the right,
    // the back chevron on the right, and swipe-back from the right edge.
    <RouterDirection direction={ar ? 'rtl' : 'ltr'}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        {/* the month editor: a full sheet you swipe down to close */}
        <Stack.Screen
          name="month"
          options={{ presentation: 'formSheet', sheetAllowedDetents: [1], sheetGrabberVisible: true, contentStyle: { backgroundColor: C.bg } }}
        />
        {/* your space: a half sheet that pulls up to full */}
        <Stack.Screen
          name="space"
          options={{ presentation: 'formSheet', sheetAllowedDetents: [0.62, 1], sheetGrabberVisible: true, contentStyle: { backgroundColor: C.bg } }}
        />
        <Stack.Screen name="tool/volatility" options={pushed(L('التقلّب', 'Volatility'))} />
        <Stack.Screen name="tool/gosi" options={pushed(L('التأمينات', 'GOSI'))} />
      </Stack>
    </RouterDirection>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.bg }}>
      <LocaleProvider>
        <AppProvider>
          <ThemeProvider value={theme}>
            <StatusBar style="light" />
            <Routes />
          </ThemeProvider>
        </AppProvider>
      </LocaleProvider>
    </GestureHandlerRootView>
  );
}
