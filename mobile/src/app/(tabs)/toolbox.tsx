import { Pressable, View } from 'react-native';

import { Eyebrow, H2, Muted, Row, Screen, T, Title } from '@/components/ui';
import { TOOLS, type ViewKey } from '@shared/toolbox';
import { useLocale } from '@/lib/i18n';
import { isNative, openPath } from '@/lib/links';
import { C, radius } from '@/lib/theme';

// Every tool in the product, from the website's own registry — so the
// list, names and descriptions never drift between surfaces. Tools with a
// native screen open in the app; the rest open on malmind.ai.
export default function Toolbox() {
  const { L, t, row } = useLocale();
  const total = (Object.keys(TOOLS) as ViewKey[]).reduce((a, k) => a + TOOLS[k].length, 0);
  const VIEWS: { key: ViewKey; icon: string; name: string }[] = [
    { key: 'past', icon: '🕰', name: L('الماضي', 'The Past') },
    { key: 'today', icon: '☀', name: L('اليوم', 'Today') },
    { key: 'future', icon: '🔭', name: L('المستقبل', 'The Future') },
  ];
  return (
    <Screen>
      <Eyebrow>{L('صندوق الأدوات', 'THE TOOLBOX')}</Eyebrow>
      <Row style={{ justifyContent: 'space-between' }}>
        <Title>🧰 {L('الأدوات', 'Tools')}</Title>
        <View style={{ backgroundColor: C.goldBg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
          <T style={{ color: C.goldText, fontSize: 12, fontWeight: '700' }}>{L(`${total} أداة`, `${total} tools`)}</T>
        </View>
      </Row>
      <Muted>{L('› تفتح هنا في التطبيق · ↗ تفتح على malmind.ai', '› opens here in the app · ↗ opens on malmind.ai')}</Muted>

      {VIEWS.map((v) => (
        <View key={v.key} style={{ gap: 8 }}>
          <H2>{v.icon} {v.name}</H2>
          <View style={{ flexDirection: row, flexWrap: 'wrap', gap: 8 }}>
            {TOOLS[v.key].map((tool) => {
              const native = isNative(tool.href);
              return (
                <Pressable
                  key={`${v.key}${tool.href}`}
                  onPress={() => openPath(tool.href)}
                  style={({ pressed }) => ({
                    width: '48%', flexGrow: 1, minHeight: 104, padding: 12, gap: 4, borderRadius: radius.md, borderWidth: 1,
                    borderColor: native ? C.greenBorder : C.border, backgroundColor: native ? C.greenBg : C.card, opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Row style={{ justifyContent: 'space-between' }}>
                    <T style={{ fontSize: 20 }}>{tool.icon}</T>
                    <Muted style={{ fontSize: 10 }}>D{tool.depth ?? 1} {native ? '›' : '↗'}</Muted>
                  </Row>
                  <T style={{ fontSize: 13, fontWeight: '700' }} numberOfLines={2}>{t(tool.titleKey)}</T>
                  <Muted style={{ fontSize: 10, lineHeight: 14 }} numberOfLines={3}>{t(tool.descKey)}</Muted>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </Screen>
  );
}
