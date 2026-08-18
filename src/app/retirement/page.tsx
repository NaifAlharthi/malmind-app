'use client';

// Retirement — the far shore, measured from where you stand. Your age,
// your invested money and your saving pace from the Log, GOSI's shape
// alongside, staged:
//   D1 · years left, the projected pot, the income it buys
//   D2 · the pot's growth curve to retirement
//   D3 · the GOSI layer + the gap to the life you want
//   D4 · the levers — retire age, return, target income

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import ToolStage from '@/components/shared/ToolStage';

interface Snap {
  year: number; month: number;
  cash: number; stocks: number; real_estate: number; equity: number; other_assets: number;
  liabilities: number; income: number; expenses: number;
}
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
const fmtCompact = (n: number) => (Math.abs(n) >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : Math.abs(n) >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n)));

export default function RetirementPage() {
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const [snaps, setSnaps] = useState<Snap[] | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [retireAge, setRetireAge] = useState(60);
  const [roiPct, setRoiPct] = useState(7);
  const [targetIncome, setTargetIncome] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSnaps([]); return; }
      const [{ data }, { data: prof }] = await Promise.all([
        supabase.from('financial_snapshots')
          .select('year, month, cash, stocks, real_estate, equity, other_assets, liabilities, income, expenses')
          .eq('user_id', user.id).order('year', { ascending: true }).order('month', { ascending: true }),
        supabase.from('profiles').select('age').eq('id', user.id).single(),
      ]);
      const arr = (data as Snap[]) ?? [];
      setSnaps(arr);
      setAge((prof as { age: number | null } | null)?.age ?? null);
      if (arr.length) {
        const recent = arr.slice(-6);
        const avgExp = recent.reduce((a, s) => a + Number(s.expenses), 0) / recent.length;
        setTargetIncome(Math.round(avgExp * 0.8)); // the classic 80% of today's life
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const d = useMemo(() => {
    if (!snaps || snaps.length === 0 || !age) return null;
    const latest = snaps[snaps.length - 1];
    const recent = snaps.slice(-6);
    const avgIncome = recent.reduce((a, s) => a + Number(s.income), 0) / recent.length;
    const avgExpenses = recent.reduce((a, s) => a + Number(s.expenses), 0) / recent.length;
    const saved = Math.max(0, avgIncome - avgExpenses);
    const invested = Number(latest.stocks) + Number(latest.equity);
    const yearsLeft = Math.max(0, retireAge - age);
    // the pot: today's invested compounding + monthly saving joining it
    const r = roiPct / 100 / 12;
    const n = yearsLeft * 12;
    const pot = invested * Math.pow(1 + r, n) + (r > 0 ? saved * ((Math.pow(1 + r, n) - 1) / r) : saved * n);
    const potIncome = (pot * 0.04) / 12; // the 4% rule, monthly
    // GOSI approximation: 2.5% of average wage per contribution year, capped
    const gosiYears = Math.min(40, Math.max(0, retireAge - 22));
    const gosiPension = Math.min(1, gosiYears * 0.025) * avgIncome;
    const curve: { age: number; pot: number }[] = [];
    for (let y = 0; y <= yearsLeft; y++) {
      const m = y * 12;
      curve.push({ age: age + y, pot: Math.round(invested * Math.pow(1 + r, m) + (r > 0 ? saved * ((Math.pow(1 + r, m) - 1) / r) : saved * m)) });
    }
    const totalRetIncome = potIncome + gosiPension;
    return { avgIncome, avgExpenses, saved, invested, yearsLeft, pot, potIncome, gosiPension, gosiYears, curve, totalRetIncome };
  }, [snaps, age, retireAge, roiPct]);

  if (snaps === null) return <div className="text-sm text-[var(--muted)]">…</div>;

  const lever = (label: string, val: number, min: number, max: number, step: number, set: (n: number) => void, show: string) => (
    <label className="block">
      <span className="flex justify-between text-[10px] font-semibold text-[var(--muted)] mb-1"><span>{label}</span><span className="text-[var(--ink)]" dir="ltr">{show}</span></span>
      <input type="range" min={min} max={max} step={step} value={val} onChange={(e) => set(Number(e.target.value))} className="w-full accent-[var(--green)]" dir="ltr" />
    </label>
  );

  return (
    <div className="max-w-3xl">
      <div className="text-[10px] tracking-[0.12em] uppercase text-[var(--gold)] mb-1">🔭 {L('المستقبل', 'The Future')}</div>
      <h1 className="font-serif text-3xl font-semibold text-[var(--ink)] mb-1">🌅 {L('التقاعد', 'Retirement')}</h1>
      <p className="text-sm text-[var(--ink-2)] mb-6 max-w-2xl">{L('الضفة البعيدة — مقاسةً من حيث تقف اليوم، بأرقامك أنت.', 'The far shore — measured from where you stand today, in your numbers.')}</p>

      {!d ? (
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 text-[12px] text-[var(--muted)] leading-relaxed">
          {L('نحتاج شهراً في ', 'We need a month in ')}<Link href="/log" className="text-[var(--green-dark)] font-semibold hover:underline">{L('السِّجل', 'the Log')}</Link>{L(' وعمرك في الملف.', ' and your age in the profile.')}
        </div>
      ) : (
        <>
          {/* D1 */}
          <div className="bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] rounded-2xl p-6 text-white mb-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              {([
                [L('سنوات متبقية', 'Years to go'), String(d.yearsLeft)],
                [L(`محفظتك عند ${retireAge}`, `Your pot at ${retireAge}`), fmtCompact(d.pot)],
                [L('دخلها الشهري (٤٪)', 'Its monthly income (4%)'), fmt(d.potIncome)],
              ] as [string, string][]).map(([name, val]) => (
                <div key={name}>
                  <div className="text-[10px] text-white/50 mb-0.5">{name}</div>
                  <div className="font-serif text-2xl font-bold" dir="ltr">{val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* D2 · the curve */}
          <ToolStage level={2} title={L('منحنى المحفظة', "The pot's curve")}>
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
            <div className="h-44" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={d.curve} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border-faint)" />
                  <XAxis dataKey="age" tick={{ fontSize: 9, fill: 'var(--muted)' }} interval="preserveStartEnd" reversed={ar} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: 'var(--muted)' }} tickFormatter={fmtCompact} width={50} orientation={ar ? 'right' : 'left'} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 11 }} formatter={(v) => fmt(Number(v))} labelFormatter={(a) => L(`العمر ${a}`, `Age ${a}`)} />
                  <Line type="monotone" dataKey="pot" name={L('المحفظة', 'The pot')} stroke="#1D9E75" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-[var(--muted)] mt-2">{L(`استثمارك اليوم (${fmt(d.invested)}) + ادخارك (${fmt(d.saved)}/شهرياً) بعائد ${roiPct}٪.`, `Today's invested (${fmt(d.invested)}) + your saving (${fmt(d.saved)}/mo) at ${roiPct}%.`)}</p>
          </div>
          </ToolStage>

          {/* D3 · GOSI + the gap */}
          <ToolStage level={3} title={L('طبقة التأمينات والفجوة', 'The GOSI layer & the gap')}>
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
            <div className="grid grid-cols-3 gap-2 mb-3">
              {([
                [L('معاش تقريبي من التأمينات', 'Approx. GOSI pension'), fmt(d.gosiPension), 'var(--ink)'],
                [L('+ دخل المحفظة', '+ pot income'), fmt(d.potIncome), 'var(--ink)'],
                [L('دخل تقاعدك الكلي ≈', 'Total retirement income ≈'), fmt(d.totalRetIncome), d.totalRetIncome >= targetIncome ? 'var(--green-dark)' : '#E0922A'],
              ] as [string, string, string][]).map(([name, val, color]) => (
                <div key={name} className="bg-[var(--surface-1)] border border-[var(--border-faint)] rounded-xl px-3 py-2.5">
                  <div className="text-[9px] text-[var(--muted)]">{name}</div>
                  <div className="text-sm font-bold" style={{ color }} dir="ltr">{val}</div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[var(--ink-2)] leading-relaxed">
              {d.totalRetIncome >= targetIncome
                ? L(`يغطي حياة بـ${fmt(targetIncome)}/شهرياً (٨٠٪ من مصروفك اليوم) ✓`, `Covers a ${fmt(targetIncome)}/mo life (80% of today's spending) ✓`)
                : L(`تنقصك ${fmt(targetIncome - d.totalRetIncome)}/شهرياً عن حياة بـ${fmt(targetIncome)} — الفجوة تُسدّ بادخار أعلى أو تقاعد أبعد.`, `You're ${fmt(targetIncome - d.totalRetIncome)}/mo short of a ${fmt(targetIncome)} life — closed by saving more or retiring later.`)}
            </p>
            <p className="text-[9px] text-[var(--muted)] mt-2">{L(`تقدير التأمينات تقريبي (~٢٫٥٪ عن كل سنة اشتراك × ${d.gosiYears} سنة) — الرقم الرسمي من حسابك في التأمينات الاجتماعية.`, `The GOSI estimate is approximate (~2.5% per contribution year × ${d.gosiYears} years) — the official number lives in your GOSI account.`)}</p>
          </div>
          </ToolStage>

          {/* D4 · the levers */}
          <ToolStage level={4} title={L('عتلات الضفة البعيدة', "The far shore's levers")}>
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
            <div className="grid sm:grid-cols-3 gap-x-6 gap-y-4">
              {lever(L('سن التقاعد', 'Retire at'), retireAge, Math.max((age ?? 25) + 1, 45), 70, 1, setRetireAge, String(retireAge))}
              {lever(L('العائد ٪', 'Return %'), roiPct, 2, 12, 0.5, setRoiPct, `${roiPct}%`)}
              {lever(L('دخل التقاعد المستهدف', 'Target income'), targetIncome, 2000, 60000, 1000, setTargetIncome, fmt(targetIncome))}
            </div>
          </div>
          </ToolStage>

          <Link href="/freedom" className="block w-full text-center text-sm font-semibold bg-[var(--green-dark)] text-white rounded-xl px-4 py-3">
            🕊 {L('والضفة الأقرب؟ حريتك المالية ←', 'And the nearer shore? Your financial freedom →')}
          </Link>
        </>
      )}
    </div>
  );
}
