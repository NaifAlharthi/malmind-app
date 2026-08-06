'use client';

// The Foundation — home-page mission control for the data that everything
// else is computed from. One glance shows how complete each pillar of the
// user's financial base is (profile, monthly ledger, assets, debts & bills,
// history); one click expands a pillar to fix it right there: inline
// quick-entry that writes straight to the tables (with carry-forward prefill
// for the ledger), plus the collect/link paths — CSV import, Google Sheets
// two-way sync, and live-priced tickers.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useProfileContext } from '@/components/shared/AppShell';
import { useLocale } from '@/lib/i18n/LocaleProvider';

const MONTH_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const MONTH_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface Counts {
  financial_snapshots: number;
  assets: number;
  loans: number;
  liabilities: number;
  credit_cards: number;
  subscriptions: number;
  expenses: number;
  net_worth_snapshots: number;
  credit_snapshots: number;
}
interface ProfileBase {
  monthly_income: number | null;
  liquid_savings: number | null;
  monthly_debt_payments: number | null;
  has_health_insurance: boolean | null;
  age: number | null;
}
interface LatestSnap {
  year: number; month: number; cash: number; stocks: number; real_estate: number;
  equity: number; other_assets: number; liabilities: number; income: number; expenses: number;
}

type PillarKey = 'profile' | 'ledger' | 'assets' | 'debts' | 'history';

const num = (v: string) => Number(String(v).replace(/[^\d.-]/g, '')) || 0;
const fmt = (n: number) => Math.round(n).toLocaleString();

export default function FoundationHub() {
  const supabase = createClient();
  const { openEditProfile, profileVersion } = useProfileContext();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);

  const [counts, setCounts] = useState<Counts | null>(null);
  const [profile, setProfile] = useState<ProfileBase | null>(null);
  const [latest, setLatest] = useState<LatestSnap | null>(null);
  const [sheets, setSheets] = useState<{ connected: boolean } | null>(null);
  const [openPillar, setOpenPillar] = useState<PillarKey | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const tables: (keyof Counts)[] = [
      'financial_snapshots', 'assets', 'loans', 'liabilities', 'credit_cards',
      'subscriptions', 'expenses', 'net_worth_snapshots', 'credit_snapshots',
    ];
    const next = {} as Counts;
    await Promise.all(
      tables.map(async (t) => {
        try {
          const { data } = await supabase.from(t).select('id').eq('user_id', user.id);
          next[t] = Array.isArray(data) ? data.length : 0;
        } catch { next[t] = 0; }
      })
    );
    const [{ data: prof }, { data: snaps }] = await Promise.all([
      supabase.from('profiles')
        .select('monthly_income, liquid_savings, monthly_debt_payments, has_health_insurance, age')
        .eq('id', user.id).single(),
      supabase.from('financial_snapshots')
        .select('year, month, cash, stocks, real_estate, equity, other_assets, liabilities, income, expenses')
        .eq('user_id', user.id).order('year', { ascending: true }).order('month', { ascending: true }),
    ]);
    setCounts(next);
    setProfile((prof as ProfileBase) ?? null);
    const arr = (snaps ?? []) as LatestSnap[];
    setLatest(arr.length ? arr[arr.length - 1] : null);
    try {
      const res = await fetch('/api/integrations/google/status');
      if (res.ok) setSheets(await res.json());
    } catch { /* tile stays neutral */ }
  }, [supabase]);

  useEffect(() => { load(); }, [load, profileVersion]);

  const flash = (msg: string) => { setToast(msg); window.setTimeout(() => setToast(null), 2600); };

  // ── Pillar completeness ──
  const pillars = useMemo(() => {
    if (!counts) return null;
    const profileFields = [
      profile?.monthly_income, profile?.liquid_savings, profile?.monthly_debt_payments,
      profile?.has_health_insurance, profile?.age,
    ];
    const profileSet = profileFields.filter((v) => v != null && v !== 0 && v !== ('' as unknown)).length;
    const debts = counts.loans + counts.liabilities + counts.credit_cards;
    const bills = counts.subscriptions + counts.expenses;
    const history = counts.net_worth_snapshots + counts.credit_snapshots;
    const def: {
      key: PillarKey; icon: string; name: string; pct: number; status: string; feeds: string;
    }[] = [
      {
        key: 'profile', icon: '👤',
        name: L('الملف والدخل', 'Profile & income'),
        pct: profileSet / 5,
        status: L(`${profileSet}/5 حقول أساسية`, `${profileSet}/5 core fields`),
        feeds: L('يغذّي: المخاطر، النسب، سرعة المال، الحرّية المالية', 'Feeds: Risks, Ratios, Velocity, Financial Freedom'),
      },
      {
        key: 'ledger', icon: '📒',
        name: L('السِّجل الشهري', 'Monthly ledger'),
        pct: Math.min(1, counts.financial_snapshots / 6),
        status: counts.financial_snapshots
          ? L(`${counts.financial_snapshots} شهراً مسجَّلاً`, `${counts.financial_snapshots} months logged`)
          : L('لا أشهر بعد — أهم إدخال في المنتج', 'No months yet — the single most important entry'),
        feeds: L('يغذّي: كل شيء تقريباً — صافي الثروة، اليوم، الاتجاهات', 'Feeds: nearly everything — net worth, Today, trends'),
      },
      {
        key: 'assets', icon: '💼',
        name: L('الأصول', 'Assets'),
        pct: Math.min(1, counts.assets / 3),
        status: counts.assets
          ? L(`${counts.assets} أصلاً مسجَّلاً`, `${counts.assets} assets recorded`)
          : L('سجّل ما تملكه — حتى الأرض والذهب', 'Record what you own — land and gold too'),
        feeds: L('يغذّي: الثروة الحقيقية، التركّز، القدرة الاقتراضية', 'Feeds: true wealth, concentration, borrowing power'),
      },
      {
        key: 'debts', icon: '🧾',
        name: L('الديون والفواتير', 'Debts & bills'),
        pct: Math.min(1, (debts + bills) / 5),
        status: debts + bills
          ? L(`${debts} ديناً · ${bills} التزاماً متكرراً`, `${debts} debts · ${bills} recurring bills`)
          : L('التدفّق الحقيقي يبدأ هنا', 'Your true outflow starts here'),
        feeds: L('يغذّي: كومة اليوم، عبء الدين، كل خطة واقعية', 'Feeds: Daily Stack, debt burden, every honest plan'),
      },
      {
        key: 'history', icon: '📈',
        name: L('التاريخ والائتمان', 'History & credit'),
        pct: Math.min(1, history / 3),
        status: history
          ? L(`${counts.net_worth_snapshots} لقطة ثروة · ${counts.credit_snapshots} تقرير ائتماني`, `${counts.net_worth_snapshots} net-worth snapshots · ${counts.credit_snapshots} credit reports`)
          : L('لقطات سنوية تُظهر مسارك', 'Yearly snapshots reveal your trajectory'),
        feeds: L('يغذّي: المقارنة بالأقران، مسارك، درجة سمة', 'Feeds: peer comparison, trajectory, SIMAH standing'),
      },
    ];
    return def;
  }, [counts, profile, ar]); // eslint-disable-line react-hooks/exhaustive-deps

  const overall = pillars ? pillars.reduce((s, p) => s + p.pct, 0) / pillars.length : 0;

  if (!pillars) return null;

  return (
    <div data-tour="foundation" className="mb-8">
      <div className="mb-1 text-[10px] tracking-[0.16em] uppercase text-[var(--gold)] font-semibold">{L('الأساس', 'The Foundation')}</div>
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 sm:p-6 relative overflow-hidden">
        {/* header: ring + pitch */}
        <div className="flex items-center gap-5 mb-5">
          <FoundationRing pct={overall} pillars={pillars.map((p) => p.pct)} />
          <div className="min-w-0">
            <div className="font-serif text-lg sm:text-xl font-semibold text-[var(--ink)] leading-snug">
              {L('بياناتك أساس كل شيء', 'Your data is the basis of everything')}
            </div>
            <p className="text-xs text-[var(--ink-2)] leading-relaxed mt-1 max-w-lg">
              {L(
                'كل أداة في مال مايند تُحسب من هذه القاعدة. أدخِل، راجِع، اربط — وكلما اكتمل الأساس، صار كل شيء فوقه أصدق.',
                'Every tool in MalMind is computed from this base. Enter, review, link — the more complete the foundation, the truer everything built on it.'
              )}
            </p>
          </div>
        </div>

        {/* pillar rows */}
        <div className="space-y-2">
          {pillars.map((p) => (
            <div key={p.key} className="border border-[var(--border-faint)] rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenPillar(openPillar === p.key ? null : p.key)}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 text-start hover:bg-[var(--surface-1)] transition-colors"
              >
                <span className="text-lg shrink-0">{p.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-[var(--ink)]">{p.name}</span>
                    <span className="text-[11px] text-[var(--muted)]">{p.status}</span>
                  </span>
                  <span className="block h-1 mt-1.5 bg-[var(--surface-1)] rounded-full overflow-hidden" dir="ltr">
                    <span className="block h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.max(3, p.pct * 100)}%`, background: p.pct >= 1 ? 'var(--green)' : p.pct > 0.4 ? 'var(--gold)' : 'var(--red)' }} />
                  </span>
                </span>
                <span className={`text-[var(--muted)] text-xs transition-transform ${openPillar === p.key ? 'rotate-90' : ''}`}>{ar ? '‹' : '›'}</span>
              </button>

              {openPillar === p.key && (
                <div className="px-3.5 pb-3.5 pt-1 border-t border-[var(--border-faint)] bg-[var(--surface-0)]/40">
                  <div className="text-[10px] text-[var(--gold-text-strong)] mb-2.5">{p.feeds}</div>
                  {p.key === 'profile' && <ProfilePanel onEdit={openEditProfile} ar={ar} profile={profile} />}
                  {p.key === 'ledger' && (
                    <LedgerQuickLog
                      key={latest ? `${latest.year}-${latest.month}` : 'empty'}
                      latest={latest} sheets={sheets} ar={ar}
                      onSaved={() => { flash(L('سُجّل شهرك ✓ +8 نقاط للعقل', 'Month logged ✓ +8 Brain synapses')); load(); }}
                    />
                  )}
                  {p.key === 'assets' && <AssetQuickAdd ar={ar} onSaved={() => { flash(L('أُضيف الأصل ✓ +6 نقاط للعقل', 'Asset added ✓ +6 Brain synapses')); load(); }} />}
                  {p.key === 'debts' && <DebtsPanel ar={ar} onSaved={() => { flash(L('أُضيف ✓ +3 نقاط للعقل', 'Added ✓ +3 Brain synapses')); load(); }} />}
                  {p.key === 'history' && <HistoryPanel ar={ar} />}
                </div>
              )}
            </div>
          ))}
        </div>

        {toast && (
          <div className="absolute top-3 inset-x-0 flex justify-center pointer-events-none">
            <span className="text-[11px] font-semibold bg-[var(--green-bg)] border border-[var(--green)] text-[var(--green-dark)] rounded-full px-3.5 py-1.5 shadow-lg">
              {toast}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── The ring: overall completeness, one arc segment per pillar ──────────
function FoundationRing({ pct, pillars }: { pct: number; pillars: number[] }) {
  const R = 34, C = 2 * Math.PI * R, seg = C / pillars.length, gap = 4;
  return (
    <div className="relative shrink-0 w-[88px] h-[88px]" dir="ltr">
      <svg viewBox="0 0 88 88" className="w-full h-full -rotate-90">
        {pillars.map((p, i) => (
          <g key={i}>
            <circle cx="44" cy="44" r={R} fill="none" stroke="var(--surface-1)" strokeWidth="7"
              strokeDasharray={`${seg - gap} ${C - seg + gap}`} strokeDashoffset={-i * seg} strokeLinecap="round" />
            {p > 0 && (
              <circle cx="44" cy="44" r={R} fill="none"
                stroke={p >= 1 ? 'var(--green)' : p > 0.4 ? 'var(--gold)' : 'var(--red)'} strokeWidth="7"
                strokeDasharray={`${Math.max(2, (seg - gap) * p)} ${C}`} strokeDashoffset={-i * seg} strokeLinecap="round"
                className="transition-all duration-1000" />
            )}
          </g>
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-serif text-xl font-bold text-[var(--ink)] leading-none">{Math.round(pct * 100)}%</span>
      </div>
    </div>
  );
}

// ── Pillar panels ───────────────────────────────────────────────────────
function ProfilePanel({ onEdit, ar, profile }: { onEdit: () => void; ar: boolean; profile: ProfileBase | null }) {
  const L = (a: string, e: string) => (ar ? a : e);
  const missing: string[] = [];
  if (!profile?.monthly_income) missing.push(L('الدخل الشهري', 'monthly income'));
  if (profile?.liquid_savings == null) missing.push(L('المدخرات السائلة', 'liquid savings'));
  if (profile?.monthly_debt_payments == null) missing.push(L('أقساط الديون', 'debt payments'));
  if (profile?.has_health_insurance == null) missing.push(L('التأمين الصحي', 'health insurance'));
  if (!profile?.age) missing.push(L('العمر', 'age'));
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <p className="text-[11px] text-[var(--ink-2)] leading-relaxed min-w-0">
        {missing.length
          ? L(`الناقص: ${missing.join('، ')}.`, `Missing: ${missing.join(', ')}.`)
          : L('ملفّك مكتمل — كل الأدوات تقرأ أرقامك الصحيحة.', 'Profile complete — every tool reads your true numbers.')}
      </p>
      <button onClick={onEdit} className="text-xs font-medium text-[var(--green-dark)] bg-[var(--green-bg)] border border-[var(--green-border)] rounded-lg px-3.5 py-2 shrink-0">
        {L('أكمِل الملف', 'Complete profile')}
      </button>
    </div>
  );
}

// The flagship: log this month inline, prefilled by carrying the latest
// month forward so the user only adjusts what changed.
function LedgerQuickLog({ latest, sheets, ar, onSaved }: {
  latest: LatestSnap | null; sheets: { connected: boolean } | null; ar: boolean; onSaved: () => void;
}) {
  const supabase = createClient();
  const L = (a: string, e: string) => (ar ? a : e);
  const now = new Date();
  const [ym, setYm] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [income, setIncome] = useState(latest ? String(latest.income) : '');
  const [expenses, setExpenses] = useState(latest ? String(latest.expenses) : '');
  const [cash, setCash] = useState(latest ? String(latest.cash) : '');
  const [invest, setInvest] = useState(latest ? String(latest.stocks) : '');
  const [debts, setDebts] = useState(latest ? String(latest.liabilities) : '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [y, m] = ym.split('-').map(Number);
    await supabase.from('financial_snapshots').upsert({
      user_id: user.id, year: y, month: m,
      income: num(income), expenses: num(expenses), cash: num(cash),
      stocks: num(invest), liabilities: num(debts),
      real_estate: latest?.real_estate ?? 0, equity: latest?.equity ?? 0, other_assets: latest?.other_assets ?? 0,
    }, { onConflict: 'user_id,year,month' });
    setSaving(false);
    onSaved();
  }

  const months = ar ? MONTH_AR : MONTH_EN;
  const field = 'bg-[var(--surface-card)] border border-[var(--border-default)] rounded-lg px-2.5 py-2 text-xs outline-none focus:border-[var(--green)] w-full';

  return (
    <div>
      {latest && (
        <p className="text-[10px] text-[var(--muted)] mb-2">
          {L(`معبّأ مسبقاً من ${months[latest.month - 1]} ${latest.year} — عدّل ما تغيّر فقط.`, `Prefilled from ${months[latest.month - 1]} ${latest.year} — adjust only what changed.`)}
        </p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 mb-2.5">
        <input type="month" value={ym} onChange={(e) => setYm(e.target.value)} className={field} dir="ltr" aria-label={L('الشهر', 'Month')} />
        {([
          [income, setIncome, L('الدخل', 'Income')],
          [expenses, setExpenses, L('الإنفاق', 'Spending')],
          [cash, setCash, L('النقد', 'Cash')],
          [invest, setInvest, L('الاستثمارات', 'Investments')],
          [debts, setDebts, L('الديون', 'Debts')],
        ] as [string, (v: string) => void, string][]).map(([v, set, ph], i) => (
          <input key={i} inputMode="numeric" placeholder={ph} value={v} onChange={(e) => set(e.target.value)} className={field} aria-label={ph} />
        ))}
      </div>
      <div className="flex items-center gap-2.5 flex-wrap">
        <button onClick={save} disabled={saving}
          className="text-xs font-semibold text-white bg-[var(--green-dark)] rounded-lg px-4 py-2 disabled:opacity-50">
          {saving ? L('يحفظ…', 'Saving…') : L('سجّل الشهر ✓', 'Log the month ✓')}
        </button>
        <Link href="/financial-numbers" className="text-[11px] text-[var(--green-dark)] font-medium">{L('السِّجل الكامل ←', 'Full ledger →')}</Link>
        <span className="text-[var(--border-medium)]">·</span>
        <Link href="/financial-numbers" className="text-[11px] text-[var(--ink-2)]">{L('استيراد CSV', 'Import CSV')}</Link>
        <span className="text-[var(--border-medium)]">·</span>
        <Link href="/financial-numbers" className="text-[11px] text-[var(--ink-2)]">
          {sheets?.connected ? L('Google Sheets متصل ✓', 'Google Sheets linked ✓') : L('اربط Google Sheets', 'Link Google Sheets')}
        </Link>
      </div>
    </div>
  );
}

function AssetQuickAdd({ ar, onSaved }: { ar: boolean; onSaved: () => void }) {
  const supabase = createClient();
  const L = (a: string, e: string) => (ar ? a : e);
  const [name, setName] = useState('');
  const [type, setType] = useState('cash');
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const types: [string, string][] = [
    ['cash', L('نقد', 'Cash')], ['stocks', L('أسهم', 'Stocks')], ['real_estate', L('عقار', 'Real estate')],
    ['land', L('أرض', 'Land')], ['gold', L('ذهب', 'Gold')], ['livestock', L('ماشية', 'Livestock')],
    ['business', L('أعمال', 'Business')], ['other', L('أخرى', 'Other')],
  ];
  const CLASS_OF: Record<string, string> = { cash: 'cash', stocks: 'equity', real_estate: 'real_estate', land: 'real_estate', gold: 'commodity', livestock: 'other', business: 'business', other: 'other' };

  async function save() {
    if (!name || !num(value)) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('assets').insert({ user_id: user.id, name, asset_type: type, asset_class: CLASS_OF[type] ?? 'other', value: num(value) });
    setSaving(false); setName(''); setValue('');
    onSaved();
  }

  const field = 'bg-[var(--surface-card)] border border-[var(--border-default)] rounded-lg px-2.5 py-2 text-xs outline-none focus:border-[var(--green)]';
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input placeholder={L('مثال: أرضي في القصيم', 'e.g. My land in Qassim')} value={name} onChange={(e) => setName(e.target.value)} className={`${field} flex-1 min-w-[140px]`} />
      <select value={type} onChange={(e) => setType(e.target.value)} className={field}>
        {types.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <input inputMode="numeric" placeholder={L('القيمة (ريال)', 'Value (SAR)')} value={value} onChange={(e) => setValue(e.target.value)} className={`${field} w-28`} />
      <button onClick={save} disabled={saving || !name || !num(value)}
        className="text-xs font-semibold text-white bg-[var(--green-dark)] rounded-lg px-3.5 py-2 disabled:opacity-50">
        {L('أضِف ✓', 'Add ✓')}
      </button>
      <Link href="/holdings" className="text-[11px] text-[var(--green-dark)] font-medium">{L('كل الأصول ←', 'All assets →')}</Link>
    </div>
  );
}

function DebtsPanel({ ar, onSaved }: { ar: boolean; onSaved: () => void }) {
  const supabase = createClient();
  const L = (a: string, e: string) => (ar ? a : e);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  async function saveSub() {
    if (!name || !num(amount)) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('subscriptions').insert({ user_id: user.id, name, amount: num(amount), billing_cycle: 'monthly' });
    setSaving(false); setName(''); setAmount('');
    onSaved();
  }

  const field = 'bg-[var(--surface-card)] border border-[var(--border-default)] rounded-lg px-2.5 py-2 text-xs outline-none focus:border-[var(--green)]';
  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <input placeholder={L('اشتراك — مثال: نتفلكس', 'Subscription — e.g. Netflix')} value={name} onChange={(e) => setName(e.target.value)} className={`${field} flex-1 min-w-[140px]`} />
        <input inputMode="numeric" placeholder={L('ريال/شهر', 'SAR/mo')} value={amount} onChange={(e) => setAmount(e.target.value)} className={`${field} w-24`} />
        <button onClick={saveSub} disabled={saving || !name || !num(amount)}
          className="text-xs font-semibold text-white bg-[var(--green-dark)] rounded-lg px-3.5 py-2 disabled:opacity-50">
          {L('أضِف ✓', 'Add ✓')}
        </button>
      </div>
      <div className="flex gap-2.5 flex-wrap text-[11px]">
        <Link href="/commitments" className="text-[var(--green-dark)] font-medium">{L('القروض والبطاقات ←', 'Loans & cards →')}</Link>
        <span className="text-[var(--border-medium)]">·</span>
        <Link href="/holdings" className="text-[var(--ink-2)]">{L('المصروفات المتكررة', 'Recurring expenses')}</Link>
      </div>
    </div>
  );
}

function HistoryPanel({ ar }: { ar: boolean }) {
  const L = (a: string, e: string) => (ar ? a : e);
  return (
    <div className="flex gap-2.5 flex-wrap text-[11px]">
      <Link href="/positioning" className="text-[var(--green-dark)] font-medium bg-[var(--green-bg)] border border-[var(--green-border)] rounded-lg px-3 py-1.5">
        {L('سجّل لقطة صافي الثروة', 'Log a net-worth snapshot')}
      </Link>
      <Link href="/credit" className="text-[var(--green-dark)] font-medium bg-[var(--green-bg)] border border-[var(--green-border)] rounded-lg px-3 py-1.5">
        {L('سجّل تقرير سمة', 'Record a SIMAH report')}
      </Link>
      <Link href="/lifetime-income" className="text-[var(--ink-2)] border border-[var(--border-default)] rounded-lg px-3 py-1.5">
        {L('دخل السنوات الماضية', 'Past years’ income')}
      </Link>
    </div>
  );
}
