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

      {/* ── the house: every piece of the checklist drawn as a part of
             one home. What you have stands solid; what's missing is a
             dashed ghost. Tap a part — its row lights up below. ── */}
      {(() => {
        const have = (k: string) => items.find((i) => i.key === k)?.have ?? false;
        const q = (k: string) => items.find((i) => i.key === k)?.q ?? '';
        const pick = (k: string) => {
          setFocus(k);
          document.getElementById(`fnd-${k}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        };
        const sty = (k: string, color: string) =>
          have(k)
            ? { fill: color, stroke: focus === k ? 'var(--gold)' : 'rgba(0,0,0,0.25)', strokeWidth: focus === k ? 2.5 : 0.75 }
            : { fill: 'var(--surface-1)', stroke: focus === k ? 'var(--gold)' : 'var(--border-strong)', strokeDasharray: '4 3', strokeWidth: focus === k ? 2.5 : 1.5 };
        const g = (k: string, children: React.ReactNode) => (
          <g onClick={() => pick(k)} className="cursor-pointer" role="button" aria-label={q(k)}>
            <title>{q(k)}</title>
            {children}
          </g>
        );
        return (
          <figure className="mb-1.5" dir="ltr">
            <svg viewBox="0 0 340 200" className="w-full max-w-md mx-auto block" role="img"
              aria-label={L('بيتك المالي: كل جزء منه بند في القائمة أدناه', 'Your financial house: every part is a row in the list below')}>
              {/* the goal flies highest — the flag */}
              {g('goal', <>
                <line x1={140} y1={48} x2={140} y2={22} stroke={have('goal') ? '#8A6F3B' : 'var(--border-strong)'} strokeWidth={2} strokeDasharray={have('goal') ? undefined : '4 3'} />
                <polygon points="140,22 168,29 140,37" {...sty('goal', '#D64545')} />
              </>)}
              {/* the roof shelters everything — the emergency fund */}
              {g('shield', <polygon points="72,94 140,46 208,94" {...sty('shield', 'var(--gold)')} />)}
              {/* the walls stand on income */}
              {g('income', <>
                <rect x={85} y={94} width={110} height={62} {...sty('income', '#147C5F')} />
                <rect x={162} y={120} width={16} height={36} rx={2} fill={have('income') ? 'rgba(0,0,0,0.3)' : 'transparent'} stroke="none" />
              </>)}
              {/* the vault inside */}
              {g('vault', <>
                <rect x={98} y={116} width={26} height={26} rx={3} {...sty('vault', '#3B6FD4')} />
                <circle cx={111} cy={129} r={4} fill="none" stroke={have('vault') ? '#fff' : 'var(--border-strong)'} strokeWidth={1.5} />
              </>)}
              {/* the window where money works — growth looking out */}
              {g('invest', <>
                <rect x={138} y={102} width={30} height={24} rx={3} {...sty('invest', '#17B8C9')} />
                <polyline points="143,120 150,113 154,116 162,107" fill="none" stroke={have('invest') ? '#fff' : 'var(--border-strong)'} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
              </>)}
              {/* the slab everything is built on — the record */}
              {g('record', <rect x={58} y={156} width={164} height={16} rx={3} {...sty('record', '#8A6FC0')} />)}
              {/* the land and trees beside — assets */}
              {g('assets', <>
                <ellipse cx={268} cy={166} rx={38} ry={5} {...sty('assets', '#3E7D68')} />
                <rect x={250} y={132} width={6} height={26} {...sty('assets', '#6B4A2E')} />
                <circle cx={253} cy={122} r={14} {...sty('assets', '#4C9F87')} />
                <rect x={281} y={142} width={4} height={16} {...sty('assets', '#6B4A2E')} />
                <circle cx={283} cy={134} r={9} {...sty('assets', '#4C9F87')} />
              </>)}
              {/* the chain at the base, measured and known — debts */}
              {g('debts', <>
                {[26, 38, 50].map((x) => (
                  <circle key={x} cx={x} cy={164} r={6} fill="none"
                    stroke={focus === 'debts' ? 'var(--gold)' : have('debts') ? '#E0922A' : 'var(--border-strong)'}
                    strokeWidth={focus === 'debts' ? 3 : 2.5}
                    strokeDasharray={have('debts') ? undefined : '3 2.5'} />
                ))}
              </>)}
            </svg>
            <figcaption className="text-[9px] text-[var(--muted)] text-center">
              {L('اضغط جزءاً من البيت — يُضيء بنده في القائمة. المتقطّع لم يوجد بعد.', "Tap a part of the house — its piece lights up in the list. Dashed means it doesn't exist yet.")}
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
