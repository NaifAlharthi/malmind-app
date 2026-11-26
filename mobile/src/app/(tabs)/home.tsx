import { Pressable, View } from 'react-native';
import { router } from 'expo-router';

import { LineChart } from '@/components/charts';
import { Button, Card, Eyebrow, H2, Muted, Row, Screen, Stat, T, Title } from '@/components/ui';
import { compact, fmt, netWorthOf, vitals } from '@/lib/finance';
import { MONTHS_AR, MONTHS_EN, monthShort, useLocale } from '@/lib/i18n';
import { openPath } from '@/lib/links';
import { useFirstName, useStore } from '@/lib/store';
import { C, radius } from '@/lib/theme';

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
  const foundation: { ok: boolean; icon: string; title: string; hint: string; href: string }[] = [
    {
      ok: (v.runwayMonths ?? 0) >= 3, icon: '🛟', href: '/poverty',
      title: L('درع طوارئ (٣ أشهر على الأقل)', 'An emergency shield (3+ months)'),
      hint: v.runwayMonths === null ? L('لم يُحسب بعد', 'not measured yet') : L(`نقدك يصمد ${v.runwayMonths.toFixed(1)} شهراً`, `your cash holds ${v.runwayMonths.toFixed(1)} months`),
    },
    {
      ok: v.saved > 0, icon: '💧', href: '/budgeting',
      title: L('فائض شهري موجب', 'A positive monthly surplus'),
      hint: v.saved >= 0 ? L(`يبقى ${fmt(v.saved)} شهرياً`, `${fmt(v.saved)} survives each month`) : L(`تصرف فوق دخلك بـ${fmt(-v.saved)}`, `spending ${fmt(-v.saved)} above income`),
    },
    {
      ok: v.invested > 0, icon: '📈', href: '/holdings',
      title: L('مال يعمل لك (استثمار)', 'Money working for you'),
      hint: v.invested > 0 ? L(`${compact(v.invested)} مستثمرة`, `${compact(v.invested)} invested`) : L('لا استثمارات مسجّلة', 'nothing invested yet'),
    },
    {
      ok: carried === 0, icon: '💳', href: '/credit-cards',
      title: L('لا رصيد مدوّر على البطاقات', 'No carried card balance'),
      hint: carried === 0 ? L('بطاقاتك نظيفة', 'your cards are clear') : L(`${fmt(carried)} على البطاقات`, `${fmt(carried)} on cards`),
    },
    {
      ok: v.creditScore !== null, icon: '📇', href: '/credit',
      title: L('درجة ائتمانية معروفة', 'A known credit score'),
      hint: v.creditScore !== null ? L(`${v.creditScore} في آخر تقرير`, `${v.creditScore} on the latest report`) : L('لم تُسجَّل بعد', 'not logged yet'),
    },
    {
      ok: fresh, icon: '📒', href: '/log',
      title: L('سِجلّ محدَّث', 'An up-to-date Log'),
      hint: v.last ? L(`آخر شهر: ${monthName(v.last.month)} ${v.last.year}`, `latest month: ${monthName(v.last.month)} ${v.last.year}`) : L('لا أشهر بعد', 'no months yet'),
    },
  ];
  const done = foundation.filter((f) => f.ok).length;

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Eyebrow>{L('الرئيسية', 'HOME')}</Eyebrow>
          <Title>{name ? L(`أهلاً ${name}`, `Hi, ${name}`) : L('أهلاً بك', 'Welcome')}</Title>
        </View>
        <Pressable
          onPress={() => router.push('/space')}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.greenBg, borderWidth: 1, borderColor: C.greenBorder, alignItems: 'center', justifyContent: 'center' }}
          accessibilityLabel={L('مساحتك', 'Your space')}
        >
          <T center style={{ color: C.greenText, fontWeight: '800' }}>{(name ?? '·').slice(0, 1)}</T>
        </Pressable>
      </Row>

      {mode === 'demo' && (
        <Pressable onPress={() => router.push('/space')}>
          <Card tone="green" style={{ paddingVertical: 10 }}>
            <T style={{ fontSize: 12, color: C.greenText, fontWeight: '600' }}>
              👀 {L(`تستكشف بصفة ${name} — بيانات تجريبية، لا يُحفظ شيء. اضغط لتغيير الشخصية.`, `Exploring as ${name} — demo data, nothing saved. Tap to change persona.`)}
            </T>
          </Card>
        </Pressable>
      )}

      {!v.hasData ? (
        <Card style={{ gap: 10 }}>
          <H2>{L('ابدأ سِجلّك', 'Start your Log')}</H2>
          <Muted>{L('سجّل أرقام شهر واحد — النقد والاستثمارات والديون والدخل والمصروف — وتنبض كل شاشة بأرقامك.', 'Log one month — cash, investments, debts, income and spending — and every screen comes alive with your numbers.')}</Muted>
          <Button label={L('سجّل شهرك الأول', 'Log your first month')} onPress={() => router.push('/month')} />
        </Card>
      ) : (
        <>
          {/* net worth — everything you own minus everything you owe */}
          <Card tone="hero" style={{ gap: 6 }}>
            <Muted style={{ color: 'rgba(255,255,255,0.6)' }}>{L('صافي ثروتك', 'Your net worth')}</Muted>
            <T style={{ fontSize: 36, fontWeight: '800', color: v.netWorth >= 0 ? '#FFFFFF' : C.red }}>{fmt(v.netWorth)}</T>
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
          <View style={{ gap: 8 }}>
            <H2>🫀 {L('نبض الشهر', 'The monthly pulse')}</H2>
            <Row gap={8}>
              <Stat label={L('الدخل', 'Income')} value={compact(v.avgIncome)} sub={L('متوسط ٦ أشهر', '6-mo avg')} />
              <Stat label={L('المصروف', 'Spending')} value={compact(v.avgExpenses)} color={v.avgExpenses > v.avgIncome ? C.red : C.ink} sub={L('متوسط ٦ أشهر', '6-mo avg')} />
              <Stat label={L('يبقى', 'Saved')} value={compact(v.saved)} color={v.saved >= 0 ? C.greenText : C.red} sub={v.savingsRate !== null ? `${Math.round(v.savingsRate * 100)}%` : undefined} />
            </Row>
          </View>
        </>
      )}

      {/* the foundation */}
      <Card style={{ gap: 4 }}>
        <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
          <H2>🏛 {L('الأساس', 'The foundation')}</H2>
          <T style={{ fontSize: 12, fontWeight: '700', color: done === foundation.length ? C.greenText : C.gold }}>{done}/{foundation.length}</T>
        </Row>
        {foundation.map((f) => (
          <Pressable key={f.title} onPress={() => openPath(f.href)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            <Row gap={10} style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.borderFaint }}>
              <View style={{
                width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
                backgroundColor: f.ok ? C.green : 'transparent', borderWidth: f.ok ? 0 : 1.5, borderColor: C.border,
              }}>
                <T center style={{ fontSize: 11, color: '#fff', fontWeight: '800' }}>{f.ok ? '✓' : ''}</T>
              </View>
              <View style={{ flex: 1 }}>
                <T style={{ fontSize: 13, fontWeight: '600' }}>{f.icon} {f.title}</T>
                <Muted style={{ fontSize: 11 }}>{f.hint}</Muted>
              </View>
              <T style={{ color: C.muted }}>{ar ? '‹' : '›'}</T>
            </Row>
          </Pressable>
        ))}
      </Card>

      {/* the Brain's door */}
      <Pressable onPress={() => router.navigate('/brain')}>
        <Card tone="gold" style={{ gap: 4 }}>
          <T style={{ fontWeight: '700', color: C.goldText }}>🧠 {L('اسأل العقل', 'Ask the Brain')}</T>
          <Muted>{L('يقرأ سِجلّك كاملاً ويجيب من أرقامك — المصروف، الادخار، التقاعد، التقلّب…', 'It reads your whole Log and answers from your numbers — spending, saving, retirement, volatility…')}</Muted>
        </Card>
      </Pressable>
      <View style={{ height: radius.sm }} />
    </Screen>
  );
}
