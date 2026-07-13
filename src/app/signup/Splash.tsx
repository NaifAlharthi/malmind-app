'use client';

// The signup splash: a self-running, three-act animated scene that tells
// the product story - the problem (money is scattered and blurry), the
// answer (one living picture), and the toolkit (see / question / design)
// - before inviting the visitor to sign up or drop into the live demo.
// Pure CSS/SVG animation, no video assets, self-contained colors.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { enterDemo } from '@/lib/demoSupabase';

const ACTS = [
  {
    eyebrow: 'The problem',
    title: 'You earn well. So why is the picture blurry?',
    body: 'Salary in one app, loans in another, subscriptions everywhere, net worth… somewhere. Most people can\'t answer the simplest question about their own money: am I actually getting ahead?',
  },
  {
    eyebrow: 'The answer',
    title: 'MalMind turns your money into one living picture.',
    body: 'Log your numbers once — or sync a spreadsheet — and everything computes itself: net worth over time, health ratios, risks, and a 3D world where your financial life literally stands in front of you.',
  },
  {
    eyebrow: 'The toolkit',
    title: 'See it. Question it. Design it.',
    body: 'Eighteen tools and an AI advisor that knows your whole story — from what you\'ve earned in your lifetime, to when your portfolio doubles, to what happens if you buy the villa in 2028.',
  },
];

const ACT_MS = 5200;

export default function Splash() {
  const router = useRouter();
  const [act, setAct] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setAct((a) => (a + 1) % ACTS.length), ACT_MS);
    return () => clearInterval(t);
  }, []);

  function scrollToForm() {
    document.getElementById('signup-form')?.scrollIntoView({ behavior: 'smooth' });
  }

  function startDemo() {
    enterDemo();
    router.push('/home');
  }

  const a = ACTS[act];

  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden" style={{ background: 'linear-gradient(135deg, #0F2A1E 0%, #0A1A12 60%, #08150F 100%)' }}>
      <style>{`
        @keyframes mmFloat { 0%,100% { transform: translateY(0) rotate(var(--rot,0deg)); } 50% { transform: translateY(-14px) rotate(var(--rot,0deg)); } }
        @keyframes mmDraw { from { stroke-dashoffset: 620; } to { stroke-dashoffset: 0; } }
        @keyframes mmPop { 0% { opacity: 0; transform: translateY(16px) scale(0.94); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes mmFade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes mmPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(93,202,165,0.35); } 50% { box-shadow: 0 0 0 12px rgba(93,202,165,0); } }
        .mm-fade { animation: mmFade 0.7s ease both; }
        .mm-pop { animation: mmPop 0.6s ease both; }
      `}</style>

      {/* decorative rings */}
      <div className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full border border-[#C9A84C]/15 pointer-events-none" />
      <div className="absolute -bottom-40 -left-24 w-[360px] h-[360px] rounded-full border border-[#5DCAA5]/10 pointer-events-none" />

      {/* wordmark */}
      <div className="relative z-10 px-8 pt-8">
        <span className="font-serif text-2xl font-semibold text-white">Mal<span className="text-[#5DCAA5]">Mind</span></span>
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
              Create your free account ↓
            </button>
            <button
              onClick={startDemo}
              className="text-sm font-medium text-[#5DCAA5] border border-[#5DCAA5]/40 hover:border-[#5DCAA5] rounded-xl px-6 py-3 transition-colors"
            >
              Watch it work — instant demo
            </button>
          </div>
        </div>

        {/* animated scene */}
        <div className="flex-1 max-w-md w-full h-[300px] sm:h-[340px] relative" key={`scene-${act}`}>
          {act === 0 && <SceneChaos />}
          {act === 1 && <ScenePicture />}
          {act === 2 && <SceneToolkit />}
        </div>
      </div>

      {/* act dots */}
      <div className="relative z-10 flex items-center justify-center gap-2.5 pb-8">
        {ACTS.map((_, i) => (
          <button
            key={i}
            onClick={() => setAct(i)}
            aria-label={`Act ${i + 1}`}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{ width: i === act ? 28 : 10, background: i === act ? '#5DCAA5' : 'rgba(255,255,255,0.25)' }}
          />
        ))}
        <button onClick={scrollToForm} className="ml-4 text-[11px] text-white/40 hover:text-white/70">skip ↓</button>
      </div>
    </section>
  );
}

// Act 1: scattered money-life fragments drifting in the dark.
function SceneChaos() {
  const chips = [
    { text: 'SAR 28,000 salary', x: '4%', y: '12%', rot: '-6deg', delay: '0s' },
    { text: 'car loan… 42,000?', x: '52%', y: '4%', rot: '4deg', delay: '0.4s' },
    { text: 'Netflix · Spotify · iCloud…', x: '10%', y: '46%', rot: '3deg', delay: '0.8s' },
    { text: 'net worth = ??', x: '58%', y: '38%', rot: '-3deg', delay: '0.2s' },
    { text: 'rent 6,500', x: '30%', y: '70%', rot: '5deg', delay: '0.6s' },
    { text: 'Tadawul +8%?', x: '66%', y: '66%', rot: '-5deg', delay: '1s' },
    { text: 'savings… somewhere', x: '6%', y: '84%', rot: '2deg', delay: '1.2s' },
  ];
  return (
    <div className="absolute inset-0">
      {chips.map((c) => (
        <div
          key={c.text}
          className="mm-pop absolute text-[11px] sm:text-xs text-white/75 bg-white/[0.06] border border-white/15 rounded-full px-3.5 py-2 backdrop-blur-sm whitespace-nowrap"
          style={{ left: c.x, top: c.y, ['--rot' as string]: c.rot, animation: `mmPop 0.6s ease ${c.delay} both, mmFloat 4.5s ease-in-out ${c.delay} infinite` }}
        >
          {c.text}
        </div>
      ))}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-serif text-5xl text-white/10 select-none">?</span>
      </div>
    </div>
  );
}

// Act 2: the net-worth line draws itself over a settling grid of tiles.
function ScenePicture() {
  return (
    <div className="absolute inset-0 flex flex-col justify-center">
      <div className="bg-white/[0.05] border border-white/15 rounded-2xl p-5 backdrop-blur-sm">
        <div className="text-[10px] tracking-[0.12em] uppercase text-[#C9A84C] mb-3">Net worth — computed live</div>
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
          {[
            ['Net worth', 'SAR 1.0M'],
            ['Runway', '7.8 months'],
            ['Savings rate', '34%'],
          ].map(([k, v], i) => (
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
function SceneToolkit() {
  const tools = [
    { icon: '🧍', name: 'Your life, in 3D', desc: 'an avatar on your timeline, assets standing beside you' },
    { icon: '🩺', name: '12 health ratios', desc: 'runway, savings rate, debt — each drawn as what it means' },
    { icon: '🔮', name: 'What if', desc: 'model the villa, the raise, the career break — before deciding' },
    { icon: '💬', name: 'AI advisor', desc: 'knows your whole story, cites your actual numbers' },
  ];
  return (
    <div className="absolute inset-0 flex flex-col justify-center gap-2.5">
      {tools.map((t, i) => (
        <div key={t.name} className="mm-pop flex items-center gap-3 bg-white/[0.06] border border-white/12 rounded-xl px-4 py-3 backdrop-blur-sm" style={{ animationDelay: `${i * 0.25}s` }}>
          <span className="text-xl">{t.icon}</span>
          <div>
            <div className="text-sm font-semibold text-white">{t.name}</div>
            <div className="text-[11px] text-white/55">{t.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
