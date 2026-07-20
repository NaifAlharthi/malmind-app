'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useT } from '@/lib/i18n/LocaleProvider';

export interface FieldDef {
  key: string;
  label: string;
  kind: 'text' | 'number' | 'select';
  placeholder?: string;
  options?: { value: string; label: string }[];
  widthClass?: string; // tailwind width for the input, e.g. 'w-32'
  grow?: boolean; // take remaining space
  optional?: boolean; // don't block Add if empty
}

type Row = Record<string, unknown> & { id: string };

interface Props {
  icon: string;
  title: string;
  description?: string;
  table: string;
  selectCols: string;
  fields: FieldDef[];
  // Derive extra columns for the insert (e.g. asset_class from asset_type).
  deriveInsert?: (values: Record<string, string>) => Record<string, unknown>;
  // How to render each saved row in the list.
  summary: (row: Row) => string;
  addLabel?: string;
  // Notify the parent after any successful add/remove (so sibling
  // visualizations reading the same table can refetch).
  onChanged?: () => void;
}

function initialValues(fields: FieldDef[]): Record<string, string> {
  const v: Record<string, string> = {};
  for (const f of fields) {
    v[f.key] = f.kind === 'select' ? f.options?.[0]?.value ?? '' : '';
  }
  return v;
}

export default function CaptureSection({
  icon, title, description, table, selectCols, fields, deriveInsert, summary, addLabel, onChanged,
}: Props) {
  const supabase = createClient();
  const t = useT();
  const [userId, setUserId] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [values, setValues] = useState<Record<string, string>>(() => initialValues(fields));
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    async (uid: string) => {
      const { data } = await supabase
        .from(table)
        .select(selectCols)
        .eq('user_id', uid)
        .order('created_at', { ascending: true });
      if (data) setRows(data as unknown as Row[]);
    },
    [supabase, table, selectCols]
  );

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      load(user.id);
    })();
  }, [supabase, load]);

  async function add() {
    if (!userId) return;
    // Require every non-optional field to have a value.
    for (const f of fields) {
      if (f.optional) continue;
      if (!values[f.key] || !String(values[f.key]).trim()) return;
    }
    setSaving(true);
    const insert: Record<string, unknown> = { user_id: userId };
    for (const f of fields) {
      const raw = values[f.key] ?? '';
      if (f.kind === 'number') {
        insert[f.key] = parseFloat(String(raw).replace(/[^0-9.]/g, '')) || 0;
      } else {
        insert[f.key] = String(raw).trim();
      }
    }
    if (deriveInsert) Object.assign(insert, deriveInsert(values));

    const { error } = await supabase.from(table).insert(insert);
    setSaving(false);
    if (!error) {
      setValues(initialValues(fields));
      load(userId);
      onChanged?.();
    }
  }

  async function remove(id: string) {
    if (!userId) return;
    await supabase.from(table).delete().eq('id', id);
    load(userId);
    onChanged?.();
  }

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
      <div className="flex items-center gap-2.5 mb-1">
        <span className="text-lg">{icon}</span>
        <h2 className="font-serif text-lg font-semibold text-[var(--ink)]">{title}</h2>
      </div>
      {description && <p className="text-xs text-[var(--muted)] mb-4 max-w-xl">{description}</p>}

      <div className="flex flex-wrap items-end gap-2 mb-3">
        {fields.map((f) => (
          <div key={f.key} className={f.grow ? 'flex-1 min-w-[140px]' : ''}>
            <label className="text-[11px] text-[var(--muted)] block mb-1">{f.label}</label>
            {f.kind === 'select' ? (
              <select
                value={values[f.key]}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                className="bg-[var(--surface-1)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--ink)] outline-none"
              >
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            ) : (
              <input
                value={values[f.key]}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className={`${f.grow ? 'w-full' : f.widthClass ?? 'w-32'} bg-[var(--surface-1)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--green)]`}
              />
            )}
          </div>
        ))}
        <button
          onClick={add}
          disabled={saving}
          className="text-sm bg-[var(--green-dark)] text-white rounded-lg px-4 py-2 font-medium disabled:opacity-50"
        >
          {addLabel ?? t('common.add')}
        </button>
      </div>

      {rows.length > 0 ? (
        <div className="flex flex-col divide-y divide-[var(--border-default)] border border-[var(--border-default)] rounded-lg overflow-hidden">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-4 py-2.5 text-sm bg-[var(--surface-card)]">
              <span className="text-[var(--ink-2)]">{summary(r)}</span>
              <button
                onClick={() => remove(r.id)}
                className="text-xs text-[var(--muted)] hover:text-[#C0504D] ms-3 shrink-0"
                title={t('common.remove')}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[var(--muted)]">{t('capture.empty')}</p>
      )}
    </div>
  );
}
