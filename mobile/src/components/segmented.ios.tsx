// On iPhone the segmented switch is the system's own (SwiftUI Picker in its
// segmented style) — the same control as in Settings, laid out right-to-left
// in Arabic. The JavaScript twin for other platforms is segmented.tsx.

import { Host, Picker, Text } from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';

import { haptic } from '@/lib/haptics';
import { useLocale } from '@/lib/i18n';

export function Segmented<K extends string>({
  options, value, onChange,
}: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  const { ar } = useLocale();
  return (
    <Host
      matchContents
      colorScheme="dark"
      layoutDirection={ar ? 'rightToLeft' : 'leftToRight'}
      style={{ alignSelf: ar ? 'flex-end' : 'flex-start' }}
    >
      <Picker<string>
        selection={value}
        onSelectionChange={(k) => { haptic.select(); onChange(k as K); }}
        modifiers={[pickerStyle('segmented')]}
      >
        {options.map((o) => (
          <Text key={o.key} modifiers={[tag(o.key)]}>{o.label}</Text>
        ))}
      </Picker>
    </Host>
  );
}
