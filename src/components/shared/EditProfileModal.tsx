'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { splitName, joinName } from '@/lib/name';
import { useLocale } from '@/lib/i18n/LocaleProvider';

export interface EditableProfile {
  name: string;
  email: string | null;
  phone: string | null;
  birthday: string | null;
  age: number | null;
  gender: string | null;
  city: string | null;
  country: string | null;
  currency: string;
  marital_status: string | null;
  life_stage: string | null;
}

// Dial codes offered in the phone field (region-first, then majors). Default
// is Saudi Arabia.
const DIAL_CODES = [
  { code: '+966', label: '🇸🇦 +966' },
  { code: '+971', label: '🇦🇪 +971' },
  { code: '+965', label: '🇰🇼 +965' },
  { code: '+973', label: '🇧🇭 +973' },
  { code: '+974', label: '🇶🇦 +974' },
  { code: '+968', label: '🇴🇲 +968' },
  { code: '+962', label: '🇯🇴 +962' },
  { code: '+20', label: '🇪🇬 +20' },
  { code: '+1', label: '🇺🇸 +1' },
  { code: '+44', label: '🇬🇧 +44' },
  { code: '+90', label: '🇹🇷 +90' },
  { code: '+91', label: '🇮🇳 +91' },
  { code: '+92', label: '🇵🇰 +92' },
];

const CURRENCIES = [
  { code: 'SAR', label: 'SAR — Saudi Riyal', labelAr: 'ريال سعودي — SAR' },
  { code: 'AED', label: 'AED — UAE Dirham', labelAr: 'درهم إماراتي — AED' },
  { code: 'KWD', label: 'KWD — Kuwaiti Dinar', labelAr: 'دينار كويتي — KWD' },
  { code: 'BHD', label: 'BHD — Bahraini Dinar', labelAr: 'دينار بحريني — BHD' },
  { code: 'QAR', label: 'QAR — Qatari Riyal', labelAr: 'ريال قطري — QAR' },
  { code: 'OMR', label: 'OMR — Omani Rial', labelAr: 'ريال عُماني — OMR' },
  { code: 'USD', label: 'USD — US Dollar', labelAr: 'دولار أمريكي — USD' },
  { code: 'EUR', label: 'EUR — Euro', labelAr: 'يورو — EUR' },
  { code: 'GBP', label: 'GBP — British Pound', labelAr: 'جنيه إسترليني — GBP' },
  { code: 'EGP', label: 'EGP — Egyptian Pound', labelAr: 'جنيه مصري — EGP' },
  { code: 'TRY', label: 'TRY — Turkish Lira', labelAr: 'ليرة تركية — TRY' },
  { code: 'INR', label: 'INR — Indian Rupee', labelAr: 'روبية هندية — INR' },
];

const GENDERS = [
  { value: 'male', label: 'Male', labelAr: 'ذكر' },
  { value: 'female', label: 'Female', labelAr: 'أنثى' },
];

const MARITAL = [
  { value: 'single', label: 'Single', labelAr: 'أعزب' },
  { value: 'married', label: 'Married', labelAr: 'متزوّج' },
  { value: 'divorced', label: 'Divorced', labelAr: 'مطلَّق' },
  { value: 'widowed', label: 'Widowed', labelAr: 'أرمل' },
];

const LIFE_STAGES = [
  { value: 'student', label: 'Student', labelAr: 'طالب' },
  { value: 'employed', label: 'Employed', labelAr: 'موظّف' },
  { value: 'self_employed', label: 'Self-employed', labelAr: 'يعمل لحسابه' },
  { value: 'business_owner', label: 'Business owner', labelAr: 'صاحب عمل' },
  { value: 'unemployed', label: 'Unemployed', labelAr: 'عاطل عن العمل' },
  { value: 'retired', label: 'Retired', labelAr: 'متقاعد' },
  { value: 'homemaker', label: 'Homemaker', labelAr: 'ربّ/ربّة منزل' },
  { value: 'other', label: 'Other', labelAr: 'أخرى' },
];

const TODAY = new Date().toISOString().slice(0, 10);

function ageFromBirthday(birthday: string): number | null {
  if (!birthday) return null;
  const b = new Date(birthday);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

// Split a stored "+966501234567" into its dial code + local number.
function splitPhone(phone: string): { dial: string; number: string } {
  const codes = [...DIAL_CODES].map((d) => d.code).sort((a, b) => b.length - a.length);
  for (const code of codes) {
    if (phone.startsWith(code)) return { dial: code, number: phone.slice(code.length) };
  }
  return { dial: '+966', number: phone.replace(/^\+/, '') };
}

const fieldBase =
  'bg-[var(--surface-input)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--green)]';
const inputCls = `${fieldBase} w-full`;
const labelCls = 'text-xs text-[var(--muted)] block mb-1';

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
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [dial, setDial] = useState('+966');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [gender, setGender] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [currency, setCurrency] = useState('SAR');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [lifeStage, setLifeStage] = useState('');
  const [detectingCountry, setDetectingCountry] = useState(false);

  const savedAge = useRef<number | null>(null); // preserved when no birthday
  const countryEdited = useRef(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    countryEdited.current = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select(
          'name, age, city, country, email, phone, birthday, gender, currency, marital_status, life_stage'
        )
        .eq('id', user.id)
        .single();

      if (data) {
        const { firstName, lastName } = splitName(data.name ?? '');
        setFirstName(firstName);
        setLastName(lastName);
        setEmail(data.email ?? user.email ?? '');
        if (data.phone) {
          const { dial, number } = splitPhone(String(data.phone));
          setDial(dial);
          setPhone(number);
        } else {
          setDial('+966');
          setPhone('');
        }
        setBirthday(data.birthday ? String(data.birthday).slice(0, 10) : '');
        setGender(data.gender ?? '');
        setCity(data.city ?? '');
        setCountry(data.country ?? '');
        setCurrency(data.currency ?? 'SAR');
        setMaritalStatus(data.marital_status ?? '');
        setLifeStage(data.life_stage ?? '');
        savedAge.current = data.age != null ? Number(data.age) : null;
      }
      setLoading(false);
    })();
  }, [open, supabase]);

  // Auto-fill Country from City (unless the user has edited Country by hand).
  useEffect(() => {
    if (!open || countryEdited.current) return;
    const c = city.trim();
    if (c.length < 2) return;
    const timer = setTimeout(async () => {
      setDetectingCountry(true);
      try {
        const res = await fetch(`/api/geocode?city=${encodeURIComponent(c)}`);
        const json = await res.json();
        if (json?.country && !countryEdited.current) setCountry(json.country);
      } catch {
        /* leave country as-is */
      } finally {
        setDetectingCountry(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [city, open]);

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

    const localNumber = phone.replace(/\D/g, '');
    const updated: EditableProfile = {
      name: joinName(firstName, lastName),
      email: email.trim() || null,
      phone: localNumber ? `${dial}${localNumber}` : null,
      birthday: birthday || null,
      age: birthday ? ageFromBirthday(birthday) : savedAge.current,
      gender: gender || null,
      city: city.trim() || null,
      country: country.trim() || null,
      currency: currency || 'SAR',
      marital_status: maritalStatus || null,
      life_stage: lifeStage || null,
    };

    const { error } = await supabase.from('profiles').update(updated).eq('id', user.id);
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
      className="fixed inset-0 z-50 bg-[var(--scrim-strong)] flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--surface-card)] rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">{L('تعديل الملف الشخصي', 'Edit profile')}</h2>
          <button
            onClick={onClose}
            className="text-[var(--muted)] hover:text-[var(--ink)] text-sm"
            aria-label={L('إغلاق', 'Close')}
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="text-sm text-[var(--muted)] py-8 text-center">{L('جارٍ التحميل…', 'Loading…')}</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{L('الاسم الأول', 'First name')}</label>
                <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{L('اسم العائلة', 'Last name')}</label>
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} />
              </div>
            </div>

            <div>
              <label className={labelCls}>{L('البريد الإلكتروني', 'Email')}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputCls} dir="ltr" />
            </div>

            <div>
              <label className={labelCls}>{L('رقم الجوال', 'Phone number')}</label>
              <div className="flex gap-2">
                <select value={dial} onChange={(e) => setDial(e.target.value)} className={`${fieldBase} w-24 shrink-0`}>
                  {DIAL_CODES.map((d) => (
                    <option key={d.code} value={d.code}>{d.label}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="5X XXX XXXX"
                  className={`${fieldBase} flex-1 min-w-0`}
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{L('تاريخ الميلاد', 'Birthday')}</label>
                <input
                  type="date"
                  value={birthday}
                  max={TODAY}
                  min="1920-01-01"
                  onChange={(e) => setBirthday(e.target.value)}
                  className={inputCls}
                />
                {birthday && ageFromBirthday(birthday) !== null && (
                  <div className="text-[11px] text-[var(--muted)] mt-1">{L('العمر', 'Age')} {ageFromBirthday(birthday)}</div>
                )}
              </div>
              <div>
                <label className={labelCls}>{L('الجنس', 'Gender')}</label>
                <select value={gender} onChange={(e) => setGender(e.target.value)} className={inputCls}>
                  <option value="">{L('اختر…', 'Select…')}</option>
                  {GENDERS.map((g) => (
                    <option key={g.value} value={g.value}>{ar ? g.labelAr : g.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{L('المدينة', 'City')}</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={L('مثال: الرياض', 'e.g. Riyadh')}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>
                  {L('الدولة', 'Country')} {detectingCountry && <span className="text-[var(--gold)]">· {L('يُكتشَف…', 'detecting…')}</span>}
                </label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => {
                    countryEdited.current = true;
                    setCountry(e.target.value);
                  }}
                  placeholder={L('يُملأ تلقائياً من المدينة', 'Auto-filled from city')}
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>{L('العملة الرئيسية', 'Main currency')}</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls}>
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{ar ? c.labelAr : c.label}</option>
                ))}
              </select>
              <div className="text-[11px] text-[var(--muted)] mt-1">{L('تُستخدَم في كل تفاصيلك المالية.', 'Used across your financial details.')}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{L('الحالة الاجتماعية', 'Marital status')}</label>
                <select value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value)} className={inputCls}>
                  <option value="">{L('اختر…', 'Select…')}</option>
                  {MARITAL.map((m) => (
                    <option key={m.value} value={m.value}>{ar ? m.labelAr : m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>{L('المرحلة في الحياة', 'Point in life')}</label>
                <select value={lifeStage} onChange={(e) => setLifeStage(e.target.value)} className={inputCls}>
                  <option value="">{L('اختر…', 'Select…')}</option>
                  {LIFE_STAGES.map((l) => (
                    <option key={l.value} value={l.value}>{ar ? l.labelAr : l.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <div className="text-xs text-[var(--red-dark-text)] bg-[var(--red-bg)] border border-[var(--red-border)] rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border border-[var(--border-default)] text-[var(--ink-2)] rounded-lg py-2.5 text-sm font-medium"
              >
                {L('إلغاء', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-[var(--green-dark)] text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
              >
                {saving ? L('جارٍ الحفظ…', 'Saving…') : L('حفظ التغييرات', 'Save changes')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
