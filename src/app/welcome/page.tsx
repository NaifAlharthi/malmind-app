'use client';

// /welcome — where an invitation lands. The unguessable ?i= code greets
// the guest BY NAME, tells the MalMind story in one breath, and opens
// three doors: the guided tour, a ready-made Saudi life to walk first,
// or creating their own account. Opening the page marks the invite
// "opened"; the stored code lets the shell mark "joined" after signup.
// Full-bleed (no app shell) — this is a front porch, not an app room.

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import LanguageToggle from '@/components/shared/LanguageToggle';
import ThinkingLayerStack from '@/components/shared/ThinkingLayerStack';
import { enterDemo } from '@/lib/demoSupabase';
import { DEMO_PERSONAS } from '@/lib/demoWorld';
import PersonaAvatar from '@/app/signup/PersonaAvatar';

function WelcomeInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { locale, setLocale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const code = params.get('i');
  const [guest, setGuest] = useState<{ name: string; lang: string } | null | undefined>(undefined);

  useEffect(() => {
    if (!code) { setGuest(null); return; }
    (async () => {
      // A bad code, a demo-mode client, or an unreachable database must
      // never break the porch — the page just greets generically.
      try {
        const supabase = createClient();
        const { data } = await supabase.rpc('get_invite', { invite_id: code });
        const row = Array.isArray(data) ? data[0] : data;
        if (row?.name) {
          setGuest({ name: row.name, lang: row.lang });
          if (row.lang === 'ar' || row.lang === 'en') setLocale(row.lang);
          try {
            window.localStorage.setItem('mm-invite', code);
            window.localStorage.setItem('mm-invite-name', row.name);
          } catch { /* ignore */ }
          await supabase.rpc('mark_invite', { invite_id: code, event: 'opened' });
        } else {
          setGuest(null);
        }
      } catch {
        setGuest(null);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const highlights: [string, string, string][] = [
    ['📒', L('سِجلّ واحد لكل أرقامك', 'One record for all your numbers'), L('دخلك ومصروفك وأصولك والتزاماتك — شهراً بجانب شهر.', 'Income, spending, assets, commitments — month beside month.')],
    ['🧊', L('جبل الجليد', 'The iceberg'), L('ابدأ بسيطاً واغطس حين تريد — كل صفحة تتعمّق معك.', 'Start simple and dive when you want — every page deepens with you.')],
    ['🧠', L('العقل', 'The Brain'), L('مستشار يقرأ أرقامك أنت ويجيب: ماذا لو؟', 'An advisor that reads YOUR numbers and answers: what if?')],
    ['🧰', L('٣٧ أداة مترابطة', '37 connected tools'), L('من الميزانية إلى التقاعد والتقلب — كلها تشرب من سِجلّك.', 'From budgeting to retirement and volatility — all fed by your record.')],
  ];

  return (
    <div className="min-h-screen text-white" style={{ background: 'linear-gradient(180deg, #041F17 0%, #073626 55%, #0A3A29 100%)' }}>
      <header className="max-w-4xl mx-auto px-6 pt-6 flex items-center justify-between">
        <span className="font-serif text-xl font-bold">Mal<span className="text-[#5DCAA5]">Mind</span></span>
        <LanguageToggle />
      </header>

      <main className="max-w-4xl mx-auto px-6 pb-16">
        <div className="text-center pt-10 sm:pt-14 mb-8">
          <div className="text-[11px] tracking-[0.14em] uppercase text-[#C9A84C] font-semibold mb-3">
            🎟 {L('دعوة خاصة — برنامج الترحيب', 'A private invitation — the welcome program')}
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold leading-tight mb-4">
            {guest === undefined
              ? '…'
              : guest
                ? L(`أهلاً ${guest.name} — هذه دعوتك`, `Welcome, ${guest.name} — this is your invitation`)
                : L('أهلاً بك في مال مايند', 'Welcome to MalMind')}
          </h1>
          <p className="text-sm sm:text-base text-white/75 leading-relaxed max-w-2xl mx-auto">
            {L(
              'مال مايند طبقة تفكير لحياتك المالية: نجمع أرقامك المبعثرة في سِجلّ واحد، نحوّلها إلى معنى، ونجيب بأرقامك أنت — ماذا يعني وضعي؟ وماذا يحدث لو قرّرت؟ أنت من أوائل من يدخل قبل الإطلاق، ورأيك يشكّل المنتج.',
              "MalMind is a thinking layer for your financial life: we gather your scattered numbers into one record, turn them into meaning, and answer from YOUR numbers — what does my situation mean, and what happens if I decide? You're among the first in before launch, and your opinion shapes the product."
            )}
          </p>
        </div>

        {/* the product, drawn as it is */}
        <div className="flex justify-center mb-10" style={{
          ['--ink' as never]: '#FFFFFF',
          ['--ink-2' as never]: 'rgba(255,255,255,0.75)',
          ['--muted' as never]: 'rgba(255,255,255,0.55)',
          ['--border-medium' as never]: 'rgba(255,255,255,0.3)',
          ['--green-dark' as never]: '#5DCAA5',
          ['--gold' as never]: '#C9A84C',
          ['--gold-text-strong' as never]: '#E5C86B',
        } as React.CSSProperties}>
          <ThinkingLayerStack className="max-w-3xl w-full" />
        </div>

        {/* what's waiting inside */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
          {highlights.map(([icon, title, sub]) => (
            <div key={title} className="rounded-2xl border border-white/15 bg-white/5 p-4">
              <div className="text-xl mb-1.5">{icon}</div>
              <div className="text-[12px] font-bold mb-1">{title}</div>
              <div className="text-[10px] text-white/60 leading-relaxed">{sub}</div>
            </div>
          ))}
        </div>

        {/* the three doors */}
        <div className="text-center mb-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-3">
            <Link href="/tour" className="text-sm font-bold text-[#2A1F05] bg-[#C9A84C] rounded-xl px-7 py-3.5">
              🧭 {L('خذ الجولة الموجّهة', 'Take the guided tour')}
            </Link>
            <Link href="/signup" className="text-sm font-bold text-white rounded-xl px-7 py-3.5" style={{ background: 'linear-gradient(120deg, #1D9E75 0%, #17B8C9 100%)' }}>
              {L('أنشئ حسابك وابدأ ←', 'Create your account →')}
            </Link>
          </div>
          <p className="text-[11px] text-white/50">{L('مجاني — ولا نطلب بطاقة.', 'Free — and no card asked.')}</p>
        </div>

        {/* or walk a ready-made life first */}
        <div className="rounded-2xl border border-white/15 bg-white/5 p-5 mt-8">
          <div className="text-[12px] font-bold mb-1">👀 {L('أو جرّب أولاً بحياة سعودية جاهزة', 'Or try a ready-made Saudi life first')}</div>
          <p className="text-[10px] text-white/55 leading-relaxed mb-3">
            {L('أربع شخصيات ببيانات كاملة — تمشي المنتج كله دون تسجيل، ولا يُحفظ شيء.', 'Four personas with full data — walk the whole product, no signup, nothing saved.')}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DEMO_PERSONAS.map((p) => (
              <button
                key={p.id}
                onClick={() => { enterDemo(p.id); router.push('/home'); }}
                className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 hover:border-[#5DCAA5] transition-colors text-start"
              >
                <PersonaAvatar id={p.id} className="w-8 h-8 shrink-0" />
                <span className="text-[11px] font-semibold truncate">{ar ? p.firstNameAr : p.firstName}</span>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <Suspense fallback={null}>
      <WelcomeInner />
    </Suspense>
  );
}
