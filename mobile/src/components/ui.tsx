// The app's building blocks. Every horizontal line and every text block
// reads the language's direction from useLocale(), so Arabic flows
// right-to-left everywhere without the native RTL switch. Everything you
// can touch answers with a spring and a tap of the Taptic Engine.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View,
  type PressableProps, type StyleProp, type TextStyle, type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { Icon, type SFSymbol } from '@/components/Icon';
import { haptic } from '@/lib/haptics';
import { useLocale } from '@/lib/i18n';
import { enter, layout as layoutSpring, PRESS } from '@/lib/motion';
import { C, radius } from '@/lib/theme';

export { Segmented } from '@/components/segmented';

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

/** A section heading led by an SF Symbol (the emoji stands in off iPhone). */
export function Heading({
  icon, emoji, color = C.greenText, children, style, size = 17, right,
}: { icon: SFSymbol; emoji?: string; color?: string; children: ReactNode; style?: StyleProp<TextStyle>; size?: number; right?: ReactNode }) {
  return (
    <Row gap={8}>
      <Icon sf={icon} emoji={emoji} size={size} color={color} />
      <T style={[{ fontSize: size, fontWeight: '700', flex: 1 }, style]} numberOfLines={2}>{children}</T>
      {right}
    </Row>
  );
}

/** A horizontal line of items in reading order. */
export function Row({ children, style, gap = 8, wrap = false }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number; wrap?: boolean }) {
  const { row } = useLocale();
  return <View style={[{ flexDirection: row, alignItems: 'center', gap, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>{children}</View>;
}

const APressable = Animated.createAnimatedComponent(Pressable);

export type PressProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** which tap the Taptic Engine gives; false for none */
  haptics?: keyof typeof haptic | false;
  /** how far the surface sinks under the finger */
  scaleTo?: number;
};

/** Anything tappable: sinks under the finger on a spring, taps back. */
export function Press({ children, onPress, onPressIn, onPressOut, style, haptics = 'tap', scaleTo = 0.97, disabled, ...rest }: PressProps) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <APressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => { scale.set(withSpring(scaleTo, PRESS)); onPressIn?.(e); }}
      onPressOut={(e) => { scale.set(withSpring(1, PRESS)); onPressOut?.(e); }}
      onPress={(e) => { if (haptics) haptic[haptics](); onPress?.(e); }}
      style={[style, anim]}
    >
      {children}
    </APressable>
  );
}

type Tone = 'plain' | 'hero' | 'green' | 'gold';
const toneStyle = (tone: Tone): ViewStyle =>
  tone === 'hero' ? { backgroundColor: C.heroFrom, borderColor: 'rgba(201,168,76,0.35)' }
  : tone === 'green' ? { backgroundColor: C.greenBg, borderColor: C.greenBorder }
  : tone === 'gold' ? { backgroundColor: C.goldBg, borderColor: 'rgba(201,168,76,0.5)' }
  : {};

/**
 * A card. `delay` (its place on the screen) makes it rise in on arrival,
 * staggered after the ones above it; `animateLayout` lets it grow and
 * shrink on a spring when what is inside it opens or folds.
 */
export function Card({
  children, style, tone = 'plain', delay, animateLayout,
}: { children: ReactNode; style?: StyleProp<ViewStyle>; tone?: Tone; delay?: number; animateLayout?: boolean }) {
  return (
    <Animated.View
      entering={delay !== undefined ? enter(delay) : undefined}
      layout={animateLayout ? layoutSpring : undefined}
      style={[s.card, toneStyle(tone), style]}
    >
      {children}
    </Animated.View>
  );
}

export function Stat({
  label, value, color = C.ink, sub, style,
}: { label: string; value: ReactNode; color?: string; sub?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[s.stat, style]}>
      <Muted style={{ fontSize: 11 }}>{label}</Muted>
      {typeof value === 'string'
        ? <T style={{ fontSize: 18, fontWeight: '800', color, marginTop: 2, fontVariant: ['tabular-nums'] }}>{value}</T>
        : value}
      {sub ? <Muted style={{ fontSize: 10, marginTop: 1 }}>{sub}</Muted> : null}
    </View>
  );
}

export function Button({
  label, onPress, kind = 'primary', disabled, style, small, icon, haptics = 'tap',
}: {
  label: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'gold' | 'ghost' | 'danger';
  disabled?: boolean; style?: StyleProp<ViewStyle>; small?: boolean; icon?: SFSymbol; haptics?: keyof typeof haptic | false;
}) {
  const { row } = useLocale();
  const bg = kind === 'primary' ? C.green : kind === 'gold' ? C.gold : kind === 'danger' ? C.redBg : 'transparent';
  const fg = kind === 'primary' ? '#FFFFFF' : kind === 'gold' ? '#2A1F05' : kind === 'danger' ? C.red : C.greenText;
  const border = kind === 'secondary' ? C.greenBorder : kind === 'danger' ? 'rgba(229,97,95,0.4)' : 'transparent';
  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      haptics={haptics}
      accessibilityRole="button"
      style={[
        {
          backgroundColor: bg, borderColor: border, borderWidth: 1, borderRadius: small ? radius.md : 14,
          paddingVertical: small ? 8 : 14, paddingHorizontal: small ? 12 : 18,
          flexDirection: row, alignItems: 'center', justifyContent: 'center', gap: 6, opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      {icon ? <Icon sf={icon} size={small ? 13 : 16} color={fg} /> : null}
      <Text style={{ color: fg, fontWeight: '700', fontSize: small ? 12 : 15 }}>{label}</Text>
    </Press>
  );
}

/** A round icon-only button (close, add, send). */
export function IconButton({
  icon, emoji, onPress, label, tint = C.ink2, bg = C.card2, size = 32, disabled,
}: { icon: SFSymbol; emoji?: string; onPress: () => void; label: string; tint?: string; bg?: string; size?: number; disabled?: boolean }) {
  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.9}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : 1 }}
    >
      <Icon sf={icon} emoji={emoji} size={size * 0.48} color={tint} weight="bold" />
    </Press>
  );
}

/** A tappable chip; `on` fills it. */
export function Chip({ label, on, color = C.green, onPress }: { label: string; on: boolean; color?: string; onPress: () => void }) {
  return (
    <Press
      onPress={onPress}
      haptics="select"
      scaleTo={0.94}
      style={{ borderRadius: 999, borderWidth: 1, borderColor: on ? color : C.border, backgroundColor: on ? color : 'transparent', paddingHorizontal: 11, paddingVertical: 6 }}
    >
      <Text style={{ fontSize: 11, fontWeight: '600', color: on ? '#FFFFFF' : C.muted }}>{label}</Text>
    </Press>
  );
}

export function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.border, marginVertical: 14 }} />;
}

/**
 * A number that rolls to its value — from zero when it first appears,
 * from the old value when it changes. Reduce Motion shows it at once.
 */
export function useCountUp(target: number, ms = 750) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? target : 0);
  const current = useRef(reduce ? target : 0);
  useEffect(() => {
    const from = current.current;
    if (from === target) return;
    let raf = 0;
    const t0 = Date.now();
    const dur = reduce ? 0 : ms;
    const step = () => {
      const p = dur === 0 ? 1 : Math.min(1, (Date.now() - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = p === 1 ? target : from + (target - from) * eased;
      current.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, reduce, ms]);
  return shown;
}

export function CountUp({ value, format, style }: { value: number; format: (n: number) => string; style?: StyleProp<TextStyle> }) {
  const shown = useCountUp(value);
  return <T style={[{ fontVariant: ['tabular-nums'] }, style]}>{format(Math.round(shown))}</T>;
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    borderRadius: 20,
    borderCurve: 'continuous',
    padding: 16,
  },
  stat: {
    flex: 1,
    minWidth: 96,
    backgroundColor: C.card2,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
