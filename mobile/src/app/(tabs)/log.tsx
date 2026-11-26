import { useRef, useState } from 'react';
import { Pressable, ScrollView, View, type ScrollViewInstance } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { LineChart } from '@/components/charts';
import { CORE_KEYS, LedgerPanel, coreHeadline, type CoreKey } from '@/components/ledgers';
import { Button, Card, Chip, Eyebrow, H2, Muted, Row, Screen, Stat, T, Title } from '@/components/ui';
import { ledgerHeadline } from '@shared/ledgerPresets';
import { assetsOf, compact, fmt, netWorthOf, vitals, ymKey } from '@/lib/finance';
import { MONTHS_AR, MONTHS_EN, monthShort, useLocale } from '@/lib/i18n';
import { useStore, type Snap } from '@/lib/store';
import { C, radius } from '@/lib/theme';

const SHOWN = 12;

// The Log — the person's database, in the website's three movements:
// the Summary (how far the record reaches + the chart), the record itself
// (the full table, hidden until asked for), and the ledgers drawer (big
// buttons; one opens beneath at a time; ＋ adds your own).
export default function LogScreen() {
  const { L, ar, row } = useLocale();
  const { data, refresh, refreshing } = useStore();
  const params = useLocalSearchParams<{ spot?: string }>();
  const v = vitals(data);
  const [lines, setLines] = useState({ nw: true, income: true, expenses: true });
  const [tableShown, setTableShown] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const gridRef = useRef<ScrollViewInstance>(null);
  const drawerRef = useRef<ScrollViewInstance>(null);

  // the Brain's pointing finger: /log?spot=spending opens that ledger —
  // each time a NEW spot arrives (adjusting state when a param changes)
  const [seenSpot, setSeenSpot] = useState<string | undefined>(undefined);
  if (params.spot !== seenSpot) {
    setSeenSpot(params.spot);
    if (params.spot && (CORE_KEYS as string[]).includes(params.spot)) setOpenKey(params.spot);
  }

  const monthLong = (s: Snap) => `${(ar ? MONTHS_AR : MONTHS_EN)[s.month - 1]} ${s.year}`;
  const shortOf = (s: Snap) => monthShort(s.month, s.year, ar);

  if (!v.hasData || !v.first) {
    return (
      <Screen onRefresh={refresh} refreshing={refreshing}>
        <Eyebrow>{L('السِّجل', 'THE LOG')}</Eyebrow>
        <Title>📒 {L('سِجلّك', 'Your Log')}</Title>
        <Card style={{ gap: 10 }}>
          <Muted>{L('سجّل شهرك الأول — يبدأ منه كل شيء: الملخّص، والجدول، والدفاتر، والعقل.', 'Log your first month — everything starts from it: the summary, the table, the ledgers, the Brain.')}</Muted>
          <Button label={L('سجّل شهراً', 'Log a month')} onPress={() => router.push('/month')} />
        </Card>
      </Screen>
    );
  }

  const chartSnaps = data.snaps.slice(-12);
  const cols = data.snaps.slice(-SHOWN);

  // ── the grid's rows ──
  type GridRow = { key: string; name: string; get: (s: Snap) => number; strong?: boolean; color?: (v: number) => string };
  const ROWS: GridRow[] = [
    { key: 'assets', name: L('إجمالي الأصول', 'Total assets'), get: assetsOf, strong: true },
    { key: 'cash', name: L('النقد', 'Cash'), get: (s) => s.cash },
    { key: 'stocks', name: L('الأسهم', 'Stocks'), get: (s) => s.stocks },
    { key: 'equity', name: L('حصص وملكيات', 'Equity stakes'), get: (s) => s.equity },
    { key: 're', name: L('العقار', 'Real estate'), get: (s) => s.real_estate },
    { key: 'other', name: L('أصول أخرى', 'Other assets'), get: (s) => s.other_assets },
    { key: 'liab', name: L('الالتزامات', 'Liabilities'), get: (s) => s.liabilities, strong: true, color: () => C.red },
    { key: 'inc', name: L('الدخل', 'Income'), get: (s) => s.income },
    { key: 'exp', name: L('المصروف', 'Spending'), get: (s) => s.expenses },
    { key: 'saved', name: L('المدَّخر', 'Saved'), get: (s) => s.income - s.expenses, strong: true, color: (x) => (x >= 0 ? C.greenText : C.red) },
    { key: 'nw', name: L('صافي الثروة', 'Net worth'), get: netWorthOf, strong: true, color: (x) => (x >= 0 ? C.greenText : C.red) },
  ];
  const ROW_H = 32;
  const COL_W = 84;

  // ── the drawer's segments ──
  const SEGMENTS: { label: string; items: { key: string; icon: string; name: string; sub: string; value: string | null; color?: string }[] }[] = [
    {
      label: L('ما يتدفّق', 'WHAT FLOWS'),
      items: [
        { key: 'income', icon: '💰', name: L('الدخل', 'Income'), sub: L('متوسط ٦ أشهر', '6-mo avg') },
        { key: 'spending', icon: '🔥', name: L('المصروف', 'Spending'), sub: L('متوسط ٦ أشهر', '6-mo avg') },
      ].map((x) => ({ ...x, ...coreHeadline(x.key as CoreKey, data) })),
    },
    {
      label: L('ما تملكه', 'WHAT YOU OWN'),
      items: [
        { key: 'portfolio', icon: '📈', name: L('المحافظ', 'Portfolios'), sub: L('آخر قيمة', 'latest') },
        { key: 'ownership', icon: '🏢', name: L('الحصص', 'Stakes'), sub: L('آخر قيمة', 'latest') },
        { key: 'other-assets', icon: '🐫', name: L('أصول أخرى', 'Other assets'), sub: L('آخر قيمة', 'latest') },
      ].map((x) => ({ ...x, ...coreHeadline(x.key as CoreKey, data) })),
    },
    {
      label: L('ما عليك', 'WHAT YOU OWE'),
      items: [
        { key: 'liabilities', icon: '⛓', name: L('الالتزامات', 'Liabilities'), sub: L('المتبقّي', 'remaining') },
        { key: 'credit-score', icon: '📇', name: L('الائتمان', 'Credit'), sub: L('آخر تقرير', 'latest report') },
      ].map((x) => ({ ...x, ...coreHeadline(x.key as CoreKey, data) })),
    },
    {
      label: L('دفاترك', 'YOUR LEDGERS'),
      items: data.ledgers.map((l) => {
        const h = ledgerHeadline(l);
        return {
          key: `custom:${l.id}`, icon: l.icon, name: l.name,
          sub: h.label === 'latest' ? L('آخر قيمة', 'latest') : L('هذا العام', 'this year'),
          value: h.value === null ? null : compact(h.value),
          color: l.kind === 'flow' ? (l.direction === 'in' ? C.greenText : C.red) : undefined,
        };
      }),
    },
  ];

  const toggle = (k: string) => setOpenKey((cur) => (cur === k ? null : k));

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <Eyebrow>{L('السِّجل', 'THE LOG')}</Eyebrow>

      {/* ② the Summary */}
      <Card style={{ gap: 12 }}>
        <H2>📊 {L('الملخّص', 'Summary')}</H2>
        <Row gap={8}>
          <Stat
            label={L('إلى هنا يعود سِجلّك', 'How far back it goes')}
            value={monthLong(v.first)}
            sub={L('— حتى اليوم', '— to today')}
          />
          <Stat label={L('أشهر مسجّلة', 'Months logged')} value={String(v.months)} />
        </Row>
        <Row wrap gap={6}>
          <Chip label={L('صافي الثروة', 'Net worth')} on={lines.nw} color={C.green} onPress={() => setLines((p) => ({ ...p, nw: !p.nw }))} />
          <Chip label={L('الدخل', 'Income')} on={lines.income} color={C.blue} onPress={() => setLines((p) => ({ ...p, income: !p.income }))} />
          <Chip label={L('المصروف', 'Spending')} on={lines.expenses} color={C.red} onPress={() => setLines((p) => ({ ...p, expenses: !p.expenses }))} />
        </Row>
        {chartSnaps.length >= 2 && (lines.nw || lines.income || lines.expenses) ? (
          <LineChart
            labels={chartSnaps.map(shortOf)}
            series={[
              ...(lines.nw ? [{ key: 'nw', data: chartSnaps.map(netWorthOf), color: C.green, strong: true }] : []),
              ...(lines.income ? [{ key: 'inc', data: chartSnaps.map((s) => s.income), color: C.blue }] : []),
              ...(lines.expenses ? [{ key: 'exp', data: chartSnaps.map((s) => s.expenses), color: C.red }] : []),
            ]}
          />
        ) : (
          <Muted center>{L('فعّل خطاً واحداً على الأقل ليظهر الرسم', 'Turn on at least one line to draw the chart')}</Muted>
        )}
      </Card>

      {/* ③ the Log */}
      <Card style={{ gap: 12 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <H2>📒 {L('السِّجل', 'The Log')}</H2>
          <Button label={`✏️ ${L('عدّل', 'Edit')}`} small onPress={() => router.push('/month')} />
        </Row>
        <Card tone="green" style={{ gap: 6 }}>
          <T style={{ fontWeight: '700' }}>{L('حياتك المالية كلها — في سِجلّ واحد', 'Your whole financial life — in one record')}</T>
          <Muted style={{ color: C.ink2 }}>
            {L(
              'ما يملكه بنكك ووسيطك وتطبيق أقساطك وجداولك، مجموعاً هنا شهراً بجانب شهر. يُدخَل مرة، وتقرؤه كل أداة والعقل.',
              'What your bank, broker, installment app and spreadsheets each hold — gathered here, month beside month. Entered once, read by every tool and the Brain.'
            )}
          </Muted>
          <Button
            kind={tableShown ? 'secondary' : 'primary'}
            small
            label={tableShown ? L('▴ أخفِ الجدول', '▴ Hide the table') : L(`▾ اعرض الجدول الكامل — ${cols.length} شهراً`, `▾ Show the full table — ${cols.length} months`)}
            onPress={() => setTableShown((x) => !x)}
          />
        </Card>

        {tableShown && (
          <View style={{ flexDirection: row, borderWidth: 1, borderColor: C.borderFaint, borderRadius: radius.md, overflow: 'hidden' }}>
            {/* line names stay put */}
            <View style={{ width: 112, backgroundColor: C.card2 }}>
              <View style={{ height: ROW_H, justifyContent: 'center', paddingHorizontal: 8 }}>
                <Muted style={{ fontSize: 10 }}>{L('البند', 'Line item')}</Muted>
              </View>
              {ROWS.map((r) => (
                <View key={r.key} style={{ height: ROW_H, justifyContent: 'center', paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: C.borderFaint }}>
                  <T numberOfLines={1} style={{ fontSize: 11, fontWeight: r.strong ? '700' : '400', color: r.strong ? C.ink : C.ink2 }}>{r.name}</T>
                </View>
              ))}
            </View>
            {/* months scroll; oldest beside the labels, freshest at the far end */}
            <ScrollView
              ref={gridRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              onContentSizeChange={() => { if (!ar) gridRef.current?.scrollToEnd({ animated: false }); }}
              contentContainerStyle={{ flexDirection: row }}
            >
              {cols.map((s) => (
                <Pressable key={ymKey(s)} onPress={() => router.push({ pathname: '/month', params: { ym: ymKey(s) } })}>
                  <View style={{ width: COL_W }}>
                    <View style={{ height: ROW_H, justifyContent: 'center', paddingHorizontal: 6 }}>
                      <T center style={{ fontSize: 10, color: C.muted, fontWeight: '700' }}>{shortOf(s)}</T>
                    </View>
                    {ROWS.map((r) => {
                      const val = r.get(s);
                      return (
                        <View key={r.key} style={{ height: ROW_H, justifyContent: 'center', paddingHorizontal: 6, borderTopWidth: 1, borderTopColor: C.borderFaint }}>
                          <T center style={{ fontSize: 11, fontWeight: r.strong ? '700' : '400', color: r.color ? r.color(val) : r.strong ? C.ink : C.ink2 }}>{fmt(val)}</T>
                        </View>
                      );
                    })}
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
        {tableShown && <Muted style={{ fontSize: 10 }}>{L('اضغط أي شهر لتعديله. القيم بالريال.', 'Tap any month to edit it. Values in SAR.')}</Muted>}

        {/* the ledgers drawer */}
        <View style={{ gap: 6, marginTop: 4 }}>
          <H2>🗄 {L('دفاتر السِّجل', 'The ledgers')}</H2>
          <Muted>{L('اضغط أي دفتر لفتح سجلّه، ومجدداً لطيّه. وأضف بـ＋ ما تريد تتبّعه.', 'Tap a ledger to open its record, again to fold it. Add anything you want to track with ＋.')}</Muted>
        </View>
        {/* reversed content starts at the scroll's far end, so in Arabic
            the row opens scrolled to its start — Income first, ＋ last */}
        <ScrollView
          ref={drawerRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onContentSizeChange={() => { if (ar) drawerRef.current?.scrollToEnd({ animated: false }); }}
          contentContainerStyle={{ flexDirection: row, gap: 14, paddingVertical: 2 }}
        >
          {SEGMENTS.map((seg, si) => (
            <View key={seg.label} style={{ gap: 6 }}>
              <Muted style={{ fontSize: 9, fontWeight: '700', letterSpacing: 1 }}>{seg.label}</Muted>
              <View style={{ flexDirection: row, gap: 8 }}>
                {seg.items.map((it) => {
                  const active = openKey === it.key;
                  return (
                    <Pressable
                      key={it.key}
                      onPress={() => toggle(it.key)}
                      style={({ pressed }) => ({
                        width: 118, borderRadius: radius.md, borderWidth: 1, padding: 10, gap: 4,
                        borderColor: active ? C.green : C.borderFaint, backgroundColor: active ? C.greenBg : C.card2, opacity: pressed ? 0.75 : 1,
                      })}
                    >
                      <Row style={{ justifyContent: 'space-between' }}>
                        <T style={{ fontSize: 20 }}>{it.icon}</T>
                        <Muted style={{ fontSize: 10 }}>{active ? '▴' : '▾'}</Muted>
                      </Row>
                      <T numberOfLines={1} style={{ fontSize: 12, fontWeight: '700' }}>{it.name}</T>
                      <T style={{ fontSize: 15, fontWeight: '800', color: it.value ? (it.color ?? C.ink) : C.muted }}>{it.value ?? '—'}</T>
                      <Muted numberOfLines={1} style={{ fontSize: 9 }}>{it.value ? it.sub : L('لم يُسجَّل بعد', 'not logged yet')}</Muted>
                    </Pressable>
                  );
                })}
                {si === SEGMENTS.length - 1 && (
                  <Pressable
                    onPress={() => toggle('add')}
                    style={({ pressed }) => ({
                      width: 118, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', padding: 10, gap: 2,
                      alignItems: 'center', justifyContent: 'center',
                      borderColor: openKey === 'add' ? C.green : C.border, backgroundColor: openKey === 'add' ? C.greenBg : 'transparent', opacity: pressed ? 0.75 : 1,
                    })}
                  >
                    <T center style={{ fontSize: 24, color: C.greenText }}>＋</T>
                    <T center style={{ fontSize: 12, fontWeight: '700' }}>{L('دفتر جديد', 'New ledger')}</T>
                    <Muted center style={{ fontSize: 9 }}>{L('ذهب، إيجار، مدارس…', 'gold, rent, school…')}</Muted>
                  </Pressable>
                )}
              </View>
            </View>
          ))}
        </ScrollView>

        {openKey && (
          <View style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: C.borderFaint }}>
            <LedgerPanel openKey={openKey} onOpen={setOpenKey} />
          </View>
        )}
        {data.ledgerStore === 'device' && data.ledgers.length > 0 && (
          <Muted style={{ fontSize: 10 }}>{L('دفاترك محفوظة على هذا الجهاز حالياً، لا في حسابك.', 'Your ledgers are saved on this phone for now, not in your account.')}</Muted>
        )}
      </Card>
    </Screen>
  );
}
