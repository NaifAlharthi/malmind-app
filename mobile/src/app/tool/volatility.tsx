import { useState } from 'react';
import { View } from 'react-native';

import { BarChart, LineChart, Meter } from '@/components/charts';
import { Button, Card, H2, Muted, Row, Screen, Stat, T } from '@/components/ui';
import { BAND_META, DIM_META, computeVolatility } from '@shared/volatility';
import { fmt } from '@/lib/finance';
import { useLocale } from '@/lib/i18n';
import { openPath } from '@/lib/links';
import { useStore } from '@/lib/store';
import { C } from '@/lib/theme';

const pct1 = (f: number) => `${Math.round(f * 1000) / 10}%`;
const WEIGHT: Record<string, number> = { surplus: 0.3, spending: 0.2, income: 0.2, invested: 0.2, networth: 0.1 };

// Volatility — how much a financial life shakes, from the website's own
// volatility module: the calm score, the seismograph, the five seas, and
// what the shaking costs.
export default function Volatility() {
  const { L, ar } = useLocale();
  const { data } = useStore();
  const r = computeVolatility(data.snaps);
  const [calmBy, setCalmBy] = useState(30);

  if (!r) {
    return (
      <Screen>
        <Card style={{ gap: 10 }}>
          <H2>🌊 {L('التقلّب', 'Volatility')}</H2>
          <Muted>{L('يحتاج قياس التقلّب أربعة أشهر مسجّلة على الأقل.', 'Measuring volatility needs at least four logged months.')}</Muted>
          <Button label={L('افتح السِّجل', 'Open the Log')} onPress={() => openPath('/log')} />
        </Card>
      </Screen>
    );
  }

  const band = BAND_META[r.band];
  const f = 1 - calmBy / 100;
  const newScore = Math.round(100 * (1 - r.dims.reduce((a, d) => a + WEIGHT[d.key] * Math.min(1, d.roughness * f), 0)));
  const newBand = BAND_META[newScore >= 80 ? 'mirror' : newScore >= 60 ? 'sailing' : newScore >= 40 ? 'choppy' : 'storm'];

  return (
    <Screen>
      <Card tone="hero" style={{ gap: 8 }}>
        <Row gap={16}>
          <View style={{ alignItems: 'center' }}>
            <T center style={{ fontSize: 44, fontWeight: '800' }}>{r.calmScore}</T>
            <Muted center style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10 }}>{L('درجة الهدوء / ١٠٠', 'calm score / 100')}</Muted>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <T style={{ fontSize: 18, fontWeight: '800' }}>{band.icon} {ar ? band.ar : band.en}</T>
            <Muted style={{ color: 'rgba(255,255,255,0.75)' }}>{ar ? band.arLine : band.enLine}</Muted>
          </View>
        </Row>
        <Muted style={{ color: 'rgba(255,255,255,0.55)' }}>
          {L(`من ${r.months} شهراً — أعلى مصادر الموج: ${DIM_META[r.noisiest.key].icon} ${DIM_META[r.noisiest.key].ar}`, `From ${r.months} months — the biggest wave source: ${DIM_META[r.noisiest.key].icon} ${DIM_META[r.noisiest.key].en}`)}
        </Muted>
      </Card>

      <Card style={{ gap: 8 }}>
        <H2>📈 {L('رسّام الزلازل — ارتجاف فائضك', 'The seismograph — your surplus, trembling')}</H2>
        <Muted>{L('كل عمود = انحراف فائض ذلك الشهر عن متوسطك، كنسبة من دخلك. الخط المستقيم حياةٌ هادئة.', "Each needle = that month's surplus deviation from your average, as % of income. A flat line is a calm life.")}</Muted>
        <BarChart labels={r.seismo.map((p) => p.label)} values={r.seismo.map((p) => p.value)} color={(v) => (v >= 0 ? C.green : C.red)} />
      </Card>

      <Card style={{ gap: 10 }}>
        <H2>🧭 {L('خمسة بحار — بحرٌ لكل بُعد', 'Five seas — one per dimension')}</H2>
        {r.dims.map((d) => {
          const b = d.roughness < 0.25 ? 'mirror' : d.roughness < 0.5 ? 'sailing' : d.roughness < 0.75 ? 'choppy' : 'storm';
          return (
            <View key={d.key} style={{ gap: 4 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T style={{ fontSize: 13 }}>{DIM_META[d.key].icon} {ar ? DIM_META[d.key].ar : DIM_META[d.key].en}</T>
                <T style={{ fontSize: 13, fontWeight: '700' }}>{d.measured ? pct1(d.vol) : '—'} · {BAND_META[b].icon}</T>
              </Row>
              <Meter value={d.roughness} max={1} color={d.roughness < 0.5 ? C.green : d.roughness < 0.75 ? C.amber : C.red} />
            </View>
          );
        })}
      </Card>

      <Card style={{ gap: 8 }}>
        <H2>{r.calming === null ? '〰️' : r.calming ? '🕊' : '🌀'} {L('هل يهدأ بحرك؟', 'Is your sea calming?')}</H2>
        {r.calming !== null && (
          <T style={{ fontWeight: '700', color: r.calming ? C.greenText : C.red }}>{r.calming ? L('بحرك يهدأ ↓', 'Your sea is calming ↓') : L('بحرك يشتد ↑', 'Your sea is building ↑')}</T>
        )}
        {r.rolling.length >= 2 && (
          <LineChart labels={r.rolling.map((p) => p.label)} series={[{ key: 'r', data: r.rolling.map((p) => p.value), color: C.teal, strong: true }]} height={130} />
        )}
      </Card>

      <Card style={{ gap: 10 }}>
        <H2>{L('ماذا يكلّفك الاهتزاز؟', 'What the shaking costs you')}</H2>
        <Row wrap>
          <Stat label={L('حاجز العاصفة (2σ)', 'Storm buffer (2σ)')} value={fmt(r.stormBuffer)} color={r.cash >= r.stormBuffer ? C.greenText : C.red} sub={r.cash >= r.stormBuffer ? L('نقدك يبتلعها ✓', 'your cash absorbs it ✓') : L('أكبر من نقدك', 'larger than your cash')} />
          <Stat label={L('ضريبة التقلّب', 'Volatility tax')} value={r.dragAnnual === null ? '—' : `−${pct1(r.dragAnnual)}`} sub={L('على النمو سنوياً', 'on growth, yearly')} />
        </Row>
        <Muted>{L('لو هدّأت تقلّبك بنسبة:', 'If you calmed your volatility by:')}</Muted>
        <Row wrap gap={6}>
          {[10, 30, 50, 70].map((p) => (
            <Button key={p} small kind={calmBy === p ? 'primary' : 'secondary'} label={`${p}%`} onPress={() => setCalmBy(p)} />
          ))}
        </Row>
        <T style={{ color: C.ink2, lineHeight: 21 }}>
          {L(
            `تصبح درجتك ${newScore} (${newBand.ar})، وينكمش حاجز العاصفة إلى ${fmt(r.stormBuffer * f)}. أدوات التهدئة: ادخار ثابت، وسقوف للمصروف، ومحفظة موزّعة.`,
            `Your score becomes ${newScore} (${newBand.en}), and the storm buffer shrinks to ${fmt(r.stormBuffer * f)}. The calming tools: a standing saving order, spending caps, a spread portfolio.`
          )}
        </T>
        <Row wrap gap={6}>
          <Button small kind="secondary" label={L('صندوق هدف ↗', 'Goal Fund ↗')} onPress={() => openPath('/goal-fund')} />
          <Button small kind="secondary" label={L('الميزانية ↗', 'Budgeting ↗')} onPress={() => openPath('/budgeting')} />
        </Row>
      </Card>
    </Screen>
  );
}
