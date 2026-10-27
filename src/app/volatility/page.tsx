'use client';

// Volatility — «التقلّب» — how much a financial life shakes, told in
// the product's own sea language. Reads the Log, measures five
// dimensions of roughness, and stages the reading:
//   D1 · the sea state — the calm score and its verdict
//   D2 · the seismograph — the surplus trembling month by month,
//        and the five dimensions each with its own sea
//   D3 · is it calming? — the rolling storm line, the deepest falls,
//        and the diagnosis of the noisiest dimension
//   D4 · what the shaking costs — the storm buffer a life must hold,
//        the drag volatility puts on compounding, and the calming lever
// All computed from the user's own months — no reference data needed.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BarChart, Bar, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import ToolStage from '@/components/shared/ToolStage';
import { computeVolatility, BAND_META, DIM_META, type VolSnap, type VolReport } from '@/lib/volatility';

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
const pct1 = (f: number) => `${Math.round(f * 1000) / 10}%`;

export default function VolatilityPage() {
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const [snaps, setSnaps] = useState<VolSnap[] | null>(null);
  const [calmBy, setCalmBy] = useState(30); // D4 lever: reduce roughness by %

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSnaps([]); return; }
      const { data } = await supabase.from('financial_snapshots')
        .select('year, month, income, expenses, cash, stocks, equity, real_estate, other_assets, liabilities')
        .eq('user_id', user.id)
        .order('year', { ascending: true }).order('month', { ascending: true });
      setSnaps((data as VolSnap[]) ?? []);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const r: VolReport | null = useMemo(() => (snaps ? computeVolatility(snaps) : null), [snaps]);

  if (snaps === null) return <div className="text-sm text-[var(--muted)]">…</div>;

  const axisTick = { fontSize: 9, fill: 'var(--muted)' };
  const tipStyle = { background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 11 };

  return (
    <div className="max-w-3xl">
      <div className="text-[10px] tracking-[0.12em] uppercase text-[var(--gold)] mb-1">☀ {L('اليوم', 'Today')}</div>
      <h1 className="font-serif text-3xl font-semibold text-[var(--ink)] mb-1">🌊 {L('التقلّب', 'Volatility')}</h1>
      <p className="text-sm text-[var(--ink-2)] mb-6 max-w-2xl">
        {L('كم يهتزّ مالك؟ قياسٌ لحالة بحرك المالي — من سطحه الهادئ إلى عواصفه.', 'How much does your money shake? A reading of your financial sea — from mirror-calm to storm.')}
      </p>

      {!r ? (
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 text-[12px] text-[var(--muted)] leading-relaxed">
          {L('يحتاج قياس التقلّب أربعة أشهر مسجّلة على الأقل — أكمل شهورك في ', 'Measuring volatility needs at least four logged months — fill your months in ')}
          <Link href="/log" className="text-[var(--green-dark)] font-semibold hover:underline">{L('السِّجل', 'the Log')}</Link>.
        </div>
      ) : (
        <>
          {/* D1 · the sea state */}
          <div className="bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] rounded-2xl p-6 text-white mb-4">
            <div className="flex items-center gap-5 flex-wrap">
              <div className="text-center shrink-0">
                <div className="font-serif text-5xl font-bold leading-none" dir="ltr">{r.calmScore}</div>
                <div className="text-[9px] text-white/50 mt-1">{L('درجة الهدوء / ١٠٠', 'calm score / 100')}</div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-lg font-bold mb-0.5">{BAND_META[r.band].icon} {ar ? BAND_META[r.band].ar : BAND_META[r.band].en}</div>
                <p className="text-[12px] text-white/75 leading-relaxed">{ar ? BAND_META[r.band].arLine : BAND_META[r.band].enLine}</p>
              </div>
            </div>
            <div className="text-[10px] text-white/55 pt-3 mt-3 border-t border-white/10">
              {L(
                `محسوبة من ${r.months} شهراً مسجّلاً — أعلى مصادر الموج: ${DIM_META[r.noisiest.key].icon} ${DIM_META[r.noisiest.key].ar}.`,
                `Computed from ${r.months} logged months — the biggest wave source: ${DIM_META[r.noisiest.key].icon} ${DIM_META[r.noisiest.key].en}.`
              )}
            </div>
          </div>

          {/* D2 · the seismograph + the five seas */}
          <ToolStage level={2} title={L('رسّام الزلازل المالي', 'The financial seismograph')}>
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
            <div className="text-sm font-medium text-[var(--ink)] mb-1">📈 {L('رسّام الزلازل — ارتجاف فائضك الشهري', 'The seismograph — your monthly surplus, trembling')}</div>
            <p className="text-[10px] text-[var(--muted)] mb-3">
              {L('كل عمود = انحراف فائض ذلك الشهر عن متوسطك، كنسبة من دخلك. الخط المستقيم حياةٌ هادئة.', "Each needle = that month's surplus deviation from your average, as % of income. A flat line is a calm life.")}
            </p>
            <div className="h-44" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={r.seismo} margin={{ top: 4, right: 6, left: 0, bottom: 0 }} barCategoryGap="35%">
                  <CartesianGrid vertical={false} stroke="var(--border-faint)" />
                  <XAxis dataKey="label" tick={axisTick} interval="preserveStartEnd" axisLine={false} tickLine={false} reversed={ar} />
                  <YAxis tick={axisTick} width={40} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} orientation={ar ? 'right' : 'left'} />
                  <Tooltip contentStyle={tipStyle} formatter={(v) => [`${v}%`, L('الانحراف', 'deviation')]} />
                  <ReferenceLine y={0} stroke="var(--border-strong)" />
                  <Bar dataKey="value" isAnimationActive={false} radius={[2, 2, 2, 2]}>
                    {r.seismo.map((p, i) => <Cell key={i} fill={p.value >= 0 ? '#1D9E75' : '#D64545'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
            <div className="text-sm font-medium text-[var(--ink)] mb-3">🧭 {L('خمسة بحار — بحرٌ لكل بُعد', 'Five seas — one per dimension')}</div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {r.dims.map((d) => {
                const b = d.roughness < 0.25 ? 'mirror' : d.roughness < 0.5 ? 'sailing' : d.roughness < 0.75 ? 'choppy' : 'storm';
                return (
                  <div key={d.key} className="bg-[var(--surface-1)] border border-[var(--border-faint)] rounded-xl px-2.5 py-2.5 text-center">
                    <div className="text-[9px] text-[var(--muted)] mb-0.5">{DIM_META[d.key].icon} {ar ? DIM_META[d.key].ar : DIM_META[d.key].en}</div>
                    <div className="text-sm font-bold text-[var(--ink)]" dir="ltr">{d.measured ? pct1(d.vol) : '—'}</div>
                    <div className="h-1 rounded-full bg-[var(--border-faint)] my-1.5 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.round(d.roughness * 100)}%`, background: d.roughness < 0.5 ? 'var(--green)' : d.roughness < 0.75 ? '#E0922A' : '#D64545' }} />
                    </div>
                    <div className="text-[9px] text-[var(--ink-2)]">{BAND_META[b].icon} {ar ? BAND_META[b].ar.replace('بحر ', '') : BAND_META[b].en.replace(' sea', '')}</div>
                  </div>
                );
              })}
            </div>
            <p className="text-[9px] text-[var(--muted)] leading-relaxed mt-2">
              {L('الدخل والمصروف والفائض: تشتت المبالغ الشهرية. الاستثمارات: حركة سنوية معايَرة — وتشمل إيداعاتك، فهي «حركة الخط» لا عائد السوق الصافي.', "Income, spending, surplus: dispersion of the monthly amounts. Investments: annualized movement — it includes your own deposits, so it's the line's motion, not pure market return.")}
            </p>
          </div>
          </ToolStage>

          {/* D3 · is it calming? */}
          <ToolStage level={3} title={L('هل يهدأ بحرك؟', 'Is your sea calming?')}>
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
            <div className="text-sm font-medium text-[var(--ink)] mb-1">
              {r.calming === null ? '〰️' : r.calming ? '🕊' : '🌀'} {L('خط العاصفة المتحرك', 'The rolling storm line')}
              {r.calming !== null && (
                <span className={`ms-2 text-[10px] font-bold ${r.calming ? 'text-[var(--green-dark)]' : 'text-[#D64545]'}`}>
                  {r.calming ? L('بحرك يهدأ ↓', 'your sea is calming ↓') : L('بحرك يشتد ↑', 'your sea is building ↑')}
                </span>
              )}
            </div>
            <p className="text-[10px] text-[var(--muted)] mb-3">{L('تقلّب الفائض محسوباً على نافذة ٣ أشهر منزلقة — اتجاه الخط أهم من مستواه.', 'Surplus volatility on a sliding 3-month window — the line\'s direction matters more than its level.')}</p>
            <div className="h-36" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={r.rolling} margin={{ top: 4, right: 6, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border-faint)" />
                  <XAxis dataKey="label" tick={axisTick} interval="preserveStartEnd" axisLine={false} tickLine={false} reversed={ar} />
                  <YAxis tick={axisTick} width={40} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} orientation={ar ? 'right' : 'left'} />
                  <Tooltip contentStyle={tipStyle} formatter={(v) => [`${v}%`, L('تقلب ٣ أشهر', '3-mo volatility')]} />
                  <Line type="monotone" dataKey="value" stroke="#17B8C9" strokeWidth={2} dot={{ r: 2.5 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {([
                [L('أعمق هبوط لاستثماراتك', 'Deepest investments fall'), r.maxDrawdownInvested],
                [L('أعمق هبوط لصافي ثروتك', 'Deepest net-worth fall'), r.maxDrawdownNetWorth],
              ] as [string, number | null][]).map(([name, v]) => (
                <div key={name} className="bg-[var(--surface-1)] border border-[var(--border-faint)] rounded-xl px-3 py-2.5">
                  <div className="text-[9px] text-[var(--muted)]">{name}</div>
                  <div className="text-sm font-bold" style={{ color: v !== null && v > 0.15 ? '#D64545' : 'var(--ink)' }} dir="ltr">{v === null ? '—' : v === 0 ? '0%' : `−${pct1(v)}`}</div>
                </div>
              ))}
            </div>
            {/* the diagnosis — the noisiest dimension, treated */}
            <div className="mt-3 pt-3 border-t border-[var(--border-faint)] text-xs text-[var(--ink-2)] leading-relaxed">
              <span className="font-semibold text-[var(--ink)]">{L('التشخيص: ', 'The diagnosis: ')}</span>
              {r.noisiest.key === 'spending' || r.noisiest.key === 'surplus' ? (
                <>
                  {L('أكبر موجك يأتي من المصروف — شهور تنفلت وشهور تنضبط. ', 'Your biggest wave comes from spending — some months slip, some hold. ')}
                  <Link href="/budgeting" className="text-[var(--green-dark)] font-semibold hover:underline">{L('سقوف الميزانية', 'Budget caps')}</Link>{' · '}
                  <Link href="/subscriptions" className="text-[var(--green-dark)] font-semibold hover:underline">{L('الاشتراكات', 'Subscriptions')}</Link>
                </>
              ) : r.noisiest.key === 'income' ? (
                <>
                  {L('أكبر موجك يأتي من الدخل نفسه — وهذا يرفع درعك المطلوب. ', 'Your biggest wave comes from income itself — which raises the shield you need. ')}
                  <Link href="/poverty" className="text-[var(--green-dark)] font-semibold hover:underline">{L('خط الفقر', 'The Poverty Line')}</Link>{' · '}
                  <Link href="/insurance" className="text-[var(--green-dark)] font-semibold hover:underline">{L('التأمين', 'Insurance')}</Link>
                </>
              ) : (
                <>
                  {L('أكبر موجك يأتي من المحفظة — تنويعٌ أوسع يمتص الارتجاج. ', 'Your biggest wave comes from the portfolio — broader diversification absorbs the shake. ')}
                  <Link href="/holdings" className="text-[var(--green-dark)] font-semibold hover:underline">{L('ممتلكاتك', 'Holdings')}</Link>{' · '}
                  <Link href="/markets" className="text-[var(--green-dark)] font-semibold hover:underline">{L('الأسواق', 'Markets')}</Link>
                </>
              )}
            </div>
          </div>
          </ToolStage>

          {/* D4 · what the shaking costs */}
          <ToolStage level={4} title={L('ماذا يكلّفك الاهتزاز؟', 'What the shaking costs you')}>
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
            <div className="grid sm:grid-cols-2 gap-2 mb-4">
              <div className="bg-[var(--surface-1)] border border-[var(--border-faint)] rounded-xl px-3 py-3">
                <div className="text-[9px] text-[var(--muted)] mb-0.5">🛟 {L('حاجز العاصفة (شهر سيّئ بمقدار 2σ)', 'The storm buffer (a 2σ bad month)')}</div>
                <div className="text-base font-bold text-[var(--ink)]" dir="ltr">{fmt(r.stormBuffer)}</div>
                <div className="text-[10px] text-[var(--ink-2)] leading-relaxed mt-1">
                  {r.cash >= r.stormBuffer
                    ? L('نقدك يبتلع هذه الموجة ✓ — تقلبك مُؤمَّن ضده.', 'Your cash swallows this wave ✓ — your volatility is insured against.')
                    : L('أكبر من نقدك الحالي — هذا أول رقم يستحق البناء.', 'Larger than your current cash — the first number worth building.')}
                </div>
              </div>
              <div className="bg-[var(--surface-1)] border border-[var(--border-faint)] rounded-xl px-3 py-3">
                <div className="text-[9px] text-[var(--muted)] mb-0.5">🪙 {L('ضريبة التقلّب على النمو المركّب', 'The volatility tax on compounding')}</div>
                <div className="text-base font-bold text-[var(--ink)]" dir="ltr">{r.dragAnnual === null ? '—' : `≈ −${pct1(r.dragAnnual)}/${L('سنة', 'yr')}`}</div>
                <div className="text-[10px] text-[var(--ink-2)] leading-relaxed mt-1">
                  {L('متوسط العوائد لا يساوي نموّك الفعلي: التقلب يقتطع ≈ σ²/2 من المعدل المركّب.', 'Average return isn\'t your real growth: volatility skims ≈ σ²/2 off the compounded rate.')}
                </div>
              </div>
            </div>
            {/* the calming lever */}
            <label className="block mb-2">
              <span className="flex justify-between text-[10px] font-semibold text-[var(--muted)] mb-1">
                <span>{L('لو هدّأت تقلّبك بنسبة', 'If you calmed your volatility by')}</span>
                <span className="text-[var(--ink)]" dir="ltr">{calmBy}%</span>
              </span>
              <input type="range" min={0} max={80} step={5} value={calmBy} onChange={(e) => setCalmBy(Number(e.target.value))} className="w-full accent-[var(--green)]" dir="ltr" />
            </label>
            {(() => {
              const f = 1 - calmBy / 100;
              const newScore = Math.round(100 * (1 - r.dims.reduce((a, d) => a + ({ surplus: 0.3, spending: 0.2, income: 0.2, invested: 0.2, networth: 0.1 } as Record<string, number>)[d.key] * Math.min(1, d.roughness * f), 0)));
              const newBuffer = r.stormBuffer * f;
              const newDrag = r.dragAnnual !== null ? r.dragAnnual * f * f : null;
              return (
                <p className="text-xs text-[var(--ink-2)] leading-relaxed">
                  {L(
                    `درجة هدوئك تصبح ${newScore} (${BAND_META[newScore >= 80 ? 'mirror' : newScore >= 60 ? 'sailing' : newScore >= 40 ? 'choppy' : 'storm'].ar})، وحاجز العاصفة ينكمش إلى ${fmt(newBuffer)}، وضريبة التقلب ${newDrag === null ? '—' : `إلى ≈ −${pct1(newDrag)} سنوياً`}. أدوات التهدئة: حوّل ادخارك إلى أمرٍ ثابت في`,
                    `Your calm score becomes ${newScore} (${BAND_META[newScore >= 80 ? 'mirror' : newScore >= 60 ? 'sailing' : newScore >= 40 ? 'choppy' : 'storm'].en}), the storm buffer shrinks to ${fmt(newBuffer)}, and the volatility tax ${newDrag === null ? '—' : `to ≈ −${pct1(newDrag)}/yr`}. The calming tools: make saving a standing order via`
                  )}{' '}
                  <Link href="/goal-fund" className="text-[var(--green-dark)] font-semibold hover:underline">{L('صندوق هدف', 'a Goal Fund')}</Link>
                  {L('، وثبّت المصروف بسقوف ', ', cap spending with ')}
                  <Link href="/budgeting" className="text-[var(--green-dark)] font-semibold hover:underline">{L('الميزانية', 'Budgeting')}</Link>
                  {L('، ووزّع المحفظة في ', ', and spread the portfolio in ')}
                  <Link href="/holdings" className="text-[var(--green-dark)] font-semibold hover:underline">{L('ممتلكاتك', 'Holdings')}</Link>.
                </p>
              );
            })()}
          </div>
          </ToolStage>

          <Link href="/ratios" className="block w-full text-center text-sm font-semibold bg-[var(--green-dark)] text-white rounded-xl px-4 py-3">
            🩺 {L('اقرأ بقية مؤشراتك الحيوية — النسب ←', 'Read the rest of your vitals — Ratios →')}
          </Link>
        </>
      )}
    </div>
  );
}
