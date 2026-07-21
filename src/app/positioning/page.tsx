'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { firstNameOf } from '@/lib/name';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import UnderstandPositioning from './UnderstandPositioning';

type PageMode = 'log' | 'understand';

interface NetWorthRow {
  year: number;
  amount: number;
}

export default function PositioningPage() {
  const router = useRouter();
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const [rows, setRows] = useState<NetWorthRow[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [newAmount, setNewAmount] = useState('');
  const [mode, setMode] = useState<PageMode>('log');

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single();
    if (profile?.name) setName(firstNameOf(profile.name));

    const { data } = await supabase
      .from('net_worth_snapshots')
      .select('year, amount')
      .eq('user_id', user.id)
      .order('year', { ascending: true });

    if (data) setRows(data as NetWorthRow[]);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function addSnapshot() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const amount = parseFloat(newAmount.replace(/[^0-9.]/g, ''));
    if (!amount) return;

    const { error } = await supabase.from('net_worth_snapshots').upsert(
      { user_id: user.id, year: newYear, amount },
      { onConflict: 'user_id,year' }
    );
    if (!error) {
      setNewAmount('');
      loadData();
    }
  }

  const chartData = rows.map((r) => ({ year: r.year, you: r.amount }));

  if (loading) {
    return <div className="text-sm text-[var(--muted)]">{L('جارٍ تحميل مركزك المالي…', 'Loading your positioning…')}</div>;
  }

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-[var(--ink)] mb-1">
        {L('المركز المالي', 'Financial Positioning')}
      </h1>
      <p className="text-sm text-[var(--ink-2)] mb-6 max-w-xl">
        {L(`سجلّ صافي الثروة الحقيقي ${name ? `لـ${name}` : 'الخاص بك'}، مسجَّلاً بيدك.`, `${name ? `${name}'s` : 'Your'} real net worth history, logged by you.`)}
      </p>

      <div className="inline-flex border border-[var(--border-default)] rounded-lg overflow-hidden mb-6">
        <button
          onClick={() => setMode('log')}
          className={`px-4 py-2 text-xs font-medium ${mode === 'log' ? 'bg-[var(--ink)] text-[var(--surface-0)]' : 'bg-[var(--surface-card)] text-[var(--ink-2)]'}`}
        >
          {L('سجّل صافي ثروتك', 'Log your net worth')}
        </button>
        <button
          onClick={() => setMode('understand')}
          className={`px-4 py-2 text-xs font-medium ${mode === 'understand' ? 'bg-[var(--ink)] text-[var(--surface-0)]' : 'bg-[var(--surface-card)] text-[var(--ink-2)]'}`}
        >
          {L('افهم مركزك', 'Understand your positioning')}
        </button>
      </div>

      {mode === 'understand' && <UnderstandPositioning />}

      {mode === 'log' && (
      <>
      {/* add a real snapshot */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-[var(--muted)] block mb-1">{L('السنة', 'Year')}</label>
          <input
            type="number"
            value={newYear}
            onChange={(e) => setNewYear(parseInt(e.target.value) || newYear)}
            className="w-24 border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-[var(--muted)] block mb-1">
            {L('صافي الثروة (ريال)', 'Net worth (SAR)')}
          </label>
          <input
            type="text"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            placeholder={L('مثال: 250,000', 'e.g. 250,000')}
            className="w-40 border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm outline-none"
          />
        </div>
        <button
          onClick={addSnapshot}
          className="text-sm bg-[var(--green-dark)] text-white rounded-lg px-4 py-2 font-medium"
        >
          {L('حفظ اللقطة', 'Save snapshot')}
        </button>
      </div>

      {chartData.length === 0 ? (
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-8 text-center text-sm text-[var(--muted)]">
          {L('أضِف لقطة صافي ثروة أعلاه لرؤية مخطّط مركزك الحقيقي.', 'Add a net worth snapshot above to see your real positioning chart.')}
        </div>
      ) : (
        <>
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 mb-6">
            <div className="text-sm font-medium text-[var(--ink)] mb-1">
              {L('صافي الثروة عبر الزمن', 'Net worth over time')}
            </div>
            <div className="text-xs text-[var(--muted)] mb-4">
              {L('لقطاتك الحقيقية المسجَّلة', 'Your real logged snapshots')}
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid stroke="var(--chart-grid)" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--muted)' }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--muted)' }}
                    tickFormatter={(v) =>
                      v >= 1000000
                        ? `${(v / 1000000).toFixed(1)}M`
                        : `${Math.round(v / 1000)}K`
                    }
                  />
                  <Tooltip
                    formatter={(value) => (ar ? `${Number(value).toLocaleString()} ريال` : `SAR ${Number(value).toLocaleString()}`)}
                  />
                  <Line
                    type="monotone"
                    dataKey="you"
                    name={L('أنت', 'You')}
                    stroke="var(--green)"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="text-xs text-[var(--muted)]">
            {L('تريد أن ترى كيف يقارَن هذا بالأقران؟ اطّلع على تبويب', 'Want to see how this compares to peers? Check the')}{' '}
            <button onClick={() => setMode('understand')} className="text-[var(--green-dark)] font-medium">
              {L('افهم مركزك', 'Understand your positioning')}
            </button>{' '}
            {L('.', 'tab.')}
          </div>
        </>
      )}
      </>
      )}
    </div>
  );
}
