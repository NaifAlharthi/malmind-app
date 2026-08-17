'use client';

// The other-assets tile on the Log page — the wealth no bank app sees.
// Land, camels, gold, luxury pieces, business stakes: every named asset
// that is neither cash nor a ticker holding, listed at its value,
// totaled, and compared against the property & other lines the Log
// carries. Managing the inventory stays in Holdings; reading is here.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';

interface OtherAsset { id: string; name: string; type: string; value: number }

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

// how each kind of unusual wealth shows its face
const TYPE_META: Record<string, { icon: string; ar: string; en: string }> = {
  real_estate: { icon: '🏠', ar: 'عقار', en: 'Real estate' },
  land: { icon: '🗺', ar: 'أرض', en: 'Land' },
  gold: { icon: '🪙', ar: 'ذهب', en: 'Gold' },
  livestock: { icon: '🐫', ar: 'مواشٍ وإبل', en: 'Livestock' },
  luxury: { icon: '⌚', ar: 'مقتنيات فاخرة', en: 'Luxury' },
  business: { icon: '🏢', ar: 'حصة مشروع', en: 'Business stake' },
  vehicle: { icon: '🚗', ar: 'مركبة', en: 'Vehicle' },
  other: { icon: '📦', ar: 'أخرى', en: 'Other' },
};

export default function OtherAssetsTile() {
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const [rows, setRows] = useState<OtherAsset[] | null>(null);
  const [loggedPropOther, setLoggedPropOther] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setRows([]); return; }
      const [{ data: assets }, { data: snaps }] = await Promise.all([
        supabase.from('assets').select('id, name, asset_type, value, ticker, quantity').eq('user_id', user.id),
        supabase.from('financial_snapshots').select('year, month, real_estate, other_assets').eq('user_id', user.id)
          .order('year', { ascending: true }).order('month', { ascending: true }),
      ]);
      const snapArr = (snaps ?? []) as { real_estate: number; other_assets: number }[];
      const latest = snapArr[snapArr.length - 1];
      setLoggedPropOther(latest ? Number(latest.real_estate) + Number(latest.other_assets) : null);
      setRows(
        ((assets ?? []) as Record<string, unknown>[])
          // ticker holdings live in the portfolio tile, private stakes in
          // the ownership tile, cash and stocks have their own Log lines —
          // this tile holds the rest of the real world
          .filter((r) => !(r.ticker && Number(r.quantity) > 0))
          .filter((r) => !['cash', 'stocks', 'business', 'equity'].includes(String(r.asset_type)))
          .map((r) => ({ id: String(r.id), name: String(r.name), type: String(r.asset_type ?? 'other'), value: Number(r.value) || 0 }))
          .sort((a, b) => b.value - a.value),
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (rows === null) {
    return (
      <div className="drv-num bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 mb-8 text-sm text-[var(--muted)]">
        {L('تُجرَد الأصول…', 'Taking inventory…')}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="drv-num bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 sm:p-6 mb-8">
        <div className="font-serif text-lg font-semibold text-[var(--ink)] mb-1">🐫 {L('الأصول الأخرى', 'Other assets')}</div>
        <p className="text-[11px] text-[var(--muted)] leading-relaxed mb-3">
          {L(
            'الأرض، الإبل، الذهب، الساعة، حصة المشروع — قيمة حقيقية لا يلتقطها أي تطبيق بنكي. سجّلها هنا باسمها وقيمتها، لتكتمل ثروتك الحقيقية.',
            'Land, camels, gold, the watch, a stake in a venture — real value no bank app captures. Log each by name and value, and your true wealth completes.'
          )}
        </p>
        <Link href="/holdings" className="text-xs font-semibold text-white bg-[var(--green-dark)] rounded-lg px-4 py-2 inline-block">
          {L('سجّل أول أصل ←', 'Log your first asset →')}
        </Link>
      </div>
    );
  }

  const total = rows.reduce((s, r) => s + r.value, 0);
  const drift = loggedPropOther !== null && loggedPropOther > 0 ? total - loggedPropOther : null;
  const meta = (t: string) => TYPE_META[t] ?? TYPE_META.other;

  return (
    <div className="drv-num bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 sm:p-6 mb-8">
      <div className="flex items-baseline justify-between gap-2 flex-wrap mb-1">
        <div className="font-serif text-lg font-semibold text-[var(--ink)]">🐫 {L('الأصول الأخرى', 'Other assets')}</div>
        <Link href="/holdings" className="text-[11px] font-semibold text-[var(--green-dark)] hover:underline">
          {L('أدرها في الأصول ←', 'Manage in Holdings →')}
        </Link>
      </div>
      <p className="text-[11px] text-[var(--muted)] leading-relaxed mb-4">
        {L(
          'ثروتك خارج السوق — ما تملكه فعلاً من أرضٍ وذهبٍ ومقتنيات، مجروداً بقيمته.',
          'Your wealth beyond the market — what you truly own in land, gold and possessions, inventoried at value.'
        )}
      </p>

      {/* the inventory, largest first, with its share of the whole */}
      <div className="flex flex-col gap-2 mb-3">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-3">
            <span className="text-base leading-none shrink-0" aria-hidden>{meta(r.type).icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold text-[var(--ink)] truncate">
                {r.name}
                <span className="ms-2 text-[9px] font-medium text-[var(--muted)] border border-[var(--border-faint)] rounded-full px-1.5 py-0.5">{ar ? meta(r.type).ar : meta(r.type).en}</span>
              </span>
              <span className="block h-1.5 rounded-full bg-[var(--border-faint)] overflow-hidden mt-1" dir="ltr">
                <span className="block h-full rounded-full bg-[#E0559E]" style={{ width: `${total > 0 ? Math.max(2, (r.value / total) * 100) : 0}%` }} />
              </span>
            </span>
            <span className="text-[11px] font-bold text-[var(--ink)] whitespace-nowrap" dir="ltr">{fmt(r.value)}</span>
          </div>
        ))}
      </div>

      {/* total + the drift against the Log's property & other lines */}
      <div className="flex items-center justify-between gap-3 flex-wrap rounded-xl border border-[var(--border-faint)] bg-[var(--surface-1)] px-3.5 py-2.5">
        <div className="text-[11px] text-[var(--ink-2)]">
          <span className="font-semibold" dir="ltr">{fmt(total)}</span> {L('إجمالي الجرد', 'inventory total')}
          {drift !== null && Math.abs(drift) >= 1 && (
            <span className="text-[var(--muted)]"> · {L(
              `سطرا «العقار والأصول الأخرى» في السِّجل يقولان ${fmt(loggedPropOther!)} (${drift >= 0 ? '+' : '−'}${fmt(Math.abs(drift))} فرقاً)`,
              `the Log's property & other lines say ${fmt(loggedPropOther!)} (${drift >= 0 ? '+' : '−'}${fmt(Math.abs(drift))} apart)`
            )}</span>
          )}
          {drift !== null && Math.abs(drift) < 1 && (
            <span className="text-[var(--muted)]"> · {L('مطابقة لسطور السِّجل — لا انحراف.', "matches the Log's lines — no drift.")}</span>
          )}
        </div>
        <Link href="/financial-numbers" className="text-[10px] font-semibold text-[var(--green-dark)] border border-[var(--green-border)] rounded-lg px-3 py-1.5 hover:bg-[var(--green-bg)] transition-colors whitespace-nowrap">
          {L('حدّث سطور السِّجل ←', "Update the Log's lines →")}
        </Link>
      </div>
    </div>
  );
}
