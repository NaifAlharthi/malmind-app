import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Button, Card, Eyebrow, H2, Muted, Press, Row, Segmented, T } from '@/components/ui';
import { DEMO_PERSONAS } from '@shared/demoWorld';
import { useLocale } from '@/lib/i18n';
import { haptic } from '@/lib/haptics';
import { SITE, openWeb } from '@/lib/links';
import { enter } from '@/lib/motion';
import { useStore } from '@/lib/store';
import { C, radius } from '@/lib/theme';

// The welcome door: what MalMind is in one breath, four ready-made Saudi
// lives to walk the product as (no account, nothing saved), and sign-in
// for an existing malmind.ai account.
export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { L, locale, setLocale, ar, start, row } = useLocale();
  const { enterDemo, signIn } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = async () => {
    setBusy(true);
    setError(null);
    const err = await signIn(email, password);
    setBusy(false);
    if (err) { haptic.error(); setError(err); }
    else { haptic.success(); router.replace('/home'); }
  };

  const input = {
    backgroundColor: C.card2, borderWidth: 1, borderColor: C.border, borderRadius: radius.md,
    color: C.ink, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, textAlign: start,
  } as const;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.heroFrom }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32, gap: 18 }} keyboardShouldPersistTaps="handled">
        <Row style={{ justifyContent: 'space-between' }}>
          <T style={{ fontSize: 24, fontWeight: '800' }}>
            Mal<T style={{ fontSize: 24, fontWeight: '800', color: C.greenText }}>Mind</T>
          </T>
          <Segmented
            options={[{ key: 'ar', label: 'العربية' }, { key: 'en', label: 'English' }]}
            value={locale}
            onChange={(k) => setLocale(k)}
          />
        </Row>

        <Animated.View entering={enter(0)} style={{ gap: 10, paddingTop: 8 }}>
          <Eyebrow>{L('مال مايند', 'MALMIND')}</Eyebrow>
          <T style={{ fontSize: 32, fontWeight: '800', lineHeight: 42 }}>
            {L('طبقة تفكير لحياتك المالية', 'A thinking layer for your financial life')}
          </T>
          <T style={{ color: C.ink2, fontSize: 15, lineHeight: 23 }}>
            {L(
              'كل تطبيق يمسك شريحةً من حياتك المالية — ولا أحد يعرف ماذا تعني الشرائح مجتمعة. مال مايند يجمعها في سِجلّ واحد، ويجيب من أرقامك أنت.',
              'Every app holds one slice of your financial life — and none knows what the slices mean together. MalMind gathers them into one record, and answers from YOUR numbers.'
            )}
          </T>
        </Animated.View>

        {/* the showcase: the four problems, solved end to end */}
        <Animated.View entering={enter(1)}>
          <Press haptics="firm" onPress={() => router.push('/showcase')}>
            <Card tone="gold" style={{ gap: 4, borderWidth: 1.5, borderColor: C.gold }}>
              <Row gap={8}>
                <Icon sf="play.circle.fill" emoji="▶" size={22} color={C.goldText} />
                <T style={{ flex: 1, fontWeight: '800', color: C.goldText }}>{L('شاهد العقل يحلّ المشكلات الأربع', 'Watch the Brain solve the four problems')}</T>
              </Row>
              <Muted>{L('يقرأ، ويحلّل، ويقترح، وينفّذ — من البداية للنهاية، على بيانات أربع شخصيات.', 'It reads, analyses, proposes and acts — end to end, on four personas’ data.')}</Muted>
            </Card>
          </Press>
        </Animated.View>

        {/* walk a ready-made life */}
        <View style={{ gap: 10 }}>
          <H2>{L('جرّب بحياة سعودية جاهزة', 'Try a ready-made Saudi life')}</H2>
          <Muted>{L('أربع شخصيات ببيانات كاملة — دون تسجيل، ولا يُحفظ شيء.', 'Four personas with full data — no signup, nothing saved.')}</Muted>
          <View style={{ flexDirection: row, flexWrap: 'wrap', gap: 10 }}>
            {DEMO_PERSONAS.map((p, i) => (
              <Animated.View key={p.id} entering={enter(i + 1)} style={{ width: '48%', flexGrow: 1 }}>
              <Press
                haptics="firm"
                onPress={() => { enterDemo(p.id); router.replace('/home'); }}
                style={{
                  flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.14)', borderRadius: radius.xl, borderCurve: 'continuous', padding: 14, gap: 6,
                }}
              >
                <Row>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: p.accent, alignItems: 'center', justifyContent: 'center' }}>
                    <T style={{ fontWeight: '800', color: '#fff' }} center>{(ar ? p.firstNameAr : p.firstName).slice(0, 1)}</T>
                  </View>
                  <View style={{ flex: 1 }}>
                    <T style={{ fontWeight: '700' }}>{ar ? p.firstNameAr : p.firstName}</T>
                    <Muted style={{ fontSize: 10 }}>{ar ? p.netWorth.ar : p.netWorth.en}</Muted>
                  </View>
                </Row>
                <Muted style={{ fontSize: 11 }} numberOfLines={2}>{ar ? p.role.ar : p.role.en}</Muted>
                <Row gap={4}>
                  <T style={{ fontSize: 11, fontWeight: '700', color: C.greenText }}>{L('امشِ في حياته', 'Walk this life')}</T>
                  <Icon sf={ar ? 'arrow.left' : 'arrow.right'} emoji={ar ? '←' : '→'} size={10} color={C.greenText} weight="bold" />
                </Row>
              </Press>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* or your own account */}
        <Card delay={5} style={{ gap: 10, backgroundColor: 'rgba(14,20,17,0.6)' }}>
          <H2>{L('أو ادخل بحسابك', 'Or sign in to your account')}</H2>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder={L('البريد الإلكتروني', 'Email')}
            placeholderTextColor={C.muted}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            style={input}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder={L('كلمة المرور', 'Password')}
            placeholderTextColor={C.muted}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            onSubmitEditing={go}
            style={input}
          />
          {error ? <T style={{ color: C.red, fontSize: 12 }}>{error}</T> : null}
          <Button label={busy ? L('يدخل…', 'Signing in…') : L('ادخل', 'Sign in')} onPress={go} disabled={busy || !email || !password} />
          <Press haptics="select" onPress={() => openWeb(`${SITE}/signup`)}>
            <Muted center>{L('ليس لديك حساب؟ أنشئه على malmind.ai ↗', "No account? Create one on malmind.ai ↗")}</Muted>
          </Press>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
