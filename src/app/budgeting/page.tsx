'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';

interface BudgetItem {
  id: string;
  name: string;
  area: string;
  phase: number;
  cost: number;
  bought: boolean;
}

const AREAS = [
  { id: 'living', name: 'Living room', nameAr: 'غرفة المعيشة', icon: '🛋️' },
  { id: 'kitchen', name: 'Kitchen', nameAr: 'المطبخ', icon: '🍳' },
  { id: 'bedroom', name: 'Bedroom', nameAr: 'غرفة النوم', icon: '🛏️' },
  { id: 'bathroom', name: 'Bathroom', nameAr: 'الحمّام', icon: '🚿' },
  { id: 'entryway', name: 'Entryway', nameAr: 'المدخل', icon: '🚪' },
  { id: 'balcony', name: 'Balcony', nameAr: 'الشرفة', icon: '🌿' },
];

const PHASES = [
  { id: 1, name: 'Phase 1', nameAr: 'المرحلة 1', desc: 'Move-in essentials', descAr: 'أساسيّات الانتقال', color: 'var(--red)' },
  { id: 2, name: 'Phase 2', nameAr: 'المرحلة 2', desc: 'Settling in', descAr: 'الاستقرار', color: 'var(--gold-2)' },
  { id: 3, name: 'Phase 3', nameAr: 'المرحلة 3', desc: 'Nice to have', descAr: 'مستحسَن لا أكثر', color: 'var(--green)' },
];

function fmt(n: number) {
  return Math.round(n).toLocaleString();
}

export default function BudgetingPage() {
  const router = useRouter();
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const money = (n: number) => (ar ? `${fmt(n)} ريال` : `SAR ${fmt(n)}`);
  const areaName = (a: { name: string; nameAr: string }) => (ar ? a.nameAr : a.name);
  const phaseName = (p: { name: string; nameAr: string }) => (ar ? p.nameAr : p.name);
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'area' | 'priority' | 'table'>('area');
  const [newItemName, setNewItemName] = useState('');

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setUserId(user.id);

    const { data } = await supabase
      .from('budget_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (data) setItems(data as BudgetItem[]);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function addItem() {
    if (!userId || !newItemName.trim()) return;
    const { data, error } = await supabase
      .from('budget_items')
      .insert({
        user_id: userId,
        name: newItemName.trim(),
        area: 'living',
        phase: 2,
        cost: 200,
        bought: false,
      })
      .select()
      .single();
    if (!error && data) {
      setItems((prev) => [...prev, data as BudgetItem]);
      setNewItemName('');
    }
  }

  async function updateItem(id: string, patch: Partial<BudgetItem>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    await supabase.from('budget_items').update(patch).eq('id', id);
  }

  async function deleteItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await supabase.from('budget_items').delete().eq('id', id);
  }

  const total = items.reduce((s, i) => s + i.cost, 0);
  const phase1Total = items.filter((i) => i.phase === 1).reduce((s, i) => s + i.cost, 0);
  const bought = items.filter((i) => i.bought).reduce((s, i) => s + i.cost, 0);

  if (loading) {
    return <div className="text-sm text-[var(--muted)]">{L('جارٍ تحميل خطتك…', 'Loading your plan…')}</div>;
  }

  return (
    <div>
      <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--green)] font-semibold mb-1">
        {L('قرّر', 'Decide')}
      </div>
      <h1 className="font-serif text-2xl font-semibold text-[var(--ink)] mb-1">
        {L('الميزنة الديناميكية وترتيب الأولويات', 'Dynamic Budgeting and Prioritization')}
      </h1>
      <p className="text-sm text-[var(--ink-2)] mb-6 max-w-xl">
        {L(
          'كل غرض تحتاجه، حسب الغرفة، أو حسب الإلحاح، أو كقائمة واحدة — قرّر ما تحتاجه فعلاً الآن مقابل لاحقاً.',
          'Every item you need, by room, by urgency, or as one list — decide what you actually need now versus later.'
        )}
      </p>

      {/* metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] rounded-xl p-4 text-white">
          <div className="text-[10px] text-[var(--gold)] mb-1">{L('إن اشتريت كل شيء', 'If buying everything')}</div>
          <div className="font-serif text-lg font-bold">{money(total)}</div>
        </div>
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-4">
          <div className="text-[10px] text-[var(--muted)] mb-1">{L('أساسيّات المرحلة 1', 'Phase 1 essentials')}</div>
          <div className="font-serif text-lg font-bold">{money(phase1Total)}</div>
        </div>
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-4">
          <div className="text-[10px] text-[var(--muted)] mb-1">{L('إجمالي الأغراض', 'Total items')}</div>
          <div className="font-serif text-lg font-bold">{items.length}</div>
        </div>
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-4">
          <div className="text-[10px] text-[var(--muted)] mb-1">{L('مُلتزَم به', 'Committed')}</div>
          <div className="font-serif text-lg font-bold">{money(bought)}</div>
        </div>
      </div>

      {/* add item */}
      <div className="flex gap-2 mb-6">
        <input
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
          placeholder={L('أضِف غرضاً، مثال: أريكة', 'Add an item, e.g. Sofa')}
          className="flex-1 border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm outline-none"
        />
        <button
          onClick={addItem}
          className="text-sm bg-[var(--green-dark)] text-white rounded-lg px-4 py-2 font-medium"
        >
          {L('+ إضافة', '+ Add')}
        </button>
      </div>

      {/* view tabs */}
      <div className="inline-flex gap-1 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-lg p-1 mb-5">
        {(['area', 'priority', 'table'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium ${
              view === v ? 'bg-[var(--ink)] text-[var(--surface-0)]' : 'text-[var(--muted)]'
            }`}
          >
            {v === 'area' ? L('حسب الغرفة', 'By room') : v === 'priority' ? L('حسب الأولوية', 'By priority') : L('كل الأغراض', 'All items')}
          </button>
        ))}
      </div>

      {items.length === 0 && (
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-8 text-center text-sm text-[var(--muted)]">
          {L('أضِف غرضك الأول أعلاه للبدء.', 'Add your first item above to get started.')}
        </div>
      )}

      {view === 'area' && items.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {AREAS.map((area) => {
            const areaItems = items.filter((i) => i.area === area.id);
            const areaTotal = areaItems.reduce((s, i) => s + i.cost, 0);
            return (
              <div key={area.id} className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-[var(--surface-0)] flex justify-between items-center">
                  <span className="text-sm font-semibold">
                    {area.icon} {areaName(area)}
                  </span>
                  <span className="font-serif text-sm font-bold text-[var(--green-dark)]">
                    {money(areaTotal)}
                  </span>
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {areaItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 px-4 py-2 border-t border-[var(--border-faint)] text-sm">
                      <input
                        type="checkbox"
                        checked={item.bought}
                        onChange={(e) => updateItem(item.id, { bought: e.target.checked })}
                      />
                      <span className={`flex-1 ${item.bought ? 'line-through text-[var(--muted)]' : ''}`}>
                        {item.name}
                      </span>
                      <span className="text-xs text-[var(--ink-2)]">{money(item.cost)}</span>
                    </div>
                  ))}
                  {areaItems.length === 0 && (
                    <div className="px-4 py-3 text-xs text-[var(--muted)] italic">{L('لا أغراض بعد', 'No items yet')}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === 'priority' && items.length > 0 && (
        <div className="grid sm:grid-cols-3 gap-3">
          {PHASES.map((phase) => {
            const phaseItems = items.filter((i) => i.phase === phase.id);
            const phaseTotal = phaseItems.reduce((s, i) => s + i.cost, 0);
            return (
              <div key={phase.id} className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl overflow-hidden">
                <div className="px-4 py-3" style={{ backgroundColor: `${phase.color}18` }}>
                  <div className="text-xs font-bold">{phaseName(phase)}</div>
                  <div className="text-[10px] text-[var(--muted)] mb-1">{ar ? phase.descAr : phase.desc}</div>
                  <div className="font-serif text-lg font-bold" style={{ color: phase.color }}>
                    {money(phaseTotal)}
                  </div>
                </div>
                <div className="p-2 max-h-72 overflow-y-auto">
                  {phaseItems.map((item) => (
                    <div key={item.id} className="bg-[var(--surface-0)] rounded-lg p-2 mb-1.5 text-xs">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">{item.name}</span>
                        <span className="font-semibold text-[var(--green-dark)]">{money(item.cost)}</span>
                      </div>
                      <select
                        value={item.phase}
                        onChange={(e) => updateItem(item.id, { phase: parseInt(e.target.value) })}
                        className="text-[10px] bg-[var(--surface-card)] border border-[var(--border-default)] rounded px-1 py-0.5"
                      >
                        {PHASES.map((p) => (
                          <option key={p.id} value={p.id}>
                            {L(`نقل إلى ${p.nameAr}`, `Move to ${p.name}`)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === 'table' && items.length > 0 && (
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl overflow-hidden">
          <div className="grid grid-cols-[24px_1.5fr_1fr_0.8fr_90px_28px] gap-2 px-4 py-2 bg-[var(--surface-0)] text-[10px] font-semibold text-[var(--muted)]">
            <span></span>
            <span>{L('الغرض', 'Item')}</span>
            <span>{L('الغرفة', 'Room')}</span>
            <span>{L('المرحلة', 'Phase')}</span>
            <span className="text-end">{L('التكلفة', 'Cost')}</span>
            <span></span>
          </div>
          {items.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[24px_1.5fr_1fr_0.8fr_90px_28px] gap-2 px-4 py-2 items-center text-xs border-t border-[var(--border-faint)]"
            >
              <input
                type="checkbox"
                checked={item.bought}
                onChange={(e) => updateItem(item.id, { bought: e.target.checked })}
              />
              <span className={item.bought ? 'line-through text-[var(--muted)]' : ''}>{item.name}</span>
              <select
                value={item.area}
                onChange={(e) => updateItem(item.id, { area: e.target.value })}
                className="bg-[var(--surface-0)] border border-[var(--border-default)] rounded px-1 py-1 text-[10px]"
              >
                {AREAS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.icon} {areaName(a)}
                  </option>
                ))}
              </select>
              <select
                value={item.phase}
                onChange={(e) => updateItem(item.id, { phase: parseInt(e.target.value) })}
                className="bg-[var(--surface-0)] border border-[var(--border-default)] rounded px-1 py-1 text-[10px]"
              >
                {PHASES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {phaseName(p)}
                  </option>
                ))}
              </select>
              <input
                type="text"
                defaultValue={fmt(item.cost)}
                onBlur={(e) => {
                  const val = parseFloat(e.target.value.replace(/[^0-9.]/g, ''));
                  if (!isNaN(val)) updateItem(item.id, { cost: val });
                }}
                className="bg-[var(--surface-0)] border border-[var(--border-default)] rounded px-2 py-1 text-end outline-none"
              />
              <button onClick={() => deleteItem(item.id)} className="text-[var(--muted)] hover:text-[var(--red-dark-text)]">
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
