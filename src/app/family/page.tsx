'use client';

// Family planning — the biggest life decisions, given numbers before
// they are lived. Wired to the Log (income, spending, saving pace):
//   D1 · the family load today — dependents vs your flow
//   D2 · the milestones ladder — marriage, each child's arrival,
//        schooling — as editable assumptions
//   D3 · the funding plan — months to each milestone at your pace
//   D4 · the long curve — what raising each child to 18 truly costs
// Assumptions persist locally (mm-family) and are yours to reshape.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import ToolStage from '@/components/shared/ToolStage';

interface Snap { year: number; month: number; income: number; expenses: number; cash: number }
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
const KEY = 'mm-family';

export default function FamilyPage() {
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const [snaps, setSnaps] = useState<Snap[] | null>(null);
  const [kids, setKids] = useState(0);
  const [perKid, setPerKid] = useState(1500);
  const [marriageFund, setMarriageFund] = useState(80000);
  const [firstYear, setFirstYear] = useState(20000);
  const [schoolYearly, setSchoolYearly] = useState(15000);
  const [married, setMarried] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p.kids != null) setKids(p.kids);
        if (p.perKid != null) setPerKid(p.perKid);
        if (p.marriageFund != null) setMarriageFund(p.marriageFund);
        if (p.firstYear != null) setFirstYear(p.firstYear);
        if (p.schoolYearly != null) setSchoolYearly(p.schoolYearly);
        if (p.married != null) setMarried(p.married);
      }
    } catch { /* ignore */ }
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSnaps([]); return; }
      const { data } = await supabase.from('financial_snapshots').select('year, month, income, expenses, cash').eq('user_id', user.id)
        .order('year', { ascending: true }).order('month', { ascending: true });
      setSnaps((data as Snap[]) ?? []);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try { window.localStorage.setItem(KEY, JSON.stringify({ kids, perKid, marriageFund, firstYear, schoolYearly, married })); } catch { /* ignore */ }
  }, [kids, perKid, marriageFund, firstYear, schoolYearly, married]);

  const me = useMemo(() => {
    if (!snaps || snaps.length === 0) return null;
    const recent = snaps.slice(-6);
    const avgIncome = recent.reduce((a, s) => a + Number(s.income), 0) / recent.length;
    const avgExpenses = recent.reduce((a, s) => a + Number(s.expenses), 0) / recent.length;
    return { avgIncome, avgExpenses, saved: avgIncome - avgExpenses, cash: Number(snaps[snaps.length - 1].cash) };
  }, [snaps]);

  const d = useMemo(() => {
    const familyMonthly = kids * perKid;
    const schoolMonthly = (kids * schoolYearly) / 12;
    const totalMonthly = familyMonthly + schoolMonthly;
    const perChildTo18 = perKid * 12 * 18 + schoolYearly * 12 + firstYear;
    const marriageMonths = me && me.saved > 0 && !married ? Math.ceil(Math.max(0, marriageFund - me.cash * 0.5) / me.saved) : null;
    const nextChildMonths = me && me.saved > 0 ? Math.ceil(firstYear / me.saved) : null;
    return { familyMonthly, schoolMonthly, totalMonthly, perChildTo18, marriageMonths, nextChildMonths };
  }, [kids, perKid, marriageFund, firstYear, schoolYearly, married, me]);

  if (snaps === null) return <div className="text-sm text-[var(--muted)]">…</div>;

  const lever = (label: string, val: number, min: number, max: number, step: number, set: (n: number) => void, show: string) => (
    <label className="block">
      <span className="flex justify-between text-[10px] font-semibold text-[var(--muted)] mb-1"><span>{label}</span><span className="text-[var(--ink)]" dir="ltr">{show}</span></span>
      <input type="range" min={min} max={max} step={step} value={val} onChange={(e) => set(Number(e.target.value))} className="w-full accent-[var(--green)]" dir="ltr" />
    </label>
  );

  return (
    <div className="max-w-3xl">
      <div className="text-[10px] tracking-[0.12em] uppercase text-[var(--gold)] mb-1">🔭 {L('المستقبل', 'The Future')}</div>
      <h1 className="font-serif text-3xl font-semibold text-[var(--ink)] mb-1">👨‍👩‍👧 {L('تخطيط الأسرة', 'Family planning')}</h1>
      <p className="text-sm text-[var(--ink-2)] mb-6 max-w-2xl">
        {L('أكبر قرارات العمر — بأرقامها قبل أن تُعاش، وبأرقامك أنت.', 'The biggest decisions of a lifetime — in numbers before they are lived, and in YOURS.')}
      </p>

      {/* D1 · the family load */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4 mb-4">
          {lever(L('عدد الأبناء (الحاليون أو المخطط لهم)', 'Children (current or planned)'), kids, 0, 8, 1, setKids, String(kids))}
          {lever(L('كلفة الطفل شهرياً', 'Monthly cost per child'), perKid, 500, 5000, 100, setPerKid, fmt(perKid))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {([
            [L('حِمل الأسرة شهرياً', 'Family load / mo'), fmt(d.totalMonthly), d.totalMonthly > 0 ? '#E0922A' : 'var(--muted)'],
            [L('من دخلك', 'Of your income'), me && me.avgIncome > 0 ? `${Math.round((d.totalMonthly / me.avgIncome) * 100)}%` : '—', 'var(--ink)'],
            [L('ادخارك بعده ≈', 'Saving after it ≈'), me ? fmt(me.saved - d.totalMonthly) : '—', me && me.saved - d.totalMonthly >= 0 ? 'var(--green-dark)' : '#D64545'],
          ] as [string, string, string][]).map(([name, val, color]) => (
            <div key={name} className="bg-[var(--surface-1)] border border-[var(--border-faint)] rounded-xl px-3 py-2.5">
              <div className="text-[9px] text-[var(--muted)]">{name}</div>
              <div className="text-sm font-bold" style={{ color }} dir="ltr">{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* D2 · the milestones */}
      <ToolStage level={2} title={L('سلّم المحطات', 'The milestones ladder')}>
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
        <label className="flex items-center gap-2 mb-4 cursor-pointer">
          <input type="checkbox" checked={married} onChange={(e) => setMarried(e.target.checked)} className="accent-[var(--green)]" />
          <span className="text-[11px] text-[var(--ink-2)]">{L('متزوج بالفعل', 'Already married')}</span>
        </label>
        <div className="grid sm:grid-cols-3 gap-x-6 gap-y-4">
          {!married && lever(L('صندوق الزواج (مهر وتجهيز)', 'Marriage fund (mahr & setup)'), marriageFund, 20000, 300000, 5000, setMarriageFund, fmt(marriageFund))}
          {lever(L('سنة الطفل الأولى (ولادة وتجهيز)', "A child's first year (birth & setup)"), firstYear, 5000, 80000, 2500, setFirstYear, fmt(firstYear))}
          {lever(L('مدرسة الطفل سنوياً', 'Schooling per child, yearly'), schoolYearly, 0, 60000, 2500, setSchoolYearly, schoolYearly === 0 ? L('حكومي', 'public') : fmt(schoolYearly))}
        </div>
        <p className="text-[9px] text-[var(--muted)] mt-3">{L('افتراضات قابلة للتعديل — عدّلها لتطابق واقعك ومدينتك.', 'Editable assumptions — reshape them to your reality and your city.')}</p>
      </div>
      </ToolStage>

      {/* D3 · the funding plan */}
      <ToolStage level={3} title={L('خطة التمويل', 'The funding plan')}>
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
        {me ? (
          <div className="flex flex-col gap-2 text-xs text-[var(--ink-2)] leading-relaxed">
            {!married && d.marriageMonths !== null && (
              <p>💍 {L(
                `صندوق الزواج (${fmt(marriageFund)}): بنصف نقدك الحالي + إيقاع ادخارك (${fmt(me.saved)}/شهرياً) تبلغه خلال ${d.marriageMonths} شهراً.`,
                `The marriage fund (${fmt(marriageFund)}): with half your current cash + your saving pace (${fmt(me.saved)}/mo), you reach it in ${d.marriageMonths} months.`
              )}</p>
            )}
            {d.nextChildMonths !== null && (
              <p>👶 {L(
                `سنة الطفل الأولى (${fmt(firstYear)}): تُجمع خلال ${d.nextChildMonths} شهراً بإيقاعك — اجعلها «صندوق هدف» لتتحرك وحدها.`,
                `A child's first year (${fmt(firstYear)}): gathered in ${d.nextChildMonths} months at your pace — make it a Goal Fund so it moves on its own.`
              )}</p>
            )}
            {me.saved <= 0 && <p>⚠️ {L('ادخارك الحالي سالب — كل محطة تبدأ من ضبط التدفق في «الميزانية».', 'Your saving is negative — every milestone starts with steadying the flow in Budgeting.')}</p>}
            <div className="flex flex-wrap gap-2 mt-1">
              <Link href="/goal-fund" className="text-[10px] font-semibold text-[var(--green-dark)] border border-[var(--green-border)] rounded-lg px-3 py-1.5 hover:bg-[var(--green-bg)] transition-colors">🎯 {L('أنشئ صندوق هدف ←', 'Create a Goal Fund →')}</Link>
              <Link href="/mortgage" className="text-[10px] font-semibold text-[var(--green-dark)] border border-[var(--green-border)] rounded-lg px-3 py-1.5 hover:bg-[var(--green-bg)] transition-colors">🏠 {L('بيت العائلة — الرهن ←', 'The family home — Mortgage →')}</Link>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-[var(--muted)]">{L('سجّل شهراً في السِّجل لتُحسب الخطة بإيقاعك.', 'Log a month and the plan gets computed at your pace.')}</p>
        )}
      </div>
      </ToolStage>

      {/* D4 · the long curve */}
      <ToolStage level={4} title={L('المنحنى الطويل — إلى الثامنة عشرة', 'The long curve — to eighteen')}>
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
        <div className="grid grid-cols-2 gap-2 mb-3">
          {([
            [L('كلفة الطفل الواحد حتى ١٨ ≈', 'One child to 18 ≈'), fmt(d.perChildTo18)],
            [kids > 0 ? L(`أبناؤك الـ${kids} حتى ١٨ ≈`, `Your ${kids} to 18 ≈`) : L('العائلة حتى ١٨', 'The family to 18'), kids > 0 ? fmt(d.perChildTo18 * kids) : '—'],
          ] as [string, string][]).map(([name, val]) => (
            <div key={name} className="bg-[var(--surface-1)] border border-[var(--border-faint)] rounded-xl px-3 py-2.5">
              <div className="text-[9px] text-[var(--muted)]">{name}</div>
              <div className="text-sm font-bold text-[var(--ink)]" dir="ltr">{val}</div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-[var(--ink-2)] leading-relaxed">
          {L(
            'الرقم ليس ليخيفك — بل ليُقسَّم: كل محطة صندوقُ هدفٍ صغير يتحرك بإيقاعك، والرقم الكبير يذوب في سنوات.',
            "The number isn't there to scare — it's there to be divided: every milestone a small goal fund moving at your pace, and the big number dissolves into years."
          )}
        </p>
      </div>
      </ToolStage>

      <Link
        href="/advisor"
        className="block w-full text-center text-sm font-semibold bg-[var(--green-dark)] text-white rounded-xl px-4 py-3"
        onClick={() => { try { window.sessionStorage.setItem('mm-ask', `We're planning our family: ${kids} children, ~${perKid}/mo each, schooling ${schoolYearly}/yr. Given my income and saving pace, how should I sequence the milestones?`); } catch { /* ignore */ } }}
      >
        🧠 {L('اعرض خطتكم على العقل ←', 'Put the plan to the Brain →')}
      </Link>
    </div>
  );
}
