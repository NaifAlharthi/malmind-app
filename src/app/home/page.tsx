'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useProfileContext } from '@/components/shared/AppShell';
import { useTheme } from '@/components/shared/ThemeProvider';
import { localizedFirstName } from '@/lib/name';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { clearEphemeral } from '@/lib/authPrefs';
import { isDemoActive } from '@/lib/demoSupabase';
import { diagnoseQuadrant, QUADRANT_META, type QuadKey } from '@/lib/quadrant';
import { demoAr } from '@/lib/demoI18n';
import ContactModal from '@/components/shared/ContactModal';
import FoundationHub from '@/components/home/FoundationHub';

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

interface Account {
  email: string | null;
  memberSince: string | null;
  isDemo: boolean;
}

interface Integrations {
  configured: boolean;
  connected: boolean;
  email: string | null;
  spreadsheetUrl: string | null;
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
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const sar = t('common.sar');
  const money = (n: number) => (ar ? `${fmt(n)} ${sar}` : `${sar} ${fmt(n)}`);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [quad, setQuad] = useState<QuadKey | null>(null);
  const [fin, setFin] = useState<Financials | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [integ, setInteg] = useState<Integrations | null>(null);
  const [loading, setLoading] = useState(true);
  const [contactOpen, setContactOpen] = useState(false);

  // Periodic-reports placeholder: the delivery engine isn't built yet, but
  // the chosen frequency/channels persist locally so they're ready for it.
  const [reportPrefs, setReportPrefs] = useState<{ freq: string[]; via: string[] }>({ freq: [], via: [] });
  const [reportEdit, setReportEdit] = useState(false);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('mm-report-prefs');
      if (raw) setReportPrefs(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);
  const toggleReportPref = (group: 'freq' | 'via', key: string) => {
    setReportPrefs((prev) => {
      const list = prev[group].includes(key) ? prev[group].filter((k) => k !== key) : [...prev[group], key];
      const next = { ...prev, [group]: list };
      try { window.localStorage.setItem('mm-report-prefs', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    setAccount({
      email: user.email ?? null,
      memberSince: user.created_at ?? null,
      isDemo: isDemoActive(),
    });

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

    // Integration status — best-effort; failures just leave the tile neutral.
    try {
      const res = await fetch('/api/integrations/google/status');
      if (res.ok) setInteg(await res.json());
    } catch { /* ignore */ }

    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { load(); }, [load, profileVersion]);

  async function handleSignOut() {
    clearEphemeral();
    await supabase.auth.signOut();
    router.push('/login');
  }

  const lifeStageLabel = (s: string | null) => {
    if (!s) return null;
    const map: Record<string, string> = {
      student: L('طالب', 'Student'), employed: L('موظّف', 'Employed'),
      self_employed: L('يعمل لحسابه', 'Self-employed'), business_owner: L('صاحب عمل', 'Business owner'),
      unemployed: L('عاطل عن العمل', 'Unemployed'), retired: L('متقاعد', 'Retired'),
      homemaker: L('ربّ/ربّة منزل', 'Homemaker'), other: L('أخرى', 'Other'),
    };
    return map[s] ?? null;
  };
  const memberSinceLabel = account?.memberSince
    ? new Intl.DateTimeFormat(ar ? 'ar' : 'en', { year: 'numeric', month: 'long' }).format(new Date(account.memberSince))
    : null;

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

      {/* ── personal snapshot ── */}
      <div data-tour="profile-card" className="bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] rounded-2xl p-6 my-6 text-white relative">
        <button
          onClick={openEditProfile}
          className="absolute top-6 end-6 text-xs text-white/70 hover:text-white border border-white/20 hover:border-white/40 rounded-lg px-3 py-1.5 transition-colors"
        >
          {t('common.edit')}
        </button>
        <div className="text-xs tracking-[0.1em] uppercase text-[var(--gold)] mb-1">{t('home.profile.eyebrow')}</div>
        <div className="font-serif text-xl font-semibold">{localizedFirstName(profile.name, locale === 'ar')}</div>
        <div className="text-xs text-white/50 mb-4">{demoAr(profile.employment, ar)} · {demoAr(profile.city, ar)}</div>

        {fin ? (
          <div className="pt-4 border-t border-white/10">
            <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
              <div>
                <div className="text-[10px] tracking-[0.08em] uppercase text-[var(--gold)] mb-1">{t('home.netWorthAsOf', { date: fin.asOf })}</div>
                <div className="font-serif text-3xl font-bold">{money(fin.netWorth)}</div>
              </div>
              <Link href="/financial-numbers" className="text-xs text-white/70 hover:text-white border border-white/20 hover:border-white/40 rounded-lg px-3 py-1.5 transition-colors">
                {t('home.updateNumbers')}
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Balance label={t('home.balance.cash')} value={money(fin.cash)} dot="#2a78d6" />
              <Balance label={t('home.balance.investments')} value={money(fin.investments)} dot="#17B8C9" />
              <Balance label={t('home.balance.assets')} value={money(fin.assets)} dot="#E0559E" />
              <Balance label={t('home.balance.liabilities')} value={money(fin.liabilities)} dot="#E0922A" />
            </div>
            <div className="flex flex-wrap items-start gap-x-8 gap-y-3 mt-4 pt-4 border-t border-white/10">
              <MiniStat label={t('home.stat.monthlyIncome')} value={money(profile.monthly_income)} />
              {quad && <QuadrantStat quad={quad} ar={ar} />}
            </div>
          </div>
        ) : (
          <div className="pt-4 border-t border-white/10">
            <div className="mb-4">
              <MiniStat label={t('home.stat.monthlyIncome')} value={money(profile.monthly_income)} />
            </div>
            <Link href="/financial-numbers" className="inline-block text-xs font-medium bg-white/10 hover:bg-white/15 border border-white/20 rounded-lg px-3 py-2 transition-colors">
              {t('home.logPrompt')}
            </Link>
          </div>
        )}
      </div>

      {/* ── the three front doors ── */}
      <div data-tour="views-grid" className="mb-8">
        <SectionHeading eyebrow={t('home.views.heading')} />
        <div className="grid sm:grid-cols-3 gap-3">
          <ViewCard href="/past" icon="🕰" title={t('home.card.past.title')} desc={t('home.card.past.desc')} />
          <ViewCard href="/today" icon="☀" title={t('home.card.today.title')} desc={t('home.card.today.desc')} />
          <ViewCard href="/future" icon="🔭" title={t('home.card.future.title')} desc={t('home.card.future.desc')} />
        </div>
      </div>

      {/* ── mission band ── */}
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
          <div className="flex flex-wrap gap-4 mt-5">
            <MissionStat n="18" label={L('أداة مترابطة', 'connected tools')} />
            <MissionStat n="3" label={L('نظرات زمنية', 'time views')} />
            <MissionStat n="🇸🇦" label={L('مصمَّم للسعودية', 'made for Saudi')} />
          </div>
        </div>
      </div>

      {/* ── the foundation: enter · review · link the data everything reads ── */}
      <FoundationHub />

      {/* ── why we exist: problem → answer ── */}
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

      {/* ── your space: profile · account · integrations · settings ── */}
      <div className="mb-4">
        <SectionHeading eyebrow={L('مساحتك', 'Your space')} />
        <div className="grid sm:grid-cols-2 gap-3">
          {/* profile */}
          <SpaceTile icon="👤" title={L('ملفّك الشخصي', 'Your profile')}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[var(--green-bg)] border border-[var(--green-border)] flex items-center justify-center text-sm font-semibold text-[var(--green-dark)] shrink-0">
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-[var(--ink)] truncate">{profile.name}</div>
                <div className="text-[11px] text-[var(--muted)] truncate">
                  {[profile.employment, profile.city, lifeStageLabel(profile.life_stage)].filter(Boolean).join(' · ')}
                </div>
              </div>
            </div>
            <button onClick={openEditProfile} className="text-xs font-medium text-[var(--green-dark)] bg-[var(--green-bg)] border border-[var(--green-border)] rounded-lg px-3 py-1.5">
              {t('common.editProfile')}
            </button>
          </SpaceTile>

          {/* account */}
          <SpaceTile icon="🪪" title={L('حسابك', 'Your account')}>
            <div className="flex flex-col gap-1.5">
              <InfoLine label={L('البريد', 'Email')} value={account?.email ?? '—'} mono />
              <InfoLine
                label={L('النوع', 'Plan')}
                value={account?.isDemo ? L('تجريبي', 'Demo') : L('مجّاني', 'Free')}
                badge
                badgeColor={account?.isDemo ? 'var(--gold-2)' : 'var(--green)'}
              />
              {memberSinceLabel && <InfoLine label={L('عضو منذ', 'Member since')} value={memberSinceLabel} />}
              {profile.currency && <InfoLine label={L('العملة', 'Currency')} value={profile.currency} />}
            </div>
            <button onClick={handleSignOut} className="text-[11px] text-[var(--muted)] hover:text-[var(--red-dark-text)] mt-3">
              {t('common.signOut')}
            </button>
          </SpaceTile>

          {/* integrations */}
          <SpaceTile icon="🔗" title={L('التكاملات', 'Integrations')}>
            <div className="flex items-center justify-between gap-2 bg-[var(--surface-1)] rounded-lg px-3 py-2.5 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base">📊</span>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-[var(--ink)]">Google Sheets</div>
                  <div className="text-[10px] text-[var(--muted)] truncate">
                    {integ?.connected
                      ? L(`متّصل${integ.email ? ` · ${integ.email}` : ''}`, `Connected${integ.email ? ` · ${integ.email}` : ''}`)
                      : integ && !integ.configured
                      ? L('غير مُفعَّل بعد', 'Not enabled yet')
                      : L('غير متّصل', 'Not connected')}
                  </div>
                </div>
              </div>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: integ?.connected ? 'var(--green)' : 'var(--border-medium)' }} />
            </div>
            <Link href="/financial-numbers" className="text-xs font-medium text-[var(--green-dark)]">
              {integ?.connected ? L('إدارة المزامنة →', 'Manage sync →') : L('ربط جدول Google →', 'Connect Google Sheets →')}
            </Link>
            <p className="text-[10px] text-[var(--muted)] mt-2 leading-relaxed">
              {L('المزيد من الاتصالات (البنوك، الوسطاء) قادم.', 'More connections (banks, brokers) coming.')}
            </p>
          </SpaceTile>

          {/* settings */}
          <SpaceTile icon="⚙️" title={L('الإعدادات', 'Settings')}>
            <div className="flex flex-col gap-3">
              <div>
                <div className="text-[11px] text-[var(--muted)] mb-1.5">{t('common.language')}</div>
                <div className="inline-flex border border-[var(--border-default)] rounded-lg overflow-hidden">
                  <button onClick={() => setLocale('en')} className={`px-3 py-1.5 text-xs font-medium ${!ar ? 'bg-[var(--ink)] text-[var(--surface-0)]' : 'text-[var(--ink-2)]'}`}>English</button>
                  <button onClick={() => setLocale('ar')} className={`px-3 py-1.5 text-xs font-medium ${ar ? 'bg-[var(--ink)] text-[var(--surface-0)]' : 'text-[var(--ink-2)]'}`}>العربية</button>
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[var(--muted)] mb-1.5">{L('المظهر', 'Theme')}</div>
                <div className="inline-flex border border-[var(--border-default)] rounded-lg overflow-hidden">
                  <button onClick={() => { if (theme !== 'light') toggleTheme(); }} className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1 ${theme === 'light' ? 'bg-[var(--ink)] text-[var(--surface-0)]' : 'text-[var(--ink-2)]'}`}>☀ {L('فاتح', 'Light')}</button>
                  <button onClick={() => { if (theme !== 'dark') toggleTheme(); }} className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1 ${theme === 'dark' ? 'bg-[var(--ink)] text-[var(--surface-0)]' : 'text-[var(--ink-2)]'}`}>☾ {L('داكن', 'Dark')}</button>
                </div>
              </div>
            </div>
          </SpaceTile>

          {/* periodic reports — placeholder until the delivery engine ships */}
          <SpaceTile icon="📬" title={L('التقارير الدورية', 'Periodic reports')}>
            {(() => {
              const FREQ_OPTS: { k: string; icon: React.ReactNode; label: string }[] = [
                { k: 'daily', icon: '☀️', label: L('يومي', 'Daily') },
                { k: 'weekly', icon: '📅', label: L('أسبوعي', 'Weekly') },
                { k: 'monthly', icon: '🗓️', label: L('شهري', 'Monthly') },
                { k: 'quarterly', icon: '📈', label: L('ربع سنوي', 'Quarterly') },
                { k: 'annual', icon: '🏁', label: L('سنوي', 'Annual') },
              ];
              const VIA_OPTS: { k: string; icon: React.ReactNode; label: string }[] = [
                { k: 'email', icon: '✉️', label: L('البريد الإلكتروني', 'Email') },
                { k: 'whatsapp', icon: <WhatsAppGlyph />, label: L('واتساب', 'WhatsApp') },
              ];
              const Pill = ({ group, opt }: { group: 'freq' | 'via'; opt: { k: string; icon: React.ReactNode; label: string } }) => {
                const on = reportPrefs[group].includes(opt.k);
                return (
                  <button
                    onClick={() => toggleReportPref(group, opt.k)}
                    aria-pressed={on}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] transition-all ${
                      on
                        ? 'bg-[var(--green-bg)] border-[var(--green)] text-[var(--green-dark)] font-semibold shadow-sm'
                        : 'border-[var(--border-default)] text-[var(--ink-2)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <span className="leading-none">{opt.icon}</span>
                    <span>{opt.label}</span>
                    {on && <span className="text-[9px]">✓</span>}
                  </button>
                );
              };
              const Chip = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--green-bg)] border border-[var(--green-border)] text-[var(--green-dark)] px-2 py-0.5 text-[10px] font-medium">
                  <span className="leading-none">{icon}</span>{label}
                </span>
              );
              const chosenFreq = FREQ_OPTS.filter((o) => reportPrefs.freq.includes(o.k));
              const chosenVia = VIA_OPTS.filter((o) => reportPrefs.via.includes(o.k));
              return (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-semibold text-[var(--gold-text-strong)] bg-[var(--gold-bg)] border border-[var(--gold)] rounded-full px-2 py-0.5">
                      {L('قريباً', 'Coming soon')}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--ink-2)] leading-relaxed mb-3">
                    {L(
                      'سنرسل لك خلاصة وضعك المالي تلقائياً — وستبدأ رحلتها إليك فور إطلاق الميزة.',
                      "We'll send your financial summary automatically — deliveries begin the moment the feature ships."
                    )}
                  </p>
                  {reportEdit ? (
                    <>
                      <div className="mb-3">
                        <div className="text-[11px] text-[var(--muted)] mb-1.5">{L('التكرار', 'Frequency')}</div>
                        <div className="flex flex-wrap gap-1.5">{FREQ_OPTS.map((o) => <Pill key={o.k} group="freq" opt={o} />)}</div>
                      </div>
                      <div className="mb-3">
                        <div className="text-[11px] text-[var(--muted)] mb-1.5">{L('الوسيلة', 'Channel')}</div>
                        <div className="flex flex-wrap gap-1.5">{VIA_OPTS.map((o) => <Pill key={o.k} group="via" opt={o} />)}</div>
                      </div>
                      <button
                        onClick={() => setReportEdit(false)}
                        className="text-xs font-medium text-white bg-[var(--green-dark)] rounded-lg px-3 py-1.5"
                      >
                        {L('تم ✓', 'Done ✓')}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-col gap-2 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] text-[var(--muted)] w-14 shrink-0">{L('التكرار', 'Frequency')}</span>
                          {chosenFreq.length > 0
                            ? chosenFreq.map((o) => <Chip key={o.k} icon={o.icon} label={o.label} />)
                            : <span className="text-[11px] text-[var(--muted)] opacity-60">{L('لم يُحدَّد بعد', 'Not set yet')}</span>}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] text-[var(--muted)] w-14 shrink-0">{L('الوسيلة', 'Channel')}</span>
                          {chosenVia.length > 0
                            ? chosenVia.map((o) => <Chip key={o.k} icon={o.icon} label={o.label} />)
                            : <span className="text-[11px] text-[var(--muted)] opacity-60">{L('لم تُحدَّد بعد', 'Not set yet')}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => setReportEdit(true)}
                        className="text-xs font-medium text-[var(--green-dark)] bg-[var(--green-bg)] border border-[var(--green-border)] rounded-lg px-3 py-1.5"
                      >
                        {L('تعديل التفضيلات', 'Edit preferences')}
                      </button>
                    </>
                  )}
                </>
              );
            })()}
          </SpaceTile>

          {/* help & contact */}
          <SpaceTile icon="💬" title={L('المساعدة والتواصل', 'Help & contact')}>
            <p className="text-xs text-[var(--ink-2)] leading-relaxed mb-3">
              {L(
                'سؤال، ملاحظة، استفسار استثماري، أو فرصة شراكة؟ يسعدنا أن نسمع منك.',
                'A question, feedback, an investment inquiry, or a partnership? We’d love to hear from you.'
              )}
            </p>
            <button
              onClick={() => setContactOpen(true)}
              className="text-xs font-medium text-[var(--green-dark)] bg-[var(--green-bg)] border border-[var(--green-border)] rounded-lg px-3 py-1.5"
            >
              {t('common.contactUs')}
            </button>
          </SpaceTile>
        </div>
      </div>

      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} source="home" />
    </div>
  );
}

// The official WhatsApp glyph, drawn inline so the channel pill can carry
// the real mark instead of a stand-in emoji.
function WhatsAppGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#25D366]" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2a9.9 9.9 0 0 0-8.4 15.1L2 22l5.05-1.6A9.9 9.9 0 1 0 12.04 2Zm0 18a8.1 8.1 0 0 1-4.1-1.1l-.3-.18-3 .95.96-2.92-.2-.3a8.1 8.1 0 1 1 6.64 3.55Zm4.44-6.07c-.24-.12-1.43-.7-1.65-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06a6.6 6.6 0 0 1-1.94-1.2 7.3 7.3 0 0 1-1.34-1.67c-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.1.16 1.52.1.46-.07 1.43-.58 1.63-1.15.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z" />
    </svg>
  );
}

function Balance({ label, value, dot }: { label: string; value: string; dot: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="w-2 h-2 rounded-full" style={{ background: dot }} />
        <span className="text-[10px] text-white/45">{label}</span>
      </div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-white/45 mb-1">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

// The "where you stand now" strip on the profile card: the diagnosed
// quadrant plus one sentence on what being there means. Links to the Today
// dashboard, where the full quadrant map lives.
function QuadrantStat({ quad, ar }: { quad: QuadKey; ar: boolean }) {
  const meta = QUADRANT_META[quad];
  const c = ar ? meta.ar : meta.en;
  return (
    <div className="flex-1 min-w-[240px]">
      <div className="text-[10px] text-white/45 mb-1">{ar ? 'أين تقف الآن' : 'Where you stand now'}</div>
      <div className="text-sm font-semibold flex items-center gap-1.5 flex-wrap">
        <span>{meta.icon}</span>
        <span>{c.title}</span>
        <Link href="/today" className="text-[10px] font-normal text-[var(--gold)] hover:underline ms-1">
          {ar ? 'الخريطة كاملة ←' : 'Full map →'}
        </Link>
      </div>
      <p className="text-[11px] text-white/60 leading-relaxed mt-1 max-w-md">{c.meaning}</p>
    </div>
  );
}

function MissionStat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <div className="font-serif text-xl font-bold text-[var(--green-dark)]">{n}</div>
      <div className="text-[10px] text-[var(--muted)]">{label}</div>
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

function SpaceTile({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">{icon}</span>
        <span className="text-sm font-semibold text-[var(--ink)]">{title}</span>
      </div>
      {children}
    </div>
  );
}

function InfoLine({ label, value, mono, badge, badgeColor }: { label: string; value: string; mono?: boolean; badge?: boolean; badgeColor?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-[var(--muted)] shrink-0">{label}</span>
      {badge ? (
        <span className="font-semibold px-2 py-0.5 rounded-full text-[10px]" style={{ color: badgeColor, background: `${badgeColor}22` }}>{value}</span>
      ) : (
        <span className={`text-[var(--ink)] font-medium truncate ${mono ? 'font-mono text-[11px]' : ''}`} dir={mono ? 'ltr' : undefined}>{value}</span>
      )}
    </div>
  );
}
