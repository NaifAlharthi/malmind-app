'use client';

// The Log's own address. It grew up inside home·D3, earned a door in
// the top bar, and now lives on its own page — the user's database:
// vital signs, the chart, the grid, the backfill room, all of it.
// Home·D3 became the Monthly Pulse in its place.

import LogTile from '@/components/home/LogTile';
import IncomeTile from '@/components/log/IncomeTile';
import SpendingTile from '@/components/log/SpendingTile';
import PortfolioTile from '@/components/log/PortfolioTile';
import OwnershipTile from '@/components/log/OwnershipTile';
import OtherAssetsTile from '@/components/log/OtherAssetsTile';
import LiabilitiesTile from '@/components/log/LiabilitiesTile';
import { useLocale } from '@/lib/i18n/LocaleProvider';

// A slim connector between tiles — the page reads as one river:
// income enters, spending leaves (servicing loops to the debt book),
// and what survives settles into portfolios and other assets, minus
// liabilities. Every tile drifts against its own line in the record.
function FlowLink({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 -mt-4 mb-4 text-[10px] text-[var(--muted)]" aria-hidden>
      <span className="h-px flex-1 max-w-24 bg-[var(--border-faint)]" />
      <span>↓ {label}</span>
      <span className="h-px flex-1 max-w-24 bg-[var(--border-faint)]" />
    </div>
  );
}

export default function LogPage() {
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  return (
    <div>
      {/* the record itself — everything below reads from or reconciles to it */}
      <LogTile />
      <FlowLink label={L('من السِّجل ينبع النهر', 'from the record, the river')} />
      {/* the flow: in… */}
      <IncomeTile />
      <FlowLink label={L('الدخل يمرّ بالمصروف', 'income passes through spending')} />
      {/* …out (its fixed share loops to the debt book below) */}
      <SpendingTile />
      <FlowLink label={L('ما ينجو يستقر في الميزانية', 'what survives settles into the balance sheet')} />
      {/* the balance sheet: what grows in the public market… */}
      <PortfolioTile />
      {/* …what you own in the private one… */}
      <OwnershipTile />
      {/* …what you own beyond markets altogether… */}
      <OtherAssetsTile />
      <FlowLink label={L('وما يُطرح منها', 'and what subtracts from it')} />
      {/* …and what subtracts */}
      <LiabilitiesTile />
    </div>
  );
}
