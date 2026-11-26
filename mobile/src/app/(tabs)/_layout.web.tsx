import { Text } from 'react-native';
import { Redirect, Tabs } from 'expo-router';

import { useLocale } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import { tabDefs } from '@/lib/tabs';
import { C } from '@/lib/theme';

// Web fallback for the browser preview: native tabs are an iOS/Android
// component, so the web build uses JavaScript tabs with the same five
// doors — reversed in Arabic, like the native bar.
export default function TabsLayoutWeb() {
  const { L, ar } = useLocale();
  const { mode } = useStore();
  if (mode === 'signedOut') return <Redirect href="/welcome" />;

  const icon = (glyph: string) =>
    function TabGlyph({ focused }: { focused: boolean }) {
      return <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.55 }}>{glyph}</Text>;
    };
  const tabs = tabDefs(L);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.greenText,
        tabBarInactiveTintColor: C.muted,
        tabBarStyle: { backgroundColor: C.card, borderTopColor: C.border },
        sceneStyle: { backgroundColor: C.bg },
      }}
    >
      {(ar ? [...tabs].reverse() : tabs).map((t) => (
        <Tabs.Screen key={t.name} name={t.name} options={{ title: t.label, tabBarIcon: icon(t.glyph) }} />
      ))}
    </Tabs>
  );
}
