'use client';

import CaptureSection, { type FieldDef } from '@/components/shared/CaptureSection';

function fmt(n: unknown) {
  return Math.round(Number(n) || 0).toLocaleString();
}

const subscriptionFields: FieldDef[] = [
  { key: 'name', label: 'Name', kind: 'text', placeholder: 'e.g. Netflix', grow: true },
  { key: 'amount', label: 'Amount (SAR)', kind: 'number', placeholder: '56' },
  {
    key: 'billing_cycle', label: 'Billing', kind: 'select',
    options: [
      { value: 'monthly', label: 'Monthly' },
      { value: 'annual', label: 'Annual' },
    ],
  },
];

const loanFields: FieldDef[] = [
  { key: 'name', label: 'Name', kind: 'text', placeholder: 'e.g. Car loan', grow: true },
  {
    key: 'loan_type', label: 'Type', kind: 'select',
    options: [
      { value: 'loan', label: 'Loan' },
      { value: 'mortgage', label: 'Mortgage' },
    ],
  },
  { key: 'balance', label: 'Balance (SAR)', kind: 'number', placeholder: '80,000' },
  { key: 'monthly_payment', label: 'Monthly (SAR)', kind: 'number', placeholder: '2,100' },
  { key: 'interest_rate', label: 'Rate (%)', kind: 'number', placeholder: '5', widthClass: 'w-20', optional: true },
];

const cardFields: FieldDef[] = [
  { key: 'name', label: 'Name', kind: 'text', placeholder: 'e.g. Visa', grow: true },
  { key: 'balance', label: 'Balance (SAR)', kind: 'number', placeholder: '4,000' },
  { key: 'credit_limit', label: 'Limit (SAR)', kind: 'number', placeholder: '20,000' },
  { key: 'min_payment', label: 'Min pay (SAR)', kind: 'number', placeholder: '200', optional: true },
];

export default function CommitmentsPage() {
  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-[var(--ink)] mb-1">Bills &amp; Commitments</h1>
      <p className="text-sm text-[var(--ink-2)] mb-6 max-w-xl">
        Your recurring obligations — subscriptions, loans and mortgages, and credit cards. Logging these lets MalMind
        see your true monthly outflow and factor it into every plan.
      </p>

      <CaptureSection
        icon="🔁"
        title="Subscriptions"
        description="Streaming, apps, memberships — the small recurring charges that quietly add up."
        table="subscriptions"
        selectCols="id, name, amount, billing_cycle"
        fields={subscriptionFields}
        addLabel="Add subscription"
        summary={(r) => `${r.name} · SAR ${fmt(r.amount)} /${r.billing_cycle === 'annual' ? 'yr' : 'mo'}`}
      />

      <CaptureSection
        icon="🏦"
        title="Loans & mortgages"
        description="Bank financing — car loans, personal loans, and home mortgages."
        table="loans"
        selectCols="id, name, loan_type, balance, monthly_payment, interest_rate"
        fields={loanFields}
        addLabel="Add loan"
        summary={(r) =>
          `${r.name} · ${r.loan_type === 'mortgage' ? 'Mortgage' : 'Loan'} · SAR ${fmt(r.balance)} · SAR ${fmt(r.monthly_payment)}/mo${Number(r.interest_rate) > 0 ? ` · ${r.interest_rate}%` : ''}`
        }
      />

      <CaptureSection
        icon="💳"
        title="Credit cards"
        description="Card balances and limits, so your utilisation and card debt are part of the picture."
        table="credit_cards"
        selectCols="id, name, balance, credit_limit, min_payment"
        fields={cardFields}
        addLabel="Add card"
        summary={(r) =>
          `${r.name} · SAR ${fmt(r.balance)} of SAR ${fmt(r.credit_limit)}${Number(r.credit_limit) > 0 ? ` (${Math.round((Number(r.balance) / Number(r.credit_limit)) * 100)}% used)` : ''}`
        }
      />
    </div>
  );
}
