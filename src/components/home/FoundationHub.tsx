'use client';

// The Foundation — your financial tower, under construction. Instead of a
// checklist, the data basis is drawn as a building on the Saudi-green night:
// the profile is the foundation slab, each logged ledger month is a floor
// with lit windows, assets fill the vault annex with gold, debts & bills are
// the utility lines feeding the building, and your history is the golden
// crown (a nod to Al Faisaliah). Incomplete parts stand as dashed scaffolding
// with a crane over the weakest one; click any part of the building to fix
// it right there — inline quick-entry that writes straight to the tables.

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
  const [selected, setSelected] = useState<PillarKey | null>(null);
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
    } catch { /* neutral */ }
  }, [supabase]);

  useEffect(() => { load(); }, [load, profileVersion]);

  const flash = (msg: string) => { setToast(msg); window.setTimeout(() => setToast(null), 2600); };

  const model = useMemo(() => {
    if (!counts) return null;
    const profileFields = [
      profile?.monthly_income, profile?.liquid_savings, profile?.monthly_debt_payments,
      profile?.has_health_insurance, profile?.age,
    ];
    const profileSet = profileFields.filter((v) => v != null && v !== 0 && v !== ('' as unknown)).length;
    const debts = counts.loans + counts.liabilities + counts.credit_cards;
    const bills = counts.subscriptions + counts.expenses;
    const history = counts.net_worth_snapshots + counts.credit_snapshots;
    const pillars: Record<PillarKey, { icon: string; name: string; pct: number; status: string; feeds: string }> = {
      profile: {
        icon: '🧱', name: L('قاعدة البرج — الملف والدخل', 'The slab — profile & income'),
        pct: profileSet / 5,
        status: L(`${profileSet}/5 حقول مصبوبة`, `${profileSet}/5 fields poured`),
        feeds: L('يغذّي: المخاطر، النسب، سرعة المال، الحرّية المالية', 'Feeds: Risks, Ratios, Velocity, Financial Freedom'),
      },
      ledger: {
        icon: '🏢', name: L('طوابق البرج — السِّجل الشهري', 'The floors — monthly ledger'),
        pct: Math.min(1, counts.financial_snapshots / 6),
        status: counts.financial_snapshots
          ? L(`${Math.min(counts.financial_snapshots, 6)}/6 طوابق مبنية (${counts.financial_snapshots} شهراً)`, `${Math.min(counts.financial_snapshots, 6)}/6 floors built (${counts.financial_snapshots} months)`)
          : L('لا طوابق بعد — كل شهر تسجّله طابقٌ يُبنى', 'No floors yet — every month you log builds one'),
        feeds: L('يغذّي: كل شيء تقريباً — صافي الثروة، اليوم، الاتجاهات', 'Feeds: nearly everything — net worth, Today, trends'),
      },
      assets: {
        icon: '🏦', name: L('الخزنة — الأصول', 'The vault — assets'),
        pct: Math.min(1, counts.assets / 3),
        status: counts.assets
          ? L(`${counts.assets} أصلاً في الخزنة`, `${counts.assets} assets in the vault`)
          : L('الخزنة فارغة — سجّل ما تملكه، حتى الأرض والذهب', 'The vault is empty — record what you own, land and gold too'),
        feeds: L('يغذّي: الثروة الحقيقية، التركّز، القدرة الاقتراضية', 'Feeds: true wealth, concentration, borrowing power'),
      },
      debts: {
        icon: '🔌', name: L('التمديدات — الديون والفواتير', 'The utilities — debts & bills'),
        pct: Math.min(1, (debts + bills) / 5),
        status: debts + bills
          ? L(`${debts} ديناً · ${bills} التزاماً موصولاً`, `${debts} debts · ${bills} bills connected`)
          : L('تمديدات غير موصولة — تدفّقك الحقيقي يبدأ هنا', 'Lines not connected — your true outflow starts here'),
        feeds: L('يغذّي: كومة اليوم، عبء الدين، كل خطة واقعية', 'Feeds: Daily Stack, debt burden, every honest plan'),
      },
      history: {
        icon: '🔆', name: L('القمة الذهبية — التاريخ والائتمان', 'The golden crown — history & credit'),
        pct: Math.min(1, history / 3),
        status: history
          ? L(`${counts.net_worth_snapshots} لقطة ثروة · ${counts.credit_snapshots} تقرير سمة`, `${counts.net_worth_snapshots} net-worth snapshots · ${counts.credit_snapshots} SIMAH reports`)
          : L('القمة مطفأة — اللقطات السنوية تضيئها', 'The crown is dark — yearly snapshots light it'),
        feeds: L('يغذّي: المقارنة بالأقران، مسارك، درجة سمة', 'Feeds: peer comparison, trajectory, SIMAH standing'),
      },
    };
    const order: PillarKey[] = ['profile', 'ledger', 'assets', 'debts', 'history'];
    const weakest = order.reduce((w, k) => (pillars[k].pct < pillars[w].pct ? k : w), 'profile' as PillarKey);
    const overall = order.reduce((s, k) => s + pillars[k].pct, 0) / order.length;
    return { pillars, weakest, overall, profileSet, months: Math.min(counts.financial_snapshots, 6), assetCount: Math.min(counts.assets, 4), debtsConnected: Math.min(debts + bills, 3), historyLit: history > 0 };
  }, [counts, profile, ar]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!model) return null;
  const active: PillarKey = selected ?? model.weakest;
  const p = model.pillars[active];

  return (
    <div data-tour="foundation" className="mb-8">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <div className="text-[10px] tracking-[0.16em] uppercase text-[var(--gold)] font-semibold">{L('الأساس', 'The Foundation')}</div>
        <div className="text-[10px] text-[var(--muted)]">{L(`اكتمل ${Math.round(model.overall * 100)}%`, `${Math.round(model.overall * 100)}% built`)}</div>
      </div>

      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* ── the tower ── */}
          <div className="md:w-[320px] shrink-0 p-3 pb-0 md:pb-3">
            <TowerScene model={model} active={active} onSelect={setSelected} ar={ar} />
          </div>

          {/* ── the workbench for the selected part ── */}
          <div className="flex-1 min-w-0 p-5 md:ps-2">
            <div className="font-serif text-lg font-semibold text-[var(--ink)] leading-snug mb-0.5">
              {L('برجك المالي يُبنى من بياناتك', 'Your financial tower is built from your data')}
            </div>
            <p className="text-[11px] text-[var(--muted)] mb-4">
              {L('كل أداة في مال مايند تُحسب من هذا البرج — اضغط أي جزء منه لتبنيه.', 'Every tool in MalMind is computed from this tower — tap any part of it to build it.')}
            </p>

            <div className="border border-[var(--border-faint)] rounded-xl p-4 bg-[var(--surface-0)]/40">
              <div className="flex items-center gap-2.5 mb-1">
                <span className="text-xl">{p.icon}</span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[var(--ink)]">{p.name}</div>
                  <div className="text-[11px] text-[var(--muted)]">{p.status}</div>
                </div>
              </div>
              <div className="h-1 my-2.5 bg-[var(--surface-1)] rounded-full overflow-hidden" dir="ltr">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.max(3, p.pct * 100)}%`, background: p.pct >= 1 ? 'var(--green)' : p.pct > 0.4 ? 'var(--gold)' : 'var(--red)' }} />
              </div>
              <div className="text-[10px] text-[var(--gold-text-strong)] mb-3">{p.feeds}</div>

              {active === 'profile' && <ProfilePanel onEdit={openEditProfile} ar={ar} profile={profile} />}
              {active === 'ledger' && (
                <LedgerQuickLog
                  key={latest ? `${latest.year}-${latest.month}` : 'empty'}
                  latest={latest} sheets={sheets} ar={ar}
                  onSaved={() => { flash(L('طابقٌ جديد أُضيء ✓ +8 نقاط للعقل', 'A new floor lit up ✓ +8 Brain synapses')); load(); }}
                />
              )}
              {active === 'assets' && <AssetQuickAdd ar={ar} onSaved={() => { flash(L('دخل الخزنة ✓ +6 نقاط للعقل', 'Into the vault ✓ +6 Brain synapses')); load(); }} />}
              {active === 'debts' && <DebtsPanel ar={ar} onSaved={() => { flash(L('وُصل الخط ✓ +3 نقاط للعقل', 'Line connected ✓ +3 Brain synapses')); load(); }} />}
              {active === 'history' && <HistoryPanel ar={ar} />}
            </div>
          </div>
        </div>

        {toast && (
          <div className="absolute top-3 inset-x-0 flex justify-center pointer-events-none z-10">
            <span className="text-[11px] font-semibold bg-[var(--green-bg)] border border-[var(--green)] text-[var(--green-dark)] rounded-full px-3.5 py-1.5 shadow-lg">
              {toast}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── The tower scene ─────────────────────────────────────────────────────
function TowerScene({ model, active, onSelect, ar }: {
  model: { pillars: Record<PillarKey, { pct: number }>; weakest: PillarKey; profileSet: number; months: number; assetCount: number; debtsConnected: number; historyLit: boolean };
  active: PillarKey; onSelect: (k: PillarKey) => void; ar: boolean;
}) {
  const L = (a: string, e: string) => (ar ? a : e);
  const { profileSet, months, assetCount, debtsConnected, historyLit, weakest } = model;
  const sel = (k: PillarKey) => active === k;
  const FLOORS = 6, FLOOR_H = 34, TOWER_X = 66, TOWER_W = 118, SLAB_Y = 318;
  const floorY = (i: number) => SLAB_Y - (i + 1) * FLOOR_H;
  const crownY = floorY(FLOORS - 1) - 26;
  // Where the crane hovers: over the weakest part.
  const CRANE_AT: Record<PillarKey, [number, number]> = {
    profile: [125, SLAB_Y - 6], ledger: [125, floorY(months) - 4], assets: [247, 236],
    debts: [34, 216], history: [125, crownY - 14],
  };
  const [cx, cy] = CRANE_AT[weakest];

  const dash = 'var(--border-medium)';
  const glowSel = { filter: 'drop-shadow(0 0 6px rgba(93,202,165,0.9))' } as React.CSSProperties;

  return (
    <div className="relative" dir="ltr">
      <svg viewBox="0 0 320 380" className="w-full max-w-[340px] mx-auto block select-none">
        <defs>
          <linearGradient id="fnSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0C4531" /><stop offset="100%" stopColor="#041F17" />
          </linearGradient>
          <linearGradient id="fnFloor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0E5A3E" /><stop offset="100%" stopColor="#083A2A" />
          </linearGradient>
          <radialGradient id="fnOrb" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#FBE9B0" /><stop offset="55%" stopColor="#E4C465" /><stop offset="100%" stopColor="#B98B2C" />
          </radialGradient>
          <style>{`
            @keyframes fnTw { 0%,100%{opacity:.25} 50%{opacity:.95} }
            @keyframes fnPulse { 0%,100%{opacity:.5; transform:scale(1)} 50%{opacity:1; transform:scale(1.12)} }
            @keyframes fnBob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
          `}</style>
        </defs>

        <rect x="0" y="0" width="320" height="380" rx="16" fill="url(#fnSky)" />
        {[[30, 40, 1.6], [90, 24, 1.2], [200, 30, 1.8], [268, 56, 1.3], [150, 18, 1.2], [290, 120, 1.4]].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="#fff" style={{ animation: `fnTw ${3 + (i % 3)}s ease-in-out ${i * 0.5}s infinite` }} />
        ))}
        {/* ground */}
        <rect x="0" y="344" width="320" height="36" fill="#04211A" />
        <line x1="0" y1="344" x2="320" y2="344" stroke="#17B8C9" strokeOpacity="0.25" />

        {/* ── utilities (debts & bills): lines feeding the building ── */}
        <g onClick={() => onSelect('debts')} className="cursor-pointer" style={sel('debts') ? glowSel : undefined}>
          <rect x="14" y="196" width="26" height="34" rx="4" fill={debtsConnected > 0 ? '#0B4832' : 'transparent'}
            stroke={debtsConnected > 0 ? '#17B8C9' : dash} strokeDasharray={debtsConnected > 0 ? '0' : '4 3'} />
          {debtsConnected > 0 && [0, 1, 2].slice(0, debtsConnected).map((i) => (
            <circle key={i} cx={21 + i * 6} cy={206} r="2" fill="#E4C465" style={{ animation: `fnTw 2.5s ease-in-out ${i * 0.4}s infinite` }} />
          ))}
          {[236, 256].map((y, i) => (
            <path key={i} d={`M27 230 L27 ${y} L${TOWER_X} ${y}`} fill="none"
              stroke={i < Math.ceil(debtsConnected / 2) ? '#17B8C9' : dash}
              strokeWidth={i < Math.ceil(debtsConnected / 2) ? 2.5 : 1.5}
              strokeDasharray={i < Math.ceil(debtsConnected / 2) ? '0' : '4 4'} strokeOpacity={i < Math.ceil(debtsConnected / 2) ? 0.9 : 0.6} />
          ))}
          <title>{L('التمديدات — الديون والفواتير', 'Utilities — debts & bills')}</title>
        </g>

        {/* ── the slab (profile): 5 poured blocks ── */}
        <g onClick={() => onSelect('profile')} className="cursor-pointer" style={sel('profile') ? glowSel : undefined}>
          <rect x="40" y={SLAB_Y} width="170" height="26" rx="4" fill="#062B1F" stroke={profileSet > 0 ? '#C9A84C' : dash} strokeOpacity="0.7" strokeDasharray={profileSet >= 5 ? '0' : '5 4'} />
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={46 + i * 32.5} y={SLAB_Y + 5} width="27" height="16" rx="2"
              fill={i < profileSet ? '#0B4832' : 'transparent'}
              stroke={i < profileSet ? '#5DCAA5' : dash} strokeOpacity={i < profileSet ? 0.9 : 0.5}
              strokeDasharray={i < profileSet ? '0' : '3 3'} />
          ))}
          <title>{L('القاعدة — الملف والدخل', 'The slab — profile & income')}</title>
        </g>

        {/* ── the tower floors (ledger) ── */}
        <g onClick={() => onSelect('ledger')} className="cursor-pointer" style={sel('ledger') ? glowSel : undefined}>
          {Array.from({ length: FLOORS }).map((_, i) => {
            const built = i < months;
            const y = floorY(i);
            return (
              <g key={i}>
                <rect x={TOWER_X} y={y} width={TOWER_W} height={FLOOR_H - 3} rx="3"
                  fill={built ? 'url(#fnFloor)' : 'transparent'}
                  stroke={built ? '#1D9E75' : dash} strokeOpacity={built ? 0.8 : 0.5}
                  strokeDasharray={built ? '0' : '5 4'} />
                {built
                  ? [0, 1, 2].map((w) => (
                    <rect key={w} x={TOWER_X + 16 + w * 34} y={y + 9} width="14" height="12" rx="1.5"
                      fill={(i + w) % 3 === 0 ? '#E4C465' : '#5DCAA5'} opacity="0.85"
                      style={{ animation: `fnTw ${3 + ((i + w) % 4)}s ease-in-out ${(i * 3 + w) * 0.3}s infinite` }} />
                  ))
                  : <line x1={TOWER_X + 6} y1={y + FLOOR_H - 8} x2={TOWER_X + TOWER_W - 6} y2={y + 4} stroke={dash} strokeOpacity="0.35" strokeDasharray="3 4" />}
              </g>
            );
          })}
          <title>{L('الطوابق — السِّجل الشهري', 'The floors — monthly ledger')}</title>
        </g>

        {/* ── the crown (history): spire + golden orb ── */}
        <g onClick={() => onSelect('history')} className="cursor-pointer" style={sel('history') ? glowSel : undefined}>
          <line x1="125" y1={crownY + 12} x2="125" y2={floorY(FLOORS - 1)} stroke={historyLit ? '#C9A84C' : dash} strokeWidth="2.5" strokeDasharray={historyLit ? '0' : '4 3'} />
          {historyLit ? (
            <>
              <circle cx="125" cy={crownY} r="18" fill="url(#fnOrb)" opacity="0.35" style={{ animation: 'fnPulse 3.5s ease-in-out infinite', transformOrigin: `125px ${crownY}px` }} />
              <circle cx="125" cy={crownY} r="10" fill="url(#fnOrb)" />
              <circle cx="121.5" cy={crownY - 3.5} r="2.6" fill="#FFF7E0" opacity="0.95" />
            </>
          ) : (
            <circle cx="125" cy={crownY} r="10" fill="none" stroke={dash} strokeDasharray="4 3" />
          )}
          <title>{L('القمة — التاريخ والائتمان', 'The crown — history & credit')}</title>
        </g>

        {/* ── the vault annex (assets) ── */}
        <g onClick={() => onSelect('assets')} className="cursor-pointer" style={sel('assets') ? glowSel : undefined}>
          <path d="M216 268 L286 268 L286 344 L216 344 Z" fill={assetCount > 0 ? '#0B4832' : 'transparent'}
            stroke={assetCount > 0 ? '#1D9E75' : dash} strokeOpacity="0.85" strokeDasharray={assetCount > 0 ? '0' : '5 4'} />
          <path d="M212 268 L251 252 L290 268" fill="none" stroke={assetCount > 0 ? '#C9A84C' : dash} strokeWidth="2" strokeDasharray={assetCount > 0 ? '0' : '4 3'} />
          <circle cx="251" cy="298" r="13" fill="none" stroke={assetCount > 0 ? '#C9A84C' : dash} strokeWidth="2.5" strokeDasharray={assetCount > 0 ? '0' : '4 3'} />
          {assetCount > 0 && (
            <>
              <circle cx="251" cy="298" r="4.5" fill="none" stroke="#E4C465" strokeWidth="1.5" />
              <line x1="251" y1="285" x2="251" y2="291" stroke="#E4C465" strokeWidth="1.5" />
            </>
          )}
          {Array.from({ length: assetCount }).map((_, i) => (
            <g key={i}>
              <ellipse cx={228 + i * 15} cy={334} rx="6" ry="2.6" fill="#E4C465" />
              <ellipse cx={228 + i * 15} cy={330.5} rx="6" ry="2.6" fill="#FBE9B0" />
            </g>
          ))}
          <title>{L('الخزنة — الأصول', 'The vault — assets')}</title>
        </g>

        {/* ── the crane over the weakest part ── */}
        <g style={{ animation: 'fnBob 2.6s ease-in-out infinite' }} pointerEvents="none">
          <text x={cx + 14} y={cy - 12} fontSize="17" textAnchor="middle">🏗️</text>
          <circle cx={cx} cy={cy} r="6" fill="none" stroke="#E4C465" strokeWidth="1.5" style={{ animation: 'fnPulse 1.8s ease-in-out infinite', transformOrigin: `${cx}px ${cy}px` }} />
        </g>
      </svg>
      <div className="text-[10px] text-[var(--muted)] text-center mt-1 md:mb-0 mb-2">
        {L('🏗️ الرافعة تقف حيث يحتاج برجك العمل تالياً', '🏗️ the crane stands where your tower needs work next')}
      </div>
    </div>
  );
}

// ── Workbench panels (entry forms) ──────────────────────────────────────
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
          ? L(`لم يُصَبّ بعد: ${missing.join('، ')}.`, `Not poured yet: ${missing.join(', ')}.`)
          : L('القاعدة مصبوبة كاملة — كل الأدوات تقف عليها بثبات.', 'The slab is fully poured — every tool stands firmly on it.')}
      </p>
      <button onClick={onEdit} className="text-xs font-medium text-[var(--green-dark)] bg-[var(--green-bg)] border border-[var(--green-border)] rounded-lg px-3.5 py-2 shrink-0">
        {L('اصبب القاعدة', 'Pour the slab')}
      </button>
    </div>
  );
}

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
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2.5">
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
          {saving ? L('يبني…', 'Building…') : L('ابنِ الطابق ✓', 'Build the floor ✓')}
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
        {L('أودِع ✓', 'Deposit ✓')}
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
          {L('صِل الخط ✓', 'Connect ✓')}
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
