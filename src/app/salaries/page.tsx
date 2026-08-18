'use client';

// Salaries — light on the numbers nobody shares at the majlis. Your
// salary from the Log against the age-matched national curve, the
// common shape of a Saudi package, and the thinking tools for the
// raise conversation:
//   D1 · you vs the salary index at your age
//   D2 · the salary curve across ages, with your marker
//   D3 · the raise engine — what +10% actually changes for you
//   D4 · the package anatomy — basic, housing, transport, GOSI
// Sector ranges and curves are disclosed illustrative references.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceDot } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { buildBenchmarkCurves, BENCHMARK_START_AGE } from '@/lib/positioningBenchmarks';
import ToolStage from '@/components/shared/ToolStage';

interface Snap { year: number; month: number; income: number; expenses: number }

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

import { SALARY_ROLES, SALARY_CITIES, SALARY_TREND, REF_SOURCES } from '@/lib/saudiReference';

export default function SalariesPage() {
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const [snaps, setSnaps] = useState<Snap[] | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [raisePct, setRaisePct] = useState(10);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSnaps([]); return; }
      const [{ data }, { data: prof }] = await Promise.all([
        supabase.from('financial_snapshots').select('year, month, income, expenses').eq('user_id', user.id)
          .order('year', { ascending: true }).order('month', { ascending: true }),
        supabase.from('profiles').select('age').eq('id', user.id).single(),
      ]);
      setSnaps((data as Snap[]) ?? []);
      setAge((prof as { age: number | null } | null)?.age ?? null);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const d = useMemo(() => {
    if (!snaps || snaps.length === 0) return null;
    const recent = snaps.slice(-6);
    const avgIncome = recent.reduce((a, s) => a + Number(s.income), 0) / recent.length;
    const avgExpenses = recent.reduce((a, s) => a + Number(s.expenses), 0) / recent.length;
    const saved = avgIncome - avgExpenses;
    let curve: { age: number; national: number; higher: number }[] = [];
    let atAge: { national: number; higher: number } | null = null;
    if (age && age >= BENCHMARK_START_AGE) {
      const from = Math.max(BENCHMARK_START_AGE, age - 6);
      const to = age + 6;
      const c = buildBenchmarkCurves(from, to);
      curve = c.incomeNational.map((v, i) => ({ age: from + i, national: v, higher: c.incomeHigher[i] }));
      const own = buildBenchmarkCurves(age, age);
      atAge = { national: own.incomeNational[0] || 0, higher: own.incomeHigher[0] || 0 };
    }
    return { avgIncome, avgExpenses, saved, curve, atAge };
  }, [snaps, age]);

  if (snaps === null) return <div className="text-sm text-[var(--muted)]">…</div>;

  const mult = d && d.atAge && d.atAge.national > 0 ? d.avgIncome / d.atAge.national : null;

  return (
    <div className="max-w-3xl">
      <div className="text-[10px] tracking-[0.12em] uppercase text-[var(--gold)] mb-1">☀ {L('اليوم', 'Today')}</div>
      <h1 className="font-serif text-3xl font-semibold text-[var(--ink)] mb-1">🪙 {L('الرواتب', 'Salaries')}</h1>
      <p className="text-sm text-[var(--ink-2)] mb-6 max-w-2xl">
        {L('ضوء على الأرقام التي لا يتشاركها أحد في المجلس — وراتبك أنت على المسطرة نفسها.', "Light on the numbers nobody shares at the majlis — with YOUR salary on the same ruler.")}
      </p>

      {/* D1 · you vs the index */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
        {d && mult !== null ? (
          <div className="flex items-center gap-5 flex-wrap">
            <div>
              <div className="text-[9px] text-[var(--muted)]">{L('راتبك (متوسط ٦ أشهر)', 'Your salary (6-mo avg)')}</div>
              <div className="font-serif text-3xl font-bold text-[var(--ink)]" dir="ltr">{fmt(d.avgIncome)}</div>
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="text-[10px] text-[var(--ink-2)] mb-1" dir="ltr">
                <span className="font-bold" style={{ color: mult >= 1 ? 'var(--green-dark)' : '#E0922A' }}>×{mult.toFixed(2)}</span>{' '}
                {L(`من مؤشر الراتب الوطني لعمرك (${fmt(d.atAge!.national)})`, `the national salary index at your age (${fmt(d.atAge!.national)})`)}
              </div>
              <div className="relative h-2.5 rounded-full bg-[var(--border-faint)]" dir="ltr">
                <div className="absolute inset-y-0 start-0 rounded-full" style={{ width: `${Math.min(100, (d.avgIncome / (d.atAge!.higher * 1.1 || 1)) * 100)}%`, background: mult >= 1 ? 'var(--green-dark)' : '#E0922A' }} />
                <div className="absolute top-[-3px] bottom-[-3px] w-0.5 bg-[var(--ink)]" style={{ left: `${Math.min(99, (d.atAge!.national / (d.atAge!.higher * 1.1 || 1)) * 100)}%` }} title={L('الوطني', 'National')} />
                <div className="absolute top-[-3px] bottom-[-3px] w-0.5 bg-[var(--gold)]" style={{ left: `${Math.min(99, (d.atAge!.higher / (d.atAge!.higher * 1.1 || 1)) * 100)}%` }} title={L('النخبة', 'Higher peers')} />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-[12px] text-[var(--muted)]">
            {L('نحتاج دخلاً في ', 'We need income in ')}<Link href="/log" className="text-[var(--green-dark)] font-semibold hover:underline">{L('السِّجل', 'the Log')}</Link>{L(' وعمرك في الملف — ثم تقف على المسطرة.', ' and your age in the profile — then you stand on the ruler.')}
          </p>
        )}
      </div>

      {/* D2 · the curve across ages + sector ranges */}
      <ToolStage level={2} title={L('منحنى الرواتب والقطاعات', 'The salary curve & sectors')}>
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
        {d && d.curve.length > 0 && age && (
          <div className="h-44 mb-4" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={d.curve} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border-faint)" />
                <XAxis dataKey="age" tick={{ fontSize: 9, fill: 'var(--muted)' }} reversed={ar} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--muted)' }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} width={36} orientation={ar ? 'right' : 'left'} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 11 }} formatter={(v) => fmt(Number(v))} labelFormatter={(a) => L(`العمر ${a}`, `Age ${a}`)} />
                <Line type="monotone" dataKey="national" name={L('الوطني', 'National')} stroke="var(--ink)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="higher" name={L('النخبة', 'Higher peers')} stroke="var(--gold)" strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
                <ReferenceDot x={age} y={d.avgIncome} r={5} fill="var(--green)" stroke="var(--surface-card)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--muted)] font-semibold mb-2">{L('متوسطات الأدوار عبر القطاعات (شهرياً)', 'Role averages across sectors (monthly)')}</div>
        <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5 mb-3">
          {SALARY_ROLES.map((s) => (
            <div key={s.en} className="flex items-center gap-2 text-[11px] text-[var(--ink-2)]">
              <span className="flex-1">{ar ? s.ar : s.en}</span>
              <span className="font-semibold text-[var(--ink)]" dir="ltr">{fmt(s.lo)}–{fmt(s.hi)}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
          {SALARY_CITIES.map((c) => (
            <span key={c.en} className="text-[10px] text-[var(--ink-2)]">
              📍 {ar ? c.ar : c.en}: <span className="font-semibold" dir="ltr">{fmt(c.avg)}</span> {L('متوسطاً', 'avg')}
            </span>
          ))}
          <span className="text-[10px] text-[var(--ink-2)]">
            📈 {L(`المتوسط الوطني: ${fmt(SALARY_TREND.from.avg)} (${SALARY_TREND.from.year}) ← ${fmt(SALARY_TREND.to.avg)} (${SALARY_TREND.to.year})`, `National average: ${fmt(SALARY_TREND.from.avg)} (${SALARY_TREND.from.year}) → ${fmt(SALARY_TREND.to.avg)} (${SALARY_TREND.to.year})`)}
          </span>
        </div>
        <p className="text-[9px] text-[var(--muted)]">
          {L(`المصدر: ${REF_SOURCES.jisr.ar} — مسح ٣٬٠٠٠+ شركة و٢٤٠٬٠٠٠+ موظف.`, `Source: ${REF_SOURCES.jisr.en} — a survey of 3,000+ companies and 240,000+ employees.`)}
        </p>
      </div>
      </ToolStage>

      {/* D3 · the raise engine */}
      <ToolStage level={3} title={L('محرّك العلاوة', 'The raise engine')}>
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
        <label className="block mb-3">
          <span className="flex justify-between text-[10px] font-semibold text-[var(--muted)] mb-1">
            <span>{L('علاوة مفترضة ٪', 'A hypothetical raise %')}</span>
            <span className="text-[var(--ink)]" dir="ltr">+{raisePct}%</span>
          </span>
          <input type="range" min={5} max={50} step={5} value={raisePct} onChange={(e) => setRaisePct(Number(e.target.value))} className="w-full accent-[var(--green)]" dir="ltr" />
        </label>
        {d ? (
          <p className="text-xs text-[var(--ink-2)] leading-relaxed">
            {L(
              `علاوة ${raisePct}٪ تعني ${fmt((d.avgIncome * raisePct) / 100)}/شهرياً إضافية — وإن ثبّتّ مصروفك، يقفز ادخارك من ${fmt(d.saved)} إلى ${fmt(d.saved + (d.avgIncome * raisePct) / 100)}/شهرياً (${fmt(((d.avgIncome * raisePct) / 100) * 12)} في السنة). العلاوة كلها تذهب للادخار إن لم يرها نمط حياتك.`,
              `A ${raisePct}% raise means ${fmt((d.avgIncome * raisePct) / 100)}/mo more — and if your spending holds, your saving jumps from ${fmt(d.saved)} to ${fmt(d.saved + (d.avgIncome * raisePct) / 100)}/mo (${fmt(((d.avgIncome * raisePct) / 100) * 12)} a year). The whole raise goes to savings if your lifestyle never sees it.`
            )}
          </p>
        ) : (
          <p className="text-[11px] text-[var(--muted)]">{L('يحتاج دخلاً في السِّجل.', 'Needs income in the Log.')}</p>
        )}
      </div>
      </ToolStage>

      {/* D4 · the package anatomy */}
      <ToolStage level={4} title={L('تشريح الراتب السعودي', 'The Saudi package anatomy')}>
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
        <p className="text-xs text-[var(--ink-2)] leading-relaxed mb-3">
          {L(
            'الباقة السعودية النموذجية: راتب أساسي + بدل سكن (٢٥٪ من الأساسي عادةً) + بدل نقل (١٠٪ عادةً) — واشتراك التأمينات (GOSI) يُحسب من الأساسي والسكن. عند مفاوضة أي عرض، فاوض على الأساسي أولاً: البدلات والتأمينات ومكافأة نهاية الخدمة كلها تُشتق منه.',
            'The typical Saudi package: basic salary + housing allowance (commonly 25% of basic) + transport (commonly 10%) — and GOSI contributions are computed on basic + housing. When negotiating any offer, negotiate the BASIC first: allowances, GOSI and end-of-service benefits all derive from it.'
          )}
        </p>
        {d && (
          <div className="grid grid-cols-3 gap-2">
            {([
              [L('لو راتبك الكلي', 'If your total is'), fmt(d.avgIncome)],
              [L('أساسي تقريبي (÷١٫٣٥)', 'Approx. basic (÷1.35)'), fmt(d.avgIncome / 1.35)],
              [L('نهاية خدمة سنوية تقريبية', 'Yearly EOS accrual ≈'), fmt((d.avgIncome / 1.35) / 2)],
            ] as [string, string][]).map(([name, val]) => (
              <div key={name} className="bg-[var(--surface-1)] border border-[var(--border-faint)] rounded-xl px-3 py-2.5">
                <div className="text-[9px] text-[var(--muted)]">{name}</div>
                <div className="text-sm font-bold text-[var(--ink)]" dir="ltr">{val}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      </ToolStage>

      <p className="text-[9px] text-[var(--muted)] leading-relaxed">
        {L('المنحنيات والنسب استرشادية معلَنة كذلك — للمقارنة الكاملة: ', 'Curves and norms are disclosed illustrative references — for the full comparison: ')}
        <Link href="/positioning" className="text-[var(--green-dark)] font-semibold hover:underline">{L('موقعك المالي ←', 'Positioning →')}</Link>
      </p>
    </div>
  );
}
