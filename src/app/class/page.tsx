'use client';

// Socioeconomic class — the ladder nobody names out loud, named with
// numbers. Your income and net worth from the Log, measured against
// the age-matched national curves, place you on a five-rung ladder:
//   D1 · the verdict — which rung, in one card
//   D2 · the ladder itself, with your marker and both multiples
//   D3 · the gap — what moves you one rung up, in riyals
//   D4 · the trajectory — years to the next rung at your pace
// The benchmarks are the same disclosed-as-illustrative curves the
// Positioning tool uses; the honesty note stays on screen.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { buildBenchmarkCurves, BENCHMARK_START_AGE } from '@/lib/positioningBenchmarks';
import { CLASS_BANDS, REF_SOURCES } from '@/lib/saudiReference';
import ToolStage from '@/components/shared/ToolStage';

interface Snap {
  year: number; month: number;
  cash: number; stocks: number; real_estate: number; equity: number; other_assets: number;
  liabilities: number; income: number; expenses: number;
}

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

// the five rungs — the GRC study's household-income bands, verbatim

export default function ClassPage() {
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const [snaps, setSnaps] = useState<Snap[] | null>(null);
  const [age, setAge] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSnaps([]); return; }
      const [{ data }, { data: prof }] = await Promise.all([
        supabase.from('financial_snapshots')
          .select('year, month, cash, stocks, real_estate, equity, other_assets, liabilities, income, expenses')
          .eq('user_id', user.id).order('year', { ascending: true }).order('month', { ascending: true }),
        supabase.from('profiles').select('age').eq('id', user.id).single(),
      ]);
      setSnaps((data as Snap[]) ?? []);
      setAge((prof as { age: number | null } | null)?.age ?? null);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const d = useMemo(() => {
    if (!snaps || snaps.length === 0 || !age || age < BENCHMARK_START_AGE) return null;
    const latest = snaps[snaps.length - 1];
    const recent = snaps.slice(-6);
    const avgIncome = recent.reduce((a, s) => a + Number(s.income), 0) / recent.length;
    const avgExpenses = recent.reduce((a, s) => a + Number(s.expenses), 0) / recent.length;
    const assets = Number(latest.cash) + Number(latest.stocks) + Number(latest.equity) + Number(latest.real_estate) + Number(latest.other_assets);
    const netWorth = assets - Number(latest.liabilities);
    const curves = buildBenchmarkCurves(age, age);
    const natIncome = curves.incomeNational[0] || 1;
    const natNW = curves.networthNational[0] || 1;
    const incomeMult = avgIncome / natIncome;
    const wealthMult = Math.max(0, netWorth) / natNW;
    // the GRC bands classify by household monthly income
    let rung = 0;
    CLASS_BANDS.forEach((b, i) => { if (avgIncome >= b.lo) rung = i; });
    const next = CLASS_BANDS[rung + 1] ?? null;
    const gap = next ? Math.max(0, next.lo - avgIncome) : null;
    const raiseNeededPct = gap !== null && avgIncome > 0 ? (gap / avgIncome) * 100 : null;
    const saved = avgIncome - avgExpenses;
    return { avgIncome, netWorth, incomeMult, wealthMult, rung, next, gap, raiseNeededPct, saved };
  }, [snaps, age]);

  if (snaps === null) return <div className="text-sm text-[var(--muted)]">…</div>;

  return (
    <div className="max-w-3xl">
      <div className="text-[10px] tracking-[0.12em] uppercase text-[var(--gold)] mb-1">☀ {L('اليوم', 'Today')}</div>
      <h1 className="font-serif text-3xl font-semibold text-[var(--ink)] mb-1">🎖 {L('طبقتك الاقتصادية', 'Socioeconomic class')}</h1>
      <p className="text-sm text-[var(--ink-2)] mb-6 max-w-2xl">
        {L('السلّم الذي لا يسمّيه أحد بصوت عالٍ — مسمّىً بالأرقام، وبأرقامك أنت.', 'The ladder nobody names out loud — named with numbers, and with yours.')}
      </p>

      {!d ? (
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 text-[12px] text-[var(--muted)] leading-relaxed">
          {L('نحتاج شهراً في ', 'We need a month in ')}<Link href="/log" className="text-[var(--green-dark)] font-semibold hover:underline">{L('السِّجل', 'the Log')}</Link>{L(' وعمرك في ملفك — ثم يظهر السلّم.', ' and your age in the profile — then the ladder appears.')}
        </div>
      ) : (
        <>
          {/* D1 · the rung */}
          <div className="bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] rounded-2xl p-6 text-white mb-4 text-center">
            <div className="text-[10px] tracking-[0.12em] uppercase text-[var(--gold)] mb-2">{L('موقعك على السلّم', 'Your rung')}</div>
            <div className="text-4xl mb-1" aria-hidden>{CLASS_BANDS[d.rung].icon}</div>
            <div className="font-serif text-3xl font-bold">{ar ? CLASS_BANDS[d.rung].ar : CLASS_BANDS[d.rung].en}</div>
            <div className="text-[11px] text-white/60 mt-2" dir="ltr">
              {fmt(d.avgIncome)} {L('شهرياً — ضمن نطاق الدرجة', 'monthly — inside the band')} {CLASS_BANDS[d.rung].hi === null ? `${fmt(CLASS_BANDS[d.rung].lo)}+` : `${fmt(CLASS_BANDS[d.rung].lo)}–${fmt(CLASS_BANDS[d.rung].hi!)}`}
            </div>
          </div>

          {/* D2 · the ladder */}
          <ToolStage level={2} title={L('السلّم كاملاً', 'The full ladder')}>
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
            <div className="flex flex-col-reverse gap-1.5 mb-4">
              {CLASS_BANDS.map((r, i) => (
                <div key={r.key} className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 ${i === d.rung ? 'border-[var(--gold)] bg-[var(--gold)]/10' : 'border-[var(--border-faint)] bg-[var(--surface-1)]'}`}>
                  <span className="text-base" aria-hidden>{r.icon}</span>
                  <span className={`text-[12px] ${i === d.rung ? 'font-bold text-[var(--ink)]' : 'text-[var(--ink-2)]'}`}>{ar ? r.ar : r.en}</span>
                  <span className="ms-auto text-[9px] text-[var(--muted)]" dir="ltr">{r.hi === null ? `${fmt(r.lo)}+` : `${fmt(r.lo)}–${fmt(r.hi)}`}</span>
                  {i === d.rung && <span className="text-[10px] font-bold text-[var(--gold)]">📍 {L('أنت هنا', 'You are here')}</span>}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {([
                [L('دخلك مقابل الوطني', 'Income vs national'), `×${d.incomeMult.toFixed(2)}`],
                [L('ثروتك مقابل الوطني', 'Wealth vs national'), `×${d.wealthMult.toFixed(2)}`],
              ] as [string, string][]).map(([name, val]) => (
                <div key={name} className="bg-[var(--surface-1)] border border-[var(--border-faint)] rounded-xl px-3 py-2.5">
                  <div className="text-[9px] text-[var(--muted)]">{name}</div>
                  <div className="text-sm font-bold text-[var(--ink)]" dir="ltr">{val}</div>
                </div>
              ))}
            </div>
          </div>
          </ToolStage>

          {/* D3 · the gap to the next rung */}
          {d.next && (
            <ToolStage level={3} title={L('فجوة الدرجة التالية', 'The gap to the next rung')}>
            <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
              <div className="text-sm font-medium text-[var(--ink)] mb-2">{d.next.icon} {L(`إلى «${d.next.ar}»`, `To “${d.next.en}”`)}</div>
              <p className="text-xs text-[var(--ink-2)] leading-relaxed">
                {d.gap !== null && d.raiseNeededPct !== null && L(
                  `تنقصك ${fmt(d.gap)} شهرياً لتدخل نطاق «${d.next.ar}» (${fmt(d.next.lo)}+) — أي علاوة نحو ${Math.ceil(d.raiseNeededPct)}٪ على دخلك الحالي، أو دخل جانبي بالحجم نفسه. محرّك العلاوة في «الرواتب» يحسبها لك.`,
                  `You're ${fmt(d.gap)}/mo short of the “${d.next.en}” band (${fmt(d.next.lo)}+) — a raise of ~${Math.ceil(d.raiseNeededPct)}% on your current income, or a side income of the same size. The raise engine in Salaries prices it.`
                )}
              </p>
            </div>
            </ToolStage>
          )}

          {/* D4 · the trajectory */}
          <ToolStage level={4} title={L('المسار الزمني', 'The trajectory')}>
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
            <p className="text-xs text-[var(--ink-2)] leading-relaxed mb-2">
              {d.next === null
                ? L('أنت على أعلى درجات هذا السلّم — السؤال التالي ليس الصعود بل البقاء والتوريث.', "You're on the ladder's top rung — the next question isn't climbing but staying, and passing it on.")
                : L(
                    `الدرجات تُصعد بالدخل، والثبات عليها يُبنى بالثروة: ثروتك اليوم ×${d.wealthMult.toFixed(2)} من الوطني ودخلك ×${d.incomeMult.toFixed(2)} — إن كان مضاعف ثروتك أدنى من مضاعف دخلك، فأنت تعيش الدرجة ولا تملكها بعد؛ وادخارك (${fmt(d.saved)}/شهرياً) هو ما يحوّل الدخل إلى درجةٍ تدوم.`,
                    `Rungs are climbed with income and HELD with wealth: your wealth today is ×${d.wealthMult.toFixed(2)} the national mark while your income is ×${d.incomeMult.toFixed(2)} — if the wealth multiple trails the income multiple, you live the rung but don't own it yet; your saving (${fmt(d.saved)}/mo) is what turns income into a rung that lasts.`
                  )}
            </p>
            <p className="text-[9px] text-[var(--muted)]">{L(`نطاقات الدرجات من: ${REF_SOURCES.grc.ar}.`, `Band definitions: ${REF_SOURCES.grc.en}.`)}</p>
          </div>
          </ToolStage>

          <p className="text-[9px] text-[var(--muted)] leading-relaxed">
            {L(
              'المؤشرات الوطنية منحنيات استرشادية معلَنة كذلك — وللمقارنة الكاملة مع أقرانك: أداة «موقعك المالي».',
              'The national indices are disclosed illustrative curves — for the full peer comparison, see Positioning.'
            )}{' '}
            <Link href="/positioning" className="text-[var(--green-dark)] font-semibold hover:underline">{L('افتح موقعك المالي ←', 'Open Positioning →')}</Link>
          </p>
        </>
      )}
    </div>
  );
}
