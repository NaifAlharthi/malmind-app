import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';

import { useLocale } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import { C } from '@/lib/theme';
import { tabDefs } from '@/lib/tabs';

// The five doors, as the system's own tab bar (SF Symbols on iPhone).
// Same rooms as the website's top bar: Home, Log, Today, the Brain, and the
// Toolbox. Expo Go can't flip native layout to RTL, so in Arabic the tabs
// are listed in reverse — Home sits at the right edge, where an Arabic
// reader starts. A web fallback lives in _layout.web.tsx.
export default function TabsLayout() {
  const { L, ar } = useLocale();
  const { mode } = useStore();
  if (mode === 'signedOut') return <Redirect href="/welcome" />;

  const tabs = tabDefs(L);
  return (
    <NativeTabs tintColor={C.greenText} labelStyle={{ color: C.muted }} backgroundColor={C.bg}>
      {(ar ? [...tabs].reverse() : tabs).map((t) => (
        <NativeTabs.Trigger key={t.name} name={t.name}>
          <NativeTabs.Trigger.Label>{t.label}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={t.sf} md={t.md} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
