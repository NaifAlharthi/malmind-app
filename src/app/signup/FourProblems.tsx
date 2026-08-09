'use client';

// The four problems, cinematically — each one gets its own act on the
// landing page: the issue stated properly, exactly how MalMind tackles it,
// and the tools built for it, with a living mini-scene per problem. Acts
// auto-advance with a segmented progress bar; visitors can jump, or drop
// into the persona walkthrough to feel any of them on real-shaped data.

import { useEffect, useState } from 'react';
import { useLocale } from '@/lib/i18n/LocaleProvider';

const ACT_MS = 7500;

interface Act {
  icon: string;
  title: [string, string];
  desc: [string, string];
  answer: [string, string];
  tools: { icon: string; name: [string, string] }[];
}

const ACTS: Act[] = [
  {
    icon: '🧩',
    title: ['مبعثرة في كل مكان', 'Scattered everywhere'],
    desc: [
      'راتبك في تطبيق البنك، وأسهمك عند الوسيط، وقروضك في تطبيق ثالث، واشتراكاتك تُخصم بصمت. لا أحد — ولا شيء — يريك الصورة كاملة، فتعيش حياتك المالية مشاهد متفرقة بلا فيلم.',
      'Your salary in the bank app, stocks at a broker, loans in a third app, subscriptions quietly draining. Nothing — and no one — shows the whole picture, so you live your financial life as scattered scenes with no film.',
    ],
    answer: [
      'مال مايند يجمعها في سِجلّ واحد مترابط: خمس دقائق شهرياً، وكل أداة في المنتج تُحسب من الصورة نفسها.',
      'MalMind pulls it into one connected ledger: five minutes a month, and every tool computes from the same picture.',
    ],
    tools: [
      { icon: '📒', name: ['أرقامي المالية', 'My Financial Numbers'] },
      { icon: '💼', name: ['الأصول', 'Assets'] },
      { icon: '🧾', name: ['الالتزامات', 'Commitments'] },
    ],
  },
  {
    icon: '🧮',
    title: ['أرصدة، لا قرارات', 'Balances, not decisions'],
    desc: [
      'تطبيقات البنوك تريك ما تملكه اليوم — لكنها تصمت تماماً حين تسأل: ماذا لو اشتريت الفيلا؟ ماذا تفعل العلاوة بمستقبلي؟ متى أبلغ حرّيتي المالية؟ الرصيد رقمٌ؛ والقرار يحتاج نموذجاً.',
      "Bank apps show what you have today — then go silent when you ask: what if I buy the villa? What does the raise do to my future? When do I reach freedom? A balance is a number; a decision needs a model.",
    ],
    answer: [
      'طبقة نمذجة وسيناريوهات تلعب بها: جرّب القرار بالأرقام قبل أن تعيشه بالسنوات.',
      'A modeling & scenario layer you can play with: live the decision in numbers before you live it in years.',
    ],
    tools: [
      { icon: '⚖️', name: ['قارن وقرّر', 'Compare & Decide'] },
      { icon: '🔮', name: ['ماذا لو', 'What-If'] },
      { icon: '⏱', name: ['سرعة المال', 'Velocity'] },
      { icon: '📈', name: ['مسار المضاعفة', 'Doubling Path'] },
    ],
  },
  {
    icon: '🔢',
    title: ['أرقام بلا معنى', 'Numbers without meaning'],
    desc: [
      'تتراكم الأرقام على الشاشات دون أن تجيب عن السؤال الوحيد المهم: هل أنا بخير؟ هل أنا مكشوف؟ هل أنا على المسار؟ رقمٌ بلا تفسير عبءٌ ذهني — لا بصيرة.',
      "Figures pile up on screens without answering the only question that matters: am I healthy? Am I exposed? Am I on track? A number without an interpretation is mental load — not insight.",
    ],
    answer: [
      'قراءات صحية ومخاطر مرسومة كما تعنيه، وإرشاد بلغة البشر — وكل بطاقة تشرح نفسها بزر ⓘ.',
      'Health readings and risks drawn as what they mean, guidance in human language — and every card explains itself with ⓘ.',
    ],
    tools: [
      { icon: '🩺', name: ['النسب', 'Ratios'] },
      { icon: '🛡', name: ['المخاطر', 'Risks'] },
      { icon: '📇', name: ['الوضع الائتماني', 'Credit'] },
    ],
  },
  {
    icon: '🐫',
    title: ['ثروتك ليست نقداً فقط', "Wealth isn't just cash"],
    desc: [
      'أرضك في القصيم، وإبلك، وذهب البيت، وحصتك في مشروع عائلي — قيمة حقيقية لا يلتقطها أي تطبيق بنكي، فيظهر «صافي ثروتك» أصغر بكثير من حقيقته، وتُبنى قراراتك على صورة ناقصة.',
      'Your land in Qassim, your camels, the household gold, a stake in a family venture — real value no banking app captures. Your "net worth" reads far smaller than the truth, and your decisions build on an incomplete picture.',
    ],
    answer: [
      'سجّل كل أصل حقيقي بقيمته — أرضاً كان أم ماشية أم ذهباً — ليظهر صافي ثروتك الحقيقي وتقف كل أداة عليه.',
      'Log every real asset at its value — land, livestock, gold — so your true net worth appears and every tool stands on it.',
    ],
    tools: [
      { icon: '💼', name: ['الأصول', 'Assets'] },
      { icon: '📒', name: ['أرقامي المالية', 'My Financial Numbers'] },
    ],
  },
];

export default function FourProblems() {
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const pick = (pair: [string, string]) => (ar ? pair[0] : pair[1]);
  const [act, setAct] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setAct((x) => (x + 1) % ACTS.length), ACT_MS);
    return () => clearInterval(t);
  }, [act]); // resetting on manual jump restarts the timer

  const a = ACTS[act];
  const tryIt = () => document.getElementById('persona-picker')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <section className="relative overflow-hidden px-6 py-16 sm:py-20" style={{ background: 'radial-gradient(120% 90% at 50% 0%, #0A3A29 0%, #062B1F 55%, #041F17 100%)' }}>
      <style>{`
        @keyframes fpFade { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fpFill { from { width: 0%; } to { width: 100%; } }
        @keyframes fpFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes fpDraw { from { stroke-dashoffset: 300; } to { stroke-dashoffset: 0; } }
        @keyframes fpGlowIn { 0% { opacity: 0.15; filter: grayscale(1); } 100% { opacity: 1; filter: grayscale(0); } }
        .fp-fade { animation: fpFade 0.65s ease both; }
      `}</style>

      <div className="relative max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <div className="text-[11px] tracking-[0.16em] uppercase text-[#C9A84C] font-semibold mb-2">{L('لماذا وُجد مال مايند', 'Why MalMind exists')}</div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">{L('أربع مشكلات في المال الشخصي — وكيف نعالجها', 'Four problems in personal finance — and how we tackle them')}</h2>
        </div>

        {/* segmented cinematic progress */}
        <div className="flex gap-2 max-w-md mx-auto mb-10">
          {ACTS.map((x, i) => (
            <button key={i} onClick={() => setAct(i)} aria-label={`${i + 1}`} className="flex-1 h-1.5 rounded-full bg-white/15 overflow-hidden">
              <span className="block h-full rounded-full bg-[#5DCAA5]"
                style={i === act ? { animation: `fpFill ${ACT_MS}ms linear both` } : { width: i < act ? '100%' : '0%' }} />
            </button>
          ))}
        </div>

        <div key={act} className="grid md:grid-cols-2 gap-10 items-center min-h-[300px]">
          {/* the act's copy */}
          <div>
            <div className="fp-fade inline-flex items-center gap-2 text-[11px] font-semibold text-[#C9A84C] bg-[#C9A84C]/10 border border-[#C9A84C]/30 rounded-full px-3 py-1 mb-4">
              {L(`المشكلة ${act + 1} من 4`, `Problem ${act + 1} of 4`)}
            </div>
            <div className="fp-fade flex items-center gap-3 mb-3" style={{ animationDelay: '0.08s' }}>
              <span className="text-4xl">{a.icon}</span>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-white leading-tight">{pick(a.title)}</h3>
            </div>
            <p className="fp-fade text-sm text-white/65 leading-relaxed mb-5" style={{ animationDelay: '0.16s' }}>{pick(a.desc)}</p>
            <div className="fp-fade border-s-2 border-[#5DCAA5] ps-3.5 mb-5" style={{ animationDelay: '0.26s' }}>
              <div className="text-[10px] tracking-[0.12em] uppercase text-[#5DCAA5] mb-1">{L('كيف نعالجها', 'How we tackle it')}</div>
              <p className="text-sm text-[#BFF3DE] leading-relaxed">{pick(a.answer)}</p>
            </div>
            <div className="fp-fade flex items-center gap-2 flex-wrap" style={{ animationDelay: '0.36s' }}>
              <span className="text-[10px] text-white/40 uppercase tracking-[0.1em]">{L('أدواتها:', 'Its tools:')}</span>
              {a.tools.map((tl) => (
                <button key={tl.icon + tl.name[1]} onClick={tryIt}
                  className="text-[11px] text-white/85 bg-white/[0.07] border border-white/15 rounded-full px-3 py-1.5 hover:border-[#5DCAA5] hover:text-white transition-colors">
                  {tl.icon} {pick(tl.name)}
                </button>
              ))}
              <button onClick={tryIt} className="text-[11px] text-[#5DCAA5] font-semibold hover:underline ms-1">
                {L('جرّبها حيّة في الجولة ↓', 'Feel it live in the tour ↓')}
              </button>
            </div>
          </div>

          {/* the act's scene */}
          <div className="fp-fade hidden md:block" style={{ animationDelay: '0.2s' }} dir="ltr">
            {act === 0 && <SceneScattered ar={ar} />}
            {act === 1 && <SceneFutures ar={ar} />}
            {act === 2 && <SceneVitals ar={ar} />}
            {act === 3 && <SceneHiddenWealth ar={ar} />}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Scenes ──────────────────────────────────────────────────────────────
function SceneScattered({ ar }: { ar: boolean }) {
  const chips = ar
    ? ['راتب 28,000', 'تداول +8%؟', 'قرض السيارة… 42,000؟', 'نتفلكس · آيكلاود…', 'أرضي = ؟', 'صافي الثروة = ؟؟']
    : ['SAR 28,000 salary', 'Tadawul +8%?', 'car loan… 42,000?', 'Netflix · iCloud…', 'my land = ?', 'net worth = ??'];
  const pos = [['6%', '8%'], ['52%', '2%'], ['12%', '40%'], ['58%', '38%'], ['26%', '68%'], ['55%', '72%']];
  return (
    <div className="relative h-[260px]" dir={ar ? 'rtl' : 'ltr'}>
      {chips.map((c, i) => (
        <span key={c} className="absolute text-[11px] text-white/75 bg-white/[0.06] border border-white/15 rounded-full px-3 py-1.5 whitespace-nowrap"
          style={{ insetInlineStart: pos[i][0], top: pos[i][1], animation: `fpFloat ${3.4 + (i % 3)}s ease-in-out ${i * 0.35}s infinite` }}>
          {c}
        </span>
      ))}
      <span className="absolute inset-0 flex items-center justify-center font-serif text-6xl text-white/10 select-none">؟</span>
    </div>
  );
}

function SceneFutures({ ar }: { ar: boolean }) {
  return (
    <svg viewBox="0 0 360 240" className="w-full h-[260px]">
      {[40, 100, 160, 220].map((y) => <line key={y} x1="0" y1={y} x2="360" y2={y} stroke="rgba(255,255,255,0.06)" />)}
      <path d="M20 190 C70 180 110 168 150 150" fill="none" stroke="#5DCAA5" strokeWidth="3" strokeLinecap="round" strokeDasharray="300" style={{ animation: 'fpDraw 1.2s ease-out both' }} />
      <circle cx="150" cy="150" r="6" fill="#EAFBF3" stroke="#5DCAA5" strokeWidth="2.5" />
      <text x="150" y="136" textAnchor="middle" fontSize="10" fill="#ffffff99">{ar ? 'اليوم' : 'today'}</text>
      {[
        { d: 'M150 150 C210 120 270 70 340 34', color: '#5DCAA5', label: ar ? 'استثمر الفائض' : 'invest the surplus', lx: 268, ly: 52 },
        { d: 'M150 150 C215 140 280 132 340 126', color: '#E4C465', label: ar ? 'اشترِ الفيلا 2028' : 'buy the villa 2028', lx: 272, ly: 118 },
        { d: 'M150 150 C210 165 275 185 340 200', color: '#E08A6D', label: ar ? 'واصِل كما أنت' : 'change nothing', lx: 268, ly: 196 },
      ].map((f, i) => (
        <g key={i}>
          <path d={f.d} fill="none" stroke={f.color} strokeWidth="2" strokeDasharray="6 5" opacity="0.9" style={{ animation: `fpDraw 1.4s ease-out ${0.5 + i * 0.25}s both` }} />
          <text x={f.lx} y={f.ly} textAnchor="middle" fontSize="10" fill={f.color}>{f.label}</text>
        </g>
      ))}
    </svg>
  );
}

function SceneVitals({ ar }: { ar: boolean }) {
  const gauges = [
    { label: ar ? 'مدى الأمان' : 'runway', value: ar ? '7.8 أشهر' : '7.8 months', pct: 0.78, color: '#5DCAA5' },
    { label: ar ? 'معدل الادخار' : 'savings rate', value: '34%', pct: 0.34, color: '#E4C465' },
    { label: ar ? 'عبء الدين' : 'debt burden', value: '18%', pct: 0.18, color: '#17B8C9' },
  ];
  const R = 34, C = Math.PI * R; // half circle
  return (
    <div className="flex items-center justify-center gap-6 h-[260px]">
      {gauges.map((g, i) => (
        <div key={g.label} className="text-center">
          <svg viewBox="0 0 100 60" className="w-28 h-16">
            <path d={`M 16 54 A ${R} ${R} 0 0 1 84 54`} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="9" strokeLinecap="round" />
            <path d={`M 16 54 A ${R} ${R} 0 0 1 84 54`} fill="none" stroke={g.color} strokeWidth="9" strokeLinecap="round"
              strokeDasharray={`${C * g.pct} ${C}`} style={{ animation: `fpDraw 1.3s ease-out ${0.3 + i * 0.3}s both`, strokeDashoffset: 0 }} />
          </svg>
          <div className="font-serif text-lg font-bold text-white -mt-1">{g.value}</div>
          <div className="text-[10px] text-white/50">{g.label}</div>
        </div>
      ))}
    </div>
  );
}

function SceneHiddenWealth({ ar }: { ar: boolean }) {
  const seen = [
    { icon: '💳', label: ar ? 'حساب البنك' : 'bank account' },
    { icon: '📈', label: ar ? 'المحفظة' : 'portfolio' },
  ];
  const hidden = [
    { icon: '🏜️', label: ar ? 'أرض القصيم' : 'Qassim land' },
    { icon: '🐫', label: ar ? 'الإبل' : 'camels' },
    { icon: '🪙', label: ar ? 'ذهب البيت' : 'household gold' },
    { icon: '🏪', label: ar ? 'حصة المشروع' : 'venture stake' },
  ];
  return (
    <div className="h-[260px] flex flex-col justify-center gap-4" dir={ar ? 'rtl' : 'ltr'}>
      <div>
        <div className="text-[10px] text-white/40 uppercase tracking-[0.1em] mb-2">{ar ? 'ما تراه التطبيقات' : 'what apps see'}</div>
        <div className="flex gap-2.5">
          {seen.map((s) => (
            <span key={s.icon} className="text-[11px] text-white/85 bg-white/[0.07] border border-white/20 rounded-xl px-3.5 py-2.5">{s.icon} {s.label}</span>
          ))}
        </div>
      </div>
      <div>
        <div className="text-[10px] text-[#C9A84C] uppercase tracking-[0.1em] mb-2">{ar ? '…وما لا تراه — ونراه نحن' : "…what they don't — and we do"}</div>
        <div className="flex gap-2.5 flex-wrap">
          {hidden.map((h, i) => (
            <span key={h.icon} className="text-[11px] text-white bg-[#C9A84C]/15 border border-[#C9A84C]/50 rounded-xl px-3.5 py-2.5"
              style={{ animation: `fpGlowIn 0.8s ease ${0.5 + i * 0.35}s both` }}>
              {h.icon} {h.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
