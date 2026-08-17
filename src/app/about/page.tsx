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
                    'نظام قيادة بمستوى المنصات الاحترافية العالمية — من طراز بلومبيرغ وأرقى — لكن هادئ، إنساني، وبالعربية أولاً: خريطة ذات بُعدين تسافر فيها عبر الزمن أفقياً (الماضي · اليوم · المستقبل)، وتغوص عمودياً في جبل الجليد — أربع طبقات من البساطة إلى الاحتراف، وكل صفحة تعيد ترتيب نفسها حسب عمقك.',
                    "A command system at the level of the world's pro terminals — Bloomberg-grade and beyond — but calm, human, and Arabic-first: a two-dimensional map where you travel time horizontally (past · today · future) and dive the iceberg vertically — four layers from simplicity to mastery, every page restaging itself to your depth."
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
            {/* a still of the command palette itself — the popup, in miniature */}
            <div className="mt-5 flex flex-col items-center">
              <div className="w-full max-w-sm rounded-2xl border border-[var(--border-default)] p-4 shadow-lg" style={{ background: 'color-mix(in srgb, var(--surface-card) 88%, transparent)' }} dir="ltr">
                <div className="text-center font-serif text-sm font-semibold text-[var(--ink)] mb-3">{L('وضع الأوامر', 'Command mode')}</div>
                <div className="flex flex-col items-center gap-1 text-[10px] text-[var(--muted)]">
                  <kbd className="text-[10px] font-semibold bg-[var(--surface-1)] border border-[var(--border-default)] rounded-md px-2 py-0.5 text-[var(--ink)]">↑</kbd>
                  <span>🌊 {L('اصعد إلى «الأساس»', 'Surface to “The essentials”')}</span>
                  <div className="flex items-center gap-2.5 my-1.5">
                    <kbd className="text-[10px] font-semibold bg-[var(--surface-1)] border border-[var(--border-default)] rounded-md px-2 py-0.5 text-[var(--ink)]">←</kbd>
                    <span>🕰 {L('الماضي', 'Past')}</span>
                    <span className="rounded-full border border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold-text-strong)] px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap">☀ {L('اليوم', 'Today')} · D2</span>
                    <span>🔭 {L('المستقبل', 'The Future')}</span>
                    <kbd className="text-[10px] font-semibold bg-[var(--surface-1)] border border-[var(--border-default)] rounded-md px-2 py-0.5 text-[var(--ink)]">→</kbd>
                  </div>
                  <span>🐬 {L('اغطس إلى «التحليل»', 'Dive to “The analysis”')}</span>
                  <kbd className="text-[10px] font-semibold bg-[var(--surface-1)] border border-[var(--border-default)] rounded-md px-2 py-0.5 text-[var(--ink)]">↓</kbd>
                </div>
              </div>
              <div className="text-[10px] text-[var(--muted)] mt-2">
                {L('هكذا تظهر لوحة القيادة لحظة إمساك Shift — فوق أي صفحة، شفافةً بلون ما خلفها', 'This is the command palette the moment you hold Shift — over any page, tinted by what is behind it')}
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

