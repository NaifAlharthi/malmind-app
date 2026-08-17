'use client';

// The foundation, asked as questions — home·D2. Not a dashboard: a
// checklist of what a financial life NEEDS to exist. Each row is a
// binary — do you have this, or not yet? — detected from the user's
// own data, so ✓ marks are earned, not ticked. Every "not yet" points
// at the exact door where that block gets built.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';

interface Snap {
  year: number; month: number;
  cash: number; stocks: number; real_estate: number; equity: number; other_assets: number;
  liabilities: number; income: number; expenses: number;
}

export default function FoundationChecklist() {
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const [snaps, setSnaps] = useState<Snap[] | null>(null);
  const [counts, setCounts] = useState<{ assets: number; debts: number; goals: number } | null>(null);
  // clicking a part of the house lights up its row below (and vice versa)
  const [focus, setFocus] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSnaps([]); setCounts({ assets: 0, debts: 0, goals: 0 }); return; }
      const [snapRes, assetRes, loanRes, subRes, cardRes, goalRes] = await Promise.all([
        supabase.from('financial_snapshots')
          .select('year, month, cash, stocks, real_estate, equity, other_assets, liabilities, income, expenses')
          .eq('user_id', user.id).order('year', { ascending: true }).order('month', { ascending: true }),
        supabase.from('assets').select('id').eq('user_id', user.id),
        supabase.from('loans').select('id').eq('user_id', user.id),
        supabase.from('subscriptions').select('id').eq('user_id', user.id),
        supabase.from('credit_cards').select('id').eq('user_id', user.id),
        supabase.from('goal_funds').select('id').eq('user_id', user.id),
      ]);
      setSnaps((snapRes.data as Snap[]) ?? []);
      setCounts({
        assets: assetRes.data?.length ?? 0,
        debts: (loanRes.data?.length ?? 0) + (subRes.data?.length ?? 0) + (cardRes.data?.length ?? 0),
        goals: goalRes.data?.length ?? 0,
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items = useMemo(() => {
    if (snaps === null || counts === null) return null;
    const latest = snaps[snaps.length - 1];
    const recent = snaps.slice(-6);
    const avgExp = recent.length ? recent.reduce((a, s) => a + Number(s.expenses), 0) / recent.length : 0;
    const cash = latest ? Number(latest.cash) : 0;
    const invested = latest ? Number(latest.stocks) + Number(latest.equity) : 0;
    const hardAssets = latest ? Number(latest.real_estate) + Number(latest.other_assets) : 0;
    const anyIncome = snaps.some((s) => Number(s.income) > 0);
    const anyLiab = snaps.some((s) => Number(s.liabilities) > 0);

    // the order IS the thinking order: record → income → vault →
    // shield → assets → growth → debts → direction
    return [
      {
        key: 'record',
        icon: '📒',
        q: L('هل لأرقامك سِجل؟', 'Do your numbers have a record?'),
        why: L('كل شيء هنا يُبنى فوقه — شهرٌ واحد يكفي بداية.', 'Everything here builds on it — one month is enough to start.'),
        have: snaps.length > 0,
        detail: snaps.length > 0 ? L(`${snaps.length} شهراً مسجلاً`, `${snaps.length} months on record`) : null,
        href: '/financial-numbers', cta: L('سجّل شهرك الأول', 'Log your first month'),
      },
      {
        key: 'income',
        icon: '💰',
        q: L('هل دخلك موثَّق؟', 'Is your income on record?'),
        why: L('الدخل هو المحرّك — بدونه لا معدل ادخار ولا خطة.', 'Income is the engine — without it there is no savings rate and no plan.'),
        have: anyIncome,
        detail: null,
        href: '/financial-numbers', cta: L('وثّق دخلك', 'Record your income'),
      },
      {
        key: 'vault',
        icon: '🏦',
        q: L('هل عندك خزنة مدّخرات؟', 'Do you have a savings vault?'),
        why: L('نقدٌ جاهز تحت يدك — أول لبنة في أي أساس.', 'Ready cash at hand — the first block of any foundation.'),
        have: cash > 0,
        detail: cash > 0 ? Math.round(cash).toLocaleString('en-US') : null,
        href: '/financial-numbers', cta: L('ابدأ خزنتك', 'Start your vault'),
      },
      {
        key: 'shield',
        icon: '🛡',
        q: L('هل عندك صندوق طوارئ؟', 'Do you have an emergency fund?'),
        why: L('ثلاثة أشهر من مصاريفك على الأقل — درعك أمام المفاجآت.', 'At least three months of your spending — your shield against surprises.'),
        have: avgExp > 0 && cash >= avgExp * 3,
        detail: avgExp > 0 && cash > 0 ? L(`يغطي ${(cash / avgExp).toFixed(1)} شهراً`, `covers ${(cash / avgExp).toFixed(1)} months`) : null,
        href: '/risks', cta: L('افحص درعك', 'Check your shield'),
      },
      {
        key: 'assets',
        icon: '🏛',
        q: L('هل عندك أصول؟', 'Do you have assets?'),
        why: L('عقار، أرض، ذهب، حصة — ما تملكه فعلاً، مجروداً باسمه.', 'Property, land, gold, a stake — what you truly own, inventoried by name.'),
        have: counts.assets > 0 || hardAssets > 0,
        detail: counts.assets > 0 ? L(`${counts.assets} أصلاً مجروداً`, `${counts.assets} inventoried`) : null,
        href: '/holdings', cta: L('اجرد أصولك', 'Inventory your assets'),
      },
      {
        key: 'invest',
        icon: '📈',
        q: L('هل مالك يعمل؟', 'Is your money working?'),
        why: L('استثمارٌ ينمو وأنت نائم — وإلا فالتضخم يأكل الخزنة.', 'An investment growing while you sleep — otherwise inflation eats the vault.'),
        have: invested > 0,
        detail: invested > 0 ? Math.round(invested).toLocaleString('en-US') : null,
        href: '/holdings', cta: L('ابدأ الاستثمار', 'Put money to work'),
      },
      {
        key: 'debts',
        icon: '⛓',
        q: L('هل ديونك معروفة؟', 'Are your debts mapped?'),
        why: L('لا يُدار ما لا يُرى — كل قرض والتزام باسمه ورقمه.', "What isn't seen can't be managed — every loan and commitment, named and numbered."),
        have: counts.debts > 0 || anyLiab,
        detail: counts.debts > 0 ? L(`${counts.debts} التزاماً مسجلاً`, `${counts.debts} commitments listed`) : null,
        href: '/commitments', cta: L('ارسم خريطة ديونك', 'Map your debts'),
      },
      {
        key: 'goal',
        icon: '🎯',
        q: L('هل عندك هدف تدّخر له؟', 'Do you have a goal to aim at?'),
        why: L('بلا هدف، الادخار مزاج — بهدفٍ يصير نظاماً.', 'Without a goal, saving is a mood — with one, it becomes a system.'),
        have: counts.goals > 0,
        detail: counts.goals > 0 ? L(`${counts.goals} هدفاً قائماً`, `${counts.goals} active`) : null,
        href: '/goal-fund', cta: L('حدّد هدفك', 'Set your goal'),
      },
    ];
  }, [snaps, counts, ar]); // eslint-disable-line react-hooks/exhaustive-deps

  if (items === null) {
    return (
      <div className="drv-num bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 mb-8 text-sm text-[var(--muted)]">
        {L('يُفحص الأساس…', 'Checking the foundation…')}
      </div>
    );
  }

  const haveCount = items.filter((i) => i.have).length;

  return (
    <div className="drv-num bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 sm:p-6 mb-8">
      <div className="flex items-baseline justify-between gap-2 flex-wrap mb-1">
        <div className="font-serif text-lg font-semibold text-[var(--ink)]">🏛 {L('الأساس', 'The foundation')}</div>
        <div className="text-[11px] font-semibold text-[var(--green-dark)]" dir="ltr">{haveCount} / {items.length}</div>
      </div>
      <p className="text-[11px] text-[var(--muted)] leading-relaxed mb-3">
        {L(
          'هذا ما ينبغي أن يوجد في أي حياة مالية سليمة. اسأل نفسك سؤالاً سؤالاً: عندي، أم ليس بعد؟ — والعلامات تُكسب من بياناتك، لا تُنقر.',
          "What a sound financial life needs to exist. Ask yourself, question by question: do I have this, or not yet? The checkmarks are earned from your data — not ticked by hand."
        )}
      </p>
      <div className="h-1.5 rounded-full bg-[var(--border-faint)] overflow-hidden mb-4">
        <div className="h-full rounded-full bg-[var(--green)] transition-all duration-700" style={{ width: `${(haveCount / items.length) * 100}%` }} />
      </div>

      {/* ── the house, drawn the way the About stack is drawn: an
             isometric scene with depth, shadows and breath. Every piece
             of the checklist is a real object standing on the record's
             plate. What you have stands solid; what's missing waits as
             a breathing dashed ghost. Tap a part — its row lights up. ── */}
      {(() => {
        const have = (k: string) => items.find((i) => i.key === k)?.have ?? false;
        const q = (k: string) => items.find((i) => i.key === k)?.q ?? '';
        const pick = (k: string) => {
          setFocus(k);
          document.getElementById(`fnd-${k}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        };
        // one style per face: solid parts get subtle dark edges, ghosts
        // get dashed outlines; the focused part is ringed in gold
        const face = (k: string, color: string) => ({
          fill: have(k) ? color : 'var(--surface-1)',
          stroke: focus === k ? 'var(--gold)' : have(k) ? 'rgba(0,0,0,0.28)' : 'var(--border-strong)',
          strokeWidth: focus === k ? 2 : have(k) ? 0.6 : 1.3,
          strokeDasharray: have(k) ? undefined : '4 3',
          strokeLinejoin: 'round' as const,
        });
        const g = (k: string, children: React.ReactNode) => (
          <g onClick={() => pick(k)} role="button" aria-label={q(k)}
            className={`cursor-pointer ${focus === k ? 'mm-house-pulse' : ''} ${!have(k) ? 'mm-ghost-breath' : ''}`}>
            <title>{q(k)}</title>
            {children}
          </g>
        );
        return (
          <figure className="mb-1.5" dir="ltr">
            <style>{`
              @keyframes mmHousePulse { 0%, 100% { filter: brightness(1); } 50% { filter: brightness(1.35); } }
              .mm-house-pulse { animation: mmHousePulse 2.4s ease-in-out infinite; }
              @keyframes mmGhostBreath { 0%, 100% { opacity: 0.5; } 50% { opacity: 0.95; } }
              .mm-ghost-breath { animation: mmGhostBreath 2.8s ease-in-out infinite; }
              @media (prefers-reduced-motion: reduce) { .mm-house-pulse, .mm-ghost-breath { animation: none; } }
            `}</style>
            <svg viewBox="0 0 360 262" className="w-full max-w-md mx-auto block" role="img"
              aria-label={L('بيتك المالي: كل جزء منه بند في القائمة أدناه', 'Your financial house: every part is a row in the list below')}>
              {/* the record — the isometric plate the whole life stands on */}
              {g('record', <>
                <polygon points="46,196 178,240 178,254 46,210" fill={have('record') ? '#5D4685' : 'var(--surface-1)'} stroke={focus === 'record' ? 'var(--gold)' : have('record') ? 'rgba(0,0,0,0.28)' : 'var(--border-strong)'} strokeWidth={focus === 'record' ? 2 : 0.8} strokeDasharray={have('record') ? undefined : '4 3'} />
                <polygon points="310,196 178,240 178,254 310,210" fill={have('record') ? '#4A3769' : 'var(--surface-1)'} stroke={focus === 'record' ? 'var(--gold)' : have('record') ? 'rgba(0,0,0,0.28)' : 'var(--border-strong)'} strokeWidth={focus === 'record' ? 2 : 0.8} strokeDasharray={have('record') ? undefined : '4 3'} />
                <polygon points="178,152 310,196 178,240 46,196" {...face('record', '#8A6FC0')} />
              </>)}

              {/* the chain, lying measured on the plate — debts */}
              {g('debts', <>
                {[[84, 206], [99, 211], [114, 216]].map(([x, y]) => (
                  <g key={x}>
                    <ellipse cx={x} cy={y + 7} rx={7.5} ry={2.2} fill="#000" opacity={have('debts') ? 0.22 : 0.08} />
                    <circle cx={x} cy={y} r={6} fill="none"
                      stroke={focus === 'debts' ? 'var(--gold)' : have('debts') ? '#E0922A' : 'var(--border-strong)'}
                      strokeWidth={focus === 'debts' ? 3 : 2.6}
                      strokeDasharray={have('debts') ? undefined : '3 2.5'} />
                  </g>
                ))}
              </>)}

              {/* the vault — a small iso safe standing before the house */}
              {g('vault', <>
                <ellipse cx={120} cy={220} rx={15} ry={3.5} fill="#000" opacity={have('vault') ? 0.25 : 0.08} />
                <polygon points="108,202 108,216 120,221 120,207" {...face('vault', '#2E5FB8')} />
                <polygon points="120,207 120,221 132,216 132,202" {...face('vault', '#3B6FD4')} />
                <polygon points="108,202 120,197 132,202 120,207" {...face('vault', '#5B8AE0')} />
                <circle cx={126} cy={209} r={2.8} fill="none" stroke={have('vault') ? '#fff' : 'var(--border-strong)'} strokeWidth={1.4} />
              </>)}

              {/* the trees rooted beside the house — assets, with the same
                  grounded shadows the About icons carry */}
              {g('assets', <>
                <ellipse cx={272} cy={200} rx={15} ry={3.5} fill="#000" opacity={have('assets') ? 0.25 : 0.08} />
                <rect x={269} y={178} width={6} height={22} {...face('assets', '#6B4A2E')} />
                <circle cx={272} cy={168} r={13} {...face('assets', '#4C9F87')} />
                <ellipse cx={300} cy={206} rx={9} ry={2.8} fill="#000" opacity={have('assets') ? 0.22 : 0.08} />
                <rect x={298} y={194} width={4} height={12} {...face('assets', '#6B4A2E')} />
                <circle cx={300} cy={186} r={8.5} {...face('assets', '#3E7D68')} />
              </>)}

              {/* the walls stand on income — two faces, light meets shade */}
              {g('income', <>
                <polygon points="120,176 178,198 178,148 120,126" {...face('income', '#0F5C46')} />
                <polygon points="178,198 236,176 236,126 178,148" {...face('income', '#178266')} />
                <polygon points="194.2,191.8 211.6,185.2 211.6,159.2 194.2,165.8" fill={have('income') ? 'rgba(0,0,0,0.32)' : 'transparent'} stroke="none" />
              </>)}

              {/* the window where money works, growth looking out — investments */}
              {g('invest', <>
                <polygon points="216.3,167.5 232.5,161.3 232.5,139.3 216.3,145.5" {...face('invest', '#17B8C9')} />
                <polyline points="219,160 224,152 227,155 230,146" fill="none" stroke={have('invest') ? '#fff' : 'var(--border-strong)'} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
              </>)}

              {/* the roof shelters everything beneath it — the emergency fund */}
              {g('shield', <>
                <polygon points="112,128 178,152 178,94 145,82" {...face('shield', '#C9A84C')} />
                <polygon points="178,152 244,128 211,82 178,94" {...face('shield', 'var(--gold)')} />
                <polygon points="112,128 145,82 211,82 244,128 211,116 145,116" fill="none" stroke="none" />
              </>)}

              {/* the goal flies from the ridge — the flag */}
              {g('goal', <>
                <line x1={178} y1={90} x2={178} y2={58} stroke={have('goal') ? '#8A6F3B' : 'var(--border-strong)'} strokeWidth={2.2} strokeDasharray={have('goal') ? undefined : '4 3'} />
                <polygon points="178,58 208,66 178,74" {...face('goal', '#D64545')} />
                <ellipse cx={178} cy={93} rx={4} ry={1.6} fill="#000" opacity={have('goal') ? 0.25 : 0.08} />
              </>)}
            </svg>
            <figcaption className="text-[9px] text-[var(--muted)] text-center">
              {L('اضغط جزءاً من المشهد — يُضيء بنده في القائمة. المتقطّع يتنفّس منتظراً أن يوجد.', "Tap a part of the scene — its piece lights up in the list. The dashed parts breathe, waiting to exist.")}
            </figcaption>
          </figure>
        );
      })()}

      <div className="flex flex-col gap-1.5">
        {items.map((it) => (
          <div
            key={it.key}
            id={`fnd-${it.key}`}
            onClick={() => setFocus(it.key)}
            className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 cursor-pointer transition-shadow ${
              it.have ? 'border-[var(--green-border)] bg-[var(--green-bg)]/40' : 'border-[var(--border-faint)] bg-[var(--surface-1)]'
            } ${focus === it.key ? 'ring-2 ring-[var(--gold)]' : ''}`}
          >
            <span
              className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold ${
                it.have ? 'bg-[var(--green-dark)] text-white' : 'border-2 border-dashed border-[var(--border-strong)] text-transparent'
              }`}
              aria-hidden
            >
              ✓
            </span>
            <span className="text-base leading-none shrink-0" aria-hidden>{it.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-semibold text-[var(--ink)]">
                {it.q}
                {it.have && it.detail && <span className="text-[10px] font-medium text-[var(--green-dark)] ms-2" dir="ltr">{it.detail}</span>}
              </span>
              <span className="block text-[10px] text-[var(--muted)] leading-relaxed">{it.why}</span>
            </span>
            {it.have ? (
              <span className="shrink-0 text-[10px] font-semibold text-[var(--green-dark)]">{L('موجود', 'Have it')}</span>
            ) : (
              <Link href={it.href} className="shrink-0 text-[10px] font-semibold text-white bg-[var(--green-dark)] rounded-lg px-3 py-1.5 whitespace-nowrap">
                {it.cta} ←
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
