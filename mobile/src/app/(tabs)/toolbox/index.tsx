import { View } from 'react-native';
import { Link } from 'expo-router';
import Animated from 'react-native-reanimated';

import { Icon, type SFSymbol } from '@/components/Icon';
import { Heading, Muted, Press, Row, Screen, T } from '@/components/ui';
import { TOOLS, type ViewKey } from '@shared/toolbox';
import { useLocale } from '@/lib/i18n';
import { isNative, openPath, toolScreen } from '@/lib/links';
import { enter } from '@/lib/motion';
import { C, radius } from '@/lib/theme';

type Tool = (typeof TOOLS)[ViewKey][number];

// Every tool in the product, from the website's own registry — so the
// list, names and descriptions never drift between surfaces. Tools with a
// native screen zoom open in the app; the rest open on malmind.ai.
export default function Toolbox() {
  const { L, t, row } = useLocale();
  const total = (Object.keys(TOOLS) as ViewKey[]).reduce((a, k) => a + TOOLS[k].length, 0);
  const VIEWS: { key: ViewKey; sf: SFSymbol; emoji: string; name: string }[] = [
    { key: 'past', sf: 'clock.arrow.circlepath', emoji: '🕰', name: L('الماضي', 'The Past') },
    { key: 'today', sf: 'sun.max.fill', emoji: '☀', name: L('اليوم', 'Today') },
    { key: 'future', sf: 'binoculars.fill', emoji: '🔭', name: L('المستقبل', 'The Future') },
  ];

  const tile = (tool: Tool, native: boolean) => (
    <View style={{ gap: 4 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T style={{ fontSize: 22 }}>{tool.icon}</T>
        <Row gap={3}>
          <Muted style={{ fontSize: 10 }}>{`D${tool.depth ?? 1}`}</Muted>
          <Icon sf={native ? 'iphone' : 'safari'} emoji={native ? '›' : '↗'} size={11} color={native ? C.greenText : C.muted} />
        </Row>
      </Row>
      <T style={{ fontSize: 13, fontWeight: '700' }} numberOfLines={2}>{t(tool.titleKey)}</T>
      <Muted style={{ fontSize: 10, lineHeight: 14 }} numberOfLines={3}>{t(tool.descKey)}</Muted>
    </View>
  );

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row gap={4} style={{ flex: 1 }}>
          <Icon sf="iphone" emoji="›" size={11} />
          <Muted style={{ flexShrink: 1 }}>{L('تفتح هنا', 'opens here')}</Muted>
          <T style={{ color: C.muted }}> · </T>
          <Icon sf="safari" emoji="↗" size={11} color={C.muted} />
          <Muted style={{ flexShrink: 1 }}>malmind.ai</Muted>
        </Row>
        <View style={{ backgroundColor: C.goldBg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
          <T style={{ color: C.goldText, fontSize: 12, fontWeight: '700' }}>{L(`${total} أداة`, `${total} tools`)}</T>
        </View>
      </Row>

      {VIEWS.map((v, vi) => (
        <View key={v.key} style={{ gap: 10 }}>
          <Heading icon={v.sf} emoji={v.emoji} color={C.gold}>{v.name}</Heading>
          <View style={{ flexDirection: row, flexWrap: 'wrap', gap: 8 }}>
            {TOOLS[v.key].map((tool, i) => {
              const native = isNative(tool.href);
              const screen = toolScreen(tool.href);
              const box = {
                padding: 12, minHeight: 108, borderRadius: radius.lg, borderCurve: 'continuous' as const, borderWidth: 1,
                borderColor: native ? C.greenBorder : C.borderFaint, backgroundColor: native ? C.greenBg : C.card,
              };
              return (
                <Animated.View key={`${v.key}${tool.href}`} entering={enter(vi * 2 + Math.min(i, 6))} style={{ width: '48%', flexGrow: 1 }}>
                  {screen ? (
                    // a native tool zooms open from its tile (iOS 18+)
                    <Link href={screen} asChild>
                      <Link.AppleZoom>
                        <Press style={box}>{tile(tool, true)}</Press>
                      </Link.AppleZoom>
                    </Link>
                  ) : (
                    <Press style={box} onPress={() => openPath(tool.href)}>{tile(tool, native)}</Press>
                  )}
                </Animated.View>
              );
            })}
          </View>
        </View>
      ))}
    </Screen>
  );
}
