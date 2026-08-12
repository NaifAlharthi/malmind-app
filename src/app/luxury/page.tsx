'use client';

// Luxury — the wealth discipline of joy, built for the fourth quadrant.
// Not a shopping list and not a guilt machine: a thinking instrument that
// answers, for any object of desire, the four questions the wealthy ask —
//   1. How heavy is it on my wealth?        (share of net worth, with bands)
//   2. Can my money buy it FOR me?           (months of passive yield — the
//      crown rule: buy joy from yield, never principal)
//   3. What does it truly cost over 10 years? (invested alternative − resale
//      + carrying costs, priced with honest class retention)
//   4. What does each moment of joy cost?     (amortized riyals per use)
// Plus the wealth-behavior spectrum: from money pit to store of value.
// Anyone may explore it; those not yet in الوفرة see the distance, not a wall.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { diagnoseQuadrant, QUADRANT_META, type QuadKey } from '@/lib/quadrant';
import {
  LUX_CATALOG, LUX_CLASSES, SAFE_YIELD,
  wealthShare, yieldMonths, investedAlternative, resale10, trueCost10, joyPerUse, shareVerdict,
  type LuxClass, type LuxItem,
} from '@/lib/luxury';

function fmt(n: number) { return Math.round(n).toLocaleString(); }
function fmtCompact(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${(n / 1e6).toFixed(abs >= 1e7 ? 0 : 1)}M`;
  if (abs >= 1e3) return `${Math.round(n / 1e3)}K`;
  return String(Math.round(n));
}
const num = (v: string) => Number(String(v).replace(/[^\d.-]/g, '')) || 0;

export default function LuxuryPage() {
  const supabase = createClient();
  const { t, locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const sar = t('common.sar');
  const money = (n: number) => (ar ? `${fmt(n)} ${sar}` : `${sar} ${fmt(n)}`);
  const moneyC = (n: number) => (ar ? `${fmtCompact(n)} ${sar}` : `${sar} ${fmtCompact(n)}`);

  const [nw, setNw] = useState<number | null>(null);
  const [invested, setInvested] = useState(0);
  const [quad, setQuad] = useState<QuadKey | null>(null);

  const [itemId, setItemId] = useState<string>('rolex');
  const [custom, setCustom] = useState<{ name: string; price: string; cls: LuxClass } | null>(null);
  const [usesPerWeek, setUsesPerWeek] = useState(3);
  const [years, setYears] = useState(10);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: snaps } = await supabase
        .from('financial_snapshots')
        .select('year, month, cash, stocks, real_estate, equity, other_assets, liabilities, income, expenses')
        .eq('user_id', user.id)
        .order('year', { ascending: true })
        .order('month', { ascending: true });
      const arr = snaps ?? [];
      if (!arr.length) { setNw(0); return; }
      const s = arr[arr.length - 1];
      const assets = Number(s.cash) + Number(s.stocks) + Number(s.real_estate) + Number(s.equity) + Number(s.other_assets);
      setNw(assets - Number(s.liabilities));
      setInvested(Number(s.stocks) + Number(s.equity));
      const recent = arr.slice(-6);
      setQuad(diagnoseQuadrant(
        recent.reduce((a, r) => a + Number(r.income), 0) / recent.length,
        recent.reduce((a, r) => a + Number(r.expenses), 0) / recent.length,
        assets,
      ));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const item: LuxItem = useMemo(() => {
    if (custom && custom.name && num(custom.price) > 0) {
      return { id: 'custom', icon: '✨', name: { ar: custom.name, en: custom.name }, price: num(custom.price), cls: custom.cls, usesPerWeek: 3 };
    }
    return LUX_CATALOG.find((x) => x.id === itemId) ?? LUX_CATALOG[0];
  }, [itemId, custom]);

  useEffect(() => { setUsesPerWeek(item.usesPerWeek); }, [item.id, item.usesPerWeek]);

  const clsMeta = LUX_CLASSES[item.cls];
  const share = nw ? wealthShare(item.price, nw) : Infinity;
  const sVerdict = shareVerdict(share);
  const yMonths = yieldMonths(item.price, invested);
  const alt10 = investedAlternative(item.price, 10);
  const res10 = resale10(item.price, item.cls);
  const tCost = trueCost10(item.price, item.cls);
  const perUse = joyPerUse(item.price, item.cls, usesPerWeek, years);

  const shareColors = { light: 'var(--green-dark)', measured: 'var(--gold-2)', heavy: 'var(--red-2)', beyond: 'var(--red-2)' } as const;
  const shareText = {
    light: L('خفيفة على ثروتك — قرار راحة لا قرار حسابات', 'Light on your wealth — a comfort decision, not a math one'),
    measured: L('محسوبة — تستحق ليلة تفكير لا أكثر', 'Measured — worth one night of thought, no more'),
    heavy: L('ثقيلة — ستشعر بها ثروتك؛ اجعلها استثنائية', 'Heavy — your wealth will feel it; make it exceptional'),
    beyond: L('فوق مقام ثروتك الحالي بصراحة — دع مالك يكبر أولاً', "Frankly beyond your current wealth — let your money grow first"),
  } as const;

  const isD = quad === 'D';

  return (
    <div className="max-w-3xl">
      {/* ── hero ── */}
      <div className="mb-1 text-[10px] tracking-[0.14em] uppercase text-[var(--gold)] font-semibold">
        👑 {L('لأهل الوفرة', 'For the abundant')}
      </div>
      <h1 className="font-serif text-3xl font-semibold text-[var(--ink)] mb-1">{L('الرفاهية', 'Luxury')}</h1>
      <p className="text-sm text-[var(--ink-2)] mb-2 max-w-2xl leading-relaxed">
        {L(
          'الفرح مشروع، والرفاهية ليست خصماً للثروة — بشرط واحد يعرفه الأثرياء: اشترِ متعتك من ريع مالك، لا من رأس ماله. هذه الأداة تزن أي شيء تشتهيه بميزان ثروتك.',
          "Joy is legitimate, and luxury is no enemy of wealth — on the one condition the wealthy know: buy your pleasure from your money's yield, never its principal. This instrument weighs anything you desire on your wealth's scale."
        )}
      </p>

      {/* those not yet in الوفرة see the distance, not a wall */}
      {quad && !isD && (
        <div className="flex items-start gap-2.5 bg-[var(--gold-bg)] border border-[var(--gold)]/50 rounded-xl px-4 py-3 mb-5 text-[11px] text-[var(--gold-text-body)] leading-relaxed">
          <span className="text-base shrink-0">🧭</span>
          <span>
            {L(
              `صُممت هذه الأداة لمن بلغ «الوفرة» — وأنت اليوم في «${QUADRANT_META[quad].ar.title}». استكشفها كما تشاء، ولتكن الأرقام أدناه خريطة المسافة بينك وبين أن يشتري مالك رفاهيتك بنفسه.`,
              `This instrument was built for those who reached Abundance — today you're in “${QUADRANT_META[quad].en.title}”. Explore freely, and let the numbers below map the distance between you and your money buying your luxuries itself.`
            )}
          </span>
        </div>
      )}
      {isD && <div className="mb-5" />}

      {/* ── the objects of desire ── */}
      <div className="text-[11px] text-[var(--muted)] mb-2">{L('اختر ما تشتهيه — أو زِن شيئاً خاصاً بك', 'Pick a desire — or weigh something of your own')}</div>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-1 px-1">
        {LUX_CATALOG.map((x) => (
          <button
            key={x.id}
            onClick={() => { setItemId(x.id); setCustom(null); }}
            className={`shrink-0 rounded-2xl border px-3.5 py-2.5 text-start transition-all ${
              item.id === x.id
                ? 'border-[var(--gold)] bg-[var(--gold-bg)] shadow-sm'
                : 'border-[var(--border-default)] bg-[var(--surface-card)] hover:border-[var(--border-strong)]'
            }`}
          >
            <div className="text-xl leading-none mb-1.5">{x.icon}</div>
            <div className="text-[11px] font-semibold text-[var(--ink)] whitespace-nowrap">{ar ? x.name.ar : x.name.en}</div>
            <div className="text-[10px] text-[var(--muted)]" dir="ltr">{moneyC(x.price)}</div>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 flex-wrap mb-6">
        <input
          placeholder={L('شيء آخر تشتهيه…', 'Something else you desire…')}
          value={custom?.name ?? ''}
          onChange={(e) => setCustom({ name: e.target.value, price: custom?.price ?? '', cls: custom?.cls ?? 'depreciates' })}
          className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-xs outline-none focus:border-[var(--gold)] flex-1 min-w-[150px]"
        />
        <input
          inputMode="numeric" placeholder={L('سعره (ريال)', 'Its price (SAR)')}
          value={custom?.price ?? ''}
          onChange={(e) => setCustom({ name: custom?.name ?? '', price: e.target.value, cls: custom?.cls ?? 'depreciates' })}
          className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-xs outline-none focus:border-[var(--gold)] w-32"
        />
        <select
          value={custom?.cls ?? 'depreciates'}
          onChange={(e) => setCustom({ name: custom?.name ?? '', price: custom?.price ?? '', cls: e.target.value as LuxClass })}
          className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-lg px-2.5 py-2 text-xs"
        >
          {(Object.keys(LUX_CLASSES) as LuxClass[]).map((c) => (
            <option key={c} value={c}>{LUX_CLASSES[c].icon} {ar ? LUX_CLASSES[c].ar : LUX_CLASSES[c].en}</option>
          ))}
        </select>
      </div>

      {/* ── the verdict ── */}
      <div className="bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] rounded-2xl p-5 sm:p-6 text-white mb-4">
        <div className="flex items-baseline justify-between gap-3 flex-wrap mb-4">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{item.icon}</span>
            <div>
              <div className="font-serif text-xl font-bold">{ar ? item.name.ar : item.name.en}</div>
              <div className="text-[11px] text-white/60">
                {clsMeta.icon} {ar ? clsMeta.ar : clsMeta.en} · <span dir="ltr">{money(item.price)}</span>
              </div>
            </div>
          </div>
          {nw !== null && nw > 0 && (
            <div className="text-end">
              <div className="text-[10px] text-white/50">{L('ثروتك الآن', 'Your wealth now')}</div>
              <div className="font-serif text-lg font-bold">{moneyC(nw)}</div>
            </div>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          {/* 1 · weight on wealth */}
          <div className="rounded-xl bg-white/[0.06] border border-white/15 p-4">
            <div className="text-[10px] tracking-wide uppercase text-white/50 mb-2">{L('ثِقلها على ثروتك', 'Its weight on your wealth')}</div>
            <div className="flex items-center gap-3">
              <div className="font-serif text-3xl font-bold" style={{ color: shareColors[sVerdict] }}>
                {Number.isFinite(share) ? `${(share * 100).toFixed(share < 0.01 ? 2 : 1)}%` : '∞'}
              </div>
              <div className="flex-1 h-2 rounded-full overflow-hidden flex" dir="ltr">
                <div className="h-full" style={{ width: '10%', background: 'var(--green)' }} />
                <div className="h-full" style={{ width: '40%', background: 'var(--gold-2)' }} />
                <div className="h-full flex-1" style={{ background: 'var(--red-2)', opacity: 0.8 }} />
              </div>
            </div>
            <p className="text-[11px] leading-relaxed mt-2" style={{ color: shareColors[sVerdict] }}>{shareText[sVerdict]}</p>
          </div>

          {/* 2 · the crown rule: yield buys it */}
          <div className="rounded-xl bg-white/[0.06] border border-white/15 p-4">
            <div className="text-[10px] tracking-wide uppercase text-white/50 mb-2">{L('قاعدة التاج — الريع يشتريها', 'The crown rule — yield buys it')}</div>
            {Number.isFinite(yMonths) ? (
              <>
                <div className="font-serif text-3xl font-bold" style={{ color: yMonths <= 12 ? 'var(--green)' : yMonths <= 36 ? 'var(--gold-2)' : 'var(--red-2)' }}>
                  {yMonths < 1 ? L('أقل من شهر', '< a month') : L(`${Math.ceil(yMonths)} شهراً`, `${Math.ceil(yMonths)} months`)}
                </div>
                <p className="text-[11px] text-white/70 leading-relaxed mt-2">
                  {yMonths <= 12
                    ? L(`ريع مالك العامل (${SAFE_YIELD * 100}%) يدفع ثمنها وحده خلال هذه المدة — هذه رفاهية يشتريها مالك، لا أنت.`, `Your working capital's ${SAFE_YIELD * 100}% yield pays for it alone within this — a luxury your money buys, not you.`)
                    : L(`هذا ما يحتاجه ريع مالك العامل وحده ليدفع ثمنها. القاعدة: حين تنزل تحت ١٢ شهراً، مالك يشتريها لك.`, `That's how long your working capital's yield alone needs. The rule: when it drops under 12 months, your money buys it for you.`)}
                </p>
              </>
            ) : (
              <p className="text-[11px] text-white/70 leading-relaxed">
                {L('لا مال عاملاً بعد — الرفاهية عند الأثرياء تُشترى من ريع محفظة تعمل. ابدأ المحفظة أولاً.', 'No working capital yet — the wealthy buy luxury from a working portfolio\'s yield. Start the portfolio first.')}
              </p>
            )}
          </div>

          {/* 3 · true 10-year cost */}
          <div className="rounded-xl bg-white/[0.06] border border-white/15 p-4">
            <div className="text-[10px] tracking-wide uppercase text-white/50 mb-2.5">{L('كلفتها الحقيقية بعد ١٠ سنوات', 'Its true cost over 10 years')}</div>
            {([
              [L('لو استثمرت ثمنها بدلاً منها', 'If you invested its price instead'), alt10, 'var(--blue-2)'],
              [L('ما تبقيه لك عند البيع', 'What it still returns at resale'), res10, 'var(--green)'],
              [L('الكلفة الحقيقية (الفارق + الصيانة)', 'The true cost (gap + upkeep)'), tCost, 'var(--red-2)'],
            ] as [string, number, string][]).map(([label, v, color], i) => (
              <div key={i} className="mb-1.5">
                <div className="flex justify-between text-[10px] text-white/65 mb-0.5">
                  <span>{label}</span><span dir="ltr" className="font-semibold text-white/85">{moneyC(v)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden" dir="ltr">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, (v / Math.max(alt10, 1)) * 100)}%`, background: color }} />
                </div>
              </div>
            ))}
            <p className="text-[10px] text-white/55 leading-relaxed mt-2">
              {ar ? clsMeta.blurb.ar : clsMeta.blurb.en}
            </p>
          </div>

          {/* 4 · joy per riyal */}
          <div className="rounded-xl bg-white/[0.06] border border-white/15 p-4">
            <div className="text-[10px] tracking-wide uppercase text-white/50 mb-2">{L('ثمن كل لحظة فرح', 'The price of each moment of joy')}</div>
            <div className="font-serif text-3xl font-bold text-[var(--gold)]">
              <span dir="ltr">{money(Math.round(perUse))}</span>
              <span className="text-xs text-white/60 font-normal"> {L('لكل استخدام', 'per use')}</span>
            </div>
            <div className="mt-3 space-y-2.5 text-[10px] text-white/65">
              <label className="block">
                {L(`الاستخدام: ${usesPerWeek} مرات أسبوعياً`, `Use: ${usesPerWeek}× a week`)}
                <input type="range" min={1} max={14} value={usesPerWeek} onChange={(e) => setUsesPerWeek(Number(e.target.value))} className="w-full accent-[#E4C465]" dir="ltr" />
              </label>
              <label className="block">
                {L(`المدة: ${years} سنوات`, `Horizon: ${years} years`)}
                <input type="range" min={1} max={15} value={years} onChange={(e) => setYears(Number(e.target.value))} className="w-full accent-[#E4C465]" dir="ltr" />
              </label>
            </div>
            <p className="text-[10px] text-white/55 leading-relaxed mt-1.5">
              {L('الرفاهية التي تُستعمل كثيراً تصير رخيصة الفرح؛ والتي تُركن تصير أغلى ما تملك.', 'A luxury used often becomes cheap joy; one left parked becomes the most expensive thing you own.')}
            </p>
          </div>
        </div>

        {/* the wealth-behavior spectrum */}
        <div className="mt-4 rounded-xl bg-white/[0.06] border border-white/15 p-4">
          <div className="text-[10px] tracking-wide uppercase text-white/50 mb-2.5">{L('أين تقف على طيف الثروة؟', 'Where does it sit on the wealth spectrum?')}</div>
          <div className="relative h-2 rounded-full overflow-hidden" dir="ltr" style={{ background: 'linear-gradient(90deg, var(--red-2), var(--gold-2), var(--green))' }}>
            <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white ring-2 ring-[var(--gold)] shadow-lg" style={{ left: `calc(${clsMeta.spectrum * 100}% - 8px)` }} />
          </div>
          <div className="flex justify-between text-[9px] text-white/50 mt-1.5" dir="ltr">
            <span>{L('بالوعة مال', 'Money pit')}</span>
            <span>{L('مخزن قيمة', 'Store of value')}</span>
          </div>
        </div>
      </div>

      {/* onward */}
      <div className="flex gap-2.5 flex-wrap text-[11px] mb-8">
        <Link href="/compare" className="text-[var(--green-dark)] font-medium bg-[var(--green-bg)] border border-[var(--green-border)] rounded-lg px-3 py-1.5">
          {L('قارنها بخيار آخر ←', 'Compare it against an alternative →')}
        </Link>
        <Link href="/what-if" className="text-[var(--ink-2)] border border-[var(--border-default)] rounded-lg px-3 py-1.5">
          {L('جرّبها في «ماذا لو»', 'Try it in What-If')}
        </Link>
        <Link href="/goal-fund" className="text-[var(--ink-2)] border border-[var(--border-default)] rounded-lg px-3 py-1.5">
          {L('اجعلها صندوق هدف يُموِّلها الريع', 'Make it a yield-funded goal fund')}
        </Link>
      </div>
    </div>
  );
}
