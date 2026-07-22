'use client';

import { useRouter } from 'next/navigation';
import { PERSONAS } from '@/lib/demoData';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);

  async function pickPersona(personaId: string) {
    const persona = PERSONAS.find((p) => p.id === personaId);
    if (!persona) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push('/signup');
      return;
    }

    // Save the chosen persona's starting profile to THIS user's real row.
    await supabase
      .from('profiles')
      .update({
        age: persona.profile.age,
        city: persona.profile.city,
        employment: persona.profile.employment,
        monthly_income: persona.profile.monthlyIncome,
        persona: persona.id,
      })
      .eq('id', user.id);

    // Seed their story with the persona's starting chapters — a real,
    // editable starting point rather than empty forms.
    const chapterRows = persona.chapters.map((c) => ({
      user_id: user.id,
      title: ar ? c.titleAr : c.title,
      start_year: c.startYear,
      end_year: c.endYear,
      note: ar ? c.noteAr : c.note,
      vividness: c.vividness,
    }));
    await supabase.from('story_chapters').insert(chapterRows);

    router.push('/home');
  }

  return (
    <div className="min-h-screen bg-[var(--surface-0)] flex items-center justify-center px-6 py-16">
      <div className="max-w-3xl w-full text-center">
        <div className="text-xs tracking-[0.15em] uppercase text-[var(--green)] font-semibold mb-4">
          {L('مرحباً بك في مال مايند', 'Welcome to MalMind')}
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[var(--ink)] mb-4 leading-tight">
          {ar ? (
            <>قبل أيّ شيء، اختَر فقط<br />شخصاً يشبهك.</>
          ) : (
            <>Before anything, just pick<br />someone who feels like you.</>
          )}
        </h1>
        <p className="text-[var(--ink-2)] mb-10 max-w-xl mx-auto leading-relaxed">
          {L(
            'يمنحك هذا نقطة انطلاق حقيقية قابلة للتعديل — لا شيء هنا مثبَّت. يمكنك تغيير كل رقم في الصفحات التالية.',
            'This gives you a real, editable starting point — nothing here is locked in. You can change every number in the pages that follow.'
          )}
        </p>

        <div className="grid sm:grid-cols-3 gap-4">
          {PERSONAS.map((persona) => (
            <button
              key={persona.id}
              onClick={() => pickPersona(persona.id)}
              className="text-start bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 hover:border-[var(--green)] hover:-translate-y-0.5 transition-all shadow-sm"
            >
              <div className="w-11 h-11 rounded-full bg-[var(--green-bg)] flex items-center justify-center text-xl mb-3">
                {persona.avatarEmoji}
              </div>
              <div className="font-serif text-lg font-semibold text-[var(--ink)]">
                {ar ? persona.nameAr : persona.name}، {persona.profile.age}
              </div>
              <div className="text-xs text-[var(--green-dark)] font-medium mb-2">
                {ar ? persona.roleAr : persona.role}
              </div>
              <div className="text-xs text-[var(--ink-2)] leading-relaxed">
                {ar ? persona.descriptionAr : persona.description}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
