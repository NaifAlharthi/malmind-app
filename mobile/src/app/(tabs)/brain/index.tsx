import { useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, TextInput, View, type ScrollViewInstance } from 'react-native';
import Animated, {
  ReduceMotion, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';

import { Glass, HAS_GLASS } from '@/components/Glass';
import { Icon } from '@/components/Icon';
import RichMessage from '@/components/RichMessage';
import { IconButton, Muted, Press, Row, T } from '@/components/ui';
import { buildBrainContext, composeBriefing, composeLocalReply } from '@shared/brainCompose';
import { haptic } from '@/lib/haptics';
import { useLocale } from '@/lib/i18n';
import { bubble, enter } from '@/lib/motion';
import { useStore } from '@/lib/store';
import { C } from '@/lib/theme';

interface Msg { role: 'user' | 'brain'; content: string }

/** three dots breathing in turn — the Brain is reading your numbers */
function Dot({ i }: { i: number }) {
  const o = useSharedValue(0.25);
  useEffect(() => {
    o.set(withDelay(i * 160, withRepeat(withSequence(
      withTiming(1, { duration: 380, reduceMotion: ReduceMotion.System }),
      withTiming(0.25, { duration: 380, reduceMotion: ReduceMotion.System }),
    ), -1)));
  }, [o, i]);
  const style = useAnimatedStyle(() => ({ opacity: o.get(), transform: [{ scale: 0.8 + o.get() * 0.25 }] }));
  return <Animated.View style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.greenText }, style]} />;
}

// The Brain on the phone: the website's local thinking layer (shared
// brainCompose.ts), answering from the Log with real numbers, charts, and
// tool chips. It speaks first with a reading of your record.
export default function Brain() {
  const insets = useSafeAreaInsets();
  const { L, ar, start } = useLocale();
  const { data } = useStore();
  const [thread, setThread] = useState<{ key: string; msgs: Msg[] }>({ key: '', msgs: [] });
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [keyboardUp, setKeyboardUp] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', () => setKeyboardUp(true));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboardUp(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const ctx = buildBrainContext(data.snaps, data.profile);

  // A conversation belongs to one record in one language: when either
  // changes, the old thread no longer matches the key and a fresh one
  // starts. The briefing always opens it.
  const last = data.snaps[data.snaps.length - 1];
  const convKey = `${ar ? 'ar' : 'en'}|${data.snaps.length}|${last ? `${last.year}-${last.month}-${last.income}-${last.expenses}` : ''}`;
  const asked = thread.key === convKey ? thread.msgs : [];
  const msgs: Msg[] = ctx ? [{ role: 'brain', content: composeBriefing(ctx, ar) }, ...asked] : [];

  const ask = (q: string) => {
    const text = q.trim();
    if (!text || !ctx || thinking) return;
    setInput('');
    const withQuestion: Msg[] = [...asked, { role: 'user', content: text }];
    setThread({ key: convKey, msgs: withQuestion });
    setThinking(true);
    // a breath before answering, so the reply reads as considered
    setTimeout(() => {
      setThread({ key: convKey, msgs: [...withQuestion, { role: 'brain', content: composeLocalReply(text, ctx, ar) }] });
      setThinking(false);
      haptic.tap();
    }, 650);
  };

  const suggestions = [
    L('كيف مصروفي هذه الأشهر؟', 'How is my spending these months?'),
    L('هل ادخاري كافٍ مقارنة بالسعوديين؟', 'Is my saving enough compared to other Saudis?'),
    L('متى أستطيع التقاعد وكم سيكون معاشي؟', 'When can I retire, and what would my pension be?'),
    L('ما مدى تقلّب مالي؟', 'How volatile is my money?'),
  ];
  const canSend = !!input.trim() && !!ctx && !thinking;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
      {/* the showcase: watch the Brain work four problems end to end */}
      <Stack.Screen
        options={{
          headerRight: () => (
            <IconButton icon="play.circle" emoji="▶" label={L('شاهد العقل يعمل', 'Watch the Brain at work')} onPress={() => router.push('/showcase')} tint={C.goldText} bg="transparent" size={34} />
          ),
        }}
      />
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16, gap: 12, paddingTop: Platform.OS === 'web' ? 24 : 8, paddingBottom: 96 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {!ctx && (
          <Animated.View entering={enter(0)}>
            <Muted>{L('سجّل شهراً في السِّجل، ويقرأ العقل أرقامك ويجيب منها.', 'Log a month in the Log, and the Brain reads your numbers and answers from them.')}</Muted>
          </Animated.View>
        )}

        {msgs.map((m, i) => (
          <Animated.View
            key={i}
            entering={bubble()}
            style={{
              alignSelf: m.role === 'user' ? (ar ? 'flex-start' : 'flex-end') : 'stretch',
              maxWidth: m.role === 'user' ? '85%' : '100%',
              backgroundColor: m.role === 'user' ? C.green : C.card,
              borderWidth: m.role === 'user' ? 0 : 1, borderColor: C.borderFaint,
              borderRadius: 20, borderCurve: 'continuous', paddingHorizontal: 14, paddingVertical: 10,
            }}
          >
            {m.role === 'brain' && (
              <Row gap={6} style={{ marginBottom: 6 }}>
                <Icon sf="brain.head.profile" emoji="🧠" size={13} color={C.gold} />
                <Muted style={{ fontSize: 11, fontWeight: '700', color: C.gold }}>{L('العقل', 'The Brain')}</Muted>
              </Row>
            )}
            {m.role === 'user' ? <T style={{ color: '#fff' }}>{m.content}</T> : <RichMessage content={m.content} />}
          </Animated.View>
        ))}
        {thinking && (
          <Animated.View entering={bubble()} style={{ alignSelf: ar ? 'flex-end' : 'flex-start', backgroundColor: C.card, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12 }}>
            <Row gap={5}>{[0, 1, 2].map((i) => <Dot key={i} i={i} />)}</Row>
          </Animated.View>
        )}

        {ctx && msgs.length <= 1 && (
          <View style={{ gap: 8 }}>
            {suggestions.map((s, i) => (
              <Animated.View key={s} entering={bubble(i + 2)} style={{ alignSelf: ar ? 'flex-end' : 'flex-start' }}>
                <Press onPress={() => ask(s)} haptics="select">
                  <Row gap={6} style={{ borderWidth: 1, borderColor: C.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 }}>
                    <Icon sf="sparkles" emoji="✨" size={12} color={C.gold} />
                    <T style={{ fontSize: 13, color: C.ink2 }}>{s}</T>
                  </Row>
                </Press>
              </Animated.View>
            ))}
          </View>
        )}
        <Muted style={{ fontSize: 10, marginTop: 6 }}>{L('معلومات تعليمية، وليست نصيحة مالية مرخّصة.', 'Educational information, not licensed financial advice.')}</Muted>
      </ScrollView>

      {/* the composer floats on glass above the tab bar (which overlays the
          screen's bottom edge on iPhone) — except while the keyboard is up */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12, paddingTop: 8, paddingBottom: keyboardUp ? 8 : insets.bottom + 8 }}>
        <Glass
          fallback={C.card}
          interactive
          style={{
            borderRadius: 28, borderCurve: 'continuous', paddingVertical: 6, paddingHorizontal: 6,
            borderWidth: HAS_GLASS ? 0 : 1, borderColor: C.border,
          }}
        >
          <Row gap={6}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={L('اسأل عن أي شيء في مالك…', 'Ask anything about your money…')}
              placeholderTextColor={C.muted}
              onSubmitEditing={() => ask(input)}
              returnKeyType="send"
              editable={!!ctx}
              style={{ flex: 1, color: C.ink, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, textAlign: start }}
            />
            <IconButton
              icon="arrow.up"
              emoji={ar ? '←' : '→'}
              label={L('أرسل', 'Send')}
              onPress={() => ask(input)}
              disabled={!canSend}
              tint="#FFFFFF"
              bg={C.green}
              size={36}
            />
          </Row>
        </Glass>
      </View>
    </KeyboardAvoidingView>
  );
}

