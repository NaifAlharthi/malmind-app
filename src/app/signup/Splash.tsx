'use client';

// The landing splash — Saudi-first and Arabic by default. A self-running,
// four-act cinematic: each act gives ONE of the four fundamental problems the
// visitor's full attention — the issue properly stated, exactly how MalMind
// tackles it, and a living scene that draws it — set against a Saudi-green
// night sky with the Riyadh skyline and the national emblem. Bilingual
// (flips with the language toggle); pure CSS/SVG, no assets.

import { useEffect, useState } from 'react';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { SceneFutures, SceneVitals, SceneHiddenWealth } from './ProblemScenes';

interface Act { eyebrow: string; icon: string; title: string; body: string; tackle: string }
interface Content {
  tag: string;
  acts: Act[];
  tackleLabel: string;
  ctaCreate: string;
  ctaDemo: string;
  skip: string;
  chips: string[];
  trust: { icon: string; text: string }[];
}

const CONTENT: Record<'ar' | 'en', Content> = {
  ar: {
    tag: 'صُنع للسعودية',
    acts: [
      {
        eyebrow: 'المشكلة ١ من ٤',
        icon: '🧩',
        title: 'بياناتك المالية مبعثرة في كل مكان',
        body: 'الراتب في تطبيق البنك، والأسهم عند الوسيط، والقروض في تطبيق ثالث، والاشتراكات تُخصم بصمت. لا شيء يريك الصورة كاملة، فتعيش حياتك المالية مشاهدَ متفرقة بلا فيلم — ولا تستطيع الإجابة عن أبسط سؤال: هل أتقدّم فعلاً؟',
        tackle: 'مال مايند يجمعها في سِجلٍّ واحد مترابط: خمس دقائق شهرياً، وكل أداة في المنتج تُحسب من الصورة نفسها.',
      },
      {
        eyebrow: 'المشكلة ٢ من ٤',
        icon: '🧮',
        title: 'أرصدة، لا قرارات',
        body: 'تطبيقات البنوك تريك ما تملكه اليوم — ثم تصمت تماماً حين تسأل: ماذا لو اشتريت الفيلا؟ ماذا تفعل العلاوة بمستقبلي؟ متى أبلغ حرّيتي؟ الرصيد رقمٌ؛ والقرار يحتاج نموذجاً تجرّبه قبل أن تعيشه.',
        tackle: 'طبقة نمذجة وسيناريوهات تلعب بها — «قارن وقرّر»، و«ماذا لو»، وسرعة المال: القرار بالأرقام قبل السنوات.',
      },
      {
        eyebrow: 'المشكلة ٣ من ٤',
        icon: '🔢',
        title: 'أرقام بلا معنى',
        body: 'تتراكم الأرقام على الشاشات دون أن تجيب عن السؤال الوحيد المهم: هل أنا بخير؟ هل أنا مكشوف؟ هل أنا على المسار؟ رقمٌ بلا تفسير عبءٌ ذهنيّ — لا بصيرة.',
        tackle: 'اثنتا عشرة علامة حيوية ومخاطر مرسومة كما تعنيه فعلاً، وإرشاد بلغة البشر — وكل بطاقة تشرح نفسها بزرّ ⓘ.',
      },
      {
        eyebrow: 'المشكلة ٤ من ٤',
        icon: '🐫',
        title: 'ثروتك ليست نقداً فقط',
        body: 'أرضك في القصيم، وإبلك، وذهب البيت، وحصّتك في مشروع عائلي — قيمة حقيقية لا يلتقطها أي تطبيق بنكي، فيظهر «صافي ثروتك» أصغر بكثير من حقيقته، وتُبنى قراراتك على صورة ناقصة.',
        tackle: 'سجّل كل أصل حقيقي بقيمته — أرضاً كان أم ماشيةً أم ذهباً — ليظهر صافي ثروتك الحقيقي وتقف كل أداة عليه.',
      },
    ],
    tackleLabel: 'كيف نعالجها',
    ctaCreate: 'أنشئ حسابك المجاني ↓',
    ctaDemo: 'اختر شخصية وامشِ في حياتها ↓',
    skip: 'تخطٍّ ↓',
    chips: [
      'راتب 28,000 ريال',
      'قرض السيارة… 42,000؟',
      'نتفلكس · سبوتيفاي · آيكلاود…',
      'أرضي في القصيم = ؟',
      'الإيجار 6,500',
      'إبلي وذهبي… بلا قيمة مسجّلة',
      'صافي الثروة = ؟؟',
      'المدخرات… في مكانٍ ما',
    ],
    trust: [
      { icon: '🔒', text: 'بياناتك ملكك — تُحفظ بأمان' },
      { icon: '🚫', text: 'لا تُباع ولا تُدرَّب عليها النماذج' },
      { icon: '🇸🇦', text: 'صُنع للسعودية، بواقعها وأنظمتها' },
    ],
  },
  en: {
    tag: 'Made for Saudi Arabia',
    acts: [
      {
        eyebrow: 'Problem 1 of 4',
        icon: '🧩',
        title: 'Your financial data, scattered everywhere',
        body: "Your salary in the bank app, stocks at a broker, loans in a third app, subscriptions quietly draining. Nothing shows the whole picture, so you live your financial life as scattered scenes with no film — unable to answer the simplest question: am I actually getting ahead?",
        tackle: 'MalMind pulls it into one connected ledger: five minutes a month, and every tool in the product computes from the same picture.',
      },
      {
        eyebrow: 'Problem 2 of 4',
        icon: '🧮',
        title: 'Balances, not decisions',
        body: "Bank apps show what you have today — then go silent when you ask: what if I buy the villa? What does the raise do to my future? When do I reach freedom? A balance is a number; a decision needs a model you can try before you live it.",
        tackle: 'A modeling & scenario layer you can play with — Compare & Decide, What-If, Velocity: the decision in numbers before it costs you years.',
      },
      {
        eyebrow: 'Problem 3 of 4',
        icon: '🔢',
        title: 'Numbers without meaning',
        body: "Figures pile up on screens without answering the only question that matters: am I healthy? Am I exposed? Am I on track? A number without an interpretation is mental load — not insight.",
        tackle: 'Twelve vital signs and risks drawn as what they actually mean, guidance in human language — and every card explains itself with ⓘ.',
      },
      {
        eyebrow: 'Problem 4 of 4',
        icon: '🐫',
        title: "Wealth isn't just cash",
        body: 'Your land in Qassim, your camels, the household gold, a stake in a family venture — real value no banking app captures. Your "net worth" reads far smaller than the truth, and your decisions build on an incomplete picture.',
        tackle: 'Log every real asset at its value — land, livestock, gold — so your true net worth appears and every tool stands on it.',
      },
    ],
    tackleLabel: 'How we tackle it',
    ctaCreate: 'Create your free account ↓',
    ctaDemo: 'Walk through as a persona ↓',
    skip: 'skip ↓',
    chips: [
      'SAR 28,000 salary',
      'car loan… 42,000?',
      'Netflix · Spotify · iCloud…',
      'my land in Qassim = ?',
      'rent 6,500',
      'camels & gold… uncounted',
      'net worth = ??',
      'savings… somewhere',
    ],
    trust: [
      { icon: '🔒', text: 'Your data is yours — stored securely' },
      { icon: '🚫', text: 'Never sold, never used to train models' },
      { icon: '🇸🇦', text: 'Built for Saudi reality and regulation' },
    ],
  },
};

// Long enough to actually read and digest one problem before the next.
const ACT_MS = 8000;

export default function Splash() {
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const c = CONTENT[ar ? 'ar' : 'en'];
  const [act, setAct] = useState(0);

  // One timeout per act (not a global interval) so a manual jump gives that
  // problem its full reading time too.
  useEffect(() => {
    const t = setTimeout(() => setAct((x) => (x + 1) % 4), ACT_MS);
    return () => clearTimeout(t);
  }, [act]);

  const scrollToForm = () => document.getElementById('signup-form')?.scrollIntoView({ behavior: 'smooth' });
  const startDemo = () => document.getElementById('persona-picker')?.scrollIntoView({ behavior: 'smooth' });

  const a = c.acts[act];

  return (
    <section
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{ background: 'radial-gradient(120% 90% at 50% 0%, #0C4531 0%, #073626 45%, #041F17 100%)' }}
    >
      <style>{`
        @keyframes mmFloat { 0%,100% { transform: translateY(0) rotate(var(--rot,0deg)); } 50% { transform: translateY(-14px) rotate(var(--rot,0deg)); } }
        @keyframes mmDraw { from { stroke-dashoffset: 620; } to { stroke-dashoffset: 0; } }
        @keyframes mmPop { 0% { opacity: 0; transform: translateY(16px) scale(0.94); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes mmFade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes mmPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(93,202,165,0.35); } 50% { box-shadow: 0 0 0 12px rgba(93,202,165,0); } }
        @keyframes mmTwinkle { 0%,100% { opacity: 0.2; transform: scale(0.85); } 50% { opacity: 0.95; transform: scale(1); } }
        @keyframes mmAurora { 0%,100% { transform: translate3d(0,0,0) scale(1); } 33% { transform: translate3d(6%,-4%,0) scale(1.12); } 66% { transform: translate3d(-5%,3%,0) scale(0.94); } }
        @keyframes mmSheen { 0% { transform: translateX(-120%); } 100% { transform: translateX(120%); } }
        @keyframes mmGlow { 0%,100% { opacity: 0.55; } 50% { opacity: 1; } }
        @keyframes mmShimmer { 0% { background-position: 200% 50%; } 100% { background-position: -200% 50%; } }
        @keyframes fpDraw { from { stroke-dashoffset: 300; } to { stroke-dashoffset: 0; } }
        @keyframes fpGlowIn { 0% { opacity: 0.15; filter: grayscale(1); } 100% { opacity: 1; filter: grayscale(0); } }
        .mm-fade { animation: mmFade 0.7s ease both; }
        .mm-pop { animation: mmPop 0.6s ease both; }
        .mm-shimmer {
          background: linear-gradient(110deg, #FFFFFF 38%, #7FE8C4 50%, #FFFFFF 62%);
          background-size: 220% 100%;
          -webkit-background-clip: text; background-clip: text; color: transparent;
          animation: mmShimmer 7s linear infinite;
        }
      `}</style>

      {/* ambient aurora — slow-drifting light fields give the AI-grade atmosphere */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-40 -start-24 w-[560px] h-[560px] rounded-full blur-[110px] opacity-50"
          style={{ background: 'radial-gradient(circle, #17B8C9 0%, transparent 68%)', animation: 'mmAurora 20s ease-in-out infinite' }} />
        <div className="absolute top-[-6rem] end-[-8rem] w-[520px] h-[520px] rounded-full blur-[120px] opacity-40"
          style={{ background: 'radial-gradient(circle, #1D9E75 0%, transparent 66%)', animation: 'mmAurora 26s ease-in-out -6s infinite' }} />
        <div className="absolute bottom-[10%] start-[35%] w-[440px] h-[440px] rounded-full blur-[120px] opacity-25"
          style={{ background: 'radial-gradient(circle, #C9A84C 0%, transparent 70%)', animation: 'mmAurora 30s ease-in-out -12s infinite' }} />
      </div>

      {/* fine tech grid, radially masked so it fades into the dark */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden
        style={{
          backgroundImage: 'linear-gradient(rgba(93,202,165,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(93,202,165,0.06) 1px, transparent 1px)',
          backgroundSize: '46px 46px',
          maskImage: 'radial-gradient(120% 80% at 50% 12%, #000 0%, transparent 62%)',
          WebkitMaskImage: 'radial-gradient(120% 80% at 50% 12%, #000 0%, transparent 62%)',
        }} />

      {/* stars */}
      {STARS.map((s, i) => (
        <span key={i} className="absolute rounded-full bg-white pointer-events-none"
          style={{ left: s.x, top: s.y, width: s.r, height: s.r, boxShadow: '0 0 6px rgba(255,255,255,0.6)', animation: `mmTwinkle ${s.d}s ease-in-out ${s.delay}s infinite` }} />
      ))}

      {/* Riyadh skyline along the bottom */}
      <RiyadhSkyline />

      {/* wordmark + Saudi badge */}
      <div className="relative z-10 px-8 pt-8 flex items-center gap-3 flex-wrap">
        <span dir="ltr" className="font-serif text-2xl font-semibold text-white">Mal<span className="text-[#5DCAA5]">Mind</span></span>
        <SaudiBadge tag={c.tag} />
      </div>

      <div className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center gap-10 px-8 py-10 max-w-6xl mx-auto w-full">
        {/* copy */}
        <div className="flex-1 max-w-xl" key={`copy-${act}`}>
          <div className="mm-fade inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] uppercase text-[#C9A84C] bg-[#C9A84C]/10 border border-[#C9A84C]/30 rounded-full px-3 py-1 mb-4" style={{ animationDelay: '0.05s' }}>
            {a.eyebrow}
          </div>
          <h1 className="mm-fade font-serif text-3xl sm:text-4xl font-semibold leading-tight mb-4 pb-1 flex items-start gap-3" style={{ animationDelay: '0.15s' }}>
            <span className="text-3xl sm:text-4xl leading-none mt-1">{a.icon}</span>
            <span className="mm-shimmer">{a.title}</span>
          </h1>
          <p className="mm-fade text-sm sm:text-base text-white/65 leading-relaxed mb-5" style={{ animationDelay: '0.3s' }}>{a.body}</p>

          {/* how we tackle it */}
          <div className="mm-fade border-s-2 border-[#5DCAA5] ps-3.5 mb-7" style={{ animationDelay: '0.42s' }}>
            <div className="text-[10px] tracking-[0.12em] uppercase text-[#5DCAA5] mb-1">{c.tackleLabel}</div>
            <p className="text-sm text-[#BFF3DE] leading-relaxed">{a.tackle}</p>
          </div>

          <div className="mm-fade flex flex-wrap items-center gap-3" style={{ animationDelay: '0.55s' }}>
            <button
              onClick={scrollToForm}
              className="group relative overflow-hidden text-sm font-semibold text-white rounded-xl px-6 py-3 transition-transform hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(120deg, #1D9E75 0%, #17B8C9 100%)', boxShadow: '0 12px 34px -8px rgba(23,184,201,0.55)', animation: 'mmPulse 2.6s ease-in-out infinite' }}
            >
              <span className="relative z-10">{c.ctaCreate}</span>
              <span className="absolute inset-y-0 -inset-x-2 w-1/3 skew-x-[-20deg] bg-white/25 blur-md pointer-events-none"
                style={{ animation: 'mmSheen 3.4s ease-in-out 1.2s infinite' }} />
            </button>
            <button
              onClick={startDemo}
              className="text-sm font-medium text-[#5DCAA5] rounded-xl px-6 py-3 transition-all hover:-translate-y-0.5 bg-white/[0.04] border border-[#5DCAA5]/35 hover:border-[#5DCAA5] hover:bg-white/[0.07] backdrop-blur-sm"
            >
              {c.ctaDemo}
            </button>
          </div>

          {/* trust chips — quiet credibility, always visible */}
          <div className="mm-fade flex flex-wrap gap-2 mt-6" style={{ animationDelay: '0.6s' }}>
            {c.trust.map((tr) => (
              <span key={tr.text} className="inline-flex items-center gap-1.5 text-[11px] text-white/60 bg-white/[0.05] border border-white/10 rounded-full px-3 py-1.5 backdrop-blur-sm">
                <span className="text-xs leading-none">{tr.icon}</span> {tr.text}
              </span>
            ))}
          </div>
        </div>

        {/* animated scene — one per problem */}
        <div className="flex-1 max-w-md w-full h-[300px] sm:h-[340px] relative" key={`scene-${act}`}>
          {act === 0 && <SceneChaos chips={c.chips} />}
          {act === 1 && <div className="absolute inset-0"><SceneFutures ar={ar} /></div>}
          {act === 2 && <div className="absolute inset-0"><SceneVitals ar={ar} /></div>}
          {act === 3 && <div className="absolute inset-0"><SceneHiddenWealth ar={ar} /></div>}
        </div>
      </div>

      {/* act dots */}
      <div className="relative z-10 flex items-center justify-center gap-2.5 pb-8">
        {c.acts.map((_, i) => (
          <button key={i} onClick={() => setAct(i)} aria-label={`${i + 1}`}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{ width: i === act ? 28 : 10, background: i === act ? '#5DCAA5' : 'rgba(255,255,255,0.25)' }} />
        ))}
        <button onClick={scrollToForm} className="ms-4 text-[11px] text-white/40 hover:text-white/70">{c.skip}</button>
      </div>
    </section>
  );
}

const STARS = [
  { x: '12%', y: '10%', r: 2, d: 3.5, delay: 0 }, { x: '28%', y: '18%', r: 1.5, d: 4, delay: 0.6 },
  { x: '44%', y: '8%', r: 2, d: 3, delay: 1.2 }, { x: '62%', y: '15%', r: 1.5, d: 4.5, delay: 0.3 },
  { x: '78%', y: '9%', r: 2, d: 3.2, delay: 0.9 }, { x: '88%', y: '22%', r: 1.5, d: 4, delay: 1.5 },
  { x: '20%', y: '30%', r: 1.5, d: 3.8, delay: 0.4 }, { x: '70%', y: '28%', r: 1.5, d: 3.4, delay: 1.1 },
];

// The Saudi national emblem — a palm above two crossed swords — beside the tag.
function SaudiEmblem({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 52" className={className} fill="none" aria-hidden="true">
      <g stroke="#C9A84C" strokeWidth="2.4" strokeLinecap="round">
        {/* crossed swords */}
        <line x1="9" y1="48" x2="34" y2="20" />
        <line x1="39" y1="48" x2="14" y2="20" />
        {/* hilts */}
        <line x1="6" y1="45" x2="13" y2="50" />
        <line x1="42" y1="45" x2="35" y2="50" />
      </g>
      <g stroke="#C9A84C" strokeWidth="2.2" strokeLinecap="round" fill="none">
        {/* palm trunk */}
        <line x1="24" y1="22" x2="24" y2="10" />
        {/* palm fronds */}
        <path d="M24,10 C18,10 13,12 10,16" />
        <path d="M24,10 C30,10 35,12 38,16" />
        <path d="M24,9 C20,7 15,7 11,9" />
        <path d="M24,9 C28,7 33,7 37,9" />
        <path d="M24,8 V3" />
      </g>
    </svg>
  );
}

function SaudiBadge({ tag }: { tag: string }) {
  return (
    <div className="inline-flex items-center gap-2 bg-white/[0.06] border border-[#C9A84C]/30 rounded-full ps-2.5 pe-3 py-1">
      <SaudiEmblem className="w-4 h-5" />
      <span className="text-[11px] font-medium text-[#E4C465]">{tag}</span>
      <span className="text-xs leading-none">🇸🇦</span>
    </div>
  );
}

// A refined, multi-layer Riyadh skyline. A distant haze layer sets depth; the
// near layer carries the real landmarks — the Kingdom Tower's sky-bridge arch,
// Al Faisaliah's golden orb and spire, the twisting KAFD/PIF towers and Burj
// Rafal — with soft gradient fills, a horizon glow, and scattered window
// lights so the city reads as alive and modern rather than a flat cut-out.
function RiyadhSkyline() {
  // Deterministic little window lights sprinkled over the near towers.
  const windows = [
    [366, 150, 'g'], [366, 170, 't'],                                   // Al Faisaliah
    [452, 100, 't'], [452, 140, 'g'], [500, 110, 't'], [500, 150, 'g'], [470, 182, 't'], // Kingdom
    [560, 140, 'g'], [606, 152, 't'],                                   // KAFD twist
    [670, 150, 'g'], [670, 180, 't'],                                   // Burj Rafal
    [878, 172, 't'], [878, 202, 'g'], [944, 162, 't'], [1010, 200, 'g'], [1116, 190, 't'],
    [128, 222, 'g'], [250, 202, 't'], [820, 160, 'g'], [1160, 172, 't'],
  ] as const;

  return (
    <div className="absolute inset-x-0 bottom-0 h-[42vh] min-h-[280px] z-0 pointer-events-none" dir="ltr">
      {/* horizon glow lifting the city off the dark */}
      <div className="absolute inset-x-0 bottom-0 h-2/3"
        style={{ background: 'radial-gradient(120% 130% at 50% 100%, rgba(23,184,201,0.20) 0%, rgba(29,158,117,0.10) 34%, transparent 68%)' }} />

      <svg viewBox="0 0 1200 300" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id="mmFar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0B4832" />
            <stop offset="100%" stopColor="#062B20" />
          </linearGradient>
          <linearGradient id="mmNear" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0E5A3E" />
            <stop offset="55%" stopColor="#083A2A" />
            <stop offset="100%" stopColor="#04211A" />
          </linearGradient>
          <radialGradient id="mmOrb" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#FBE9B0" />
            <stop offset="45%" stopColor="#E4C465" />
            <stop offset="100%" stopColor="#B98B2C" />
          </radialGradient>
          <filter id="mmSoft" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>

        {/* ── far haze layer ── */}
        <g fill="url(#mmFar)" opacity="0.5">
          <rect x="-20" y="176" width="60" height="124" />
          <rect x="96" y="150" width="42" height="150" />
          <path d="M300,300 322,150 332,150 354,300Z" />
          <rect x="430" y="160" width="52" height="140" />
          <rect x="540" y="140" width="40" height="160" />
          <rect x="654" y="168" width="48" height="132" />
          <rect x="792" y="150" width="44" height="150" />
          <rect x="910" y="176" width="40" height="124" />
          <rect x="1030" y="150" width="56" height="150" />
          <rect x="1150" y="170" width="70" height="130" />
        </g>

        {/* ── near landmark layer — the three signatures sit near centre so
             they never crop; generic modern towers flank them ── */}
        <g fill="url(#mmNear)">
          {/* left generic cluster */}
          <rect x="10" y="184" width="36" height="116" rx="2" />
          <path d="M64,300 68,150 96,142 100,300Z" />
          <rect x="122" y="196" width="30" height="104" rx="2" />
          <path d="M172,300 188,150 208,142 224,300Z" />
          <rect x="246" y="172" width="30" height="128" rx="2" />

          {/* Al Faisaliah — four-sided tapering tower + spire (orb drawn above) */}
          <path d="M330,300 352,114 366,114 388,300Z" />
          <rect x="354" y="68" width="10" height="30" />

          {/* mid block */}
          <rect x="408" y="200" width="24" height="100" rx="2" />

          {/* Kingdom Tower (Burj Al-Mamlaka) — the parabolic sky-bridge opening */}
          <path d="M440,300 L440,74 Q440,62 452,62 L512,62 Q524,62 524,74 L524,300 L498,300 L498,138 Q491,156 476,156 Q468,156 464,148 L464,300 Z" />
          <rect x="464" y="124" width="60" height="7" rx="3" fill="#0E5A3E" />

          {/* KAFD twisting towers (parallelogram slices for the twist illusion) */}
          <path d="M548,300 552,100 580,92 584,300Z" />
          <path d="M552,100 580,92 578,108 554,116Z" fill="#0A4632" />
          <path d="M596,300 598,124 622,116 624,300Z" />

          {/* Burj Rafal-style crowned tower */}
          <path d="M648,300 658,120 664,96 684,96 690,120 700,300Z" />
          <path d="M668,96 674,80 680,96Z" />

          {/* wide podium block */}
          <rect x="722" y="186" width="50" height="114" rx="2" />

          {/* right generic cluster */}
          <path d="M792,300 808,128 826,120 842,300Z" />
          <rect x="864" y="152" width="42" height="148" rx="2" />
          <path d="M926,300 942,132 960,132 976,300Z" />
          <rect x="996" y="176" width="34" height="124" rx="2" />
          <path d="M1046,300 1050,146 1076,138 1080,300Z" />
          <rect x="1102" y="164" width="36" height="136" rx="2" />
          <path d="M1152,300 1168,146 1190,146 1206,300Z" />
        </g>

        {/* edge rim-light along the near towers' tops (subtle teal catch-light) */}
        <g stroke="#5DCAA5" strokeWidth="1.5" strokeOpacity="0.35" fill="none" strokeLinecap="round">
          <path d="M352,114 366,114" />
          <path d="M440,74 Q440,62 452,62 L512,62 Q524,62 524,74" />
          <path d="M658,120 664,96 684,96 690,120" />
          <path d="M808,128 826,120" />
        </g>

        {/* Al Faisaliah golden orb — a glowing beacon (the tower's signature) */}
        <circle cx="359" cy="60" r="26" fill="url(#mmOrb)" filter="url(#mmSoft)" opacity="0.7" style={{ animation: 'mmGlow 4s ease-in-out infinite' }} />
        <circle cx="359" cy="60" r="10.5" fill="url(#mmOrb)" />
        <circle cx="359" cy="60" r="10.5" fill="none" stroke="#FBE9B0" strokeWidth="1" strokeOpacity="0.7" />
        <circle cx="355.5" cy="56.5" r="3" fill="#FFF7E0" opacity="0.95" />

        {/* window lights */}
        {windows.map(([x, y, kind], i) => (
          <rect key={i} x={x} y={y} width="3.4" height="3.4" rx="0.6"
            fill={kind === 'g' ? '#E4C465' : '#5DCAA5'}
            opacity={0.5 + (i % 3) * 0.18}
            style={{ animation: `mmTwinkle ${3 + (i % 4)}s ease-in-out ${(i % 5) * 0.4}s infinite` }} />
        ))}
      </svg>
    </div>
  );
}

// Act 1: scattered money-life fragments drifting in the dark.
function SceneChaos({ chips }: { chips: string[] }) {
  const pos = [
    { x: '4%', y: '10%', rot: '-6deg', delay: '0s' },
    { x: '52%', y: '3%', rot: '4deg', delay: '0.4s' },
    { x: '6%', y: '40%', rot: '3deg', delay: '0.8s' },
    { x: '58%', y: '32%', rot: '-3deg', delay: '0.2s' },
    { x: '30%', y: '54%', rot: '5deg', delay: '0.6s' },
    { x: '54%', y: '62%', rot: '-5deg', delay: '1s' },
    { x: '2%', y: '72%', rot: '2deg', delay: '1.2s' },
    { x: '34%', y: '86%', rot: '-4deg', delay: '1.4s' },
  ];
  return (
    <div className="absolute inset-0" dir="rtl">
      {chips.map((text, i) => (
        <div
          key={text}
          className="mm-pop absolute text-[11px] sm:text-xs text-white/75 bg-white/[0.06] border border-white/15 rounded-full px-3.5 py-2 backdrop-blur-sm whitespace-nowrap"
          style={{ insetInlineStart: pos[i].x, top: pos[i].y, ['--rot' as string]: pos[i].rot, animation: `mmPop 0.6s ease ${pos[i].delay} both, mmFloat 4.5s ease-in-out ${pos[i].delay} infinite` }}
        >
          {text}
        </div>
      ))}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-serif text-5xl text-white/10 select-none">؟</span>
      </div>
    </div>
  );
}

// Acts 2–4 render the shared problem scenes from ./ProblemScenes.
