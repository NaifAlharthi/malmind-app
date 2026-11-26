import { Platform, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Heading, IconButton, Muted, Press, Row, Segmented, T, Title } from '@/components/ui';
import { DEMO_PERSONAS, getPersona } from '@shared/demoWorld';
import { useLocale } from '@/lib/i18n';
import { SITE, openWeb } from '@/lib/links';
import { useStore } from '@/lib/store';
import { C, radius } from '@/lib/theme';

// Your space — language, who you are (a persona or your account), and the
// ways out: switch persona, leave the demo, or sign out.
export default function Space() {
  const insets = useSafeAreaInsets();
  const { L, ar, locale, setLocale } = useLocale();
  const { mode, personaId, email, enterDemo, leaveDemo, signOut } = useStore();
  const persona = personaId ? getPersona(personaId) : null;

  const out = async (fn: () => void | Promise<void>) => {
    await fn();
    router.dismissAll();
    router.replace('/');
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 18, paddingTop: Platform.OS === 'ios' ? 26 : 18, gap: 14, paddingBottom: insets.bottom + 32 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Title style={{ fontSize: 24, flex: 1 }}>{L('مساحتك', 'Your space')}</Title>
        <IconButton icon="xmark" emoji="✕" label={L('إغلاق', 'Close')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />
      </Row>

      <Card style={{ gap: 10 }}>
        <Heading icon="globe" emoji="🌐">{L('اللغة', 'Language')}</Heading>
        <Segmented options={[{ key: 'ar', label: 'العربية' }, { key: 'en', label: 'English' }]} value={locale} onChange={setLocale} />
      </Card>

      <Card style={{ gap: 10 }}>
        <Heading icon="person.crop.circle" emoji="👤">{L('أنت', 'You')}</Heading>
        {mode === 'demo' && persona ? (
          <>
            <T>{L(`تستكشف بصفة ${persona.firstNameAr} — ${persona.role.ar}`, `Exploring as ${persona.firstName} — ${persona.role.en}`)}</T>
            <Muted>{L('بيانات تجريبية — تعديلاتك تبقى حتى تغادر هذه الشخصية.', 'Demo data — your edits last until you leave this persona.')}</Muted>
            <Muted style={{ marginTop: 4 }}>{L('بدّل الشخصية:', 'Switch persona:')}</Muted>
            <View style={{ gap: 8 }}>
              {DEMO_PERSONAS.filter((p) => p.id !== persona.id).map((p) => (
                <Press
                  key={p.id}
                  onPress={() => out(() => enterDemo(p.id))}
                  style={{ padding: 10, borderRadius: radius.md, borderCurve: 'continuous', borderWidth: 1, borderColor: C.borderFaint, backgroundColor: C.card2 }}
                >
                  <Row>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: p.accent }} />
                    <T style={{ fontWeight: '700' }}>{ar ? p.firstNameAr : p.firstName}</T>
                    <Muted style={{ flex: 1 }} numberOfLines={1}>{ar ? p.tagline.ar : p.tagline.en}</Muted>
                  </Row>
                </Press>
              ))}
            </View>
            <Button kind="secondary" label={L('غادر العرض التجريبي', 'Leave the demo')} onPress={() => out(leaveDemo)} />
          </>
        ) : (
          <>
            <T>{email ?? L('حسابك', 'Your account')}</T>
            <Muted>{L('سِجلّك نفسه على malmind.ai — أي تعديل هنا يظهر هناك.', 'The same Log as on malmind.ai — any edit here shows there.')}</Muted>
            <Button kind="danger" label={L('تسجيل الخروج', 'Sign out')} onPress={() => out(signOut)} />
          </>
        )}
      </Card>

      <Card style={{ gap: 8 }}>
        <Heading icon="safari" emoji="🔗">malmind.ai</Heading>
        <Muted>{L('الأدوات الكاملة، والباقات، وعن مال مايند — على الموقع.', 'The full tools, the plans, and About MalMind — on the website.')}</Muted>
        <Button kind="secondary" label={L('افتح الموقع', 'Open the website')} icon="arrow.up.right" onPress={() => openWeb(SITE)} />
      </Card>
      <Muted center style={{ fontSize: 10 }}>{L('معلومات تعليمية وتخطيطية — وليست نصيحة مالية مرخّصة.', 'Educational and planning information — not licensed financial advice.')}</Muted>
    </ScrollView>
  );
}
