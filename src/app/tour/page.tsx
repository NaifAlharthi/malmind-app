'use client';

// Take a tour — the guidance home for a product with a lot of features.
// Three ways to learn MalMind, from most to least hand-held: walk a full
// guided story as one of the four Saudi personas; switch on the Brain's
// page-by-page guide; or browse the step-by-step feature directory, grouped
// the way the product thinks (Past · Today · Future).

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { enterDemo } from '@/lib/demoSupabase';
import { DEMO_PERSONAS } from '@/lib/demoWorld';
import { setGuideMode } from '@/lib/brainGuide';
import PersonaAvatar from '@/app/signup/PersonaAvatar';

interface TourItem { href: string; icon: string; name: [string, string]; desc: [string, string] }

const GROUPS: { key: string; icon: string; title: [string, string]; blurb: [string, string]; items: TourItem[] }[] = [
  {
    key: 'past', icon: '🕰', title: ['الماضي', 'The Past'],
    blurb: ['أرشيفك — ما عشته وما سجّلته', 'Your archive — what you lived and logged'],
    items: [
      { href: '/story', icon: '📖', name: ['قصتي المالية', 'My Financial Story'], desc: ['حياتك المالية فصولاً يقرؤها المستشار', 'Your money life in chapters the advisor reads'] },
      { href: '/financial-numbers', icon: '📒', name: ['أرقامي المالية', 'My Financial Numbers'], desc: ['السِّجل الشهري الذي يُحسب منه كل شيء', 'The monthly ledger everything computes from'] },
      { href: '/lifetime-income', icon: '💰', name: ['دخل العمر', 'Lifetime Income'], desc: ['قوس حياتك الكاسبة كاملاً، وما بقي منه', 'Your whole earning arc, and what stayed'] },
    ],
  },
  {
    key: 'today', icon: '☀', title: ['اليوم', 'Today'],
    blurb: ['موقفك الحيّ — محسوباً من أرقامك', 'Your live position — computed from your numbers'],
    items: [
      { href: '/today', icon: '🖥', name: ['لوحة اليوم', 'The Today dashboard'], desc: ['حاضرك المالي كله في شاشة واحدة', 'Your entire financial present on one screen'] },
      { href: '/holdings', icon: '💼', name: ['الأصول والالتزامات', 'Assets & Liabilities'], desc: ['كل ما تملك وما عليك — حتى الأرض والإبل', 'Everything owned and owed — land and camels too'] },
      { href: '/commitments', icon: '🧾', name: ['الفواتير والالتزامات', 'Bills & Commitments'], desc: ['اشتراكاتك وقروضك وبطاقاتك: تدفّقك الحقيقي', 'Subscriptions, loans, cards: your true outflow'] },
      { href: '/daily-stack', icon: '🗼', name: ['كومة اليوم', 'The Daily Stack'], desc: ['يومك برجاً من الاختيارات، وكرة الثلج التي يصيرها', 'A day as a tower of choices, and its snowball'] },
      { href: '/ratios', icon: '🩺', name: ['النسب والإحصاءات', 'Ratios & Stats'], desc: ['اثنتا عشرة علامة حيوية بلغة واضحة', 'Twelve vital signs in plain terms'] },
      { href: '/risks', icon: '🛡', name: ['المخاطر', 'Risks'], desc: ['انكشافاتك الخمسة، وكيف تعالجها', 'Your five exposures, and their fixes'] },
      { href: '/credit', icon: '📇', name: ['الوضع الائتماني', 'Credit Standing'], desc: ['درجة سمة وقدرتك الاقتراضية', 'Your SIMAH score and borrowing power'] },
      { href: '/positioning', icon: '📊', name: ['المركز المالي', 'Financial Positioning'], desc: ['أين تقف مقارنةً بالأقران وبعمرك', 'Where you stand vs peers and your age'] },
      { href: '/velocity', icon: '⏱', name: ['سرعة المال', 'Velocity of Money'], desc: ['الثروة زمناً: كم تبعد أهدافك بأشهر عمرك', 'Wealth as time: how many months away your targets sit'] },
    ],
  },
  {
    key: 'future', icon: '🔭', title: ['المستقبل', 'The Future'],
    blurb: ['ما تصمّمه — خطط وقرارات قبل أن تعيشها', 'What you design — plans and decisions before you live them'],
    items: [
      { href: '/freedom', icon: '🕊', name: ['الحرّية المالية', 'Financial Freedom'], desc: ['رقمك، وكم قطعت من الطريق إليه', 'Your number, and how far along you are'] },
      { href: '/what-if', icon: '🔮', name: ['ماذا لو', 'What-If'], desc: ['جرّب الفيلا والعلاوة والانقطاع — بالأرقام أولاً', 'Sandbox the villa, the raise, the break — in numbers first'] },
      { href: '/compare', icon: '⚖️', name: ['قارن وقرّر', 'Compare & Decide'], desc: ['خياران من السوق السعودي وخلاصة تحسم', 'Two Saudi-market options and a verdict'] },
      { href: '/standard-of-living?mode=plan', icon: '🪜', name: ['مستوى المعيشة', 'Standard of Living'], desc: ['سُلّمك الاجتماعي ورحلة صعودك عبر المراحل', 'Your ladder and your climb across life phases'] },
      { href: '/doubling-path', icon: '📈', name: ['مسار المضاعفة', 'The Doubling Path'], desc: ['متى تتضاعف محفظتك، ثم تتضاعف', 'When your portfolio doubles, then doubles again'] },
      { href: '/goal-fund', icon: '🎯', name: ['صناديق الأهداف', 'Goal Funds'], desc: ['ادّخار باسمٍ ووتيرة وحالة صادقة', 'Saving with a name, a pace, and an honest status'] },
      { href: '/year-plan', icon: '🗓', name: ['الخطة السنوية', 'Year Master Plan'], desc: ['عقد سنتك: من أين إلى أين، وكيف', "The year's contract: from where to where, and how"] },
      { href: '/waterfall', icon: '💧', name: ['شلال المال', 'Money Waterfall'], desc: ['أين يذهب دخلك، مرسوماً كتدفّق', 'Where your income flows, drawn as water'] },
      { href: '/budgeting', icon: '🛋', name: ['الميزنة الديناميكية', 'Dynamic Budgeting'], desc: ['ليس «هل أقدر؟» بل «متى أشتري؟»', 'Not "can I?" but "when should I?"'] },
    ],
  },
];

export default function TourPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const pick = (pair: [string, string]) => (ar ? pair[0] : pair[1]);
  const [guideOn, setGuideOn] = useState(false);

  const startPersona = (id: string) => {
    enterDemo(id);
    router.push('/home');
  };

  const enableGuide = () => {
    setGuideMode('auto');
    setGuideOn(true);
  };

  return (
    <div>
      <div className="mb-1 text-[10px] tracking-[0.1em] uppercase text-[var(--gold)] font-semibold">{L('دليلك', 'Your guide')}</div>
      <h1 className="font-serif text-2xl font-semibold text-[var(--ink)] mb-1">{L('خذ جولة', 'Take a tour')}</h1>
      <p className="text-sm text-[var(--ink-2)] mb-6 max-w-2xl">
        {L(
          'مال مايند مليء بالأدوات — وهذه الصفحة خريطتك إليها. اختر الطريقة التي تناسبك: جولة قصصية كاملة بعينَي شخصية تشبهك، أو دليل حيّ يرافقك صفحةً بصفحة، أو فهرس مرتّب تتعلّم منه خطوة بخطوة.',
          'MalMind is full of tools — this page is your map to them. Pick how you like to learn: a full guided story through the eyes of a persona like you, a live guide that walks with you page by page, or an ordered index to learn step by step.'
        )}
      </p>

      {/* ── 1 · walk as a persona ── */}
      <div className="mb-8">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="w-6 h-6 rounded-full bg-[var(--green-dark)] text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
          <h2 className="font-serif text-lg font-semibold text-[var(--ink)]">{L('امشِ الجولة الكاملة بعينَي شخصية', 'Walk the full tour as a persona')}</h2>
        </div>
        <p className="text-xs text-[var(--muted)] mb-3 ms-8">
          {L(
            'جولة موجَّهة من ٢٤ محطة على بيانات كاملة — تجريبية تماماً: حسابك لا يُمسّ، وتخرج متى شئت من الشريط السفلي.',
            'A 24-stop guided walkthrough on full data — entirely sandboxed: your account is untouched, and you exit any time from the bottom banner.'
          )}
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 ms-8">
          {DEMO_PERSONAS.map((p) => (
            <button key={p.id} onClick={() => startPersona(p.id)}
              className="text-start bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-3.5 hover:border-[var(--green)] hover:-translate-y-0.5 transition-all group">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 ring-2" style={{ ['--tw-ring-color' as string]: `${p.accent}66` }}>
                  <PersonaAvatar id={p.id} />
                </div>
                <div className="min-w-0">
                  <div className="font-serif text-sm font-semibold text-[var(--ink)] leading-tight">{p.firstName}<span className="text-[var(--muted)] font-normal">، {p.age}</span></div>
                  <div className="text-[10px] text-[var(--muted)] truncate">{ar ? p.role.ar : p.role.en}</div>
                </div>
              </div>
              <div className="text-[11px] leading-snug mb-2" style={{ color: p.accent }}>“{ar ? p.tagline.ar : p.tagline.en}”</div>
              <div className="text-[11px] font-semibold text-[var(--green-dark)] group-hover:underline">
                {L(`ابدأ بصفتك ${p.firstName} ←`, `Start as ${p.firstName} →`)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── 2 · the live page guide ── */}
      <div className="mb-8">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="w-6 h-6 rounded-full bg-[var(--green-dark)] text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
          <h2 className="font-serif text-lg font-semibold text-[var(--ink)]">{L('شغّل الدليل الحيّ — العقل يرافقك', 'Turn on the live guide — the Brain walks with you')}</h2>
        </div>
        <div className="ms-8 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-[var(--ink-2)] leading-relaxed min-w-0 max-w-xl">
            {L(
              'على كل صفحة، يشرح العقل في فقاعته ما الذي تنظر إليه، ولماذا بُني، وأي رأيٍ يفترض أن تخرج به — ويقفز مشيراً إلى التفاصيل المهمة. بدّل وضعه (تلقائي · عند الطلب · كتم) من الفقاعة نفسها متى شئت.',
              "On every page, the Brain's bubble explains what you're looking at, why it was built, and the opinion you should walk out with — and it jumps to point at the details that matter. Change its mode (auto · on ask · mute) from the bubble any time."
            )}
          </p>
          {guideOn ? (
            <span className="text-xs font-semibold text-[var(--green-dark)] bg-[var(--green-bg)] border border-[var(--green)] rounded-lg px-4 py-2.5 shrink-0">
              {L('الدليل مفعَّل ✓ — تنقّل وسيتحدث', 'Guide is on ✓ — navigate and it speaks')}
            </span>
          ) : (
            <button onClick={enableGuide}
              className="text-xs font-semibold text-white bg-[var(--green-dark)] rounded-lg px-4 py-2.5 shrink-0">
              {L('فعّل الدليل التلقائي', 'Enable the auto guide')}
            </button>
          )}
        </div>
      </div>

      {/* ── 3 · the feature index ── */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="w-6 h-6 rounded-full bg-[var(--green-dark)] text-white text-xs font-bold flex items-center justify-center shrink-0">3</span>
          <h2 className="font-serif text-lg font-semibold text-[var(--ink)]">{L('أو تعلّم أداةً أداة', 'Or learn tool by tool')}</h2>
        </div>
        <p className="text-xs text-[var(--muted)] mb-4 ms-8">
          {L('مرتّبة كما يفكر المنتج: ماضيك، فحاضرك، فما تصمّمه.', 'Ordered the way the product thinks: your past, your present, then what you design.')}
        </p>
        <div className="space-y-5 ms-8">
          {GROUPS.map((g) => (
            <div key={g.key}>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-base">{g.icon}</span>
                <span className="font-serif text-base font-semibold text-[var(--ink)]">{pick(g.title)}</span>
                <span className="text-[11px] text-[var(--muted)]">{pick(g.blurb)}</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {g.items.map((it) => (
                  <Link key={it.href} href={it.href}
                    className="flex items-start gap-2.5 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-3 hover:border-[var(--green)] transition-colors">
                    <span className="text-lg shrink-0 leading-none mt-0.5">{it.icon}</span>
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-[var(--ink)]">{pick(it.name)}</span>
                      <span className="block text-[10px] text-[var(--muted)] leading-snug">{pick(it.desc)}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 items-start bg-[var(--gold-bg)] border border-[var(--gold)] rounded-xl p-4">
        <div className="w-7 h-7 rounded-full bg-[var(--gold)] flex items-center justify-center font-serif font-semibold text-white text-sm shrink-0">M</div>
        <div className="text-xs text-[var(--gold-text-body)] leading-relaxed">
          <strong className="text-[var(--gold-text-strong)]">{L('ولا تنسَ:', "And don't forget:")}</strong>{' '}
          {L('زر ⓘ الموجود على البطاقات يشرح أي رقم أمامك، وزر «اسأل العقل» يأخذ سؤالك — بأرقامك أنت — إلى المستشار مباشرة.', 'the ⓘ button on cards explains any number in front of you, and "Ask the Brain" carries your question — with your numbers — straight to the advisor.')}
        </div>
      </div>
    </div>
  );
}
