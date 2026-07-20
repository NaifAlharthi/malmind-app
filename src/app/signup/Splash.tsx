'use client';

// The landing splash — Saudi-first and Arabic by default. A self-running,
// three-act animated story (the problem → one living picture → the toolkit)
// set against a Saudi-green night sky with the Riyadh skyline and the national
// emblem, before inviting the visitor to sign up or drop into the live demo.
// Bilingual (flips with the language toggle); pure CSS/SVG, no assets.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { enterDemo } from '@/lib/demoSupabase';
import { useLocale } from '@/lib/i18n/LocaleProvider';

interface Act { eyebrow: string; title: string; body: string }
interface Content {
  tag: string;
  acts: Act[];
  ctaCreate: string;
  ctaDemo: string;
  skip: string;
  sceneNetWorth: string;
  stats: [string, string][];
  chips: string[];
  tools: { icon: string; name: string; desc: string }[];
}

const CONTENT: Record<'ar' | 'en', Content> = {
  ar: {
    tag: 'صُنع للسعودية',
    acts: [
      {
        eyebrow: 'المشكلة',
        title: 'دخلك جيّد… فلماذا الصورة ضبابية؟',
        body: 'الراتب في تطبيق، والقروض في آخر، والاشتراكات في كل مكان، وصافي ثروتك… في مكانٍ ما. أغلبنا لا يستطيع الإجابة عن أبسط سؤال عن أمواله: هل أتقدّم فعلاً؟',
      },
      {
        eyebrow: 'الحل',
        title: 'مَالمايند تحوّل أموالك إلى صورةٍ واحدة حيّة.',
        body: 'سجّل أرقامك مرّة — أو زامِن جدولاً — ويحتسب كل شيء نفسه: صافي الثروة عبر الزمن، والنِّسب الصحية، والمخاطر، وعالمٌ ثلاثي الأبعاد تقف فيه حياتك المالية أمامك.',
      },
      {
        eyebrow: 'الأدوات',
        title: 'اِرَها. ناقِشها. صمّمها.',
        body: 'مجموعة أدوات ومستشارٌ ذكي يعرف قصتك كاملة — من كل ما كسبته في حياتك، إلى متى تتضاعف محفظتك، إلى ماذا يحدث لو اشتريت الفيلا عام 2028.',
      },
    ],
    ctaCreate: 'أنشئ حسابك المجاني ↓',
    ctaDemo: 'شاهده يعمل — تجربة فورية',
    skip: 'تخطٍّ ↓',
    sceneNetWorth: 'صافي الثروة — يُحتسب مباشرة',
    stats: [['صافي الثروة', '1.0M ريال'], ['مدى الأمان', '7.8 أشهر'], ['معدل الادخار', '34%']],
    chips: [
      'راتب 28,000 ريال',
      'قرض السيارة… 42,000؟',
      'نتفلكس · سبوتيفاي · آيكلاود…',
      'صافي الثروة = ؟؟',
      'الإيجار 6,500',
      'تداول +8%؟',
      'المدخرات… في مكانٍ ما',
    ],
    tools: [
      { icon: '🧍', name: 'حياتك بالأبعاد الثلاثة', desc: 'شخصيتك على خط زمنك، وأصولك واقفةٌ بجانبك' },
      { icon: '🩺', name: '12 نسبة صحية', desc: 'مدى الأمان، معدل الادخار، الدين — كلٌّ مرسومٌ كما يعنيه' },
      { icon: '🔮', name: 'ماذا لو', desc: 'جرّب الفيلا، الترقية، انقطاعاً مهنياً — قبل أن تقرّر' },
      { icon: '💬', name: 'مستشار ذكي', desc: 'يعرف قصتك كاملة، ويستشهد بأرقامك الحقيقية' },
    ],
  },
  en: {
    tag: 'Made for Saudi Arabia',
    acts: [
      {
        eyebrow: 'The problem',
        title: 'You earn well. So why is the picture blurry?',
        body: "Salary in one app, loans in another, subscriptions everywhere, net worth… somewhere. Most of us can't answer the simplest question about our own money: am I actually getting ahead?",
      },
      {
        eyebrow: 'The answer',
        title: 'MalMind turns your money into one living picture.',
        body: 'Log your numbers once — or sync a spreadsheet — and everything computes itself: net worth over time, health ratios, risks, and a 3D world where your financial life literally stands in front of you.',
      },
      {
        eyebrow: 'The toolkit',
        title: 'See it. Question it. Design it.',
        body: "A toolkit and an AI advisor that knows your whole story — from what you've earned in your lifetime, to when your portfolio doubles, to what happens if you buy the villa in 2028.",
      },
    ],
    ctaCreate: 'Create your free account ↓',
    ctaDemo: 'Watch it work — instant demo',
    skip: 'skip ↓',
    sceneNetWorth: 'Net worth — computed live',
    stats: [['Net worth', 'SAR 1.0M'], ['Runway', '7.8 months'], ['Savings rate', '34%']],
    chips: [
      'SAR 28,000 salary',
      'car loan… 42,000?',
      'Netflix · Spotify · iCloud…',
      'net worth = ??',
      'rent 6,500',
      'Tadawul +8%?',
      'savings… somewhere',
    ],
    tools: [
      { icon: '🧍', name: 'Your life, in 3D', desc: 'an avatar on your timeline, assets standing beside you' },
      { icon: '🩺', name: '12 health ratios', desc: 'runway, savings rate, debt — each drawn as what it means' },
      { icon: '🔮', name: 'What if', desc: 'model the villa, the raise, the career break — before deciding' },
      { icon: '💬', name: 'AI advisor', desc: 'knows your whole story, cites your actual numbers' },
    ],
  },
};

const ACT_MS = 5200;

export default function Splash() {
  const router = useRouter();
  const { locale } = useLocale();
  const c = CONTENT[locale === 'ar' ? 'ar' : 'en'];
  const [act, setAct] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setAct((x) => (x + 1) % 3), ACT_MS);
    return () => clearInterval(t);
  }, []);

  const scrollToForm = () => document.getElementById('signup-form')?.scrollIntoView({ behavior: 'smooth' });
  const startDemo = () => { enterDemo(); router.push('/home'); };

  const a = c.acts[act];

  return (
    <section
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(150deg, #0A3B29 0%, #06301F 52%, #04231A 100%)' }}
    >
      <style>{`
        @keyframes mmFloat { 0%,100% { transform: translateY(0) rotate(var(--rot,0deg)); } 50% { transform: translateY(-14px) rotate(var(--rot,0deg)); } }
        @keyframes mmDraw { from { stroke-dashoffset: 620; } to { stroke-dashoffset: 0; } }
        @keyframes mmPop { 0% { opacity: 0; transform: translateY(16px) scale(0.94); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes mmFade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes mmPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(93,202,165,0.35); } 50% { box-shadow: 0 0 0 12px rgba(93,202,165,0); } }
        @keyframes mmTwinkle { 0%,100% { opacity: 0.25; } 50% { opacity: 0.9; } }
        .mm-fade { animation: mmFade 0.7s ease both; }
        .mm-pop { animation: mmPop 0.6s ease both; }
      `}</style>

      {/* stars + decorative rings */}
      {STARS.map((s, i) => (
        <span key={i} className="absolute rounded-full bg-white pointer-events-none"
          style={{ left: s.x, top: s.y, width: s.r, height: s.r, animation: `mmTwinkle ${s.d}s ease-in-out ${s.delay}s infinite` }} />
      ))}
      <div className="absolute -top-32 end-[-8rem] w-[420px] h-[420px] rounded-full border border-[#C9A84C]/15 pointer-events-none" />

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
          <div className="mm-fade text-[11px] tracking-[0.18em] uppercase text-[#C9A84C] mb-3" style={{ animationDelay: '0.05s' }}>{a.eyebrow}</div>
          <h1 className="mm-fade font-serif text-3xl sm:text-4xl font-semibold text-white leading-tight mb-4" style={{ animationDelay: '0.15s' }}>{a.title}</h1>
          <p className="mm-fade text-sm sm:text-base text-white/65 leading-relaxed mb-8" style={{ animationDelay: '0.3s' }}>{a.body}</p>

          <div className="mm-fade flex flex-wrap items-center gap-3" style={{ animationDelay: '0.45s' }}>
            <button
              onClick={scrollToForm}
              className="text-sm font-semibold bg-[#1D9E75] hover:bg-[#178a65] text-white rounded-xl px-6 py-3 transition-colors"
              style={{ animation: 'mmPulse 2.6s ease-in-out infinite' }}
            >
              {c.ctaCreate}
            </button>
            <button
              onClick={startDemo}
              className="text-sm font-medium text-[#5DCAA5] border border-[#5DCAA5]/40 hover:border-[#5DCAA5] rounded-xl px-6 py-3 transition-colors"
            >
              {c.ctaDemo}
            </button>
          </div>
        </div>

        {/* animated scene */}
        <div className="flex-1 max-w-md w-full h-[300px] sm:h-[340px] relative" key={`scene-${act}`}>
          {act === 0 && <SceneChaos chips={c.chips} />}
          {act === 1 && <ScenePicture label={c.sceneNetWorth} stats={c.stats} />}
          {act === 2 && <SceneToolkit tools={c.tools} />}
        </div>
      </div>

      {/* act dots */}
      <div className="relative z-10 flex items-center justify-center gap-2.5 pb-8">
        {[0, 1, 2].map((i) => (
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

// A stylised Riyadh skyline — Al Faisaliah (ball) and Kingdom Tower (top arch)
// among the towers — as a low silhouette behind the content.
function RiyadhSkyline() {
  return (
    <div className="absolute inset-x-0 bottom-0 h-56 z-0 pointer-events-none opacity-60" dir="ltr">
      <svg viewBox="0 0 1200 240" preserveAspectRatio="xMidYMax slice" className="w-full h-full">
        <defs>
          <linearGradient id="mmSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0E5238" />
            <stop offset="100%" stopColor="#052018" />
          </linearGradient>
        </defs>
        <g fill="url(#mmSky)">
          {/* left cluster */}
          <rect x="20" y="150" width="46" height="90" />
          <rect x="74" y="118" width="34" height="122" />
          <rect x="120" y="168" width="40" height="72" />
          {/* Al Faisaliah — tapering tower with a ball */}
          <polygon points="182,240 214,86 224,86 256,240" />
          <circle cx="219" cy="80" r="11" />
          <polygon points="214,72 219,44 224,72" />
          <rect x="272" y="140" width="40" height="100" />
          <rect x="320" y="176" width="30" height="64" />
          {/* Kingdom Tower — the sky-bridge arch */}
          <path d="M372,240 L372,64 L410,64 Q432,104 454,64 L492,64 L492,240 Z" />
          <rect x="508" y="150" width="42" height="90" />
          <rect x="558" y="122" width="30" height="118" />
          {/* PIF-ish twins */}
          <rect x="600" y="96" width="34" height="144" />
          <rect x="642" y="112" width="30" height="128" />
          <rect x="686" y="160" width="44" height="80" />
          <rect x="740" y="132" width="30" height="108" />
          <polygon points="784,240 806,110 812,110 834,240" />
          <rect x="850" y="156" width="40" height="84" />
          <rect x="900" y="120" width="34" height="120" />
          <rect x="946" y="170" width="36" height="70" />
          <rect x="992" y="140" width="30" height="100" />
          <rect x="1032" y="168" width="44" height="72" />
          <rect x="1086" y="128" width="30" height="112" />
          <rect x="1128" y="158" width="48" height="82" />
        </g>
      </svg>
    </div>
  );
}

// Act 1: scattered money-life fragments drifting in the dark.
function SceneChaos({ chips }: { chips: string[] }) {
  const pos = [
    { x: '4%', y: '12%', rot: '-6deg', delay: '0s' },
    { x: '48%', y: '4%', rot: '4deg', delay: '0.4s' },
    { x: '8%', y: '46%', rot: '3deg', delay: '0.8s' },
    { x: '56%', y: '38%', rot: '-3deg', delay: '0.2s' },
    { x: '30%', y: '70%', rot: '5deg', delay: '0.6s' },
    { x: '62%', y: '66%', rot: '-5deg', delay: '1s' },
    { x: '4%', y: '84%', rot: '2deg', delay: '1.2s' },
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

// Act 2: the net-worth line draws itself over a settling grid of tiles.
function ScenePicture({ label, stats }: { label: string; stats: [string, string][] }) {
  return (
    <div className="absolute inset-0 flex flex-col justify-center">
      <div className="bg-white/[0.05] border border-white/15 rounded-2xl p-5 backdrop-blur-sm">
        <div className="text-[10px] tracking-[0.12em] uppercase text-[#C9A84C] mb-3">{label}</div>
        <svg viewBox="0 0 360 140" className="w-full h-32">
          {[0, 35, 70, 105, 140].map((y) => (
            <line key={y} x1="0" y1={y} x2="360" y2={y} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
          ))}
          <path
            d="M4,128 C60,120 80,112 120,98 C160,84 180,80 220,60 C260,40 300,30 356,10"
            fill="none" stroke="#5DCAA5" strokeWidth="3" strokeLinecap="round"
            strokeDasharray="620" style={{ animation: 'mmDraw 2.4s ease-out 0.2s both' }}
          />
          <circle cx="356" cy="10" r="4" fill="#5DCAA5" style={{ animation: 'mmPop 0.4s ease 2.4s both' }} />
        </svg>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {stats.map(([k, v], i) => (
            <div key={k} className="mm-pop bg-white/[0.06] border border-white/10 rounded-lg p-2.5" style={{ animationDelay: `${0.8 + i * 0.3}s` }}>
              <div className="text-[9px] text-white/45">{k}</div>
              <div className="text-sm font-serif font-bold text-white">{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Act 3: the toolkit cards pop in.
function SceneToolkit({ tools }: { tools: { icon: string; name: string; desc: string }[] }) {
  return (
    <div className="absolute inset-0 flex flex-col justify-center gap-2.5">
      {tools.map((tool, i) => (
        <div key={tool.name} className="mm-pop flex items-center gap-3 bg-white/[0.06] border border-white/12 rounded-xl px-4 py-3 backdrop-blur-sm" style={{ animationDelay: `${i * 0.25}s` }}>
          <span className="text-xl">{tool.icon}</span>
          <div>
            <div className="text-sm font-semibold text-white">{tool.name}</div>
            <div className="text-[11px] text-white/55">{tool.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
