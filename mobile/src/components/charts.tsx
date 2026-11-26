// Small, dependency-light charts drawn with react-native-svg (bundled in
// Expo Go). Time flows in reading direction: right-to-left in Arabic, like
// the website's charts. Width comes from the container via onLayout.

import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { compact } from '@/lib/finance';
import { useLocale } from '@/lib/i18n';
import { C } from '@/lib/theme';

const PAD = { top: 8, bottom: 20, side: 38 };

function useWidth(): [number, (e: LayoutChangeEvent) => void] {
  const [w, setW] = useState(0);
  return [w, (e) => setW(Math.round(e.nativeEvent.layout.width))];
}

function scale(values: number[], height: number) {
  let min = Math.min(0, ...values);
  let max = Math.max(0, ...values);
  if (min === max) { max = min + 1; }
  const span = max - min;
  // breathing room — but zero stays the floor for all-positive data
  if (min < 0) min -= span * 0.04;
  max += span * 0.06;
  const plotH = height - PAD.top - PAD.bottom;
  return { min, max, y: (v: number) => PAD.top + (1 - (v - min) / (max - min)) * plotH };
}

export interface Series { key: string; data: number[]; color: string; strong?: boolean }

export function LineChart({ labels, series, height = 170 }: { labels: string[]; series: Series[]; height?: number }) {
  const { ar } = useLocale();
  const [w, onLayout] = useWidth();
  const n = labels.length;
  const all = series.flatMap((s) => s.data);
  const { y, min, max } = scale(all.length ? all : [0], height);
  const plotL = ar ? 6 : PAD.side;
  const plotR = ar ? w - PAD.side : w - 6;
  const x = (i: number) => {
    const t = n <= 1 ? 0.5 : i / (n - 1);
    return ar ? plotR - t * (plotR - plotL) : plotL + t * (plotR - plotL);
  };
  const ticks = [max, (max + min) / 2, min].map((v) => Math.round(v));
  return (
    <View onLayout={onLayout} style={{ height }}>
      {w > 0 && (
        <Svg width={w} height={height}>
          {ticks.map((t, i) => (
            <Line key={`g${i}`} x1={plotL} x2={plotR} y1={y(t)} y2={y(t)} stroke={C.borderFaint} strokeWidth={1} />
          ))}
          {min < 0 && max > 0 && <Line x1={plotL} x2={plotR} y1={y(0)} y2={y(0)} stroke={C.border} strokeDasharray="3 3" />}
          {ticks.map((t, i) => (
            <SvgText key={`t${i}`} x={ar ? w - 2 : 2} y={y(t) + 3} fontSize={9} fill={C.muted} textAnchor={ar ? 'end' : 'start'}>
              {compact(t)}
            </SvgText>
          ))}
          {series.map((s) => {
            if (s.data.length === 0) return null;
            const d = s.data.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
            return (
              <Path key={s.key} d={d} fill="none" stroke={s.color} strokeWidth={s.strong ? 2.6 : 1.8} strokeLinejoin="round" strokeLinecap="round" />
            );
          })}
          {n <= 14 && series.map((s) => s.data.map((v, i) => (
            <Circle key={`${s.key}${i}`} cx={x(i)} cy={y(v)} r={2.4} fill={s.color} />
          )))}
          {n > 0 && [0, n - 1].filter((i, k, arr) => arr.indexOf(i) === k).map((i) => (
            <SvgText key={`x${i}`} x={x(i)} y={height - 5} fontSize={9} fill={C.muted} textAnchor={i === 0 ? (ar ? 'end' : 'start') : (ar ? 'start' : 'end')}>
              {labels[i]}
            </SvgText>
          ))}
        </Svg>
      )}
    </View>
  );
}

export function BarChart({
  labels, values, height = 150, color, refLine,
}: { labels: string[]; values: number[]; height?: number; color?: (v: number, i: number) => string; refLine?: number }) {
  const { ar } = useLocale();
  const [w, onLayout] = useWidth();
  const n = values.length;
  const { y, min, max } = scale(values.length ? values : [0], height);
  const plotL = ar ? 4 : PAD.side;
  const plotR = ar ? w - PAD.side : w - 4;
  const slot = n > 0 ? (plotR - plotL) / n : 0;
  const barW = Math.max(4, slot * 0.62);
  const xAt = (i: number) => (ar ? plotR - (i + 0.5) * slot : plotL + (i + 0.5) * slot);
  const ticks = [max, min < 0 ? 0 : (max + min) / 2, min].map((v) => Math.round(v));
  return (
    <View onLayout={onLayout} style={{ height }}>
      {w > 0 && (
        <Svg width={w} height={height}>
          {ticks.map((t, i) => (
            <Line key={`g${i}`} x1={plotL} x2={plotR} y1={y(t)} y2={y(t)} stroke={C.borderFaint} strokeWidth={1} />
          ))}
          {ticks.map((t, i) => (
            <SvgText key={`t${i}`} x={ar ? w - 2 : 2} y={y(t) + 3} fontSize={9} fill={C.muted} textAnchor={ar ? 'end' : 'start'}>
              {compact(t)}
            </SvgText>
          ))}
          {values.map((v, i) => {
            const top = Math.min(y(v), y(0));
            const h = Math.max(1.5, Math.abs(y(v) - y(0)));
            return <Rect key={i} x={xAt(i) - barW / 2} y={top} width={barW} height={h} rx={3} fill={color ? color(v, i) : C.green} />;
          })}
          {refLine !== undefined && (
            <Line x1={plotL} x2={plotR} y1={y(refLine)} y2={y(refLine)} stroke={C.gold} strokeDasharray="4 3" strokeWidth={1.2} />
          )}
          {n > 0 && [0, n - 1].filter((i, k, arr) => arr.indexOf(i) === k).map((i) => (
            <SvgText key={`x${i}`} x={xAt(i)} y={height - 5} fontSize={9} fill={C.muted} textAnchor="middle">
              {labels[i]}
            </SvgText>
          ))}
        </Svg>
      )}
    </View>
  );
}

/** A thin horizontal meter, filled to `value` of `max`. */
export function Meter({ value, max, color = C.green, height = 6 }: { value: number; max: number; color?: string; height?: number }) {
  const { row } = useLocale();
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <View style={{ height, borderRadius: height, backgroundColor: C.borderFaint, overflow: 'hidden', flexDirection: row }}>
      <View style={{ width: `${pct * 100}%`, backgroundColor: color, borderRadius: height }} />
    </View>
  );
}
