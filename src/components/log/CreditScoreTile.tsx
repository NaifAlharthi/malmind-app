'use client';

// The credit-score tile on the Log page — the market's testimony about
// the debt book above it. The latest SIMAH-style score on a banded
// gauge (300-850), the move since the previous report, and the trail
// of reports. Managing reports stays in Credit Standing; reading is here.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';

interface CreditRow { report_date: string; molim_score: number | null }

const MIN = 300, MAX = 850;

export default function CreditScoreTile() {
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const [rows, setRows] = useState<CreditRow[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setRows([]); return; }
      const { data } = await supabase
        .from('credit_snapshots')
        .select('report_date, molim_score')
        .eq('user_id', user.id)
        .order('report_date', { ascending: true });
      setRows(((data as CreditRow[]) ?? []).filter((r) => r.molim_score !== null));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (rows === null) {
    return (
      <div className="drv-num bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 mb-8 text-sm text-[var(--muted)]">
        {L('يُقرأ الوضع الائتماني…', 'Reading credit standing…')}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="drv-num bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 sm:p-6 mb-8">
        <div className="font-serif text-lg font-semibold text-[var(--ink)] mb-1">📇 {L('درجتك الائتمانية', 'Credit score')}</div>
        <p className="text-[11px] text-[var(--muted)] leading-relaxed mb-3">
          {L(
            'شهادة السوق عن دفتر ديونك — ألصق تقرير سِمة مرة واحدة، وتظهر درجتك هنا على مقياسها.',
            "The market's testimony about your debt book — paste a SIMAH report once and your score lives here on its gauge."
          )}
        </p>
        <Link href="/credit" className="text-xs font-semibold text-white bg-[var(--green-dark)] rounded-lg px-4 py-2 inline-block">
          {L('أدخل تقريرك ←', 'Enter your report →')}
        </Link>
      </div>
    );
  }

  const latest = rows[rows.length - 1];
  const prev = rows.length > 1 ? rows[rows.length - 2] : null;
  const score = Number(latest.molim_score);
  const delta = prev && prev.molim_score !== null ? score - Number(prev.molim_score) : null;
  const frac = Math.max(0, Math.min(1, (score - MIN) / (MAX - MIN)));
  const angle = Math.PI * (1 - frac); // 180° → 0°
  const nx = 100 + 62 * Math.cos(angle);
  const ny = 100 - 62 * Math.sin(angle);
  const band =
    score >= 750 ? { ar: 'ممتاز', en: 'Excellent', color: '#1D9E75' }
    : score >= 650 ? { ar: 'جيد', en: 'Good', color: '#5DCAA5' }
    : score >= 500 ? { ar: 'مقبول', en: 'Fair', color: '#E0922A' }
    : { ar: 'ضعيف', en: 'Poor', color: '#D64545' };

  return (
    <div className="drv-num bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 sm:p-6 mb-8">
      <div className="flex items-baseline justify-between gap-2 flex-wrap mb-1">
        <div className="font-serif text-lg font-semibold text-[var(--ink)]">📇 {L('درجتك الائتمانية', 'Credit score')}</div>
        <Link href="/credit" className="text-[11px] font-semibold text-[var(--green-dark)] hover:underline">
          {L('أدرها في الوضع الائتماني ←', 'Manage in Credit Standing →')}
        </Link>
      </div>
      <p className="text-[11px] text-[var(--muted)] leading-relaxed mb-2">
        {L('شهادة السوق عن دفتر الديون أعلاه.', "The market's testimony about the debt book above.")}
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-5">
        {/* the gauge: four bands, one needle */}
        <figure className="shrink-0" dir="ltr">
          <svg viewBox="0 0 200 112" className="w-56" role="img" aria-label={L(`الدرجة ${score} من ${MAX}`, `Score ${score} of ${MAX}`)}>
            {([
              ['#D64545', 36.4, 0],
              ['#E0922A', 27.3, -36.4],
              ['#5DCAA5', 18.2, -63.7],
              ['#1D9E75', 18.1, -81.9],
            ] as [string, number, number][]).map(([color, len, off]) => (
              <path
                key={color}
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none" stroke={color} strokeWidth="13" strokeLinecap="butt"
                pathLength={100} strokeDasharray={`${len} ${100 - len}`} strokeDashoffset={off}
                opacity={0.85}
              />
            ))}
            {/* the needle */}
            <line x1={100} y1={100} x2={nx} y2={ny} stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx={100} cy={100} r={5} fill="var(--ink)" />
            <circle cx={100 + 80 * Math.cos(angle)} cy={100 - 80 * Math.sin(angle)} r={4.5} fill={band.color} stroke="var(--surface-card)" strokeWidth="1.5" />
            <text x={20} y={111} fontSize="8" fill="var(--muted)">{MIN}</text>
            <text x={180} y={111} fontSize="8" fill="var(--muted)" textAnchor="end">{MAX}</text>
          </svg>
        </figure>

        <div className="text-center sm:text-start">
          <div className="font-serif text-4xl font-bold leading-tight" style={{ color: band.color }} dir="ltr">{score}</div>
          <div className="text-[11px] font-semibold mb-1" style={{ color: band.color }}>{ar ? band.ar : band.en}</div>
          <div className="text-[10px] text-[var(--muted)]" dir="ltr">
            {new Date(latest.report_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            {delta !== null && delta !== 0 && (
              <span className={`ms-2 font-semibold ${delta > 0 ? 'text-[var(--green-dark)]' : 'text-[#D64545]'}`}>
                {delta > 0 ? '▲' : '▼'} {Math.abs(delta)} {L('عن التقرير السابق', 'vs previous report')}
              </span>
            )}
          </div>
          {rows.length > 1 && (
            <div className="flex items-end gap-1 mt-2 h-8" dir="ltr" aria-label={L('مسار الدرجة', 'Score trail')}>
              {rows.slice(-8).map((r, i) => {
                const f = Math.max(0.1, (Number(r.molim_score) - MIN) / (MAX - MIN));
                return <span key={i} className="w-2.5 rounded-sm" style={{ height: `${f * 100}%`, background: i === rows.slice(-8).length - 1 ? band.color : 'var(--border-strong)' }} title={`${r.report_date}: ${r.molim_score}`} />;
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
