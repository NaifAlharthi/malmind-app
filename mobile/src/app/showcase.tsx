import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View, type ScrollViewInstance } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarChart, LineChart } from '@/components/charts';
import { Icon } from '@/components/Icon';
import { Button, Card, Chip, Muted, Press, Row, T } from '@/components/ui';
import { getPersona } from '@shared/demoWorld';
import { buildScenarios, SHOWCASE_NOTE, type Bi, type ShowStep, type Tone } from '@shared/showcase';
import { haptic } from '@/lib/haptics';
import { useLocale } from '@/lib/i18n';
import { openPath } from '@/lib/links';
import { bubble, enter } from '@/lib/motion';
import { IN_APP, SHOWCASE_OPEN, SHOWCASE_SEE, showcaseEffect } from '@/lib/showcaseEffects';
import { useStore } from '@/lib/store';
import { C, radius } from '@/lib/theme';

const TONE: Record<Tone, string> = { good: C.greenText, ok: C.gold, bad: C.red, neutral: C.ink };

// how long each kind of step holds the stage at 1× (ms)
function dwell(s: ShowStep): number {
  switch (s.kind) {
    case 'user': return 1300;
    case 'say': return Math.min(4200, 1600 + s.text.en.length * 9);
    case 'tool': return 1250;
    case 'metrics': return 2300;
    case 'chart': return 2600;
    case 'act': return 1100;
    case 'outcome': return 2800;
    case 'plan': return 0;
  }
}

/** the run, felt: a tool or action finishing ticks; a plan arriving asks;
    the outcome landing succeeds */
function feel(finished: ShowStep, next: ShowStep | undefined) {
  if (finished.kind === 'tool') haptic.select();
  else if (finished.kind === 'act') haptic.tap();
  if (next?.kind === 'plan') haptic.warn();
  else if (next?.kind === 'outcome') haptic.success();
}

// The Showcase on the phone — the four problems MalMind exists to solve,
// each played end to end on a demo persona's data, with the Brain working
// as the agentic AI layer. Same scenarios as malmind.ai/showcase
// (shared lib/showcase.ts); every figure comes from the persona's data.
export default function Showcase() {
  const insets = useSafeAreaInsets();
  const { L, ar, row } = useLocale();
  const { enterDemoWith, mode, personaId } = useStore();
  const params = useLocalSearchParams<{ s?: string }>();
  const b = (x: Bi) => (ar ? x.ar : x.en);

  const scenarios = useMemo(() => buildScenarios(), []);
  const [run, setRun] = useState(() => ({ idx: Math.max(0, scenarios.findIndex((s) => s.id === params.s)), shown: 1, approved: false }));
  const [speed, setSpeed] = useState<1 | 2>(1);
  const [auto, setAuto] = useState(false);
  const scrollRef = useRef<ScrollViewInstance>(null);

  const sc = scenarios[run.idx];
  const persona = getPersona(sc.personaId);
  const steps = sc.steps;
  const planAt = steps.findIndex((s) => s.kind === 'plan');
  const waiting = run.shown - 1 === planAt && !run.approved;
  const done = run.shown >= steps.length;

  const go = (idx: number, autoplay = auto) => {
    haptic.firm();
    setAuto(autoplay);
    setRun({ idx, shown: 1, approved: false });
  };
  // approving carries the plan out for real: the persona's demo world opens
  // fresh, with the plan's changes applied (lib/showcaseEffects.ts)
  const carryOut = (id: string) => enterDemoWith(id, showcaseEffect(id, ar));
  const approve = () => {
    haptic.success();
    carryOut(sc.id);
    setRun((r) => ({ ...r, approved: true, shown: r.shown + 1 }));
  };
  const skip = () => {
    if (!run.approved) carryOut(sc.id);
    setRun((r) => ({ ...r, approved: true, shown: steps.length }));
  };

  // the clock: reveal the next step after this one's dwell; pause on the plan
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    if (waiting) {
      if (auto) {
        t = setTimeout(() => {
          haptic.success();
          enterDemoWith(sc.id, showcaseEffect(sc.id, ar));
          setRun((r) => ({ ...r, approved: true, shown: r.shown + 1 }));
        }, 2600 / speed);
      }
    } else if (!done) {
      t = setTimeout(() => {
        feel(steps[run.shown - 1], steps[run.shown]);
        setRun((r) => ({ ...r, shown: r.shown + 1 }));
      }, dwell(steps[run.shown - 1]) / speed);
    } else if (auto && run.idx < scenarios.length - 1) {
      t = setTimeout(() => { haptic.firm(); setRun({ idx: run.idx + 1, shown: 1, approved: false }); }, 4000 / speed);
    }
    return () => clearTimeout(t);
  }, [run, waiting, done, auto, speed, steps, scenarios.length, sc.id, ar, enterDemoWith]);

  // open the app as this persona — the plan already carried out in their
  // world (re-applied if another persona has been opened since)
  const openAs = (href: string) => {
    if (!(mode === 'demo' && personaId === sc.personaId)) carryOut(sc.id);
    if (router.canDismiss()) router.dismissAll();
    openPath(IN_APP[href] ?? href);
  };

  // [label](/path) in the Brain's words → tappable, as this persona
  const rich = (text: string) => {
    const out: React.ReactNode[] = [];
    const re = /\[([^\]]+)\]\((\/[^)\s]*)\)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) out.push(text.slice(last, m.index));
      const href = m[2];
      out.push(
        <Text key={m.index} onPress={() => openAs(href)} style={{ color: C.greenText, fontWeight: '700', textDecorationLine: 'underline' }}>{m[1]}</Text>,
      );
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  };

  const renderStep = (s: ShowStep, i: number) => {
    const live = i === run.shown - 1 && !done && !waiting;
    const key = `${run.idx}-${i}`;
    switch (s.kind) {
      case 'user':
        return (
          <Animated.View key={key} entering={bubble()} style={{ alignSelf: ar ? 'flex-start' : 'flex-end', maxWidth: '86%', backgroundColor: C.green, borderRadius: 20, borderCurve: 'continuous', paddingHorizontal: 14, paddingVertical: 10 }}>
            <T style={{ color: '#fff' }}>{b(s.text)}</T>
          </Animated.View>
        );
      case 'say':
        return (
          <Animated.View key={key} entering={bubble()} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.borderFaint, borderRadius: 20, borderCurve: 'continuous', paddingHorizontal: 14, paddingVertical: 11, gap: 6 }}>
            <Row gap={6}>
              <Icon sf="brain.head.profile" emoji="🧠" size={13} color={C.gold} />
              <Muted style={{ fontSize: 11, fontWeight: '700', color: C.gold }}>{L('العقل', 'The Brain')}</Muted>
            </Row>
            <Text style={{ color: C.ink, fontSize: 14, lineHeight: 22, textAlign: ar ? 'right' : 'left', writingDirection: ar ? 'rtl' : 'ltr' }}>{rich(b(s.text))}</Text>
          </Animated.View>
        );
      case 'tool':
        return (
          <Animated.View key={key} entering={enter(0)}>
            <Row gap={10} style={{ alignItems: 'flex-start', borderWidth: 1, borderStyle: 'dashed', borderColor: C.border, borderRadius: radius.md, backgroundColor: C.card2, padding: 10 }}>
              <View style={{ width: 20, alignItems: 'center', paddingTop: 1 }}>
                {live ? <ActivityIndicator size="small" color={C.gold} /> : <Icon sf="checkmark.circle.fill" emoji="✅" size={18} color={C.green} />}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Row gap={6} wrap>
                  <Text style={{ fontFamily: 'Menlo', fontSize: 10, color: C.muted, backgroundColor: C.card, paddingHorizontal: 5, borderRadius: 4, overflow: 'hidden' }}>{s.tool}()</Text>
                  <T style={{ fontSize: 12, color: C.ink2, flexShrink: 1 }}>{b(s.label)}</T>
                </Row>
                {!live && <T style={{ fontSize: 13, fontWeight: '600' }}>{b(s.result)}</T>}
              </View>
            </Row>
          </Animated.View>
        );
      case 'metrics':
        return (
          <Card key={key} delay={0} style={{ gap: 10 }}>
            <T style={{ fontSize: 12, fontWeight: '700', color: C.ink2 }}>{b(s.title)}</T>
            <View style={{ flexDirection: row, flexWrap: 'wrap', gap: 8 }}>
              {s.items.map((m, k) => (
                <Animated.View key={k} entering={enter(k)} style={{ width: '48%', flexGrow: 1, backgroundColor: C.card2, borderRadius: radius.md, padding: 10 }}>
                  <Muted style={{ fontSize: 10 }}>{b(m.label)}</Muted>
                  <T style={{ fontSize: 16, fontWeight: '800', color: TONE[m.tone ?? 'neutral'], fontVariant: ['tabular-nums'] }}>{b(m.value)}</T>
                </Animated.View>
              ))}
            </View>
          </Card>
        );
      case 'chart':
        return (
          <Card key={key} delay={0} style={{ gap: 8 }}>
            <Row gap={6}>
              <Icon sf="chart.xyaxis.line" emoji="📊" size={13} />
              <T style={{ fontSize: 12, fontWeight: '700', color: C.ink2, flex: 1 }}>{b(s.title)}</T>
            </Row>
            {s.type === 'line'
              ? <LineChart labels={s.labels.map(b)} series={s.series.map((x, k) => ({ key: `${k}`, data: x.data, color: x.color, strong: true }))} height={160} />
              : <BarChart labels={s.labels.map(b)} values={s.series[0].data} color={() => s.series[0].color} height={160} />}
            {s.series.length > 1 && (
              <Row wrap gap={10}>
                {s.series.map((x) => (
                  <Row key={x.name.en} gap={5}>
                    <View style={{ width: 12, height: 4, borderRadius: 2, backgroundColor: x.color }} />
                    <Muted style={{ fontSize: 10 }}>{b(x.name)}</Muted>
                  </Row>
                ))}
              </Row>
            )}
            {s.type === 'bar' && <Muted style={{ fontSize: 10 }}>{s.labels.map(b).join(' · ')}</Muted>}
          </Card>
        );
      case 'plan':
        return (
          <Card key={key} delay={0} tone="gold" style={{ gap: 10, borderWidth: 1.5, borderColor: C.gold }}>
            <Muted style={{ fontSize: 10, fontWeight: '700', color: C.gold, letterSpacing: 1 }}>{L('خطة مقترحة', 'PROPOSED PLAN')}</Muted>
            <T style={{ fontSize: 16, fontWeight: '800' }}>{b(s.title)}</T>
            {s.actions.map((a, k) => (
              <Row key={k} gap={10} style={{ alignItems: 'flex-start' }}>
                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#2A1F05', fontSize: 11, fontWeight: '800' }}>{k + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <T style={{ fontSize: 13 }}>{b(a.label)}</T>
                  <T style={{ fontSize: 11, fontWeight: '700', color: C.greenText }}>{b(a.impact)}</T>
                </View>
              </Row>
            ))}
            {waiting ? (
              <View style={{ gap: 6 }}>
                <Button icon="checkmark" haptics={false} label={L('وافق ونفّذ', 'Approve & run')} onPress={approve} />
                <Muted center style={{ fontSize: 11 }}>
                  {auto ? L('موافقة تلقائية بعد لحظات…', 'Auto-approving in a moment…') : L('لا شيء يُنفَّذ قبل موافقتك.', 'Nothing runs until you approve.')}
                  {' '}
                  {L(`تُنفَّذ في عالم ${persona.firstNameAr} التجريبي — بياناتك لا تُمسّ.`, `It runs in ${persona.firstName}'s demo world — your own data is untouched.`)}
                </Muted>
              </View>
            ) : (
              <Row gap={6}>
                <Icon sf="checkmark.seal.fill" emoji="✅" size={14} color={C.greenText} />
                <T style={{ fontSize: 12, fontWeight: '700', color: C.greenText }}>{L('تمت الموافقة — العقل ينفّذ', 'Approved — the Brain is carrying it out')}</T>
              </Row>
            )}
          </Card>
        );
      case 'act':
        return (
          <Animated.View key={key} entering={enter(0)}>
            <Row gap={10} style={{ backgroundColor: C.greenBg, borderWidth: 1, borderColor: C.greenBorder, borderRadius: radius.md, padding: 10 }}>
              <View style={{ width: 20, alignItems: 'center' }}>
                {live ? <ActivityIndicator size="small" color={C.greenText} /> : <Icon sf="bolt.circle.fill" emoji="⚡" size={18} color={C.greenText} />}
              </View>
              <View style={{ flex: 1 }}>
                <T style={{ fontSize: 13, fontWeight: '700' }}>{b(s.label)}</T>
                {!live && <Muted style={{ color: C.ink2 }}>{b(s.result)}</Muted>}
              </View>
            </Row>
          </Animated.View>
        );
      case 'outcome':
        return (
          <Card key={key} delay={0} tone="hero" style={{ gap: 4 }}>
            <Row gap={6} style={{ marginBottom: 4 }}>
              <Icon sf="arrow.left.arrow.right" emoji="⚖️" size={13} color={C.goldText} />
              <T style={{ fontSize: 12, fontWeight: '700', color: C.goldText }}>{b(s.title)}</T>
            </Row>
            {s.rows.map((r, k) => (
              <Animated.View key={k} entering={enter(k)} style={{ paddingVertical: 6, borderTopWidth: k ? 1 : 0, borderTopColor: 'rgba(255,255,255,0.08)', gap: 2 }}>
                <Muted style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }}>{b(r.label)}</Muted>
                <Row gap={8}>
                  <T style={{ color: C.red, textDecorationLine: 'line-through', fontSize: 13, opacity: 0.85 }}>{b(r.before)}</T>
                  <Icon sf={ar ? 'arrow.left' : 'arrow.right'} emoji={ar ? '←' : '→'} size={11} color={C.muted} />
                  <T style={{ color: C.greenText, fontWeight: '800', fontSize: 15, flexShrink: 1 }}>{b(r.after)}</T>
                </Row>
              </Animated.View>
            ))}
          </Card>
        );
    }
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1, backgroundColor: C.bg }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 40 }}
      onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
    >
      <T style={{ fontSize: 13, color: C.ink2, lineHeight: 20 }}>
        {L(
          'لكل مشكلة شخصية. العقل يعمل كطبقة ذكاء وكيلة: يقرأ المصادر، ويشغّل أدواته، ويشرح المعنى، ويقترح خطة — وينفّذها بعد موافقتك.',
          'One persona per problem. The Brain works as an agentic AI layer: it reads the sources, runs its tools, explains the meaning, proposes a plan — and carries it out once you approve.'
        )}
      </T>

      {/* the four problems */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: row, gap: 8 }}>
        {scenarios.map((s, i) => {
          const p = getPersona(s.personaId);
          const on = i === run.idx;
          return (
            <Press key={s.id} haptics={false} onPress={() => go(i, false)}>
              <View style={{ width: 150, padding: 11, gap: 4, borderRadius: radius.lg, borderCurve: 'continuous', borderWidth: 1, borderColor: on ? C.green : C.borderFaint, backgroundColor: on ? C.greenBg : C.card }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Muted style={{ fontSize: 9, fontWeight: '700', color: C.gold }}>{L(`المشكلة ${s.problem.n}`, `PROBLEM ${s.problem.n}`)}</Muted>
                  <Text style={{ fontSize: 16 }}>{s.problem.icon}</Text>
                </Row>
                <T numberOfLines={2} style={{ fontSize: 12, fontWeight: '700' }}>{b(s.problem.title)}</T>
                <Row gap={5}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: p.accent }} />
                  <Muted style={{ fontSize: 10 }}>{ar ? p.firstNameAr : p.firstName}</Muted>
                </Row>
              </View>
            </Press>
          );
        })}
      </ScrollView>

      <Row wrap gap={6}>
        <Button small icon="play.fill" haptics={false} label={L('شغّل الأربع', 'Play all four')} onPress={() => go(0, true)} />
        <Button small kind="secondary" icon="arrow.counterclockwise" haptics={false} label={L('أعد', 'Replay')} onPress={() => go(run.idx)} />
        <Chip label={`${speed}×`} on={speed === 2} onPress={() => setSpeed((x) => (x === 1 ? 2 : 1))} />
        <Chip label={L('موافقة تلقائية', 'Auto-approve')} on={auto} onPress={() => setAuto((x) => !x)} />
        {!done && <Chip label={L('إلى النتيجة ⇥', 'Skip ⇥')} on={false} onPress={skip} />}
      </Row>

      {/* the case file */}
      <Card tone="hero" style={{ gap: 6 }}>
        <Row gap={10}>
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: persona.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>{(ar ? persona.firstNameAr : persona.firstName).slice(0, 1)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <T style={{ fontWeight: '800' }}>{b(sc.person)}</T>
            <Muted style={{ color: C.goldText, fontSize: 11 }}>{`${sc.problem.icon} ${b(sc.problem.title)}`}</Muted>
          </View>
        </Row>
        <Muted style={{ color: 'rgba(255,255,255,0.75)' }}>{b(sc.challenge)}</Muted>
        <View style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden', flexDirection: row }}>
          <View style={{ width: `${(run.shown / steps.length) * 100}%`, backgroundColor: C.greenText }} />
        </View>
        <Muted style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
          {done ? L('اكتمل ✓', 'Complete ✓') : waiting ? L('بانتظار موافقتك على الخطة', 'Waiting for your approval') : L('العقل يعمل…', 'The Brain is working…')}
        </Muted>
      </Card>

      {steps.slice(0, run.shown).map(renderStep)}

      {done && (
        <Animated.View entering={enter(1)} style={{ gap: 8 }}>
          <Row gap={6} style={{ alignItems: 'flex-start' }}>
            <Icon sf="checkmark.seal.fill" emoji="✅" size={14} color={C.greenText} />
            <T style={{ flex: 1, fontSize: 12, color: C.ink2 }}>
              {`${L('نُفّذت الخطة. تجدها في ', 'The plan is carried out. Find it in ')}${b(SHOWCASE_SEE[sc.id])}`}
            </T>
          </Row>
          <Button icon="arrow.up.forward.app" label={b(sc.open.label)} onPress={() => openAs(SHOWCASE_OPEN[sc.id] ?? sc.open.app)} />
          {auto && run.idx < scenarios.length - 1 && <Muted center>{L('المشكلة التالية بعد لحظات…', 'Next problem in a moment…')}</Muted>}
        </Animated.View>
      )}

      <Muted style={{ fontSize: 10, marginTop: 8 }}>{b(SHOWCASE_NOTE)}</Muted>
    </ScrollView>
  );
}
