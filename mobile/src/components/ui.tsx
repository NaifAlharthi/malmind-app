// The app's building blocks. Every horizontal line and every text block
// reads the language's direction from useLocale(), so Arabic flows
// right-to-left everywhere without the native RTL switch.

import type { ReactNode } from 'react';
import {
  ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View,
  type StyleProp, type TextStyle, type ViewStyle,
} from 'react-native';

import { useLocale } from '@/lib/i18n';
import { C, radius } from '@/lib/theme';

export function Screen({
  children, onRefresh, refreshing = false,
}: { children: ReactNode; onRefresh?: () => void; refreshing?: boolean }) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={s.screen}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.greenText} /> : undefined}
    >
      {children}
    </ScrollView>
  );
}

export function Loading() {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={C.greenText} />
    </View>
  );
}

type TProps = { children: ReactNode; style?: StyleProp<TextStyle>; numberOfLines?: number; center?: boolean };

// A figure like "-1,500", "12k", "▲ 14" or "24%": in right-to-left text the
// minus sign would jump to the end, so figures always set left-to-right.
const FIGURE = /^[\s\-+−▲▼%\d.,/kM]+$/;

/** Text aligned to the reading edge (right in Arabic). */
export function T({ children, style, numberOfLines, center }: TProps) {
  const { start, ar } = useLocale();
  const figure = (typeof children === 'string' || typeof children === 'number') && FIGURE.test(String(children));
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[{ color: C.ink, fontSize: 14, textAlign: center ? 'center' : start, writingDirection: ar && !figure ? 'rtl' : 'ltr' }, style]}
    >
      {children}
    </Text>
  );
}

export const Title = (p: TProps) => <T {...p} style={[{ fontSize: 28, fontWeight: '800' }, p.style]} />;
export const H2 = (p: TProps) => <T {...p} style={[{ fontSize: 17, fontWeight: '700' }, p.style]} />;
export const Muted = (p: TProps) => <T {...p} style={[{ color: C.muted, fontSize: 12, lineHeight: 18 }, p.style]} />;
export const Eyebrow = (p: TProps) => (
  <T {...p} style={[{ color: C.gold, fontSize: 11, fontWeight: '700', letterSpacing: 1 }, p.style]} />
);

/** A horizontal line of items in reading order. */
export function Row({ children, style, gap = 8, wrap = false }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number; wrap?: boolean }) {
  const { row } = useLocale();
  return <View style={[{ flexDirection: row, alignItems: 'center', gap, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>{children}</View>;
}

export function Card({ children, style, tone = 'plain' }: { children: ReactNode; style?: StyleProp<ViewStyle>; tone?: 'plain' | 'hero' | 'green' | 'gold' }) {
  const toneStyle: ViewStyle =
    tone === 'hero' ? { backgroundColor: C.heroFrom, borderColor: 'rgba(201,168,76,0.35)' }
    : tone === 'green' ? { backgroundColor: C.greenBg, borderColor: C.greenBorder }
    : tone === 'gold' ? { backgroundColor: C.goldBg, borderColor: 'rgba(201,168,76,0.5)' }
    : {};
  return <View style={[s.card, toneStyle, style]}>{children}</View>;
}

export function Stat({
  label, value, color = C.ink, sub, style,
}: { label: string; value: string; color?: string; sub?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[s.stat, style]}>
      <Muted style={{ fontSize: 11 }}>{label}</Muted>
      <T style={{ fontSize: 18, fontWeight: '800', color, marginTop: 2 }}>{value}</T>
      {sub ? <Muted style={{ fontSize: 10, marginTop: 1 }}>{sub}</Muted> : null}
    </View>
  );
}

export function Button({
  label, onPress, kind = 'primary', disabled, style, small,
}: { label: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'gold' | 'ghost' | 'danger'; disabled?: boolean; style?: StyleProp<ViewStyle>; small?: boolean }) {
  const bg = kind === 'primary' ? C.green : kind === 'gold' ? C.gold : kind === 'danger' ? C.redBg : 'transparent';
  const fg = kind === 'primary' ? '#FFFFFF' : kind === 'gold' ? '#2A1F05' : kind === 'danger' ? C.red : C.greenText;
  const border = kind === 'secondary' ? C.greenBorder : kind === 'danger' ? 'rgba(229,97,95,0.4)' : 'transparent';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        { backgroundColor: bg, borderColor: border, borderWidth: 1, borderRadius: radius.md, paddingVertical: small ? 8 : 13, paddingHorizontal: small ? 12 : 18, alignItems: 'center', opacity: disabled ? 0.45 : pressed ? 0.75 : 1 },
        style,
      ]}
    >
      <Text style={{ color: fg, fontWeight: '700', fontSize: small ? 12 : 15 }}>{label}</Text>
    </Pressable>
  );
}

/** A segmented switch (language, chart range, …). */
export function Segmented<K extends string>({
  options, value, onChange,
}: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  return (
    <Row gap={0} style={{ borderWidth: 1, borderColor: C.border, borderRadius: radius.sm, overflow: 'hidden', alignSelf: 'flex-start' }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} onPress={() => onChange(o.key)} style={{ paddingHorizontal: 12, paddingVertical: 7, backgroundColor: on ? C.ink : 'transparent' }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: on ? C.bg : C.ink2 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </Row>
  );
}

/** A tappable chip; `on` fills it. */
export function Chip({ label, on, color = C.green, onPress }: { label: string; on: boolean; color?: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ borderRadius: 999, borderWidth: 1, borderColor: on ? color : C.border, backgroundColor: on ? color : 'transparent', paddingHorizontal: 11, paddingVertical: 6 }}
    >
      <Text style={{ fontSize: 11, fontWeight: '600', color: on ? '#FFFFFF' : C.muted }}>{label}</Text>
    </Pressable>
  );
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: C.borderFaint, marginVertical: 14 }} />;
}

const s = StyleSheet.create({
  screen: {
    padding: 16,
    gap: 14,
    paddingTop: Platform.OS === 'web' ? 24 : 8,
    paddingBottom: Platform.OS === 'web' ? 96 : 32,
  },
  card: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: radius.lg,
    padding: 16,
  },
  stat: {
    flex: 1,
    minWidth: 96,
    backgroundColor: C.card2,
    borderWidth: 1,
    borderColor: C.borderFaint,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
