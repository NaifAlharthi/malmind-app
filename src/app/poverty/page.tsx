'use client';

// Poverty — the line nobody wants to look at, looked at straight.
// Not a scare tool: a distance meter. How far YOUR numbers stand from
// financial distress, what could close that distance, and the nets
// that exist in Saudi if the ground ever gives:
//   D1 · your distance from the line, in months
//   D2 · the distress ladder, five bands, your marker
//   D3 · the three pushes — job loss, debt spiral, medical — each
//        with YOUR exposure number
//   D4 · the floor plan — the minimum month, and how long you could
//        hold at floor spending

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import ToolStage from '@/components/shared/ToolStage';
import { POVERTY_LINES, REF_SOURCES } from '@/lib/saudiReference';

interface Snap {
  year: number; month: number;
  cash: number; stocks: number; real_estate: number; equity: number; other_assets: number;
  liabilities: number; income: number; expenses: number;
}
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

const BANDS = [
  { key: 'at', max: 1, icon: '🕯', ar: 'على الخط', en: 'At the line', color: '#D64545' },
  { key: 'fragile', max: 3, icon: '🌫', ar: 'هشّ', en: 'Fragile', color: '#E0922A' },
  { key: 'watchful', max: 6, icon: '⚠️', ar: 'حذِر', en: 'Watchful', color: '#C9A84C' },
  { key: 'steady', max: 12, icon: '🛡', ar: 'ثابت', en: 'Steady', color: '#5DCAA5' },
  { key: 'secure', max: Infinity, icon: '🏰', ar: 'آمن', en: 'Secure', color: '#1D9E75' },
];

export default function PovertyPage() {
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const [snaps, setSnaps] = useState<Snap[] | null>(null);
  const [floorSpend, setFloorSpend] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSnaps([]); return; }
      const { data } = await supabase.from('financial_snapshots')
        .select('year, month, cash, stocks, real_estate, equity, other_assets, liabilities, income, expenses')
        .eq('user_id', user.id).order('year', { ascending: true }).order('month', { ascending: true });
      const arr = (data as Snap[]) ?? [];
      setSnaps(arr);
      if (arr.length) {
        const recent = arr.slice(-6);
        const avgExp = recent.reduce((a, s) => a + Number(s.expenses), 0) / recent.length;
        setFloorSpend(Math.round(avgExp * 0.55)); // essentials ≈ 55% of a normal month
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const d = useMemo(() => {
    if (!snaps || snaps.length === 0) return null;
    const latest = snaps[snaps.length - 1];
    const recent = snaps.slice(-6);
    const avgIncome = recent.reduce((a, s) => a + Number(s.income), 0) / recent.length;
    const avgExpenses = recent.reduce((a, s) => a + Number(s.expenses), 0) / recent.length;
    const cash = Number(latest.cash);
    const invested = Number(latest.stocks) + Number(latest.equity);
    const liab = Number(latest.liabilities);
    const runway = avgExpenses > 0 ? cash / avgExpenses : 0;
    const band = BANDS.find((b) => runway < b.max) ?? BANDS[BANDS.length - 1];
    const debtLoad = avgIncome > 0 ? liab / (avgIncome * 12) : 0;
    return { avgIncome, avgExpenses, cash, invested, liab, runway, band, debtLoad, saved: avgIncome - avgExpenses };
  }, [snaps]);

  if (snaps === null) return <div className="text-sm text-[var(--muted)]">…</div>;

  return (
    <div className="max-w-3xl">
      <div className="text-[10px] tracking-[0.12em] uppercase text-[var(--gold)] mb-1">☀ {L('اليوم', 'Today')}</div>
      <h1 className="font-serif text-3xl font-semibold text-[var(--ink)] mb-1">🛟 {L('خط الفقر', 'The poverty line')}</h1>
      <p className="text-sm text-[var(--ink-2)] mb-6 max-w-2xl">
        {L('الخط الذي لا يحب أحد النظر إليه — منظوراً إليه مباشرة: كم تبعد عنه، وما الذي يقرّبك، وما الشبكات تحتك.', "The line nobody wants to look at — looked at straight: how far you stand, what pulls you closer, and the nets beneath you.")}
      </p>

      {!d ? (
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 text-[12px] text-[var(--muted)] leading-relaxed">
          {L('سجّل شهراً في ', 'Log a month in ')}<Link href="/log" className="text-[var(--green-dark)] font-semibold hover:underline">{L('السِّجل', 'the Log')}</Link>{L(' لتُقاس المسافة.', ' and the distance gets measured.')}
        </div>
      ) : (
        <>
          {/* D1 · the distance */}
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4 text-center">
            <div className="text-3xl mb-1" aria-hidden>{d.band.icon}</div>
            <div className="font-serif text-3xl font-bold" style={{ color: d.band.color }}>{ar ? d.band.ar : d.band.en}</div>
            <div className="text-[11px] text-[var(--muted)] mt-1.5">
              {L(
                `لو توقف الدخل اليوم، يصمد نمط حياتك ${d.runway.toFixed(1)} شهراً على نقدك — هذه مسافتك عن الخط.`,
                `If income stopped today, your life holds ${d.runway.toFixed(1)} months on cash — that is your distance from the line.`
              )}
            </div>
            {/* the national lines themselves, from the study */}
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3 pt-3 border-t border-[var(--border-faint)] text-[10px] text-[var(--ink-2)]">
              <span>🕯 {L(`خط العوز الوطني: ${fmt(POVERTY_LINES.destitution)}/شهرياً للأسرة`, `National destitution line: ${fmt(POVERTY_LINES.destitution)}/mo per family`)}</span>
              <span>📉 {L(`خط الفقر المطلق: ${fmt(POVERTY_LINES.absolute)}/شهرياً`, `Absolute poverty line: ${fmt(POVERTY_LINES.absolute)}/mo`)}</span>
              <span className="font-semibold" style={{ color: d.avgExpenses > POVERTY_LINES.absolute * 2 ? 'var(--green-dark)' : '#E0922A' }} dir="ltr">
                {L(`إنفاقك = ×${(d.avgExpenses / POVERTY_LINES.absolute).toFixed(1)} من خط الفقر`, `your spending = ×${(d.avgExpenses / POVERTY_LINES.absolute).toFixed(1)} the poverty line`)}
              </span>
            </div>
            <div className="text-[8px] text-[var(--muted)] mt-1.5">{L(`الخطوط من: ${REF_SOURCES.grc.ar}.`, `Lines from: ${REF_SOURCES.grc.en}.`)}</div>
          </div>

          {/* D2 · the ladder */}
          <ToolStage level={2} title={L('سلّم المسافة', 'The distance ladder')}>
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
            <div className="flex flex-col-reverse gap-1.5">
              {BANDS.map((b) => (
                <div key={b.key} className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 ${b.key === d.band.key ? 'bg-[var(--surface-1)]' : 'border-[var(--border-faint)] bg-[var(--surface-1)]/40'}`}
                  style={b.key === d.band.key ? { borderColor: b.color } : undefined}>
                  <span aria-hidden>{b.icon}</span>
                  <span className={`text-[12px] ${b.key === d.band.key ? 'font-bold text-[var(--ink)]' : 'text-[var(--ink-2)]'}`}>{ar ? b.ar : b.en}</span>
                  <span className="ms-auto text-[9px] text-[var(--muted)]" dir="ltr">{b.max === Infinity ? '12+ mo' : `< ${b.max} mo`}</span>
                  {b.key === d.band.key && <span className="text-[10px] font-bold" style={{ color: b.color }}>📍 {L('أنت هنا', 'You are here')}</span>}
                </div>
              ))}
            </div>
          </div>
          </ToolStage>

          {/* D3 · the three pushes */}
          <ToolStage level={3} title={L('الدفعات الثلاث نحو الخط', 'The three pushes toward the line')}>
          <div className="grid sm:grid-cols-3 gap-3 mb-4">
            {([
              ['💼', L('فقدان الدخل', 'Job loss'), L(`صمودك ${d.runway.toFixed(1)} شهراً — والوظيفة الجديدة تأخذ عادة ٣–٦ أشهر.`, `You hold ${d.runway.toFixed(1)} months — a new job typically takes 3–6.`)],
              ['🌀', L('دوّامة الدين', 'The debt spiral'), L(`ديونك ${fmt(d.liab)} = ${(d.debtLoad).toFixed(1)} سنة دخل — فوق سنة واحدة تبدأ الجاذبية.`, `Your debts (${fmt(d.liab)}) = ${d.debtLoad.toFixed(1)} years of income — past one year, gravity begins.`)],
              ['🏥', L('حدث صحي', 'A medical event'), L('غطاء صحي فعّال هو الفرق بين حدثٍ سيّئ وكارثة — راجع «التأمين».', 'Working health cover is the difference between a bad event and a catastrophe — see Insurance.')],
            ] as [string, string, string][]).map(([icon, name, line]) => (
              <div key={name} className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-4">
                <div className="text-sm font-semibold text-[var(--ink)] mb-1">{icon} {name}</div>
                <p className="text-[11px] text-[var(--ink-2)] leading-relaxed">{line}</p>
              </div>
            ))}
          </div>
          </ToolStage>

          {/* D4 · the floor plan */}
          <ToolStage level={4} title={L('خطة الأرضية', 'The floor plan')}>
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
            <label className="block mb-3">
              <span className="flex justify-between text-[10px] font-semibold text-[var(--muted)] mb-1">
                <span>{L('شهر الضرورات فقط (سكن، أكل، فواتير)', 'The essentials-only month (housing, food, bills)')}</span>
                <span className="text-[var(--ink)]" dir="ltr">{fmt(floorSpend)}</span>
              </span>
              <input type="range" min={1000} max={Math.max(5000, Math.round(d.avgExpenses))} step={250} value={floorSpend} onChange={(e) => setFloorSpend(Number(e.target.value))} className="w-full accent-[var(--green)]" dir="ltr" />
            </label>
            <p className="text-xs text-[var(--ink-2)] leading-relaxed mb-3">
              {L(
                `على إنفاق الأرضية يصمد نقدك ${(floorSpend > 0 ? d.cash / floorSpend : 0).toFixed(1)} شهراً بدل ${d.runway.toFixed(1)} — ومع تسييل الاستثمارات ${(floorSpend > 0 ? (d.cash + d.invested) / floorSpend : 0).toFixed(1)} شهراً. معرفة أرضيتك مسبقاً نصف الطمأنينة.`,
                `At floor spending your cash holds ${(floorSpend > 0 ? d.cash / floorSpend : 0).toFixed(1)} months instead of ${d.runway.toFixed(1)} — and with investments liquidated, ${(floorSpend > 0 ? (d.cash + d.invested) / floorSpend : 0).toFixed(1)}. Knowing your floor in advance is half the calm.`
              )}
            </p>
            <p className="text-[10px] text-[var(--muted)] leading-relaxed">
              🇸🇦 {L(
                'والشبكات قائمة: الضمان الاجتماعي المطوّر وحساب المواطن وبرامج هدف للتوظيف — صُمّمت لهذه اللحظات تحديداً.',
                'And the nets exist: the enhanced Social Security program, Citizen Account, and HRDF employment support — built exactly for these moments.'
              )}
            </p>
          </div>
          </ToolStage>

          <Link href="/risks" className="block w-full text-center text-sm font-semibold bg-[var(--green-dark)] text-white rounded-xl px-4 py-3">
            🛡 {L('حصّن المسافة — خريطة مخاطرك ←', 'Fortify the distance — your risk map →')}
          </Link>
        </>
      )}
    </div>
  );
}
