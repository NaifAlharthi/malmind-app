'use client';

import { zoneColor, type RatioResult } from '@/lib/ratios';
import { useLocale } from '@/lib/i18n/LocaleProvider';

// Each ratio gets the small illustrative diagram that fits what it means -
// a runway, a balance scale, a ladder - rather than the same gauge twelve
// times. All values come from the already-computed real ratio (r.viz).

export default function RatioViz({ r, big }: { r: RatioResult; big?: boolean }) {
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  if (!r.ready || !r.viz || !r.verdict) return null;
  const color = zoneColor(r.verdict);
  const H = big ? 40 : 96;

  switch (r.id) {
    case 'runway':
      return <Runway monthsFilled={r.viz.monthsFilled as number} monthsTotal={r.viz.monthsTotal as number} color={color} H={H} big={big} ar={ar} />;
    case 'split':
      return <SplitBar pct={r.viz.savedPct as number} color={color} H={H} big={big} leftLabel={L('مُدَّخر', 'Saved')} rightLabel={L('مُنفَق', 'Spent')} />;
    case 'claim':
      return <CeilingBar pct={r.viz.claimPct as number} ceiling={r.viz.ceilingPct as number} color={color} H={H} big={big} label={L('الدَّين يستحوذ', 'Debt claims')} ar={ar} />;
    case 'ladder':
      return <Ladder userAge={r.viz.userAge as number} userMultiple={r.viz.userMultiple as number} color={color} H={H} big={big} ar={ar} />;
    case 'scale':
      return <Scale assets={r.viz.assets as number} liabilities={r.viz.liabilities as number} color={color} H={H} big={big} ar={ar} />;
    case 'strip':
      return <SplitBar pct={r.viz.investPct as number} color={color} H={H} big={big} leftLabel={L('مُستثمَر', 'Invested')} rightLabel={L('بقيّة الدخل', 'Rest of income')} />;
    case 'ownership':
      return <VerticalFill pct={r.viz.debtPct as number} color={color} H={H} big={big} ar={ar} />;
    case 'house':
      return <House pct={r.viz.fillPct as number} color={color} H={H} big={big} ar={ar} />;
    case 'yearbars':
      return <YearBars years={r.viz.years as number[]} values={r.viz.values as number[]} color={color} H={H} big={big} />;
    case 'donut':
      return <Donut pct={r.viz.fixedPct as number} color={color} H={H} big={big} ar={ar} />;
    case 'candle':
      return <Candle pct={r.viz.burnPct as number} color={color} H={H} big={big} ar={ar} />;
    case 'layers':
      return <Layers pct={r.viz.liquidPct as number} H={H} big={big} ar={ar} />;
    default:
      return null;
  }
}

const W = 300;

function Runway({ monthsFilled, monthsTotal, color, H, big, ar }: { monthsFilled: number; monthsTotal: number; color: string; H: number; big?: boolean; ar: boolean }) {
  const n = monthsTotal;
  const gap = 3;
  const bw = (W - gap * (n - 1)) / n;
  const trackY = big ? H / 2 - 6 : H - 34;
  const bh = big ? 12 : 22;
  const bars = [];
  for (let i = 0; i < n; i++) {
    const x = i * (bw + gap);
    const isFilled = i < Math.floor(monthsFilled);
    const isPartial = i === Math.floor(monthsFilled) && monthsFilled % 1 > 0.05;
    if (isFilled) {
      bars.push(<rect key={i} x={x} y={trackY} width={bw} height={bh} rx={2} fill={color} />);
    } else if (isPartial) {
      const pw = bw * (monthsFilled % 1);
      bars.push(
        <g key={i}>
          <rect x={x} y={trackY} width={bw} height={bh} rx={2} fill="var(--surface-1)" />
          <rect x={x} y={trackY} width={pw} height={bh} rx={2} fill={color} />
        </g>
      );
    } else {
      bars.push(<rect key={i} x={x} y={trackY} width={bw} height={bh} rx={2} fill="var(--surface-1)" />);
    }
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
      {bars}
      {!big && (
        <>
          <text x={0} y={trackY + bh + 16} fontFamily="Inter" fontSize={9} fill="var(--muted)">{ar ? '0 شهر' : '0 mo'}</text>
          <text x={W} y={trackY + bh + 16} textAnchor="end" fontFamily="Inter" fontSize={9} fill="var(--muted)">{ar ? `${n} شهر تغطية` : `${n} mo runway`}</text>
        </>
      )}
    </svg>
  );
}

function SplitBar({ pct, color, H, big, leftLabel, rightLabel }: { pct: number; color: string; H: number; big?: boolean; leftLabel: string; rightLabel: string }) {
  const barY = big ? H / 2 - 9 : H / 2 - 14;
  const barH = big ? 18 : 28;
  const fillW = (pct / 100) * W;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
      <rect x={0} y={barY} width={W} height={barH} rx={barH / 2} fill="var(--surface-1)" />
      <rect x={0} y={barY} width={fillW} height={barH} rx={barH / 2} fill={color} />
      {!big && (
        <>
          <text x={8} y={barY + barH + 18} fontFamily="Inter" fontSize={9.5} fill={color} fontWeight={600}>{leftLabel} {Math.round(pct)}%</text>
          <text x={W - 8} y={barY + barH + 18} textAnchor="end" fontFamily="Inter" fontSize={9.5} fill="var(--muted)">{rightLabel} {Math.round(100 - pct)}%</text>
        </>
      )}
    </svg>
  );
}

function CeilingBar({ pct, ceiling, color, H, big, label, ar }: { pct: number; ceiling: number; color: string; H: number; big?: boolean; label: string; ar: boolean }) {
  const barY = big ? H / 2 - 9 : H / 2 - 12;
  const barH = big ? 18 : 24;
  const fillW = (pct / 100) * W;
  const ceilX = (ceiling / 100) * W;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
      <rect x={0} y={barY} width={W} height={barH} rx={6} fill="var(--chart-track)" />
      <rect x={0} y={barY} width={fillW} height={barH} rx={6} fill={color} />
      <line x1={ceilX} y1={barY - 4} x2={ceilX} y2={barY + barH + 4} stroke="var(--red)" strokeWidth={1.5} strokeDasharray="3 3" />
      {!big && (
        <>
          <text x={ceilX} y={barY - 8} textAnchor="middle" fontFamily="Inter" fontSize={8.5} fill="var(--red-dark-text)">{ceiling}% {ar ? 'حدّ' : 'ceiling'}</text>
          <text x={8} y={barY + barH + 18} fontFamily="Inter" fontSize={9.5} fill={color} fontWeight={600}>{label} {Math.round(pct)}%</text>
          <text x={W - 8} y={barY + barH + 18} textAnchor="end" fontFamily="Inter" fontSize={9.5} fill="var(--muted)">{ar ? 'متاح' : 'Free'} {Math.round(100 - pct)}%</text>
        </>
      )}
    </svg>
  );
}

const LADDER_MILESTONES: [number, number][] = [[30, 1], [35, 2], [40, 3], [45, 4]];

function Ladder({ userAge, userMultiple, color, H, big, ar }: { userAge: number; userMultiple: number; color: string; H: number; big?: boolean; ar: boolean }) {
  const minAge = 28, maxAge = 46;
  const xf = (age: number) => ((age - minAge) / (maxAge - minAge)) * (W - 20) + 10;
  const baseY = big ? H - 8 : H - 14;
  const clampedAge = Math.max(minAge, Math.min(maxAge, userAge));
  const ux = xf(clampedAge);
  const userStepH = big ? 6 + userMultiple * 3 : 10 + userMultiple * 7;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
      <line x1={10} y1={baseY} x2={W - 10} y2={baseY} stroke="var(--chart-neutral-2)" strokeWidth={1} />
      {LADDER_MILESTONES.map(([age, mult]) => {
        const xx = xf(age);
        const stepH = big ? 6 + mult * 3 : 10 + mult * 7;
        return (
          <g key={age}>
            <rect x={xx - 6} y={baseY - stepH} width={12} height={stepH} rx={2} fill="var(--surface-1)" />
            {!big && <text x={xx} y={baseY + 14} textAnchor="middle" fontFamily="Inter" fontSize={8} fill="var(--muted)">{ar ? `${mult}×@${age}` : `${mult}x@${age}`}</text>}
          </g>
        );
      })}
      <rect x={ux - 7} y={baseY - userStepH} width={14} height={userStepH} rx={2} fill={color} />
      <circle cx={ux} cy={baseY - userStepH - 8} r={3} fill={color} />
      {!big && <text x={ux} y={baseY - userStepH - 14} textAnchor="middle" fontFamily="Inter" fontSize={9} fontWeight={600} fill={color}>{ar ? 'أنت' : 'You'}</text>}
    </svg>
  );
}

function Scale({ assets, liabilities, color, H, big, ar }: { assets: number; liabilities: number; color: string; H: number; big?: boolean; ar: boolean }) {
  const cx = W / 2, pivotY = big ? 10 : 20;
  const total = assets + liabilities || 1;
  const tilt = Math.max(-14, Math.min(14, ((assets - liabilities) / total) * 22));
  const armLen = big ? 70 : 110;
  const leftX = cx - armLen, rightX = cx + armLen;
  const leftY = pivotY + tilt * 0.5, rightY = pivotY - tilt * 0.5;
  const panR = big ? 10 : 16;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
      <line x1={cx} y1={pivotY} x2={cx} y2={pivotY + (big ? 24 : 44)} stroke="var(--chart-neutral-2)" strokeWidth={2} />
      <line x1={leftX} y1={leftY} x2={rightX} y2={rightY} stroke="var(--ink-2)" strokeWidth={2} />
      <circle cx={cx} cy={pivotY} r={3} fill="var(--ink-2)" />
      <line x1={leftX} y1={leftY} x2={leftX} y2={leftY + 16} stroke="var(--chart-neutral-6)" strokeWidth={1} />
      <ellipse cx={leftX} cy={leftY + 18} rx={panR} ry={5} fill={color} opacity={0.85} />
      <line x1={rightX} y1={rightY} x2={rightX} y2={rightY + 16} stroke="var(--red-soft-bg)" strokeWidth={1} />
      <ellipse cx={rightX} cy={rightY + 18} rx={panR * 0.7} ry={4} fill="var(--red)" opacity={0.7} />
      {!big && (
        <>
          <text x={leftX} y={leftY + 40} textAnchor="middle" fontFamily="Inter" fontSize={9} fill="var(--ink-2)">{ar ? 'أصول' : 'Assets'}</text>
          <text x={rightX} y={rightY + 40} textAnchor="middle" fontFamily="Inter" fontSize={9} fill="var(--muted)">{ar ? 'التزامات' : 'Liabilities'}</text>
        </>
      )}
    </svg>
  );
}

function VerticalFill({ pct, color, H, big, ar }: { pct: number; color: string; H: number; big?: boolean; ar: boolean }) {
  const barW = big ? 24 : 46, barX = W / 2 - barW / 2;
  const barY = big ? 2 : 8, barH = big ? H - 6 : H - 24;
  const fillH = (pct / 100) * barH;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
      <rect x={barX} y={barY} width={barW} height={barH} rx={6} fill="var(--chart-track)" />
      <rect x={barX} y={barY + barH - fillH} width={barW} height={fillH} rx={6} fill={color} />
      {!big && (
        <text x={W / 2} y={barY + barH + 16} textAnchor="middle" fontFamily="Inter" fontSize={9} fill="var(--muted)">
          {ar ? `${Math.round(pct)}% للدَّين، ${Math.round(100 - pct)}% مملوك بالكامل` : `${Math.round(pct)}% debt-claimed, ${Math.round(100 - pct)}% owned outright`}
        </text>
      )}
    </svg>
  );
}

function House({ pct, color, H, big, ar }: { pct: number; color: string; H: number; big?: boolean; ar: boolean }) {
  const cx = W / 2;
  const houseW = big ? 44 : 76, houseH = big ? 26 : 46;
  const baseY = big ? H - 4 : H - 16;
  const roofH = big ? 12 : 20;
  const fillFrac = Math.min(1, pct / 100);
  const fillH = houseH * fillFrac;
  const clipId = `houseClip-${Math.round(pct)}-${big ? 'b' : 's'}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
      <defs>
        <clipPath id={clipId}>
          <rect x={cx - houseW / 2} y={baseY - houseH} width={houseW} height={houseH} />
        </clipPath>
      </defs>
      <polygon points={`${cx - houseW / 2 - 4},${baseY - houseH} ${cx},${baseY - houseH - roofH} ${cx + houseW / 2 + 4},${baseY - houseH}`} fill="var(--chart-neutral-2)" />
      <rect x={cx - houseW / 2} y={baseY - houseH} width={houseW} height={houseH} fill="var(--surface-1)" />
      <rect x={cx - houseW / 2} y={baseY - fillH} width={houseW} height={fillH} fill={color} clipPath={`url(#${clipId})`} />
      <rect x={cx - houseW / 2} y={baseY - houseH} width={houseW} height={houseH} fill="none" stroke="var(--chart-neutral-4)" strokeWidth={1} />
      {!big && <text x={cx} y={baseY + 16} textAnchor="middle" fontFamily="Inter" fontSize={9} fill="var(--muted)">{ar ? `${Math.round(pct)}% من الدخل للسكن` : `${Math.round(pct)}% of income to housing`}</text>}
    </svg>
  );
}

function YearBars({ years, values, color, H, big }: { years: number[]; values: number[]; color: string; H: number; big?: boolean }) {
  const n = values.length;
  const gap = big ? 4 : 10;
  const bw = (W - gap * (n - 1)) / n;
  const max = Math.max(...values, 1);
  const baseY = big ? H - 2 : H - 18;
  const maxH = big ? H - 6 : H - 30;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
      {values.map((v, i) => {
        const h = (v / max) * maxH;
        const x = i * (bw + gap);
        const isLast = i === n - 1;
        return (
          <g key={i}>
            <rect x={x} y={baseY - h} width={bw} height={h} rx={2} fill={isLast ? color : 'var(--chart-neutral-3)'} />
            {!big && <text x={x + bw / 2} y={baseY + 13} textAnchor="middle" fontFamily="Inter" fontSize={8} fill="var(--muted)">{years[i]}</text>}
          </g>
        );
      })}
    </svg>
  );
}

function Donut({ pct, color, H, big, ar }: { pct: number; color: string; H: number; big?: boolean; ar: boolean }) {
  const cx = big ? 20 : W / 2, cy = H / 2, rad = big ? 16 : 34, thick = big ? 6 : 12;
  const frac = pct / 100;
  const circumference = 2 * Math.PI * rad;
  const dash = circumference * frac;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
      <circle cx={cx} cy={cy} r={rad} fill="none" stroke="var(--chart-track)" strokeWidth={thick} />
      <circle
        cx={cx} cy={cy} r={rad} fill="none" stroke={color} strokeWidth={thick}
        strokeDasharray={`${dash} ${circumference}`} transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="round"
      />
      {!big && (
        <>
          <text x={cx} y={cy + 4} textAnchor="middle" fontFamily="Lora" fontSize={13} fontWeight={700} fill={color}>{Math.round(pct)}%</text>
          <text x={cx + rad + 24} y={cy - 6} fontFamily="Inter" fontSize={9.5} fill={color} fontWeight={600}>{ar ? 'ثابت' : 'Fixed'} {Math.round(pct)}%</text>
          <text x={cx + rad + 24} y={cy + 10} fontFamily="Inter" fontSize={9.5} fill="var(--muted)">{ar ? 'اختياري' : 'Discretionary'} {Math.round(100 - pct)}%</text>
        </>
      )}
    </svg>
  );
}

function Candle({ pct, color, H, big, ar }: { pct: number; color: string; H: number; big?: boolean; ar: boolean }) {
  const cx = big ? 30 : 60;
  const candleW = big ? 20 : 34, candleH = big ? 34 : 74;
  const topY = big ? 3 : 10;
  const burnFrac = Math.min(1, pct / 100);
  const burnH = candleH * burnFrac;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
      <rect x={cx - candleW / 2} y={topY} width={candleW} height={candleH} rx={4} fill="var(--chart-track)" />
      <rect x={cx - candleW / 2} y={topY} width={candleW} height={burnH} rx={4} fill={color} />
      <rect x={cx - candleW / 2} y={topY} width={candleW} height={candleH} rx={4} fill="none" stroke="var(--chart-neutral-4)" strokeWidth={0.5} />
      {!big && (
        <>
          <text x={cx + candleW / 2 + 16} y={topY + burnH - 4} fontFamily="Inter" fontSize={10} fontWeight={600} fill={color}>{Math.round(pct)}% {ar ? 'مُنفَق' : 'spent'}</text>
          <text x={cx + candleW / 2 + 16} y={topY + candleH - 2} fontFamily="Inter" fontSize={9.5} fill="var(--muted)">{Math.round(100 - pct)}% {ar ? 'متبقٍّ' : 'remains'}</text>
        </>
      )}
    </svg>
  );
}

function Layers({ pct, H, big, ar }: { pct: number; H: number; big?: boolean; ar: boolean }) {
  const barW = big ? 60 : 120, barX = W / 2 - barW / 2;
  const barY = big ? 4 : 12, barH = big ? H - 8 : H - 26;
  const liquidH = (pct / 100) * barH;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
      <rect x={barX} y={barY} width={barW} height={barH} rx={4} fill="var(--surface-1)" />
      <rect x={barX} y={barY} width={barW} height={liquidH} rx={4} fill="var(--blue)" opacity={0.75} />
      <rect x={barX} y={barY + liquidH} width={barW} height={barH - liquidH} fill="var(--green)" opacity={0.55} />
      <line x1={barX} y1={barY + liquidH} x2={barX + barW} y2={barY + liquidH} stroke="#fff" strokeWidth={1.5} />
      {!big && (
        <>
          <text x={barX + barW + 10} y={barY + liquidH / 2} dominantBaseline="middle" fontFamily="Inter" fontSize={9} fill="var(--blue)" fontWeight={600}>{ar ? 'سائل' : 'Liquid'} {Math.round(pct)}%</text>
          <text x={barX + barW + 10} y={barY + liquidH + (barH - liquidH) / 2} dominantBaseline="middle" fontFamily="Inter" fontSize={9} fill="var(--green)" fontWeight={600}>{ar ? 'غير سائل' : 'Illiquid'} {Math.round(100 - pct)}%</text>
        </>
      )}
    </svg>
  );
}
