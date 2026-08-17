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
import { TOOLS, toolsUnlockedAt, type ViewKey } from '@/lib/toolbox';
import HajisBlock from '@/components/shared/HajisBlock';
import type { DepthLevel } from '@/lib/depth';
import { isDemoActive } from '@/lib/demoSupabase';
import { diagnoseQuadrant, QUADRANT_META, type QuadKey } from '@/lib/quadrant';
import { demoAr } from '@/lib/demoI18n';
import { futureValue, DEFAULT_RETURN } from '@/lib/dailyStack';
import ContactModal from '@/components/shared/ContactModal';
import FoundationHub from '@/components/home/FoundationHub';
import LogTile from '@/components/home/LogTile';

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
  const { drive } = useDrive();
  const { depth, setDepth } = useDepth();
  // The home grid staging: each depth is its OWN view, composed for its
  // audience — not a downward extension of the one above.
  //   D1 التركيز   — the hājis alone, nothing pulling at the eye
  //   D2 الضبط     — the control room: where you stand · next move · the
  //                  three time doors · concerns as a compact strip
  //   D3 التحليل   — the analysis desk: the numbers snapshot · the four
  //                  foundation elements · this depth's analysis tools
  //   D4 الاحتراف  — the pro cockpit: snapshot + standing + the FULL tool
  //                  matrix + your space + who we are
  // Symmetric on web and phone; fingers dive by pulling past the page edge.
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const sar = t('common.sar');
  const money = (n: number) => (ar ? `${fmt(n)} ${sar}` : `${sar} ${fmt(n)}`);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [quad, setQuad] = useState<QuadKey | null>(null);
  const [fin, setFin] = useState<Financials | null>(null);
  const [prevNw, setPrevNw] = useState<number | null>(null);
  const [goalCount, setGoalCount] = useState(0);
  // The hājis (biggest concerns) moved into the shared HajisBlock — one
  // source for home and Today (T2 · D1).

  // Rotates the curated next action once per visit, so the opening moment
  // feels alive every time the product is opened.
  const [visitIdx, setVisitIdx] = useState(0);
  useEffect(() => {
    try {
      const n = (Number(window.localStorage.getItem('mm-action-visit')) || 0) + 1;
      window.localStorage.setItem('mm-action-visit', String(n));
      setVisitIdx(n);
    } catch { /* ignore */ }
  }, []);
  const [account, setAccount] = useState<Account | null>(null);
  const [integ, setInteg] = useState<Integrations | null>(null);
  const [loading, setLoading] = useState(true);
  const [contactOpen, setContactOpen] = useState(false);

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
      if (snaps.length >= 2) {
        const p = snaps[snaps.length - 2];
        setPrevNw(
          Number(p.cash) + Number(p.stocks) + Number(p.real_estate) + Number(p.equity) + Number(p.other_assets) - Number(p.liabilities)
        );
      } else setPrevNw(null);
    } else {
      setFin(null);
      setQuad(null);
      setPrevNw(null);
    }

    try {
      const { data: gf } = await supabase.from('goal_funds').select('id').eq('user_id', user.id);
      setGoalCount(Array.isArray(gf) ? gf.length : 0);
    } catch { setGoalCount(0); }

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

      {/* the drive decides what leads: story-driven (and both) open with the
          hājis; numbers-driven open with the standing tile — CSS order flips
          the two without touching the DOM */}
      <div className="flex flex-col">
      {depth <= 2 && (
      <div style={{ order: drive === 'numbers' || depth === 2 ? 2 : 1 }}>
      {/* the hajis: hero at D1, compact strip at D2 */}
      <HajisBlock fin={fin} mode={depth === 2 ? 'strip' : 'hero'} />
      </div>
      )}

      {/* the standing tile leads the D2 control room and returns in the D4
          cockpit; numbers-driven readers keep it at D1 too (their drive
          hides the hājis story surface, which would leave D1 empty) */}
      {(depth === 2 || depth === 4 || (depth === 1 && drive === 'numbers')) && (
      <div style={{ order: drive === 'numbers' || depth >= 2 ? 1 : 2 }}>
      {/* ── the opening moment: where you stand · next actionable item ── */}
      {fin && (() => {
        const surplus = fin.income - fin.expenses;
        const nwDelta = prevNw !== null ? fin.netWorth - prevNw : null;
        const qc = quad ? (ar ? QUADRANT_META[quad].ar : QUADRANT_META[quad].en) : null;

        // Curated next actions — every applicable rule joins the pool, and
        // the visit counter rotates which one greets you today.
        const pool: { icon: string; title: string; body: string; cta: string; href: string }[] = [];
        if (surplus < 0) {
          pool.push({
            icon: '🩸',
            title: L('أوقف نزيف هذا الشهر', "Stop this month's bleed"),
            body: L(
              `مصروفك تجاوز دخلك بـ${money(Math.abs(surplus))} هذا الشهر. افتح كومة اليوم وقلّم اختياراً واحداً متكرراً — الصغير المتكرر أخطر من الكبير العابر.`,
              `Spending beat income by ${money(Math.abs(surplus))} this month. Open the Daily Stack and trim one recurring choice — the small repeating one outweighs the big one-off.`
            ),
            cta: L('افتح كومة اليوم ←', 'Open the Daily Stack →'), href: '/daily-stack',
          });
        }
        if (surplus > 0) {
          pool.push({
            icon: '❄️',
            title: L('كرة الثلج تنتظر فائضك', 'Your surplus wants to snowball'),
            body: L(
              `فائض هذا الشهر ${money(surplus)}. لو تكرر واستُثمر، يصبح نحو ${money(futureValue(surplus, 20, DEFAULT_RETURN))} خلال ٢٠ سنة — حوّله قبل أن يراه المصروف.`,
              `This month's surplus is ${money(surplus)}. Repeated and invested, it becomes about ${money(futureValue(surplus, 20, DEFAULT_RETURN))} in 20 years — move it before spending sees it.`
            ),
            cta: L('شاهد سرعة مالك ←', 'See your money’s velocity →'), href: '/velocity',
          });
        }
        if (fin.cash > 6 * Math.max(1, fin.expenses)) {
          pool.push({
            icon: '🧊',
            title: L('نقدك الخامل يذوب بهدوء', 'Your idle cash is quietly melting'),
            body: L(
              `${money(fin.cash)} نقداً — أكثر من ستة أشهر مصاريف. ما فوق الطوارئ يخسر قيمته للتضخم كل سنة؛ فكّر في تشغيل جزء منه.`,
              `${money(fin.cash)} in cash — over six months of costs. Whatever exceeds the emergency cushion loses value to inflation yearly; consider putting part to work.`
            ),
            cta: L('قارن أين يعمل الريال ←', 'Compare where the riyal works →'), href: '/compare',
          });
        }
        if (goalCount === 0) {
          pool.push({
            icon: '🎯',
            title: L('حلمك الكبير بلا اسم بعد', 'Your big dream has no name yet'),
            body: L(
              'الهدف الذي له اسمٌ ورقمٌ شهري يتحقق؛ والنية الغامضة لا تتحقق. سمِّ خطوتك الكبيرة القادمة — عمرة، دفعة أولى، سنة تفرّغ — وأعطها وتيرة.',
              'A goal with a name and a monthly number gets funded; a vague intention does not. Name your next big thing — a down payment, a sabbatical — and give it a pace.'
            ),
            cta: L('ابدأ صندوق هدف ←', 'Start a goal fund →'), href: '/goal-fund',
          });
        }
        pool.push({
          icon: '🔭',
          title: L('تأمل: أين تقف بعد خمس سنوات؟', 'Contemplate: where do you stand in five years?'),
          body: L(
            'خذ دقيقة مع «ماذا لو»: جرّب علاوة، أو سكناً أرخص، أو استثماراً شهرياً — وشاهد أثر القرار على مستقبلك بالأرقام قبل أن تعيشه.',
            'Take a minute with What-If: try a raise, cheaper housing, or monthly investing — and watch the decision reshape your future in numbers before you live it.'
          ),
          cta: L('افتح ماذا لو ←', 'Open What-If →'), href: '/what-if',
        });
        const action = pool[visitIdx % pool.length];

        // A rotating provocation — one idea per visit that grows general
        // financial literacy, not tied to the user's own numbers.
        const NUGGETS: { ar: string; en: string }[] = [
          {
            ar: 'قاعدة ٧٢: اقسم ٧٢ على العائد السنوي تعرف كم سنة يحتاج مالك ليتضاعف — عند ٧٪ يتضاعف كل ~١٠ سنوات.',
            en: 'The Rule of 72: divide 72 by the annual return to know how many years money needs to double — at 7% it doubles every ~10 years.',
          },
          {
            ar: 'التضخم ضريبةٌ صامتة: ٣٪ سنوياً تكفي لتبخير نصف قوة نقدك الراكد خلال ٢٣ سنة.',
            en: 'Inflation is a silent tax: 3% a year is enough to evaporate half your idle cash’s power in 23 years.',
          },
          {
            ar: 'تكلفة الفرصة: ثمن أي شيء ليس سعره، بل ما كان سيصيره ذلك المال لو بقي يعمل.',
            en: 'Opportunity cost: the price of anything is not its tag — it is what that money would have become had it kept working.',
          },
          {
            ar: 'الفائدة المركّبة تعمل في الاتجاهين: من يفهمها يكسبها، ومن يتجاهلها يدفعها لغيره.',
            en: 'Compound interest works both ways: those who understand it earn it; those who ignore it pay it to someone else.',
          },
          {
            ar: 'متوسط التكلفة: مبلغ ثابت يُستثمر كل شهر يشتري تلقائياً أكثر حين تهبط السوق — الانضباط يغلب التوقيت.',
            en: 'Cost averaging: a fixed monthly investment automatically buys more when markets fall — discipline beats timing.',
          },
          {
            ar: 'الدخل ليس ثروة: الثروة ما يبقى ويعمل بعد المصروف؛ كم من صاحب دخلٍ مرتفع فقيرٌ في ميزانيته العمومية.',
            en: 'Income is not wealth: wealth is what stays and works after spending — many high earners are balance-sheet poor.',
          },
          {
            ar: 'قاعدة ٤٪: كل ألف ريال من مصروفك الشهري تحتاج نحو ٣٠٠ ألف مستثمرة لتغطيها إلى الأبد.',
            en: 'The 4% rule: every SAR 1,000 of monthly spending needs about SAR 300K invested to cover it forever.',
          },
          {
            ar: 'أول مئة ألف هي الأصعب — بعدها يبدأ التراكم يحمل معك طرف الحِمل.',
            en: 'The first hundred thousand is the hardest — after it, compounding starts carrying its share of the load.',
          },
          {
            ar: 'خطر التسلسل: متوسط عائد جيد قد يُفلسك إن جاءت السنوات السيئة أولاً وأنت تسحب منه.',
            en: 'Sequence risk: a good average return can still ruin you if the bad years come first while you are withdrawing.',
          },
          {
            ar: 'سيولةٌ بلا عائد أمانٌ يذوب، وعائدٌ بلا سيولة قيدٌ يخنق — الحكمة في النسبة لا في التطرف.',
            en: 'Liquidity without return is safety that melts; return without liquidity is a chain that chokes — wisdom is in the ratio, not the extreme.',
          },
        ];
        const nugget = NUGGETS[visitIdx % NUGGETS.length];

        return (
          <div className="bg-[var(--surface-card)] border border-[var(--gold)]/40 rounded-2xl mt-4 mb-6 grid md:grid-cols-2 overflow-hidden">
            {/* where you stand as of today */}
            <div className="drv-num p-5">
              <div className="text-[10px] tracking-[0.12em] uppercase text-[var(--gold)] font-semibold mb-2.5">
                {L('أين تقف اليوم', 'Where you stand today')}
              </div>
              <div className="flex items-baseline gap-2.5 flex-wrap mb-1">
                <span className="font-serif text-3xl font-bold" style={{ color: fin.netWorth >= 0 ? 'var(--ink)' : 'var(--red-2)' }}>
                  {money(fin.netWorth)}
                </span>
                {nwDelta !== null && nwDelta !== 0 && (
                  <span className={`text-xs font-semibold ${nwDelta > 0 ? 'text-[var(--green-dark)]' : 'text-[var(--red-2)]'}`}>
                    {nwDelta > 0 ? '▲' : '▼'} {money(Math.abs(nwDelta))} {L('عن الشهر الماضي', 'vs last month')}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[var(--muted)] mb-3">{L('صافي ثروتك الآن', 'Your net worth right now')}</div>
              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                {qc && quad && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-1)] border border-[var(--border-default)] px-2.5 py-1 text-[var(--ink-2)]">
                    {QUADRANT_META[quad].icon} {qc.title}
                  </span>
                )}
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 border ${
                  surplus >= 0
                    ? 'bg-[var(--green-bg)] border-[var(--green-border)] text-[var(--green-dark)]'
                    : 'bg-[var(--gold-bg)] border-[var(--gold)]/40 text-[var(--gold-text-alt)]'
                }`}>
                  {surplus >= 0 ? L(`فائض الشهر ${money(surplus)}`, `Month's surplus ${money(surplus)}`) : L(`عجز الشهر ${money(Math.abs(surplus))}`, `Month's deficit ${money(Math.abs(surplus))}`)}
                </span>
              </div>
            </div>

            {/* next actionable item — divided by a line, rotating every visit */}
            <div className="drv-story p-5 border-t md:border-t-0 md:border-s border-[var(--border-default)]">
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="text-[10px] tracking-[0.12em] uppercase text-[var(--gold)] font-semibold">
                  {L('خطوتك التالية', 'Next actionable item')}
                </div>
                <span className="text-[9px] text-[var(--muted)]">{L('تتجدد مع كل زيارة', 'refreshes every visit')}</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-xl shrink-0">{action.icon}</span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[var(--ink)] mb-1">{action.title}</div>
                  <p className="text-[11px] text-[var(--ink-2)] leading-relaxed mb-2.5">{action.body}</p>
                  <Link href={action.href} className="inline-block text-xs font-semibold text-[var(--green-dark)] bg-[var(--green-bg)] border border-[var(--green-border)] rounded-lg px-3 py-1.5">
                    {action.cta}
                  </Link>
                </div>
              </div>
            </div>

            {/* a provocation for the financially curious — rotates per visit */}
            <div className="drv-story md:col-span-2 border-t border-[var(--border-default)] px-5 py-3 flex items-start gap-2.5 bg-[var(--surface-0)]/40">
              <span className="text-sm shrink-0 mt-px">💡</span>
              <p className="text-[11px] leading-relaxed text-[var(--ink-2)] min-w-0">
                <span className="text-[10px] tracking-[0.1em] uppercase text-[var(--gold)] font-semibold me-2">{L('إثراء', 'Enrich')}</span>
                {ar ? nugget.ar : nugget.en}
              </p>
            </div>
          </div>
        );
      })()}
      </div>
      )}
      </div>

      {/* ── personal snapshot — leads the D3 analysis desk, returns in D4 ── */}
      {depth >= 3 && (
      <div data-tour="profile-card" className="drv-num bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] rounded-2xl p-6 my-6 text-white relative">
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
      )}

      {/* ── the three front doors — the D2 control room's exits ── */}
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

      {/* ── mission band — D4 ── */}
      {depth === 4 && (
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

      {/* ── the foundation: enter · review · link the data everything reads — the D3 desk ── */}
      {depth === 3 && <FoundationHub />}

      {/* ── the Log: every number on one spreadsheet-like grid — the D3 desk ── */}
      {depth === 3 && <LogTile />}

      {/* ── this depth's analysis instruments — the D3 desk's toolbelt ── */}
      {depth === 3 && <DepthToolShelf level={3} />}

      {/* ── the FULL tool matrix — the D4 cockpit's command wall ── */}
      {depth === 4 && <FullToolMatrix />}

      {/* ── why we exist: problem → answer — D4 ── */}
      {depth === 4 && (
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

      {/* ── your space: profile · account · integrations · settings — the D4 cockpit ── */}
      {depth === 4 && (
      <div className="mb-4">
        <SectionHeading eyebrow={L('مساحتك', 'Your space')} />
        <div className="grid sm:grid-cols-2 gap-3">
          {/* you: profile + account + settings, merged into one tile */}
          <SpaceTile icon="🪪" title={L('حسابك', 'Your account')} className="sm:col-span-2 relative">
            {/* sign out — a power button in the corner */}
            <button
              onClick={handleSignOut}
              title={t('common.signOut')}
              aria-label={t('common.signOut')}
              className="absolute top-4 end-4 w-8 h-8 rounded-full border border-[var(--border-default)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--red-dark-text)] hover:border-[var(--red-2)] transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M12 3v8" />
                <path d="M6.3 6.5a8 8 0 1 0 11.4 0" />
              </svg>
            </button>
            <div className="grid md:grid-cols-3 gap-x-6 gap-y-4">
              {/* who you are */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--green-bg)] border border-[var(--green-border)] flex items-center justify-center text-sm font-semibold text-[var(--green-dark)] shrink-0">
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[var(--ink)] truncate">{localizedFirstName(profile.name, ar)}</div>
                    <div className="text-[11px] text-[var(--muted)] truncate">
                      {[demoAr(profile.employment, ar), demoAr(profile.city, ar), lifeStageLabel(profile.life_stage)].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                </div>
                <button onClick={openEditProfile} className="text-xs font-medium text-[var(--green-dark)] bg-[var(--green-bg)] border border-[var(--green-border)] rounded-lg px-3 py-1.5">
                  {t('common.editProfile')}
                </button>
              </div>

              {/* account facts */}
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

              {/* preferences */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[11px] text-[var(--muted)] w-12 shrink-0">{t('common.language')}</span>
                  <div className="inline-flex border border-[var(--border-default)] rounded-lg overflow-hidden">
                    <button onClick={() => setLocale('en')} className={`px-2.5 py-1 text-[11px] font-medium ${!ar ? 'bg-[var(--ink)] text-[var(--surface-0)]' : 'text-[var(--ink-2)]'}`}>English</button>
                    <button onClick={() => setLocale('ar')} className={`px-2.5 py-1 text-[11px] font-medium ${ar ? 'bg-[var(--ink)] text-[var(--surface-0)]' : 'text-[var(--ink-2)]'}`}>العربية</button>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[11px] text-[var(--muted)] w-12 shrink-0">{L('المظهر', 'Theme')}</span>
                  <div className="inline-flex border border-[var(--border-default)] rounded-lg overflow-hidden">
                    <button onClick={() => { if (theme !== 'light') toggleTheme(); }} className={`px-2.5 py-1 text-[11px] font-medium flex items-center gap-1 ${theme === 'light' ? 'bg-[var(--ink)] text-[var(--surface-0)]' : 'text-[var(--ink-2)]'}`}>☀ {L('فاتح', 'Light')}</button>
                    <button onClick={() => { if (theme !== 'dark') toggleTheme(); }} className={`px-2.5 py-1 text-[11px] font-medium flex items-center gap-1 ${theme === 'dark' ? 'bg-[var(--ink)] text-[var(--surface-0)]' : 'text-[var(--ink-2)]'}`}>☾ {L('داكن', 'Dark')}</button>
                  </div>
                </div>
              </div>
            </div>
          </SpaceTile>

          {/* periodic reports — a bigger feature, so it takes the full row */}
          <SpaceTile icon="📬" title={L('التقارير الدورية', 'Periodic reports')} className="sm:col-span-2">
            <ReportsTile />
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

          {/* help & contact — small and to the point, pairing with integrations */}
          <SpaceTile icon="💬" title={L('المساعدة والتواصل', 'Help & contact')}>
            <p className="text-xs text-[var(--ink-2)] leading-relaxed mb-3">
              {L('سؤال، ملاحظة، استفسار استثماري، أو شراكة؟ يسعدنا أن نسمع منك.', 'A question, feedback, an investment inquiry, or a partnership? We’d love to hear from you.')}
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
      )}

      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} source="home" />
    </div>
  );
}

// ── Periodic reports: reminders-grade scheduling, saved for the delivery
// engine. Frequencies can carry precise rules — which weekdays, first/last/
// specific day of the month, anchored to salary day (on/before/after), a
// period edge for quarterly/annual, and an optional start/end window.
interface ReportPrefs {
  freq: string[];
  via: string[];
  dailyTime: string; // HH:mm — when the daily digest goes out
  weekDays: number[]; // 0 = Sunday … 6 = Saturday
  monthlyOn: 'first' | 'last' | 'day' | 'salary' | null;
  monthlyDay: number;
  salaryRel: 'on' | 'before' | 'after';
  salaryDay: number; // typically the 27th in Saudi Arabia
  quarterlyOn: 'first' | 'last' | null;
  annualOn: 'date' | 'last' | null; // a specific date, or the year's last day
  annualMonth: number; // 1..12
  annualDay: number; // 1..28
  detail: 'simple' | 'detailed' | 'extreme' | null;
}

const REPORT_DEFAULTS: ReportPrefs = {
  freq: [], via: [], dailyTime: '18:00', weekDays: [], monthlyOn: null, monthlyDay: 15,
  salaryRel: 'on', salaryDay: 27, quarterlyOn: null, annualOn: null, annualMonth: 1, annualDay: 1,
  detail: null,
};

function ReportsTile() {
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const [p, setP] = useState<ReportPrefs>(REPORT_DEFAULTS);
  const [edit, setEdit] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('mm-report-prefs');
      if (raw) setP({ ...REPORT_DEFAULTS, ...JSON.parse(raw) });
    } catch { /* ignore */ }
  }, []);
  // Functional updates only — handlers rendered a moment ago must never
  // clobber a change that landed in between.
  const save = (updater: (prev: ReportPrefs) => ReportPrefs) => {
    setP((prev) => {
      const next = updater(prev);
      try { window.localStorage.setItem('mm-report-prefs', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };
  const patch = (part: Partial<ReportPrefs>) => save((prev) => ({ ...prev, ...part }));
  const toggleIn = (key: 'freq' | 'via', v: string) =>
    save((prev) => ({ ...prev, [key]: prev[key].includes(v) ? prev[key].filter((x) => x !== v) : [...prev[key], v] }));
  const toggleDay = (d: number) =>
    save((prev) => ({ ...prev, weekDays: prev.weekDays.includes(d) ? prev.weekDays.filter((x) => x !== d) : [...prev.weekDays, d].sort() }));

  const FREQ_OPTS = [
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
  const DETAIL_OPTS: { k: ReportPrefs['detail'] & string; icon: string; label: string; desc: string }[] = [
    {
      k: 'simple', icon: '🪶', label: L('بسيط جداً', 'Super simple'),
      desc: L(
        'أرقامك الثلاثة فقط: صافي الثروة، الداخل مقابل الخارج هذا الشهر، وجملة واحدة من العقل — يُقرأ في ثلاثين ثانية.',
        'Just your three numbers: net worth, money in vs out this month, and one sentence from the Brain — a thirty-second read.'
      ),
    },
    {
      k: 'detailed', icon: '📄', label: L('مفصّل', 'Detailed'),
      desc: L(
        'الملخص، وأين تقف، وأهم نسبك المالية، وتقدّم أهدافك، وتنبيهات المخاطر — صفحة واحدة مركّزة.',
        'The summary plus where you stand, your key ratios, goal progress, and risk alerts — one focused page.'
      ),
    },
    {
      k: 'extreme', icon: '📚', label: L('مفصّل للغاية', 'Extremely detailed'),
      desc: L(
        'كل شيء: تحليل البنود كاملاً، مقارنتك بالأقران، تكوين أصولك، خطة حريتك المالية، وتوصيات العقل التفصيلية — تقرير يقرؤه محترف.',
        "Everything: full line-item analysis, peer comparison, asset composition, your freedom plan, and the Brain's detailed recommendations — the report a pro reads."
      ),
    },
  ];
  const DAY_FULL = ar
    ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const DAY_SHORT = ar ? ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const Pill = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] transition-all ${
        on
          ? 'bg-[var(--green-bg)] border-[var(--green)] text-[var(--green-dark)] font-semibold shadow-sm'
          : 'border-[var(--border-default)] text-[var(--ink-2)] hover:border-[var(--border-strong)]'
      }`}
    >
      {children}
      {on && <span className="text-[9px]">✓</span>}
    </button>
  );
  const Chip = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--green-bg)] border border-[var(--green-border)] text-[var(--green-dark)] px-2 py-0.5 text-[10px] font-medium">
      <span className="leading-none">{icon}</span>{label}
    </span>
  );
  const GroupLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="text-[11px] text-[var(--muted)] mb-1.5">{children}</div>
  );
  const daySelect = (value: number, onChange: (n: number) => void) => (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="bg-[var(--surface-1)] border border-[var(--border-default)] rounded-lg px-2 py-1 text-[11px] text-[var(--ink)]"
      dir="ltr"
    >
      {Array.from({ length: 28 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
    </select>
  );

  const GMONTHS = ar
    ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // The schedule, humanized for the summary view.
  const scheduleLines: string[] = [];
  if (p.freq.includes('daily') && p.dailyTime) {
    scheduleLines.push(L(`اليومي: الساعة ${p.dailyTime}`, `Daily: at ${p.dailyTime}`));
  }
  if (p.freq.includes('weekly') && p.weekDays.length > 0) {
    scheduleLines.push(L('أيام: ', 'Days: ') + p.weekDays.map((d) => DAY_FULL[d]).join(ar ? '، ' : ', '));
  }
  if (p.freq.includes('monthly') && p.monthlyOn) {
    const m = p.monthlyOn === 'first' ? L('أول يوم في الشهر', 'first day of the month')
      : p.monthlyOn === 'last' ? L('آخر يوم في الشهر', 'last day of the month')
      : p.monthlyOn === 'day' ? L(`اليوم ${p.monthlyDay} من الشهر`, `day ${p.monthlyDay} of the month`)
      : p.salaryRel === 'on' ? L(`في يوم الراتب (${p.salaryDay})`, `on salary day (${p.salaryDay})`)
      : p.salaryRel === 'before' ? L(`قبل يوم الراتب (${p.salaryDay})`, `before salary day (${p.salaryDay})`)
      : L(`بعد يوم الراتب (${p.salaryDay})`, `after salary day (${p.salaryDay})`);
    scheduleLines.push(L('الشهري: ', 'Monthly: ') + m);
  }
  if (p.freq.includes('quarterly') && p.quarterlyOn) {
    scheduleLines.push(
      L('الربع سنوي: ', 'Quarterly: ') +
      (p.quarterlyOn === 'first' ? L('أول يوم في الربع', 'first day of the quarter') : L('آخر يوم في الربع', 'last day of the quarter'))
    );
  }
  if (p.freq.includes('annual') && p.annualOn) {
    scheduleLines.push(
      L('السنوي: ', 'Annual: ') +
      (p.annualOn === 'last'
        ? L('آخر يوم في السنة', 'the last day of the year')
        : L(`${p.annualDay} ${GMONTHS[p.annualMonth - 1]}`, `${GMONTHS[p.annualMonth - 1]} ${p.annualDay}`))
    );
  }

  const chosenFreq = FREQ_OPTS.filter((o) => p.freq.includes(o.k));
  const chosenVia = VIA_OPTS.filter((o) => p.via.includes(o.k));

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

      {edit ? (
        <>
          {/* horizontal editor: channels & cadence · timing rules · detail */}
          <div className="grid md:grid-cols-3 gap-x-6 gap-y-1 items-start">
          <div>
          <div className="mb-3">
            <GroupLabel>{L('الوسيلة', 'Channel')}</GroupLabel>
            <div className="flex flex-wrap gap-1.5">
              {VIA_OPTS.map((o) => (
                <Pill key={o.k} on={p.via.includes(o.k)} onClick={() => toggleIn('via', o.k)}>
                  <span className="leading-none">{o.icon}</span><span>{o.label}</span>
                </Pill>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <GroupLabel>{L('التكرار', 'Frequency')}</GroupLabel>
            <div className="flex flex-wrap gap-1.5">
              {FREQ_OPTS.map((o) => (
                <Pill key={o.k} on={p.freq.includes(o.k)} onClick={() => toggleIn('freq', o.k)}>
                  <span className="leading-none">{o.icon}</span><span>{o.label}</span>
                </Pill>
              ))}
            </div>
          </div>

          </div>

          <div>
          {p.freq.length === 0 && (
            <p className="text-[11px] text-[var(--muted)] leading-relaxed mt-1">
              {L('اختر تكراراً وستظهر خيارات توقيته الدقيقة هنا.', 'Pick a frequency and its precise timing options appear here.')}
            </p>
          )}
          {p.freq.includes('daily') && (
            <div className="mb-3">
              <GroupLabel>{L('في أي وقت من اليوم؟', 'What time of day?')}</GroupLabel>
              <input
                type="time" value={p.dailyTime} dir="ltr"
                onChange={(e) => patch({ dailyTime: e.target.value || '18:00' })}
                className="bg-[var(--surface-1)] border border-[var(--border-default)] rounded-lg px-2.5 py-1.5 text-[11px] text-[var(--ink)]"
              />
            </div>
          )}

          {p.freq.includes('weekly') && (
            <div className="mb-3">
              <GroupLabel>{L('أي أيام الأسبوع؟', 'Which weekdays?')}</GroupLabel>
              <div className="flex gap-1" dir={ar ? 'rtl' : 'ltr'}>
                {DAY_SHORT.map((d, i) => (
                  <button
                    key={i}
                    onClick={() => toggleDay(i)}
                    title={DAY_FULL[i]}
                    aria-pressed={p.weekDays.includes(i)}
                    className={`w-7 h-7 rounded-full text-[10px] font-semibold border transition-all ${
                      p.weekDays.includes(i)
                        ? 'bg-[var(--green-dark)] text-white border-[var(--green-dark)]'
                        : 'border-[var(--border-default)] text-[var(--ink-2)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {p.freq.includes('monthly') && (
            <div className="mb-3">
              <GroupLabel>{L('متى في الشهر؟', 'When in the month?')}</GroupLabel>
              <div className="flex flex-wrap gap-1.5 mb-2">
                <Pill on={p.monthlyOn === 'first'} onClick={() => patch({ monthlyOn: p.monthlyOn === 'first' ? null : 'first' })}>{L('أول الشهر', 'First day')}</Pill>
                <Pill on={p.monthlyOn === 'last'} onClick={() => patch({ monthlyOn: p.monthlyOn === 'last' ? null : 'last' })}>{L('آخر الشهر', 'Last day')}</Pill>
                <Pill on={p.monthlyOn === 'day'} onClick={() => patch({ monthlyOn: p.monthlyOn === 'day' ? null : 'day' })}>{L('يوم محدد', 'Specific day')}</Pill>
                <Pill on={p.monthlyOn === 'salary'} onClick={() => patch({ monthlyOn: p.monthlyOn === 'salary' ? null : 'salary' })}>💵 {L('يوم الراتب', 'Salary day')}</Pill>
              </div>
              {p.monthlyOn === 'day' && (
                <div className="flex items-center gap-2 text-[11px] text-[var(--ink-2)]">
                  {L('اليوم', 'Day')} {daySelect(p.monthlyDay, (n) => patch({ monthlyDay: n }))} {L('من كل شهر', 'of every month')}
                </div>
              )}
              {p.monthlyOn === 'salary' && (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    <Pill on={p.salaryRel === 'on'} onClick={() => patch({ salaryRel: 'on' })}>{L('في يومه', 'On it')}</Pill>
                    <Pill on={p.salaryRel === 'before'} onClick={() => patch({ salaryRel: 'before' })}>{L('قبله', 'Before it')}</Pill>
                    <Pill on={p.salaryRel === 'after'} onClick={() => patch({ salaryRel: 'after' })}>{L('بعده', 'After it')}</Pill>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[var(--ink-2)]">
                    {L('يوم راتبك', 'Your salary day')} {daySelect(p.salaryDay, (n) => patch({ salaryDay: n }))}
                  </div>
                </div>
              )}
            </div>
          )}

          {p.freq.includes('quarterly') && (
            <div className="mb-3">
              <GroupLabel>{L('متى في الربع؟', 'When in the quarter?')}</GroupLabel>
              <div className="flex flex-wrap gap-1.5">
                <Pill on={p.quarterlyOn === 'first'} onClick={() => patch({ quarterlyOn: p.quarterlyOn === 'first' ? null : 'first' })}>{L('أول يوم في الربع', 'First day of the quarter')}</Pill>
                <Pill on={p.quarterlyOn === 'last'} onClick={() => patch({ quarterlyOn: p.quarterlyOn === 'last' ? null : 'last' })}>{L('آخر يوم في الربع', 'Last day of the quarter')}</Pill>
              </div>
            </div>
          )}

          {p.freq.includes('annual') && (
            <div className="mb-3">
              <GroupLabel>{L('متى في السنة؟', 'When in the year?')}</GroupLabel>
              <div className="flex flex-wrap gap-1.5 mb-2">
                <Pill on={p.annualOn === 'date'} onClick={() => patch({ annualOn: p.annualOn === 'date' ? null : 'date' })}>{L('تاريخ محدد', 'A specific date')}</Pill>
                <Pill on={p.annualOn === 'last'} onClick={() => patch({ annualOn: p.annualOn === 'last' ? null : 'last' })}>{L('آخر يوم في السنة', 'Last day of the year')}</Pill>
              </div>
              {p.annualOn === 'date' && (
                <div className="flex items-center gap-2 text-[11px] text-[var(--ink-2)]">
                  {daySelect(p.annualDay, (n) => patch({ annualDay: n }))}
                  <select
                    value={p.annualMonth}
                    onChange={(e) => patch({ annualMonth: Number(e.target.value) })}
                    className="bg-[var(--surface-1)] border border-[var(--border-default)] rounded-lg px-2 py-1 text-[11px] text-[var(--ink)]"
                  >
                    {GMONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                  {L('من كل سنة', 'of every year')}
                </div>
              )}
            </div>
          )}

          </div>

          <div>
          <div className="mb-3">
            <GroupLabel>{L('مستوى التفصيل', 'Level of detail')}</GroupLabel>
            <div className="flex flex-col gap-1.5">
              {DETAIL_OPTS.map((o) => {
                const on = p.detail === o.k;
                return (
                  <button
                    key={o.k}
                    onClick={() => patch({ detail: on ? null : o.k })}
                    aria-pressed={on}
                    className={`text-start rounded-xl border p-2.5 transition-all ${
                      on
                        ? 'bg-[var(--green-bg)] border-[var(--green)] shadow-sm'
                        : 'border-[var(--border-default)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <div className={`flex items-center gap-1.5 text-[11px] font-semibold ${on ? 'text-[var(--green-dark)]' : 'text-[var(--ink)]'}`}>
                      <span>{o.icon}</span><span>{o.label}</span>
                      {on && <span className="text-[9px]">✓</span>}
                    </div>
                    <div className="text-[10px] text-[var(--muted)] leading-relaxed mt-0.5">{o.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          </div>
          </div>

          <button onClick={() => setEdit(false)} className="text-xs font-medium text-white bg-[var(--green-dark)] rounded-lg px-3 py-1.5 mt-2">
            {L('تم ✓', 'Done ✓')}
          </button>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-2 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-[var(--muted)] w-14 shrink-0">{L('الوسيلة', 'Channel')}</span>
              {chosenVia.length > 0
                ? chosenVia.map((o) => <Chip key={o.k} icon={o.icon} label={o.label} />)
                : <span className="text-[11px] text-[var(--muted)] opacity-60">{L('لم تُحدَّد بعد', 'Not set yet')}</span>}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-[var(--muted)] w-14 shrink-0">{L('التكرار', 'Frequency')}</span>
              {chosenFreq.length > 0
                ? chosenFreq.map((o) => <Chip key={o.k} icon={o.icon} label={o.label} />)
                : <span className="text-[11px] text-[var(--muted)] opacity-60">{L('لم يُحدَّد بعد', 'Not set yet')}</span>}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-[var(--muted)] w-14 shrink-0">{L('التفصيل', 'Detail')}</span>
              {p.detail
                ? (() => { const o = DETAIL_OPTS.find((x) => x.k === p.detail)!; return <Chip icon={o.icon} label={o.label} />; })()
                : <span className="text-[11px] text-[var(--muted)] opacity-60">{L('لم يُحدَّد بعد', 'Not set yet')}</span>}
            </div>
          </div>
          {scheduleLines.length > 0 && (
            <div className="text-[10px] text-[var(--muted)] leading-relaxed mb-3">
              {scheduleLines.join(' · ')}
            </div>
          )}
          <button onClick={() => setEdit(true)} className="text-xs font-medium text-[var(--green-dark)] bg-[var(--green-bg)] border border-[var(--green-border)] rounded-lg px-3 py-1.5">
            {L('تعديل التفضيلات', 'Edit preferences')}
          </button>
        </>
      )}
    </>
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

// The Saudi flag (Twemoji asset, CC-BY 4.0) — a real image, because Windows
// renders the 🇸🇦 flag emoji as plain "SA" letters.
function SaudiEmblem() {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/saudi-flag.svg" alt="🇸🇦" className="h-6 w-8 rounded-[3px] object-cover" />;
}

// The tools a given depth unlocks, laid out as this level's instruments —
// the D3 analysis desk uses it to surface its own gear instead of a longer
// page. Each chip walks straight into the tool.
function DepthToolShelf({ level }: { level: DepthLevel }) {
  const { t, locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const unlocked = toolsUnlockedAt(level);
  const VIEW_LABEL: Record<ViewKey, string> = {
    past: t('nav.past'), today: t('nav.today'), future: t('nav.future'),
  };
  const rows = (['past', 'today', 'future'] as ViewKey[]).filter((v) => unlocked[v].length > 0);
  return (
    <div className="mb-8">
      <SectionHeading
        eyebrow={L('عتاد هذا العمق', "This depth's instruments")}
        title={L('أدوات التحليل التي ينكشف عنها هذا المستوى', 'The analysis tools this level unlocks')}
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {rows.flatMap((v) =>
          unlocked[v].map((tool) => (
            <Link
              key={`${v}${tool.href}`}
              href={tool.href}
              className="group bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-3.5 hover:border-[var(--green)] transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg leading-none">{tool.icon}</span>
                <span className="text-sm font-semibold text-[var(--ink)] group-hover:text-[var(--green-dark)] transition-colors">{t(tool.titleKey)}</span>
                <span className="ms-auto text-[9px] text-[var(--muted)] border border-[var(--border-faint)] rounded-full px-2 py-0.5">{VIEW_LABEL[v]}</span>
              </div>
              <p className="text-[11px] text-[var(--muted)] leading-relaxed">{t(tool.descKey)}</p>
            </Link>
          ))
        )}
      </div>
    </div>
  );
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

function SpaceTile({ icon, title, children, className = '' }: { icon: string; title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 ${className}`}>
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
