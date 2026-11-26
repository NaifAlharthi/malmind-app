import { useEffect } from 'react';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import { LocaleProvider, useLocale } from '@/lib/i18n';
import { AppProvider, useStore } from '@/lib/store';
import { C } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: C.bg, card: C.card, text: C.ink, border: C.border, primary: C.greenText },
};

function Routes() {
  const { L } = useLocale();
  const { mode } = useStore();

  // keep the splash up until we know who you are
  useEffect(() => {
    if (mode !== 'loading') SplashScreen.hideAsync();
  }, [mode]);

  const pushed = (title: string) => ({
    headerShown: true,
    title,
    headerStyle: { backgroundColor: C.bg },
    headerTintColor: C.greenText,
    headerTitleStyle: { color: C.ink },
    headerBackTitle: L('رجوع', 'Back'),
  });

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="month" options={{ presentation: 'modal' }} />
      <Stack.Screen name="space" options={{ presentation: 'modal' }} />
      <Stack.Screen name="tool/volatility" options={pushed(L('التقلّب', 'Volatility'))} />
      <Stack.Screen name="tool/gosi" options={pushed(L('التأمينات', 'GOSI'))} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <LocaleProvider>
      <AppProvider>
        <ThemeProvider value={theme}>
          <StatusBar style="light" />
          <Routes />
        </ThemeProvider>
      </AppProvider>
    </LocaleProvider>
  );
}
