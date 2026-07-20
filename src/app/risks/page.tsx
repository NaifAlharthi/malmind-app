'use client';

// Risks — a Think tool: name the risks in your position, measure each
// against your real data, and turn every one into a concrete mitigation
// plan mapped to MalMind's own tools.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { computeRisks, riskLevelLabel, type RiskInputs, type RiskLevel } from '@/lib/risks';
import { useLocale } from '@/lib/i18n/LocaleProvider';

const LEVEL_STYLE: Record<RiskLevel, { pill: string; bar: string }> = {
  high: { pill: 'bg-[#FBE9EC] text-[#A32D2D]', bar: '#C0504D' },
  medium: { pill: 'bg-[#FBF1E0] text-[#8A6416]', bar: '#D89A3E' },
  low: { pill: 'bg-[var(--green-bg)] text-[var(--green-dark)]', bar: '#1D9E75' },
  unknown: { pill: 'bg-[var(--surface-1)] text-[var(--muted)]', bar: 'var(--border-medium)' },
};

export default function RisksPage() {
  const router = useRouter();
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const [loading, setLoading] = useState(true);
  const [inputs, setInputs] = useState<RiskInputs | null>(null);
  const [savingInsurance, setSavingInsurance] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setUserId(user.id);

    const [{ data: profile }, { data: snaps }] = await Promise.all([
      supabase
        .from('profiles')
        .select('monthly_income, side_income, liquid_savings, monthly_debt_payments, monthly_expense, has_health_insurance')
        .eq('id', user.id)
        .single(),
      supabase
        .from('financial_snapshots')
        .select('year, month, cash, stocks, real_estate, equity, other_assets, expenses')
        .eq('user_id', user.id)
        .order('year', { ascending: true })
        .order('month', { ascending: true }),
    ]);

    const latest = snaps && snaps.length > 0 ? snaps[snaps.length - 1] : null;
    const assetMix = latest
      ? [
          { label: L('النقد', 'Cash'), value: Number(latest.cash) || 0 },
          { label: L('الأسهم', 'Stocks'), value: Number(latest.stocks) || 0 },
          { label: L('العقار', 'Real estate'), value: Number(latest.real_estate) || 0 },
          { label: L('حقوق الملكية', 'Equity'), value: Number(latest.equity) || 0 },
          { label: L('أصول أخرى', 'Other assets'), value: Number(latest.other_assets) || 0 },
        ].filter((a) => a.value > 0)
      : [];

    setInputs({
      monthlyIncome: profile?.monthly_income != null ? Number(profile.monthly_income) : null,
      sideIncome: profile?.side_income != null ? Number(profile.side_income) : null,
      liquidSavings: profile?.liquid_savings != null ? Number(profile.liquid_savings) : null,
      monthlyDebtPayments: profile?.monthly_debt_payments != null ? Number(profile.monthly_debt_payments) : null,
      hasHealthInsurance: profile?.has_health_insurance ?? null,
      avgMonthlyExpenses:
        latest?.expenses != null ? Number(latest.expenses)
        : profile?.monthly_expense != null ? Number(profile.monthly_expense)
        : null,
      assetMix,
    });
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, router, ar]);

  useEffect(() => {
    load();
  }, [load]);

  const risks = useMemo(() => (inputs ? computeRisks(inputs, locale) : []), [inputs, locale]);
  const highs = risks.filter((r) => r.level === 'high').length;
  const mediums = risks.filter((r) => r.level === 'medium').length;
  const lows = risks.filter((r) => r.level === 'low').length;

  async function setInsurance(value: boolean) {
    if (!userId) return;
    setSavingInsurance(true);
    await supabase.from('profiles').update({ has_health_insurance: value }).eq('id', userId);
    setSavingInsurance(false);
    load();
  }

  if (loading) {
    return <div className="text-sm text-[var(--muted)]">{L('جارٍ قراءة وضعك…', 'Reading your position…')}</div>;
  }

  return (
    <div>
      <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--blue)] font-semibold mb-1">{L('فكّر', 'Think')}</div>
      <h1 className="font-serif text-2xl font-semibold text-[var(--ink)] mb-1">{L('المخاطر', 'Risks')}</h1>
      <p className="text-sm text-[var(--ink-2)] mb-6 max-w-xl">
        {L(
          'الثروة ليست فقط ما تبنيه — بل ما يصمد. هذه هي المخاطر الحقيقية في وضعك، مقيسةً من أرقامك أنت، ولكلٍّ منها خطّة لتقليصها.',
          "Wealth isn't only what you build — it's what survives. These are the real risks in your position, measured from your own numbers, each with a plan to shrink it."
        )}
      </p>

      {/* posture summary */}
      <div className="bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] rounded-2xl p-6 mb-6">
        <div className="text-[11px] tracking-[0.12em] uppercase text-[var(--gold)] mb-3">{L('وضعيّة مخاطرك', 'Your risk posture')}</div>
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <div className="font-serif text-3xl font-bold text-white">{highs}</div>
            <div className="text-[11px] text-white/55">{L('معرَّضة', 'exposed')}</div>
          </div>
          <div>
            <div className="font-serif text-3xl font-bold text-[#F0C987]">{mediums}</div>
            <div className="text-[11px] text-white/55">{L('للمراقبة', 'to watch')}</div>
          </div>
          <div>
            <div className="font-serif text-3xl font-bold text-[#5DCAA5]">{lows}</div>
            <div className="text-[11px] text-white/55">{L('مُدارة', 'managed')}</div>
          </div>
          <p className="text-xs text-white/60 leading-relaxed max-w-sm ms-auto">
            {highs > 0
              ? L('ابدأ بالمعرَّضة — لكلٍّ منها خطوة أولى ملموسة أدناه. تقليص واحدة فقط يغيّر مدى الأمان الذي ينمو به كل شيء آخر.', 'Start with the exposed ones — each has a concrete first move below. Shrinking even one changes how safely everything else can grow.')
              : mediums > 0
              ? L('لا شيء يحترق. البنود الموسومة بـ«راقِب» هي حيث يمنع الانتباه الهادئ الآن مشكلاتٍ صاخبة لاحقاً.', 'Nothing is on fire. The items marked "watch" are where quiet attention now prevents loud problems later.')
              : L('وضعٌ صامد بحقّ. عُد إلى هذه الصفحة حين تتغيّر الحياة — وظيفة جديدة، منزل جديد، فرد جديد في العائلة.', 'A genuinely resilient position. Revisit this page when life changes — new job, new home, new family member.')}
          </p>
        </div>
      </div>

      {/* risk cards */}
      <div className="flex flex-col gap-4 mb-6">
        {risks.map((r) => {
          const style = LEVEL_STYLE[r.level];
          return (
            <div key={r.id} className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3 mb-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{r.icon}</span>
                  <h2 className="font-serif text-lg font-semibold text-[var(--ink)]">{r.title}</h2>
                </div>
                <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${style.pill}`}>
                  {riskLevelLabel(r.level, locale)}
                </span>
              </div>

              {r.level === 'unknown' ? (
                r.missingHint === 'answer-inline' ? (
                  <div className="mt-2">
                    <p className="text-sm text-[var(--ink-2)] mb-3">{r.finding}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setInsurance(true)}
                        disabled={savingInsurance}
                        className="text-xs font-medium bg-[var(--green-bg)] text-[var(--green-dark)] border border-[var(--green-border)] rounded-lg px-3.5 py-2 disabled:opacity-50"
                      >
                        {L('نعم، لديّ تغطية', "Yes, I'm covered")}
                      </button>
                      <button
                        onClick={() => setInsurance(false)}
                        disabled={savingInsurance}
                        className="text-xs font-medium bg-[var(--surface-1)] text-[var(--ink-2)] border border-[var(--border-default)] rounded-lg px-3.5 py-2 disabled:opacity-50"
                      >
                        {L('لا تغطية بعد', 'No cover yet')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--muted)] mt-1">{r.missingHint}</p>
                )
              ) : (
                <>
                  {/* exposure meter */}
                  <div className="h-1.5 bg-[var(--surface-1)] rounded-full overflow-hidden my-3">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${r.score}%`, background: style.bar }} />
                  </div>
                  <p className="text-sm text-[var(--ink)] font-medium leading-relaxed mb-1.5">{r.finding}</p>
                  <p className="text-xs text-[var(--ink-2)] leading-relaxed mb-3">{r.why}</p>
                  {r.mitigations.length > 0 && (
                    <div className="border-t border-[var(--border-default)] pt-3">
                      <div className="text-[10px] tracking-[0.08em] uppercase text-[var(--muted)] mb-2">{L('كيف تقلّصه', 'How to shrink it')}</div>
                      <ul className="flex flex-col gap-1.5">
                        {r.mitigations.map((m, idx) => (
                          <li key={idx} className="text-xs text-[var(--ink-2)] flex gap-2">
                            <span className="text-[var(--green)]">→</span>
                            <span>
                              {m.text}
                              {m.href && m.linkLabel && (
                                <>
                                  {' '}·{' '}
                                  <Link href={m.href} className="text-[var(--green-dark)] font-medium hover:underline">
                                    {m.linkLabel}
                                  </Link>
                                </>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {r.id === 'health' && (
                    <button
                      onClick={() => setInsurance(!(inputs?.hasHealthInsurance ?? false))}
                      className="text-[10px] text-[var(--muted)] hover:text-[var(--ink-2)] mt-2"
                    >
                      {L('غيّر إجابتي', 'Change my answer')}
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-3 items-start bg-[#FAF6EA] border border-[var(--gold)] rounded-xl p-4">
        <div className="w-7 h-7 rounded-full bg-[var(--gold)] flex items-center justify-center font-serif font-semibold text-white text-sm shrink-0">M</div>
        <div className="text-xs text-[#5A4A1A] leading-relaxed">
          <strong className="text-[#3A2F0A]">{L('المخاطرة ليست مزاجاً — بل رقم.', "Risk isn't a mood — it's a number.")}</strong> {L(
            'تتحدّث هذه القراءات كلّما تحدّثت بياناتك. وحين يدفع قرارٌ في مكانٍ آخر من مَالمايند إحداها في الاتجاه الخطأ — رهنٌ أكبر، تغطيةٌ مستنزَفة — فهذه الصفحة هي حيث ترى التكلفة مُسمّاة.',
            "These readings update as your data does. When a decision elsewhere in MalMind would push one of them the wrong way — a bigger mortgage, a drained runway — this page is where you'll see the cost named."
          )}
        </div>
      </div>
    </div>
  );
}
