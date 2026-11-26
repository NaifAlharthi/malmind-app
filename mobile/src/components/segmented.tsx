// The segmented switch where there is no SwiftUI (the browser preview,
// Android): a drawn twin of the iOS control. iPhone uses segmented.ios.tsx.

import { Pressable, Text, View } from 'react-native';

import { haptic } from '@/lib/haptics';
import { useLocale } from '@/lib/i18n';
import { C, radius } from '@/lib/theme';

export function Segmented<K extends string>({
  options, value, onChange,
}: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  const { row, ar } = useLocale();
  return (
    <View
      style={{
        flexDirection: row, alignSelf: ar ? 'flex-end' : 'flex-start', padding: 2, gap: 2,
        backgroundColor: C.card2, borderRadius: radius.sm, borderWidth: 1, borderColor: C.borderFaint,
      }}
    >
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => { if (!on) { haptic.select(); onChange(o.key); } }}
            style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.sm - 2, backgroundColor: on ? C.border : 'transparent' }}
          >
            <Text style={{ fontSize: 12, fontWeight: on ? '700' : '500', color: on ? C.ink : C.ink2 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
