'use client';

// About MalMind — the product's story on its own page: the mission, the
// three time views, and the four problems we exist to solve. It lived on
// home's deeper levels; the founder gave it a door in the top bar instead,
// paired with Take a tour.

import Link from 'next/link';
import { useLocale } from '@/lib/i18n/LocaleProvider';

export default function AboutPage() {
  const { t, locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);

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
              'مال مايند رفيقٌ ماليّ سعوديّ أولاً، يحوّل الأرقام المبعثرة إلى صورة واحدة مترابطة تراها وتسائلها وتصمّمها — عبر ماضيك، وحاضرك، والمستقبل الذي تبنيه. ليس شاشة أرصدة أخرى، بل مكانٌ لفهم مالك واتّخاذ قرارات أفضل به.',
              "MalMind is a Saudi-first financial companion that turns scattered numbers into one connected picture you can see, question, and design — across your past, your present, and the future you're building toward. Not another balance screen: a place to understand your money and make better decisions with it."
            )}
          </p>

          {/* what makes MalMind itself: the Brain, the iceberg, the modes, the drives */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mt-5">
            {([
              ['🧠', L('العقل', 'The Brain'), L('مستشار ذكاء اصطناعي يرافقك صفحةً بصفحة ويجيب من أرقامك أنت', 'An AI advisor that walks with you page by page and answers from your own numbers')],
              ['🧊', L('الغوص بالعمق', 'Depth diving'), L('جبل جليد بأربع طبقات — من الأساسيات إلى الاحتراف الكامل', 'A four-layer iceberg — from the essentials down to full mastery')],
              ['🥄', L('مستوى المساندة', 'Assistance level'), L('بالملعقة · شبه محترف · محترف — بقدر ما تحتاج من يدٍ تمسكك', 'Spoon-fed · Semi-pro · Pro — exactly as much hand-holding as you want')],
              ['📖', L('المحرّكات', 'Drivers'), L('قصص · أرقام · قصص وأرقام — يتشكّل المنتج على طريقة تفكيرك', 'Stories · Numbers · Both — the product reshapes to how you think')],
            ] as [string, string, string][]).map(([icon, name, desc]) => (
              <div key={name} className="bg-[var(--surface-0)]/50 border border-[var(--border-faint)] rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-base leading-none">{icon}</span>
                  <span className="text-xs font-semibold text-[var(--ink)]">{name}</span>
                </div>
                <p className="text-[10px] text-[var(--muted)] leading-relaxed">{desc}</p>
              </div>
            ))}
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

