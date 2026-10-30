'use client';

// The Log's own address — the user's database, in three movements:
//   ① Integrations — how numbers arrive
//   ② Summary      — how far the record reaches, and the chart
//   ③ The Log      — why the record matters, the full table (hidden
//                    until asked for, editable in place), and the ledgers
//                    drawer: every detailed log behind big buttons, plus
//                    the user's own ledgers via ＋
// ② and ③ come from one component so an edit in ③ redraws ②.

import LogTile from '@/components/home/LogTile';
import IntegrationsTile from '@/components/log/IntegrationsTile';
import LogDrawer from '@/components/log/LogDrawer';
import { useLocale } from '@/lib/i18n/LocaleProvider';

// A slim connector between tiles — the page reads as one movement.
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
  // data-spot ids (integrations, summary, log, and each ledger in the
  // drawer) let the Brain's pointing finger ring a tile. drv-exempt: the
  // Log is the database; the story drive must never blank it.
  return (
    <div className="drv-exempt">
      <div data-spot="integrations"><IntegrationsTile /></div>
      <FlowLink label={L('الروافد تصبّ في السِّجل', 'the inlets pour into the record')} />
      <LogTile
        between={<FlowLink label={L('ومن الملخّص إلى السِّجل كاملاً', 'and from the summary, the full record')} />}
        drawer={<LogDrawer embedded />}
      />
    </div>
  );
}
