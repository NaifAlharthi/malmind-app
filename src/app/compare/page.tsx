'use client';

// Compare & Decide — life decisions as side-by-side unit economics. Pick a
// life category, put one option on each side of the line, and read the blend.
// The engine lives in lib/compare.ts; the Saudi-market database of actual
// offerings lives in lib/compareData.ts.

import { useMemo, useState } from 'react';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import {
  fixedTotal, perUnitTotal, monthlyTotal, costPerUnit, breakevenVolume,
  type UsageScheme, type MilesScheme, type UsageOption, type L10n,
} from '@/lib/compare';
import { CATEGORIES, AS_OF } from '@/lib/compareData';

const fmt = (n: number, dp = 0) => n.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });

export default function ComparePage() {
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const pick = (l: L10n) => (ar ? l.ar : l.en);
  const money = (n: number, dp = 0) => (ar ? `${fmt(n, dp)} ريال` : `SAR ${fmt(n, dp)}`);

  const [catId, setCatId] = useState<string>(CATEGORIES[0].id);
  const cat = CATEGORIES.find((c) => c.id === catId) ?? CATEGORIES[0];
  const scheme = cat.scheme;

  return (
    <div>
      <div className="mb-1 text-[10px] tracking-[0.1em] uppercase text-[var(--blue)] font-semibold">{L('قرّر', 'Decide')}</div>
      <h1 className="font-serif text-2xl font-semibold text-[var(--ink)] mb-1">{L('قارن وقرّر', 'Compare & Decide')}</h1>
      <p className="text-sm text-[var(--ink-2)] mb-5 max-w-2xl">
        {L(
          'اختر جانباً من حياتك، وضع خيارين حقيقيين من السوق السعودي وجهاً لوجه — ثم اقرأ الخلاصة: أيّهما أوفر على نمط حياتك أنت.',
          'Pick a part of your life, put two real Saudi-market options face to face — then read the blend: which is cheaper for how you actually live.'
        )}
      </p>

      {/* generic life categories */}
      <div className="flex gap-2 flex-wrap mb-5">
        {CATEGORIES.map((c) => (
          <button key={c.id} onClick={() => setCatId(c.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              catId === c.id
                ? 'bg-[var(--ink)] text-[var(--surface-0)] border-[var(--ink)]'
                : 'bg-[var(--surface-card)] text-[var(--ink-2)] border-[var(--border-default)] hover:border-[var(--green)]'
            }`}>
            {c.icon} {pick(c.name)}
          </button>
        ))}
      </div>

      <div className="text-sm text-[var(--ink-2)] italic mb-4">“{pick(scheme.question)}”</div>

      {scheme.kind === 'usage'
        ? <UsageDuel key={cat.id} scheme={scheme} ar={ar} pick={pick} money={money} />
        : <MilesDuel key={cat.id} scheme={scheme} ar={ar} pick={pick} />}

      <p className="text-[11px] text-[var(--muted)] mt-4 leading-relaxed">
        {L(
          `⚖️ بيانات حقيقية من السوق السعودي كما رُصدت في ${AS_OF} من مصادر مقارنة عامة — الرسوم والعروض تتغيّر، فتحقّق من مزوّد الخدمة قبل القرار النهائي.`,
          `⚖️ Real Saudi-market data as researched in ${AS_OF} from public comparison sources — fees and offers drift, so verify with the provider before a final decision.`
        )}
      </p>
    </div>
  );
}

// ── Usage-based duel (cards, transport, food) ───────────────────────────
function UsageDuel({ scheme, ar, pick, money }: {
  scheme: UsageScheme; ar: boolean; pick: (l: L10n) => string; money: (n: number, dp?: number) => string;
}) {
  const L = (a: string, e: string) => (ar ? a : e);
  const [leftId, setLeftId] = useState(scheme.defaults[0]);
  const [rightId, setRightId] = useState(scheme.defaults[1]);
  const [volume, setVolume] = useState(scheme.defaultVolume);

  const left = scheme.options.find((o) => o.id === leftId) ?? scheme.options[0];
  const right = scheme.options.find((o) => o.id === rightId) ?? scheme.options[1];

  const lTotal = monthlyTotal(left, volume);
  const rTotal = monthlyTotal(right, volume);
  const winner = lTotal === rTotal ? null : lTotal < rTotal ? left : right;
  const loserTotal = Math.max(lTotal, rTotal);
  const delta = Math.abs(lTotal - rTotal);
  const be = useMemo(() => breakevenVolume(left, right), [left, right]);

  // Below the crossover, usage is small and fixed costs dominate — so the
  // side with the STEEPER per-unit slope (and lighter fixed base) is the
  // cheap one below breakeven, and the flatter side wins above it.
  const cheaperBelow = perUnitTotal(left) > perUnitTotal(right) ? left : right;
  const cheaperAbove = cheaperBelow.id === left.id ? right : left;

  return (
    <>
      {/* the split card — always LEFT | RIGHT, the way people weigh options */}
      <div className="relative bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl overflow-hidden mb-4">
        <div className="grid grid-cols-2">
          <OptionPanel side="a" option={left} otherId={right.id} scheme={scheme} volume={volume} onChoose={setLeftId} ar={ar} pick={pick} money={money} />
          <OptionPanel side="b" option={right} otherId={left.id} scheme={scheme} volume={volume} onChoose={setRightId} ar={ar} pick={pick} money={money} />
        </div>
        <div className="absolute inset-y-3 left-1/2 w-px bg-[var(--border-medium)]" aria-hidden />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[var(--ink)] text-[var(--surface-0)] flex items-center justify-center font-serif font-bold text-xs shadow-lg" aria-hidden>
          VS
        </div>
      </div>

      {/* the usage dial both sides share */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
        <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
          <span className="text-xs text-[var(--muted)]">{L('نمط استخدامك:', 'Your usage:')}</span>
          <span className="text-sm font-semibold text-[var(--ink)]">
            {fmt(volume)} <span className="text-[11px] text-[var(--muted)] font-normal">{pick(scheme.unit)}</span>
          </span>
        </div>
        <input
          type="range" min={scheme.minVolume} max={scheme.maxVolume} step={scheme.step} value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="w-full accent-[var(--green-dark)]" dir="ltr"
        />
      </div>

      {/* the blend */}
      <div className="bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] rounded-2xl p-5 text-white">
        <div className="text-[10px] tracking-[0.12em] uppercase text-[var(--gold)] mb-2">{L('الخلاصة', 'The blend')}</div>
        {winner ? (
          <div className="text-sm leading-relaxed">
            {L('على نمطك الحالي، ', 'At your usage, ')}
            <strong className="text-[#7FE8C4]">{pick(winner.name)}</strong>
            {L(' أوفر بـ ', ' is cheaper by ')}
            <strong className="text-[#7FE8C4]">{money(delta)}</strong>
            {L(' شهرياً', ' a month')}
            <span className="text-white/60"> ({money(delta * 12)} {L('سنوياً', 'a year')})</span>
            {loserTotal !== 0 && delta / Math.abs(loserTotal) > 0.25 && (
              <span> — {L('فرق كبير يستحق القرار.', 'a gap worth acting on.')}</span>
            )}
          </div>
        ) : (
          <div className="text-sm">{L('الخياران متعادلان تماماً على نمطك الحالي.', 'The two options cost exactly the same at your usage.')}</div>
        )}
        {be != null && be >= scheme.minVolume && be <= scheme.maxVolume && (
          <div className="text-xs text-white/70 mt-2 leading-relaxed">
            {L('نقطة التعادل: ', 'Breakeven: ')}
            <strong className="text-white">{fmt(be)} {pick(scheme.unitShort)}</strong>
            {L(' شهرياً — أقل من ذلك تكسب مع ', ' a month — below it ')}
            <strong>{pick(cheaperBelow.name)}</strong>
            {L('، وفوقه مع ', ' wins, above it ')}
            <strong>{pick(cheaperAbove.name)}</strong>.
          </div>
        )}
      </div>
    </>
  );
}

function OptionPanel({ side, option, otherId, scheme, volume, onChoose, ar, pick, money }: {
  side: 'a' | 'b'; option: UsageOption; otherId: string; scheme: UsageScheme; volume: number;
  onChoose: (id: string) => void; ar: boolean; pick: (l: L10n) => string; money: (n: number, dp?: number) => string;
}) {
  const L = (a: string, e: string) => (ar ? a : e);
  const total = monthlyTotal(option, volume);
  const cpu = costPerUnit(option, volume);
  const accent = side === 'a' ? 'var(--blue-2)' : 'var(--green)';

  return (
    <div className="p-3 sm:p-5 min-w-0">
      <select
        value={option.id}
        onChange={(e) => onChoose(e.target.value)}
        className="w-full bg-[var(--surface-0)] border border-[var(--border-default)] rounded-lg px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium outline-none focus:border-[var(--green)] mb-1.5"
      >
        {scheme.options.map((o) => (
          <option key={o.id} value={o.id} disabled={o.id === otherId}>{o.icon} {pick(o.name)}</option>
        ))}
      </select>
      {option.note && <div className="text-[10px] text-[var(--muted)] mb-3 leading-relaxed">{pick(option.note)}</div>}

      {/* unit economics lines */}
      <div className="space-y-1 mb-3">
        {option.fixedMonthly.map((l, i) => (
          <div key={`f${i}`} className="flex justify-between gap-2 text-[11px] flex-wrap">
            <span className="text-[var(--ink-2)]">{pick(l.label)}</span>
            <span className={`font-medium ${l.amount < 0 ? 'text-[var(--green-dark)]' : 'text-[var(--ink)]'}`}>
              {l.amount < 0 ? '−' : ''}{money(Math.abs(l.amount))}<span className="text-[var(--muted)] font-normal">/{L('شهر', 'mo')}</span>
            </span>
          </div>
        ))}
        {option.perUnit.map((l, i) => (
          <div key={`u${i}`} className="flex justify-between gap-2 text-[11px] flex-wrap">
            <span className="text-[var(--ink-2)]">{pick(l.label)}</span>
            <span className={`font-medium ${l.amount < 0 ? 'text-[var(--green-dark)]' : 'text-[var(--ink)]'}`}>
              {l.amount < 0 ? '−' : ''}{money(Math.abs(l.amount), Math.abs(l.amount) < 1 ? 3 : 2)}
              <span className="text-[var(--muted)] font-normal">/{pick(scheme.unitShort)}</span>
            </span>
          </div>
        ))}
        {option.fixedMonthly.length === 0 && option.perUnit.length === 0 && (
          <div className="text-[11px] text-[var(--muted)]">{L('بلا تكاليف ثابتة', 'No fixed costs')}</div>
        )}
      </div>

      <div className="pt-3 border-t border-[var(--border-faint)]">
        <div className="text-[10px] text-[var(--muted)]">{L('الإجمالي على نمطك', 'Total at your usage')}</div>
        <div className="font-serif text-xl sm:text-2xl font-bold" style={{ color: accent }}>
          {total < 0 ? '+' : ''}{money(Math.abs(total))}
          <span className="text-xs text-[var(--muted)] font-normal"> /{L('شهر', 'mo')}</span>
        </div>
        {cpu != null && (
          <div className="text-[11px] text-[var(--ink-2)] mt-0.5">
            {total < 0 ? L('صافي مكسب ', 'net gain ') : ''}{money(Math.abs(cpu), Math.abs(cpu) < 1 ? 3 : 2)} / {pick(scheme.unitShort)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── The currency duel: a loyalty mile as a unit vs the riyal as a unit ──
function MilesDuel({ scheme, ar, pick }: {
  scheme: MilesScheme; ar: boolean; pick: (l: L10n) => string;
}) {
  const L = (a: string, e: string) => (ar ? a : e);
  const [programId, setProgramId] = useState(scheme.programs[0].id);
  const program = scheme.programs.find((p) => p.id === programId) ?? scheme.programs[0];
  const [offer, setOffer] = useState(scheme.defaultOfferHalalas); // halalas/mile my redemption returns

  const redeem = offer >= program.benchmarkHalalas;
  const [lo, hi] = program.typicalHalalas;

  return (
    <>
      {/* the split card — the mile on one side, the riyal on the other */}
      <div className="relative bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl overflow-hidden mb-4">
        <div className="grid grid-cols-2">
          {/* side A: the mile as a unit */}
          <div className="p-3 sm:p-5 min-w-0">
            <select value={programId} onChange={(e) => setProgramId(e.target.value)}
              className="w-full bg-[var(--surface-0)] border border-[var(--border-default)] rounded-lg px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium outline-none focus:border-[var(--green)] mb-1.5">
              {scheme.programs.map((p) => <option key={p.id} value={p.id}>✈️ {pick(p.name)}</option>)}
            </select>
            {program.note && <div className="text-[10px] text-[var(--muted)] mb-3 leading-relaxed">{pick(program.note)}</div>}

            <div className="space-y-2.5">
              <div>
                <div className="text-[10px] text-[var(--muted)]">{L('القيمة النموذجية للميل', 'Typical value of one mile')}</div>
                <div className="font-serif text-xl sm:text-2xl font-bold text-[var(--blue-2)]">
                  {fmt(lo, 1)}–{fmt(hi, 1)} <span className="text-xs font-normal text-[var(--muted)]">{L('هللة', 'halalas')}</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--muted)]">{L('استبدل حين يعيد الميل أكثر من', 'Redeem when a mile returns over')}</div>
                <div className="font-serif text-lg font-bold text-[var(--ink)]">
                  {fmt(program.benchmarkHalalas, 1)} <span className="text-xs font-normal text-[var(--muted)]">{L('هللة', 'halalas')}</span>
                </div>
              </div>
              <div className="text-[10px] text-[var(--muted)] leading-relaxed pt-2 border-t border-[var(--border-faint)]">
                {pick(program.earnExample)}
              </div>
            </div>
          </div>

          {/* side B: the riyal as a unit */}
          <div className="p-3 sm:p-5 min-w-0">
            <div className="w-full bg-[var(--surface-1)] border border-[var(--border-default)] rounded-lg px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium mb-1.5 text-[var(--ink)]">
              🪙 {L('الريال السعودي', 'The Saudi riyal')}
            </div>
            <div className="text-[10px] text-[var(--muted)] mb-3 leading-relaxed">
              {L('العملة المرجعية — قيمتها لا تعتمد على توفّر مقاعد ولا شروط برنامج', 'The reference currency — its value needs no seat availability and no programme terms')}
            </div>
            <div className="space-y-2.5">
              <div>
                <div className="text-[10px] text-[var(--muted)]">{L('قيمة الريال، دائماً', 'Value of one riyal, always')}</div>
                <div className="font-serif text-xl sm:text-2xl font-bold text-[var(--green)]">
                  100 <span className="text-xs font-normal text-[var(--muted)]">{L('هللة', 'halalas')}</span>
                </div>
              </div>
              <div className="text-[11px] text-[var(--ink-2)] leading-relaxed">
                {L('الدفع نقداً يعني أيضاً أن أميالك تبقى لاستبدالٍ أعلى قيمة لاحقاً.', 'Paying cash also keeps your miles for a higher-value redemption later.')}
              </div>
            </div>
          </div>
        </div>
        <div className="absolute inset-y-3 left-1/2 w-px bg-[var(--border-medium)]" aria-hidden />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[var(--ink)] text-[var(--surface-0)] flex items-center justify-center font-serif font-bold text-xs shadow-lg" aria-hidden>
          VS
        </div>
      </div>

      {/* my redemption dial */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
        <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1">
          <span className="text-xs text-[var(--muted)]">{L('الاستبدال المعروض عليك يعيد للميل:', 'The redemption in front of you returns, per mile:')}</span>
          <span className="text-sm font-semibold text-[var(--ink)]">{fmt(offer, 1)} {L('هللة', 'halalas')}</span>
        </div>
        <div className="text-[10px] text-[var(--muted)] mb-2">
          {L('احسبها: (سعر التذكرة نقداً − الرسوم) ÷ الأميال المطلوبة × 100', 'Work it out: (cash ticket price − fees) ÷ miles required × 100')}
        </div>
        <input type="range" min={0.5} max={6} step={0.1} value={offer}
          onChange={(e) => setOffer(Number(e.target.value))}
          className="w-full accent-[var(--green-dark)]" dir="ltr" />
      </div>

      {/* the blend */}
      <div className="bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] rounded-2xl p-5 text-white">
        <div className="text-[10px] tracking-[0.12em] uppercase text-[var(--gold)] mb-2">{L('الخلاصة', 'The blend')}</div>
        <div className="text-sm leading-relaxed">
          {redeem ? (
            <>
              {L('استبدل الأميال. ', 'Redeem the miles. ')}
              {L('عند ', 'At ')}
              <strong className="text-[#7FE8C4]">{fmt(offer, 1)} {L('هللة للميل', 'halalas per mile')}</strong>
              {L('، ميل ', ', a ')}
              {pick(program.name)}
              {L(' يشتري هنا أكثر مما يشتريه الريال — فوق مرجع ', ' mile buys more here than the riyal would — above the ')}
              {fmt(program.benchmarkHalalas, 1)}
              {L(' هللة.', ' halala benchmark.')}
            </>
          ) : (
            <>
              {L('ادفع بالريال واحتفظ بالأميال. ', 'Pay in riyals and keep the miles. ')}
              {L('عند ', 'At ')}
              <strong className="text-[#F0B6A4]">{fmt(offer, 1)} {L('هللة للميل فقط', 'halalas per mile only')}</strong>
              {L('، هذا الاستبدال دون مرجع ', ', this redemption sits under the ')}
              {fmt(program.benchmarkHalalas, 1)}
              {L(' هللة — أميالك أثمن من أن تُحرق هنا، والنموذجي لها ', ' halala benchmark — your miles are worth more than this; their typical band is ')}
              {fmt(lo, 1)}–{fmt(hi, 1)}
              {L(' هللة.', ' halalas.')}
            </>
          )}
        </div>
      </div>
    </>
  );
}
