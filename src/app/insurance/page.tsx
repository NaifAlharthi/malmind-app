'use client';

// Insurance — the shield inventory. What covers you, what doesn't,
// and what one bad day costs against YOUR cash:
//   D1 · the coverage score — four covers, have or not
//   D2 · each cover with its Saudi door explained
//   D3 · the exposure calculator — a bad event vs your runway
//   D4 · the self-insure logic — when a buffer beats a premium
// Coverage flags persist locally (mm-insurance).

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import ToolStage from '@/components/shared/ToolStage';

interface Snap { year: number; month: number; cash: number; expenses: number }
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
const KEY = 'mm-insurance';

const COVERS: { k: string; icon: string; ar: string; en: string; noteAr: string; noteEn: string }[] = [
  { k: 'health', icon: '🏥', ar: 'صحي', en: 'Health', noteAr: 'إلزامي عبر جهة العمل لموظفي القطاع الخاص (مجلس الضمان الصحي) — تحقق من شمول العائلة.', noteEn: 'Employer-mandated for private-sector employees (CCHI) — check the family is covered.' },
  { k: 'motor', icon: '🚗', ar: 'مركبات', en: 'Motor', noteAr: 'التأمين ضد الغير إلزامي نظاماً — والشامل قرارك بحسب قيمة السيارة.', noteEn: 'Third-party is legally mandatory — comprehensive is your call by car value.' },
  { k: 'home', icon: '🏠', ar: 'مسكن', en: 'Home', noteAr: 'ضد الحريق والسرقة والأضرار — قليل الكلفة كبير الأثر، وكثيرون بلا أي غطاء.', noteEn: 'Fire, theft and damage — cheap cover, big effect, and most homes carry none.' },
  { k: 'life', icon: '🕊', ar: 'حياة/تكافل', en: 'Life / Takaful', noteAr: 'يعني شيئاً واحداً: مَن يعتمدون على دخلك محميّون إن غبت.', noteEn: 'It means one thing: those who depend on your income stay protected if you are gone.' },
];

export default function InsurancePage() {
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const [snaps, setSnaps] = useState<Snap[] | null>(null);
  const [have, setHave] = useState<Record<string, boolean>>({});
  const [eventCost, setEventCost] = useState(30000);

  useEffect(() => {
    try { const raw = window.localStorage.getItem(KEY); if (raw) setHave(JSON.parse(raw)); } catch { /* ignore */ }
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSnaps([]); return; }
      const { data } = await supabase.from('financial_snapshots').select('year, month, cash, expenses').eq('user_id', user.id)
        .order('year', { ascending: true }).order('month', { ascending: true });
      setSnaps((data as Snap[]) ?? []);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (k: string) => {
    setHave((p) => {
      const next = { ...p, [k]: !p[k] };
      try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const me = useMemo(() => {
    if (!snaps || snaps.length === 0) return null;
    const recent = snaps.slice(-6);
    const avgExpenses = recent.reduce((a, s) => a + Number(s.expenses), 0) / recent.length;
    const cash = Number(snaps[snaps.length - 1].cash);
    return { cash, avgExpenses, runway: avgExpenses > 0 ? cash / avgExpenses : 0 };
  }, [snaps]);

  if (snaps === null) return <div className="text-sm text-[var(--muted)]">…</div>;
  const count = COVERS.filter((c) => have[c.k]).length;

  return (
    <div className="max-w-3xl">
      <div className="text-[10px] tracking-[0.12em] uppercase text-[var(--gold)] mb-1">☀ {L('اليوم', 'Today')}</div>
      <h1 className="font-serif text-3xl font-semibold text-[var(--ink)] mb-1">☂️ {L('التأمين', 'Insurance')}</h1>
      <p className="text-sm text-[var(--ink-2)] mb-6 max-w-2xl">{L('جرد الدروع: ما يغطيك، وما لا يغطيك، وكم يكلّف يومٌ سيّئ من نقدك أنت.', "The shield inventory: what covers you, what doesn't, and what one bad day costs from YOUR cash.")}</p>

      {/* D1 · the coverage score */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
        <div className="flex items-baseline justify-between mb-3">
          <div className="text-sm font-medium text-[var(--ink)]">{L('دروعك الأربعة', 'Your four shields')}</div>
          <div className="text-[11px] font-bold text-[var(--green-dark)]" dir="ltr">{count} / {COVERS.length}</div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {COVERS.map((c) => (
            <button key={c.k} onClick={() => toggle(c.k)} aria-pressed={!!have[c.k]}
              className={`rounded-xl border px-3 py-3 text-center transition-colors cursor-pointer ${have[c.k] ? 'border-[var(--green)] bg-[var(--green-bg)]/50' : 'border-dashed border-[var(--border-strong)] bg-[var(--surface-1)]'}`}>
              <div className="text-xl mb-1" aria-hidden>{c.icon}</div>
              <div className="text-[11px] font-semibold text-[var(--ink)]">{ar ? c.ar : c.en}</div>
              <div className={`text-[9px] font-semibold mt-0.5 ${have[c.k] ? 'text-[var(--green-dark)]' : 'text-[var(--muted)]'}`}>{have[c.k] ? L('مُغطّى ✓', 'Covered ✓') : L('بلا غطاء', 'Uncovered')}</div>
            </button>
          ))}
        </div>
      </div>

      {/* D2 · each cover */}
      <ToolStage level={2} title={L('الدروع مشروحة', 'The shields, explained')}>
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
        <div className="flex flex-col gap-2.5">
          {COVERS.map((c) => (
            <div key={c.k} className="flex items-start gap-2.5 text-[11px] text-[var(--ink-2)] leading-relaxed">
              <span aria-hidden>{c.icon}</span>
              <span><span className="font-semibold text-[var(--ink)]">{ar ? c.ar : c.en}: </span>{ar ? c.noteAr : c.noteEn}</span>
            </div>
          ))}
        </div>
      </div>
      </ToolStage>

      {/* D3 · the exposure calculator */}
      <ToolStage level={3} title={L('حاسبة الانكشاف', 'The exposure calculator')}>
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
        <label className="block mb-3">
          <span className="flex justify-between text-[10px] font-semibold text-[var(--muted)] mb-1">
            <span>{L('كلفة حدث سيّئ غير مُغطّى', 'An uncovered bad event costs')}</span>
            <span className="text-[var(--ink)]" dir="ltr">{fmt(eventCost)}</span>
          </span>
          <input type="range" min={5000} max={300000} step={5000} value={eventCost} onChange={(e) => setEventCost(Number(e.target.value))} className="w-full accent-[var(--green)]" dir="ltr" />
        </label>
        {me ? (
          <p className="text-xs text-[var(--ink-2)] leading-relaxed">
            {eventCost <= me.cash
              ? L(
                  `نقدك (${fmt(me.cash)}) يبتلعه — لكنه يقصّ درعك من ${me.runway.toFixed(1)} إلى ${((me.cash - eventCost) / (me.avgExpenses || 1)).toFixed(1)} شهر أمان.`,
                  `Your cash (${fmt(me.cash)}) absorbs it — but it cuts your shield from ${me.runway.toFixed(1)} to ${((me.cash - eventCost) / (me.avgExpenses || 1)).toFixed(1)} safe months.`
                )
              : L(
                  `أكبر من نقدك كله (${fmt(me.cash)}) — حدث واحد بلا غطاء يعني ديناً فورياً. هذا تحديداً ما يُشترى التأمين لأجله.`,
                  `Bigger than ALL your cash (${fmt(me.cash)}) — one uncovered event means instant debt. This is exactly what insurance is bought for.`
                )}
          </p>
        ) : (
          <p className="text-[11px] text-[var(--muted)]">{L('سجّل شهراً في السِّجل ليُقاس الانكشاف بنقدك.', 'Log a month and the exposure gets measured against your cash.')}</p>
        )}
      </div>
      </ToolStage>

      {/* D4 · the self-insure logic */}
      <ToolStage level={4} title={L('منطق التأمين الذاتي', 'The self-insure logic')}>
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
        <p className="text-xs text-[var(--ink-2)] leading-relaxed">
          {L(
            'القاعدة: أمّن ضد ما لا تستطيع دفعه، وتحمّل ذاتياً ما تستطيع. صندوق طوارئ سمين يسمح برفع التحمّلات (فتنخفض الأقساط) — لكنه لا يغني أبداً عن غطاء الأحداث الكارثية: الصحة الكبرى، والمسؤولية تجاه الغير، ودخل من يعولهم غيابُك.',
            "The rule: insure what you cannot pay for, self-carry what you can. A fat emergency fund lets you raise deductibles (premiums fall) — but it never replaces catastrophic cover: major health, liability to others, and the income of those your absence would leave behind."
          )}
        </p>
      </div>
      </ToolStage>

      <Link href="/risks" className="block w-full text-center text-sm font-semibold bg-[var(--green-dark)] text-white rounded-xl px-4 py-3">
        🛡 {L('اربطها بخريطة مخاطرك ←', 'Tie it to your risk map →')}
      </Link>
    </div>
  );
}
