'use client';

import { useState } from 'react';
import CaptureSection, { type FieldDef } from '@/components/shared/CaptureSection';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import SubscriptionStack from './SubscriptionStack';
import LoanPayoff from './LoanPayoff';

function fmt(n: unknown) {
  return Math.round(Number(n) || 0).toLocaleString();
}

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
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const sar = ar ? 'ريال' : 'SAR';
  const money = (n: unknown) => (ar ? `${fmt(n)} ${sar}` : `${sar} ${fmt(n)}`);

  const subscriptionFields: FieldDef[] = [
    { key: 'name', label: L('الاسم', 'Name'), kind: 'text', placeholder: L('مثال: نتفلكس', 'e.g. Netflix'), grow: true },
    { key: 'amount', label: L('المبلغ (ريال)', 'Amount (SAR)'), kind: 'number', placeholder: '56' },
    {
      key: 'billing_cycle', label: L('الفوترة', 'Billing'), kind: 'select',
      options: [
        { value: 'monthly', label: L('شهري', 'Monthly') },
        { value: 'annual', label: L('سنوي', 'Annual') },
      ],
    },
    { key: 'started_on', label: L('منذ (سنة-شهر)', 'Since (YYYY-MM)'), kind: 'text', placeholder: '2023-05', widthClass: 'w-28', optional: true },
    { key: 'category', label: L('الفئة', 'Category'), kind: 'text', placeholder: L('مثال: ترفيه', 'e.g. Entertainment'), widthClass: 'w-32', optional: true },
  ];
  const loanFields: FieldDef[] = [
    { key: 'name', label: L('الاسم', 'Name'), kind: 'text', placeholder: L('مثال: قرض سيارة', 'e.g. Car loan'), grow: true },
    {
      key: 'loan_type', label: L('النوع', 'Type'), kind: 'select',
      options: [
        { value: 'loan', label: L('قرض', 'Loan') },
        { value: 'mortgage', label: L('رهن عقاري', 'Mortgage') },
      ],
    },
    { key: 'original_amount', label: L('الأصلي (ريال)', 'Original (SAR)'), kind: 'number', placeholder: '120,000', optional: true },
    { key: 'balance', label: L('الرصيد (ريال)', 'Balance (SAR)'), kind: 'number', placeholder: '80,000' },
    { key: 'monthly_payment', label: L('شهري (ريال)', 'Monthly (SAR)'), kind: 'number', placeholder: '2,100' },
    { key: 'interest_rate', label: L('النسبة (%)', 'Rate (%)'), kind: 'number', placeholder: '5', widthClass: 'w-20', optional: true },
  ];
  const cardFields: FieldDef[] = [
    { key: 'name', label: L('الاسم', 'Name'), kind: 'text', placeholder: L('مثال: فيزا', 'e.g. Visa'), grow: true },
    { key: 'balance', label: L('الرصيد (ريال)', 'Balance (SAR)'), kind: 'number', placeholder: '4,000' },
    { key: 'credit_limit', label: L('الحد (ريال)', 'Limit (SAR)'), kind: 'number', placeholder: '20,000' },
    { key: 'min_payment', label: L('أدنى دفعة (ريال)', 'Min pay (SAR)'), kind: 'number', placeholder: '200', optional: true },
  ];

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-[var(--ink)] mb-1">{L('الفواتير والالتزامات', 'Bills & Commitments')}</h1>
      <p className="text-sm text-[var(--ink-2)] mb-6 max-w-xl">
        {L(
          'التزاماتك المتكررة — الاشتراكات، والقروض والرهون العقارية، والبطاقات الائتمانية. تسجيلها يتيح لمَالمايند رؤية تدفّقك الشهري الحقيقي وأخذه في كل خطة.',
          'Your recurring obligations — subscriptions, loans and mortgages, and credit cards. Logging these lets MalMind see your true monthly outflow and factor it into every plan.'
        )}
      </p>

      <SubscriptionStack version={version} />

      <CaptureSection
        icon="🔁"
        title={L('الاشتراكات', 'Subscriptions')}
        description={L(
          'البثّ والتطبيقات والعضويات — الرسوم الصغيرة المتكررة التي تتراكم بهدوء. أضِف شهر بدء كلٍّ منها ويحتسب المكدّس أعلاه تكلفتها الحقيقية مدى الحياة.',
          'Streaming, apps, memberships — the small recurring charges that quietly add up. Add the month you started each one and the stack above computes its true lifetime cost.'
        )}
        table="subscriptions"
        selectCols="id, name, amount, billing_cycle, started_on, category"
        fields={subscriptionFields}
        deriveInsert={deriveSubscriptionInsert}
        addLabel={L('إضافة اشتراك', 'Add subscription')}
        onChanged={bump}
        summary={(r) =>
          `${r.name} · ${money(r.amount)} /${r.billing_cycle === 'annual' ? L('سنة', 'yr') : L('شهر', 'mo')}${r.category ? ` · ${r.category}` : ''}${r.started_on ? ` · ${L('منذ', 'since')} ${String(r.started_on).slice(0, 7)}` : ''}`
        }
      />

      <LoanPayoff version={version} onChanged={bump} />

      <CaptureSection
        icon="🏦"
        title={L('القروض والرهون العقارية', 'Loans & mortgages')}
        description={L(
          'التمويل البنكي — قروض السيارات، والقروض الشخصية، والرهون العقارية. أدرِج المبلغ الأصلي ويُظهر متتبّع السداد أعلاه كم قطعت من الطريق.',
          "Bank financing — car loans, personal loans, and home mortgages. Include the original amount and the payoff tracker above shows how far you've come."
        )}
        table="loans"
        selectCols="id, name, loan_type, original_amount, balance, monthly_payment, interest_rate"
        fields={loanFields}
        addLabel={L('إضافة قرض', 'Add loan')}
        onChanged={bump}
        summary={(r) =>
          `${r.name} · ${r.loan_type === 'mortgage' ? L('رهن عقاري', 'Mortgage') : L('قرض', 'Loan')} · ${money(r.balance)}${Number(r.original_amount) > 0 ? ` ${L('من', 'of')} ${money(r.original_amount)}` : ''} · ${money(r.monthly_payment)}${L('/شهرياً', '/mo')}${Number(r.interest_rate) > 0 ? ` · ${r.interest_rate}%` : ''}`
        }
      />

      <CaptureSection
        icon="💳"
        title={L('البطاقات الائتمانية', 'Credit cards')}
        description={L(
          'أرصدة البطاقات وحدودها، لتكون نسبة استخدامك ودَين بطاقاتك جزءاً من الصورة.',
          'Card balances and limits, so your utilisation and card debt are part of the picture.'
        )}
        table="credit_cards"
        selectCols="id, name, balance, credit_limit, min_payment"
        fields={cardFields}
        addLabel={L('إضافة بطاقة', 'Add card')}
        onChanged={bump}
        summary={(r) =>
          `${r.name} · ${money(r.balance)} ${L('من', 'of')} ${money(r.credit_limit)}${Number(r.credit_limit) > 0 ? ` (${Math.round((Number(r.balance) / Number(r.credit_limit)) * 100)}% ${L('مُستخدَم', 'used')})` : ''}`
        }
      />
    </div>
  );
}
