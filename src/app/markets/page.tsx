'use client';

// Markets & Indices — the outside world's numbers beside your own.
// Two halves: the global board (indices, commodities, crypto — live
// through the quotes route), and YOU VS THE INDICES: your income and
// net worth measured against the age-matched national and higher-peer
// benchmark curves. The world's numbers mean more with yours on the
// same ruler.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { fetchQuotes, quoteMap, type QuoteResult } from '@/lib/quotes';
import { buildBenchmarkCurves, BENCHMARK_START_AGE } from '@/lib/positioningBenchmarks';
import { HOUSEHOLD, REF_SOURCES } from '@/lib/saudiReference';

interface Snap {
  year: number; month: number;
  cash: number; stocks: number; real_estate: number; equity: number; other_assets: number;
  liabilities: number; income: number; expenses: number;
}

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
const fmtPrice = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });

// the board's roster — the indices most watched from Riyadh outward
const MARKETS: { sym: string; badge: string; ar: string; en: string }[] = [
  { sym: '^TASI.SR', badge: '🇸🇦', ar: 'تاسي — السوق السعودي', en: 'TASI — Saudi market' },
  { sym: '^GSPC', badge: '🇺🇸', ar: 'إس آند بي ٥٠٠', en: 'S&P 500' },
  { sym: '^IXIC', badge: '🇺🇸', ar: 'ناسداك', en: 'Nasdaq' },
  { sym: '^DJI', badge: '🇺🇸', ar: 'داو جونز', en: 'Dow Jones' },
  { sym: '^FTSE', badge: '🇬🇧', ar: 'فوتسي ١٠٠', en: 'FTSE 100' },
  { sym: '^GDAXI', badge: '🇩🇪', ar: 'داكس', en: 'DAX' },
  { sym: '^N225', badge: '🇯🇵', ar: 'نيكاي ٢٢٥', en: 'Nikkei 225' },
  { sym: 'GC=F', badge: '🪙', ar: 'الذهب', en: 'Gold' },
  { sym: 'BZ=F', badge: '🛢', ar: 'خام برنت', en: 'Brent oil' },
  { sym: 'BTC-USD', badge: '₿', ar: 'بتكوين', en: 'Bitcoin' },
];

export default function MarketsPage() {
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);

  const [quotes, setQuotes] = useState<Map<string, QuoteResult> | null>(null);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [snaps, setSnaps] = useState<Snap[] | null>(null);
  const [age, setAge] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      // the world's numbers…
      try {
        const resp = await fetchQuotes(MARKETS.map((m) => m.sym));
        setQuotes(quoteMap(resp));
        setAsOf(resp.asOf);
      } catch {
        setQuotes(new Map());
      }
      // …and yours
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

  // you, measured on the same ruler as the indices
  const compare = useMemo(() => {
    if (!snaps || snaps.length === 0 || !age || age < BENCHMARK_START_AGE) return null;
    const recent = snaps.slice(-6);
    const avgIncome = recent.reduce((a, s) => a + Number(s.income), 0) / recent.length;
    const latest = snaps[snaps.length - 1];
    const netWorth =
      Number(latest.cash) + Number(latest.stocks) + Number(latest.equity) +
      Number(latest.real_estate) + Number(latest.other_assets) - Number(latest.liabilities);
    const curves = buildBenchmarkCurves(age, age);
    return {
      income: { you: avgIncome, national: curves.incomeNational[0] ?? 0, peer: curves.incomeHigher[0] ?? 0 },
      netWorth: { you: netWorth, national: curves.networthNational[0] ?? 0, peer: curves.networthHigher[0] ?? 0 },
    };
  }, [snaps, age]);

  const compareCard = (
    title: string, icon: string, you: number, national: number, peer: number, unit: string,
  ) => {
    const max = Math.max(you, peer, national, 1) * 1.12;
    const ratio = national > 0 ? you / national : null;
    const tone = ratio === null ? 'var(--muted)' : ratio >= 1 ? 'var(--green-dark)' : ratio >= 0.7 ? '#E0922A' : '#D64545';
    return (
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5">
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <div className="text-sm font-semibold text-[var(--ink)]">{icon} {title}</div>
          {ratio !== null && (
            <span className="text-[11px] font-bold" style={{ color: tone }} dir="ltr">
              ×{ratio.toFixed(2)} {L('من المؤشر الوطني', 'the national index')}
            </span>
          )}
        </div>
        <div className="text-[10px] text-[var(--muted)] mb-3">{unit}</div>
        <div className="relative h-6 rounded-full bg-[var(--border-faint)] overflow-visible" dir="ltr">
          <div className="absolute inset-y-0 start-0 rounded-full" style={{ width: `${Math.min(100, (you / max) * 100)}%`, background: tone, opacity: 0.85 }} />
          {/* the two index ticks standing on the same ruler */}
          {[
            { v: national, label: L('الوطني', 'National'), color: 'var(--ink)' },
            { v: peer, label: L('النخبة', 'Higher peers'), color: 'var(--gold)' },
          ].map((t) => (
            <div key={t.label} className="absolute top-[-4px] bottom-[-4px] w-0.5" style={{ left: `${Math.min(99, (t.v / max) * 100)}%`, background: t.color }}>
              <span className="absolute top-full mt-0.5 -translate-x-1/2 text-[8px] whitespace-nowrap" style={{ color: t.color }}>
                {t.label} {fmt(t.v)}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-6 text-[11px] text-[var(--ink-2)]" dir="ltr">
          <span className="font-bold" style={{ color: tone }}>{fmt(you)}</span> {L('أنت', 'you')}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-[var(--ink)]">🌐 {L('الأسواق والمؤشرات', 'Markets & Indices')}</h1>
        <p className="text-sm text-[var(--ink-2)]">
          {L('أرقام العالم — والمسطرة نفسها تقيسك أنت.', "The world's numbers — and the same ruler measuring you.")}
        </p>
      </div>

      {/* ── the global board ── */}
      <div className="mb-2 flex items-baseline justify-between gap-2 flex-wrap">
        <div className="text-[10px] tracking-[0.08em] uppercase text-[var(--gold)] font-semibold">{L('السوق العالمي الآن', 'The global board, now')}</div>
        {asOf && <div className="text-[9px] text-[var(--muted)]" dir="ltr">{L('آخر تحديث', 'as of')}: {new Date(asOf).toLocaleTimeString('en-GB')}</div>}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-8">
        {MARKETS.map((m) => {
          const q = quotes?.get(m.sym.toUpperCase());
          const ok = q && q.ok && q.price !== null;
          return (
            <div key={m.sym} className={`bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl px-3.5 py-3 ${quotes && !ok ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm leading-none" aria-hidden>{m.badge}</span>
                <span className="text-[10px] font-semibold text-[var(--ink-2)] truncate">{ar ? m.ar : m.en}</span>
              </div>
              {quotes === null ? (
                <div className="text-[11px] text-[var(--muted)]">…</div>
              ) : ok ? (
                <>
                  <div className="text-sm font-bold text-[var(--ink)]" dir="ltr">
                    {fmtPrice(q.price!)} <span className="text-[9px] font-medium text-[var(--muted)]">{q.currency ?? ''}</span>
                  </div>
                  {q.changePct !== null && (
                    <div className={`text-[10px] font-semibold ${q.changePct >= 0 ? 'text-[var(--green-dark)]' : 'text-[#D64545]'}`} dir="ltr">
                      {q.changePct >= 0 ? '▲' : '▼'} {Math.abs(q.changePct).toFixed(2)}%
                    </div>
                  )}
                </>
              ) : (
                <div className="text-[10px] text-[var(--muted)]">{L('غير متاح الآن', 'Unavailable now')}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── you vs the indices ── */}
      <div className="text-[10px] tracking-[0.08em] uppercase text-[var(--gold)] font-semibold mb-2">
        {L('أنت مقابل المؤشرات', 'You vs the indices')}
      </div>
      {compare ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
            {compareCard(
              L('دخلك مقابل مؤشر الدخل الوطني', 'Your income vs the national income index'),
              '💰', compare.income.you, compare.income.national, compare.income.peer,
              L(`متوسط دخلك الشهري (٦ أشهر) مقابل المؤشر في عمرك (${age})`, `Your 6-mo average monthly income vs the index at your age (${age})`),
            )}
            {compareCard(
              L('ثروتك مقابل مؤشر الثروة الوطني', 'Your net worth vs the national wealth index'),
              '🏛', compare.netWorth.you, compare.netWorth.national, compare.netWorth.peer,
              L(`صافي ثروتك من السِّجل مقابل المؤشر في عمرك (${age})`, `Your net worth from the Log vs the index at your age (${age})`),
            )}
          </div>
          <p className="text-[9px] text-[var(--muted)] leading-relaxed mb-4">
            {L(
              'المؤشرات الوطنية ومؤشرات النخبة منحنيات استرشادية معلَنة كذلك — وللغوص الكامل بينك وبين أقرانك: أداة «موقعك المالي».',
              'The national and higher-peer indices are disclosed illustrative curves — for the full dive against your peers, see the Positioning tool.'
            )}{' '}
            <Link href="/positioning" className="text-[var(--green-dark)] font-semibold hover:underline">{L('افتح موقعك المالي ←', 'Open Positioning →')}</Link>
          </p>
        </>
      ) : (
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4 text-[11px] text-[var(--muted)] leading-relaxed">
          {L(
            'لنقيسك على المسطرة نفسها نحتاج شيئين: شهراً واحداً في سِجلّك، وعمرك في ملفك الشخصي.',
            'To put you on the same ruler we need two things: one month in your Log, and your age in your profile.'
          )}{' '}
          <Link href="/log" className="text-[var(--green-dark)] font-semibold hover:underline">{L('افتح السِّجل ←', 'Open the Log →')}</Link>
        </div>
      )}

      {/* ── the Saudi household index — the national survey beside you ── */}
      {(() => {
        const recent = (snaps ?? []).slice(-6);
        const myIncome = recent.length ? recent.reduce((a, s) => a + Number(s.income), 0) / recent.length : null;
        const myExp = recent.length ? recent.reduce((a, s) => a + Number(s.expenses), 0) / recent.length : null;
        const myRate = myIncome && myIncome > 0 && myExp !== null ? ((myIncome - myExp) / myIncome) * 100 : null;
        return (
          <>
            <div className="text-[10px] tracking-[0.08em] uppercase text-[var(--gold)] font-semibold mb-2 mt-6">
              {L('مؤشر الأسرة السعودية', 'The Saudi household index')}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
              {([
                [L('دخل الأسرة الشهري (المسح الوطني)', 'Household monthly income (national survey)'), fmt(HOUSEHOLD.avgMonthlyIncome), myIncome !== null ? `${L('أنت', 'you')}: ${fmt(myIncome)}` : null],
                [L('استهلاك الأسرة الشهري', 'Household monthly consumption'), fmt(HOUSEHOLD.avgMonthlyConsumption), myExp !== null ? `${L('أنت', 'you')}: ${fmt(myExp)}` : null],
                [L('معدل ادخار الأسر', 'Household savings rate'), `${HOUSEHOLD.savingsRatePct}% → ${L('المستهدف', 'target')} ${HOUSEHOLD.visionTargetPct}% · ${L('العالمي', 'global')} ${HOUSEHOLD.globalStandardPct}%`, myRate !== null ? `${L('أنت', 'you')}: ${myRate.toFixed(1)}%` : null],
              ] as [string, string, string | null][]).map(([name, val, mine]) => (
                <div key={name} className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl px-3.5 py-3">
                  <div className="text-[9px] text-[var(--muted)] mb-0.5">{name}</div>
                  <div className="text-sm font-bold text-[var(--ink)]" dir="ltr">{val}</div>
                  {mine && <div className="text-[10px] font-semibold text-[var(--green-dark)] mt-0.5" dir="ltr">{mine}</div>}
                </div>
              ))}
            </div>
            <p className="text-[9px] text-[var(--muted)]">{L(`المصدر: ${REF_SOURCES.kpmg.ar}.`, `Source: ${REF_SOURCES.kpmg.en}.`)}</p>
          </>
        );
      })()}
    </div>
  );
}
