'use client';

// Feature: "the stack" - what a person's pile of subscriptions and
// recurring bills really costs. Shows the monthly stack, the yearly
// run-rate, the estimated lifetime paid per subscription (from its start
// date), a per-item breakdown, and a cumulative "snowball" curve that
// makes visible how small amounts compound into real money over years.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';

interface Sub {
  id: string;
  name: string;
  amount: number;
  billing_cycle: 'monthly' | 'annual';
  started_on: string | null;
  category: string | null;
  created_at: string;
}

function fmt(n: number) {
  return Math.round(n).toLocaleString();
}

function monthsBetween(from: Date, to: Date): number {
  return Math.max(0, (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()));
}

export default function SubscriptionStack({ version }: { version: number }) {
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const money = (n: number) => (ar ? `${fmt(n)} ريال` : `SAR ${fmt(n)}`);
  const MN = useMemo(
    () => Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat(ar ? 'ar' : 'en', { month: 'short' }).format(new Date(2020, i, 1))),
    [ar]
  );
  const [subs, setSubs] = useState<Sub[]>([]);

  const load = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('subscriptions')
      .select('id, name, amount, billing_cycle, started_on, category, created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: true });
    if (data) setSubs(data as unknown as Sub[]);
  }, [supabase]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      load(user.id);
    })();
  }, [supabase, load, version]);

  const now = useMemo(() => new Date(), []);

  const enriched = useMemo(() => {
    return subs.map((s) => {
      const amount = Number(s.amount) || 0;
      const monthlyEq = s.billing_cycle === 'annual' ? amount / 12 : amount;
      const start = s.started_on ? new Date(s.started_on) : new Date(s.created_at);
      const months = monthsBetween(start, now) + 1; // count the first payment
      const lifetime = s.billing_cycle === 'annual'
        ? (Math.floor((months - 1) / 12) + 1) * amount
        : months * amount;
      return { ...s, amount, monthlyEq, start, months, lifetime };
    });
  }, [subs, now]);

  const totals = useMemo(() => {
    const monthly = enriched.reduce((s, e) => s + e.monthlyEq, 0);
    const lifetime = enriched.reduce((s, e) => s + e.lifetime, 0);
    return { monthly, yearly: monthly * 12, lifetime, daily: monthly / 30.4 };
  }, [enriched]);

  // Cumulative snowball: total paid across the whole stack, month by month.
  const snowball = useMemo(() => {
    if (enriched.length === 0) return [];
    const earliest = enriched.reduce((min, e) => (e.start < min ? e.start : min), enriched[0].start);
    const points: { label: string; cumulative: number }[] = [];
    let cumulative = 0;
    const cursor = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    let guard = 0;
    while (cursor <= end && guard++ < 600) {
      for (const e of enriched) {
        const es = new Date(e.start.getFullYear(), e.start.getMonth(), 1);
        if (es <= cursor) cumulative += e.monthlyEq;
      }
      points.push({ label: `${MN[cursor.getMonth()]} ${String(cursor.getFullYear()).slice(2)}`, cumulative: Math.round(cumulative) });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return points;
  }, [enriched, now, MN]);

  const categories = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of enriched) {
      const c = (e.category || '').trim();
      if (!c) continue;
      m.set(c, (m.get(c) ?? 0) + e.monthlyEq);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [enriched]);

  if (enriched.length === 0) return null;

  const maxMonthly = Math.max(...enriched.map((e) => e.monthlyEq), 1);
  const sorted = [...enriched].sort((a, b) => b.monthlyEq - a.monthlyEq);

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
      <div className="flex items-center gap-2.5 mb-1">
        <span className="text-lg">🧱</span>
        <h2 className="font-serif text-lg font-semibold text-[var(--ink)]">{L('مكدّسك', 'Your stack')}</h2>
      </div>
      <p className="text-xs text-[var(--muted)] mb-4 max-w-xl">
        {L(
          'يتحوّل الاقتصاد إلى الاشتراكات — وكلٌّ منها يبدو ضئيلاً. لكن مكدّسة معاً وممتدّة عبر السنوات التي احتفظت بها، ليست ضئيلة. هذا مكدّسك، مقيساً بصدق.',
          "The economy is shifting to subscriptions — and each one feels tiny. Stacked together and stretched over the years you've held them, they're not tiny. This is your stack, honestly measured."
        )}
      </p>

      {/* headline tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-[var(--surface-1)] border border-[var(--border-default)] rounded-xl p-3">
          <div className="text-[10px] text-[var(--muted)] mb-1">{L('المكدّس شهرياً', 'The stack, per month')}</div>
          <div className="font-serif text-base font-bold text-[var(--ink)]">{money(totals.monthly)}</div>
        </div>
        <div className="bg-[var(--surface-1)] border border-[var(--border-default)] rounded-xl p-3">
          <div className="text-[10px] text-[var(--muted)] mb-1">{L('المعدّل السنوي', 'Yearly run-rate')}</div>
          <div className="font-serif text-base font-bold text-[#E0922A]">{money(totals.yearly)}</div>
        </div>
        <div className="bg-[var(--surface-1)] border border-[var(--border-default)] rounded-xl p-3">
          <div className="text-[10px] text-[var(--muted)] mb-1">{L('المدفوع مدى الحياة (تقديري)', 'Paid over their lifetimes (est.)')}</div>
          <div className="font-serif text-base font-bold text-[#E0559E]">{money(totals.lifetime)}</div>
        </div>
        <div className="bg-[var(--surface-1)] border border-[var(--border-default)] rounded-xl p-3">
          <div className="text-[10px] text-[var(--muted)] mb-1">{L('الاشتراكات النشطة', 'Active subscriptions')}</div>
          <div className="font-serif text-base font-bold text-[var(--ink)]">{enriched.length} · {ar ? `${totals.daily.toFixed(1)} ريال` : `SAR ${totals.daily.toFixed(1)}`}{L('/يوم', '/day')}</div>
        </div>
      </div>

      {/* per-sub breakdown bars */}
      <div className="text-[11px] tracking-[0.08em] uppercase text-[var(--muted)] mb-2">{L('التفصيل', 'The breakdown')}</div>
      <div className="flex flex-col gap-2 mb-5">
        {sorted.map((e) => (
          <div key={e.id} className="grid grid-cols-[110px_1fr_auto] gap-3 items-center">
            <div className="text-xs text-[var(--ink)] font-medium truncate" title={e.name}>{e.name}</div>
            <div className="h-5 bg-[var(--surface-1)] rounded overflow-hidden">
              <div
                className="h-full rounded bg-[#17B8C9] flex items-center ps-2 text-[10px] text-white font-medium whitespace-nowrap"
                style={{ width: `${Math.max((e.monthlyEq / maxMonthly) * 100, 4)}%` }}
              >
                {(e.monthlyEq / maxMonthly) * 100 > 25 ? `${money(e.monthlyEq)}${L('/شهر', '/mo')}` : ''}
              </div>
            </div>
            <div className="text-[10px] text-[var(--muted)] text-end whitespace-nowrap">
              {L('منذ', 'since')} {MN[e.start.getMonth()]} {e.start.getFullYear()} · <span className="text-[#E0559E] font-semibold">{money(e.lifetime)} {L('مدى الحياة', 'lifetime')}</span>
            </div>
          </div>
        ))}
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {categories.map(([c, total]) => (
            <span key={c} className="text-[11px] bg-[var(--surface-1)] border border-[var(--border-default)] rounded-full px-3 py-1 text-[var(--ink-2)]">
              {c} · {money(total)}{L('/شهر', '/mo')}
            </span>
          ))}
        </div>
      )}

      {/* the snowball */}
      {snowball.length >= 2 && (
        <>
          <div className="text-[11px] tracking-[0.08em] uppercase text-[var(--muted)] mb-2">
            {L('كرة الثلج — كل ما كلّفك إياه المكدّس، تراكمياً', 'The snowball — everything the stack has cost you, cumulatively')}
          </div>
          <div className="h-52 mb-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={snowball}>
                <CartesianGrid stroke="var(--border-default)" />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--muted)' }} interval={Math.max(0, Math.floor(snowball.length / 10) - 1)} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} tickFormatter={(v) => `${fmt(Number(v))}`} />
                <Tooltip formatter={(v) => [money(Number(v)), L('المدفوع حتى الآن', 'Paid so far')]} />
                <Area type="monotone" dataKey="cumulative" stroke="#E0559E" strokeWidth={2.5} fill="#E0559E" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-[var(--muted)] leading-relaxed max-w-xl">
            {L(
              'لا يعني هذا إلغاء كل شيء — فالاشتراك الذي تستخدمه من أفضل ما تنفق. المقصود أن المنحنى ينحني في اتجاه واحد فقط، فليستحقّ كل لبنة في المكدّس مكانها. أضِف تاريخ بدء لكل اشتراك ليصبح هذا المنحنى دقيقاً.',
              'None of this says cancel everything — a subscription that you use is some of the best money you spend. The point is that the curve only bends one way, so each block in the stack should earn its place. Add a start date to each subscription to make this curve exact.'
            )}
          </p>
        </>
      )}
    </div>
  );
}
