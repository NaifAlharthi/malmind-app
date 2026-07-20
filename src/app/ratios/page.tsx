'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useProfileContext } from '@/components/shared/AppShell';
import {
  computeRatios, verdictLabel,
  type RatioResult, type FinancialSnapshot, type Category,
} from '@/lib/ratios';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import RatioViz from './RatioViz';

const CATEGORIES: (Category | 'All')[] = ['All', 'Liquidity', 'Savings', 'Debt', 'Net worth', 'Spending'];

const CAT_LABELS_AR: Record<Category | 'All', string> = {
  All: 'الكل',
  Liquidity: 'السيولة',
  Savings: 'الادّخار',
  Debt: 'الدَّين',
  'Net worth': 'صافي الثروة',
  Spending: 'الإنفاق',
};

function money(n: number, ar: boolean) {
  return ar ? `${Math.round(n).toLocaleString('en-US')} ريال` : 'SAR ' + Math.round(n).toLocaleString();
}

function monthShort(m: number, ar: boolean) {
  return new Intl.DateTimeFormat(ar ? 'ar' : 'en', { month: 'short' }).format(new Date(2020, m, 1));
}

interface IncomeRow {
  year: number;
  month: number;
  income: number;
  spending: number;
}
interface NetWorthRow {
  year: number;
  amount: number;
}

type Period = 'since-last' | 'all-time';
type ChatMessage = { role: 'user' | 'assistant'; content: string };

export default function RatiosPage() {
  const router = useRouter();
  const supabase = createClient();
  const { openEditProfile } = useProfileContext();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);

  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<FinancialSnapshot | null>(null);
  const [netWorthRows, setNetWorthRows] = useState<NetWorthRow[]>([]);
  const [incomeRows, setIncomeRows] = useState<IncomeRow[]>([]);

  const [period, setPeriod] = useState<Period>('since-last');
  const [activeCat, setActiveCat] = useState<Category | 'All'>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [synthOpen, setSynthOpen] = useState(false);
  const [synthLoading, setSynthLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [ratiosSummary, setRatiosSummary] = useState('');

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const [{ data: profile }, { data: nwData }, { data: incomeData }, { data: yearPlan }] = await Promise.all([
        supabase
          .from('profiles')
          .select('monthly_income, age, liquid_savings, monthly_debt_payments, total_debt, monthly_housing_payment, monthly_investment_contribution')
          .eq('id', user.id)
          .single(),
        supabase.from('net_worth_snapshots').select('year, amount').eq('user_id', user.id).order('year', { ascending: true }),
        supabase.from('income_entries').select('year, month, income, spending').eq('user_id', user.id).order('year', { ascending: true }).order('month', { ascending: true }),
        supabase.from('year_plans').select('monthly_expenses').eq('user_id', user.id).eq('year', new Date().getFullYear()).maybeSingle(),
      ]);

      const nwRows = (nwData as NetWorthRow[]) ?? [];
      const incRows = (incomeData as IncomeRow[]) ?? [];
      setNetWorthRows(nwRows);
      setIncomeRows(incRows);

      // Prefer real logged months; fall back to the Year Master Plan's
      // budgeted monthly expenses if nothing has been logged yet.
      const recentSpending =
        incRows.length > 0
          ? incRows.slice(-6).map((r) => Number(r.spending))
          : yearPlan?.monthly_expenses
          ? [Number(yearPlan.monthly_expenses)]
          : [];

      setSnapshot({
        monthlyIncome: profile?.monthly_income ? Number(profile.monthly_income) : null,
        age: profile?.age ?? null,
        liquidSavings: profile?.liquid_savings != null ? Number(profile.liquid_savings) : null,
        monthlyDebtPayments: profile?.monthly_debt_payments != null ? Number(profile.monthly_debt_payments) : null,
        totalDebt: profile?.total_debt != null ? Number(profile.total_debt) : null,
        monthlyHousingPayment: profile?.monthly_housing_payment != null ? Number(profile.monthly_housing_payment) : null,
        monthlyInvestmentContribution: profile?.monthly_investment_contribution != null ? Number(profile.monthly_investment_contribution) : null,
        netWorthByYear: nwRows.map((r) => ({ year: r.year, amount: Number(r.amount) })),
        recentSpending,
      });
      setLoading(false);
    })();
  }, [supabase, router]);

  const ratios = useMemo(() => (snapshot ? computeRatios(snapshot, locale) : []), [snapshot, locale]);
  const vitals = ratios.filter((r) => r.vital);
  const filtered = activeCat === 'All' ? ratios : ratios.filter((r) => r.cat === activeCat);

  // ── Answer hero: real net worth change ──
  const hero = useMemo(() => {
    if (netWorthRows.length < 2) return null;
    const latest = netWorthRows[netWorthRows.length - 1];
    const baseline = period === 'since-last' ? netWorthRows[netWorthRows.length - 2] : netWorthRows[0];
    const change = latest.amount - baseline.amount;
    const spark = period === 'since-last' ? netWorthRows.slice(-2) : netWorthRows;
    const monthsElapsed = Math.max(1, (latest.year - baseline.year) * 12);

    const savingsRatio = ratios.find((r) => r.id === 'split');
    let savedEstimate: number | null = null;
    if (savingsRatio?.ready && snapshot?.monthlyIncome) {
      savedEstimate = (savingsRatio.value! / 100) * snapshot.monthlyIncome * monthsElapsed;
    }

    return { latest, baseline, change, spark, savedEstimate };
  }, [netWorthRows, period, ratios, snapshot]);

  async function startSynthesis() {
    const readyLines = ratios
      .filter((r) => r.ready)
      .map((r) => `- ${r.title}: ${r.value}${r.unit?.startsWith('%') ? '' : ' ' + r.unit} (${verdictLabel(r.verdict!, locale)})`)
      .join('\n');
    const missingLines = ratios
      .filter((r) => !r.ready)
      .map((r) => `- ${r.title}: ${L('لا توجد بيانات كافية بعد', 'not enough data yet')} (${r.missingHint})`)
      .join('\n');
    const summary = L(
      `النسب الجاهزة:\n${readyLines || 'لا شيء بعد'}\n\nغير قابلة للحساب بعد:\n${missingLines || 'لا شيء'}`,
      `Ready ratios:\n${readyLines || 'none yet'}\n\nNot yet computable:\n${missingLines || 'none'}`
    );
    setRatiosSummary(summary);

    setSynthOpen(true);
    setSynthLoading(true);
    const initialMessages: ChatMessage[] = [
      { role: 'user', content: L(
        'رجاءً حلّل صورتي المالية الكاملة من النسب: ما الأنماط التي تراها عبر هذه النسب مجتمعةً، وما الفرص التي توحي بها، وما الأهمّ الآن؟',
        'Please analyze my complete financial ratio picture: what patterns do you see across these ratios together, what opportunities do they suggest, and what matters most right now?'
      ) },
    ];

    try {
      const res = await fetch('/api/ratios-synthesis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ratiosSummary: summary, messages: initialMessages, locale }),
      });
      const data = await res.json();
      setMessages([...initialMessages, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages([...initialMessages, { role: 'assistant', content: L('حدث خطأ في الوصول إلى محلّلك. يُرجى المحاولة مرة أخرى.', 'Something went wrong reaching your analyst. Please try again.') }]);
    }
    setSynthLoading(false);
  }

  async function sendChat(text: string) {
    if (!text.trim()) return;
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setChatInput('');
    setSynthLoading(true);
    try {
      const res = await fetch('/api/ratios-synthesis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ratiosSummary, messages: next, locale }),
      });
      const data = await res.json();
      setMessages([...next, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages([...next, { role: 'assistant', content: L('حدث خطأ في الوصول إلى محلّلك. يُرجى المحاولة مرة أخرى.', 'Something went wrong reaching your analyst. Please try again.') }]);
    }
    setSynthLoading(false);
  }

  if (loading) {
    return <div className="text-sm text-[var(--muted)]">{L('جارٍ تحميل نسبك…', 'Loading your ratios…')}</div>;
  }

  return (
    <div>
      <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--blue)] font-semibold mb-1">{L('فكّر', 'Think')}</div>
      <h1 className="font-serif text-2xl font-semibold text-[var(--ink)] mb-1">{L('النسب والإحصاءات', 'Ratios & Stats')}</h1>
      <p className="text-sm text-[var(--ink-2)] mb-6 max-w-xl">
        {L(
          'كل رقم هنا مستمدّ من سجلّك المخزَّن. النسب التي لم تفتحها بعد تُظهر ما يلزم تسجيله لرؤيتها.',
          "Every number here is drawn from your stored history. Ratios you haven't unlocked yet show what to log to see them."
        )}
      </p>

      {/* answer hero */}
      {hero ? (
        <div className="bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] rounded-2xl p-7 mb-5 relative overflow-hidden">
          <div className="text-[11px] tracking-[0.12em] uppercase text-[var(--gold)] mb-1">
            {L('السؤال الذي يعجز أغلب الناس عن إجابته', 'The question most people cannot answer')}
          </div>
          <div className="font-serif text-sm text-white/55 mb-4 max-w-lg">
            {L(
              '«كم أنت أغنى أو أفقر ممّا كنت من قبل؟» أغلب الناس يخمّنون. أنت لست مضطرّاً.',
              '"How much richer or poorer are you than you were before?" Most people guess. You don\'t have to.'
            )}
          </div>
          <div className="inline-flex gap-1 bg-white/10 rounded-lg p-1 mb-5">
            <button
              onClick={() => setPeriod('since-last')}
              className={`px-3.5 py-1.5 rounded text-xs font-medium ${period === 'since-last' ? 'bg-white/20 text-white' : 'text-white/55'}`}
            >
              {L('منذ آخر لقطة', 'Since last snapshot')}
            </button>
            <button
              onClick={() => setPeriod('all-time')}
              className={`px-3.5 py-1.5 rounded text-xs font-medium ${period === 'all-time' ? 'bg-white/20 text-white' : 'text-white/55'}`}
            >
              {L('منذ البداية', 'All-time')}
            </button>
          </div>
          <div className="grid sm:grid-cols-[1.2fr_1fr] gap-6 items-center">
            <div>
              <div className={`font-serif text-4xl font-bold mb-2 ${hero.change >= 0 ? 'text-white' : 'text-[var(--red-soft-2)]'}`}>
                {hero.change >= 0 ? '+' : '-'}{money(Math.abs(hero.change), ar)}
              </div>
              <div className="text-sm text-white/75 leading-relaxed max-w-sm">
                {L('أنت', 'You are')} <strong className="text-white font-semibold">{money(Math.abs(hero.change), ar)}</strong>{' '}
                {hero.change >= 0 ? L('أغنى', 'richer') : L('أفقر', 'poorer')} {L('ممّا كنت', 'than you were')} {period === 'since-last' ? L(`في ${hero.baseline.year}`, `in ${hero.baseline.year}`) : L(`منذ أول سجلّ لك في ${hero.baseline.year}`, `since your first record in ${hero.baseline.year}`)} — {L('من', 'from')}{' '}
                <strong className="text-white font-semibold">{money(hero.baseline.amount, ar)}</strong> {L('إلى', 'to')}{' '}
                <strong className="text-white font-semibold">{money(hero.latest.amount, ar)}</strong>.
              </div>
            </div>
            {hero.savedEstimate != null && (
              <div className="flex flex-col gap-2.5">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-white/10">
                  <span className="text-white/55">{L('مُقدَّر من الادّخار', 'Estimated from saving')}</span>
                  <span className="text-white font-serif font-semibold">{money(hero.savedEstimate, ar)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/55">{L('كل ما عدا ذلك — استثمارات، دَين، تحرّكات السوق', 'Everything else — investments, debt, market moves')}</span>
                  <span className="text-white font-serif font-semibold">{money(hero.change - hero.savedEstimate, ar)}</span>
                </div>
              </div>
            )}
          </div>
          {hero.spark.length >= 2 && (
            <div className="mt-5">
              <div className="text-[10px] text-white/40 mb-1.5">{L('صافي الثروة عبر الفترة', 'Net worth over the period')}</div>
              <NetWorthSpark points={hero.spark} positive={hero.change >= 0} />
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 mb-5 text-sm text-[var(--ink-2)]">
          {L('سجّل لقطتَي صافي ثروة على الأقل في', 'Log at least two net worth snapshots in')}{' '}
          <a href="/positioning" className="text-[var(--green-dark)] font-medium">{L('المركز المالي', 'Financial Positioning')}</a> {L('لترى كم أصبحت أغنى أو أفقر.', "to see how much richer or poorer you've become.")}
        </div>
      )}

      {/* talk to your analyst CTA */}
      {!synthOpen ? (
        <button
          data-tour="ratios-blend"
          onClick={startSynthesis}
          className="w-full bg-[var(--surface-card)] border-[1.5px] border-dashed border-[var(--green-border)] rounded-2xl p-6 mb-5 text-center hover:border-[var(--green)] hover:bg-[var(--green-bg)] transition-colors"
        >
          <div className="text-xl mb-2">M</div>
          <div className="font-serif text-lg font-semibold text-[var(--ink)] mb-1">{L('المزيج', 'The Blend')}</div>
          <div className="text-xs text-[var(--green-dark)] font-medium mb-2">{L('كل نسبة، ممزوجة في موقف واحد تجاه ماليّتك', 'Every ratio, blended into one stance on your finances')}</div>
          <div className="text-xs text-[var(--ink-2)] max-w-md mx-auto mb-3 leading-relaxed">
            {L(
              'كأنّك تسلّم قائمتك المالية الكاملة لمحلّل حقيقي وتسأل: ماذا ترى هنا فعلاً؟',
              'Like handing your complete financial statement to a real analyst and asking: what do you actually see here?'
            )}
          </div>
          <span className="inline-block bg-[var(--green-dark)] text-white text-xs font-semibold rounded-lg px-5 py-2.5">
            {L('تحدّث إلى محلّلك ←', 'Talk to your analyst →')}
          </span>
        </button>
      ) : (
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl overflow-hidden mb-5">
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--border-default)] bg-[var(--surface-0)]">
            <div className="w-8 h-8 rounded-full bg-[var(--green-dark)] flex items-center justify-center font-serif font-bold text-[var(--gold)] text-sm">M</div>
            <div>
              <div className="text-xs font-semibold text-[var(--ink)]">{L('محلّلك', 'Your analyst')}</div>
              <div className="text-[11px] text-[var(--green-dark)] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)]" />{L('يقرأ نسبك الحقيقية', 'Reading your real ratios')}
              </div>
            </div>
          </div>
          <div className="p-5 flex flex-col gap-4 max-h-[520px] overflow-y-auto">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${m.role === 'user' ? 'bg-[var(--surface-1)] text-[var(--ink-2)]' : 'bg-[var(--green-dark)] text-[var(--gold)] font-serif'}`}>
                  {m.role === 'user' ? L('أنت', 'You') : 'M'}
                </div>
                <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap ${m.role === 'user' ? 'bg-[var(--green-dark)] text-white rounded-tr-sm' : 'bg-[var(--surface-0)] text-[var(--ink-2)] rounded-tl-sm'}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {synthLoading && (
              <div className="flex gap-2.5">
                <div className="w-6 h-6 rounded-full bg-[var(--green-dark)] flex items-center justify-center text-[10px] font-bold text-[var(--gold)] font-serif shrink-0 mt-0.5">M</div>
                <div className="bg-[var(--surface-0)] rounded-2xl rounded-tl-sm px-4 py-3 text-xs text-[var(--muted)]">{L('يفكّر عبر صورتك الكاملة…', 'Reasoning across your complete picture…')}</div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 px-4 py-3 border-t border-[var(--border-default)] bg-[var(--surface-0)]">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendChat(chatInput); }}
              placeholder={L('اسأل محلّلك أيّ شيء عن هذا…', 'Ask your analyst anything about this…')}
              className="flex-1 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-full px-4 py-2 text-xs outline-none focus:border-[var(--green)]"
            />
            <button
              onClick={() => sendChat(chatInput)}
              disabled={synthLoading}
              className="w-9 h-9 rounded-full bg-[var(--green-dark)] text-white flex items-center justify-center disabled:opacity-50"
            >
              ↑
            </button>
          </div>
          <div className="text-[10px] text-[var(--muted)] leading-relaxed px-5 py-3 bg-[var(--surface-0)] border-t border-[var(--border-default)]">
            {L(
              'هذا التحليل مُولَّد من نسبك المخزَّنة، وهو للاطّلاع فقط وليس استشارة مالية مرخّصة.',
              'This analysis is generated from your stored ratios and is informational, not licensed financial advice.'
            )}
          </div>
        </div>
      )}

      {/* vitals */}
      <div data-tour="ratios-vitals" className="bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] rounded-2xl p-6 mb-6">
        <div className="text-[11px] tracking-[0.12em] uppercase text-[var(--gold)] mb-4">{L('العلامات الحيوية', 'Vital signs')}</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {vitals.map((r) => (
            <div key={r.id} className="bg-white/5 border border-white/10 rounded-xl p-3.5">
              <div className="text-[11px] text-white/55 mb-2">{r.title}</div>
              {r.ready ? (
                <>
                  <div className="h-10 mb-1.5"><RatioViz r={r} big /></div>
                  <div className="font-serif text-base font-bold text-white">
                    {r.unit?.startsWith('%') ? `${r.value}%` : r.id === 'ladder' ? `${r.value}x` : `${r.value} ${r.unit}`}
                  </div>
                </>
              ) : (
                <div className="text-[11px] text-white/40 leading-relaxed">{L('لا توجد بيانات كافية بعد', 'Not enough data yet')}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* category filter */}
      <div className="flex gap-2 flex-wrap mb-5">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setActiveCat(c)}
            className={`px-4 py-2 rounded-full text-xs font-medium border ${
              activeCat === c ? 'bg-[var(--ink)] text-[var(--surface-0)] border-[var(--ink)]' : 'bg-[var(--surface-card)] text-[var(--ink-2)] border-[var(--border-default)]'
            }`}
          >
            {ar ? CAT_LABELS_AR[c] : c}
          </button>
        ))}
      </div>

      {/* ratio grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mb-6">
        {filtered.map((r) => (
          <RatioCard
            key={r.id}
            r={r}
            ar={ar}
            expanded={expandedId === r.id}
            onToggle={() => setExpandedId((prev) => (prev === r.id ? null : r.id))}
            onSetInProfile={openEditProfile}
            netWorthRows={netWorthRows}
            incomeRows={incomeRows}
          />
        ))}
      </div>

      <div className="flex gap-3 items-start bg-[var(--gold-bg)] border border-[var(--gold)] rounded-xl p-4">
        <div className="w-7 h-7 rounded-full bg-[var(--gold)] flex items-center justify-center font-serif font-semibold text-white text-sm shrink-0">M</div>
        <div className="text-xs text-[var(--gold-text-body)] leading-relaxed">
          <strong className="text-[var(--gold-text-strong)]">{L('تتحدّث هذه النسب كلّما نمت قصّتك.', 'These ratios update as your story grows.')}</strong> {L(
            'كلّما سجّلت أكثر في دخل العمر والمركز المالي، وكلّما أكملت ملفّك الشخصي، صارت هذه القراءات أدقّ.',
            'The more you log in Lifetime Income and Financial Positioning, and the more you fill in on your profile, the sharper these readings get.'
          )}
        </div>
      </div>
    </div>
  );
}

function NetWorthSpark({ points, positive }: { points: NetWorthRow[]; positive: boolean }) {
  const W = 620, H = 44;
  const values = points.map((p) => p.amount);
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const pts = points
    .map((p, i) => {
      const x = (i / (points.length - 1 || 1)) * (W - 4) + 2;
      const y = H - 4 - ((p.amount - min) / range) * (H - 8);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const color = positive ? 'var(--green-border)' : 'var(--red-soft-2)';
  const lastX = W - 2;
  const lastY = H - 4 - ((values[values.length - 1] - min) / range) * (H - 8);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="44">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
      <circle cx={lastX} cy={lastY} r={3} fill={color} />
    </svg>
  );
}

function RatioCard({
  r, ar, expanded, onToggle, onSetInProfile, netWorthRows, incomeRows,
}: {
  r: RatioResult;
  ar: boolean;
  expanded: boolean;
  onToggle: () => void;
  onSetInProfile: () => void;
  netWorthRows: NetWorthRow[];
  incomeRows: IncomeRow[];
}) {
  const L = (a: string, e: string) => (ar ? a : e);
  if (!r.ready) {
    return (
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5">
        <div className="text-xs font-semibold text-[var(--ink)] mb-2">{r.title}</div>
        <div className="text-[11px] text-[var(--muted)] leading-relaxed mb-3">{r.missingHint}</div>
        <button onClick={onSetInProfile} className="text-[11px] font-medium text-[var(--green-dark)] bg-[var(--green-bg)] border border-[var(--green-border)] rounded-lg px-3 py-1.5">
          {L('حدّده في تعديل الملف الشخصي', 'Set in Edit Profile')}
        </button>
      </div>
    );
  }

  const verdictClass =
    r.verdict === 'good' ? 'bg-[var(--green-bg)] text-[var(--green-dark)]' : r.verdict === 'watch' ? 'bg-[var(--gold-bg)] text-[var(--gold-text-alt)]' : 'bg-[var(--red-bg)] text-[var(--red-dark-text)]';

  const log = ratioLog(r.id, netWorthRows, incomeRows, ar);

  return (
    <div
      onClick={onToggle}
      className={`bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 cursor-pointer hover:border-[var(--green-border)] transition-colors ${expanded ? 'sm:col-span-2 lg:col-span-3' : ''}`}
    >
      <div className="flex justify-between items-start gap-2 mb-1">
        <div className="text-xs font-semibold text-[var(--ink)] leading-snug">{r.title}</div>
        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${verdictClass}`}>{verdictLabel(r.verdict!, ar ? 'ar' : 'en')}</span>
      </div>
      <div className="flex items-baseline gap-1.5 mb-3">
        <span className="font-serif text-2xl font-bold text-[var(--ink)]">
          {r.unit?.startsWith('%') ? `${r.value}%` : r.unit === 'x' || r.id === 'ladder' ? `${r.value}x` : r.value}
        </span>
        {!r.unit?.startsWith('%') && r.unit !== 'x' && <span className="text-[11px] text-[var(--muted)]">{r.unit}</span>}
      </div>
      <div className="h-24 mb-3"><RatioViz r={r} /></div>
      <div className="text-[11px] text-[var(--ink-2)] leading-relaxed pt-2.5 border-t border-[var(--border-faint)]" dangerouslySetInnerHTML={{ __html: r.note ?? '' }} />
      {!expanded && <div className="text-[10px] text-[var(--muted)] mt-2 text-center">{L('اضغط لرؤية الحساب ←', 'Tap for the calculation →')}</div>}

      {expanded && (
        <div className="mt-4 pt-4 border-t border-[var(--border-default)] grid sm:grid-cols-2 gap-5" onClick={(e) => e.stopPropagation()}>
          <div>
            <div className="text-[10px] tracking-[0.08em] uppercase text-[var(--muted)] mb-2.5">{L('كيف يُحسَب هذا', 'How this is calculated')}</div>
            <div className="bg-[var(--surface-0)] rounded-lg px-3.5 py-3 mb-2.5">
              <div className="text-xs text-[var(--ink-2)] mb-1.5">{r.formula}</div>
              <div className="font-serif text-sm font-semibold text-[var(--green-dark)]" dir="ltr">{r.calc}</div>
            </div>
            {r.inputs?.map((inp, i) => (
              <div key={i} className="flex justify-between items-baseline py-2 border-t border-[var(--border-faint)] text-xs">
                <div className="text-[var(--ink-2)]">
                  {inp.label}
                  <span className="block text-[10px] text-[var(--muted)] mt-0.5">{inp.source}</span>
                </div>
                <div className="font-serif font-semibold text-[var(--ink)]">{inp.value}</div>
              </div>
            ))}
          </div>
          <div>
            <div className="text-[10px] tracking-[0.08em] uppercase text-[var(--muted)] mb-2.5">{L('الإدخالات وراء هذا الرقم', 'The entries behind this number')}</div>
            {log.length > 0 ? (
              log.map((l, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-t border-[var(--border-faint)] text-xs">
                  <span className="text-[var(--muted)] w-14 shrink-0">{l.date}</span>
                  <span className="text-[var(--ink-2)] flex-1">{l.text}</span>
                  <span className="font-serif text-[var(--ink)]">{l.amt}</span>
                </div>
              ))
            ) : (
              <div className="text-xs text-[var(--muted)] leading-relaxed">
                {L(
                  'هذا رقم واحد ذاتيّ التسجيل، وليس سِجلّاً متتبَّعاً. حدّثه في أيّ وقت من تعديل الملف الشخصي.',
                  'This is a single self-reported figure, not a tracked history. Update it anytime from Edit Profile.'
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ratioLog(id: string, netWorthRows: NetWorthRow[], incomeRows: IncomeRow[], ar: boolean): { date: string; text: string; amt: string }[] {
  if (['ladder', 'yearbars', 'layers', 'ownership'].includes(id)) {
    return [...netWorthRows].reverse().slice(0, 5).map((r) => ({ date: String(r.year), text: ar ? 'لقطة صافي ثروة' : 'Net worth snapshot', amt: money(r.amount, ar) }));
  }
  if (['split', 'candle', 'donut', 'runway'].includes(id)) {
    return [...incomeRows].reverse().slice(0, 5).map((r) => ({
      date: `${monthShort(r.month - 1, ar)} ${r.year}`,
      text: ar ? 'دخل / إنفاق مسجّل' : 'Income / spending logged',
      amt: `${money(r.income, ar)} / ${money(r.spending, ar)}`,
    }));
  }
  return [];
}
