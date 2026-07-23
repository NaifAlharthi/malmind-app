'use client';

// Credit Standing — the SIMAH / MOLIM credit view. The user records their
// official MOLIM score (300–900) and the products from their SIMAH report;
// MalMind interprets the band, splits good vs bad debt, reads the SIMAH-style
// factors, estimates access to credit and margin against SAMA's caps, and
// tracks how the score moves over time. Nothing here is a lending decision or
// investment advice — it is informational and educational only.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import {
  SCORE_MIN, SCORE_MAX, BANDS, bandFor, bandLabel, bandBlurb,
  PRODUCT_TYPES, productLabel, classifyDebt, debtClassLabel, debtClassColor, debtClassWhy,
  computeMetrics, readFactors, factorLabel, factorDetail, computeAccess, scoreDelta,
  parseSimahReport, DBR_NON_MORTGAGE_CAP, DBR_TOTAL_CAP,
  type ProductType, type CreditAccount, type CreditSnapshotInput, type FactorRating,
} from '@/lib/creditScore';

interface SnapshotRow extends CreditSnapshotInput {
  id: string;
  total_limits: number;
  total_outstanding: number;
  num_active: number;
}

interface AccountRow extends CreditAccount {
  snapshot_id: string;
}

// A blank account row for the editor.
function blankAccount(): Omit<AccountRow, 'id' | 'snapshot_id'> {
  return {
    product_type: 'credit_card', creditor: '', credit_limit: 0, outstanding: 0,
    installment: 0, past_due: 0, issue_date: null, status: 'active', payment_status: 'current',
  };
}

function fmt(n: number) {
  return Math.round(n).toLocaleString();
}

const FACTOR_COLOR: Record<FactorRating, string> = {
  strong: '#1D9E75', ok: '#D89A3E', weak: '#C0504D', unknown: '#8a99a8',
};

export default function CreditPage() {
  const router = useRouter();
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const money = (n: number) => (ar ? `${fmt(n)} ريال` : `SAR ${fmt(n)}`);

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [setupError, setSetupError] = useState(false);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [portfolio, setPortfolio] = useState(0);
  const [assets, setAssets] = useState<{ cash: number; investments: number; realEstate: number; other: number; liabilities: number } | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [creating, setCreating] = useState(false);

  // ── new-report editor state ──
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [molimScore, setMolimScore] = useState('');
  const [firstAccount, setFirstAccount] = useState('');
  const [numDefaulted, setNumDefaulted] = useState('0');
  const [totalDefaulted, setTotalDefaulted] = useState('0');
  const [numInquiries, setNumInquiries] = useState('0');
  const [bounced, setBounced] = useState('0');
  const [editAccounts, setEditAccounts] = useState<ReturnType<typeof blankAccount>[]>([blankAccount()]);
  const [pasteText, setPasteText] = useState('');
  const [pasteMsg, setPasteMsg] = useState<string | null>(null);
  const [showPaste, setShowPaste] = useState(false);

  const loadAccounts = useCallback(async (snapshotId: string) => {
    const { data } = await supabase
      .from('credit_accounts')
      .select('*')
      .eq('snapshot_id', snapshotId)
      .order('sort_order', { ascending: true });
    if (data) setAccounts(data as AccountRow[]);
    else setAccounts([]);
  }, [supabase]);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    setUserId(user.id);

    const [{ data: profile }, { data: invest }, { data: snaps }] = await Promise.all([
      supabase.from('profiles').select('monthly_income').eq('id', user.id).single(),
      supabase.from('investment_settings').select('portfolio_value').eq('user_id', user.id).maybeSingle(),
      supabase.from('financial_snapshots').select('year, month, cash, stocks, real_estate, equity, other_assets, liabilities').eq('user_id', user.id).order('year', { ascending: true }).order('month', { ascending: true }),
    ]);
    if (profile?.monthly_income != null) setMonthlyIncome(Number(profile.monthly_income));
    if (invest?.portfolio_value != null) setPortfolio(Number(invest.portfolio_value));
    if (snaps && snaps.length) {
      const s = snaps[snaps.length - 1] as { cash: number; stocks: number; real_estate: number; equity: number; other_assets: number; liabilities: number };
      setAssets({
        cash: Number(s.cash) || 0,
        investments: (Number(s.stocks) || 0) + (Number(s.equity) || 0),
        realEstate: Number(s.real_estate) || 0,
        other: Number(s.other_assets) || 0,
        liabilities: Number(s.liabilities) || 0,
      });
    }

    const { data, error } = await supabase
      .from('credit_snapshots')
      .select('*')
      .eq('user_id', user.id)
      .order('report_date', { ascending: true });

    if (error) { setSetupError(true); setLoading(false); return; }
    const rows = (data as SnapshotRow[]) ?? [];
    setSnapshots(rows);
    const latest = rows.length > 0 ? rows[rows.length - 1] : null;
    setActiveId((prev) => prev ?? latest?.id ?? null);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (activeId) loadAccounts(activeId); }, [activeId, loadAccounts]);

  const active = snapshots.find((s) => s.id === activeId) ?? null;
  const activeIndex = snapshots.findIndex((s) => s.id === activeId);
  const previous = activeIndex > 0 ? snapshots[activeIndex - 1] : null;

  const metrics = useMemo(
    () => active ? computeMetrics(active, accounts) : null,
    [active, accounts]
  );
  const factors = useMemo(
    () => active && metrics ? readFactors(active, metrics) : [],
    [active, metrics]
  );
  const mortgageOutstanding = useMemo(
    () => accounts.filter((a) => a.product_type === 'mortgage').reduce((s, a) => s + (Number(a.outstanding) || 0), 0),
    [accounts]
  );
  const access = useMemo(
    () => metrics ? computeAccess(active?.molim_score ?? null, metrics, monthlyIncome, portfolio, assets?.realEstate ?? 0, mortgageOutstanding) : null,
    [metrics, active, monthlyIncome, portfolio, assets, mortgageOutstanding]
  );

  const delta = scoreDelta(active?.molim_score ?? null, previous?.molim_score ?? null);

  function applyPaste() {
    const parsed = parseSimahReport(pasteText);
    if (parsed.snapshot.report_date) setReportDate(parsed.snapshot.report_date);
    if (parsed.snapshot.first_account_date) setFirstAccount(parsed.snapshot.first_account_date);
    if (parsed.snapshot.num_defaulted != null) setNumDefaulted(String(parsed.snapshot.num_defaulted));
    if (parsed.snapshot.total_defaulted != null) setTotalDefaulted(String(parsed.snapshot.total_defaulted));
    if (parsed.snapshot.num_inquiries != null) setNumInquiries(String(parsed.snapshot.num_inquiries));
    if (parsed.snapshot.bounced_cheques != null) setBounced(String(parsed.snapshot.bounced_cheques));
    if (parsed.accounts.length > 0) {
      setEditAccounts(parsed.accounts.map((a) => ({ ...blankAccount(), ...a }) as ReturnType<typeof blankAccount>));
    }
    setPasteMsg(L(
      `تم استخراج ${parsed.accounts.length} منتجاً. راجِع الحقول وصحّحها ثم احفظ.`,
      `Extracted ${parsed.accounts.length} product${parsed.accounts.length === 1 ? '' : 's'}. Review and correct the fields, then save.`
    ));
  }

  function startCreate() {
    // Pre-fill the snapshot income from the profile.
    setReportDate(new Date().toISOString().slice(0, 10));
    setMolimScore('');
    setFirstAccount('');
    setNumDefaulted('0'); setTotalDefaulted('0'); setNumInquiries('0'); setBounced('0');
    setEditAccounts([blankAccount()]);
    setPasteText(''); setPasteMsg(null); setShowPaste(false);
    setCreating(true);
  }

  async function saveReport() {
    if (!userId) return;
    const rows = editAccounts.filter((a) => a.credit_limit > 0 || a.outstanding > 0 || a.installment > 0 || a.creditor);
    const totalLimits = rows.filter((a) => a.status !== 'closed').reduce((s, a) => s + (a.credit_limit || 0), 0);
    const totalOutstanding = rows.filter((a) => a.status !== 'closed').reduce((s, a) => s + (a.outstanding || 0), 0);
    const numActive = rows.filter((a) => a.status !== 'closed').length;

    const { data: snap, error } = await supabase.from('credit_snapshots').upsert({
      user_id: userId,
      report_date: reportDate,
      molim_score: molimScore ? parseInt(molimScore) : null,
      monthly_income: monthlyIncome,
      first_account_date: firstAccount || null,
      num_defaulted: parseInt(numDefaulted) || 0,
      total_defaulted: parseFloat(totalDefaulted) || 0,
      num_inquiries: parseInt(numInquiries) || 0,
      bounced_cheques: parseInt(bounced) || 0,
      total_limits: totalLimits,
      total_outstanding: totalOutstanding,
      num_active: numActive,
    }, { onConflict: 'user_id,report_date' }).select().single();

    if (error || !snap) return;

    // Replace accounts for this snapshot.
    await supabase.from('credit_accounts').delete().eq('snapshot_id', snap.id);
    if (rows.length > 0) {
      await supabase.from('credit_accounts').insert(
        rows.map((a, i) => ({
          user_id: userId, snapshot_id: snap.id, product_type: a.product_type,
          creditor: a.creditor || null, credit_limit: a.credit_limit, outstanding: a.outstanding,
          installment: a.installment, past_due: a.past_due, issue_date: a.issue_date || null,
          status: a.status, payment_status: a.past_due > 0 ? 'overdue' : 'current', sort_order: i,
        }))
      );
    }
    setCreating(false);
    setActiveId(snap.id);
    await load();
    await loadAccounts(snap.id);
  }

  async function deleteSnapshot(id: string) {
    await supabase.from('credit_snapshots').delete().eq('id', id);
    const remaining = snapshots.filter((s) => s.id !== id);
    setSnapshots(remaining);
    setActiveId(remaining.length ? remaining[remaining.length - 1].id : null);
  }

  // quick inline score update on the active snapshot
  async function updateScore(value: string) {
    if (!active) return;
    const n = value ? parseInt(value) : null;
    setSnapshots((prev) => prev.map((s) => s.id === active.id ? { ...s, molim_score: n } : s));
    await supabase.from('credit_snapshots').update({ molim_score: n }).eq('id', active.id);
  }

  if (loading) {
    return <div className="text-sm text-[var(--muted)]">{L('جارٍ تحميل وضعك الائتماني…', 'Loading your credit standing…')}</div>;
  }

  if (setupError) {
    return (
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-8 text-center text-sm text-[var(--ink-2)]">
        {L(
          'ميزة الوضع الائتماني تحتاج إلى تحديث قاعدة البيانات (schema_part16.sql) قبل الاستخدام.',
          'The Credit Standing feature needs the database migration (schema_part16.sql) to be applied before use.'
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--blue)] font-semibold mb-1">{L('قرّر', 'Decide')}</div>
      <h1 className="font-serif text-2xl font-semibold text-[var(--ink)] mb-1">{L('الوضع الائتماني', 'Credit Standing')}</h1>
      <p className="text-sm text-[var(--ink-2)] mb-5 max-w-2xl">
        {L(
          'درجتك الائتمانية من سِمة (مولِم، 300–900)، ودَينك الجيّد مقابل المُثقِل، وكم يمكنك الوصول إليه من ائتمان وهامش — مقروءةً من تقرير سِمة الخاص بك ومتتبَّعةً عبر الزمن.',
          "Your SIMAH credit score (MOLIM, 300–900), your good debt versus bad, and how much credit and margin you could access — read from your own SIMAH report and tracked over time."
        )}
      </p>

      {/* snapshot selector + record button */}
      <div className="flex gap-2 flex-wrap items-center mb-6">
        {snapshots.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveId(s.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium border ${
              activeId === s.id ? 'bg-[var(--ink)] text-[var(--surface-0)] border-[var(--ink)]' : 'bg-[var(--surface-card)] text-[var(--ink-2)] border-[var(--border-default)]'
            }`}
          >
            {s.report_date}{s.molim_score != null ? ` · ${s.molim_score}` : ''}
          </button>
        ))}
        <button onClick={startCreate} className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-[var(--green-bg)] text-[var(--green-dark)] border border-[var(--green-border)]">
          {L('+ سجّل تقريراً', '+ Record a report')}
        </button>
      </div>

      {creating && (
        <ReportEditor
          ar={ar} L={L}
          reportDate={reportDate} setReportDate={setReportDate}
          molimScore={molimScore} setMolimScore={setMolimScore}
          firstAccount={firstAccount} setFirstAccount={setFirstAccount}
          numDefaulted={numDefaulted} setNumDefaulted={setNumDefaulted}
          totalDefaulted={totalDefaulted} setTotalDefaulted={setTotalDefaulted}
          numInquiries={numInquiries} setNumInquiries={setNumInquiries}
          bounced={bounced} setBounced={setBounced}
          editAccounts={editAccounts} setEditAccounts={setEditAccounts}
          pasteText={pasteText} setPasteText={setPasteText}
          pasteMsg={pasteMsg} showPaste={showPaste} setShowPaste={setShowPaste}
          onApplyPaste={applyPaste} onSave={saveReport} onCancel={() => setCreating(false)}
        />
      )}

      {!active && !creating && (
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-8 text-center text-sm text-[var(--muted)]">
          {L('سجّل تقرير سِمة الأول لترى وضعك الائتماني.', 'Record your first SIMAH report to see your credit standing.')}
        </div>
      )}

      {active && metrics && (
        <>
          {/* ── score gauge ── */}
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-4 mb-5">
            <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6">
              <div className="text-[11px] tracking-[0.08em] uppercase text-[var(--muted)] mb-2">{L('درجة مولِم (سِمة)', 'MOLIM score (SIMAH)')}</div>
              <ScoreGauge score={active.molim_score} ar={ar} L={L} />
              <div className="flex items-center gap-2 mt-3 justify-center flex-wrap">
                <label className="text-xs text-[var(--muted)]">{L('درجتك الرسمية:', 'Your official score:')}</label>
                <input
                  type="number" min={SCORE_MIN} max={SCORE_MAX}
                  value={active.molim_score ?? ''}
                  onChange={(e) => updateScore(e.target.value)}
                  placeholder="300–900"
                  className="w-24 bg-[var(--surface-0)] border border-[var(--border-default)] rounded-lg px-2.5 py-1.5 text-sm text-center outline-none focus:border-[var(--green)]"
                />
                {delta != null && (
                  <span className={`text-xs font-semibold ${delta >= 0 ? 'text-[var(--green-dark)]' : 'text-[var(--red-dark-text)]'}`}>
                    {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)} {L('عن السابق', 'vs previous')}
                  </span>
                )}
              </div>
              {active.molim_score == null && (
                <p className="text-[11px] text-[var(--muted)] text-center mt-2 max-w-sm mx-auto leading-relaxed">
                  {L(
                    'التقرير الأساسي من سِمة لا يتضمّن الرقم — تحصل عليه من باقة «سمّة الذكية». أدخِله هنا لتتبّعه.',
                    "SIMAH's Basic report doesn't include the number — you get it from the paid Smart package. Enter it here to track it."
                  )}
                </p>
              )}
            </div>

            {/* band meaning */}
            <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 flex flex-col justify-center">
              {active.molim_score != null ? (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-3 h-3 rounded-full" style={{ background: bandFor(active.molim_score).color }} />
                    <span className="font-serif text-lg font-semibold text-[var(--ink)]">{bandLabel(bandFor(active.molim_score).key, locale)}</span>
                  </div>
                  <p className="text-sm text-[var(--ink-2)] leading-relaxed">{bandBlurb(bandFor(active.molim_score).key, locale)}</p>
                </>
              ) : (
                <p className="text-sm text-[var(--ink-2)] leading-relaxed">
                  {L('أدخِل درجتك الرسمية لترى تفسير الفئة وما يلزم للارتقاء إلى التالية.', 'Enter your official score to see the band meaning and what it takes to climb to the next one.')}
                </p>
              )}
              <div className="flex gap-1.5 mt-4">
                {BANDS.map((b) => (
                  <div key={b.key} className="flex-1 text-center">
                    <div className="h-1.5 rounded-full" style={{ background: b.color }} />
                    <div className="text-[9px] text-[var(--muted)] mt-1">{b.min}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── score over time ── */}
          {snapshots.filter((s) => s.molim_score != null).length >= 2 && (
            <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 mb-5">
              <div className="text-sm font-medium text-[var(--ink)] mb-1">{L('الدرجة عبر الزمن', 'Score over time')}</div>
              <div className="text-xs text-[var(--muted)] mb-3">{L('كل تقرير سجّلته، والفئات في الخلفية', 'Every report you recorded, with the bands behind it')}</div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={snapshots.map((s) => ({ date: s.report_date, score: s.molim_score }))}>
                    <CartesianGrid stroke="var(--chart-grid)" />
                    {BANDS.map((b) => (
                      <ReferenceArea key={b.key} y1={b.min} y2={b.max} fill={b.color} fillOpacity={0.07} strokeOpacity={0} />
                    ))}
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted)' }} />
                    <YAxis domain={[SCORE_MIN, SCORE_MAX]} ticks={[300, 450, 600, 750, 900]} tick={{ fontSize: 10, fill: 'var(--muted)' }} width={38} />
                    <Tooltip formatter={(v) => [v == null ? '—' : String(v), L('الدرجة', 'Score')]} />
                    <Line type="monotone" dataKey="score" stroke="var(--green-dark)" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── good vs bad debt ── */}
          <GoodBadDebt accounts={accounts} metrics={metrics} ar={ar} L={L} money={money} />

          {/* ── SIMAH factors ── */}
          <div className="mb-5">
            <div className="font-serif text-lg font-medium text-[var(--ink)] mb-1">{L('ما الذي يحرّك درجتك', 'What moves your score')}</div>
            <div className="text-sm text-[var(--ink-2)] mb-3">{L('العوامل التي تزنها سِمة، مقروءةً من تقريرك — ليست درجات مُختلَقة، بل قراءة لحالتك.', "The factors SIMAH weighs, read from your report — not invented sub-scores, a reading of where you stand.")}</div>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {factors.map((f) => (
                <div key={f.key} className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-[var(--ink)]">{factorLabel(f.key, locale)}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${FACTOR_COLOR[f.rating]}22`, color: FACTOR_COLOR[f.rating] }}>
                      {f.rating === 'strong' ? L('قويّ', 'Strong') : f.rating === 'ok' ? L('مقبول', 'OK') : f.rating === 'weak' ? L('ضعيف', 'Weak') : L('غير معروف', 'Unknown')}
                    </span>
                  </div>
                  <div className="h-1.5 bg-[var(--surface-1)] rounded-full overflow-hidden mb-2">
                    <div className="h-full rounded-full" style={{ width: `${f.weightPct}%`, background: FACTOR_COLOR[f.rating] }} />
                  </div>
                  <div className="text-[11px] text-[var(--ink-2)] leading-relaxed">{factorDetail(f.key, active, metrics, locale)}</div>
                  <div className="text-[10px] text-[var(--muted)] mt-1">{L(`وزن تقريبي: ${f.weightPct}%`, `~${f.weightPct}% of the weighting`)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── borrowing power: what you own vs what you could access ── */}
          {access && assets && (assets.cash + assets.investments + assets.realEstate + assets.other) > 0 && (
            <BorrowingPower assets={assets} access={access} ar={ar} L={L} money={money} />
          )}

          {/* ── access to credit & margin ── */}
          {access && (
            <AccessSection access={access} metrics={metrics} monthlyIncome={monthlyIncome} portfolio={portfolio} ar={ar} L={L} money={money} />
          )}

          <div className="flex items-center justify-between mt-2">
            <button onClick={() => deleteSnapshot(active.id)} className="text-xs text-[var(--red-dark-text)]">
              {L('احذف هذا التقرير', 'Delete this report')}
            </button>
          </div>

          <div className="flex gap-3 items-start bg-[var(--gold-bg)] border border-[var(--gold)] rounded-xl p-4 mt-5">
            <div className="w-7 h-7 rounded-full bg-[var(--gold)] flex items-center justify-center font-serif font-semibold text-white text-sm shrink-0">M</div>
            <div className="text-xs text-[var(--gold-text-body)] leading-relaxed">
              <strong className="text-[var(--gold-text-strong)]">{L('للاطّلاع فقط.', 'Informational only.')}</strong> {L(
                'هذه قراءة تعليمية لبيانات تقريرك، وليست قراراً بالإقراض ولا استشارة استثمارية. حدود الوصول تقديرية مبنية على قواعد ساما (نسبة الاستقطاع) وممارسات شائعة؛ والقرار النهائي للجهة المُقرِضة. الهامش رافعة مالية تضخّم الخسائر — تعامل معه بحذر.',
                "This is an educational read of your report data, not a lending decision or investment advice. Access figures are estimates based on SAMA's deduction-ratio caps and common practice; the real decision rests with each lender. Margin is leverage that magnifies losses — treat it with care."
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Score gauge: a 300–900 semicircle with the five bands and a needle ──────
function ScoreGauge({ score, ar, L }: { score: number | null; ar: boolean; L: (a: string, e: string) => string }) {
  const W = 300, H = 172, cx = 150, cy = 150, r = 120;
  const toXY = (v: number, radius = r) => {
    const t = (Math.max(SCORE_MIN, Math.min(SCORE_MAX, v)) - SCORE_MIN) / (SCORE_MAX - SCORE_MIN);
    const ang = Math.PI - t * Math.PI; // 180°→0°
    return { x: cx + radius * Math.cos(ang), y: cy - radius * Math.sin(ang) };
  };
  const arcPath = (from: number, to: number, radius: number) => {
    const a = toXY(from, radius), b = toXY(to, radius);
    return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} A ${radius} ${radius} 0 0 1 ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  };
  const needle = score != null ? toXY(score, r - 6) : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ maxHeight: 190 }}>
      {BANDS.map((b) => (
        <path key={b.key} d={arcPath(b.min, b.max, r)} fill="none" stroke={b.color} strokeWidth={16} strokeLinecap="butt" opacity={score != null && bandFor(score).key === b.key ? 1 : 0.35} />
      ))}
      {needle && (
        <>
          <line x1={cx} y1={cy} x2={needle.x} y2={needle.y} stroke="var(--ink)" strokeWidth={3} strokeLinecap="round" />
          <circle cx={cx} cy={cy} r={6} fill="var(--ink)" />
        </>
      )}
      <text x={cx} y={cy - 34} textAnchor="middle" fontFamily="Lora, Georgia, serif" fontSize={38} fontWeight={700} fill="var(--ink)">
        {score != null ? score : '—'}
      </text>
      <text x={cx} y={cy - 12} textAnchor="middle" fontSize={11} fill="var(--muted)">
        {L('من 900', 'of 900')}
      </text>
      <text x={toXY(SCORE_MIN).x - 4} y={cy + 16} textAnchor="middle" fontSize={10} fill="var(--muted)">300</text>
      <text x={toXY(SCORE_MAX).x + 4} y={cy + 16} textAnchor="middle" fontSize={10} fill="var(--muted)">900</text>
    </svg>
  );
}

// ── Good vs bad debt breakdown ──────────────────────────────────────────────
function GoodBadDebt({
  accounts, metrics, ar, L, money,
}: {
  accounts: AccountRow[]; metrics: ReturnType<typeof computeMetrics>;
  ar: boolean; L: (a: string, e: string) => string; money: (n: number) => string;
}) {
  const locale = ar ? 'ar' : 'en';
  const total = metrics.goodTotal + metrics.badTotal + metrics.leveragedTotal;
  const pct = (v: number) => total > 0 ? (v / total) * 100 : 0;
  const active = accounts.filter((a) => a.status !== 'closed');

  return (
    <div className="mb-5">
      <div className="font-serif text-lg font-medium text-[var(--ink)] mb-1">{L('دَينك: جيّد أم مُثقِل؟', 'Your debt: good or bad?')}</div>
      <div className="text-sm text-[var(--ink-2)] mb-3">{L('ليست كل الديون سواء. ما يبني أصلاً يعمل لصالحك؛ وما يموّل الاستهلاك يسحب منك.', 'Not all debt is equal. What builds an asset works for you; what funds consumption drains you.')}</div>

      {/* stacked bar */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-3">
        <div className="h-8 rounded-lg overflow-hidden flex bg-[var(--surface-1)] mb-3">
          {(['good', 'leveraged', 'bad'] as const).map((c) => {
            const val = c === 'good' ? metrics.goodTotal : c === 'leveraged' ? metrics.leveragedTotal : metrics.badTotal;
            if (val <= 0) return null;
            return (
              <div key={c} className="h-full flex items-center justify-center text-[10px] text-white font-medium whitespace-nowrap overflow-hidden"
                style={{ width: `${Math.max(pct(val), 4)}%`, background: debtClassColor(c) }}>
                {pct(val) >= 14 ? `${Math.round(pct(val))}%` : ''}
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: debtClassColor('good') }} /><span className="text-[11px] text-[var(--muted)]">{debtClassLabel('good', locale)}</span></div>
            <div className="font-serif text-base font-bold text-[var(--green-dark)]">{money(metrics.goodTotal)}</div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-0.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: debtClassColor('leveraged') }} /><span className="text-[11px] text-[var(--muted)]">{debtClassLabel('leveraged', locale)}</span></div>
            <div className="font-serif text-base font-bold" style={{ color: debtClassColor('leveraged') }}>{money(metrics.leveragedTotal)}</div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-0.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: debtClassColor('bad') }} /><span className="text-[11px] text-[var(--muted)]">{debtClassLabel('bad', locale)}</span></div>
            <div className="font-serif text-base font-bold text-[var(--red-dark-text)]">{money(metrics.badTotal)}</div>
          </div>
        </div>
      </div>

      {/* per-account cards */}
      <div className="grid sm:grid-cols-2 gap-2.5">
        {active.map((a) => {
          const cls = classifyDebt(a.product_type, a.outstanding);
          return (
            <div key={a.id} className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-4 flex gap-3 items-start">
              <span className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ background: debtClassColor(cls) }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-[var(--ink)] truncate">{productLabel(a.product_type, locale)}{a.creditor ? ` · ${a.creditor}` : ''}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: `${debtClassColor(cls)}22`, color: debtClassColor(cls) }}>{debtClassLabel(cls, locale)}</span>
                </div>
                <div className="text-xs text-[var(--ink-2)] mt-0.5">{money(a.outstanding)}{a.credit_limit > 0 ? ` ${L('من', 'of')} ${money(a.credit_limit)}` : ''}{a.installment > 0 ? ` · ${money(a.installment)}${L('/شهر', '/mo')}` : ''}</div>
                <div className="text-[11px] text-[var(--muted)] leading-relaxed mt-1">{debtClassWhy(cls, a.product_type, locale)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Borrowing power: what you own, next to what you could access ────────────
interface PowerSeg { key: string; label: string; value: number; color: string; note: string }

function BorrowingPower({
  assets, access, ar, L, money,
}: {
  assets: { cash: number; investments: number; realEstate: number; other: number; liabilities: number };
  access: NonNullable<ReturnType<typeof computeAccess>>;
  ar: boolean; L: (a: string, e: string) => string; money: (n: number) => string;
}) {
  const [hover, setHover] = useState<{ side: 'own' | 'access'; key: string } | null>(null);

  const own: PowerSeg[] = [
    { key: 'realEstate', label: L('عقارات', 'Real estate'), value: assets.realEstate, color: '#C9A84C', note: L('أصل يمكن الاقتراض عليه بأمان.', 'An asset you can borrow against safely.') },
    { key: 'investments', label: L('استثمارات', 'Investments'), value: assets.investments, color: '#1D9E75', note: L('يمكن استخدامها كضمان لهامش.', 'Can back a margin facility.') },
    { key: 'cash', label: L('نقد', 'Cash'), value: assets.cash, color: '#4A78C4', note: L('سيولتك الجاهزة — لا حاجة للاقتراض عليها.', 'Your ready liquidity — no need to borrow against it.') },
    { key: 'other', label: L('أخرى', 'Other'), value: assets.other, color: '#8a99a8', note: L('أصول أخرى تملكها.', 'Other things you own.') },
  ].filter((s) => s.value > 0);

  const accessSegs: PowerSeg[] = [
    { key: 'home', label: L('حقوق ملكية العقار', 'Home equity'), value: access.homeEquity, color: '#C9A84C', note: L('أرخص اقتراض — بضمان عقارك (حتى ~70% ناقص المتبقّي). قويّ للأصول المنتجة، مُكلِف إن أُنفِق.', 'The cheapest borrowing — secured by your property (~70% LTV less what you owe). Powerful for productive assets, costly if spent.') },
    { key: 'margin', label: L('هامش على المحفظة', 'Portfolio margin'), value: access.marginLow, color: '#1D9E75', note: L('بضمان محفظتك. يضخّم الأرباح والخسائر — للمتمرّسين.', 'Against your portfolio. Amplifies gains and losses — for the experienced.') },
    { key: 'personal', label: L('تمويل شخصي', 'Personal financing'), value: access.personalLoanPrincipal, color: '#17B8C9', note: L('غير مضمون، تحت سقف ساما 33%. مرن لكن راقِب الكلفة.', "Unsecured, under SAMA's 33% cap. Flexible, but watch the rate.") },
    { key: 'card', label: L('حدود البطاقات', 'Card headroom'), value: access.cardHeadroomExtra, color: '#B06A3A', note: L('أغلى الأموال — للراحة قصيرة الأجل فقط.', 'The most expensive money — short-term convenience only.') },
  ].filter((s) => s.value > 0);

  const totalOwn = own.reduce((s, x) => s + x.value, 0);
  const totalAccess = access.totalAccessible;
  const netWorth = totalOwn - assets.liabilities;
  const scale = Math.max(totalOwn, totalAccess, 1);
  const H = 320;
  const px = H / scale;
  const accessPct = totalOwn > 0 ? Math.round((totalAccess / totalOwn) * 100) : 0;

  const hovered = hover ? (hover.side === 'own' ? own : accessSegs).find((s) => s.key === hover.key) ?? null : null;

  const Bar = ({ side, segs, total, title }: { side: 'own' | 'access'; segs: PowerSeg[]; total: number; title: string }) => {
    let run = 0;
    return (
      <div className="flex flex-col items-center">
        <div className="text-[10px] tracking-[0.06em] uppercase text-[var(--muted)] mb-1.5 text-center">{title}</div>
        <div className="font-serif text-lg font-bold text-[var(--ink)] mb-2">{money(total)}</div>
        <div className="relative" style={{ width: 96, height: H }} dir="ltr">
          {/* baseline track */}
          <div className="absolute inset-0 rounded-lg bg-[var(--surface-1)] border border-[var(--border-faint)]" />
          {segs.map((s) => {
            const h = s.value * px;
            const b = run; run += h;
            const active = hover?.side === side && hover.key === s.key;
            return (
              <div key={s.key}
                onMouseEnter={() => setHover({ side, key: s.key })}
                className="absolute inset-x-0 rounded-md flex items-center justify-center cursor-pointer transition-all"
                style={{ bottom: b, height: Math.max(2, h - 2), background: `linear-gradient(180deg, ${s.color}f2, ${s.color}c8)`, boxShadow: active ? `0 0 0 2px var(--surface-card), 0 0 0 4px ${s.color}` : 'none', zIndex: active ? 5 : 1 }}>
                {h > 22 && <span className="text-[10px] font-semibold text-white text-center px-1 leading-tight">{s.label}</span>}
              </div>
            );
          })}
          {/* net-worth line on the "own" bar */}
          {side === 'own' && netWorth > 0 && netWorth < totalOwn && (
            <div className="absolute inset-x-0 flex items-center pointer-events-none" style={{ bottom: netWorth * px }}>
              <div className="flex-1 border-t-2 border-dashed border-[var(--ink)] opacity-70" />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="mb-5">
      <div className="font-serif text-lg font-medium text-[var(--ink)] mb-1">{L('قوّتك الاقتراضية', 'Your borrowing power')}</div>
      <div className="text-sm text-[var(--ink-2)] mb-3 max-w-2xl">
        {L('ما تملكه اليوم، وبجانبه ما يمكنك الوصول إليه مقابله — بالمقياس نفسه. هذه أرضية اللعب: أين تكمن قوّتك، وكيف تستخدمها بحكمة.',
          'What you own today, next to what you could access against it — at the same scale. This is the playing field: where your power sits, and how to use it wisely.')}
      </div>

      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
          {/* the two proportional bars */}
          <div className="flex gap-5 shrink-0 mx-auto sm:mx-0">
            <Bar side="own" segs={own} total={totalOwn} title={L('ما تملك', 'What you own')} />
            <Bar side="access" segs={accessSegs} total={totalAccess} title={L('ما يمكنك الوصول إليه', 'What you can access')} />
          </div>

          {/* insight / guidance */}
          <div className="flex-1 min-w-0 flex flex-col">
            {hovered ? (
              <div className="rounded-xl border p-4" style={{ borderColor: `${hovered.color}66`, background: `${hovered.color}0f` }}>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="w-3 h-3 rounded-sm" style={{ background: hovered.color }} />
                  <span className="font-serif text-lg font-semibold text-[var(--ink)]">{hovered.label}</span>
                </div>
                <div className="font-serif text-2xl font-bold" style={{ color: hovered.color }}>{money(hovered.value)}</div>
                <div className="text-[11px] text-[var(--ink-2)] mt-2 leading-relaxed">{hovered.note}</div>
              </div>
            ) : (
              <>
                <div className="text-sm text-[var(--ink)] leading-relaxed">
                  {L(
                    `صافي ثروتك نحو `, `Your net worth is about `)}
                  <strong>{money(Math.max(0, netWorth))}</strong>.{' '}
                  {access.eligible
                    ? <>{L('ومقابل ما تملك، يمكنك الوصول بمسؤولية إلى نحو ', 'Against what you own, you could responsibly access about ')}<strong className="text-[var(--green-dark)]">{money(totalAccess)}</strong>{L(` — أي نحو ${accessPct}% مما تملك.`, ` — roughly ${accessPct}% of what you own.`)}</>
                    : L('ارفع درجتك الائتمانية أولاً لتفتح خيارات وصول ذات معنى.', 'Lift your credit score first to open meaningful access.')}
                </div>
                <div className="text-[11px] text-[var(--muted)] mt-2">{L('مرّر فوق أي طبقة لفهمها وكيفية استخدامها.', 'Hover any layer to see what it is and how to use it.')}</div>
              </>
            )}

            <div className="mt-auto pt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px]">
              {accessSegs.map((s) => (
                <span key={s.key} className="inline-flex items-center gap-1.5 text-[var(--ink-2)]"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />{s.label} · <strong className="text-[var(--ink)] font-medium">{money(s.value)}</strong></span>
              ))}
            </div>
          </div>
        </div>
        <div className="text-[10px] text-[var(--muted)] mt-4 pt-3 border-t border-[var(--border-faint)]">
          {L('تقديرات تعليمية توضيحية وفق حدود ساما وممارسات السوق — ليست عرض تمويل ولا نصيحة. الدَّين المسؤول أداة، لا هدف.',
            "Illustrative educational estimates against SAMA caps and market practice — not an offer or advice. Responsible debt is a tool, not a goal.")}
        </div>
      </div>
    </div>
  );
}

// ── Access to credit & margin ───────────────────────────────────────────────
function AccessSection({
  access, metrics, monthlyIncome, portfolio, ar, L, money,
}: {
  access: NonNullable<ReturnType<typeof computeAccess>>;
  metrics: ReturnType<typeof computeMetrics>;
  monthlyIncome: number; portfolio: number;
  ar: boolean; L: (a: string, e: string) => string; money: (n: number) => string;
}) {
  const dbr = metrics.dbr ?? 0;
  const nonMortgageDbr = metrics.nonMortgageDbr ?? 0;

  return (
    <div className="mb-5">
      <div className="font-serif text-lg font-medium text-[var(--ink)] mb-1">{L('ما الذي يمكنك الوصول إليه', 'What you could access')}</div>
      <div className="text-sm text-[var(--ink-2)] mb-3">
        {L('تقديرات تعليمية وفق حدود ساما لنسبة الاستقطاع، لا وعد بالموافقة.', "Educational estimates against SAMA's deduction-ratio caps — not a promise of approval.")}
      </div>

      {/* DBR gauges */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-3">
        <div className="text-[11px] tracking-[0.08em] uppercase text-[var(--muted)] mb-3">{L('نسبة عبء الدَّين (DBR)', 'Debt Burden Ratio (DBR)')}</div>
        <DbrBar label={L('غير العقاري', 'Non-mortgage')} value={nonMortgageDbr} cap={DBR_NON_MORTGAGE_CAP} L={L} />
        <div className="h-3" />
        <DbrBar label={L('الإجمالي (شامل العقار)', 'Total (incl. mortgage)')} value={dbr} cap={DBR_TOTAL_CAP} L={L} />
      </div>

      {!access.eligible ? (
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 text-sm text-[var(--ink-2)] leading-relaxed">
          {L(
            'عند درجتك الحالية، المساحة لائتمان جديد محدودة. ركّز على رفع الدرجة أولاً — انتظام السداد وخفض استخدام البطاقات — ثم تتّسع الخيارات.',
            'At your current score, room for new credit is limited. Focus on lifting the score first — on-time payments and lower card usage — and the options widen.'
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="bg-[var(--surface-card)] border border-[var(--green-border)] rounded-2xl p-5">
            <div className="text-[11px] tracking-[0.08em] uppercase text-[var(--muted)] mb-2">{L('قرض شخصي (تقديري)', 'Personal loan (est.)')}</div>
            <div className="font-serif text-xl font-bold text-[var(--green-dark)] mb-1">{money(access.personalLoanPrincipal)}</div>
            <div className="text-[11px] text-[var(--ink-2)] leading-relaxed">
              {L(
                `تحت سقف 33% يبقى نحو ${money(access.personalLoanMonthlyRoom)}/شهر — يدعم هذا المبلغ تقريباً على 60 شهراً.`,
                `Under the 33% cap, about ${money(access.personalLoanMonthlyRoom)}/month is free — roughly this principal over 60 months.`
              )}
            </div>
          </div>
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5">
            <div className="text-[11px] tracking-[0.08em] uppercase text-[var(--muted)] mb-2">{L('حدود البطاقات (تقديري)', 'Card limits (est.)')}</div>
            <div className="font-serif text-xl font-bold text-[var(--ink)] mb-1">{money(access.cardHeadroom)}</div>
            <div className="text-[11px] text-[var(--ink-2)] leading-relaxed">
              {access.cardHeadroomExtra > 0
                ? L(`أي نحو ${money(access.cardHeadroomExtra)} فوق حدودك الحالية، حسب فئة درجتك.`, `About ${money(access.cardHeadroomExtra)} above your current limits, given your band.`)
                : L('أنت قرب سقف بطاقاتك المعتاد لفئتك.', "You're near the usual card ceiling for your band.")}
            </div>
          </div>
          <div className="bg-[var(--surface-card)] border border-[var(--amber-2)] rounded-2xl p-5">
            <div className="text-[11px] tracking-[0.08em] uppercase text-[var(--muted)] mb-2">{L('هامش/رافعة (توضيحي)', 'Margin / leverage (illustrative)')}</div>
            <div className="font-serif text-lg font-bold text-[var(--ink)] mb-1">{money(access.marginLow)} – {money(access.marginHigh)}</div>
            <div className="text-[11px] text-[var(--ink-2)] leading-relaxed">
              {portfolio > 0
                ? L('نطاق تقريبي 0.5×–1× من محفظتك القابلة للتداول للمستثمرين المؤهّلين. رافعة ترفع المخاطر.', 'A rough 0.5×–1× of your marketable portfolio for qualified investors. Leverage raises risk.')
                : L('سجّل قيمة محفظتك الاستثمارية لتقدير نطاق الهامش.', 'Log your investment portfolio value to estimate a margin range.')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DbrBar({ label, value, cap, L }: { label: string; value: number; cap: number; L: (a: string, e: string) => string }) {
  const over = value > cap;
  const pct = Math.min(100, (value / cap) * 100);
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-xs text-[var(--ink-2)]">{label}</span>
        <span className={`text-xs font-semibold ${over ? 'text-[var(--red-dark-text)]' : 'text-[var(--ink)]'}`}>{value.toFixed(0)}% <span className="text-[var(--muted)] font-normal">/ {cap}%</span></span>
      </div>
      <div className="h-2.5 bg-[var(--surface-1)] rounded-full overflow-hidden relative">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: over ? 'var(--red)' : value > cap * 0.8 ? 'var(--gold-2)' : 'var(--green)' }} />
      </div>
      {over && <div className="text-[10px] text-[var(--red-dark-text)] mt-1">{L('تجاوزت السقف — لا مساحة لالتزام جديد.', 'Over the cap — no room for new obligations.')}</div>}
    </div>
  );
}

// ── Report editor (paste + guided) ──────────────────────────────────────────
function ReportEditor(props: {
  ar: boolean; L: (a: string, e: string) => string;
  reportDate: string; setReportDate: (v: string) => void;
  molimScore: string; setMolimScore: (v: string) => void;
  firstAccount: string; setFirstAccount: (v: string) => void;
  numDefaulted: string; setNumDefaulted: (v: string) => void;
  totalDefaulted: string; setTotalDefaulted: (v: string) => void;
  numInquiries: string; setNumInquiries: (v: string) => void;
  bounced: string; setBounced: (v: string) => void;
  editAccounts: ReturnType<typeof blankAccount>[]; setEditAccounts: (v: ReturnType<typeof blankAccount>[]) => void;
  pasteText: string; setPasteText: (v: string) => void;
  pasteMsg: string | null; showPaste: boolean; setShowPaste: (v: boolean) => void;
  onApplyPaste: () => void; onSave: () => void; onCancel: () => void;
}) {
  const { ar, L } = props;
  const locale = ar ? 'ar' : 'en';
  const inputCls = 'w-full bg-[var(--surface-0)] border border-[var(--border-default)] rounded-lg px-2.5 py-1.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--green)]';
  const labelCls = 'text-[11px] text-[var(--muted)] block mb-1';

  const setAcc = (i: number, patch: Partial<ReturnType<typeof blankAccount>>) =>
    props.setEditAccounts(props.editAccounts.map((a, j) => j === i ? { ...a, ...patch } : a));

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="font-serif text-lg font-semibold text-[var(--ink)]">{L('سجّل تقرير سِمة', 'Record a SIMAH report')}</div>
        <button onClick={() => props.setShowPaste(!props.showPaste)} className="text-xs font-medium text-[var(--green-dark)]">
          {props.showPaste ? L('▾ إخفاء اللصق', '▾ Hide paste') : L('▸ لصق نصّ التقرير', '▸ Paste report text')}
        </button>
      </div>

      {props.showPaste && (
        <div className="mb-4">
          <textarea
            value={props.pasteText}
            onChange={(e) => props.setPasteText(e.target.value)}
            rows={4}
            placeholder={L('الصق نصّ تقرير سِمة هنا وسنملأ الحقول تلقائياً…', "Paste your SIMAH report text here and we'll prefill the fields…")}
            className="w-full bg-[var(--surface-0)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--ink)] outline-none focus:border-[var(--green)]"
            dir="ltr"
          />
          <div className="flex items-center gap-3 mt-2">
            <button onClick={props.onApplyPaste} className="text-xs font-medium text-white bg-[var(--green-dark)] rounded-lg px-3 py-1.5">{L('استخرج الحقول', 'Extract fields')}</button>
            {props.pasteMsg && <span className="text-xs text-[var(--ink-2)]">{props.pasteMsg}</span>}
          </div>
        </div>
      )}

      {/* snapshot fields */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div><label className={labelCls}>{L('تاريخ التقرير', 'Report date')}</label><input type="date" value={props.reportDate} onChange={(e) => props.setReportDate(e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>{L('درجة مولِم (اختياري)', 'MOLIM score (optional)')}</label><input type="number" min={300} max={900} value={props.molimScore} onChange={(e) => props.setMolimScore(e.target.value)} placeholder="300–900" className={inputCls} /></div>
        <div><label className={labelCls}>{L('تاريخ أوّل حساب', 'First account date')}</label><input type="date" value={props.firstAccount} onChange={(e) => props.setFirstAccount(e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>{L('استعلامات حديثة', 'Recent enquiries')}</label><input type="number" min={0} value={props.numInquiries} onChange={(e) => props.setNumInquiries(e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>{L('منتجات متعثّرة', 'Defaulted products')}</label><input type="number" min={0} value={props.numDefaulted} onChange={(e) => props.setNumDefaulted(e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>{L('رصيد التعثّر', 'Defaulted balance')}</label><input type="number" min={0} value={props.totalDefaulted} onChange={(e) => props.setTotalDefaulted(e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>{L('شيكات مرتجعة', 'Bounced cheques')}</label><input type="number" min={0} value={props.bounced} onChange={(e) => props.setBounced(e.target.value)} className={inputCls} /></div>
      </div>

      {/* accounts editor */}
      <div className="text-[11px] tracking-[0.08em] uppercase text-[var(--muted)] mb-2">{L('المنتجات الائتمانية', 'Credit products')}</div>
      <div className="flex flex-col gap-2 mb-3">
        {props.editAccounts.map((a, i) => (
          <div key={i} className="grid grid-cols-2 sm:grid-cols-[1.4fr_1.2fr_1fr_1fr_1fr_auto] gap-2 items-end bg-[var(--surface-1)] rounded-lg p-2.5">
            <div>
              <label className={labelCls}>{L('النوع', 'Type')}</label>
              <select value={a.product_type} onChange={(e) => setAcc(i, { product_type: e.target.value as ProductType })} className={inputCls}>
                {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{productLabel(t, locale)}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>{L('الجهة', 'Creditor')}</label><input value={a.creditor ?? ''} onChange={(e) => setAcc(i, { creditor: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>{L('الحد', 'Limit')}</label><input type="number" value={a.credit_limit || ''} onChange={(e) => setAcc(i, { credit_limit: parseFloat(e.target.value) || 0 })} className={inputCls} /></div>
            <div><label className={labelCls}>{L('الرصيد', 'Balance')}</label><input type="number" value={a.outstanding || ''} onChange={(e) => setAcc(i, { outstanding: parseFloat(e.target.value) || 0 })} className={inputCls} /></div>
            <div><label className={labelCls}>{L('القسط', 'Installment')}</label><input type="number" value={a.installment || ''} onChange={(e) => setAcc(i, { installment: parseFloat(e.target.value) || 0 })} className={inputCls} /></div>
            <button onClick={() => props.setEditAccounts(props.editAccounts.filter((_, j) => j !== i))} className="text-[var(--muted)] hover:text-[var(--red-dark-text)] pb-2 text-sm">✕</button>
          </div>
        ))}
      </div>
      <button onClick={() => props.setEditAccounts([...props.editAccounts, blankAccount()])} className="text-xs font-medium text-[var(--green-dark)] mb-4">
        {L('+ أضِف منتجاً', '+ Add a product')}
      </button>

      <div className="flex gap-2 pt-2 border-t border-[var(--border-default)]">
        <button onClick={props.onSave} className="text-sm bg-[var(--green-dark)] text-white rounded-lg px-4 py-2 font-medium">{L('حفظ التقرير', 'Save report')}</button>
        <button onClick={props.onCancel} className="text-sm text-[var(--muted)] px-4 py-2">{L('إلغاء', 'Cancel')}</button>
      </div>
    </div>
  );
}
