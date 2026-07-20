'use client';

import CaptureSection, { type FieldDef } from '@/components/shared/CaptureSection';
import LivePortfolio from './LivePortfolio';
import { useLocale } from '@/lib/i18n/LocaleProvider';

const ASSET_TYPE_TO_CLASS: Record<string, string> = {
  cash: 'cash', stocks: 'equity', real_estate: 'real_estate', gold: 'commodity',
  car: 'other', business: 'business', crypto: 'alternative', other: 'other',
};

function fmt(n: unknown) {
  return Math.round(Number(n) || 0).toLocaleString();
}

export default function HoldingsPage() {
  const { t, locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const sar = t('common.sar');
  const money = (n: unknown) => (ar ? `${fmt(n)} ${sar}` : `${sar} ${fmt(n)}`);

  const assetTypeOptions = [
    { value: 'cash', label: L('نقد', 'Cash') },
    { value: 'stocks', label: L('أسهم وصناديق', 'Stocks / funds') },
    { value: 'real_estate', label: L('عقارات', 'Real estate') },
    { value: 'gold', label: L('ذهب', 'Gold') },
    { value: 'car', label: L('سيارة', 'Car') },
    { value: 'business', label: L('أعمال', 'Business') },
    { value: 'crypto', label: L('عملات رقمية', 'Crypto') },
    { value: 'other', label: L('أخرى', 'Other') },
  ];
  const assetTypeLabel = (v: string) => assetTypeOptions.find((o) => o.value === v)?.label ?? v;

  const assetFields: FieldDef[] = [
    { key: 'name', label: L('الاسم', 'Name'), kind: 'text', placeholder: L('مثال: محفظة تداول', 'e.g. Tadawul portfolio'), grow: true },
    { key: 'asset_type', label: L('النوع', 'Type'), kind: 'select', options: assetTypeOptions },
    { key: 'value', label: L('القيمة (ريال)', 'Value (SAR)'), kind: 'number', placeholder: '100,000' },
  ];

  const freqOptions = [
    { value: 'monthly', label: L('شهري', 'Monthly') },
    { value: 'annual', label: L('سنوي', 'Annual') },
    { value: 'one_off', label: L('مرة واحدة', 'One-off') },
  ];
  const freqLabel: Record<string, string> = {
    monthly: L('/شهرياً', '/mo'), annual: L('/سنوياً', '/yr'), one_off: L('مرة واحدة', 'one-off'),
  };

  const expenseFields: FieldDef[] = [
    { key: 'name', label: L('الاسم', 'Name'), kind: 'text', placeholder: L('مثال: بقالة', 'e.g. Groceries'), grow: true },
    { key: 'category', label: L('الفئة', 'Category'), kind: 'text', placeholder: L('مثال: طعام', 'e.g. Food'), widthClass: 'w-36', optional: true },
    { key: 'amount', label: L('المبلغ (ريال)', 'Amount (SAR)'), kind: 'number', placeholder: '2,000' },
    { key: 'frequency', label: L('التكرار', 'Frequency'), kind: 'select', options: freqOptions },
  ];

  const liabilityFields: FieldDef[] = [
    { key: 'name', label: L('الاسم', 'Name'), kind: 'text', placeholder: L('مثال: مبلغ مستحق للعائلة', 'e.g. Money owed to family'), grow: true },
    {
      key: 'kind', label: L('النوع', 'Kind'), kind: 'select',
      options: [
        { value: 'personal', label: L('قرض شخصي', 'Personal loan') },
        { value: 'family', label: L('عائلة أو أصدقاء', 'Family / friends') },
        { value: 'bnpl', label: L('اشترِ الآن وادفع لاحقاً', 'Buy now, pay later') },
        { value: 'tax', label: L('ضريبة أو زكاة', 'Tax / zakat owed') },
        { value: 'other', label: L('أخرى', 'Other') },
      ],
    },
    { key: 'original_amount', label: L('الأصلي (ريال)', 'Original (SAR)'), kind: 'number', placeholder: '24,000', optional: true },
    { key: 'balance', label: L('الرصيد (ريال)', 'Balance (SAR)'), kind: 'number', placeholder: '10,000' },
    { key: 'monthly_payment', label: L('شهري (ريال)', 'Monthly (SAR)'), kind: 'number', placeholder: '500', optional: true },
  ];

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-[var(--ink)] mb-1">{L('الأصول والخصوم', 'Assets & Liabilities')}</h1>
      <p className="text-sm text-[var(--ink-2)] mb-6 max-w-xl">
        {L(
          'دوّن ما تملكه وما عليك. كل ما تسجّله هنا يغذّي نِسبك وصافي ثروتك والعالم ثلاثي الأبعاد في صفحتك الرئيسية — كلما أضفت أكثر، اتّضحت الصورة أكثر.',
          'Capture what you own and what you owe. Everything you log here feeds your ratios, your net worth, and the 3D world on your home page — the more you add, the sharper the whole picture gets.'
        )}
      </p>

      <LivePortfolio />

      <CaptureSection
        icon="💼"
        title={L('الأصول والاستثمارات', 'Assets & investments')}
        description={L(
          'كل ما تملكه ويحمل قيمة — نقد، أسهم وصناديق، عقارات، ذهب، سيارة، أو عمل.',
          'Anything you own that holds value — cash, stocks and funds, property, gold, a car, a business.'
        )}
        table="assets"
        selectCols="id, name, asset_type, value"
        fields={assetFields}
        deriveInsert={(v) => ({ asset_class: ASSET_TYPE_TO_CLASS[v.asset_type] ?? 'other' })}
        addLabel={L('إضافة أصل', 'Add asset')}
        summary={(r) => `${r.name} · ${money(r.value)} · ${assetTypeLabel(String(r.asset_type))}`}
      />

      <CaptureSection
        icon="🧾"
        title={L('المصروفات', 'Expenses')}
        description={L(
          'إنفاقك المتكرر ولمرة واحدة، ليرى مَالمايند أين تذهب أموالك فعلاً.',
          'Your recurring and one-off spending, so MalMind can see where your money actually goes.'
        )}
        table="expenses"
        selectCols="id, name, category, amount, frequency"
        fields={expenseFields}
        addLabel={L('إضافة مصروف', 'Add expense')}
        summary={(r) => `${r.name}${r.category ? ` · ${r.category}` : ''} · ${money(r.amount)} ${freqLabel[String(r.frequency)] ?? ''}`}
      />

      <CaptureSection
        icon="⚖️"
        title={L('الخصوم', 'Liabilities')}
        description={L(
          'الأمور العامة التي عليك ممّا ليس قرضاً بنكياً أو بطاقة ائتمان (تلك في «الفواتير والالتزامات»).',
          "General things you owe that aren't a bank loan or credit card (those live in Bills & commitments)."
        )}
        table="liabilities"
        selectCols="id, name, kind, original_amount, balance, monthly_payment"
        fields={liabilityFields}
        addLabel={L('إضافة التزام', 'Add liability')}
        summary={(r) =>
          `${r.name} · ${money(r.balance)}${Number(r.monthly_payment) > 0 ? ` · ${money(r.monthly_payment)}${L('/شهرياً', '/mo')}` : ''}`
        }
      />
    </div>
  );
}
