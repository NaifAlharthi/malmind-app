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

          {/* the thinking layer, drawn: data below · MalMind between · decisions above */}
          <div className="mt-5 flex flex-col gap-1.5 max-w-2xl">
            <div className="rounded-xl border border-[var(--border-faint)] bg-[var(--surface-0)]/50 px-4 py-3">
              <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--muted)] font-semibold mb-1">{L('قراراتك وتطبيقاتها', 'Your decisions & their applications')}</div>
              <div className="text-[11px] text-[var(--ink-2)]">{L('هل أقدر على السيارة؟ · متى أبلغ حريتي؟ · أيّ دين أسدّد أولاً؟ · هل أنا بخير؟', 'Can I afford the car? · When am I free? · Which debt first? · Am I OK?')}</div>
            </div>
            <div className="text-center text-[var(--muted)] text-xs leading-none" aria-hidden>↑</div>
            <div className="rounded-xl border-2 border-[var(--green)] bg-[var(--green-bg)] px-4 py-3.5">
              <div className="flex items-center gap-2">
                <span className="text-lg leading-none">🧠</span>
                <span className="text-sm font-bold text-[var(--green-dark)]">{L('مال مايند — طبقة التفكير، بالذكاء الاصطناعي', 'MalMind — the thinking layer, powered by AI')}</span>
              </div>
              <div className="text-[11px] text-[var(--ink-2)] mt-1">{L('يقرأ الشرائح كلّها · يربطها في صورة واحدة · يجيب من أرقامك أنت لا من قواعد عامة', 'Reads every slice · connects them into one picture · answers from YOUR numbers, not generic rules')}</div>
            </div>
            <div className="text-center text-[var(--muted)] text-xs leading-none" aria-hidden>↑</div>
            <div className="rounded-xl border border-[var(--border-faint)] bg-[var(--surface-0)]/50 px-4 py-3">
              <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--muted)] font-semibold mb-1">{L('بياناتك المالية المبعثرة', 'Your scattered financial data')}</div>
              <div className="text-[11px] text-[var(--ink-2)]">{L('البنوك · الوسطاء · الأقساط · الرواتب · الجداول · الأصول الحقيقية', 'Banks · brokers · installments · salaries · spreadsheets · real assets')}</div>
            </div>
          </div>

          {/* the stats wear the same dress as the cards above — one system */}
          <div className="grid grid-cols-3 gap-2.5 mt-2.5">
            <div className="bg-[var(--surface-0)]/50 border border-[var(--border-faint)] rounded-xl p-3 flex flex-col items-center justify-center text-center">
              <div className="font-serif text-xl font-bold text-[var(--green-dark)] leading-none mb-1">19</div>
              <div className="text-[10px] text-[var(--muted)]">{L('أداة مترابطة', 'connected tools')}</div>
            </div>
            <div className="bg-[var(--surface-0)]/50 border border-[var(--border-faint)] rounded-xl p-3 flex flex-col items-center justify-center text-center">
              <div className="font-serif text-xl font-bold text-[var(--green-dark)] leading-none mb-1">3</div>
              <div className="text-[10px] text-[var(--muted)]">{L('نظرات زمنية', 'time views')}</div>
            </div>
            <div className="bg-[var(--surface-0)]/50 border border-[var(--border-faint)] rounded-xl p-3 flex flex-col items-center justify-center text-center">
              <SaudiEmblem />
              <div className="text-[10px] text-[var(--muted)] mt-1">{L('مصمَّم للسعودية', 'made for Saudi')}</div>
            </div>
          </div>
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
            {/* the three instruments LIVE — each miniature loops its own
                motion: the walker travels, the marker dives, the keys press */}
            <style>{`
              @keyframes mmTlKnob { 0%,10%{left:50%} 25%,35%{left:4%} 50%,60%{left:50%} 75%,85%{left:96%} 100%{left:50%} }
              @keyframes mmIceDive { 0%,10%{transform:translateY(0)} 25%,35%{transform:translateY(48px)} 50%,62%{transform:translateY(109px)} 78%,88%{transform:translateY(171px)} 100%{transform:translateY(0)} }
              @keyframes mmKeyPress { 0%,5%{background:var(--gold);color:#2A1F05;border-color:var(--gold)} 9%,100%{background:var(--surface-1);color:var(--ink);border-color:var(--border-default)} }
              .mm-tl-knob { animation: mmTlKnob 9s ease-in-out infinite; }
              .mm-ice-marker { animation: mmIceDive 9s ease-in-out infinite; }
              .mm-key { animation: mmKeyPress 9s infinite; }
              @media (prefers-reduced-motion: reduce) {
                .mm-tl-knob, .mm-tl-prog, .mm-ice-marker, .mm-key { animation: none; }
              }
            `}</style>
            <div className="grid sm:grid-cols-3 gap-3 mt-5 items-stretch">
              {/* the timeline pill */}
              <div className="rounded-2xl border border-[var(--border-default)] p-4 flex flex-col" style={{ background: 'color-mix(in srgb, var(--surface-card) 88%, transparent)' }}>
                <div className="flex-1 flex items-center">
                  <div className="w-full rounded-full border border-[var(--border-default)] bg-[var(--surface-card)] px-5 pt-4 pb-2" dir="ltr">
                    <div className="relative h-3">
                      <div className="absolute inset-x-1 top-1/2 -translate-y-1/2 h-px bg-[var(--border-medium)]" />
                      {[0, 50, 100].map((x) => (
                        <span key={x} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[var(--border-strong)]" style={{ left: `${Math.max(2, Math.min(98, x))}%` }} />
                      ))}
                      {/* the walker — loops past → today → future */}
                      <span className="mm-tl-knob absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-4 rounded-sm bg-[var(--gold)] border border-[var(--gold)] shadow" style={{ left: '50%' }} />
                    </div>
                    <div className="flex justify-between text-[8px] text-[var(--muted)] mt-1">
                      <span>{L('الماضي', 'The Past')}</span><span className="font-semibold text-[var(--ink-2)]">{L('اليوم', 'Today')}</span><span>{L('المستقبل', 'The Future')}</span>
                    </div>
                  </div>
                </div>
                <div className="text-[9px] text-[var(--muted)] text-center mt-2.5">↔ {L('الخط الزمني — سافر عبر الزمن', 'The timeline — travel through time')}</div>
                <p className="text-[10px] text-[var(--ink-2)] leading-relaxed text-center mt-1.5">
                  {L('لماذا؟ لأن قرار اليوم يُفهم من الماضي ويُختبر في المستقبل — شاشة واحدة لا تتسع لعمرٍ مالي.', "Why: today's decision is understood from the past and tested in the future — one screen can't hold a financial lifetime.")}
                </p>
              </div>

              {/* the iceberg */}
              <div className="rounded-2xl border border-[var(--border-default)] p-4 flex flex-col" style={{ background: 'color-mix(in srgb, var(--surface-card) 88%, transparent)' }}>
                <div className="flex-1 flex items-center justify-center">
                  <svg viewBox="0 0 56 240" className="h-32 w-auto" aria-hidden="true">
                    <line x1="0" y1="44" x2="56" y2="44" stroke="#4A85B9" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
                    <polygon points="28,14 33,27 35,42 20,42 23,25" fill="#DDEEFA" stroke="#9CC8E8" strokeWidth="1" />
                    <polygon points="17,48 39,48 44,100 12,102" fill="#7FB6DE" />
                    <polygon points="10,106 46,105 51,164 6,166" fill="#2F6494" opacity="0.6" />
                    <polygon points="4,170 52,169 47,224 28,236 9,226" fill="#153D63" opacity="0.55" />
                    {/* the marker — loops tip → −20m → −200m → −1000m */}
                    <g className="mm-ice-marker">
                      <circle cx="46" cy="26" r="5" fill="var(--gold)" stroke="var(--surface-0)" strokeWidth="2" />
                    </g>
                  </svg>
                </div>
                <div className="text-[9px] text-[var(--muted)] text-center mt-2.5">↕ {L('جبل الجليد — اغطس بالعمق', 'The iceberg — dive by depth')}</div>
                <p className="text-[10px] text-[var(--ink-2)] leading-relaxed text-center mt-1.5">
                  {L('لماذا؟ لأن التعقيد يُكتسب ولا يُفرض — تبدأ بهدوء، وتفتح العمق متى أردته أنت.', 'Why: complexity is earned, never imposed — you start calm, and unlock depth only when YOU want it.')}
                </p>
              </div>

              {/* the command palette */}
              <div className="rounded-2xl border border-[var(--border-default)] p-4 flex flex-col" style={{ background: 'color-mix(in srgb, var(--surface-card) 88%, transparent)' }}>
                <div className="flex-1 flex flex-col items-center justify-center gap-1 text-[9px] text-[var(--muted)]" dir="ltr">
                  <div className="font-serif text-xs font-semibold text-[var(--ink)] mb-1">{L('وضع الأوامر', 'Command mode')}</div>
                  <kbd className="mm-key text-[9px] font-semibold bg-[var(--surface-1)] border border-[var(--border-default)] rounded px-1.5 py-0.5 text-[var(--ink)]" style={{ animationDelay: '0s' }}>↑</kbd>
                  <span>🌊 {L('اصعد', 'Surface')}</span>
                  <div className="flex items-center gap-1.5 my-1">
                    <kbd className="mm-key text-[9px] font-semibold bg-[var(--surface-1)] border border-[var(--border-default)] rounded px-1.5 py-0.5 text-[var(--ink)]" style={{ animationDelay: '2.25s' }}>←</kbd>
                    <span>🕰</span>
                    <span className="rounded-full border border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold-text-strong)] px-2 py-0.5 text-[9px] font-semibold whitespace-nowrap">☀ {L('اليوم', 'Today')} · D2</span>
                    <span>🔭</span>
                    <kbd className="mm-key text-[9px] font-semibold bg-[var(--surface-1)] border border-[var(--border-default)] rounded px-1.5 py-0.5 text-[var(--ink)]" style={{ animationDelay: '4.5s' }}>→</kbd>
                  </div>
                  <span>🐬 {L('اغطس', 'Dive')}</span>
                  <kbd className="mm-key text-[9px] font-semibold bg-[var(--surface-1)] border border-[var(--border-default)] rounded px-1.5 py-0.5 text-[var(--ink)]" style={{ animationDelay: '6.75s' }}>↓</kbd>
                </div>
                <div className="text-[9px] text-[var(--muted)] text-center mt-2.5">⇧ {L('لوحة الأوامر — كل شيء تحت أصابعك', 'The palette — everything under your fingers')}</div>
                <p className="text-[10px] text-[var(--ink-2)] leading-relaxed text-center mt-1.5">
                  {L('لماذا؟ لأن السرعة تغيّر علاقتك بمالك — الخريطة كلها تُدار بيدٍ واحدة دون مغادرة لوحة المفاتيح.', 'Why: speed changes your relationship with your money — the whole map driven one-handed, never leaving the keyboard.')}
                </p>
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

