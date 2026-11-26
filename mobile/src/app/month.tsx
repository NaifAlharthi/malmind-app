import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MonthStepper } from '@/components/ledgers';
import { Button, Card, Heading, IconButton, Muted, Row, T, Title } from '@/components/ui';
import type { SFSymbol } from '@/components/Icon';
import { assetsOf, fmt, netWorthOf, ymKey } from '@/lib/finance';
import { haptic } from '@/lib/haptics';
import { useLocale } from '@/lib/i18n';
import { FIELDS, useStore, type Field, type Snap } from '@/lib/store';
import { C, radius } from '@/lib/theme';

// Edit (or add) one month of the Log. An existing month loads its numbers;
// a new one starts as a copy of the latest month, so only what changed
// needs typing. Saving upserts the month into the same table malmind.ai
// edits — the web and the phone always show one record.
export default function MonthEditor() {
  const insets = useSafeAreaInsets();
  const { L, start } = useLocale();
  const { data, saveMonths, deleteMonth } = useStore();
  const params = useLocalSearchParams<{ ym?: string }>();
  const latest = data.snaps[data.snaps.length - 1];
  const now = new Date();
  const [ym, setYm] = useState(params.ym ?? (latest ? ymKey(latest) : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`));
  const year = Number(ym.slice(0, 4));
  const month = Number(ym.slice(5, 7));
  const existing = data.snaps.find((s) => s.year === year && s.month === month);

  const base: Snap = useMemo(() => {
    const src = existing ?? latest;
    const s = { year, month } as Snap;
    for (const f of FIELDS) s[f] = src ? src[f] : 0;
    return s;
  }, [existing, latest, year, month]);

  const [drafts, setDrafts] = useState<Partial<Record<Field, string>>>({});
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState<Field | null>(null);
  const [error, setError] = useState<string | null>(null);

  // opened from a deep link there is no screen behind the sheet — fall back to the Log
  const leave = () => (router.canGoBack() ? router.back() : router.replace('/log'));

  const changeMonth = (next: string) => { setYm(next); setDrafts({}); setError(null); };
  const valueOf = (f: Field) => (drafts[f] !== undefined ? Number(drafts[f]!.replace(/[^\d.-]/g, '')) || 0 : base[f]);
  const merged = { ...base } as Snap;
  for (const f of FIELDS) merged[f] = valueOf(f);

  const LABELS: Record<Field, string> = {
    cash: L('النقد', 'Cash'), stocks: L('الأسهم', 'Stocks'), equity: L('حصص وملكيات', 'Equity stakes'),
    real_estate: L('العقار', 'Real estate'), other_assets: L('أصول أخرى', 'Other assets'),
    liabilities: L('الالتزامات (إجمالي الديون)', 'Liabilities (total debts)'),
    income: L('دخل الشهر', 'Income this month'), expenses: L('مصروف الشهر', 'Spending this month'),
  };
  const GROUPS: { title: string; sf: SFSymbol; emoji: string; fields: Field[] }[] = [
    { title: L('ما تملكه', 'What you own'), sf: 'building.columns', emoji: '🏛', fields: ['cash', 'stocks', 'equity', 'real_estate', 'other_assets'] },
    { title: L('ما عليك', 'What you owe'), sf: 'link', emoji: '⛓', fields: ['liabilities'] },
    { title: L('تدفّق الشهر', 'The month’s flow'), sf: 'arrow.left.arrow.right', emoji: '🔄', fields: ['income', 'expenses'] },
  ];

  const save = async () => {
    setBusy(true);
    setError(null);
    const err = await saveMonths([merged]);
    setBusy(false);
    if (err) { haptic.error(); setError(L(`تعذّر الحفظ — لم يُفقد شيء. (${err})`, `Could not save — nothing was lost. (${err})`)); }
    else { haptic.success(); leave(); }
  };

  const remove = () => {
    haptic.warn();
    Alert.alert(L('حذف هذا الشهر؟', 'Delete this month?'), L('يُحذف من سِجلّك نهائياً.', 'It is removed from your Log permanently.'), [
      { text: L('إلغاء', 'Cancel'), style: 'cancel' },
      {
        text: L('احذف', 'Delete'), style: 'destructive',
        onPress: async () => {
          const err = await deleteMonth(year, month);
          if (err) setError(err);
          else leave();
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ padding: 18, paddingTop: Platform.OS === 'ios' ? 26 : 18, paddingBottom: insets.bottom + 32, gap: 14 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <Row style={{ justifyContent: 'space-between' }}>
          <Title style={{ fontSize: 24, flex: 1 }}>{existing ? L('عدّل الشهر', 'Edit the month') : L('شهر جديد', 'A new month')}</Title>
          <IconButton icon="xmark" emoji="✕" label={L('إغلاق', 'Close')} onPress={leave} />
        </Row>
        <View style={{ alignItems: 'center', gap: 6 }}>
          <MonthStepper ym={ym} onChange={changeMonth} />
          {!existing && (
            <Muted center style={{ fontSize: 11, color: C.gold }}>
              {latest ? L('شهر جديد — نسخة من آخر شهر، غيّر ما تغيّر فقط.', 'A new month — a copy of your latest; change only what changed.') : L('أول شهر في سِجلّك.', 'The first month in your Log.')}
            </Muted>
          )}
        </View>

        {GROUPS.map((g) => (
          <Card key={g.title} style={{ gap: 10 }}>
            <Heading icon={g.sf} emoji={g.emoji} size={15}>{g.title}</Heading>
            {g.fields.map((f) => (
              <Row key={f} style={{ justifyContent: 'space-between' }}>
                <T style={{ flex: 1, fontSize: 13, color: C.ink2 }}>{LABELS[f]}</T>
                <TextInput
                  value={drafts[f] ?? String(Math.round(base[f]))}
                  onChangeText={(t) => setDrafts((p) => ({ ...p, [f]: t }))}
                  onFocus={() => setFocused(f)}
                  onBlur={() => setFocused((cur) => (cur === f ? null : cur))}
                  selectTextOnFocus
                  keyboardType="decimal-pad"
                  style={{
                    width: 130, color: C.ink, fontSize: 15, fontWeight: '600', textAlign: start, fontVariant: ['tabular-nums'],
                    backgroundColor: C.card2, borderWidth: 1.5,
                    borderColor: focused === f ? C.green : drafts[f] !== undefined ? C.gold : 'transparent',
                    borderRadius: radius.md, borderCurve: 'continuous', paddingHorizontal: 10, paddingVertical: 8,
                  }}
                />
              </Row>
            ))}
          </Card>
        ))}

        {/* what this month adds up to, live */}
        <Card tone="hero" style={{ gap: 4 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Muted style={{ color: 'rgba(255,255,255,0.6)' }}>{L('إجمالي الأصول', 'Total assets')}</Muted>
            <T style={{ fontWeight: '700' }}>{fmt(assetsOf(merged))}</T>
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <Muted style={{ color: 'rgba(255,255,255,0.6)' }}>{L('يبقى هذا الشهر', 'Saved this month')}</Muted>
            <T style={{ fontWeight: '700', color: merged.income - merged.expenses >= 0 ? C.greenText : C.red }}>{fmt(merged.income - merged.expenses)}</T>
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <T style={{ fontWeight: '800', color: C.greenText }}>{L('صافي الثروة', 'Net worth')}</T>
            <T style={{ fontWeight: '800', fontSize: 18, color: netWorthOf(merged) >= 0 ? C.greenText : C.red }}>{fmt(netWorthOf(merged))}</T>
          </Row>
        </Card>

        {error ? <T style={{ color: C.red, fontSize: 12 }}>{error}</T> : null}
        <Button icon="checkmark" haptics={false} label={busy ? L('يحفظ…', 'Saving…') : L('احفظ الشهر', 'Save the month')} onPress={save} disabled={busy} />
        {existing && <Button kind="danger" icon="trash" haptics={false} label={L('احذف هذا الشهر', 'Delete this month')} onPress={remove} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
