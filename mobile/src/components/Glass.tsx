// Liquid Glass (iOS 26): a surface that refracts what moves behind it and
// shimmers under the finger. Where the system has no Liquid Glass (older
// iOS, the browser preview) the same surface is a quiet solid fill.

import type { ReactNode } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';

export const HAS_GLASS = Platform.OS === 'ios' && isLiquidGlassAvailable();

export function Glass({
  children, style, tint, fallback, interactive = false, clear = false,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** a colour the glass is tinted with (e.g. the active state) */
  tint?: string;
  /** the solid background used where there is no glass */
  fallback: string;
  interactive?: boolean;
  clear?: boolean;
}) {
  if (!HAS_GLASS) return <View style={[{ backgroundColor: tint ?? fallback }, style]}>{children}</View>;
  return (
    <GlassView
      glassEffectStyle={clear ? 'clear' : 'regular'}
      colorScheme="dark"
      isInteractive={interactive}
      tintColor={tint}
      style={style}
    >
      {children}
    </GlassView>
  );
}
