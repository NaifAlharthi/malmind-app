'use client';

// Compare & Decide — life decisions as side-by-side unit economics. Pick a
// decision frame, put one option on each side of the line, and read the
// blend: totals at your usage level, cost per unit, the breakeven, and a
// plain-language verdict. The scheme library lives in lib/compare.ts.

import { useMemo, useState } from 'react';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import {
  SCHEMES, getScheme, fixedTotal, perUnitTotal, monthlyTotal, costPerUnit,
  breakevenVolume, mileValueHalalas,
  type Scheme, type UsageScheme, type MilesScheme, type UsageOption, type L10n,
} from '@/lib/compare';

const fmt = (n: number, dp = 0) => n.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });

export default function ComparePage() {
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const pick = (l: L10n) => (ar ? l.ar : l.en);
  const money = (n: number, dp = 0) => (ar ? `${fmt(n, dp)} ريال` : `SAR ${fmt(n, dp)}`);

  const [schemeId, setSchemeId] = useState<string>(SCHEMES[0].id);
  const scheme = getScheme(schemeId);

  return (
    <div>
      <div className="mb-1 text-[10px] tracking-[0.1em] uppercase text-[var(--blue)] font-semibold">{L('قرّر', 'Decide')}</div>
      <h1 className="font-serif text-2xl font-semibold text-[var(--ink)] mb-1">{L('قارن وقرّر', 'Compare & Decide')}</h1>
      <p className="text-sm text-[var(--ink-2)] mb-5 max-w-2xl">
        {L(
          'ضع خيارين وجهاً لوجه، وانظر إلى اقتصاديات الوحدة لكلٍّ منهما — ثم اقرأ الخلاصة: أيّهما أوفر على نمط حياتك أنت، وأين نقطة التعادل.',
          'Put two options face to face and see the unit economics of each — then read the blend: which is cheaper for how you actually live, and where the breakeven sits.'
        )}
      </p>

      {/* scheme picker */}
      <div className="flex gap-2 flex-wrap mb-5">
        {SCHEMES.map((s) => (
          <button key={s.id} onClick={() => setSchemeId(s.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors ${
              schemeId === s.id
                ? 'bg-[var(--ink)] text-[var(--surface-0)] border-[var(--ink)]'
                : 'bg-[var(--surface-card)] text-[var(--ink-2)] border-[var(--border-default)] hover:border-[var(--green)]'
            }`}>
            {s.icon} {pick(s.title)}
          </button>
        ))}
      </div>

      <div className="text-sm text-[var(--ink-2)] italic mb-4">“{pick(scheme.question)}”</div>

      {scheme.kind === 'usage'
        ? <UsageDuel key={scheme.id} scheme={scheme} ar={ar} pick={pick} money={money} />
        : <MilesDuel key={scheme.id} scheme={scheme} ar={ar} pick={pick} money={money} />}

      <p className="text-[11px] text-[var(--muted)] mt-4 leading-relaxed">
        {L(
          '⚖️ الأرقام المعبّأة مسبقاً تقديرات توضيحية من السوق السعودي لمساعدتك على التفكير — تحقّق من عروض اليوم قبل أي قرار نهائي.',
          '⚖️ Prefilled numbers are illustrative Saudi-market estimates to think with — check current offers before a final decision.'
        )}
      </p>
    </div>
  );
}

// ── Usage-based duel (car vs ride-hailing, cook vs subscribe, card vs card) ──
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
      {/* the split card */}
      <div className="relative bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl overflow-hidden mb-4">
        <div className="grid sm:grid-cols-2">
          <OptionPanel side="a" option={left} otherId={right.id} scheme={scheme} volume={volume} onChoose={setLeftId} ar={ar} pick={pick} money={money} />
          <div className="hidden sm:block absolute inset-y-4 left-1/2 w-px bg-[var(--border-medium)]" aria-hidden />
          <OptionPanel side="b" option={right} otherId={left.id} scheme={scheme} volume={volume} onChoose={setRightId} ar={ar} pick={pick} money={money} />
        </div>
        {/* VS badge on the line */}
        <div className="hidden sm:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[var(--ink)] text-[var(--surface-0)] items-center justify-center font-serif font-bold text-sm shadow-lg" aria-hidden>
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
    <div className="p-5">
      <select
        value={option.id}
        onChange={(e) => onChoose(e.target.value)}
        className="w-full bg-[var(--surface-0)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm font-medium outline-none focus:border-[var(--green)] mb-1.5"
      >
        {scheme.options.map((o) => (
          <option key={o.id} value={o.id} disabled={o.id === otherId}>{o.icon} {pick(o.name)}</option>
        ))}
      </select>
      {option.note && <div className="text-[10px] text-[var(--muted)] mb-3 leading-relaxed">{pick(option.note)}</div>}

      {/* unit economics lines */}
      <div className="space-y-1 mb-3">
        {option.fixedMonthly.map((l, i) => (
          <div key={`f${i}`} className="flex justify-between gap-2 text-[11px]">
            <span className="text-[var(--ink-2)]">{pick(l.label)}</span>
            <span className={`font-medium ${l.amount < 0 ? 'text-[var(--green-dark)]' : 'text-[var(--ink)]'}`}>
              {l.amount < 0 ? '−' : ''}{money(Math.abs(l.amount))}<span className="text-[var(--muted)] font-normal">/{L('شهر', 'mo')}</span>
            </span>
          </div>
        ))}
        {option.perUnit.map((l, i) => (
          <div key={`u${i}`} className="flex justify-between gap-2 text-[11px]">
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
        <div className="font-serif text-2xl font-bold" style={{ color: accent }}>
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

// ── The miles duel: redeem reward miles, or pay cash? ──────────────────
function MilesDuel({ scheme, ar, pick, money }: {
  scheme: MilesScheme; ar: boolean; pick: (l: L10n) => string; money: (n: number, dp?: number) => string;
}) {
  const L = (a: string, e: string) => (ar ? a : e);
  const [flightId, setFlightId] = useState(scheme.flights[0].id);
  const preset = scheme.flights.find((f) => f.id === flightId) ?? scheme.flights[0];
  const [cashPrice, setCashPrice] = useState(preset.cashPrice);
  const [miles, setMiles] = useState(preset.miles);
  const [fees, setFees] = useState(preset.fees);

  const chooseFlight = (id: string) => {
    const f = scheme.flights.find((x) => x.id === id) ?? scheme.flights[0];
    setFlightId(id); setCashPrice(f.cashPrice); setMiles(f.miles); setFees(f.fees);
  };

  const halalas = mileValueHalalas({ ...preset, cashPrice, miles, fees });
  const redeem = halalas >= scheme.benchmarkHalalas;
  const totalMilesValue = (cashPrice - fees);

  const inputCls = 'w-full bg-[var(--surface-0)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--green)]';

  return (
    <>
      {/* the flight being decided */}
      <div className="mb-4">
        <label className="text-xs text-[var(--muted)] block mb-1.5">{L('الرحلة محلّ القرار', 'The flight in question')}</label>
        <select value={flightId} onChange={(e) => chooseFlight(e.target.value)} className={inputCls + ' max-w-md'}>
          {scheme.flights.map((f) => <option key={f.id} value={f.id}>{pick(f.name)}</option>)}
        </select>
      </div>

      {/* the split card */}
      <div className="relative bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl overflow-hidden mb-4">
        <div className="grid sm:grid-cols-2">
          {/* side A: redeem miles */}
          <div className="p-5">
            <div className="text-sm font-semibold text-[var(--ink)] mb-1">🎟 {L('استبدل الأميال', 'Redeem miles')}</div>
            <div className="text-[10px] text-[var(--muted)] mb-3">{L('تحرق أميالك وتدفع الرسوم فقط', 'Burn the miles, pay only the fees')}</div>
            <div className="space-y-2.5">
              <div>
                <label className="text-[10px] text-[var(--muted)] block mb-1">{L('الأميال المطلوبة', 'Miles required')}</label>
                <input type="number" value={miles} onChange={(e) => setMiles(Number(e.target.value) || 0)} className={inputCls} dir="ltr" />
              </div>
              <div>
                <label className="text-[10px] text-[var(--muted)] block mb-1">{L('رسوم ومطارات (ريال)', 'Taxes & fees (SAR)')}</label>
                <input type="number" value={fees} onChange={(e) => setFees(Number(e.target.value) || 0)} className={inputCls} dir="ltr" />
              </div>
            </div>
            <div className="pt-3 mt-3 border-t border-[var(--border-faint)]">
              <div className="text-[10px] text-[var(--muted)]">{L('قيمة الميل الواحد في هذا الاستبدال', 'What one mile returns here')}</div>
              <div className="font-serif text-2xl font-bold text-[var(--blue-2)]">
                {fmt(halalas, 2)} <span className="text-xs font-normal text-[var(--muted)]">{L('هللة/ميل', 'halalas / mile')}</span>
              </div>
              <div className="text-[11px] text-[var(--ink-2)] mt-0.5">{L('أميالك هنا تساوي ', 'your miles here are worth ')}{money(totalMilesValue)}</div>
            </div>
          </div>

          <div className="hidden sm:block absolute inset-y-4 left-1/2 w-px bg-[var(--border-medium)]" aria-hidden />

          {/* side B: pay cash */}
          <div className="p-5">
            <div className="text-sm font-semibold text-[var(--ink)] mb-1">💳 {L('ادفع نقداً', 'Pay cash')}</div>
            <div className="text-[10px] text-[var(--muted)] mb-3">{L('تدفع السعر كاملاً وتحتفظ بأميالك لاستبدالٍ أفضل', 'Pay full price, keep the miles for a better redemption')}</div>
            <div>
              <label className="text-[10px] text-[var(--muted)] block mb-1">{L('سعر التذكرة نقداً (ريال)', 'Cash ticket price (SAR)')}</label>
              <input type="number" value={cashPrice} onChange={(e) => setCashPrice(Number(e.target.value) || 0)} className={inputCls} dir="ltr" />
            </div>
            <div className="pt-3 mt-3 border-t border-[var(--border-faint)]">
              <div className="text-[10px] text-[var(--muted)]">{L('المرجع: الميل الجيّد يعيد', 'Benchmark: a good redemption returns')}</div>
              <div className="font-serif text-2xl font-bold text-[var(--green)]">
                ≥ {fmt(scheme.benchmarkHalalas, 1)} <span className="text-xs font-normal text-[var(--muted)]">{L('هللة/ميل', 'halalas / mile')}</span>
              </div>
              <div className="text-[11px] text-[var(--ink-2)] mt-0.5">{L('أقل من ذلك، والنقد أذكى', 'below that, cash is the smarter riyal')}</div>
            </div>
          </div>
        </div>
        <div className="hidden sm:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[var(--ink)] text-[var(--surface-0)] items-center justify-center font-serif font-bold text-sm shadow-lg" aria-hidden>
          VS
        </div>
      </div>

      {/* the blend */}
      <div className="bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] rounded-2xl p-5 text-white">
        <div className="text-[10px] tracking-[0.12em] uppercase text-[var(--gold)] mb-2">{L('الخلاصة', 'The blend')}</div>
        <div className="text-sm leading-relaxed">
          {redeem ? (
            <>
              {L('استبدل الأميال. ', 'Redeem the miles. ')}
              {L('هذا الاستبدال يعيد ', 'This redemption returns ')}
              <strong className="text-[#7FE8C4]">{fmt(halalas, 2)} {L('هللة للميل', 'halalas per mile')}</strong>
              {L(' — أعلى من مرجع ', ' — above the ')}
              {fmt(scheme.benchmarkHalalas, 1)}
              {L(' هللة، أي أن أميالك تشتري هنا أكثر مما يشتريه الريال.', ' halala benchmark, so your miles buy more here than riyals would.')}
            </>
          ) : (
            <>
              {L('ادفع نقداً واحتفظ بالأميال. ', 'Pay cash and keep the miles. ')}
              {L('هذا الاستبدال يعيد ', 'This redemption returns only ')}
              <strong className="text-[#F0B6A4]">{fmt(halalas, 2)} {L('هللة للميل فقط', 'halalas per mile')}</strong>
              {L(' — دون مرجع ', ' — under the ')}
              {fmt(scheme.benchmarkHalalas, 1)}
              {L(' هللة، فأميالك أثمن من أن تُحرق على هذه الرحلة.', ' halala benchmark; your miles are worth more than this flight is charging them.')}
            </>
          )}
        </div>
      </div>
    </>
  );
}
