'use client';

// The ownership tile on the Log page — for the advanced side of the
// balance sheet: private stakes that never touch a public exchange.
// A share in a company, a VC fund position, a PE commitment, a stake
// in a friend's venture — each named at its current mark, totaled,
// and compared against the equity line the Log carries.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';

interface Stake { id: string; name: string; value: number }

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

// asset_type values that mean "private ownership"
export const OWNERSHIP_TYPES = ['business', 'equity'];

export default function OwnershipTile() {
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const [stakes, setStakes] = useState<Stake[] | null>(null);
  const [loggedEquity, setLoggedEquity] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStakes([]); return; }
      const [{ data: assets }, { data: snaps }] = await Promise.all([
        supabase.from('assets').select('id, name, asset_type, value, ticker, quantity').eq('user_id', user.id),
        supabase.from('financial_snapshots').select('year, month, equity').eq('user_id', user.id)
          .order('year', { ascending: true }).order('month', { ascending: true }),
      ]);
      const arr = (snaps ?? []) as { equity: number }[];
      setLoggedEquity(arr.length ? Number(arr[arr.length - 1].equity) : null);
      setStakes(
        ((assets ?? []) as Record<string, unknown>[])
          .filter((r) => !(r.ticker && Number(r.quantity) > 0))
          .filter((r) => OWNERSHIP_TYPES.includes(String(r.asset_type)))
          .map((r) => ({ id: String(r.id), name: String(r.name), value: Number(r.value) || 0 }))
          .sort((a, b) => b.value - a.value),
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (stakes === null) {
    return (
      <div className="drv-num bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 mb-8 text-sm text-[var(--muted)]">
        {L('تُقرأ الملكيات…', 'Reading ownership…')}
      </div>
    );
  }

  if (stakes.length === 0) {
    return (
      <div className="drv-num bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 sm:p-6 mb-8">
        <div className="font-serif text-lg font-semibold text-[var(--ink)] mb-1">🏢 {L('الملكيات والحصص الخاصة', 'Ownership & private stakes')}</div>
        <p className="text-[11px] text-[var(--muted)] leading-relaxed mb-3">
          {L(
            'للمتقدمين: حصة في شركة، مركز في صندوق VC أو PE، شراكة في مشروع — ملكياتك خارج السوق العام، مسجّلةً بقيمتها الحالية.',
            "For the advanced: a company share, a VC or PE fund position, a partnership in a venture — your holdings outside the public market, logged at their current mark."
          )}
        </p>
        <Link href="/holdings" className="text-xs font-semibold text-white bg-[var(--green-dark)] rounded-lg px-4 py-2 inline-block">
          {L('سجّل أول حصة ←', 'Log your first stake →')}
        </Link>
      </div>
    );
  }

  const total = stakes.reduce((s, r) => s + r.value, 0);
  const drift = loggedEquity !== null && loggedEquity > 0 ? total - loggedEquity : null;

  return (
    <div className="drv-num bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 sm:p-6 mb-8">
      <div className="flex items-baseline justify-between gap-2 flex-wrap mb-1">
        <div className="font-serif text-lg font-semibold text-[var(--ink)]">🏢 {L('الملكيات والحصص الخاصة', 'Ownership & private stakes')}</div>
        <Link href="/holdings" className="text-[11px] font-semibold text-[var(--green-dark)] hover:underline">
          {L('أدرها في الأصول ←', 'Manage in Holdings →')}
        </Link>
      </div>
      <p className="text-[11px] text-[var(--muted)] leading-relaxed mb-4">
        {L(
          'ما تملكه خارج السوق العام — شركات وصناديق وشراكات، بقيمتها الحالية لا بسعر شاشة.',
          'What you own beyond the public market — companies, funds and partnerships, at their current mark rather than a screen price.'
        )}
      </p>

      {/* the stakes, largest first, each with its share of the whole */}
      <div className="flex flex-col gap-2 mb-3">
        {stakes.map((r) => (
          <div key={r.id} className="flex items-center gap-3">
            <span className="text-base leading-none shrink-0" aria-hidden>🏢</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold text-[var(--ink)] truncate">{r.name}</span>
              <span className="block h-1.5 rounded-full bg-[var(--border-faint)] overflow-hidden mt-1" dir="ltr">
                <span className="block h-full rounded-full bg-[#7A5EA8]" style={{ width: `${total > 0 ? Math.max(2, (r.value / total) * 100) : 0}%` }} />
              </span>
            </span>
            <span className="text-[11px] font-bold text-[var(--ink)] whitespace-nowrap" dir="ltr">{fmt(r.value)}</span>
          </div>
        ))}
      </div>

      {/* total + the drift against the Log's equity line */}
      <div className="flex items-center justify-between gap-3 flex-wrap rounded-xl border border-[var(--border-faint)] bg-[var(--surface-1)] px-3.5 py-2.5">
        <div className="text-[11px] text-[var(--ink-2)]">
          <span className="font-semibold" dir="ltr">{fmt(total)}</span> {L('إجمالي الحصص', 'total stakes')}
          {drift !== null && Math.abs(drift) >= 1 && (
            <span className="text-[var(--muted)]"> · {L(
              `سطر «الحصص» في السِّجل يقول ${fmt(loggedEquity!)} (${drift >= 0 ? '+' : '−'}${fmt(Math.abs(drift))} فرقاً)`,
              `the Log's equity line says ${fmt(loggedEquity!)} (${drift >= 0 ? '+' : '−'}${fmt(Math.abs(drift))} apart)`
            )}</span>
          )}
          {drift !== null && Math.abs(drift) < 1 && (
            <span className="text-[var(--muted)]"> · {L('مطابق لسطر السِّجل — لا انحراف.', "matches the Log's line — no drift.")}</span>
          )}
        </div>
        <Link href="/financial-numbers" className="text-[10px] font-semibold text-[var(--green-dark)] border border-[var(--green-border)] rounded-lg px-3 py-1.5 hover:bg-[var(--green-bg)] transition-colors whitespace-nowrap">
          {L('حدّث سطر السِّجل ←', "Update the Log's line →")}
        </Link>
      </div>
    </div>
  );
}
