'use client';

// About MalMind — the product's story on its own page: the mission, the
// three time views, and the four problems we exist to solve. It lived on
// home's deeper levels; the founder gave it a door in the top bar instead,
// paired with Take a tour.

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { enterDemo } from '@/lib/demoSupabase';
import { DEMO_PERSONAS } from '@/lib/demoWorld';
import PersonaAvatar from '@/app/signup/PersonaAvatar';
import ContactModal from '@/components/shared/ContactModal';

export default function AboutPage() {
  const router = useRouter();
  const { t, locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const [contactOpen, setContactOpen] = useState(false);

  const PROBLEMS = [
    {
      icon: '🧩',
      problem: L('بياناتك المالية مبعثرة في كل مكان', 'Your financial data, scattered everywhere'),
      desc: L(
        'مالك يعيش في تطبيقات البنوك والوسطاء والجداول — ولا مكان واحد يُظهر الصورة كاملة.',
        'Your money lives across bank apps, brokers and spreadsheets — no single place shows the whole picture.'
      ),
      answer: L('يجمعها مال مايند في سِجلّ واحد مترابط.', 'MalMind pulls it into one connected ledger.'),
      tools: [
        { label: L('أرقامي المالية', 'My Financial Numbers'), href: '/financial-numbers' },
        { label: L('الأصول', 'Assets'), href: '/holdings' },
        { label: L('الالتزامات', 'Commitments'), href: '/commitments' },
      ],
    },
    {
      icon: '🧮',
      problem: L('أرصدة مالية، لا قرارات', 'Balances, not decisions'),
      desc: L(
        'تُظهر التطبيقات ما تملكه اليوم، لكنها لا تحاكي ما تفعله علاوة أو رهن أو استثمار بمستقبلك.',
        "Apps show what you have today, but can't model what a raise, a mortgage, or investing would do to your future.",
      ),
      answer: L('طبقة نمذجة وتخطيط سيناريوهات تلعب بها.', 'A modeling & scenario layer you can play with.'),
      tools: [
        { label: L('قارن وقرّر', 'Compare & Decide'), href: '/compare' },
        { label: L('ماذا لو', 'What-if'), href: '/what-if' },
        { label: L('سرعة المال', 'Velocity'), href: '/velocity' },
        { label: L('مسار المضاعفة', 'Doubling Path'), href: '/doubling-path' },
      ],
    },
    {
      icon: '🔢',
      problem: L('أرقام مالية بلا معنى', 'Numbers without meaning'),
      desc: L(
        'تتراكم الأرقام دون أن تخبرك: هل أنت سليم، أم مكشوف، أم على المسار؟',
        "Figures pile up without telling you whether you're healthy, exposed, or on track.",
      ),
      answer: L('قراءات ومخاطر وإرشاد بلغة واضحة.', 'Readings, risks and guidance in plain terms.'),
      tools: [
        { label: L('النسب', 'Ratios'), href: '/ratios' },
        { label: L('المخاطر', 'Risks'), href: '/risks' },
        { label: L('الوضع الائتماني', 'Credit'), href: '/credit' },
      ],
    },
    {
      icon: '🐫',
      problem: L('ثروتك ليست نقداً فقط', "Wealth isn't just cash"),
      desc: L(
        'الأرض، الإبل، الذهب، حصّة في مشروع — قيمة حقيقية لا تلتقطها أيّ أداة، فتبقى ثروتك الحقيقية مجهولة.',
        'Land, livestock, gold, a stake in a venture — real value no app captures, so your true wealth stays hidden.',
      ),
      answer: L('سجّل كل أصل حقيقي بقيمته، وارَ ثروتك كاملة.', 'Log every real asset at its value — and see your whole wealth.'),
      tools: [
        { label: L('الأصول', 'Assets'), href: '/holdings' },
        { label: L('أرقامي المالية', 'My Financial Numbers'), href: '/financial-numbers' },
      ],
    },
  ];

  return (
    <div>
      {/* ── the mission ── */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 sm:p-8 mb-8 relative overflow-hidden">
        <div className="absolute -top-10 -end-10 w-40 h-40 rounded-full bg-[var(--green-bg)] blur-3xl opacity-60 pointer-events-none" />
        <div className="relative">
          <div className="text-[10px] tracking-[0.12em] uppercase text-[var(--green-dark)] font-semibold mb-2">{L('عن مال مايند', 'About MalMind')}</div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--ink)] mb-3 leading-tight max-w-2xl">
            {L('طبقة تفكير لمالك.', 'A thinking layer for your money.')}
          </h2>
          <p className="text-sm text-[var(--ink-2)] leading-relaxed max-w-2xl">
            {L(
              'بنكك يعرف حركاتك، ووسيطك يعرف أسهمك، وتطبيق الأقساط يعرف التزاماتك — كلٌّ يمسك شريحةً من حياتك المالية، ولا أحد يعرف ماذا تعني الشرائح مجتمعةً لك أنت. مال مايند هو الطبقة الناقصة: طبقة تفكيرٍ تعمل بالذكاء الاصطناعي تجلس بين بياناتك المالية وبين أدوات القرار — تقرأ الشرائح كلّها، وتحوّلها إلى معنى: ماذا يعني وضعي؟ وماذا يحدث لو قرّرت؟',
              "Your bank knows your transactions, your broker knows your stocks, your installment app knows your commitments — each holds one slice of your financial life, and none knows what the slices MEAN together for you. MalMind is the missing layer: an AI-powered thinking layer that sits between your financial data and your decision tools — reading every slice and turning it into meaning: what does my situation mean, and what happens if I decide?"
            )}
          </p>

          {/* the thinking layer, drawn as it is: an isometric stack — your
              scattered data at the base, MalMind's AI layer between, your
              decisions on top. Annotations alternate sides, reference-style. */}
          {/* the stack breathes where it matters: the thinking layer pulses */}
          <style>{`
            @keyframes mmThinkPulse { 0%, 100% { filter: brightness(1); } 50% { filter: brightness(1.25); } }
            @keyframes mmThinkGlow { 0%, 100% { opacity: 0.2; stroke-width: 2; } 50% { opacity: 1; stroke-width: 3.5; } }
            .mm-think-pulse { animation: mmThinkPulse 3.2s ease-in-out infinite; }
            .mm-think-glow { animation: mmThinkGlow 3.2s ease-in-out infinite; }
            @keyframes mmLineFlow { 0%, 5% { stroke-dashoffset: 0; } 47%, 53% { stroke-dashoffset: -96; } 95%, 100% { stroke-dashoffset: 0; } }
            .mm-line-flow { stroke-dasharray: 10 14; animation: mmLineFlow 5s ease-in-out infinite; }
            @media (prefers-reduced-motion: reduce) { .mm-think-pulse, .mm-think-glow, .mm-line-flow { animation: none; } }
          `}</style>
          <figure className="mt-5 max-w-2xl overflow-x-auto" dir="ltr">
            <svg viewBox="0 0 760 400" role="img" className="w-full min-w-[560px]"
              aria-label={L('ثلاث طبقات: بياناتك المبعثرة في الأسفل، مال مايند طبقة التفكير بالذكاء الاصطناعي في الوسط، وقراراتك في الأعلى', 'Three layers: your scattered data at the base, MalMind the AI thinking layer between, your decisions on top')}>
              {(() => {
                const plate = (cx: number, cy: number, w: number, h: number, d: number, top: string, sideL: string, sideR: string, glow?: string) => (
                  <g className={glow ? 'mm-think-pulse' : undefined}>
                    <polygon points={`${cx - w},${cy} ${cx},${cy + h} ${cx},${cy + h + d} ${cx - w},${cy + d}`} fill={sideL} />
                    <polygon points={`${cx + w},${cy} ${cx},${cy + h} ${cx},${cy + h + d} ${cx + w},${cy + d}`} fill={sideR} />
                    <polygon points={`${cx},${cy - h} ${cx + w},${cy} ${cx},${cy + h} ${cx - w},${cy}`} fill={top} />
                    {/* the halo traces the WHOLE plate silhouette, on top of the
                        faces, so the ring closes on every side */}
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

          {/* what a thinking layer IS — and, just as loudly, what it is NOT */}
          <div className="grid sm:grid-cols-2 gap-2.5 mt-4 max-w-2xl">
            <div className="rounded-xl border border-[var(--green-border)] bg-[var(--green-bg)]/60 p-4">
              <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--green-dark)] font-semibold mb-2">
                {L('طبقة التفكير تعني', 'A thinking layer means')}
              </div>
              <ul className="space-y-1.5">
                {[
                  L('يقرأ صورتك كاملة ويجيب: ماذا يعني هذا لوضعي أنا؟', 'Reads your whole picture and answers: what does this mean for MY situation?'),
                  L('يجرّب القرار بالأرقام قبل أن تعيشه', 'Plays a decision in numbers before you live it'),
                  L('يحوّل الأرقام إلى أولويات: ماذا أفعل أولاً؟', 'Turns numbers into priorities: what do I do first?'),
                  L('يتعلّم واقعك السعودي: الراتب والأقساط والمواسم', 'Speaks your Saudi reality: salary day, installments, seasons'),
                ].map((s) => (
                  <li key={s} className="flex gap-2 text-[11px] text-[var(--ink-2)] leading-relaxed">
                    <span className="text-[var(--green-dark)] font-bold shrink-0">✓</span>{s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-[var(--red-border)] bg-[var(--red-bg)]/40 p-4">
              <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--red-dark-text)] font-semibold mb-2">
                {L('ولا تعني', 'And does NOT mean')}
              </div>
              <ul className="space-y-1.5">
                {[
                  L('ليس بنكاً — لا يحفظ أموالك ولا يحرّكها', 'Not a bank — it never holds or moves your money'),
                  L('ليس شاشة أرصدة أخرى تعرض ما تملك وتصمت', 'Not another balance screen that shows totals and goes silent'),
                  L('ليس نصائح معلّبة بقواعد عامة (٥٠/٣٠/٢٠)', 'Not canned advice from generic rules (50/30/20)'),
                  L('لا يبيع بياناتك ولا يتدرّب عليها ولا يتداول بها', 'Never sells your data, trains on it, or trades with it'),
                ].map((s) => (
                  <li key={s} className="flex gap-2 text-[11px] text-[var(--ink-2)] leading-relaxed">
                    <span className="text-[var(--red-dark-text)] font-bold shrink-0">✗</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      </div>

      {/* ── why we exist: problem → answer ── */}
      <div className="mb-8">
        <SectionHeading
          eyebrow={L('لماذا وُجد مال مايند', 'Why MalMind exists')}
          title={L('أربع مشكلات في المال الشخصي — وكيف نعالجها', 'Four problems in personal finance — and how we tackle them')}
        />
        <div className="grid sm:grid-cols-2 gap-3">
          {PROBLEMS.map((p) => (
            <div key={p.problem} className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 flex flex-col">
              <div className="text-2xl mb-2">{p.icon}</div>
              <div className="font-serif text-base font-semibold text-[var(--ink)] mb-1">{p.problem}</div>
              <p className="text-xs text-[var(--muted)] leading-relaxed mb-3">{p.desc}</p>
              <div className="mt-auto pt-3 border-t border-[var(--border-faint)]">
                <div className="flex gap-1.5 items-start mb-2.5">
                  <span className="text-[var(--green)] text-xs mt-0.5">→</span>
                  <span className="text-xs font-medium text-[var(--green-dark)] leading-relaxed">{p.answer}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {p.tools.map((tool) => (
                    <Link key={tool.href} href={tool.href} className="text-[10px] bg-[var(--surface-1)] border border-[var(--border-default)] rounded-full px-2.5 py-1 text-[var(--ink-2)] hover:border-[var(--green)] hover:text-[var(--green-dark)] transition-colors">
                      {tool.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── your money, in three views ── */}
      <div data-tour="views-grid" className="mb-8">
        <SectionHeading eyebrow={t('home.views.heading')} />
        <div className="grid sm:grid-cols-3 gap-3">
          <ViewCard href="/past" icon="🕰" title={t('home.card.past.title')} desc={t('home.card.past.desc')} />
          <ViewCard href="/today" icon="☀" title={t('home.card.today.title')} desc={t('home.card.today.desc')} />
          <ViewCard href="/future" icon="🔭" title={t('home.card.future.title')} desc={t('home.card.future.desc')} />
        </div>
      </div>

      {/* ── the numbers that describe us — standalone tiles ── */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 flex flex-col items-center justify-center text-center">
          <div className="font-serif text-3xl font-bold text-[var(--green-dark)] leading-none mb-1.5">19</div>
          <div className="text-[11px] text-[var(--muted)]">{L('أداة مترابطة', 'connected tools')}</div>
        </div>
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 flex flex-col items-center justify-center text-center">
          <div className="font-serif text-3xl font-bold text-[var(--green-dark)] leading-none mb-1.5">3</div>
          <div className="text-[11px] text-[var(--muted)]">{L('نظرات زمنية', 'time views')}</div>
        </div>
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 flex flex-col items-center justify-center text-center">
          <SaudiEmblem />
          <div className="text-[11px] text-[var(--muted)] mt-1.5">{L('مصمَّم للسعودية', 'made for Saudi')}</div>
        </div>
      </div>

      {/* ── the Brain, the personas, and the door to us ── */}
      <div className="mb-4">
        <SectionHeading eyebrow={L('جرّب واسأل وتواصل', 'Try it, ask it, reach us')} />
        <div className="grid sm:grid-cols-2 gap-3">
          {/* the Brain, properly introduced */}
          <div className="sm:col-span-2 bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] rounded-2xl p-6 text-white relative overflow-hidden">
            <div className="absolute -top-12 -end-12 w-44 h-44 rounded-full bg-[var(--gold)]/10 blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="text-[10px] tracking-[0.14em] uppercase text-[var(--gold)] font-semibold mb-1.5">
                {L('مستشارك الذي يقرأ أرقامك أنت', 'The advisor that reads YOUR numbers')}
              </div>
              <h2 className="font-serif text-2xl font-bold mb-2">🧠 {L('العقل', 'The Brain')}</h2>
              <p className="text-sm text-white/80 leading-relaxed max-w-2xl mb-3">
                {L(
                  'العقل ليس روبوت نصائح عامة — إنه طبقة التفكير فوق بياناتك: يرافقك صفحةً بصفحة، يشرح ما تنظر إليه حين تطلب، ويجيب عن «هل أقدر على السيارة؟» من أرقامك الحقيقية لا من قواعد جاهزة. كل هاجس تكتبه وكل زر «اسأل» في المنتج يصبّ فيه.',
                  'The Brain is not a generic advice bot — it is the thinking layer above your data: it walks with you page by page, explains what you are looking at when asked, and answers "can I afford the car?" from your real numbers, not canned rules. Every concern you write and every Ask button in the product flows into it.'
                )}
              </p>
              <Link href="/advisor" className="inline-block text-xs font-semibold text-[#2A1F05] bg-[var(--gold)] rounded-lg px-3.5 py-2">
                {L('افتح العقل ←', 'Open the Brain →')}
              </Link>
            </div>
          </div>

          {/* the 2D navigation system + command mode */}
          <div className="sm:col-span-2 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">🧭</span>
              <span className="text-sm font-semibold text-[var(--ink)]">{L('إبحارٌ من الطراز العالمي', 'World-class navigation')}</span>
            </div>
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-4 mt-3">
              <div>
                <p className="text-xs text-[var(--ink-2)] leading-relaxed mb-3">
                  {L(
                    'ثلاث أدوات، خريطة واحدة: الخطُّ الزمني يُبحر بك عبر عمر مالك — ماضيه ويومه ومستقبله؛ وجبلُ الجليد يغوص بك من الأساسيات الهادئة إلى الاحتراف الكامل، وكل صفحة تعيد ترتيب نفسها حسب عمقك؛ ووضعُ الأوامر يضع الخريطة كلها تحت أصابعك. قوة بمستوى بلومبيرغ وأبعد — وهدوء بمقياس إنسان، بالعربية أولاً.',
                    "Three instruments, one map: the timeline sails you across your money's whole life — its past, its today, its future; the iceberg sinks you from calm essentials to full mastery, every page restaging itself to your depth; and command mode puts the entire map under your fingers. Bloomberg-grade power and beyond — human-grade calm, Arabic-first."
                  )}
                </p>
                <ul className="text-[11px] text-[var(--muted)] leading-relaxed space-y-1.5">
                  <li>🖱 {L('إمالة عجلة الفأرة أفقياً تسافر بالزمن؛ ومواصلة التمرير عند حافة الصفحة تغوص عمقاً', 'Tilt the mouse wheel to travel time; keep scrolling past the page edge to dive a depth')}</li>
                  <li>📱 {L('على الجوال: اسحب يميناً ويساراً للزمن، واسحب بعد نهاية الصفحة للغوص', 'On the phone: swipe for time, pull past the page end to dive')}</li>
                  <li>🧊 {L('جبل الجليد في الطرف يريك عمقك — وكل صفحة تسمّي طبقاتها بأسمائها', 'The iceberg at the edge shows your depth — and each page names its own rooms')}</li>
                </ul>
              </div>
              <div>
                <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--muted)] font-semibold mb-2">
                  {L('وضع الأوامر — أمسك Shift', 'Command mode — hold Shift')}
                </div>
                <div className="flex flex-col gap-1.5" dir="ltr">
                  {([
                    ['⇧ ↑↓', L('اصعد أو اغطس في العمق', 'Surface or dive the depth')],
                    ['⇧ ←→', L('سافر عبر الزمن', 'Travel through time')],
                    ['⇧ B', L('نقرة: العقل يعلّق هنا · مطوّلاً: صفحة العقل', 'Tap: the Brain comments here · hold: the Brain page')],
                    ['⇧ M', L('بدّل مستوى المساندة (مثل Alt+Tab)', 'Cycle the assistance level (Alt+Tab style)')],
                    ['⇧ D', L('بدّل المحرّك: قصص · أرقام · كلاهما', 'Cycle the drive: stories · numbers · both')],
                    ['⇧ H', L('عُد إلى الرئيسية', 'Go home')],
                  ] as [string, string][]).map(([keys, what]) => (
                    <div key={keys} className="flex items-center gap-3">
                      <kbd className="shrink-0 min-w-[52px] text-center text-[10px] font-semibold bg-[var(--surface-1)] border border-[var(--border-default)] rounded-md px-2 py-1 text-[var(--ink)]">{keys}</kbd>
                      <span className={`text-[11px] text-[var(--ink-2)] ${ar ? 'text-right' : ''}`} dir={ar ? 'rtl' : 'ltr'}>{what}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* ONE choreographed loop: the palette drives, the timeline and the
                iceberg obey — a 24s story of commanding time and depth from
                the keyboard. Chip crossfades narrate the position. */}
            <style>{`
              @keyframes mmTlKnob { 0%,4%{left:50%} 10%,22%{left:4%} 32%,88%{left:96%} 96%,100%{left:50%} }
              @keyframes mmIceDive { 0%,48%{transform:translateY(0)} 54%{transform:translateY(48px)} 60%{transform:translateY(109px)} 66%,78%{transform:translateY(171px)} 84%{transform:translateY(109px)} 90%{transform:translateY(48px)} 96%,100%{transform:translateY(0)} }
              @keyframes mmKeyLeft { 0%,4%{background:var(--surface-1);color:var(--ink)} 5%,8%{background:var(--gold);color:#2A1F05} 10%,100%{background:var(--surface-1);color:var(--ink)} }
              @keyframes mmKeyRight { 0%,23%{background:var(--surface-1);color:var(--ink)} 24%,27%{background:var(--gold);color:#2A1F05} 28%,29%{background:var(--surface-1);color:var(--ink)} 30%,33%{background:var(--gold);color:#2A1F05} 35%,100%{background:var(--surface-1);color:var(--ink)} }
              @keyframes mmKeyDown { 0%,49%{background:var(--surface-1);color:var(--ink)} 50%,53%{background:var(--gold);color:#2A1F05} 54%,55%{background:var(--surface-1);color:var(--ink)} 56%,59%{background:var(--gold);color:#2A1F05} 60%,61%{background:var(--surface-1);color:var(--ink)} 62%,65%{background:var(--gold);color:#2A1F05} 67%,100%{background:var(--surface-1);color:var(--ink)} }
              @keyframes mmKeyUp { 0%,77%{background:var(--surface-1);color:var(--ink)} 78%,81%{background:var(--gold);color:#2A1F05} 82%,83%{background:var(--surface-1);color:var(--ink)} 84%,87%{background:var(--gold);color:#2A1F05} 88%,89%{background:var(--surface-1);color:var(--ink)} 90%,93%{background:var(--gold);color:#2A1F05} 95%,100%{background:var(--surface-1);color:var(--ink)} }
              @keyframes mmChipToday1 { 0%,8%{opacity:1} 10%,94%{opacity:0} 96%,100%{opacity:1} }
              @keyframes mmChipPast { 0%,8%{opacity:0} 10%,22%{opacity:1} 24%,100%{opacity:0} }
              @keyframes mmChipFuture1 { 0%,30%{opacity:0} 32%,52%{opacity:1} 54%,100%{opacity:0} }
              @keyframes mmChipFuture4 { 0%,54%{opacity:0} 56%,92%{opacity:1} 94%,100%{opacity:0} }
              .mm-tl-knob { animation: mmTlKnob 24s ease-in-out infinite; }
              .mm-ice-marker { animation: mmIceDive 24s ease-in-out infinite; }
              @keyframes mmKeyShift { 0%,4%{background:var(--surface-1);color:var(--ink)} 5%,8%{background:var(--gold);color:#2A1F05} 10%,23%{background:var(--surface-1);color:var(--ink)} 24%,27%{background:var(--gold);color:#2A1F05} 28%,29%{background:var(--surface-1);color:var(--ink)} 30%,33%{background:var(--gold);color:#2A1F05} 35%,49%{background:var(--surface-1);color:var(--ink)} 50%,53%{background:var(--gold);color:#2A1F05} 54%,55%{background:var(--surface-1);color:var(--ink)} 56%,59%{background:var(--gold);color:#2A1F05} 60%,61%{background:var(--surface-1);color:var(--ink)} 62%,65%{background:var(--gold);color:#2A1F05} 67%,77%{background:var(--surface-1);color:var(--ink)} 78%,81%{background:var(--gold);color:#2A1F05} 82%,83%{background:var(--surface-1);color:var(--ink)} 84%,87%{background:var(--gold);color:#2A1F05} 88%,89%{background:var(--surface-1);color:var(--ink)} 90%,93%{background:var(--gold);color:#2A1F05} 95%,100%{background:var(--surface-1);color:var(--ink)} }
              .mm-k-shift { animation: mmKeyShift 24s infinite; }
              .mm-k-left { animation: mmKeyLeft 24s infinite; }
              .mm-k-right { animation: mmKeyRight 24s infinite; }
              .mm-k-down { animation: mmKeyDown 24s infinite; }
              .mm-k-up { animation: mmKeyUp 24s infinite; }
              .mm-chip, .mm-combo { animation-duration: 24s; animation-iteration-count: infinite; animation-timing-function: linear; }
              @media (prefers-reduced-motion: reduce) {
                .mm-tl-knob, .mm-ice-marker, .mm-k-shift, .mm-k-left, .mm-k-right, .mm-k-down, .mm-k-up, .mm-chip, .mm-combo { animation: none; }
                .mm-chip, .mm-combo { opacity: 0; } .mm-chip-default, .mm-combo-default { opacity: 1 !important; }
              }
            `}</style>
            <div className="rounded-2xl border border-[var(--border-default)] p-5 mt-5" style={{ background: 'color-mix(in srgb, var(--surface-card) 88%, transparent)' }}>
              <div className="text-center font-serif text-sm font-semibold text-[var(--ink)] mb-4">
                {L('هكذا تقود: زمنٌ وعمقٌ بيدٍ واحدة', 'This is how you drive: time and depth, one hand')}
              </div>
              <div className="grid gap-4 items-stretch" style={{ gridTemplateColumns: '1fr auto' }} dir="ltr">
                {/* the 2D view, framed: the two axes and the screen they make */}
                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-0)]/30 p-4 grid gap-x-4 gap-y-2 items-stretch" style={{ gridTemplateColumns: 'auto 1fr' }}>
                {/* corner — where the two axes meet */}
                <div className="flex items-end justify-end pb-1 pe-1 text-[10px] text-[var(--muted)]" aria-hidden>⌞</div>

                {/* the time axis, across the top */}
                <div className="flex flex-col items-center justify-end">
                  <div className="w-full max-w-[300px] rounded-full border border-[var(--border-default)] bg-[var(--surface-card)] px-5 pt-4 pb-2">
                    <div className="relative h-3">
                      <div className="absolute inset-x-1 top-1/2 -translate-y-1/2 h-px bg-[var(--border-medium)]" />
                      {[0, 50, 100].map((x) => (
                        <span key={x} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[var(--border-strong)]" style={{ left: `${Math.max(2, Math.min(98, x))}%` }} />
                      ))}
                      <span className="mm-tl-knob absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-4 rounded-sm bg-[var(--gold)] border border-[var(--gold)] shadow" style={{ left: '50%' }} />
                    </div>
                    <div className="flex justify-between text-[8px] text-[var(--muted)] mt-1">
                      <span>{L('الماضي', 'Past')}</span><span className="font-semibold text-[var(--ink-2)]">{L('اليوم', 'Today')}</span><span>{L('المستقبل', 'Future')}</span>
                    </div>
                  </div>
                  <div className="text-[9px] text-[var(--muted)] mt-1">↔ {L('محور الزمن', 'the time axis')}</div>
                </div>

                {/* the depth axis, down the side */}
                <div className="flex flex-col items-center justify-center">
                  <svg viewBox="0 0 56 240" className="h-36 w-auto" aria-hidden="true">
                    <line x1="0" y1="44" x2="56" y2="44" stroke="#4A85B9" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
                    <polygon points="28,14 33,27 35,42 20,42 23,25" fill="#DDEEFA" stroke="#9CC8E8" strokeWidth="1" />
                    <polygon points="17,48 39,48 44,100 12,102" fill="#7FB6DE" />
                    <polygon points="10,106 46,105 51,164 6,166" fill="#2F6494" opacity="0.6" />
                    <polygon points="4,170 52,169 47,224 28,236 9,226" fill="#153D63" opacity="0.55" />
                    <g className="mm-ice-marker">
                      <circle cx="46" cy="26" r="5" fill="var(--gold)" stroke="var(--surface-0)" strokeWidth="2" />
                    </g>
                  </svg>
                  <div className="text-[9px] text-[var(--muted)] mt-1 text-center max-w-[90px]">↕ {L('محور العمق', 'the depth axis')}</div>
                </div>

                {/* THE VIEW — the area the two axes frame. It is LIVE: as the
                    choreography walks the grid, this cell crossfades to the
                    explanation of the CURRENT time × depth combo, on the same
                    24s clock as the position chip beside it */}
                <div className="relative rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--surface-0)]/40 min-h-[150px]" dir={ar ? 'rtl' : 'ltr'}>
                  {([
                    ['mm-combo-default', 'mmChipToday1', '☀ ' + L('اليوم', 'Today') + ' · D1',
                      L('حاضرك عند قمة جبل الجليد — أهم المعلومات وأبسطها فقط عن وضعك الآن، حتى لا يشتّتك شيء.',
                        'Your present, at the tip of the iceberg — only the most relevant, simple info about where you stand right now, so nothing distracts you.')],
                    ['', 'mmChipPast', '🕰 ' + L('الماضي', 'Past') + ' · D1',
                      L('ضغطة ← وأنت في ماضيك — نفس العنوان البسيط، لكنه يحكي ما حدث: من أين جاء مالك وأين ذهب.',
                        "One ← and you're in your past — the same simple headline, now telling what happened: where your money came from, and where it went.")],
                    ['', 'mmChipFuture1', '🔭 ' + L('المستقبل', 'Future') + ' · D1',
                      L('ضغطتا ← وأنت في مستقبلك — عنوان ما هو قادم: إلى أين تتجه إن لم يتغيّر شيء.',
                        "Two → and you're in your future — the headline of what's coming: where you're heading if nothing changes.")],
                    ['', 'mmChipFuture4', '🔭 ' + L('المستقبل', 'Future') + ' · D4',
                      L('ثلاث ↓ وقد بلغت العمق الكامل — أقوى الأدوات وأعقد الأنظمة تلعب مستقبلك بالأرقام: ماذا لو، وإسقاطات، ومسارات. كما لا تجد في أي مكان آخر.',
                        "Three ↓ and you've gone wild at full depth — the most powerful tools and complex systems playing your future in numbers: what-ifs, projections, paths. Like no other.")],
                  ] as [string, string, string, string][]).map(([extra, anim, badge, desc]) => (
                    <div key={anim} className={`mm-combo ${extra} absolute inset-0 flex flex-col items-center justify-center text-center gap-2 p-4`} style={{ animationName: anim, opacity: 0 }}>
                      <span className="inline-flex items-center rounded-full border border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold-text-strong)] px-2.5 py-0.5 text-[10px] font-semibold" dir="ltr">{badge}</span>
                      <p className="text-[11px] text-[var(--ink-2)] leading-relaxed max-w-md">{desc}</p>
                    </div>
                  ))}
                </div>
                </div>

                {/* the pressing hand — command mode, outside the frame */}
                <div className="flex flex-col items-center justify-center gap-1 text-[9px] text-[var(--muted)]">
                  <div className="font-serif text-xs font-semibold text-[var(--ink)] mb-1">{L('وضع الأوامر', 'Command mode')}</div>
                  <kbd className="mm-k-up text-[10px] font-semibold bg-[var(--surface-1)] border border-[var(--border-default)] rounded px-2 py-0.5 text-[var(--ink)]">↑</kbd>
                  <div className="flex items-center gap-2 my-1.5">
                    <kbd className="mm-k-left text-[10px] font-semibold bg-[var(--surface-1)] border border-[var(--border-default)] rounded px-2 py-0.5 text-[var(--ink)]">←</kbd>
                    <kbd className="mm-k-right text-[10px] font-semibold bg-[var(--surface-1)] border border-[var(--border-default)] rounded px-2 py-0.5 text-[var(--ink)]">→</kbd>
                  </div>
                  <kbd className="mm-k-down text-[10px] font-semibold bg-[var(--surface-1)] border border-[var(--border-default)] rounded px-2 py-0.5 text-[var(--ink)]">↓</kbd>
                  <div className="text-[9px] text-[var(--muted)] mt-1.5 text-center max-w-[130px]">{L('اضغط مطوّلاً على Shift +', 'hold and press Shift +')}</div>
                  {/* the held key — set apart below, lighting with EVERY arrow press */}
                  <kbd className="mm-k-shift text-[10px] font-semibold bg-[var(--surface-1)] border border-[var(--border-default)] rounded px-4 py-0.5 text-[var(--ink)] mt-2">⇧ Shift</kbd>
                </div>

              </div>
            </div>

            <Link href="/tour" className="inline-block text-xs font-medium text-[var(--green-dark)] bg-[var(--green-bg)] border border-[var(--green-border)] rounded-lg px-3.5 py-2 mt-4">
              {L('شاهدها حيّة في الجولة ←', 'See it live in the tour →')}
            </Link>
          </div>

          {/* the personas — walk a ready-made life */}
          <div className="sm:col-span-2 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">👀</span>
              <span className="text-sm font-semibold text-[var(--ink)]">{L('جرّب المنتج بشخصية جاهزة', 'Preview the product as a ready-made persona')}</span>
            </div>
            <p className="text-xs text-[var(--muted)] leading-relaxed mb-4 max-w-2xl">
              {L(
                'أربع حيوات سعودية كاملة — واحدة لكل مرحلة مالية — تمشي فيها المنتج كله ببيانات حقيقية البنية، دون تسجيل ودون حفظ.',
                'Four complete Saudi lives — one per financial stage — to walk the whole product with realistically-shaped data, no signup, nothing saved.'
              )}
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
              {DEMO_PERSONAS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { enterDemo(p.id); router.push('/home'); }}
                  className="group text-start bg-[var(--surface-0)]/50 border border-[var(--border-faint)] rounded-xl p-3 hover:border-[var(--green)] transition-colors"
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <PersonaAvatar id={p.id} className="w-9 h-9 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[var(--ink)] truncate">{ar ? p.firstNameAr : p.firstName}</div>
                      <div className="text-[9px] rounded-full px-1.5 py-0.5 inline-block mt-0.5" style={{ background: `${p.accent}22`, color: p.accent }} dir="ltr">
                        {p.quadrant}
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-[var(--muted)] leading-relaxed line-clamp-2">{ar ? p.role.ar : p.role.en}</p>
                  <span className="text-[10px] font-medium text-[var(--green-dark)] group-hover:underline">
                    {L('امشِ في حياته ←', 'Walk this life →')}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* reach us */}
          <div className="sm:col-span-2 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">💬</span>
              <span className="text-sm font-semibold text-[var(--ink)]">{L('تواصل معنا', 'Reach us')}</span>
            </div>
            <p className="text-xs text-[var(--muted)] leading-relaxed mb-3 max-w-2xl">
              {L(
                'سؤال، ملاحظة، هاجس لم نغطِّه بعد، استفسار استثماري، أو شراكة — يسعدنا أن نسمع منك، وكل رسالة تُقرأ.',
                'A question, feedback, a concern we have not covered yet, an investment inquiry, or a partnership — we would love to hear from you, and every message gets read.'
              )}
            </p>
            <button
              onClick={() => setContactOpen(true)}
              className="text-xs font-medium text-[var(--green-dark)] bg-[var(--green-bg)] border border-[var(--green-border)] rounded-lg px-3.5 py-2"
            >
              {t('common.contactUs')}
            </button>
          </div>
        </div>
      </div>

      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} source="about" />
    </div>
  );
}

// The Saudi flag (Twemoji asset, CC-BY 4.0) — a real image, because Windows
// renders the 🇸🇦 flag emoji as plain "SA" letters.
function SaudiEmblem() {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/saudi-flag.svg" alt="🇸🇦" className="h-6 w-8 rounded-[3px] object-cover" />;
}

// The whole product on one wall — every tool across the three times, its
// depth marked. The D4 cockpit's command surface: the pro sees everything

function SectionHeading({ eyebrow, title }: { eyebrow: string; title?: string }) {
  return (
    <div className="mb-3">
      <div className="text-[10px] tracking-[0.08em] uppercase text-[var(--gold)] font-semibold mb-1">{eyebrow}</div>
      {title && <div className="font-serif text-lg font-semibold text-[var(--ink)]">{title}</div>}
    </div>
  );
}

// The three time views are the product's front doors, so their cards carry
// more presence than ordinary tool cards.
function ViewCard({ href, icon, title, desc }: { href: string; icon: string; title: string; desc: string }) {
  return (
    <Link href={href} className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 hover:border-[var(--green)] transition-colors group">
      <div className="text-2xl mb-3">{icon}</div>
      <div className="font-serif text-lg font-semibold text-[var(--ink)] mb-1 group-hover:text-[var(--green-dark)]">{title}</div>
      <div className="text-xs text-[var(--muted)] leading-relaxed">{desc}</div>
    </Link>
  );
}

