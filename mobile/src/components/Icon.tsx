// SF Symbols on iPhone — the system's own icon set, weighted to sit with
// the text beside it, and animatable (bounce, pulse). Elsewhere (the
// browser preview, Android) the emoji fallback stands in.

import { Platform, Text } from 'react-native';
import { SymbolView, type AnimationSpec, type SFSymbol, type SymbolWeight } from 'expo-symbols';

import { C } from '@/lib/theme';

export type { SFSymbol };

export function Icon({
  sf, emoji, size = 18, color = C.greenText, weight = 'semibold', animation, multicolor,
}: {
  sf: SFSymbol;
  emoji?: string;
  size?: number;
  color?: string;
  weight?: SymbolWeight;
  animation?: AnimationSpec;
  multicolor?: boolean;
}) {
  const fallback = emoji ? <Text style={{ fontSize: size * 0.95, lineHeight: size * 1.2 }}>{emoji}</Text> : null;
  if (Platform.OS !== 'ios') return fallback;
  return (
    <SymbolView
      name={sf}
      size={size}
      tintColor={color}
      weight={weight}
      type={multicolor ? 'multicolor' : 'hierarchical'}
      animationSpec={animation}
      fallback={fallback}
    />
  );
}
