'use client';

// The thinking-layer stack — the product's signature drawing. Three
// isometric plates: your scattered data at the base, MalMind's AI
// layer between (pulsing, gold-haloed), your decisions on top — one
// gold spine threading through all three, ebbing and flowing. Born on
// the About page; extracted so the landing splash can show the same
// truth to visitors. Colors ride CSS variables, so a host section can
// retint it for dark marketing backgrounds.

import { useLocale } from '@/lib/i18n/LocaleProvider';

export default function ThinkingLayerStack({ className = 'max-w-2xl' }: { className?: string }) {
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);

  return (
    <>
      <style>{`
        @keyframes mmThinkPulse { 0%, 100% { filter: brightness(1); } 50% { filter: brightness(1.25); } }
        @keyframes mmThinkGlow { 0%, 100% { opacity: 0.2; stroke-width: 2; } 50% { opacity: 1; stroke-width: 3.5; } }
        .mm-think-pulse { animation: mmThinkPulse 3.2s ease-in-out infinite; }
        .mm-think-glow { animation: mmThinkGlow 3.2s ease-in-out infinite; }
        @keyframes mmLineFlow { 0%, 5% { stroke-dashoffset: 0; } 47%, 53% { stroke-dashoffset: -96; } 95%, 100% { stroke-dashoffset: 0; } }
        .mm-line-flow { stroke-dasharray: 10 14; animation: mmLineFlow 5s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .mm-think-pulse, .mm-think-glow, .mm-line-flow { animation: none; } }
      `}</style>
      <figure className={`${className} overflow-x-auto`} dir="ltr">
        <svg viewBox="0 0 760 400" role="img" className="w-full min-w-[560px]"
          aria-label={L('ثلاث طبقات: بياناتك المبعثرة في الأسفل، مال مايند طبقة التفكير بالذكاء الاصطناعي في الوسط، وقراراتك في الأعلى', 'Three layers: your scattered data at the base, MalMind the AI thinking layer between, your decisions on top')}>
          {(() => {
            const plate = (cx: number, cy: number, w: number, h: number, d: number, top: string, sideL: string, sideR: string, glow?: string) => (
              <g className={glow ? 'mm-think-pulse' : undefined}>
                <polygon points={`${cx - w},${cy} ${cx},${cy + h} ${cx},${cy + h + d} ${cx - w},${cy + d}`} fill={sideL} />
                <polygon points={`${cx + w},${cy} ${cx},${cy + h} ${cx},${cy + h + d} ${cx + w},${cy + d}`} fill={sideR} />
                <polygon points={`${cx},${cy - h} ${cx + w},${cy} ${cx},${cy + h} ${cx - w},${cy}`} fill={top} />
                {glow && (
                  <polygon
                    className="mm-think-glow"
                    points={`${cx},${cy - h - 4} ${cx + w + 5},${cy - 1} ${cx + w + 5},${cy + d + 1} ${cx},${cy + h + d + 4} ${cx - w - 5},${cy + d + 1} ${cx - w - 5},${cy - 1}`}
                    fill="none" stroke={glow} strokeWidth="2" opacity="0.55" strokeLinejoin="round"
                  />
                )}
              </g>
            );
            const cx = 380;
            return (
              <>
                {/* base: the scattered data (violet) */}
                {plate(cx, 300, 132, 62, 18, '#8A6FC0', '#5D4685', '#4A3769')}

                {/* ONE fixed spine rising from the base's surface to the
                top layer, its gold current ebbing up then flowing back.
                Painted BEFORE the middle and top plates so they occlude
                it — the real-life ordering the eye expects */}
                <line x1={cx} y1={105} x2={cx} y2={305} stroke="var(--gold)" strokeWidth="3" strokeLinecap="round" opacity="0.22" />
                <path className="mm-line-flow" d={`M ${cx} 305 L ${cx} 105`} fill="none" stroke="var(--gold)" strokeWidth="3" strokeLinecap="round" opacity="0.9" />

                {/* middle: MalMind, the AI thinking layer (brand green, gold glow) */}
                {plate(cx, 196, 120, 56, 18, '#1D9E75', '#14735A', '#0E5A46', 'var(--gold)')}

                {/* …the line surfaces at the thinking layer's near vertex,
                climbs its face, and tucks under the decisions plate —
                visibly passing THROUGH the middle on its way up */}
                <line x1={cx} y1={155} x2={cx} y2={252} stroke="var(--gold)" strokeWidth="3" strokeLinecap="round" opacity="0.22" />
                <path className="mm-line-flow" d={`M ${cx} 252 L ${cx} 155`} fill="none" stroke="var(--gold)" strokeWidth="3" strokeLinecap="round" opacity="0.9" />

                {/* top: the decisions (light teal) */}
                {plate(cx, 96, 106, 50, 16, '#8FE7D6', '#4FBFAC', '#3AA694')}

                {/* …and lands on the decisions plate itself */}
                <line x1={cx} y1={108} x2={cx} y2={146} stroke="var(--gold)" strokeWidth="3" strokeLinecap="round" opacity="0.22" />
                <path className="mm-line-flow" d={`M ${cx} 146 L ${cx} 108`} fill="none" stroke="var(--gold)" strokeWidth="3" strokeLinecap="round" opacity="0.9" />

                {/* the Brain on its plate — same 3D grounding as the rest */}
                <ellipse cx={cx - 48} cy={202} rx={14} ry={4} fill="#000" opacity="0.28" />
                <text x={cx - 48} y={198} textAnchor="middle" fontSize="26" aria-hidden>🧠</text>

                {/* the life things standing on the decisions plate, each
                    named beneath its shadow */}
                {([[-70, 6, '🚗', L('سيارتك', 'Your car')], [-36, -8, '🏠', L('بيتك', 'Your home')], [30, 12, '🏫', L('التعليم', 'Education')], [58, -6, '⌚', L('تقاعدك', 'Retirement')], [84, 6, '👛', L('مصروفك', 'Spending')]] as [number, number, string, string][]).map(([dx, dy, e, name]) => (
                  <g key={e}>
                    <ellipse cx={cx + dx} cy={96 + dy + 4} rx={11} ry={3.2} fill="#000" opacity="0.24" />
                    <text x={cx + dx} y={96 + dy} textAnchor="middle" fontSize="21" aria-hidden>{e}</text>
                    <text x={cx + dx} y={96 + dy + 15} textAnchor="middle" fontSize="7" fontWeight="600" fill="#0E5045" opacity="0.9">{name}</text>
                  </g>
                ))}

                {/* the data apps standing on the base plate — app-icon
                    tiles, each named beneath its shadow */}
                {([[-80, 6, '🏦', '#0B4F8A', L('تطبيق بنكك', 'Your bank app')], [-34, -10, '📈', '#233247', L('محفظتك', 'Your portfolio')], [34, 12, '💵', '#1F5C3D', L('نقدك', 'Your cash')], [80, -2, '📊', '#1D6F42', L('جداولك', 'Your sheets')]] as [number, number, string, string, string][]).map(([dx, dy, e, bg, name]) => (
                  <g key={e}>
                    <ellipse cx={cx + dx} cy={300 + dy + 16} rx={14} ry={3.6} fill="#000" opacity="0.28" />
                    <rect x={cx + dx - 13} y={300 + dy - 13} width={26} height={26} rx={6.5} fill={bg} stroke="rgba(255,255,255,0.35)" strokeWidth="0.75" />
                    <text x={cx + dx} y={300 + dy + 6} textAnchor="middle" fontSize="15" aria-hidden>{e}</text>
                    <text x={cx + dx} y={300 + dy + 26} textAnchor="middle" fontSize="7" fontWeight="600" fill="#EFE8FA" opacity="0.92">{name}</text>
                  </g>
                ))}

                {/* ── annotations, alternating sides ── */}
                {/* top → right */}
                <circle cx={cx + 106} cy={96} r={3} fill="#8FE7D6" />
                <line x1={cx + 109} y1={96} x2={cx + 168} y2={96} stroke="var(--border-medium)" strokeWidth="1" />
                <text x={cx + 176} y={82} fontSize="13" fontWeight="700" fill="#8FE7D6">{L('القرارات التي تحتاجها', 'The decisions you need')}</text>
                <text x={cx + 176} y={97} fontSize="11.5" fontWeight="700" fill="#8FE7D6">{L('لأفضل حياةٍ مالية', 'for your best financial life')}</text>
                <text x={cx + 176} y={112} fontSize="9.5" fill="var(--muted)">{L('هل أقدر على السيارة؟ · متى أبلغ حريتي؟', 'Can I afford the car? · When am I free?')}</text>
                <text x={cx + 176} y={125} fontSize="9.5" fill="var(--muted)">{L('أيّ دين أسدّد أولاً؟ · هل أنا بخير؟', 'Which debt first? · Am I OK?')}</text>

                {/* middle → left — the annotation pulses WITH its layer */}
                <g className="mm-think-pulse">
                  <circle cx={cx - 120} cy={196} r={3} fill="#1D9E75" />
                  <line x1={cx - 123} y1={196} x2={cx - 182} y2={196} stroke="var(--border-medium)" strokeWidth="1" />
                  {/* the wordmark crowns the annotation, centered over it */}
                  <text x={cx - 262} y={158} fontSize="15" fontWeight="800" fontFamily="Georgia, serif" textAnchor="middle">
                    <tspan fill="var(--ink)">Mal</tspan><tspan fill="#1D9E75">Mind</tspan>
                  </text>
                  <image href="/saudi-flag.svg" x={cx - 228} y={148} width="15" height="11" />
                  <text x={cx - 190} y={180} fontSize="13" fontWeight="700" fill="var(--green-dark)" textAnchor="end">{L('طبقة التفكير', 'The thinking layer')}</text>
                  <text x={cx - 190} y={196} fontSize="10" fontWeight="600" fill="var(--gold-text-strong)" textAnchor="end">{L('تعمل بالذكاء الاصطناعي', 'Powered by AI')}</text>
                  <text x={cx - 190} y={211} fontSize="9.5" fill="var(--muted)" textAnchor="end">{L('تقرأ الشرائح وتربطها في صورة', 'Reads every slice, one picture')}</text>
                  <text x={cx - 190} y={224} fontSize="9.5" fill="var(--muted)" textAnchor="end">{L('وتجيب من أرقامك أنت', 'Answers from YOUR numbers')}</text>
                </g>

                {/* base → right */}
                <circle cx={cx + 132} cy={300} r={3} fill="#8A6FC0" />
                <line x1={cx + 135} y1={300} x2={cx + 168} y2={300} stroke="var(--border-medium)" strokeWidth="1" />
                <text x={cx + 176} y={292} fontSize="13" fontWeight="700" fill="#A78BD8">{L('بياناتك المالية المبعثرة', 'Your scattered financial data')}</text>
                <text x={cx + 176} y={308} fontSize="9.5" fill="var(--muted)">{L('الراجحي · الأهلي · تداول · تمارا · Sheets', 'Alrajhi · SNB · Tadawul · Tamara · Sheets')}</text>
                <text x={cx + 176} y={321} fontSize="9.5" fill="var(--muted)" fontFamily="monospace">6,240 · −48,500 · 34% · 12,000 · 3.3</text>
              </>
            );
          })()}
        </svg>
      </figure>
    </>
  );
}
