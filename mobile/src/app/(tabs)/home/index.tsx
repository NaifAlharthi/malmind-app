import { View } from 'react-native';
import { Stack, router } from 'expo-router';

import { LineChart } from '@/components/charts';
import { Icon, type SFSymbol } from '@/components/Icon';
import { Button, Card, CountUp, Heading, IconButton, Muted, Press, Row, Screen, Stat, T } from '@/components/ui';
import { compact, fmt, netWorthOf, vitals } from '@/lib/finance';
import { MONTHS_AR, MONTHS_EN, monthShort, useLocale } from '@/lib/i18n';
import { openPath } from '@/lib/links';
import { useFirstName, useStore } from '@/lib/store';
import { C } from '@/lib/theme';

export default function Home() {
  const { L, ar } = useLocale();
  const { data, mode, refresh, refreshing } = useStore();
  const name = useFirstName(ar);
  const v = vitals(data);
  const series = data.snaps.slice(-12);
  const monthName = (m: number) => (ar ? MONTHS_AR : MONTHS_EN)[m - 1];

  const cards = data.debts.filter((d) => d.kind === 'card');
  const carried = cards.reduce((a, d) => a + d.balance, 0);
  const now = new Date();
  const lastKey = v.last ? v.last.year * 12 + v.last.month : 0;
  const fresh = lastKey >= now.getFullYear() * 12 + now.getMonth() + 1 - 2;

  // the foundation: what a sound financial life has in place — a calm
  // yes/not-yet for each piece, and the door to fix it
  const foundation: { ok: boolean; sf: SFSymbol; emoji: string; title: string; hint: string; href: string }[] = [
    {
      ok: (v.runwayMonths ?? 0) >= 3, sf: 'lifepreserver', emoji: '🛟', href: '/poverty',
      title: L('درع طوارئ (٣ أشهر على الأقل)', 'An emergency shield (3+ months)'),
      hint: v.runwayMonths === null ? L('لم يُحسب بعد', 'not measured yet') : L(`نقدك يصمد ${v.runwayMonths.toFixed(1)} شهراً`, `your cash holds ${v.runwayMonths.toFixed(1)} months`),
    },
    {
      ok: v.saved > 0, sf: 'drop.fill', emoji: '💧', href: '/budgeting',
      title: L('فائض شهري موجب', 'A positive monthly surplus'),
      hint: v.saved >= 0 ? L(`يبقى ${fmt(v.saved)} شهرياً`, `${fmt(v.saved)} survives each month`) : L(`تصرف فوق دخلك بـ${fmt(-v.saved)}`, `spending ${fmt(-v.saved)} above income`),
    },
    {
      ok: v.invested > 0, sf: 'chart.line.uptrend.xyaxis', emoji: '📈', href: '/holdings',
      title: L('مال يعمل لك (استثمار)', 'Money working for you'),
      hint: v.invested > 0 ? L(`${compact(v.invested)} مستثمرة`, `${compact(v.invested)} invested`) : L('لا استثمارات مسجّلة', 'nothing invested yet'),
    },
    {
      ok: carried === 0, sf: 'creditcard', emoji: '💳', href: '/credit-cards',
      title: L('لا رصيد مدوّر على البطاقات', 'No carried card balance'),
      hint: carried === 0 ? L('بطاقاتك نظيفة', 'your cards are clear') : L(`${fmt(carried)} على البطاقات`, `${fmt(carried)} on cards`),
    },
    {
      ok: v.creditScore !== null, sf: 'person.text.rectangle', emoji: '📇', href: '/credit',
      title: L('درجة ائتمانية معروفة', 'A known credit score'),
      hint: v.creditScore !== null ? L(`${v.creditScore} في آخر تقرير`, `${v.creditScore} on the latest report`) : L('لم تُسجَّل بعد', 'not logged yet'),
    },
    {
      ok: fresh, sf: 'book.closed', emoji: '📒', href: '/log',
      title: L('سِجلّ محدَّث', 'An up-to-date Log'),
      hint: v.last ? L(`آخر شهر: ${monthName(v.last.month)} ${v.last.year}`, `latest month: ${monthName(v.last.month)} ${v.last.year}`) : L('لا أشهر بعد', 'no months yet'),
    },
  ];
  const done = foundation.filter((f) => f.ok).length;

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      {/* the greeting is the screen's large title; your space sits in the bar */}
      <Stack.Screen
        options={{
          title: name ? L(`أهلاً ${name}`, `Hi, ${name}`) : L('أهلاً بك', 'Welcome'),
          headerRight: () => (
            <IconButton icon="person.crop.circle" emoji="👤" label={L('مساحتك', 'Your space')} onPress={() => router.push('/space')} tint={C.greenText} bg="transparent" size={34} />
          ),
        }}
      />

      {mode === 'demo' && (
        <Press onPress={() => router.push('/space')}>
          <Card tone="green" delay={0} style={{ paddingVertical: 10 }}>
            <Row gap={8}>
              <Icon sf="eyes" emoji="👀" size={15} />
              <T style={{ flex: 1, fontSize: 12, color: C.greenText, fontWeight: '600' }}>
                {L(`تستكشف بصفة ${name} — بيانات تجريبية، لا يُحفظ شيء. اضغط لتغيير الشخصية.`, `Exploring as ${name} — demo data, nothing saved. Tap to change persona.`)}
              </T>
            </Row>
          </Card>
        </Press>
      )}

      {!v.hasData ? (
        <Card delay={1} style={{ gap: 10 }}>
          <Heading icon="book.closed" emoji="📒">{L('ابدأ سِجلّك', 'Start your Log')}</Heading>
          <Muted>{L('سجّل أرقام شهر واحد — النقد والاستثمارات والديون والدخل والمصروف — وتنبض كل شاشة بأرقامك.', 'Log one month — cash, investments, debts, income and spending — and every screen comes alive with your numbers.')}</Muted>
          <Button icon="plus" label={L('سجّل شهرك الأول', 'Log your first month')} onPress={() => router.push('/month')} />
        </Card>
      ) : (
        <>
          {/* net worth — everything you own minus everything you owe */}
          <Card tone="hero" delay={1} style={{ gap: 6 }}>
            <Muted style={{ color: 'rgba(255,255,255,0.6)' }}>{L('صافي ثروتك', 'Your net worth')}</Muted>
            <CountUp value={v.netWorth} format={fmt} style={{ fontSize: 38, fontWeight: '800', letterSpacing: -0.5, color: v.netWorth >= 0 ? '#FFFFFF' : C.red }} />
            <T style={{ fontSize: 12, color: v.netWorthChange >= 0 ? C.greenText : C.red, fontWeight: '600' }}>
              {v.netWorthChange >= 0 ? '▲' : '▼'} {fmt(Math.abs(v.netWorthChange))}{' '}
              {v.first ? L(`منذ ${monthName(v.first.month)} ${v.first.year}`, `since ${monthName(v.first.month)} ${v.first.year}`) : ''}
            </T>
            {series.length >= 2 && (
              <LineChart
                height={120}
                labels={series.map((s) => monthShort(s.month, s.year, ar))}
                series={[{ key: 'nw', data: series.map(netWorthOf), color: C.greenText, strong: true }]}
              />
            )}
          </Card>

          {/* the monthly pulse */}
          <Card delay={2} style={{ gap: 10 }}>
            <Heading icon="waveform.path.ecg" emoji="🫀" color={C.red}>{L('نبض الشهر', 'The monthly pulse')}</Heading>
            <Row gap={8}>
              <Stat label={L('الدخل', 'Income')} value={compact(v.avgIncome)} sub={L('متوسط ٦ أشهر', '6-mo avg')} />
              <Stat label={L('المصروف', 'Spending')} value={compact(v.avgExpenses)} color={v.avgExpenses > v.avgIncome ? C.red : C.ink} sub={L('متوسط ٦ أشهر', '6-mo avg')} />
              <Stat label={L('يبقى', 'Saved')} value={compact(v.saved)} color={v.saved >= 0 ? C.greenText : C.red} sub={v.savingsRate !== null ? `${Math.round(v.savingsRate * 100)}%` : undefined} />
            </Row>
          </Card>
        </>
      )}

      {/* the foundation */}
      <Card delay={3} style={{ gap: 2 }}>
        <Heading
          icon="building.columns" emoji="🏛" color={C.gold}
          right={<T style={{ fontSize: 12, fontWeight: '700', color: done === foundation.length ? C.greenText : C.gold }}>{`${done}/${foundation.length}`}</T>}
        >
          {L('الأساس', 'The foundation')}
        </Heading>
        <View style={{ height: 6 }} />
        {foundation.map((f) => (
          <Press key={f.title} onPress={() => openPath(f.href)} scaleTo={0.985}>
            <Row gap={12} style={{ paddingVertical: 9, borderTopWidth: 1, borderTopColor: C.borderFaint }}>
              <Icon sf={f.ok ? 'checkmark.circle.fill' : 'circle'} emoji={f.ok ? '✅' : '⚪'} size={20} color={f.ok ? C.green : C.border} />
              <View style={{ flex: 1 }}>
                <Row gap={6}>
                  <Icon sf={f.sf} emoji={f.emoji} size={13} color={C.ink2} />
                  <T style={{ flex: 1, fontSize: 13, fontWeight: '600' }}>{f.title}</T>
                </Row>
                <Muted style={{ fontSize: 11 }}>{f.hint}</Muted>
              </View>
              <Icon sf={ar ? 'chevron.left' : 'chevron.right'} emoji={ar ? '‹' : '›'} size={12} color={C.muted} />
            </Row>
          </Press>
        ))}
      </Card>

      {/* the Brain's door */}
      <Press onPress={() => router.navigate('/brain')}>
        <Card tone="gold" delay={4} style={{ gap: 4 }}>
          <Heading icon="brain.head.profile" emoji="🧠" color={C.goldText} style={{ color: C.goldText }}>{L('اسأل العقل', 'Ask the Brain')}</Heading>
          <Muted>{L('يقرأ سِجلّك كاملاً ويجيب من أرقامك — المصروف، الادخار، التقاعد، التقلّب…', 'It reads your whole Log and answers from your numbers — spending, saving, retirement, volatility…')}</Muted>
        </Card>
      </Press>
    </Screen>
  );
}
