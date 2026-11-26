// The ledgers drawer's contents — one panel per ledger, the same set the
// website's drawer opens: income, spending, portfolios, ownership, other
// assets, liabilities, credit score, the person's own ledgers, and the ＋
// picker of predefined Saudi-life ledgers.

import { useState } from 'react';
import { Alert, TextInput, View } from 'react-native';

import { BarChart, LineChart, Meter } from '@/components/charts';
import { Icon } from '@/components/Icon';
import { Button, Chip, H2, IconButton, Muted, Press, Row, Segmented, Stat, T } from '@/components/ui';
import { CUSTOM_ICONS, PRESETS, ledgerHeadline, type CustomLedger } from '@shared/ledgerPresets';
import { compact, fmt } from '@/lib/finance';
import { haptic } from '@/lib/haptics';
import { MONTHS_AR, MONTHS_EN, monthShort, useLocale } from '@/lib/i18n';
import { useStore, type Data, type Field, type Snap } from '@/lib/store';
import { C, radius } from '@/lib/theme';

export type CoreKey = 'income' | 'spending' | 'portfolio' | 'ownership' | 'other-assets' | 'liabilities' | 'credit-score';
export const CORE_KEYS: CoreKey[] = ['income', 'spending', 'portfolio', 'ownership', 'other-assets', 'liabilities', 'credit-score'];

const shortLabel = (s: Snap, ar: boolean) => monthShort(s.month, s.year, ar);

export interface Headline { value: string | null; color?: string }

/** The figure each core ledger's big button carries. */
export function coreHeadline(key: CoreKey, d: Data): Headline {
  const recent = d.snaps.slice(-6);
  const last = d.snaps[d.snaps.length - 1];
  const avg = (f: (s: Snap) => number) => (recent.length ? recent.reduce((a, s) => a + f(s), 0) / recent.length : 0);
  if (key === 'credit-score') {
    const c = d.credit[d.credit.length - 1];
    return { value: c ? String(c.score) : null, color: C.greenText };
  }
  if (!last) return { value: null };
  switch (key) {
    case 'income': return { value: compact(avg((s) => s.income)) };
    case 'spending': {
      const exp = avg((s) => s.expenses);
      return { value: compact(exp), color: exp > avg((s) => s.income) ? C.red : undefined };
    }
    case 'portfolio': return { value: last.stocks > 0 ? compact(last.stocks) : null };
    case 'ownership': return { value: last.equity > 0 ? compact(last.equity) : null };
    case 'other-assets': return { value: last.other_assets + last.real_estate > 0 ? compact(last.other_assets + last.real_estate) : null };
    case 'liabilities': {
      const owed = d.debts.length ? d.debts.reduce((a, x) => a + x.balance, 0) : last.liabilities;
      return { value: owed > 0 ? compact(owed) : null, color: owed > 0 ? C.red : undefined };
    }
  }
}

function FlowPanel({ field, d }: { field: 'income' | 'expenses'; d: Data }) {
  const { L, ar } = useLocale();
  const snaps = d.snaps.slice(-12);
  if (snaps.length === 0) return <Muted>{L('لا أشهر مسجّلة بعد.', 'No months logged yet.')}</Muted>;
  const recent = d.snaps.slice(-6);
  const avg = recent.reduce((a, s) => a + s[field], 0) / recent.length;
  const avgIncome = recent.reduce((a, s) => a + s.income, 0) / recent.length;
  const peak = [...d.snaps].sort((a, b) => b[field] - a[field])[0];
  const year = d.snaps[d.snaps.length - 1].year;
  const ytd = d.snaps.filter((s) => s.year === year).reduce((a, s) => a + s[field], 0);
  const isIncome = field === 'income';
  const fixedSubs = d.subs.reduce((a, s) => a + (s.cycle === 'yearly' ? s.amount / 12 : s.amount), 0);
  const fixedDebt = d.debts.reduce((a, x) => a + x.monthly, 0);
  return (
    <View style={{ gap: 10 }}>
      <H2>{isIncome ? `💰 ${L('الدخل — منبع التدفق', 'Income — where the flow begins')}` : `🔥 ${L('المصروف — حيث يغادر الدخل', 'Spending — where income leaves')}`}</H2>
      <Row wrap>
        <Stat label={L('متوسط ٦ أشهر', '6-mo average')} value={fmt(avg)} />
        <Stat label={isIncome ? L('أفضل شهر', 'Best month') : L('أعلى شهر', 'Highest month')} value={fmt(peak[field])} sub={shortLabel(peak, ar)} />
        {isIncome
          ? <Stat label={L(`${year} حتى الآن`, `${year} so far`)} value={fmt(ytd)} />
          : <Stat label={L('من دخلك', 'Of your income')} value={avgIncome > 0 ? `${Math.round((avg / avgIncome) * 100)}%` : '—'} color={avg > avgIncome ? C.red : C.ink} />}
      </Row>
      <BarChart
        labels={snaps.map((s) => shortLabel(s, ar))}
        values={snaps.map((s) => s[field])}
        refLine={avg}
        color={() => (isIncome ? C.green : C.red)}
      />
      {!isIncome && (fixedSubs > 0 || fixedDebt > 0) && (
        <Muted>
          {L(
            `ثابت شهرياً ${fmt(fixedSubs + fixedDebt)}: خدمة الديون ${fmt(fixedDebt)} · اشتراكات ${fmt(fixedSubs)} — يغادر قبل أن تلمسه.`,
            `Fixed each month ${fmt(fixedSubs + fixedDebt)}: debt servicing ${fmt(fixedDebt)} · subscriptions ${fmt(fixedSubs)} — it leaves before you touch it.`
          )}
        </Muted>
      )}
      <Muted style={{ fontSize: 10 }}>{L('الخط الذهبي = متوسطك.', 'The gold line = your average.')}</Muted>
    </View>
  );
}

function HoldingPanel({ title, fields, color, emptyHint, d }: { title: string; fields: Field[]; color: string; emptyHint: string; d: Data }) {
  const { L, ar } = useLocale();
  const snaps = d.snaps.slice(-12);
  const values = snaps.map((s) => fields.reduce((a, f) => a + s[f], 0));
  const latest = values[values.length - 1] ?? 0;
  const firstV = values[0] ?? 0;
  return (
    <View style={{ gap: 10 }}>
      <H2>{title}</H2>
      {latest <= 0 ? (
        <Muted>{emptyHint}</Muted>
      ) : (
        <>
          <Row wrap>
            <Stat label={L('آخر قيمة', 'Latest value')} value={fmt(latest)} color={color} />
            <Stat label={L('التغيّر في الفترة', 'Change over the window')} value={`${latest - firstV >= 0 ? '+' : ''}${fmt(latest - firstV)}`} color={latest - firstV >= 0 ? C.greenText : C.red} />
          </Row>
          {values.length >= 2 && (
            <LineChart labels={snaps.map((s) => shortLabel(s, ar))} series={[{ key: 'v', data: values, color, strong: true }]} />
          )}
        </>
      )}
    </View>
  );
}

function LiabilitiesPanel({ d }: { d: Data }) {
  const { L } = useLocale();
  if (d.debts.length === 0) {
    return (
      <View style={{ gap: 8 }}>
        <H2>⛓ {L('التزاماتك', 'Liabilities')}</H2>
        <Muted>{L('لا ديون مسمّاة بعد — أضفها في «الالتزامات» على malmind.ai، وسيرسم هذا الدفتر لكلٍّ منها المسدَّد مقابل المتبقي.', "No named debts yet — add them in Commitments on malmind.ai and this book draws each one's paid-vs-remaining.")}</Muted>
      </View>
    );
  }
  const total = d.debts.reduce((a, x) => a + x.balance, 0);
  const servicing = d.debts.reduce((a, x) => a + x.monthly, 0);
  const kindLabel = (k: string) => (k === 'mortgage' ? L('رهن', 'Mortgage') : k === 'loan' ? L('قرض', 'Loan') : k === 'card' ? L('بطاقة', 'Card') : L('دين', 'Debt'));
  return (
    <View style={{ gap: 10 }}>
      <H2>⛓ {L('التزاماتك', 'Liabilities')}</H2>
      <Row wrap>
        <Stat label={L('المتبقّي', 'Remaining')} value={fmt(total)} color={C.red} />
        <Stat label={L('خدمة شهرية', 'Monthly servicing')} value={fmt(servicing)} />
      </Row>
      {d.debts.map((x) => {
        const paid = x.original !== null ? Math.max(0, x.original - x.balance) : 0;
        return (
          <View key={x.id} style={{ gap: 5, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.borderFaint }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T style={{ fontSize: 13, fontWeight: '600', flex: 1 }} numberOfLines={1}>{x.name}</T>
              <Muted style={{ fontSize: 10 }}>{kindLabel(x.kind)}</Muted>
            </Row>
            {x.original !== null && <Meter value={paid} max={x.original} color={C.blue} />}
            <Muted style={{ fontSize: 11 }}>
              {x.original !== null
                ? L(`مسدَّد ${fmt(paid)} من ${fmt(x.original)} · متبقٍّ ${fmt(x.balance)}`, `Paid ${fmt(paid)} of ${fmt(x.original)} · ${fmt(x.balance)} left`)
                : L(`متبقٍّ ${fmt(x.balance)}`, `${fmt(x.balance)} left`)}
            </Muted>
          </View>
        );
      })}
    </View>
  );
}

function CreditPanel({ d }: { d: Data }) {
  const { L } = useLocale();
  const last = d.credit[d.credit.length - 1];
  if (!last) {
    return (
      <View style={{ gap: 8 }}>
        <H2>📇 {L('الدرجة الائتمانية', 'Credit score')}</H2>
        <Muted>{L('لا تقارير بعد — أضف تقرير سمة في «الوضع الائتماني» على malmind.ai.', 'No reports yet — add your SIMAH report in Credit Standing on malmind.ai.')}</Muted>
      </View>
    );
  }
  const prev = d.credit.length >= 2 ? d.credit[d.credit.length - 2] : null;
  const band = last.score >= 750 ? L('ممتاز', 'Excellent') : last.score >= 680 ? L('جيد جداً', 'Very good') : last.score >= 620 ? L('جيد', 'Good') : L('يحتاج عناية', 'Needs care');
  return (
    <View style={{ gap: 10 }}>
      <H2>📇 {L('الدرجة الائتمانية', 'Credit score')}</H2>
      <Row wrap>
        <Stat label={L('آخر تقرير', 'Latest report')} value={String(last.score)} color={C.greenText} sub={`${band} · ${last.date}`} />
        {prev && <Stat label={L('مقارنة بالسابق', 'vs previous')} value={`${last.score - prev.score >= 0 ? '▲' : '▼'} ${Math.abs(last.score - prev.score)}`} color={last.score >= prev.score ? C.greenText : C.red} />}
      </Row>
      <Meter value={last.score - 300} max={550} color={C.green} height={8} />
      <Row style={{ justifyContent: 'space-between' }}>
        <Muted style={{ fontSize: 10 }}>300</Muted>
        <Muted style={{ fontSize: 10 }}>850</Muted>
      </Row>
    </View>
  );
}

// ── the person's own ledgers ──

function addMonths(ym: string, delta: number) {
  const [y, m] = ym.split('-').map(Number);
  const k = y * 12 + (m - 1) + delta;
  return `${Math.floor(k / 12)}-${String((k % 12) + 1).padStart(2, '0')}`;
}
const thisMonth = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
};
const ymLabel = (ym: string, ar: boolean) => `${(ar ? MONTHS_AR : MONTHS_EN)[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;

export function MonthStepper({ ym, onChange }: { ym: string; onChange: (ym: string) => void }) {
  const { ar, L } = useLocale();
  const btn = { width: 36, height: 32, alignItems: 'center' as const, justifyContent: 'center' as const, borderRadius: radius.sm, backgroundColor: C.card2 };
  return (
    <Row gap={8}>
      <Press haptics="select" scaleTo={0.9} accessibilityLabel={L('الشهر السابق', 'Previous month')} onPress={() => onChange(addMonths(ym, -1))} style={btn}><Icon sf={ar ? 'chevron.right' : 'chevron.left'} emoji={ar ? '›' : '‹'} size={13} color={C.ink2} weight="bold" /></Press>
      <T style={{ fontWeight: '700', minWidth: 110 }} center>{ymLabel(ym, ar)}</T>
      <Press haptics="select" scaleTo={0.9} accessibilityLabel={L('الشهر التالي', 'Next month')} onPress={() => onChange(addMonths(ym, 1))} style={btn}><Icon sf={ar ? 'chevron.left' : 'chevron.right'} emoji={ar ? '‹' : '›'} size={13} color={C.ink2} weight="bold" /></Press>
    </Row>
  );
}

function CustomPanel({ ledger }: { ledger: CustomLedger }) {
  const { L, ar, start } = useLocale();
  const { saveLedger, deleteLedger } = useStore();
  const [ym, setYm] = useState(thisMonth());
  const [amount, setAmount] = useState('');
  const sorted = [...ledger.entries].sort((a, b) => a.month.localeCompare(b.month));
  const head = ledgerHeadline(ledger);
  const color = ledger.kind === 'balance' ? C.teal : ledger.direction === 'in' ? C.green : C.red;

  const add = () => {
    const v = Number(amount.replace(/[^\d.-]/g, ''));
    if (amount.trim() === '' || !Number.isFinite(v)) return;
    saveLedger({ ...ledger, entries: [...ledger.entries.filter((e) => e.month !== ym), { month: ym, amount: v }] });
    setAmount('');
    haptic.success();
  };
  const confirmDelete = () => {
    haptic.warn();
    Alert.alert(L('حذف الدفتر؟', 'Delete ledger?'), L(`«${ledger.name}» وكل قيوده.`, `«${ledger.name}» and all its entries.`), [
      { text: L('إلغاء', 'Cancel'), style: 'cancel' },
      { text: L('احذف', 'Delete'), style: 'destructive', onPress: () => deleteLedger(ledger.id) },
    ]);
  };

  return (
    <View style={{ gap: 10 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <H2 style={{ flex: 1 }}>{ledger.icon} {ledger.name}</H2>
        <IconButton icon="trash" emoji="🗑" label={L('حذف الدفتر', 'Delete ledger')} onPress={confirmDelete} tint={C.red} bg={C.redBg} size={30} />
      </Row>
      <Muted>
        {ledger.kind === 'balance'
          ? L('قيمة تُحدّثها بين وقت وآخر — سجّل ما تساويه.', 'A value you re-state over time — log what it is worth.')
          : ledger.direction === 'in'
            ? L('مبالغ تدخل — سجّل ما وصلك كل شهر.', 'Money coming in — log what arrived each month.')
            : L('مبالغ تخرج — سجّل ما صُرف كل شهر.', 'Money going out — log what left each month.')}
      </Muted>
      <Row wrap>
        <Stat label={head.label === 'latest' ? L('آخر قيمة', 'Latest value') : L('هذا العام', 'This year')} value={head.value === null ? '—' : fmt(head.value)} color={color} />
        <Stat label={L('أشهر مسجّلة', 'Months logged')} value={String(sorted.length)} />
      </Row>
      {sorted.length >= 2 && (
        ledger.kind === 'balance'
          ? <LineChart labels={sorted.slice(-12).map((e) => monthShort(Number(e.month.slice(5, 7)), Number(e.month.slice(0, 4)), ar))} series={[{ key: 'l', data: sorted.slice(-12).map((e) => e.amount), color, strong: true }]} />
          : <BarChart labels={sorted.slice(-12).map((e) => monthShort(Number(e.month.slice(5, 7)), Number(e.month.slice(0, 4)), ar))} values={sorted.slice(-12).map((e) => e.amount)} color={() => color} />
      )}
      <View style={{ gap: 8, padding: 10, borderRadius: radius.md, backgroundColor: C.card2 }}>
        <MonthStepper ym={ym} onChange={setYm} />
        <Row>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder={ledger.kind === 'balance' ? L('القيمة', 'Value') : L('المبلغ', 'Amount')}
            placeholderTextColor={C.muted}
            keyboardType="decimal-pad"
            onSubmitEditing={add}
            style={{ flex: 1, color: C.ink, borderWidth: 1, borderColor: C.border, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 8, textAlign: start }}
          />
          <Button label={L('سجّل', 'Log it')} onPress={add} small />
        </Row>
      </View>
      {[...sorted].reverse().slice(0, 12).map((e) => (
        <Row key={e.month} style={{ justifyContent: 'space-between', paddingVertical: 4 }}>
          <Muted>{ymLabel(e.month, ar)}</Muted>
          <Row gap={12}>
            <T style={{ fontWeight: '700' }}>{fmt(e.amount)}</T>
            <IconButton
              icon="xmark" emoji="✕" size={24} label={L('احذف القيد', 'Remove entry')}
              onPress={() => saveLedger({ ...ledger, entries: ledger.entries.filter((x) => x.month !== e.month) })}
            />
          </Row>
        </Row>
      ))}
    </View>
  );
}

// custom_ledgers.id is a uuid column, and crypto.randomUUID isn't
// guaranteed in every JS engine the app runs on
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function AddPanel({ onCreated }: { onCreated: (id: string) => void }) {
  const { L, ar, start, row } = useLocale();
  const { data, saveLedger } = useStore();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(CUSTOM_ICONS[0]);
  const [kind, setKind] = useState<'balance' | 'flow'>('balance');
  const [dir, setDir] = useState<'in' | 'out'>('out');
  const taken = new Set(data.ledgers.map((l) => l.preset).filter(Boolean));

  const create = (l: Omit<CustomLedger, 'id' | 'entries'>) => {
    const id = uuid();
    saveLedger({ ...l, id, entries: [] });
    haptic.success();
    onCreated(id);
  };

  return (
    <View style={{ gap: 12 }}>
      <H2>＋ {L('دفتر جديد', 'A new ledger')}</H2>
      <Muted>{L('اختر مجالاً جاهزاً بنقرة، أو أنشئ دفترك الخاص.', 'Pick a ready-made area in one tap, or create your own.')}</Muted>
      <View style={{ flexDirection: row, flexWrap: 'wrap', gap: 8 }}>
        {PRESETS.map((p) => {
          const used = taken.has(p.key);
          return (
            <Press
              key={p.key}
              disabled={used}
              haptics={false}
              onPress={() => create({ name: ar ? p.name.ar : p.name.en, icon: p.icon, kind: p.kind, direction: p.direction, preset: p.key })}
              style={{
                width: '48%', flexGrow: 1, padding: 10, borderRadius: radius.md, borderCurve: 'continuous', borderWidth: 1, borderColor: C.borderFaint,
                backgroundColor: C.card2, opacity: used ? 0.4 : 1, gap: 2,
              }}
            >
              <T style={{ fontSize: 18 }}>{p.icon}</T>
              <T style={{ fontSize: 12, fontWeight: '700' }}>{ar ? p.name.ar : p.name.en}</T>
              <Muted style={{ fontSize: 10 }}>{used ? L('مضاف ✓', 'added ✓') : (ar ? p.hint.ar : p.hint.en)}</Muted>
            </Press>
          );
        })}
      </View>
      <View style={{ gap: 8, padding: 12, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: C.border }}>
        <T style={{ fontWeight: '700' }}>✨ {L('أو دفترك الخاص', 'Or your own')}</T>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={L('اسم الدفتر — مثلاً: مزرعة العائلة', 'Ledger name — e.g. the family farm')}
          placeholderTextColor={C.muted}
          style={{ color: C.ink, borderWidth: 1, borderColor: C.border, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 9, textAlign: start }}
        />
        <Segmented
          options={[{ key: 'balance', label: L('قيمة تتغيّر', 'A value') }, { key: 'flow', label: L('مبالغ شهرية', 'Monthly amounts') }]}
          value={kind}
          onChange={setKind}
        />
        {kind === 'flow' && (
          <Segmented options={[{ key: 'in', label: L('تدخل', 'In') }, { key: 'out', label: L('تخرج', 'Out') }]} value={dir} onChange={setDir} />
        )}
        <Row wrap gap={4}>
          {CUSTOM_ICONS.map((ic) => (
            <Chip key={ic} label={ic} on={icon === ic} onPress={() => setIcon(ic)} />
          ))}
        </Row>
        <Button
          label={L('أنشئ الدفتر', 'Create the ledger')}
          disabled={!name.trim()}
          onPress={() => create({ name: name.trim(), icon, kind, direction: kind === 'flow' ? dir : null, preset: null })}
        />
      </View>
    </View>
  );
}

/** Whatever is open in the drawer. */
export function LedgerPanel({ openKey, onOpen }: { openKey: string; onOpen: (k: string | null) => void }) {
  const { L } = useLocale();
  const { data } = useStore();
  if (openKey === 'add') return <AddPanel onCreated={(id) => onOpen(`custom:${id}`)} />;
  if (openKey.startsWith('custom:')) {
    const l = data.ledgers.find((x) => `custom:${x.id}` === openKey);
    return l ? <CustomPanel ledger={l} /> : null;
  }
  switch (openKey as CoreKey) {
    case 'income': return <FlowPanel field="income" d={data} />;
    case 'spending': return <FlowPanel field="expenses" d={data} />;
    case 'portfolio':
      return <HoldingPanel d={data} fields={['stocks']} color={C.teal} title={`📈 ${L('المحافظ الاستثمارية', 'Investment portfolios')}`} emptyHint={L('لا أسهم مسجّلة — أضف قيمة محفظتك في سطر «الأسهم» عند تعديل شهر.', 'No stocks logged — add your portfolio value on the Stocks line when you edit a month.')} />;
    case 'ownership':
      return <HoldingPanel d={data} fields={['equity']} color={C.purple} title={`🏢 ${L('الحصص والملكيات', 'Ownership & stakes')}`} emptyHint={L('حصة في شركة، أو صندوق خاص، أو شراكة — سجّل قيمتها في سطر «حصص وملكيات».', 'A company share, a private fund, a partnership — log its mark on the Equity line.')} />;
    case 'other-assets':
      return <HoldingPanel d={data} fields={['real_estate', 'other_assets']} color={C.amber} title={`🐫 ${L('العقار والأصول الأخرى', 'Property & other assets')}`} emptyHint={L('أرض، إبل، ذهب، ساعة — قيمة حقيقية لا يلتقطها بنك. سجّلها في «العقار» و«أصول أخرى».', 'Land, camels, gold, the watch — real value no bank captures. Log it on Real estate and Other assets.')} />;
    case 'liabilities': return <LiabilitiesPanel d={data} />;
    case 'credit-score': return <CreditPanel d={data} />;
    default: return null;
  }
}
