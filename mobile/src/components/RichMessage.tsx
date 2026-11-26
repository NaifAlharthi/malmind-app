// The Brain's replies, rendered rich — the same format the website's
// advisor renders: ```chart fences become charts, [label](/path) links
// become tappable chips (a native screen when there is one, malmind.ai
// otherwise). Malformed pieces fall back to plain text.

import { Text, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { BarChart, LineChart } from '@/components/charts';
import { Muted } from '@/components/ui';
import { useLocale } from '@/lib/i18n';
import { isNative, openPath } from '@/lib/links';
import { C } from '@/lib/theme';

// the reply arrives a block at a time, as if being written
const reveal = (i: number) => FadeIn.delay(120 + Math.min(i, 8) * 140).duration(320).reduceMotion(ReduceMotion.System);

interface Spec { type: 'bar' | 'line' | 'pie'; title?: string; data: { label: string; value: number }[] }

function parseChart(raw: string): Spec | null {
  try {
    const s = JSON.parse(raw.trim());
    if (!s || !['bar', 'line', 'pie'].includes(s.type) || !Array.isArray(s.data)) return null;
    const data = s.data
      .map((d: { label: unknown; value: unknown }) => ({ label: String(d.label), value: Number(d.value) }))
      .filter((d: { value: number }) => Number.isFinite(d.value))
      .slice(0, 14);
    return data.length ? { type: s.type, title: typeof s.title === 'string' ? s.title : undefined, data } : null;
  } catch {
    return null;
  }
}

function RichText({ text }: { text: string }) {
  const { start, ar } = useLocale();
  const parts: React.ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const [, label, href] = m;
    if (href.startsWith('/')) {
      parts.push(
        <Text key={k++} onPress={() => openPath(href)} style={{ color: C.greenText, fontWeight: '700', backgroundColor: C.greenBg }}>
          {` ${label} ${isNative(href) ? '›' : '↗'} `}
        </Text>,
      );
    } else {
      parts.push(label);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return (
    <Text style={{ color: C.ink2, fontSize: 14, lineHeight: 22, textAlign: start, writingDirection: ar ? 'rtl' : 'ltr' }}>
      {parts}
    </Text>
  );
}

export default function RichMessage({ content }: { content: string }) {
  // charts, and each paragraph of prose, are blocks that arrive in turn
  const blocks: { chart: boolean; text: string }[] = [];
  content.split(/```chart\s*([\s\S]*?)```/g).forEach((seg, k) => {
    if (k % 2 === 1) blocks.push({ chart: true, text: seg });
    else for (const p of seg.split(/\n{2,}/)) blocks.push({ chart: false, text: p });
  });
  return (
    <View style={{ gap: 8 }}>
      {blocks.map(({ chart, text: seg }, i) => {
        if (chart) {
          const spec = parseChart(seg);
          if (!spec) return <Muted key={i}>{seg.trim()}</Muted>;
          return (
            <Animated.View key={i} entering={reveal(i)} style={{ backgroundColor: C.card2, borderRadius: 14, borderCurve: 'continuous', padding: 10, gap: 4 }}>
              {spec.title ? <Muted style={{ fontWeight: '700' }}>{spec.title}</Muted> : null}
              {spec.type === 'line'
                ? <LineChart labels={spec.data.map((d) => d.label)} series={[{ key: 's', data: spec.data.map((d) => d.value), color: C.greenText, strong: true }]} height={140} />
                : <BarChart labels={spec.data.map((d) => d.label)} values={spec.data.map((d) => d.value)} height={140} color={(v) => (v < 0 ? C.red : C.green)} />}
            </Animated.View>
          );
        }
        const trimmed = seg.trim();
        return trimmed ? <Animated.View key={i} entering={reveal(i)}><RichText text={trimmed} /></Animated.View> : null;
      })}
    </View>
  );
}
