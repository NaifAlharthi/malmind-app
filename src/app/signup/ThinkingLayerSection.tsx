'use client';

// The thinking-layer snippet on the landing — the About page's
// signature drawing shown to visitors right after the four problems:
// this is WHAT MalMind is, in one picture. The section retints the
// stack's CSS variables so it reads on the splash's dark green night.

import { useLocale } from '@/lib/i18n/LocaleProvider';
import ThinkingLayerStack from '@/components/shared/ThinkingLayerStack';

export default function ThinkingLayerSection() {
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);

  return (
    <section
      className="relative px-8 py-20 sm:py-24 overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #041F17 0%, #073626 55%, #0A3A29 100%)',
        ['--ink' as never]: '#FFFFFF',
        ['--ink-2' as never]: 'rgba(255,255,255,0.75)',
        ['--muted' as never]: 'rgba(255,255,255,0.55)',
        ['--border-medium' as never]: 'rgba(255,255,255,0.3)',
        ['--green-dark' as never]: '#5DCAA5',
        ['--gold' as never]: '#C9A84C',
        ['--gold-text-strong' as never]: '#E5C86B',
      } as React.CSSProperties}
    >
      {/* a quiet gold breath behind the stack */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full blur-[130px] opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #C9A84C 0%, transparent 70%)' }} aria-hidden />

      <div className="relative max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.14em] uppercase text-[#C9A84C] bg-[#C9A84C]/10 border border-[#C9A84C]/30 rounded-full px-4 py-1.5 mb-5">
            {L('إذاً ما الذي نبنيه؟', 'So what are we building?')}
          </div>
          <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-5">
            {L('طبقة تفكيرٍ لمالك.', 'A thinking layer for your money.')}
          </h2>
          <p className="text-base sm:text-lg text-white/70 leading-relaxed max-w-3xl mx-auto">
            {L(
              'كل تطبيق يمسك شريحةً من حياتك المالية — ولا أحد يعرف ماذا تعني الشرائح مجتمعة. مال مايند طبقة تفكيرٍ تعمل بالذكاء الاصطناعي تجلس بين بياناتك وقراراتك: تقرأ كل شيء، وتجيب من أرقامك أنت.',
              'Every app holds one slice of your financial life — and none knows what the slices mean together. MalMind is an AI-powered thinking layer between your data and your decisions: it reads everything, and answers from YOUR numbers.'
            )}
          </p>
        </div>

        <div className="flex justify-center">
          <ThinkingLayerStack className="max-w-4xl w-full" />
        </div>

        <div className="text-center mt-8">
          <button
            onClick={() => document.getElementById('signup-form')?.scrollIntoView({ behavior: 'smooth' })}
            className="text-base font-semibold text-white rounded-xl px-8 py-3.5 transition-transform hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(120deg, #1D9E75 0%, #17B8C9 100%)', boxShadow: '0 12px 34px -8px rgba(23,184,201,0.55)' }}
          >
            {L('ابنِ طبقتك أنت ↓', 'Build your own layer ↓')}
          </button>
        </div>
      </div>
    </section>
  );
}
