import { ZoomLink } from '@/components/ZoomLink';

import { Meter } from '@/components/charts';
import { Icon, type SFSymbol } from '@/components/Icon';
import { Card, CountUp, Heading, Muted, Press, Row, Screen, Stat, T } from '@/components/ui';
import { computeVolatility, BAND_META } from '@shared/volatility';
import { compact, fmt, vitals } from '@/lib/finance';
import { MONTHS_AR, MONTHS_EN, useLocale } from '@/lib/i18n';
import { openPath } from '@/lib/links';
import { useStore } from '@/lib/store';
import { C } from '@/lib/theme';

type Tone = 'good' | 'ok' | 'bad' | 'none';
const toneColor: Record<Tone, string> = { good: C.greenText, ok: C.gold, bad: C.red, none: C.muted };

// Today — the vital signs of a financial life, each with a verdict in
// plain words and the door to the tool that moves it.
export default function Today() {
  const { L, ar } = useLocale();
  const { data, refresh, refreshing } = useStore();
  const v = vitals(data);
  const vol = computeVolatility(data.snaps);
  const last = v.last;

  const signs: { sf: SFSymbol; emoji: string; name: string; value: string; tone: Tone; verdict: string; fill: number; href: string }[] = [
    {
      sf: 'drop.fill', emoji: '💧', name: L('معدّل الادخار', 'Savings rate'), href: '/budgeting',
      value: v.savingsRate === null ? '—' : `${Math.round(v.savingsRate * 100)}%`,
      tone: v.savingsRate === null ? 'none' : v.savingsRate >= 0.2 ? 'good' : v.savingsRate > 0 ? 'ok' : 'bad',
      verdict: v.savingsRate === null ? L('سجّل دخلاً ومصروفاً', 'Log income and spending')
        : v.savingsRate >= 0.2 ? L('ممتاز — فوق ٢٠٪', 'Excellent — above 20%')
        : v.savingsRate > 0 ? L('إيجابي، وقابل للرفع', 'Positive, and liftable')
        : L('تصرف أكثر مما تكسب', 'You spend more than you earn'),
      fill: Math.max(0, Math.min(1, (v.savingsRate ?? 0) / 0.3)),
    },
    {
      sf: 'lifepreserver', emoji: '🛟', name: L('درع الطوارئ', 'Emergency shield'), href: '/poverty',
      value: v.runwayMonths === null ? '—' : L(`${v.runwayMonths.toFixed(1)} شهر`, `${v.runwayMonths.toFixed(1)} mo`),
      tone: v.runwayMonths === null ? 'none' : v.runwayMonths >= 6 ? 'good' : v.runwayMonths >= 3 ? 'ok' : 'bad',
      verdict: v.runwayMonths === null ? L('غير محسوب', 'Not measured')
        : v.runwayMonths >= 6 ? L('آمن — ٦ أشهر وأكثر', 'Safe — 6+ months')
        : v.runwayMonths >= 3 ? L('النطاق الأدنى (٣–٦)', 'The minimum range (3–6)')
        : L('تحت ٣ أشهر — ابنِه أولاً', 'Under 3 months — build it first'),
      fill: Math.min(1, (v.runwayMonths ?? 0) / 6),
    },
    {
      sf: 'scalemass', emoji: '⚖️', name: L('الديون إلى الأصول', 'Debt to assets'), href: '/ratios',
      value: v.debtToAssets === null ? '—' : `${Math.round(v.debtToAssets * 100)}%`,
      tone: v.debtToAssets === null ? 'none' : v.debtToAssets <= 0.35 ? 'good' : v.debtToAssets <= 0.7 ? 'ok' : 'bad',
      verdict: v.debtToAssets === null ? L('لا أصول مسجّلة', 'No assets logged')
        : v.debtToAssets <= 0.35 ? L('صحي', 'Healthy')
        : v.debtToAssets <= 0.7 ? L('يستحق خطة سداد', 'Worth a paydown plan')
        : L('الديون تقارب أصولك أو تفوقها', 'Debts rival or exceed your assets'),
      fill: Math.min(1, v.debtToAssets ?? 0),
    },
    {
      sf: 'building.columns', emoji: '🏦', name: L('خدمة الديون من الدخل', 'Debt service / income'), href: '/commitments',
      value: v.debtServiceRatio === null ? '—' : `${Math.round(v.debtServiceRatio * 100)}%`,
      tone: v.debtServiceRatio === null ? 'none' : v.debtServiceRatio <= 0.33 ? 'good' : v.debtServiceRatio <= 0.45 ? 'ok' : 'bad',
      verdict: v.debtServiceRatio === null ? L('غير محسوب', 'Not measured')
        : L(`${fmt(v.debtService)} شهرياً · الحد ٣٣٪`, `${fmt(v.debtService)}/mo · the line is 33%`),
      fill: Math.min(1, (v.debtServiceRatio ?? 0) / 0.6),
    },
  ];

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      {last && (
        <Card delay={0} style={{ gap: 10 }}>
          <Heading icon="calendar" emoji="🗓">{L(`آخر شهر: ${MONTHS_AR[last.month - 1]} ${last.year}`, `Latest month: ${MONTHS_EN[last.month - 1]} ${last.year}`)}</Heading>
          <Row gap={8}>
            <Stat label={L('الدخل', 'Income')} value={compact(last.income)} />
            <Stat label={L('المصروف', 'Spending')} value={compact(last.expenses)} color={last.expenses > last.income ? C.red : C.ink} />
            <Stat label={L('يبقى', 'Saved')} value={compact(last.income - last.expenses)} color={last.income >= last.expenses ? C.greenText : C.red} />
          </Row>
        </Card>
      )}

      {signs.map((s, i) => (
        <Press key={s.name} onPress={() => openPath(s.href)}>
          <Card delay={i + 1} style={{ gap: 8 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row gap={8} style={{ flex: 1 }}>
                <Icon sf={s.sf} emoji={s.emoji} size={16} color={toneColor[s.tone]} />
                <T style={{ fontWeight: '700', flex: 1 }}>{s.name}</T>
              </Row>
              <T style={{ fontWeight: '800', fontSize: 20, color: toneColor[s.tone], fontVariant: ['tabular-nums'] }}>{s.value}</T>
            </Row>
            <Meter value={s.fill} max={1} color={toneColor[s.tone]} />
            <Muted>{s.verdict}</Muted>
          </Card>
        </Press>
      ))}

      {/* the calm score — how much the financial life shakes; on iPhone the
          card zooms open into the Volatility screen */}
      <ZoomLink href="/tool/volatility">
            <Card tone="hero" delay={5} style={{ gap: 6 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row gap={8} style={{ flex: 1 }}>
                  <Icon sf="water.waves" emoji="🌊" size={17} color={C.greenText} animation={{ effect: { type: 'pulse' }, repeating: true, speed: 0.4 }} />
                  <T style={{ fontWeight: '700', flex: 1 }}>{L('درجة الهدوء', 'Calm score')}</T>
                </Row>
                {vol ? <CountUp value={vol.calmScore} format={(n) => `${n}/100`} style={{ fontWeight: '800', fontSize: 22 }} /> : <T style={{ fontWeight: '800', fontSize: 22 }}>—</T>}
              </Row>
              <Muted style={{ color: 'rgba(255,255,255,0.7)' }}>
                {vol
                  ? `${BAND_META[vol.band].icon} ${ar ? BAND_META[vol.band].ar : BAND_META[vol.band].en} — ${ar ? BAND_META[vol.band].arLine : BAND_META[vol.band].enLine}`
                  : L('يحتاج أربعة أشهر مسجّلة على الأقل.', 'Needs at least four logged months.')}
              </Muted>
              <Row gap={4}>
                <T style={{ fontSize: 12, fontWeight: '700', color: C.greenText }}>{L('افتح التقلّب', 'Open Volatility')}</T>
                <Icon sf={ar ? 'chevron.left' : 'chevron.right'} emoji={ar ? '←' : '→'} size={10} color={C.greenText} weight="bold" />
              </Row>
            </Card>
      </ZoomLink>

      <Card delay={6} style={{ gap: 8 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row gap={8} style={{ flex: 1 }}>
            <Icon sf="person.text.rectangle" emoji="📇" size={16} />
            <T style={{ fontWeight: '700', flex: 1 }}>{L('الدرجة الائتمانية', 'Credit score')}</T>
          </Row>
          {v.creditScore !== null
            ? <CountUp value={v.creditScore} format={String} style={{ fontWeight: '800', fontSize: 20, color: C.greenText }} />
            : <T style={{ fontWeight: '800', fontSize: 20, color: C.muted }}>—</T>}
        </Row>
        {v.creditScore !== null && <Meter value={v.creditScore - 300} max={550} color={C.green} />}
        <Muted>
          {v.creditChange === null
            ? (v.creditScore === null ? L('لم تُسجَّل بعد', 'Not logged yet') : L('تقرير واحد مسجّل', 'One report on record'))
            : L(`${v.creditChange >= 0 ? '▲' : '▼'} ${Math.abs(v.creditChange)} مقارنة بالتقرير السابق`, `${v.creditChange >= 0 ? '▲' : '▼'} ${Math.abs(v.creditChange)} vs the previous report`)}
        </Muted>
      </Card>
    </Screen>
  );
}
