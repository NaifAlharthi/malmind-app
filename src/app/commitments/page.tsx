'use client';

import { useState } from 'react';
import CaptureSection, { type FieldDef } from '@/components/shared/CaptureSection';
import SubscriptionStack from './SubscriptionStack';
import LoanPayoff from './LoanPayoff';

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
  { key: 'started_on', label: 'Since (YYYY-MM)', kind: 'text', placeholder: '2023-05', widthClass: 'w-28', optional: true },
  { key: 'category', label: 'Category', kind: 'text', placeholder: 'e.g. Entertainment', widthClass: 'w-32', optional: true },
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
  { key: 'original_amount', label: 'Original (SAR)', kind: 'number', placeholder: '120,000', optional: true },
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

// Normalise a "YYYY-MM" (or full date) into a real date for the column,
// dropping anything unparseable rather than failing the insert.
function deriveSubscriptionInsert(values: Record<string, string>): Record<string, unknown> {
  const raw = (values.started_on ?? '').trim();
  if (!raw) return { started_on: null };
  const m = raw.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/);
  if (!m) return { started_on: null };
  const month = String(Math.min(12, Math.max(1, parseInt(m[2])))).padStart(2, '0');
  const day = m[3] ? String(Math.min(28, Math.max(1, parseInt(m[3])))).padStart(2, '0') : '01';
  return { started_on: `${m[1]}-${month}-${day}` };
}

export default function CommitmentsPage() {
  const [version, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-[var(--ink)] mb-1">Bills &amp; Commitments</h1>
      <p className="text-sm text-[var(--ink-2)] mb-6 max-w-xl">
        Your recurring obligations — subscriptions, loans and mortgages, and credit cards. Logging these lets MalMind
        see your true monthly outflow and factor it into every plan.
      </p>

      <SubscriptionStack version={version} />

      <CaptureSection
        icon="🔁"
        title="Subscriptions"
        description="Streaming, apps, memberships — the small recurring charges that quietly add up. Add the month you started each one and the stack above computes its true lifetime cost."
        table="subscriptions"
        selectCols="id, name, amount, billing_cycle, started_on, category"
        fields={subscriptionFields}
        deriveInsert={deriveSubscriptionInsert}
        addLabel="Add subscription"
        onChanged={bump}
        summary={(r) =>
          `${r.name} · SAR ${fmt(r.amount)} /${r.billing_cycle === 'annual' ? 'yr' : 'mo'}${r.category ? ` · ${r.category}` : ''}${r.started_on ? ` · since ${String(r.started_on).slice(0, 7)}` : ''}`
        }
      />

      <LoanPayoff version={version} onChanged={bump} />

      <CaptureSection
        icon="🏦"
        title="Loans & mortgages"
        description="Bank financing — car loans, personal loans, and home mortgages. Include the original amount and the payoff tracker above shows how far you've come."
        table="loans"
        selectCols="id, name, loan_type, original_amount, balance, monthly_payment, interest_rate"
        fields={loanFields}
        addLabel="Add loan"
        onChanged={bump}
        summary={(r) =>
          `${r.name} · ${r.loan_type === 'mortgage' ? 'Mortgage' : 'Loan'} · SAR ${fmt(r.balance)}${Number(r.original_amount) > 0 ? ` of SAR ${fmt(r.original_amount)}` : ''} · SAR ${fmt(r.monthly_payment)}/mo${Number(r.interest_rate) > 0 ? ` · ${r.interest_rate}%` : ''}`
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
        onChanged={bump}
        summary={(r) =>
          `${r.name} · SAR ${fmt(r.balance)} of SAR ${fmt(r.credit_limit)}${Number(r.credit_limit) > 0 ? ` (${Math.round((Number(r.balance) / Number(r.credit_limit)) * 100)}% used)` : ''}`
        }
      />
    </div>
  );
}
