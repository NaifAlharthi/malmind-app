'use client';

// The landing persona chooser. Four Saudi personas — one per "where you stand"
// quadrant — that a guest can walk the whole product as. Picking one drops
// straight into a full guided walkthrough seeded with that persona's data.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { enterDemo } from '@/lib/demoSupabase';
import { DEMO_PERSONAS, type Quadrant } from '@/lib/demoWorld';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import PersonaAvatar from './PersonaAvatar';

// Scroll-reveal: children rise into place the first time they enter the
// viewport, with a per-element delay for a staged, cinematic entrance.
function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let done = false;
    const show = () => { if (!done) { done = true; setShown(true); cleanup(); } };
    const inView = () => { const r = el.getBoundingClientRect(); return r.top < window.innerHeight * 0.92 && r.bottom > 0; };
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) show(); }, { threshold: 0.18 });
    io.observe(el);
    // Fallbacks for environments where IO is throttled (background/embedded
    // tabs): a scroll/resize rect check, plus an initial-visibility check.
    const onScroll = () => { if (inView()) show(); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    const t = window.setTimeout(onScroll, 900);
    function cleanup() {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.clearTimeout(t);
    }
    return cleanup;
  }, []);
  return (
    <div ref={ref} className={className} style={{
      opacity: shown ? 1 : 0,
      transform: shown ? 'none' : 'translateY(26px)',
      transition: `opacity 700ms cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 700ms cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
    }}>
      {children}
    </div>
  );
}

const QUAD_LABEL: Record<Quadrant, { ar: string; en: string }> = {
  A: { ar: 'وضع البناء', en: 'Build mode' },
  B: { ar: 'التعثّر', en: 'Falling behind' },
  C: { ar: 'التعادل', en: 'Break-even' },
  D: { ar: 'الوفرة', en: 'Abundance' },
};

export default function PersonaPicker() {
  const router = useRouter();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);

  const pick = (id: string) => {
    enterDemo(id);
    router.push('/home');
  };

  return (
    <section
      id="persona-picker"
      className="relative overflow-hidden px-6 py-20"
      style={{ background: 'radial-gradient(120% 80% at 50% 0%, #0C4531 0%, #073626 46%, #041F17 100%)' }}
    >
      <div className="absolute -top-24 start-[10%] w-[420px] h-[420px] rounded-full blur-[130px] opacity-40 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #17B8C9 0%, transparent 68%)' }} />
      <div className="relative max-w-5xl mx-auto">
        <Reveal className="text-center mb-10">
          <div className="text-[11px] tracking-[0.16em] uppercase text-[#C9A84C] font-semibold mb-3">{L('جولة كاملة في المنتج', 'A full product walk-through')}</div>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white mb-3">{L('اختر من يشبهك، وامشِ في حياته المالية', 'Pick who you relate to, and walk their financial life')}</h2>
          <p className="text-sm text-white/60 max-w-2xl mx-auto leading-relaxed">
            {L(
              'أربع شخصيات سعودية، كلٌّ منها في مرحلة مختلفة من رحلتها المالية. اختر واحدة لتجربة كل أداة في مال مايند على بياناتها الكاملة — دون حساب، ولا شيء يُحفَظ.',
              'Four Saudi personas, each at a different stage of the money journey. Choose one to experience every MalMind tool on their full data — no account, nothing saved.'
            )}
          </p>
        </Reveal>

        <div className="grid sm:grid-cols-2 gap-4">
          {DEMO_PERSONAS.map((p, pi) => (
            <Reveal key={p.id} delay={pi * 110}>
            <button
              onClick={() => pick(p.id)}
              className="group w-full h-full text-start rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1.5"
              style={{
                background: 'linear-gradient(160deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))',
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 18px 50px -24px rgba(0,0,0,0.6)',
                ['--pa' as string]: p.accent,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${p.accent}88`; e.currentTarget.style.boxShadow = `0 24px 60px -22px ${p.accent}55, 0 18px 50px -24px rgba(0,0,0,0.6)`; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.boxShadow = '0 18px 50px -24px rgba(0,0,0,0.6)'; }}
            >
              <div className="flex items-start gap-4 mb-3">
                <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 ring-2" style={{ ['--tw-ring-color' as string]: `${p.accent}66` }}>
                  <PersonaAvatar id={p.id} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: p.accent }}>{p.quadrant}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: p.accent, background: `${p.accent}22` }}>{ar ? QUAD_LABEL[p.quadrant].ar : QUAD_LABEL[p.quadrant].en}</span>
                    <span className="text-[11px] text-white/40 ms-auto">{p.netWorth[ar ? 'ar' : 'en']}</span>
                  </div>
                  <div className="font-serif text-lg font-semibold text-white leading-tight">{ar ? p.firstNameAr : p.firstName}<span className="text-white/45 text-sm font-normal">، {p.age}</span></div>
                  <div className="text-[11px] text-white/55 truncate">{p.role[ar ? 'ar' : 'en']}</div>
                </div>
              </div>

              {/* the explicit link to one of the four fundamental problems */}
              <div className="flex items-center gap-1.5 text-[10px] font-semibold rounded-lg px-2.5 py-1.5 mb-2.5 border"
                style={{ color: '#E4C465', background: '#C9A84C14', borderColor: '#C9A84C44' }}>
                {p.problem.icon} {ar
                  ? `${p.gender === 'female' ? 'مشكلتها' : 'مشكلته'}: ${p.problem.ar}`
                  : `Struggles with: ${p.problem.en}`}
              </div>

              <p className="text-[13px] font-medium mb-2 leading-snug" style={{ color: p.accent }}>“{p.tagline[ar ? 'ar' : 'en']}”</p>
              <p className="text-xs text-white/55 leading-relaxed mb-3">{p.blurb[ar ? 'ar' : 'en']}</p>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {[
                  { icon: '⚠', v: p.challenge[ar ? 'ar' : 'en'] },
                  { icon: '✦', v: p.interest[ar ? 'ar' : 'en'] },
                  { icon: '🎯', v: p.goal[ar ? 'ar' : 'en'] },
                ].map((c) => (
                  <span key={c.v} className="text-[10px] text-white/70 bg-white/[0.06] border border-white/10 rounded-full px-2.5 py-1">{c.icon} {c.v}</span>
                ))}
              </div>

              <span className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-xl px-4 py-2 text-white transition-transform group-hover:gap-2.5"
                style={{ background: `linear-gradient(120deg, ${p.accent}, ${p.accent}CC)`, boxShadow: `0 10px 26px -10px ${p.accent}99` }}>
                {L(`امشِ في حياة ${p.firstNameAr}`, `Walk through as ${p.firstName}`)} <span>{ar ? '←' : '→'}</span>
              </span>
            </button>
            </Reveal>
          ))}
        </div>

        <p className="text-center text-[11px] text-white/35 mt-8">
          {L('يمكنك التنقّل بحرّية وتغيير الشخصية أو الخروج في أيّ وقت.', 'Navigate freely, switch persona, or exit any time.')}
        </p>
      </div>
    </section>
  );
}
