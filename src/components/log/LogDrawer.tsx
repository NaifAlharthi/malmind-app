'use client';

// The ledger drawer — every log under the Log, in one tile. At rest it is
// one horizontal row of big buttons, segmented the way money moves (what
// flows · what you own · what you owe · your own ledgers), each carrying
// its headline figure. A dashed ＋ tile closes the row: it opens a picker
// of predefined Saudi-life ledgers (or a custom one) that join the row.
// A tap drops a ledger's full record open beneath the row; a second tap
// folds it away — one open at a time, so the page never shouts.
// The Brain's pointing finger (?spot=<id>) opens the right drawer first,
// then BrainSpotlight finds the tile and rings it.

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import IncomeTile from '@/components/log/IncomeTile';
import SpendingTile from '@/components/log/SpendingTile';
import PortfolioTile from '@/components/log/PortfolioTile';
import OwnershipTile from '@/components/log/OwnershipTile';
import OtherAssetsTile from '@/components/log/OtherAssetsTile';
import LiabilitiesTile from '@/components/log/LiabilitiesTile';
import CreditScoreTile from '@/components/log/CreditScoreTile';
import { AddLedgerPicker, CustomLedgerPanel } from '@/components/log/CustomLedgerPanels';
import { loadLedgers, saveLedger, deleteLedger, ledgerHeadline, type CustomLedger, type Store } from '@/lib/customLedgers';

type CoreKey = 'income' | 'spending' | 'portfolio' | 'ownership' | 'other-assets' | 'liabilities' | 'credit-score';

interface Headline { value: string | null; tone?: 'good' | 'bad' }

const PANELS: Record<CoreKey, () => React.ReactElement> = {
  income: () => <IncomeTile />,
  spending: () => <SpendingTile />,
  portfolio: () => <PortfolioTile />,
  ownership: () => <OwnershipTile />,
  'other-assets': () => <OtherAssetsTile />,
  liabilities: () => <LiabilitiesTile />,
  'credit-score': () => <CreditScoreTile />,
};

const CORE_KEYS = Object.keys(PANELS) as CoreKey[];

const compact = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1)}M`;
  if (a >= 10_000) return `${Math.round(n / 1_000)}k`;
  return Math.round(n).toLocaleString('en-US');
};

// `embedded` — the drawer lives inside the Log tile, under the record,
// so it drops its own card frame for a divider.
export default function LogDrawer({ embedded = false }: { embedded?: boolean }) {
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  // open: a core key, 'custom:<id>', or 'add' (the ＋ picker)
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [heads, setHeads] = useState<Partial<Record<CoreKey, Headline>>>({});
  const [uid, setUid] = useState<string | null>(null);
  const [ledgers, setLedgers] = useState<CustomLedger[]>([]);
  const [store, setStore] = useState<Store>('db');
  const panelRef = useRef<HTMLDivElement>(null);

  // the Brain's finger: ?spot=<ledger> opens that drawer on arrival
  useEffect(() => {
    const spot = new URLSearchParams(window.location.search).get('spot');
    if (spot && (CORE_KEYS as string[]).includes(spot)) setOpenKey(spot);
  }, []);

  // headline figures + the user's own ledgers — read once
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUid(user.id);
      const [{ data: snapsRaw }, { data: creditRaw }, mine] = await Promise.all([
        supabase.from('financial_snapshots')
          .select('year, month, income, expenses, stocks, equity, other_assets, liabilities')
          .eq('user_id', user.id)
          .order('year', { ascending: true }).order('month', { ascending: true }),
        supabase.from('credit_snapshots')
          .select('report_date, molim_score')
          .eq('user_id', user.id)
          .order('report_date', { ascending: true }),
        loadLedgers(supabase, user.id),
      ]);
      setLedgers(mine.list);
      setStore(mine.store);
      const snaps = (snapsRaw as { income: number; expenses: number; stocks: number; equity: number; other_assets: number; liabilities: number }[] | null) ?? [];
      const credit = ((creditRaw as { molim_score: number | null }[] | null) ?? []).filter((c) => c.molim_score !== null);
      const next: Partial<Record<CoreKey, Headline>> = {};
      if (snaps.length) {
        const recent = snaps.slice(-6);
        const avg = (f: (s: typeof snaps[number]) => number) => recent.reduce((a, s) => a + f(s), 0) / recent.length;
        const last = snaps[snaps.length - 1];
        const inc = avg((s) => Number(s.income));
        const exp = avg((s) => Number(s.expenses));
        next.income = { value: compact(inc) };
        next.spending = { value: compact(exp), tone: exp > inc ? 'bad' : undefined };
        next.portfolio = { value: Number(last.stocks) > 0 ? compact(Number(last.stocks)) : null };
        next.ownership = { value: Number(last.equity) > 0 ? compact(Number(last.equity)) : null };
        next['other-assets'] = { value: Number(last.other_assets) > 0 ? compact(Number(last.other_assets)) : null };
        next.liabilities = { value: Number(last.liabilities) > 0 ? compact(Number(last.liabilities)) : null, tone: Number(last.liabilities) > 0 ? 'bad' : undefined };
      }
      if (credit.length) next['credit-score'] = { value: String(credit[credit.length - 1].molim_score), tone: 'good' };
      setHeads(next);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // on a phone the panel opens below the fold — bring it into view
  useEffect(() => {
    if (!openKey || !panelRef.current) return;
    if (window.innerWidth < 640) panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [openKey]);

  // ── the user's own ledgers ──
  const persist = async (ledger: CustomLedger, all: CustomLedger[]) => {
    if (!uid) return;
    const used = await saveLedger(supabase, uid, store, ledger, all);
    if (used !== store) setStore(used);
  };
  const createLedger = (l: Omit<CustomLedger, 'id' | 'entries'>) => {
    const ledger: CustomLedger = { ...l, id: crypto.randomUUID(), entries: [] };
    const all = [...ledgers, ledger];
    setLedgers(all);
    setOpenKey(`custom:${ledger.id}`);
    persist(ledger, all);
  };
  const updateLedger = (ledger: CustomLedger) => {
    const all = ledgers.map((l) => (l.id === ledger.id ? ledger : l));
    setLedgers(all);
    persist(ledger, all);
  };
  const removeLedger = (id: string) => {
    const all = ledgers.filter((l) => l.id !== id);
    setLedgers(all);
    setOpenKey(null);
    if (uid) deleteLedger(supabase, uid, store, id, ledgers);
  };

  const SEGMENTS: { label: string; items: { key: string; icon: string; name: string; sub: string; head?: Headline }[] }[] = [
    {
      label: L('ما يتدفّق', 'What flows'),
      items: [
        { key: 'income', icon: '💰', name: L('الدخل', 'Income'), sub: L('متوسط ٦ أشهر', '6-mo average'), head: heads.income },
        { key: 'spending', icon: '🔥', name: L('المصروف', 'Spending'), sub: L('متوسط ٦ أشهر', '6-mo average'), head: heads.spending },
      ],
    },
    {
      label: L('ما تملكه', 'What you own'),
      items: [
        { key: 'portfolio', icon: '📈', name: L('المحافظ الاستثمارية', 'Investment portfolios'), sub: L('آخر قيمة', 'latest value'), head: heads.portfolio },
        { key: 'ownership', icon: '🏢', name: L('الحصص والملكيات', 'Ownership & stakes'), sub: L('آخر قيمة', 'latest value'), head: heads.ownership },
        { key: 'other-assets', icon: '🐫', name: L('أصول أخرى', 'Other assets'), sub: L('آخر قيمة', 'latest value'), head: heads['other-assets'] },
      ],
    },
    {
      label: L('ما عليك', 'What you owe'),
      items: [
        { key: 'liabilities', icon: '⛓', name: L('الالتزامات', 'Liabilities'), sub: L('المتبقّي', 'remaining'), head: heads.liabilities },
        { key: 'credit-score', icon: '📇', name: L('الدرجة الائتمانية', 'Credit score'), sub: L('آخر تقرير', 'latest report'), head: heads['credit-score'] },
      ],
    },
    {
      label: L('دفاترك', 'Your ledgers'),
      items: ledgers.map((l) => {
        const h = ledgerHeadline(l);
        return {
          key: `custom:${l.id}`,
          icon: l.icon,
          name: l.name,
          sub: h.label === 'latest' ? L('آخر قيمة', 'latest value') : L('هذا العام', 'this year'),
          head: { value: h.value === null ? null : compact(h.value), tone: l.kind === 'flow' ? (l.direction === 'in' ? 'good' : 'bad') : undefined },
        };
      }),
    },
  ];

  const openCustom = openKey?.startsWith('custom:') ? ledgers.find((l) => `custom:${l.id}` === openKey) : undefined;

  return (
    <div className={embedded
      ? 'mt-6 pt-5 border-t border-[var(--border-default)]'
      : 'bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 sm:p-6 mb-8'}
    >
      <div className={`font-semibold text-[var(--ink)] mb-1 ${embedded ? 'text-sm' : 'font-serif text-lg'}`}>🗄 {L('دفاتر السِّجل', 'The ledgers')}</div>
      <p className="text-[11px] text-[var(--muted)] leading-relaxed mb-4">
        {L(
          'كل دفتر من دفاتر حياتك المالية في درج واحد — اضغط أي دفتر لفتح سجلّه كاملاً، واضغطه مجدداً لطيّه. وأضف بـ＋ أي مجال تريد تتبّعه.',
          'Every ledger of your financial life in one drawer — tap any of them to open its full record, tap again to fold it away. Add any area you want to track with ＋.'
        )}
      </p>

      {/* one horizontal row — segments side by side, ＋ closes it */}
      <div className="overflow-x-auto -mx-1 px-1 pb-2">
        <div className="flex items-stretch gap-4 w-max">
          {SEGMENTS.map((seg, si) => (
            <div key={seg.label} className={`flex flex-col ${si > 0 ? 'ps-4 border-s border-[var(--border-faint)]' : ''}`}>
              <div className="text-[9px] tracking-[0.1em] uppercase font-semibold text-[var(--muted)] mb-1.5">{seg.label}</div>
              <div className="flex items-stretch gap-2 flex-1">
                {seg.items.map((it) => {
                  const active = openKey === it.key;
                  const h = it.head;
                  return (
                    <button
                      key={it.key}
                      onClick={() => setOpenKey(active ? null : it.key)}
                      aria-expanded={active}
                      className={`w-[142px] shrink-0 text-start rounded-xl border px-3.5 py-3 transition-all cursor-pointer ${
                        active
                          ? 'border-[var(--green)] bg-[var(--green-bg)]/60 ring-1 ring-[var(--green)]'
                          : 'border-[var(--border-faint)] bg-[var(--surface-1)] hover:border-[var(--green)] hover:-translate-y-0.5'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-xl leading-none">{it.icon}</span>
                        <span className={`text-[10px] text-[var(--muted)] transition-transform ${active ? 'rotate-180' : ''}`}>▾</span>
                      </div>
                      <div className="text-[12px] font-semibold text-[var(--ink)] leading-tight line-clamp-2">{it.name}</div>
                      <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
                        <span
                          className="text-sm font-bold"
                          dir="ltr"
                          style={{ color: !h?.value ? 'var(--muted)' : h.tone === 'bad' ? 'var(--red-2)' : h.tone === 'good' ? 'var(--green-dark)' : 'var(--ink)' }}
                        >
                          {h?.value ?? '—'}
                        </span>
                        <span className="text-[9px] text-[var(--muted)]">{h?.value ? it.sub : L('لم يُسجَّل بعد', 'not logged yet')}</span>
                      </div>
                    </button>
                  );
                })}
                {/* the ＋ placeholder — always the very end of the row */}
                {si === SEGMENTS.length - 1 && (
                  <button
                    onClick={() => setOpenKey(openKey === 'add' ? null : 'add')}
                    aria-expanded={openKey === 'add'}
                    className={`w-[142px] shrink-0 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 px-3 py-3 transition-colors cursor-pointer ${
                      openKey === 'add'
                        ? 'border-[var(--green)] bg-[var(--green-bg)]/50 text-[var(--green-dark)]'
                        : 'border-[var(--border-default)] text-[var(--muted)] hover:border-[var(--green)] hover:text-[var(--green-dark)]'
                    }`}
                  >
                    <span className="text-2xl leading-none font-light">＋</span>
                    <span className="text-[11px] font-semibold">{L('دفتر جديد', 'New ledger')}</span>
                    <span className="text-[9px] opacity-80">{L('ذهب، إيجار، مدارس…', 'gold, rent, school…')}</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* the open ledger, dropping down beneath the row */}
      {openKey && (
        <div
          ref={panelRef}
          key={openKey}
          data-spot={(CORE_KEYS as string[]).includes(openKey) ? openKey : undefined}
          className="mm-drawer-panel mt-3 pt-4 border-t border-[var(--border-faint)]"
        >
          {openKey === 'add' ? (
            <AddLedgerPicker ar={ar} existing={ledgers} onCreate={createLedger} />
          ) : openCustom ? (
            <CustomLedgerPanel ar={ar} ledger={openCustom} onChange={updateLedger} onDelete={() => removeLedger(openCustom.id)} />
          ) : (CORE_KEYS as string[]).includes(openKey) ? (
            PANELS[openKey as CoreKey]()
          ) : null}
        </div>
      )}
      {store === 'local' && ledgers.length > 0 && (
        <p className="text-[9px] text-[var(--muted)] mt-2">
          {L('دفاترك محفوظة في هذا المتصفح حالياً، لا في حسابك.', 'Your ledgers are saved in this browser for now, not in your account.')}
        </p>
      )}
    </div>
  );
}
