// Small, dependency-light charts drawn with react-native-svg (bundled in
// Expo Go). Time flows in reading direction: right-to-left in Arabic, like
// the website's charts. Width comes from the container via onLayout.
// On the phone they draw themselves in: lines trace from the oldest month
// to the newest, bars rise from zero, meters fill — and Reduce Motion
// shows them finished.

import { useEffect, useState } from 'react';
import { Platform, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing, ReduceMotion, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { compact } from '@/lib/finance';
import { useLocale } from '@/lib/i18n';
import { C } from '@/lib/theme';

const PAD = { top: 8, bottom: 20, side: 38 };

// SVG prop animation runs on the phone; the browser preview draws at once
const ANIMATE = Platform.OS !== 'web';
const DRAW = { duration: 900, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System };

const APath = Animated.createAnimatedComponent(Path);
const ACircle = Animated.createAnimatedComponent(Circle);
const ARect = Animated.createAnimatedComponent(Rect);

/** 0 → 1 once, when the chart piece mounts */
function useDrawIn(delay = 0) {
  const p = useSharedValue(ANIMATE ? 0 : 1);
  useEffect(() => {
    if (ANIMATE) p.set(withDelay(delay, withTiming(1, DRAW)));
  }, [p, delay]);
  return p;
}

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

/** a line that traces itself from its first point to its last */
function TracedLine({ pts, color, strong }: { pts: [number, number][]; color: string; strong?: boolean }) {
  const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  len = Math.ceil(len) + 2;
  const p = useDrawIn();
  const lineProps = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - p.get()) }));
  const dotProps = useAnimatedProps(() => ({ opacity: Math.max(0, (p.get() - 0.7) / 0.3) }));
  return (
    <>
      <APath
        d={d} fill="none" stroke={color} strokeWidth={strong ? 2.6 : 1.8} strokeLinejoin="round" strokeLinecap="round"
        strokeDasharray={ANIMATE ? [len, len] : undefined}
        animatedProps={ANIMATE ? lineProps : undefined}
      />
      {pts.length <= 14 && pts.map(([x, y], i) => (
        <ACircle key={i} cx={x} cy={y} r={2.4} fill={color} animatedProps={ANIMATE ? dotProps : undefined} />
      ))}
    </>
  );
}

/** a bar that grows from the zero line toward its value, up or down */
function RisingBar({ x, top, h, base, w, fill, i }: { x: number; top: number; h: number; base: number; w: number; fill: string; i: number }) {
  const p = useDrawIn(Math.min(i, 14) * 35);
  const props = useAnimatedProps(() => {
    const k = p.get();
    return { y: top < base ? base - (base - top) * k : top, height: Math.max(0.5, h * k) };
  });
  return <ARect x={x} y={top} width={w} height={h} rx={3} fill={fill} animatedProps={ANIMATE ? props : undefined} />;
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
          {series.map((s) => (s.data.length === 0 ? null : (
            // keyed by its values, so a changed or re-enabled line draws in again
            <TracedLine key={`${s.key}:${s.data.join(',')}:${w}:${min}:${max}`} pts={s.data.map((v, i) => [x(i), y(v)])} color={s.color} strong={s.strong} />
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
            return <RisingBar key={`${i}:${v}:${w}:${min}:${max}`} i={i} x={xAt(i) - barW / 2} top={top} h={h} base={y(0)} w={barW} fill={color ? color(v, i) : C.green} />;
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

/** A thin horizontal meter that eases in to `value` of `max`. */
export function Meter({ value, max, color = C.green, height = 6 }: { value: number; max: number; color?: string; height?: number }) {
  const { row } = useLocale();
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const fill = useSharedValue(ANIMATE ? 0 : pct);
  useEffect(() => {
    fill.set(withDelay(120, withTiming(pct, { ...DRAW, duration: 800 })));
  }, [fill, pct]);
  const anim = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));
  return (
    <View style={{ height, borderRadius: height, backgroundColor: C.borderFaint, overflow: 'hidden', flexDirection: row }}>
      <Animated.View style={[{ backgroundColor: color, borderRadius: height }, anim]} />
    </View>
  );
}
