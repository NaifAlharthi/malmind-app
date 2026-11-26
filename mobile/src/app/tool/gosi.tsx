import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, H2, Muted, Row, Screen, Stat, T } from '@/components/ui';
import { GOSI, REF_SOURCES } from '@shared/saudiReference';
import { fmt, vitals } from '@/lib/finance';
import { useLocale } from '@/lib/i18n';
import { openPath } from '@/lib/links';
import { useStore } from '@/lib/store';
import { C } from '@/lib/theme';

// GOSI — the state's layer of your retirement, from the organization's own
// reports (shared saudiReference.ts), computed on your wage from the Log.
// Same math as the website's /gosi tool.
export default function Gosi() {
  const { L } = useLocale();
  const { data } = useStore();
  const v = vitals(data);
  const [retireAge, setRetireAge] = useState<number>(GOSI.retirementAge);

  if (!v.hasData) {
    return (
      <Screen>
        <Card style={{ gap: 10 }}>
          <H2>🏛 {L('التأمينات الاجتماعية', 'GOSI')}</H2>
          <Muted>{L('سجّل دخلاً في السِّجل لتُحسب تأميناتك عليه.', 'Log income in the Log and your GOSI is computed on it.')}</Muted>
          <Button label={L('افتح السِّجل', 'Open the Log')} onPress={() => openPath('/log')} />
        </Card>
      </Screen>
    );
  }

  const age = data.profile.age;
  // contributory wage = basic + housing; from a total package, basic ≈ total/1.35, housing ≈ 25% of basic
  const wage = (v.avgIncome / 1.35) * 1.25;
  const yours = wage * ((GOSI.annuities.employeePct + GOSI.saned.employeePct) / 100);
  const employer = wage * ((GOSI.annuities.employerPct + GOSI.hazardsPct + GOSI.saned.employerPct) / 100);
  const nowYear = new Date().getFullYear();
  const startYear = data.profile.careerStartYear ?? (age ? nowYear - age + 22 : null);
  const yearsSoFar = startYear ? Math.max(0, nowYear - startYear) : 0;
  const yearsAtRetire = age ? yearsSoFar + Math.max(0, retireAge - age) : yearsSoFar;
  const replacement = Math.min(1, (yearsAtRetire * GOSI.accrualPerYearPct) / 100);
  const pension = Math.max(GOSI.minPension, replacement * wage);
  const saned1 = Math.min(GOSI.saned.firstMonthsCap, wage * (GOSI.saned.firstMonthsPct / 100));
  const saned2 = Math.min(GOSI.saned.afterCap, wage * (GOSI.saned.afterPct / 100));
  const coverage = v.avgExpenses > 0 ? Math.round((pension / v.avgExpenses) * 100) : 0;
  const minAge = Math.max((age ?? 25) + 1, 55);

  return (
    <Screen>
      <Card tone="hero" style={{ gap: 10 }}>
        <Row gap={8}>
          <Stat label={L('أجرك الخاضع ≈', 'Contributory wage ≈')} value={fmt(wage)} style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'transparent' }} />
          <Stat label={L('يُقتطع منك', 'From your payslip')} value={fmt(yours)} style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'transparent' }} />
          <Stat label={L('صاحب العمل', 'Your employer')} value={fmt(employer)} style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'transparent' }} />
        </Row>
        <Muted style={{ color: 'rgba(255,255,255,0.7)' }}>
          {L(
            `${yearsSoFar} سنة اشتراك حتى اليوم — وعند ${retireAge} يصبح معاشك التقريبي ${fmt(pension)}/شهرياً (${Math.round(replacement * 100)}٪ من أجرك الخاضع).`,
            `${yearsSoFar} contribution years so far — at ${retireAge}, your approximate pension is ${fmt(pension)}/mo (${Math.round(replacement * 100)}% of your contributory wage).`
          )}
        </Muted>
      </Card>

      <Card style={{ gap: 8 }}>
        <H2>⚙️ {L('ثلاثة فروع، واقتطاع واحد', 'Three branches, one deduction')}</H2>
        {[
          [L('المعاشات', 'Annuities'), GOSI.annuities.totalPct, GOSI.annuities.employeePct, GOSI.annuities.employerPct],
          [L('الأخطار المهنية', 'Occupational hazards'), GOSI.hazardsPct, 0, GOSI.hazardsPct],
          [L('ساند (التعطل)', 'SANED (unemployment)'), GOSI.saned.totalPct, GOSI.saned.employeePct, GOSI.saned.employerPct],
        ].map(([name, total, you, emp]) => (
          <Row key={String(name)} style={{ justifyContent: 'space-between', paddingVertical: 4, borderTopWidth: 1, borderTopColor: C.borderFaint }}>
            <T style={{ flex: 1, fontSize: 13, fontWeight: '600' }}>{name}</T>
            <Muted>{L(`${total}٪ · أنت ${you}٪ · صاحب العمل ${emp}٪`, `${total}% · you ${you}% · employer ${emp}%`)}</Muted>
          </Row>
        ))}
        <Muted style={{ fontSize: 11 }}>
          {L(
            `الأجر الخاضع = الأساسي + بدل السكن. الحد الأدنى للمعاش ${fmt(GOSI.minPension)} ريال. الأهلية من ${GOSI.minMonths} شهر اشتراك.`,
            `Contributory wage = basic + housing. Minimum pension SAR ${fmt(GOSI.minPension)}. Eligibility from ${GOSI.minMonths} contribution months.`
          )}
        </Muted>
      </Card>

      <Card style={{ gap: 8 }}>
        <H2>🛟 {L('ساند — الشبكة تحت دخلك', 'SANED — the net under your income')}</H2>
        <Row gap={8}>
          <Stat label={L('الأشهر ١–٣', 'Months 1–3')} value={fmt(saned1)} />
          <Stat label={L('بعدها', 'After that')} value={fmt(saned2)} />
        </Row>
        <Muted>
          {saned1 >= v.avgExpenses
            ? L('يغطي ساند مصروفك كاملاً في الأشهر الأولى ✓', 'SANED covers your full spending in the first months ✓')
            : L(`يغطي ساند ${Math.round((saned1 / v.avgExpenses) * 100)}٪ من مصروفك — درعك النقدي يسدّ الباقي.`, `SANED covers ${Math.round((saned1 / v.avgExpenses) * 100)}% of your spending — your cash shield fills the rest.`)}
        </Muted>
      </Card>

      <Card style={{ gap: 10 }}>
        <H2>⏳ {L('الأفق — معاشك والتحوّل إلى ٦٥', 'The horizon — your pension and the move to 65')}</H2>
        <Row style={{ justifyContent: 'space-between' }}>
          <Muted>{L('سن التقاعد المفترض', 'Assumed retirement age')}</Muted>
          <Row gap={8}>
            <Button small kind="secondary" label="−" onPress={() => setRetireAge((a) => Math.max(minAge, a - 1))} />
            <T style={{ fontWeight: '800', fontSize: 18, minWidth: 30 }} center>{retireAge}</T>
            <Button small kind="secondary" label="+" onPress={() => setRetireAge((a) => Math.min(GOSI.newLawRetirementAge, a + 1))} />
          </Row>
        </Row>
        <T style={{ color: C.ink2, lineHeight: 21 }}>
          {L(
            `${GOSI.accrualPerYearPct}٪ عن كل سنة اشتراك × الأجر الخاضع. عند ${retireAge}: ${yearsAtRetire} سنة ⇒ ${fmt(pension)}/شهرياً — يغطي ${coverage}٪ من مصروفك اليوم؛ والباقي وظيفة محفظتك.`,
            `${GOSI.accrualPerYearPct}% per contribution year × the contributory wage. At ${retireAge}: ${yearsAtRetire} years ⇒ ${fmt(pension)}/mo — covering ${coverage}% of today's spending; the rest is your portfolio's job.`
          )}
        </T>
        <Muted style={{ fontSize: 11 }}>
          {L(`النظام الجديد يرفع سن التقاعد تدريجياً إلى ${GOSI.newLawRetirementAge}.`, `The new law raises the retirement age gradually to ${GOSI.newLawRetirementAge}.`)}
        </Muted>
        <Button kind="secondary" small label={L('اجمعها مع محفظتك — التقاعد ↗', 'Combine with your pot — Retirement ↗')} onPress={() => openPath('/retirement')} />
      </Card>

      <View style={{ paddingHorizontal: 4 }}>
        <Muted style={{ fontSize: 10 }}>
          {L(`الأرقام من: ${REF_SOURCES.gosi.ar} — التقدير تقريبي؛ رقمك الرسمي في حسابك لدى المؤسسة.`, `Figures: ${REF_SOURCES.gosi.en} — estimates are approximate; your official number lives in your GOSI account.`)}
        </Muted>
      </View>
    </Screen>
  );
}
