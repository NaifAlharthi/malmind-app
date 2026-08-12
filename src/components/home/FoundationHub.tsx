'use client';

// The Foundation — your financial tower, built from the four elements of a
// financial life:
//   💵 INCOME      — the golden energy source raining into the tower's funnel
//   🏢 ASSETS      — the tower's body: every asset you own is a lit floor
//   🏦 SAVINGS     — the vault annex, filling with gold as you keep money
//   ⛓️ LIABILITIES — the weight below ground, chained to the foundations
// Empty elements stand as dashed scaffolding with a pulsing beacon nudging
// you to tap them; the crane hovers over whichever element needs work next.
// Tapping any element opens its workbench — inline quick-entry that writes
// straight to the real tables.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';

const MONTH_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const MONTH_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface Counts {
  assets: number;
  loans: number;
  liabilities: number;
  credit_cards: number;
  subscriptions: number;
  goal_funds: number;
  financial_snapshots: number;
}
interface ProfileBase { monthly_income: number | null; liquid_savings: number | null }
interface LatestSnap {
  year: number; month: number; cash: number; stocks: number; real_estate: number;
  equity: number; other_assets: number; liabilities: number; income: number; expenses: number;
}

type ElementKey = 'income' | 'assets' | 'savings' | 'liabilities';

const num = (v: string) => Number(String(v).replace(/[^\d.-]/g, '')) || 0;

export default function FoundationHub() {
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);

  const [counts, setCounts] = useState<Counts | null>(null);
  const [profile, setProfile] = useState<ProfileBase | null>(null);
  const [latest, setLatest] = useState<LatestSnap | null>(null);
  const [selected, setSelected] = useState<ElementKey | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const tables: (keyof Counts)[] = ['assets', 'loans', 'liabilities', 'credit_cards', 'subscriptions', 'goal_funds', 'financial_snapshots'];
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
      supabase.from('profiles').select('monthly_income, liquid_savings').eq('id', user.id).single(),
      supabase.from('financial_snapshots')
        .select('year, month, cash, stocks, real_estate, equity, other_assets, liabilities, income, expenses')
        .eq('user_id', user.id).order('year', { ascending: true }).order('month', { ascending: true }),
    ]);
    setCounts(next);
    setProfile((prof as ProfileBase) ?? null);
    const arr = (snaps ?? []) as LatestSnap[];
    setLatest(arr.length ? arr[arr.length - 1] : null);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const flash = (msg: string) => { setToast(msg); window.setTimeout(() => setToast(null), 2600); };

  const model = useMemo(() => {
    if (!counts) return null;
    const debts = counts.loans + counts.liabilities + counts.credit_cards + counts.subscriptions;
    const hasIncome = (profile?.monthly_income ?? 0) > 0 || (latest?.income ?? 0) > 0;
    const hasCash = (latest?.cash ?? 0) > 0;
    const hasLiquid = (profile?.liquid_savings ?? 0) > 0;
    const elements: Record<ElementKey, { icon: string; name: string; pct: number; status: string; feeds: string }> = {
      income: {
        icon: '💵', name: L('الطاقة — الدخل', 'The power — income'),
        pct: Math.min(1, (hasIncome ? 0.4 : 0) + Math.min(counts.financial_snapshots, 3) * 0.2),
        status: hasIncome
          ? L(`الطاقة تتدفق — ${counts.financial_snapshots} شهراً مسجّلاً`, `Power flowing — ${counts.financial_snapshots} months logged`)
          : L('لا طاقة بعد — سجّل دخلك وسيضيء البرج كله', 'No power yet — log your income and the whole tower lights up'),
        feeds: L('يغذّي: كل نسبة وخطة وقرار في المنتج', 'Feeds: every ratio, plan, and decision in the product'),
      },
      assets: {
        icon: '🏢', name: L('جسم البرج — الأصول', "The tower's body — assets"),
        pct: Math.min(1, counts.assets / 3),
        status: counts.assets
          ? L(`${counts.assets} أصلاً مبنياً في البرج`, `${counts.assets} assets built into the tower`)
          : L('البرج هيكل فارغ — سجّل ما تملكه، حتى الأرض والذهب والإبل', 'The tower is bare scaffolding — record what you own, land, gold and camels too'),
        feeds: L('يغذّي: صافي الثروة، التركّز، القدرة الاقتراضية', 'Feeds: net worth, concentration, borrowing power'),
      },
      savings: {
        icon: '🏦', name: L('الخزنة — الادخار', 'The vault — savings'),
        pct: Math.min(1, (hasLiquid ? 0.4 : 0) + (hasCash ? 0.3 : 0) + (counts.goal_funds > 0 ? 0.3 : 0)),
        status: hasLiquid || hasCash || counts.goal_funds
          ? L(`الخزنة تمتلئ — ${counts.goal_funds} صندوق هدف`, `The vault is filling — ${counts.goal_funds} goal funds`)
          : L('الخزنة فارغة — حدّد مدخراتك وابدأ صندوق هدف', 'The vault is empty — set your savings and start a goal fund'),
        feeds: L('يغذّي: السيولة، الطوارئ، الحرّية المالية', 'Feeds: liquidity, emergencies, financial freedom'),
      },
      liabilities: {
        icon: '⛓️', name: L('الثقل تحت الأرض — الالتزامات', 'The weight below — liabilities'),
        pct: Math.min(1, debts / 4),
        status: debts
          ? L(`${debts} التزاماً مكشوفاً ومقيساً`, `${debts} liabilities exposed and measured`)
          : L('الثقل مجهول — القروض والبطاقات والاشتراكات تُسجَّل هنا', 'The weight is unknown — loans, cards and subscriptions register here'),
        feeds: L('يغذّي: عبء الدين، كومة اليوم، كل خطة صادقة', 'Feeds: debt burden, the Daily Stack, every honest plan'),
      },
    };
    const order: ElementKey[] = ['income', 'assets', 'savings', 'liabilities'];
    const weakest = order.reduce((w, k) => (elements[k].pct < elements[w].pct ? k : w), 'income' as ElementKey);
    const overall = order.reduce((s, k) => s + elements[k].pct, 0) / order.length;
    return {
      elements, weakest, overall,
      hasIncome,
      assetFloors: Math.min(counts.assets, 6),
      coins: Math.round(elements.savings.pct * 4),
      chains: Math.min(debts, 4),
    };
  }, [counts, profile, latest, ar]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!model) return null;
  const active: ElementKey = selected ?? model.weakest;
  const p = model.elements[active];

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

          {/* ── the workbench for the selected element ── */}
          <div className="flex-1 min-w-0 p-5 md:ps-2">
            <div className="font-serif text-lg font-semibold text-[var(--ink)] leading-snug mb-0.5">
              {L('أربعة عناصر تبني حياتك المالية', 'Four elements build your financial life')}
            </div>
            <p className="text-[11px] text-[var(--muted)] mb-4">
              {L('الدخل طاقةُ البرج، والأصول جسمه، والادخار خزنته، والالتزامات ثقله — اضغط كل عنصر واملأه.', "Income powers the tower, assets are its body, savings its vault, liabilities its weight — tap each element and fill it in.")}
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

              {active === 'income' && (
                <IncomeQuickLog
                  key={latest ? `${latest.year}-${latest.month}` : 'empty'}
                  latest={latest} ar={ar}
                  onSaved={() => { flash(L('الطاقة تتدفق ✓ +8 نقاط للعقل', 'Power flowing ✓ +8 Brain synapses')); load(); }}
                />
              )}
              {active === 'assets' && <AssetQuickAdd ar={ar} onSaved={() => { flash(L('طابقٌ جديد في البرج ✓ +6 نقاط للعقل', 'A new floor in the tower ✓ +6 Brain synapses')); load(); }} />}
              {active === 'savings' && <SavingsPanel ar={ar} profile={profile} onSaved={() => { flash(L('الخزنة تمتلئ ✓ +5 نقاط للعقل', 'The vault fills ✓ +5 Brain synapses')); load(); }} />}
              {active === 'liabilities' && <DebtsPanel ar={ar} onSaved={() => { flash(L('الثقل قِيس ✓ +3 نقاط للعقل', 'Weight measured ✓ +3 Brain synapses')); load(); }} />}
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
  model: { elements: Record<ElementKey, { pct: number }>; weakest: ElementKey; hasIncome: boolean; assetFloors: number; coins: number; chains: number };
  active: ElementKey; onSelect: (k: ElementKey) => void; ar: boolean;
}) {
  const L = (a: string, e: string) => (ar ? a : e);
  const { weakest, hasIncome, assetFloors, coins, chains, elements } = model;
  const sel = (k: ElementKey) => active === k;
  const empty = (k: ElementKey) => elements[k].pct === 0;

  const FLOORS = 6, FLOOR_H = 30, TOWER_X = 72, TOWER_W = 112, GROUND_Y = 300;
  const floorY = (i: number) => GROUND_Y - (i + 1) * FLOOR_H;
  const roofY = floorY(FLOORS - 1);

  const dash = 'var(--border-medium)';
  const glowSel = { filter: 'drop-shadow(0 0 6px rgba(93,202,165,0.9))' } as React.CSSProperties;

  // The crane hovers over whichever element needs work next.
  const CRANE_AT: Record<ElementKey, [number, number]> = {
    income: [52, 66], assets: [128, floorY(assetFloors) - 6], savings: [251, 232], liabilities: [128, 342],
  };
  const [cx, cy] = CRANE_AT[weakest];

  // A pulsing beacon on every EMPTY element — the nudge to tap it.
  const BEACON_AT: Record<ElementKey, [number, number]> = {
    income: [52, 60], assets: [128, floorY(2) + 10], savings: [251, 260], liabilities: [128, 336],
  };

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
          <radialGradient id="fnSun" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#FBE9B0" /><stop offset="55%" stopColor="#E4C465" /><stop offset="100%" stopColor="#B98B2C" />
          </radialGradient>
          <style>{`
            @keyframes fnTw { 0%,100%{opacity:.25} 50%{opacity:.95} }
            @keyframes fnPulse { 0%,100%{opacity:.5; transform:scale(1)} 50%{opacity:1; transform:scale(1.12)} }
            @keyframes fnBob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
            @keyframes fnDrop { 0%{transform:translateY(0); opacity:0} 12%{opacity:1} 85%{opacity:1} 100%{transform:translateY(46px); opacity:0} }
            @keyframes fnBeacon { 0%,100%{opacity:.15; transform:scale(.8)} 50%{opacity:.85; transform:scale(1.35)} }
            @keyframes fnSway { 0%,100%{transform:rotate(-2deg)} 50%{transform:rotate(2deg)} }
          `}</style>
        </defs>

        <rect x="0" y="0" width="320" height="380" rx="16" fill="url(#fnSky)" />
        {[[262, 34, 1.6], [96, 22, 1.2], [206, 52, 1.5], [288, 96, 1.3], [160, 16, 1.1], [30, 120, 1.4]].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="#fff" style={{ animation: `fnTw ${3 + (i % 3)}s ease-in-out ${i * 0.5}s infinite` }} />
        ))}
        {/* ground line — above it the tower rises, below it the weight hangs */}
        <rect x="0" y={GROUND_Y} width="320" height="80" fill="#04211A" />
        <line x1="0" y1={GROUND_Y} x2="320" y2={GROUND_Y} stroke="#17B8C9" strokeOpacity="0.3" />

        {/* ── INCOME: the golden sun raining power into the roof funnel ── */}
        <g onClick={() => onSelect('income')} className="cursor-pointer" style={sel('income') ? glowSel : undefined}>
          {hasIncome ? (
            <>
              <circle cx="52" cy="46" r="17" fill="url(#fnSun)" opacity="0.35" style={{ animation: 'fnPulse 3.5s ease-in-out infinite', transformOrigin: '52px 46px' }} />
              <circle cx="52" cy="46" r="11" fill="url(#fnSun)" />
              {/* golden drops falling toward the funnel */}
              {[0, 1, 2].map((i) => (
                <circle key={i} cx={72 + i * 14} cy={70} r="2.4" fill="#E4C465"
                  style={{ animation: `fnDrop 2.2s ease-in ${i * 0.7}s infinite` }} />
              ))}
              {/* funnel on the roof */}
              <path d={`M${TOWER_X + 22} ${roofY - 14} L${TOWER_X + TOWER_W - 22} ${roofY - 14} L${TOWER_X + TOWER_W / 2 + 9} ${roofY - 2} L${TOWER_X + TOWER_W / 2 - 9} ${roofY - 2} Z`}
                fill="#0B4832" stroke="#C9A84C" strokeWidth="1.5" />
            </>
          ) : (
            <>
              <circle cx="52" cy="46" r="11" fill="none" stroke={dash} strokeDasharray="4 3" />
              <path d={`M${TOWER_X + 22} ${roofY - 14} L${TOWER_X + TOWER_W - 22} ${roofY - 14} L${TOWER_X + TOWER_W / 2 + 9} ${roofY - 2} L${TOWER_X + TOWER_W / 2 - 9} ${roofY - 2} Z`}
                fill="none" stroke={dash} strokeDasharray="4 3" />
            </>
          )}
          <title>{L('الطاقة — الدخل', 'The power — income')}</title>
        </g>

        {/* ── ASSETS: the tower body — each asset is a lit floor ── */}
        <g onClick={() => onSelect('assets')} className="cursor-pointer" style={sel('assets') ? glowSel : undefined}>
          {Array.from({ length: FLOORS }).map((_, i) => {
            const built = i < assetFloors;
            const y = floorY(i);
            return (
              <g key={i}>
                <rect x={TOWER_X} y={y} width={TOWER_W} height={FLOOR_H - 3} rx="3"
                  fill={built ? 'url(#fnFloor)' : 'transparent'}
                  stroke={built ? '#1D9E75' : dash} strokeOpacity={built ? 0.85 : 0.5}
                  strokeDasharray={built ? '0' : '5 4'} />
                {built
                  ? [0, 1, 2].map((w) => (
                    <rect key={w} x={TOWER_X + 14 + w * 32} y={y + 8} width="13" height="11" rx="1.5"
                      fill={(i + w) % 3 === 0 ? '#E4C465' : '#5DCAA5'} opacity="0.85"
                      style={{ animation: `fnTw ${3 + ((i + w) % 4)}s ease-in-out ${(i * 3 + w) * 0.3}s infinite` }} />
                  ))
                  : <line x1={TOWER_X + 6} y1={y + FLOOR_H - 8} x2={TOWER_X + TOWER_W - 6} y2={y + 4} stroke={dash} strokeOpacity="0.35" strokeDasharray="3 4" />}
              </g>
            );
          })}
          <title>{L('جسم البرج — الأصول', "The tower's body — assets")}</title>
        </g>

        {/* ── SAVINGS: the vault annex, filling with gold ── */}
        <g onClick={() => onSelect('savings')} className="cursor-pointer" style={sel('savings') ? glowSel : undefined}>
          <path d={`M216 240 L286 240 L286 ${GROUND_Y} L216 ${GROUND_Y} Z`} fill={coins > 0 ? '#0B4832' : 'transparent'}
            stroke={coins > 0 ? '#1D9E75' : dash} strokeOpacity="0.85" strokeDasharray={coins > 0 ? '0' : '5 4'} />
          <path d="M212 240 L251 224 L290 240" fill="none" stroke={coins > 0 ? '#C9A84C' : dash} strokeWidth="2" strokeDasharray={coins > 0 ? '0' : '4 3'} />
          <circle cx="251" cy="266" r="12" fill="none" stroke={coins > 0 ? '#C9A84C' : dash} strokeWidth="2.5" strokeDasharray={coins > 0 ? '0' : '4 3'} />
          {coins > 0 && (
            <>
              <circle cx="251" cy="266" r="4" fill="none" stroke="#E4C465" strokeWidth="1.5" />
              <line x1="251" y1="254" x2="251" y2="260" stroke="#E4C465" strokeWidth="1.5" />
            </>
          )}
          {Array.from({ length: coins }).map((_, i) => (
            <g key={i}>
              <ellipse cx={227 + i * 16} cy={GROUND_Y - 8} rx="6" ry="2.6" fill="#E4C465" />
              <ellipse cx={227 + i * 16} cy={GROUND_Y - 11.5} rx="6" ry="2.6" fill="#FBE9B0" />
            </g>
          ))}
          <title>{L('الخزنة — الادخار', 'The vault — savings')}</title>
        </g>

        {/* ── LIABILITIES: chains anchored below ground, pulling down ── */}
        <g onClick={() => onSelect('liabilities')} className="cursor-pointer" style={sel('liabilities') ? glowSel : undefined}>
          <rect x={TOWER_X + 8} y={GROUND_Y + 14} width={TOWER_W - 16} height="22" rx="4"
            fill={chains > 0 ? '#3A1414' : 'transparent'}
            stroke={chains > 0 ? '#B3574B' : dash} strokeOpacity="0.85" strokeDasharray={chains > 0 ? '0' : '5 4'} />
          {chains > 0
            ? Array.from({ length: chains }).map((_, i) => {
              const x = TOWER_X + 20 + i * ((TOWER_W - 40) / Math.max(1, chains - 1 || 1));
              return (
                <g key={i} style={{ animation: 'fnSway 4s ease-in-out infinite', transformOrigin: `${x}px ${GROUND_Y}px`, animationDelay: `${i * 0.6}s` }}>
                  {[0, 1].map((c) => (
                    <circle key={c} cx={x} cy={GROUND_Y + 4 + c * 6} r="2.6" fill="none" stroke="#B3574B" strokeWidth="1.6" />
                  ))}
                </g>
              );
            })
            : [0, 1, 2].map((i) => (
              <circle key={i} cx={TOWER_X + 26 + i * 30} cy={GROUND_Y + 7} r="2.6" fill="none" stroke={dash} strokeWidth="1.4" strokeDasharray="2 2" />
            ))}
          <title>{L('الثقل تحت الأرض — الالتزامات', 'The weight below — liabilities')}</title>
        </g>

        {/* ── beacons: a pulsing nudge on every element still empty ── */}
        {(['income', 'assets', 'savings', 'liabilities'] as ElementKey[]).filter(empty).map((k) => {
          const [bx, by] = BEACON_AT[k];
          return (
            <g key={k} pointerEvents="none">
              <circle cx={bx} cy={by} r="11" fill="none" stroke="#E4C465" strokeWidth="1.5"
                style={{ animation: 'fnBeacon 2.2s ease-in-out infinite', transformOrigin: `${bx}px ${by}px` }} />
              <circle cx={bx} cy={by} r="2.5" fill="#E4C465" style={{ animation: 'fnTw 2.2s ease-in-out infinite' }} />
            </g>
          );
        })}

        {/* ── the crane over whichever element needs work next ── */}
        <g style={{ animation: 'fnBob 2.6s ease-in-out infinite' }} pointerEvents="none">
          <text x={cx + 14} y={cy - 12} fontSize="17" textAnchor="middle">🏗️</text>
        </g>
      </svg>
      <div className="text-[10px] text-[var(--muted)] text-center mt-1 md:mb-0 mb-2">
        {L('🏗️ الرافعة تقف حيث يحتاج برجك العمل تالياً — والومضات الذهبية تنتظر لمستك', '🏗️ the crane stands where your tower needs work next — the golden beacons await your tap')}
      </div>
    </div>
  );
}

// ── Workbench panels (entry forms) ──────────────────────────────────────
function IncomeQuickLog({ latest, ar, onSaved }: { latest: LatestSnap | null; ar: boolean; onSaved: () => void }) {
  const supabase = createClient();
  const L = (a: string, e: string) => (ar ? a : e);
  const now = new Date();
  const [ym, setYm] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [income, setIncome] = useState(latest ? String(latest.income) : '');
  const [expenses, setExpenses] = useState(latest ? String(latest.expenses) : '');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!num(income)) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [y, m] = ym.split('-').map(Number);
    await Promise.all([
      supabase.from('financial_snapshots').upsert({
        user_id: user.id, year: y, month: m,
        income: num(income), expenses: num(expenses),
        cash: latest?.cash ?? 0, stocks: latest?.stocks ?? 0, liabilities: latest?.liabilities ?? 0,
        real_estate: latest?.real_estate ?? 0, equity: latest?.equity ?? 0, other_assets: latest?.other_assets ?? 0,
      }, { onConflict: 'user_id,year,month' }),
      supabase.from('profiles').update({ monthly_income: num(income) }).eq('id', user.id),
    ]);
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
      <div className="grid grid-cols-3 gap-2 mb-2.5">
        <input type="month" value={ym} onChange={(e) => setYm(e.target.value)} className={field} dir="ltr" aria-label={L('الشهر', 'Month')} />
        <input inputMode="numeric" placeholder={L('الدخل الشهري', 'Monthly income')} value={income} onChange={(e) => setIncome(e.target.value)} className={field} />
        <input inputMode="numeric" placeholder={L('الإنفاق الشهري', 'Monthly spending')} value={expenses} onChange={(e) => setExpenses(e.target.value)} className={field} />
      </div>
      <div className="flex items-center gap-2.5 flex-wrap">
        <button onClick={save} disabled={saving || !num(income)}
          className="text-xs font-semibold text-white bg-[var(--green-dark)] rounded-lg px-4 py-2 disabled:opacity-50">
          {saving ? L('يوصّل…', 'Wiring…') : L('وصّل الطاقة ✓', 'Connect the power ✓')}
        </button>
        <Link href="/financial-numbers" className="text-[11px] text-[var(--green-dark)] font-medium">{L('السِّجل الكامل ←', 'Full ledger →')}</Link>
        <span className="text-[var(--border-medium)]">·</span>
        <Link href="/lifetime-income" className="text-[11px] text-[var(--ink-2)]">{L('دخل السنوات الماضية', "Past years' income")}</Link>
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
        {L('ابنِ الطابق ✓', 'Build the floor ✓')}
      </button>
      <Link href="/holdings" className="text-[11px] text-[var(--green-dark)] font-medium">{L('كل الأصول ←', 'All assets →')}</Link>
    </div>
  );
}

function SavingsPanel({ ar, profile, onSaved }: { ar: boolean; profile: ProfileBase | null; onSaved: () => void }) {
  const supabase = createClient();
  const L = (a: string, e: string) => (ar ? a : e);
  const [liquid, setLiquid] = useState(profile?.liquid_savings ? String(profile.liquid_savings) : '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('profiles').update({ liquid_savings: num(liquid) }).eq('id', user.id);
    setSaving(false);
    onSaved();
  }

  const field = 'bg-[var(--surface-card)] border border-[var(--border-default)] rounded-lg px-2.5 py-2 text-xs outline-none focus:border-[var(--green)]';
  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <input inputMode="numeric" placeholder={L('مدخراتك السائلة الآن (ريال)', 'Your liquid savings now (SAR)')} value={liquid}
          onChange={(e) => setLiquid(e.target.value)} className={`${field} flex-1 min-w-[170px]`} />
        <button onClick={save} disabled={saving || liquid === ''}
          className="text-xs font-semibold text-white bg-[var(--green-dark)] rounded-lg px-3.5 py-2 disabled:opacity-50">
          {L('أودِع في الخزنة ✓', 'Into the vault ✓')}
        </button>
      </div>
      <div className="flex gap-2.5 flex-wrap text-[11px]">
        <Link href="/goal-fund" className="text-[var(--green-dark)] font-medium bg-[var(--green-bg)] border border-[var(--green-border)] rounded-lg px-3 py-1.5">
          {L('ابدأ صندوق هدف باسمٍ ووتيرة', 'Start a named goal fund')}
        </Link>
        <Link href="/freedom" className="text-[var(--ink-2)] border border-[var(--border-default)] rounded-lg px-3 py-1.5">
          {L('إلى أين يقودك ادخارك؟', 'Where does your saving lead?')}
        </Link>
      </div>
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
          {L('قِس الثقل ✓', 'Measure it ✓')}
        </button>
      </div>
      <div className="flex gap-2.5 flex-wrap text-[11px]">
        <Link href="/commitments" className="text-[var(--green-dark)] font-medium">{L('القروض والبطاقات ←', 'Loans & cards →')}</Link>
        <span className="text-[var(--border-medium)]">·</span>
        <Link href="/credit" className="text-[var(--ink-2)]">{L('وضعك الائتماني', 'Your credit standing')}</Link>
      </div>
    </div>
  );
}
