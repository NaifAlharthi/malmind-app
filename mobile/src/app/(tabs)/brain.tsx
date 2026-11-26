import { useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import RichMessage from '@/components/RichMessage';
import { Eyebrow, Muted, Row, T, Title } from '@/components/ui';
import { buildBrainContext, composeBriefing, composeLocalReply } from '@shared/brainCompose';
import { useLocale } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import { C, radius } from '@/lib/theme';

interface Msg { role: 'user' | 'brain'; content: string }

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
    }, 450);
  };

  const suggestions = [
    L('كيف مصروفي هذه الأشهر؟', 'How is my spending these months?'),
    L('هل ادخاري كافٍ مقارنة بالسعوديين؟', 'Is my saving enough compared to other Saudis?'),
    L('متى أستطيع التقاعد وكم سيكون معاشي؟', 'When can I retire, and what would my pension be?'),
    L('ما مدى تقلّب مالي؟', 'How volatile is my money?'),
  ];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16, gap: 12, paddingTop: Platform.OS === 'web' ? 24 : 8 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      >
        <Eyebrow>{L('العقل', 'THE BRAIN')}</Eyebrow>
        <Title>🧠 {L('اسأل العقل', 'Ask the Brain')}</Title>
        {!ctx && <Muted>{L('سجّل شهراً في السِّجل، ويقرأ العقل أرقامك ويجيب منها.', 'Log a month in the Log, and the Brain reads your numbers and answers from them.')}</Muted>}

        {msgs.map((m, i) => (
          <View
            key={i}
            style={{
              alignSelf: m.role === 'user' ? (ar ? 'flex-start' : 'flex-end') : 'stretch',
              maxWidth: m.role === 'user' ? '85%' : '100%',
              backgroundColor: m.role === 'user' ? C.green : C.card,
              borderWidth: m.role === 'user' ? 0 : 1, borderColor: C.border,
              borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10,
            }}
          >
            {m.role === 'user' ? <T style={{ color: '#fff' }}>{m.content}</T> : <RichMessage content={m.content} />}
          </View>
        ))}
        {thinking && <Muted>{L('يفكّر…', 'Thinking…')}</Muted>}

        {ctx && msgs.length <= 1 && (
          <View style={{ gap: 8 }}>
            {suggestions.map((s) => (
              <Pressable key={s} onPress={() => ask(s)} style={{ borderWidth: 1, borderColor: C.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, alignSelf: ar ? 'flex-end' : 'flex-start' }}>
                <T style={{ fontSize: 13, color: C.ink2 }}>{s}</T>
              </Pressable>
            ))}
          </View>
        )}
        <Muted style={{ fontSize: 10, marginTop: 6 }}>{L('معلومات تعليمية، وليست نصيحة مالية مرخّصة.', 'Educational information, not licensed financial advice.')}</Muted>
      </ScrollView>

      {/* the tab bar overlays the screen's bottom edge on iPhone, so the
          bar sits above the safe area — except while the keyboard is up */}
      <Row style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: keyboardUp ? 8 : insets.bottom + 8, borderTopWidth: 1, borderTopColor: C.borderFaint, backgroundColor: C.bg }}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={L('اسأل عن أي شيء في مالك…', 'Ask anything about your money…')}
          placeholderTextColor={C.muted}
          onSubmitEditing={() => ask(input)}
          returnKeyType="send"
          editable={!!ctx}
          style={{ flex: 1, color: C.ink, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, textAlign: start }}
        />
        <Pressable
          onPress={() => ask(input)}
          disabled={!input.trim() || !ctx}
          style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', opacity: input.trim() ? 1 : 0.4 }}
        >
          <T center style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>{ar ? '←' : '→'}</T>
        </Pressable>
      </Row>
    </KeyboardAvoidingView>
  );
}
