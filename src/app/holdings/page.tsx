'use client';

import CaptureSection, { type FieldDef } from '@/components/shared/CaptureSection';

const ASSET_TYPE_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'stocks', label: 'Stocks / funds' },
  { value: 'real_estate', label: 'Real estate' },
  { value: 'gold', label: 'Gold' },
  { value: 'car', label: 'Car' },
  { value: 'business', label: 'Business' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'other', label: 'Other' },
];

const ASSET_TYPE_TO_CLASS: Record<string, string> = {
  cash: 'cash', stocks: 'equity', real_estate: 'real_estate', gold: 'commodity',
  car: 'other', business: 'business', crypto: 'alternative', other: 'other',
};

function fmt(n: unknown) {
  return Math.round(Number(n) || 0).toLocaleString();
}

const assetFields: FieldDef[] = [
  { key: 'name', label: 'Name', kind: 'text', placeholder: 'e.g. Tadawul portfolio', grow: true },
  { key: 'asset_type', label: 'Type', kind: 'select', options: ASSET_TYPE_OPTIONS },
  { key: 'value', label: 'Value (SAR)', kind: 'number', placeholder: '100,000' },
];

const expenseFields: FieldDef[] = [
  { key: 'name', label: 'Name', kind: 'text', placeholder: 'e.g. Groceries', grow: true },
  { key: 'category', label: 'Category', kind: 'text', placeholder: 'e.g. Food', widthClass: 'w-36', optional: true },
  { key: 'amount', label: 'Amount (SAR)', kind: 'number', placeholder: '2,000' },
  {
    key: 'frequency', label: 'Frequency', kind: 'select',
    options: [
      { value: 'monthly', label: 'Monthly' },
      { value: 'annual', label: 'Annual' },
      { value: 'one_off', label: 'One-off' },
    ],
  },
];

const liabilityFields: FieldDef[] = [
  { key: 'name', label: 'Name', kind: 'text', placeholder: 'e.g. Money owed to family', grow: true },
  {
    key: 'kind', label: 'Kind', kind: 'select',
    options: [
      { value: 'personal', label: 'Personal loan' },
      { value: 'family', label: 'Family / friends' },
      { value: 'bnpl', label: 'Buy now, pay later' },
      { value: 'tax', label: 'Tax / zakat owed' },
      { value: 'other', label: 'Other' },
    ],
  },
  { key: 'original_amount', label: 'Original (SAR)', kind: 'number', placeholder: '24,000', optional: true },
  { key: 'balance', label: 'Balance (SAR)', kind: 'number', placeholder: '10,000' },
  { key: 'monthly_payment', label: 'Monthly (SAR)', kind: 'number', placeholder: '500', optional: true },
];

const FREQ_LABEL: Record<string, string> = { monthly: '/mo', annual: '/yr', one_off: 'one-off' };

export default function HoldingsPage() {
  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-[var(--ink)] mb-1">Assets &amp; Liabilities</h1>
      <p className="text-sm text-[var(--ink-2)] mb-6 max-w-xl">
        Capture what you own and what you owe. Everything you log here feeds your ratios, your net worth, and the 3D
        world on your home page — the more you add, the sharper the whole picture gets.
      </p>

      <CaptureSection
        icon="💼"
        title="Assets & investments"
        description="Anything you own that holds value — cash, stocks and funds, property, gold, a car, a business."
        table="assets"
        selectCols="id, name, asset_type, value"
        fields={assetFields}
        deriveInsert={(v) => ({ asset_class: ASSET_TYPE_TO_CLASS[v.asset_type] ?? 'other' })}
        addLabel="Add asset"
        summary={(r) =>
          `${r.name} · SAR ${fmt(r.value)} · ${ASSET_TYPE_OPTIONS.find((o) => o.value === r.asset_type)?.label ?? r.asset_type}`
        }
      />

      <CaptureSection
        icon="🧾"
        title="Expenses"
        description="Your recurring and one-off spending, so MalMind can see where your money actually goes."
        table="expenses"
        selectCols="id, name, category, amount, frequency"
        fields={expenseFields}
        addLabel="Add expense"
        summary={(r) =>
          `${r.name}${r.category ? ` · ${r.category}` : ''} · SAR ${fmt(r.amount)} ${FREQ_LABEL[String(r.frequency)] ?? ''}`
        }
      />

      <CaptureSection
        icon="⚖️"
        title="Liabilities"
        description="General things you owe that aren't a bank loan or credit card (those live in Bills & commitments)."
        table="liabilities"
        selectCols="id, name, kind, original_amount, balance, monthly_payment"
        fields={liabilityFields}
        addLabel="Add liability"
        summary={(r) =>
          `${r.name} · SAR ${fmt(r.balance)}${Number(r.monthly_payment) > 0 ? ` · SAR ${fmt(r.monthly_payment)}/mo` : ''}`
        }
      />
    </div>
  );
}
