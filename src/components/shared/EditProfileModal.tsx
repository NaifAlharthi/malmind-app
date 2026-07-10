'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { splitName, joinName } from '@/lib/name';

export interface EditableProfile {
  name: string;
  age: number | null;
  city: string | null;
  employment: string | null;
  monthly_income: number;
}

export default function EditProfileModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (profile: EditableProfile) => void;
}) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [city, setCity] = useState('');
  const [employment, setEmployment] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    setError(null);

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('name, age, city, employment, monthly_income')
        .eq('id', user.id)
        .single();

      if (data) {
        const { firstName, lastName } = splitName(data.name ?? '');
        setFirstName(firstName);
        setLastName(lastName);
        setAge(data.age != null ? String(data.age) : '');
        setCity(data.city ?? '');
        setEmployment(data.employment ?? '');
        setMonthlyIncome(data.monthly_income != null ? String(data.monthly_income) : '');
      }
      setLoading(false);
    })();
  }, [open, supabase]);

  if (!open) return null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const updated: EditableProfile = {
      name: joinName(firstName, lastName),
      age: age.trim() === '' ? null : Number(age),
      city: city.trim() === '' ? null : city.trim(),
      employment: employment.trim() === '' ? null : employment.trim(),
      monthly_income: monthlyIncome.trim() === '' ? 0 : Number(monthlyIncome),
    };

    const { error } = await supabase
      .from('profiles')
      .update(updated)
      .eq('id', user.id);

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    onSaved(updated);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl font-semibold text-[#141414]">
            Edit profile
          </h2>
          <button
            onClick={onClose}
            className="text-[#898781] hover:text-[#141414] text-sm"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="text-sm text-[#898781] py-8 text-center">Loading…</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#898781] block mb-1">First name</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1D9E75]"
                />
              </div>
              <div>
                <label className="text-xs text-[#898781] block mb-1">Last name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1D9E75]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#898781] block mb-1">Age</label>
                <input
                  type="number"
                  min={0}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1D9E75]"
                />
              </div>
              <div>
                <label className="text-xs text-[#898781] block mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1D9E75]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-[#898781] block mb-1">Employment</label>
              <input
                type="text"
                value={employment}
                onChange={(e) => setEmployment(e.target.value)}
                placeholder="e.g. Private sector (banking)"
                className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1D9E75]"
              />
            </div>

            <div>
              <label className="text-xs text-[#898781] block mb-1">
                Monthly income (SAR)
              </label>
              <input
                type="number"
                min={0}
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1D9E75]"
              />
            </div>

            {error && (
              <div className="text-xs text-[#A32D2D] bg-[#FBE9EC] border border-[#E5A0AC] rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border border-black/10 text-[#3D3D3A] rounded-lg py-2.5 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-[#085041] text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
