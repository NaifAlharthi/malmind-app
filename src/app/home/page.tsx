'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useProfileContext } from '@/components/shared/AppShell';
import { useDrive, useDepth } from '@/components/shared/ExperienceMode';
import { useTheme } from '@/components/shared/ThemeProvider';
import { localizedFirstName } from '@/lib/name';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { clearEphemeral } from '@/lib/authPrefs';
import { TOOLS, type ViewKey } from '@/lib/toolbox';
import type { DepthLevel } from '@/lib/depth';
import { diagnoseQuadrant, QUADRANT_META, type QuadKey } from '@/lib/quadrant';
import { demoAr } from '@/lib/demoI18n';
import FoundationHub from '@/components/home/FoundationHub';
import LogTile from '@/components/home/LogTile';
import HajisOpener from '@/components/home/HajisOpener';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface Profile {
  name: string;
  city: string | null;
  employment: string | null;
  monthly_income: number;
  email: string | null;
  life_stage: string | null;
  persona: string | null;
  currency: string | null;
}

interface Financials {
  netWorth: number;
  cash: number;
  investments: number;
  assets: number;
  liabilities: number;
  income: number;
  expenses: number;
  asOf: string;
}

function fmt(n: number) {
  return Math.round(n).toLocaleString();
}

export default function HomePage() {
  const router = useRouter();
  const supabase = createClient();
  const { openEditProfile, profileVersion } = useProfileContext();
  const { theme, toggleTheme } = useTheme();
  const { t, locale, setLocale } = useLocale();
  const { drive } = useDrive();
  const { depth, setDepth } = useDepth();
  // Home vs Today, segmented: home is IDENTITY — who you are, your data,
  // and what MalMind is. The action happens on the timeline (T2 leads).
  //   D1 التعريف — the concern opener + the profile that talks
  //   D2 البيانات — the data room: the foundation tower + the time doors
  //   D3 المنتج   — what MalMind is: mission + the four problems
  //   D4 الجدار    — the pro wall: the Log + the full tool matrix
  // (your space moved off the grid entirely — it lives behind the avatar)
  // Symmetric on web and phone; fingers dive by pulling past the page edge.
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const sar = t('common.sar');
  const money = (n: number) => (ar ? `${fmt(n)} ${sar}` : `${sar} ${fmt(n)}`);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [quad, setQuad] = useState<QuadKey | null>(null);
  const [fin, setFin] = useState<Financials | null>(null);
  // The action surfaces (hājis, standing/next-action) live on T2 now —
  // home is identity: who you are, your data, and what MalMind is.
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }


    const { data: profileData } = await supabase
      .from('profiles')
      .select('name, city, employment, monthly_income, email, life_stage, persona, currency')
      .eq('id', user.id)
      .single();
    if (profileData) setProfile(profileData as Profile);

    const { data: snaps } = await supabase
      .from('financial_snapshots')
      .select('year, month, cash, stocks, real_estate, equity, other_assets, liabilities, income, expenses')
      .eq('user_id', user.id)
      .order('year', { ascending: true })
      .order('month', { ascending: true });
    if (snaps && snaps.length > 0) {
      const s = snaps[snaps.length - 1];
      const assets = Number(s.cash) + Number(s.stocks) + Number(s.real_estate) + Number(s.equity) + Number(s.other_assets);
      setFin({
        cash: Number(s.cash),
        investments: Number(s.stocks) + Number(s.equity),
        assets,
        liabilities: Number(s.liabilities),
        netWorth: assets - Number(s.liabilities),
        income: Number(s.income),
        expenses: Number(s.expenses),
        asOf: `${MONTHS[s.month - 1]} ${s.year}`,
      });
      // Same diagnosis rule as the Today dashboard: averages over the last
      // six months of snapshots, against the latest asset base.
      const recent = snaps.slice(-6);
      setQuad(diagnoseQuadrant(
        recent.reduce((a, r) => a + Number(r.income), 0) / recent.length,
        recent.reduce((a, r) => a + Number(r.expenses), 0) / recent.length,
        assets,
      ));
    } else {
      setFin(null);
      setQuad(null);
    }


    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { load(); }, [load, profileVersion]);

  async function handleSignOut() {
    clearEphemeral();
    await supabase.auth.signOut();
    router.push('/login');
  }


  if (loading) {
    return <div className="text-sm text-[var(--muted)]">{t('common.loading')}</div>;
  }

  if (!profile || !profile.employment) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-[var(--ink-2)] mb-4">{t('home.onboard.prompt')}</p>
        <Link href="/onboarding" className="text-sm bg-[var(--green-dark)] text-white rounded-lg px-4 py-2 font-medium">
          {t('home.onboard.cta')}
        </Link>
      </div>
    );
  }

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
      <div className="flex justify-between items-start mb-2">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-[var(--ink)]">
            {t('home.greeting', { name: localizedFirstName(profile.name, locale === 'ar') })}
          </h1>
          <p className="text-sm text-[var(--ink-2)]">{t('home.subtitle')}</p>
        </div>
        <button onClick={handleSignOut} className="text-xs text-[var(--muted)]">{t('common.signOut')}</button>
      </div>

      {/* the action surfaces (hājis, standing, next action) live on T2 —
          home is identity: who you are, your data, and what MalMind is */}

      {/* ── the hājis opener — the most important entry point, first thing:
             a snippet that hands you into Today, where the action lives ── */}
      {depth === 1 && <HajisOpener />}

      {/* ── the profile — home·D1: a name and a summary that TALKS about the
             person's situation; the numbers themselves live in the Log (D2)
             and on the timeline ── */}
      {depth === 1 && (
      <div data-tour="profile-card" className="bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] rounded-2xl p-6 my-6 text-white relative">
        <button
          onClick={openEditProfile}
          className="absolute top-6 end-6 text-xs text-white/70 hover:text-white border border-white/20 hover:border-white/40 rounded-lg px-3 py-1.5 transition-colors"
        >
          {t('common.edit')}
        </button>
        <div className="text-xs tracking-[0.1em] uppercase text-[var(--gold)] mb-1">{t('home.profile.eyebrow')}</div>
        <div className="font-serif text-2xl font-semibold">{localizedFirstName(profile.name, locale === 'ar')}</div>
        <div className="text-xs text-white/50">{demoAr(profile.employment, ar)} · {demoAr(profile.city, ar)}</div>

        <div className="pt-4 mt-4 border-t border-white/10">
          {quad ? (() => {
            const meta = QUADRANT_META[quad];
            const c = ar ? meta.ar : meta.en;
            return (
              <>
                <div className="text-[10px] tracking-[0.08em] uppercase text-white/45 mb-1.5">
                  {ar ? 'أين تقف الآن' : 'Where you stand now'}
                </div>
                <div className="font-serif text-xl sm:text-2xl font-bold flex items-center gap-2 flex-wrap">
                  <span>{meta.icon}</span>
                  <span>{c.title}</span>
                </div>
                <p className="text-sm text-white/75 leading-relaxed mt-2 max-w-xl">{c.meaning}</p>
                <Link href="/today" className="inline-block text-xs font-semibold text-[#2A1F05] bg-[var(--gold)] rounded-lg px-3.5 py-2 mt-3">
                  {ar ? 'الخريطة كاملة في «اليوم» ←' : 'The full map in Today →'}
                </Link>
              </>
            );
          })() : (
            <Link href="/financial-numbers" className="inline-block text-xs font-medium bg-white/10 hover:bg-white/15 border border-white/20 rounded-lg px-3 py-2 transition-colors">
              {t('home.logPrompt')}
            </Link>
          )}
        </div>
      </div>
      )}

      {/* ── the three front doors — sank to D2 so D1 stays: concern + profile ── */}
      {depth === 2 && (
      <div data-tour="views-grid" className="mb-8">
        <SectionHeading eyebrow={t('home.views.heading')} />
        <div className="grid sm:grid-cols-3 gap-3">
          <ViewCard href="/past" icon="🕰" title={t('home.card.past.title')} desc={t('home.card.past.desc')} />
          <ViewCard href="/today" icon="☀" title={t('home.card.today.title')} desc={t('home.card.today.desc')} />
          <ViewCard href="/future" icon="🔭" title={t('home.card.future.title')} desc={t('home.card.future.desc')} />
        </div>
      </div>
      )}

      {/* ── mission band — home·D3: what MalMind is ── */}
      {depth === 3 && (
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
      )}

      {/* ── the foundation: enter · review · link the data everything reads — home·D2, the data room ── */}
      {depth === 2 && <FoundationHub />}

      {/* ── the Log: every number on one spreadsheet-like grid — home·D4,
             beside the full tool matrix on the pro wall ── */}
      {depth === 4 && <LogTile />}

      {/* ── the FULL tool matrix — the D4 cockpit's command wall ── */}
      {depth === 4 && <FullToolMatrix />}

      {/* ── why we exist: problem → answer — home·D3 ── */}
      {depth === 3 && (
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
      )}


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
// and walks anywhere in one tap.
function FullToolMatrix() {
  const { t, locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const VIEW_META: { key: ViewKey; icon: string; label: string }[] = [
    { key: 'past', icon: '🕰', label: t('nav.past') },
    { key: 'today', icon: '☀', label: t('nav.today') },
    { key: 'future', icon: '🔭', label: t('nav.future') },
  ];
  return (
    <div className="mb-8">
      <SectionHeading
        eyebrow={L('المصفوفة كاملة', 'The full matrix')}
        title={L('كل أداة، عبر الأزمنة الثلاثة', 'Every tool, across the three times')}
      />
      <div className="grid sm:grid-cols-3 gap-3">
        {VIEW_META.map((view) => (
          <div key={view.key} className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base leading-none">{view.icon}</span>
              <span className="text-sm font-semibold text-[var(--ink)]">{view.label}</span>
              <span className="ms-auto text-[10px] text-[var(--muted)]">{TOOLS[view.key].length}</span>
            </div>
            <div className="flex flex-col gap-1">
              {TOOLS[view.key].map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--surface-1)] transition-colors"
                >
                  <span className="text-sm leading-none">{tool.icon}</span>
                  <span className="text-xs text-[var(--ink-2)] group-hover:text-[var(--ink)] transition-colors">{t(tool.titleKey)}</span>
                  <span className="ms-auto text-[9px] text-[var(--muted)]" dir="ltr">D{tool.depth ?? 1}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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

