'use client';

// "What if" — the imagination sandbox under Think. Start from your real
// baseline (pulled from your data), stack "moves" onto it (a raise, a
// house, investing monthly, a windfall, a career break), and watch the
// trajectory diverge from the life you're currently on. Deterministic
// insights analyze the imagination; the AI analyst goes deeper.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import {
  MOVE_META, moveLabel, moveHint, runWhatIf, analyzeWhatIf, describeScenario,
  type Move, type MoveType, type WhatIfBaseline,
} from '@/lib/whatIf';

function fmt(n: number) {
  return Math.round(n).toLocaleString();
}

function fmtCompact(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${Math.round(n / 1e3)}K`;
  return String(Math.round(n));
}

interface SavedScenario {
  id: string;
  name: string;
  params: { baseline: WhatIfBaseline; moves: Move[] };
}

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const TONE_STYLE = {
  good: 'border-[var(--green-border)] bg-[var(--green-bg)] text-[var(--green-dark)]',
  warn: 'border-[#E5A0AC] bg-[#FBE9EC] text-[#A32D2D]',
  neutral: 'border-[var(--border-default)] bg-[var(--surface-1)] text-[var(--ink-2)]',
} as const;

export default function WhatIfPage() {
  const router = useRouter();
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const money = (n: number) => (ar ? `${fmt(n)} ريال` : `SAR ${fmt(n)}`);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();

  // baseline (strings for editability)
  const [startCash, setStartCash] = useState('50000');
  const [startInvested, setStartInvested] = useState('100000');
  const [income, setIncome] = useState('20000');
  const [expenses, setExpenses] = useState('14000');
  const [returnPct, setReturnPct] = useState('8');
  const [years, setYears] = useState(15);

  // moves
  const [moves, setMoves] = useState<Move[]>([]);
  const [mvType, setMvType] = useState<MoveType>('monthly_invest');
  const [mvLabel, setMvLabel] = useState('');
  const [mvAmount, setMvAmount] = useState('');
  const [mvYear, setMvYear] = useState('0');

  // saved scenarios
  const [saved, setSaved] = useState<SavedScenario[]>([]);
  const [scenarioName, setScenarioName] = useState('');
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // AI analyst
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  const loadSaved = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('what_if_scenarios')
      .select('id, name, params')
      .eq('user_id', uid)
      .order('created_at', { ascending: true });
    if (data) setSaved(data as unknown as SavedScenario[]);
  }, [supabase]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);

      const [{ data: profile }, { data: snaps }, { data: invest }] = await Promise.all([
        supabase.from('profiles').select('monthly_income, side_income, monthly_expense, liquid_savings').eq('id', user.id).single(),
        supabase.from('financial_snapshots').select('year, month, cash, stocks, equity, expenses').eq('user_id', user.id).order('year', { ascending: true }).order('month', { ascending: true }),
        supabase.from('investment_settings').select('expected_roi').eq('user_id', user.id).maybeSingle(),
      ]);

      const latest = snaps && snaps.length > 0 ? snaps[snaps.length - 1] : null;
      const cash = latest ? Number(latest.cash) : profile?.liquid_savings != null ? Number(profile.liquid_savings) : 50000;
      const invested = latest ? Number(latest.stocks) + Number(latest.equity) : 0;
      const inc = (Number(profile?.monthly_income) || 0) + (Number(profile?.side_income) || 0);
      const exp = latest?.expenses != null ? Number(latest.expenses) : Number(profile?.monthly_expense) || 0;

      if (cash) setStartCash(String(Math.round(cash)));
      setStartInvested(String(Math.round(invested)));
      if (inc) setIncome(String(Math.round(inc)));
      if (exp) setExpenses(String(Math.round(exp)));
      if (invest?.expected_roi != null) setReturnPct(String(invest.expected_roi));

      await loadSaved(user.id);
      setLoading(false);
    })();
  }, [supabase, router, loadSaved]);

  const num = (s: string) => parseFloat(String(s).replace(/[^0-9.-]/g, '')) || 0;

  const baseline: WhatIfBaseline = useMemo(
    () => ({
      startCash: num(startCash),
      startInvested: num(startInvested),
      monthlyIncome: num(income),
      monthlyExpenses: num(expenses),
      annualReturnPct: num(returnPct) || 0,
      years,
    }),
    [startCash, startInvested, income, expenses, returnPct, years]
  );

  const result = useMemo(() => runWhatIf(baseline, moves, currentYear), [baseline, moves, currentYear]);
  const insights = useMemo(() => analyzeWhatIf(baseline, moves, result, locale), [baseline, moves, result, locale]);

  function addMove() {
    const amount = num(mvAmount);
    if (!amount) return;
    setMoves((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: mvType,
        label: mvLabel.trim() || moveLabel(mvType, locale),
        amount,
        atYear: Math.max(0, Math.min(years, parseInt(mvYear) || 0)),
      },
    ]);
    setMvLabel('');
    setMvAmount('');
  }

  async function saveScenario() {
    if (!userId || !scenarioName.trim()) return;
    await supabase.from('what_if_scenarios').insert({
      user_id: userId,
      name: scenarioName.trim(),
      params: { baseline, moves },
    });
    setScenarioName('');
    setSaveMsg(L('حُفظ.', 'Saved.'));
    setTimeout(() => setSaveMsg(null), 2000);
    loadSaved(userId);
  }

  function loadScenario(s: SavedScenario) {
    const b = s.params.baseline;
    setStartCash(String(b.startCash));
    setStartInvested(String(b.startInvested));
    setIncome(String(b.monthlyIncome));
    setExpenses(String(b.monthlyExpenses));
    setReturnPct(String(b.annualReturnPct));
    setYears(b.years);
    setMoves(s.params.moves ?? []);
  }

  async function deleteScenario(id: string) {
    if (!userId) return;
    await supabase.from('what_if_scenarios').delete().eq('id', id);
    loadSaved(userId);
  }

  async function askAnalyst(text: string, fresh: boolean) {
    const summary = describeScenario(baseline, moves, result, currentYear);
    const next: ChatMessage[] = fresh
      ? [{ role: 'user', content: L('حلّل هذا السيناريو المتخيَّل: ماذا يربح، وماذا يكلّف، وما الأرجح أن يكسره؟', 'Analyze this imagined scenario: what does it win, what does it cost, and what is most likely to break it?') }]
      : [...messages, { role: 'user', content: text }];
    setMessages(next);
    setChatInput('');
    setAiOpen(true);
    setAiLoading(true);
    try {
      const res = await fetch('/api/what-if-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioSummary: summary, messages: next, locale }),
      });
      const data = await res.json();
      setMessages([...next, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages([...next, { role: 'assistant', content: L('حدث خطأ في الوصول إلى المحلّل. يُرجى المحاولة مرة أخرى.', 'Something went wrong reaching the analyst. Please try again.') }]);
    }
    setAiLoading(false);
  }

  if (loading) {
    return <div className="text-sm text-[var(--muted)]">{L('جارٍ تجهيز صندوق تجاربك…', 'Preparing your sandbox…')}</div>;
  }

  return (
    <div>
      <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--blue)] font-semibold mb-1">{L('فكّر', 'Think')}</div>
      <h1 className="font-serif text-2xl font-semibold text-[var(--ink)] mb-1">{L('ماذا لو', 'What if')}</h1>
      <p className="text-sm text-[var(--ink-2)] mb-6 max-w-xl">
        {L(
          `صندوق تجارب للخيال المالي. أرقامك الحقيقية هي نقطة الانطلاق — كدّس خطوات فوقها (علاوة، منزل، انقطاع مهني، استثمار جادّ) وشاهِد السنوات الـ${years} القادمة تنحرف عن الحياة التي أنت عليها الآن. لا شيء هنا يغيّر بياناتك الحقيقية.`,
          `A sandbox for financial imagination. Your real numbers are the starting point — stack moves on top (a raise, a house, a career break, investing seriously) and watch the next ${years} years diverge from the life you're currently on. Nothing here changes your real data.`
        )}
      </p>

      {/* baseline */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-5">
        <div className="text-[11px] tracking-[0.1em] uppercase text-[var(--muted)] mb-3">
          {L('نقطة انطلاقك — معبّأة مسبقاً من بياناتك، عدّلها بحرّية', 'Your starting point — prefilled from your data, edit freely')}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
          <Field label={L('النقد (ريال)', 'Cash (SAR)')} value={startCash} onChange={setStartCash} />
          <Field label={L('المستثمَر (ريال)', 'Invested (SAR)')} value={startInvested} onChange={setStartInvested} />
          <Field label={L('الدخل/شهر (ريال)', 'Income /mo (SAR)')} value={income} onChange={setIncome} />
          <Field label={L('الإنفاق/شهر (ريال)', 'Spending /mo (SAR)')} value={expenses} onChange={setExpenses} />
          <Field label={L('العائد (%/سنة)', 'Return (%/yr)')} value={returnPct} onChange={setReturnPct} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--muted)] whitespace-nowrap">{L(`الأفق: ${years} سنة`, `Horizon: ${years} years`)}</span>
          <input type="range" min={5} max={40} value={years} onChange={(e) => setYears(parseInt(e.target.value))} className="flex-1 accent-[var(--green-dark)]" />
        </div>
        <p className="text-[11px] text-[var(--muted)] mt-2">
          {L(
            'يحاكي الصندوق المال الذي تحرّكه قراراتك — النقد والاستثمارات. العقار والأصول الثابتة الأخرى خارجه.',
            'The sandbox models the money your decisions move — cash and investments. Property and other static assets sit outside it.'
          )}
        </p>
      </div>

      {/* moves builder */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-5">
        <div className="text-[11px] tracking-[0.1em] uppercase text-[var(--muted)] mb-3">{L('تخيّل خطوة', 'Imagine a move')}</div>
        <div className="flex flex-wrap items-end gap-2 mb-1">
          <div>
            <label className="text-[11px] text-[var(--muted)] block mb-1">{L('ماذا يحدث', 'What happens')}</label>
            <select
              value={mvType}
              onChange={(e) => setMvType(e.target.value as MoveType)}
              className="bg-[var(--surface-1)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--ink)] outline-none"
            >
              {(Object.keys(MOVE_META) as MoveType[]).map((t) => (
                <option key={t} value={t}>{moveLabel(t, locale)}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[130px]">
            <label className="text-[11px] text-[var(--muted)] block mb-1">{L('سمِّها (اختياري)', 'Call it (optional)')}</label>
            <input
              value={mvLabel}
              onChange={(e) => setMvLabel(e.target.value)}
              placeholder={L('مثال: «شراء الفيلا»', 'e.g. "Buy the villa"')}
              className="w-full bg-[var(--surface-1)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--green)]"
            />
          </div>
          <div>
            <label className="text-[11px] text-[var(--muted)] block mb-1">
              {MOVE_META[mvType].recurring ? L('ريال / شهر', 'SAR / month') : L('ريال (مرّة)', 'SAR (once)')}
            </label>
            <input
              value={mvAmount}
              onChange={(e) => setMvAmount(e.target.value)}
              placeholder={MOVE_META[mvType].recurring ? '3,000' : '300,000'}
              className="w-28 bg-[var(--surface-1)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--green)]"
            />
          </div>
          <div>
            <label className="text-[11px] text-[var(--muted)] block mb-1">{L('في سنة', 'In year')}</label>
            <select
              value={mvYear}
              onChange={(e) => setMvYear(e.target.value)}
              className="bg-[var(--surface-1)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--ink)] outline-none"
            >
              {Array.from({ length: years + 1 }, (_, i) => (
                <option key={i} value={i}>{currentYear + i}{i === 0 ? L(' (الآن)', ' (now)') : ''}</option>
              ))}
            </select>
          </div>
          <button onClick={addMove} className="text-sm bg-[var(--green-dark)] text-white rounded-lg px-4 py-2 font-medium">
            {L('أضِف إلى التخيّل', 'Add to the imagination')}
          </button>
        </div>
        <p className="text-[11px] text-[var(--muted)] mb-3">{moveHint(mvType, locale)}</p>

        {moves.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {moves.map((m) => (
              <span key={m.id} className="flex items-center gap-2 text-xs bg-[var(--surface-1)] border border-[var(--border-default)] rounded-full px-3 py-1.5 text-[var(--ink-2)]">
                <span className="font-medium text-[var(--ink)]">{m.label}</span>
                {m.type === 'one_off_cost' ? `−${money(m.amount)}` : m.type === 'windfall' ? `+${money(m.amount)}` : `${money(m.amount)}${L('/شهر', '/mo')}`}
                · {currentYear + m.atYear}
                <button onClick={() => setMoves((prev) => prev.filter((x) => x.id !== m.id))} className="text-[var(--muted)] hover:text-[#C0504D]">✕</button>
              </span>
            ))}
            <button onClick={() => setMoves([])} className="text-[11px] text-[var(--muted)] hover:text-[#C0504D] px-2">
              {L('مسح الكل', 'clear all')}
            </button>
          </div>
        )}
      </div>

      {/* trajectory chart */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-5">
        <div className="text-sm font-medium text-[var(--ink)] mb-1">{L('مستقبلان، جنباً إلى جنب', 'Two futures, side by side')}</div>
        <div className="text-xs text-[var(--muted)] mb-3">
          {L(
            'الخطّ الرمادي هو حياتك دون تغيير. والأخضر هو التخيّل. والمتقطّع هو النقد داخله — راقِبه: حين يهبط منخفضاً، تحتاج الخطة إلى تمويل.',
            'The grey line is your life unchanged. The green line is the imagination. The dashed line is the cash inside it — watch it: when it dips low, the plan needs financing.'
          )}
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={result.points}>
              <CartesianGrid stroke="var(--border-default)" />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'var(--muted)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} tickFormatter={(v) => fmtCompact(Number(v))} />
              <Tooltip formatter={(v, name) => [money(Number(v)), String(name)]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="baseline" name={L('خطّ الأساس (دون تغيير)', 'Baseline (unchanged)')} stroke="#8a99a8" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="scenario" name={L('التخيّل', 'The imagination')} stroke="#1D9E75" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="scenarioCash" name={L('النقد داخله', 'Cash inside it')} stroke="#D89A3E" strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* insights */}
      <div className="flex flex-col gap-2 mb-5">
        {insights.map((ins, i) => (
          <div key={i} className={`text-xs leading-relaxed border rounded-xl px-4 py-3 ${TONE_STYLE[ins.tone]}`}>
            {ins.text}
          </div>
        ))}
      </div>

      {/* AI analyst */}
      {!aiOpen ? (
        <button
          onClick={() => askAnalyst('', true)}
          className="w-full bg-[var(--surface-card)] border-[1.5px] border-dashed border-[var(--green-border)] rounded-2xl p-5 mb-5 text-center hover:border-[var(--green)] hover:bg-[var(--green-bg)] transition-colors"
        >
          <div className="font-serif text-base font-semibold text-[var(--ink)] mb-1">{L('اعرِضه على المحلّل', 'Put it in front of the analyst')}</div>
          <div className="text-xs text-[var(--ink-2)]">{L('ماذا يربح هذا التخيّل، وماذا يكلّف، وما الذي يكسره؟', 'What does this imagination win, what does it cost, and what breaks it?')}</div>
        </button>
      ) : (
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl overflow-hidden mb-5">
          <div className="px-5 py-3 border-b border-[var(--border-default)] bg-[var(--surface-1)] text-xs font-semibold text-[var(--ink)]">
            {L('المحلّل، حول هذا السيناريو', 'The analyst, on this scenario')}
          </div>
          <div className="p-5 flex flex-col gap-4 max-h-[420px] overflow-y-auto">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${m.role === 'user' ? 'bg-[var(--surface-1)] text-[var(--ink-2)]' : 'bg-[var(--green-dark)] text-[var(--gold)] font-serif'}`}>
                  {m.role === 'user' ? L('أنت', 'You') : 'M'}
                </div>
                <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap ${m.role === 'user' ? 'bg-[var(--green-dark)] text-white rounded-tr-sm' : 'bg-[var(--surface-1)] text-[var(--ink-2)] rounded-tl-sm'}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {aiLoading && <div className="text-xs text-[var(--muted)]">{L('يفكّر في السيناريو…', 'Reasoning over the scenario…')}</div>}
          </div>
          <div className="flex items-center gap-2 px-4 py-3 border-t border-[var(--border-default)] bg-[var(--surface-1)]">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && chatInput.trim()) askAnalyst(chatInput, false); }}
              placeholder={L('اسأل سؤالاً متابِعاً عن هذا السيناريو…', 'Ask a follow-up about this scenario…')}
              className="flex-1 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-full px-4 py-2 text-xs text-[var(--ink)] outline-none focus:border-[var(--green)]"
            />
            <button
              onClick={() => chatInput.trim() && askAnalyst(chatInput, false)}
              disabled={aiLoading}
              className="w-9 h-9 rounded-full bg-[var(--green-dark)] text-white flex items-center justify-center disabled:opacity-50"
            >
              ↑
            </button>
          </div>
        </div>
      )}

      {/* save / load */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5">
        <div className="text-[11px] tracking-[0.1em] uppercase text-[var(--muted)] mb-3">{L('احتفظ بهذا التخيّل', 'Keep this imagination')}</div>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <input
            value={scenarioName}
            onChange={(e) => setScenarioName(e.target.value)}
            placeholder={L('سمِّه — «خطة الفيلا»، «الاستقالة والعمل الحر»…', 'Name it — "The villa plan", "Quit & freelance"…')}
            className="flex-1 min-w-[180px] bg-[var(--surface-1)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--green)]"
          />
          <button onClick={saveScenario} className="text-sm bg-[var(--green-dark)] text-white rounded-lg px-4 py-2 font-medium">
            {L('حفظ السيناريو', 'Save scenario')}
          </button>
          {saveMsg && <span className="text-xs text-[var(--green)]">{saveMsg}</span>}
        </div>
        {saved.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {saved.map((s) => (
              <span key={s.id} className="flex items-center gap-2 text-xs bg-[var(--surface-1)] border border-[var(--border-default)] rounded-full px-3 py-1.5 text-[var(--ink-2)]">
                <button onClick={() => loadScenario(s)} className="font-medium text-[var(--green-dark)] hover:underline">{s.name}</button>
                <button onClick={() => deleteScenario(s.id)} className="text-[var(--muted)] hover:text-[#C0504D]">✕</button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[11px] text-[var(--muted)] block mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[var(--surface-1)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--green)]"
      />
    </div>
  );
}
