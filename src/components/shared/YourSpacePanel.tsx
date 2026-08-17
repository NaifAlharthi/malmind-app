'use client';

// Your space — the personal drawer behind the avatar circle: account,
// preferences, periodic reports, integrations, and help. It used to live
// on home·D3; the founder moved it here so home stays identity and the
// person's own space follows them on every page, one tap away.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { useTheme } from '@/components/shared/ThemeProvider';
import { localizedFirstName } from '@/lib/name';
import { demoAr } from '@/lib/demoI18n';
import { isDemoActive } from '@/lib/demoSupabase';
import { clearEphemeral } from '@/lib/authPrefs';
import ContactModal from '@/components/shared/ContactModal';

interface SpaceProfile {
  name: string;
  city: string | null;
  employment: string | null;
  life_stage: string | null;
  currency: string | null;
}

interface Account {
  email: string | null;
  memberSince: string | null;
  isDemo: boolean;
}

interface Integrations {
  configured: boolean;
  connected: boolean;
  email: string | null;
  spreadsheetUrl: string | null;
}

export default function YourSpacePanel({
  open, onClose, onEditProfile,
}: {
  open: boolean;
  onClose: () => void;
  onEditProfile: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();
  const { t, locale, setLocale } = useLocale();
  const { theme, toggleTheme } = useTheme();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);

  const [profile, setProfile] = useState<SpaceProfile | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [integ, setInteg] = useState<Integrations | null>(null);
  const [contactOpen, setContactOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setAccount({ email: user.email ?? null, memberSince: user.created_at ?? null, isDemo: isDemoActive() });
      const { data } = await supabase
        .from('profiles')
        .select('name, city, employment, life_stage, currency')
        .eq('id', user.id)
        .single();
      if (data) setProfile(data as SpaceProfile);
      try {
        const res = await fetch('/api/integrations/google/status');
        if (res.ok) setInteg(await res.json());
      } catch { /* ignore */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Escape closes the drawer.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  async function handleSignOut() {
    clearEphemeral();
    await supabase.auth.signOut();
    router.push('/login');
  }

  const lifeStageLabel = (s: string | null) => {
    if (!s) return null;
    const map: Record<string, string> = {
      student: L('طالب', 'Student'), employed: L('موظّف', 'Employed'),
      self_employed: L('يعمل لحسابه', 'Self-employed'), business_owner: L('صاحب عمل', 'Business owner'),
      unemployed: L('عاطل عن العمل', 'Unemployed'), retired: L('متقاعد', 'Retired'),
      homemaker: L('ربّ/ربّة منزل', 'Homemaker'), other: L('أخرى', 'Other'),
    };
    return map[s] ?? null;
  };
  const memberSinceLabel = account?.memberSince
    ? new Intl.DateTimeFormat(ar ? 'ar' : 'en', { year: 'numeric', month: 'long' }).format(new Date(account.memberSince))
    : null;

  if (!open) return null;

  return (
    <>
      {/* backdrop */}
      <div className="fixed inset-0 z-[44] bg-black/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      {/* the drawer — slides in from the end side */}
      <div className="fixed inset-y-0 end-0 z-[45] w-full max-w-xl bg-[var(--surface-0)] border-s border-[var(--border-default)] shadow-2xl overflow-y-auto">
        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="text-[10px] tracking-[0.14em] uppercase text-[var(--gold)] font-semibold">
              {L('مساحتك', 'Your space')}
            </div>
            <button onClick={onClose} aria-label={L('إغلاق', 'Close')} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-1)]">
              ✕
            </button>
          </div>

          {!profile ? (
            <div className="text-sm text-[var(--muted)]">{t('common.loading')}</div>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SpaceTile icon="🪪" title={L('حسابك', 'Your account')} className="sm:col-span-2 relative">
            {/* sign out — a power button in the corner */}
            <button
              onClick={handleSignOut}
              title={t('common.signOut')}
              aria-label={t('common.signOut')}
              className="absolute top-4 end-4 w-8 h-8 rounded-full border border-[var(--border-default)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--red-dark-text)] hover:border-[var(--red-2)] transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M12 3v8" />
                <path d="M6.3 6.5a8 8 0 1 0 11.4 0" />
              </svg>
            </button>
            <div className="grid md:grid-cols-3 gap-x-6 gap-y-4">
              {/* who you are */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--green-bg)] border border-[var(--green-border)] flex items-center justify-center text-sm font-semibold text-[var(--green-dark)] shrink-0">
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[var(--ink)] truncate">{localizedFirstName(profile.name, ar)}</div>
                    <div className="text-[11px] text-[var(--muted)] truncate">
                      {[demoAr(profile.employment, ar), demoAr(profile.city, ar), lifeStageLabel(profile.life_stage)].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                </div>
                <button onClick={onEditProfile} className="text-xs font-medium text-[var(--green-dark)] bg-[var(--green-bg)] border border-[var(--green-border)] rounded-lg px-3 py-1.5">
                  {t('common.editProfile')}
                </button>
              </div>

              {/* account facts */}
              <div className="flex flex-col gap-1.5">
                <InfoLine label={L('البريد', 'Email')} value={account?.email ?? '—'} mono />
                <InfoLine
                  label={L('النوع', 'Plan')}
                  value={account?.isDemo ? L('تجريبي', 'Demo') : L('مجّاني', 'Free')}
                  badge
                  badgeColor={account?.isDemo ? 'var(--gold-2)' : 'var(--green)'}
                />
                {memberSinceLabel && <InfoLine label={L('عضو منذ', 'Member since')} value={memberSinceLabel} />}
                {profile.currency && <InfoLine label={L('العملة', 'Currency')} value={profile.currency} />}
              </div>

              {/* preferences */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[11px] text-[var(--muted)] w-12 shrink-0">{t('common.language')}</span>
                  <div className="inline-flex border border-[var(--border-default)] rounded-lg overflow-hidden">
                    <button onClick={() => setLocale('en')} className={`px-2.5 py-1 text-[11px] font-medium ${!ar ? 'bg-[var(--ink)] text-[var(--surface-0)]' : 'text-[var(--ink-2)]'}`}>English</button>
                    <button onClick={() => setLocale('ar')} className={`px-2.5 py-1 text-[11px] font-medium ${ar ? 'bg-[var(--ink)] text-[var(--surface-0)]' : 'text-[var(--ink-2)]'}`}>العربية</button>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[11px] text-[var(--muted)] w-12 shrink-0">{L('المظهر', 'Theme')}</span>
                  <div className="inline-flex border border-[var(--border-default)] rounded-lg overflow-hidden">
                    <button onClick={() => { if (theme !== 'light') toggleTheme(); }} className={`px-2.5 py-1 text-[11px] font-medium flex items-center gap-1 ${theme === 'light' ? 'bg-[var(--ink)] text-[var(--surface-0)]' : 'text-[var(--ink-2)]'}`}>☀ {L('فاتح', 'Light')}</button>
                    <button onClick={() => { if (theme !== 'dark') toggleTheme(); }} className={`px-2.5 py-1 text-[11px] font-medium flex items-center gap-1 ${theme === 'dark' ? 'bg-[var(--ink)] text-[var(--surface-0)]' : 'text-[var(--ink-2)]'}`}>☾ {L('داكن', 'Dark')}</button>
                  </div>
                </div>
              </div>
            </div>
          </SpaceTile>

          {/* periodic reports — a bigger feature, so it takes the full row */}
          <SpaceTile icon="📬" title={L('التقارير الدورية', 'Periodic reports')} className="sm:col-span-2">
            <ReportsTile />
          </SpaceTile>

          {/* integrations */}
          <SpaceTile icon="🔗" title={L('التكاملات', 'Integrations')}>
            <div className="flex items-center justify-between gap-2 bg-[var(--surface-1)] rounded-lg px-3 py-2.5 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base">📊</span>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-[var(--ink)]">Google Sheets</div>
                  <div className="text-[10px] text-[var(--muted)] truncate">
                    {integ?.connected
                      ? L(`متّصل${integ.email ? ` · ${integ.email}` : ''}`, `Connected${integ.email ? ` · ${integ.email}` : ''}`)
                      : integ && !integ.configured
                      ? L('غير مُفعَّل بعد', 'Not enabled yet')
                      : L('غير متّصل', 'Not connected')}
                  </div>
                </div>
              </div>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: integ?.connected ? 'var(--green)' : 'var(--border-medium)' }} />
            </div>
            <Link href="/financial-numbers" className="text-xs font-medium text-[var(--green-dark)]">
              {integ?.connected ? L('إدارة المزامنة →', 'Manage sync →') : L('ربط جدول Google →', 'Connect Google Sheets →')}
            </Link>
            <p className="text-[10px] text-[var(--muted)] mt-2 leading-relaxed">
              {L('المزيد من الاتصالات (البنوك، الوسطاء) قادم.', 'More connections (banks, brokers) coming.')}
            </p>
          </SpaceTile>

          {/* help & contact — small and to the point, pairing with integrations */}
          <SpaceTile icon="💬" title={L('المساعدة والتواصل', 'Help & contact')}>
            <p className="text-xs text-[var(--ink-2)] leading-relaxed mb-3">
              {L('سؤال، ملاحظة، استفسار استثماري، أو شراكة؟ يسعدنا أن نسمع منك.', 'A question, feedback, an investment inquiry, or a partnership? We’d love to hear from you.')}
            </p>
            <button
              onClick={() => setContactOpen(true)}
              className="text-xs font-medium text-[var(--green-dark)] bg-[var(--green-bg)] border border-[var(--green-border)] rounded-lg px-3 py-1.5"
            >
              {t('common.contactUs')}
            </button>
          </SpaceTile>
          </div>
          )}
        </div>
      </div>
      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} source="home" />
    </>
  );
}

// ── Periodic reports: reminders-grade scheduling, saved for the delivery
// engine. Frequencies can carry precise rules — which weekdays, first/last/
// specific day of the month, anchored to salary day (on/before/after), a
// period edge for quarterly/annual, and an optional start/end window.
interface ReportPrefs {
  freq: string[];
  via: string[];
  dailyTime: string; // HH:mm — when the daily digest goes out
  weekDays: number[]; // 0 = Sunday … 6 = Saturday
  monthlyOn: 'first' | 'last' | 'day' | 'salary' | null;
  monthlyDay: number;
  salaryRel: 'on' | 'before' | 'after';
  salaryDay: number; // typically the 27th in Saudi Arabia
  quarterlyOn: 'first' | 'last' | null;
  annualOn: 'date' | 'last' | null; // a specific date, or the year's last day
  annualMonth: number; // 1..12
  annualDay: number; // 1..28
  detail: 'simple' | 'detailed' | 'extreme' | null;
}

const REPORT_DEFAULTS: ReportPrefs = {
  freq: [], via: [], dailyTime: '18:00', weekDays: [], monthlyOn: null, monthlyDay: 15,
  salaryRel: 'on', salaryDay: 27, quarterlyOn: null, annualOn: null, annualMonth: 1, annualDay: 1,
  detail: null,
};

function ReportsTile() {
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const [p, setP] = useState<ReportPrefs>(REPORT_DEFAULTS);
  const [edit, setEdit] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('mm-report-prefs');
      if (raw) setP({ ...REPORT_DEFAULTS, ...JSON.parse(raw) });
    } catch { /* ignore */ }
  }, []);
  // Functional updates only — handlers rendered a moment ago must never
  // clobber a change that landed in between.
  const save = (updater: (prev: ReportPrefs) => ReportPrefs) => {
    setP((prev) => {
      const next = updater(prev);
      try { window.localStorage.setItem('mm-report-prefs', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };
  const patch = (part: Partial<ReportPrefs>) => save((prev) => ({ ...prev, ...part }));
  const toggleIn = (key: 'freq' | 'via', v: string) =>
    save((prev) => ({ ...prev, [key]: prev[key].includes(v) ? prev[key].filter((x) => x !== v) : [...prev[key], v] }));
  const toggleDay = (d: number) =>
    save((prev) => ({ ...prev, weekDays: prev.weekDays.includes(d) ? prev.weekDays.filter((x) => x !== d) : [...prev.weekDays, d].sort() }));

  const FREQ_OPTS = [
    { k: 'daily', icon: '☀️', label: L('يومي', 'Daily') },
    { k: 'weekly', icon: '📅', label: L('أسبوعي', 'Weekly') },
    { k: 'monthly', icon: '🗓️', label: L('شهري', 'Monthly') },
    { k: 'quarterly', icon: '📈', label: L('ربع سنوي', 'Quarterly') },
    { k: 'annual', icon: '🏁', label: L('سنوي', 'Annual') },
  ];
  const VIA_OPTS: { k: string; icon: React.ReactNode; label: string }[] = [
    { k: 'email', icon: '✉️', label: L('البريد الإلكتروني', 'Email') },
    { k: 'whatsapp', icon: <WhatsAppGlyph />, label: L('واتساب', 'WhatsApp') },
  ];
  const DETAIL_OPTS: { k: ReportPrefs['detail'] & string; icon: string; label: string; desc: string }[] = [
    {
      k: 'simple', icon: '🪶', label: L('بسيط جداً', 'Super simple'),
      desc: L(
        'أرقامك الثلاثة فقط: صافي الثروة، الداخل مقابل الخارج هذا الشهر، وجملة واحدة من العقل — يُقرأ في ثلاثين ثانية.',
        'Just your three numbers: net worth, money in vs out this month, and one sentence from the Brain — a thirty-second read.'
      ),
    },
    {
      k: 'detailed', icon: '📄', label: L('مفصّل', 'Detailed'),
      desc: L(
        'الملخص، وأين تقف، وأهم نسبك المالية، وتقدّم أهدافك، وتنبيهات المخاطر — صفحة واحدة مركّزة.',
        'The summary plus where you stand, your key ratios, goal progress, and risk alerts — one focused page.'
      ),
    },
    {
      k: 'extreme', icon: '📚', label: L('مفصّل للغاية', 'Extremely detailed'),
      desc: L(
        'كل شيء: تحليل البنود كاملاً، مقارنتك بالأقران، تكوين أصولك، خطة حريتك المالية، وتوصيات العقل التفصيلية — تقرير يقرؤه محترف.',
        "Everything: full line-item analysis, peer comparison, asset composition, your freedom plan, and the Brain's detailed recommendations — the report a pro reads."
      ),
    },
  ];
  const DAY_FULL = ar
    ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const DAY_SHORT = ar ? ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const Pill = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] transition-all ${
        on
          ? 'bg-[var(--green-bg)] border-[var(--green)] text-[var(--green-dark)] font-semibold shadow-sm'
          : 'border-[var(--border-default)] text-[var(--ink-2)] hover:border-[var(--border-strong)]'
      }`}
    >
      {children}
      {on && <span className="text-[9px]">✓</span>}
    </button>
  );
  const Chip = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--green-bg)] border border-[var(--green-border)] text-[var(--green-dark)] px-2 py-0.5 text-[10px] font-medium">
      <span className="leading-none">{icon}</span>{label}
    </span>
  );
  const GroupLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="text-[11px] text-[var(--muted)] mb-1.5">{children}</div>
  );
  const daySelect = (value: number, onChange: (n: number) => void) => (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="bg-[var(--surface-1)] border border-[var(--border-default)] rounded-lg px-2 py-1 text-[11px] text-[var(--ink)]"
      dir="ltr"
    >
      {Array.from({ length: 28 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
    </select>
  );

  const GMONTHS = ar
    ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // The schedule, humanized for the summary view.
  const scheduleLines: string[] = [];
  if (p.freq.includes('daily') && p.dailyTime) {
    scheduleLines.push(L(`اليومي: الساعة ${p.dailyTime}`, `Daily: at ${p.dailyTime}`));
  }
  if (p.freq.includes('weekly') && p.weekDays.length > 0) {
    scheduleLines.push(L('أيام: ', 'Days: ') + p.weekDays.map((d) => DAY_FULL[d]).join(ar ? '، ' : ', '));
  }
  if (p.freq.includes('monthly') && p.monthlyOn) {
    const m = p.monthlyOn === 'first' ? L('أول يوم في الشهر', 'first day of the month')
      : p.monthlyOn === 'last' ? L('آخر يوم في الشهر', 'last day of the month')
      : p.monthlyOn === 'day' ? L(`اليوم ${p.monthlyDay} من الشهر`, `day ${p.monthlyDay} of the month`)
      : p.salaryRel === 'on' ? L(`في يوم الراتب (${p.salaryDay})`, `on salary day (${p.salaryDay})`)
      : p.salaryRel === 'before' ? L(`قبل يوم الراتب (${p.salaryDay})`, `before salary day (${p.salaryDay})`)
      : L(`بعد يوم الراتب (${p.salaryDay})`, `after salary day (${p.salaryDay})`);
    scheduleLines.push(L('الشهري: ', 'Monthly: ') + m);
  }
  if (p.freq.includes('quarterly') && p.quarterlyOn) {
    scheduleLines.push(
      L('الربع سنوي: ', 'Quarterly: ') +
      (p.quarterlyOn === 'first' ? L('أول يوم في الربع', 'first day of the quarter') : L('آخر يوم في الربع', 'last day of the quarter'))
    );
  }
  if (p.freq.includes('annual') && p.annualOn) {
    scheduleLines.push(
      L('السنوي: ', 'Annual: ') +
      (p.annualOn === 'last'
        ? L('آخر يوم في السنة', 'the last day of the year')
        : L(`${p.annualDay} ${GMONTHS[p.annualMonth - 1]}`, `${GMONTHS[p.annualMonth - 1]} ${p.annualDay}`))
    );
  }

  const chosenFreq = FREQ_OPTS.filter((o) => p.freq.includes(o.k));
  const chosenVia = VIA_OPTS.filter((o) => p.via.includes(o.k));

  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-semibold text-[var(--gold-text-strong)] bg-[var(--gold-bg)] border border-[var(--gold)] rounded-full px-2 py-0.5">
          {L('قريباً', 'Coming soon')}
        </span>
      </div>
      <p className="text-[11px] text-[var(--ink-2)] leading-relaxed mb-3">
        {L(
          'سنرسل لك خلاصة وضعك المالي تلقائياً — وستبدأ رحلتها إليك فور إطلاق الميزة.',
          "We'll send your financial summary automatically — deliveries begin the moment the feature ships."
        )}
      </p>

      {edit ? (
        <>
          {/* horizontal editor: channels & cadence · timing rules · detail */}
          <div className="grid md:grid-cols-3 gap-x-6 gap-y-1 items-start">
          <div>
          <div className="mb-3">
            <GroupLabel>{L('الوسيلة', 'Channel')}</GroupLabel>
            <div className="flex flex-wrap gap-1.5">
              {VIA_OPTS.map((o) => (
                <Pill key={o.k} on={p.via.includes(o.k)} onClick={() => toggleIn('via', o.k)}>
                  <span className="leading-none">{o.icon}</span><span>{o.label}</span>
                </Pill>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <GroupLabel>{L('التكرار', 'Frequency')}</GroupLabel>
            <div className="flex flex-wrap gap-1.5">
              {FREQ_OPTS.map((o) => (
                <Pill key={o.k} on={p.freq.includes(o.k)} onClick={() => toggleIn('freq', o.k)}>
                  <span className="leading-none">{o.icon}</span><span>{o.label}</span>
                </Pill>
              ))}
            </div>
          </div>

          </div>

          <div>
          {p.freq.length === 0 && (
            <p className="text-[11px] text-[var(--muted)] leading-relaxed mt-1">
              {L('اختر تكراراً وستظهر خيارات توقيته الدقيقة هنا.', 'Pick a frequency and its precise timing options appear here.')}
            </p>
          )}
          {p.freq.includes('daily') && (
            <div className="mb-3">
              <GroupLabel>{L('في أي وقت من اليوم؟', 'What time of day?')}</GroupLabel>
              <input
                type="time" value={p.dailyTime} dir="ltr"
                onChange={(e) => patch({ dailyTime: e.target.value || '18:00' })}
                className="bg-[var(--surface-1)] border border-[var(--border-default)] rounded-lg px-2.5 py-1.5 text-[11px] text-[var(--ink)]"
              />
            </div>
          )}

          {p.freq.includes('weekly') && (
            <div className="mb-3">
              <GroupLabel>{L('أي أيام الأسبوع؟', 'Which weekdays?')}</GroupLabel>
              <div className="flex gap-1" dir={ar ? 'rtl' : 'ltr'}>
                {DAY_SHORT.map((d, i) => (
                  <button
                    key={i}
                    onClick={() => toggleDay(i)}
                    title={DAY_FULL[i]}
                    aria-pressed={p.weekDays.includes(i)}
                    className={`w-7 h-7 rounded-full text-[10px] font-semibold border transition-all ${
                      p.weekDays.includes(i)
                        ? 'bg-[var(--green-dark)] text-white border-[var(--green-dark)]'
                        : 'border-[var(--border-default)] text-[var(--ink-2)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {p.freq.includes('monthly') && (
            <div className="mb-3">
              <GroupLabel>{L('متى في الشهر؟', 'When in the month?')}</GroupLabel>
              <div className="flex flex-wrap gap-1.5 mb-2">
                <Pill on={p.monthlyOn === 'first'} onClick={() => patch({ monthlyOn: p.monthlyOn === 'first' ? null : 'first' })}>{L('أول الشهر', 'First day')}</Pill>
                <Pill on={p.monthlyOn === 'last'} onClick={() => patch({ monthlyOn: p.monthlyOn === 'last' ? null : 'last' })}>{L('آخر الشهر', 'Last day')}</Pill>
                <Pill on={p.monthlyOn === 'day'} onClick={() => patch({ monthlyOn: p.monthlyOn === 'day' ? null : 'day' })}>{L('يوم محدد', 'Specific day')}</Pill>
                <Pill on={p.monthlyOn === 'salary'} onClick={() => patch({ monthlyOn: p.monthlyOn === 'salary' ? null : 'salary' })}>💵 {L('يوم الراتب', 'Salary day')}</Pill>
              </div>
              {p.monthlyOn === 'day' && (
                <div className="flex items-center gap-2 text-[11px] text-[var(--ink-2)]">
                  {L('اليوم', 'Day')} {daySelect(p.monthlyDay, (n) => patch({ monthlyDay: n }))} {L('من كل شهر', 'of every month')}
                </div>
              )}
              {p.monthlyOn === 'salary' && (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    <Pill on={p.salaryRel === 'on'} onClick={() => patch({ salaryRel: 'on' })}>{L('في يومه', 'On it')}</Pill>
                    <Pill on={p.salaryRel === 'before'} onClick={() => patch({ salaryRel: 'before' })}>{L('قبله', 'Before it')}</Pill>
                    <Pill on={p.salaryRel === 'after'} onClick={() => patch({ salaryRel: 'after' })}>{L('بعده', 'After it')}</Pill>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[var(--ink-2)]">
                    {L('يوم راتبك', 'Your salary day')} {daySelect(p.salaryDay, (n) => patch({ salaryDay: n }))}
                  </div>
                </div>
              )}
            </div>
          )}

          {p.freq.includes('quarterly') && (
            <div className="mb-3">
              <GroupLabel>{L('متى في الربع؟', 'When in the quarter?')}</GroupLabel>
              <div className="flex flex-wrap gap-1.5">
                <Pill on={p.quarterlyOn === 'first'} onClick={() => patch({ quarterlyOn: p.quarterlyOn === 'first' ? null : 'first' })}>{L('أول يوم في الربع', 'First day of the quarter')}</Pill>
                <Pill on={p.quarterlyOn === 'last'} onClick={() => patch({ quarterlyOn: p.quarterlyOn === 'last' ? null : 'last' })}>{L('آخر يوم في الربع', 'Last day of the quarter')}</Pill>
              </div>
            </div>
          )}

          {p.freq.includes('annual') && (
            <div className="mb-3">
              <GroupLabel>{L('متى في السنة؟', 'When in the year?')}</GroupLabel>
              <div className="flex flex-wrap gap-1.5 mb-2">
                <Pill on={p.annualOn === 'date'} onClick={() => patch({ annualOn: p.annualOn === 'date' ? null : 'date' })}>{L('تاريخ محدد', 'A specific date')}</Pill>
                <Pill on={p.annualOn === 'last'} onClick={() => patch({ annualOn: p.annualOn === 'last' ? null : 'last' })}>{L('آخر يوم في السنة', 'Last day of the year')}</Pill>
              </div>
              {p.annualOn === 'date' && (
                <div className="flex items-center gap-2 text-[11px] text-[var(--ink-2)]">
                  {daySelect(p.annualDay, (n) => patch({ annualDay: n }))}
                  <select
                    value={p.annualMonth}
                    onChange={(e) => patch({ annualMonth: Number(e.target.value) })}
                    className="bg-[var(--surface-1)] border border-[var(--border-default)] rounded-lg px-2 py-1 text-[11px] text-[var(--ink)]"
                  >
                    {GMONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                  {L('من كل سنة', 'of every year')}
                </div>
              )}
            </div>
          )}

          </div>

          <div>
          <div className="mb-3">
            <GroupLabel>{L('مستوى التفصيل', 'Level of detail')}</GroupLabel>
            <div className="flex flex-col gap-1.5">
              {DETAIL_OPTS.map((o) => {
                const on = p.detail === o.k;
                return (
                  <button
                    key={o.k}
                    onClick={() => patch({ detail: on ? null : o.k })}
                    aria-pressed={on}
                    className={`text-start rounded-xl border p-2.5 transition-all ${
                      on
                        ? 'bg-[var(--green-bg)] border-[var(--green)] shadow-sm'
                        : 'border-[var(--border-default)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <div className={`flex items-center gap-1.5 text-[11px] font-semibold ${on ? 'text-[var(--green-dark)]' : 'text-[var(--ink)]'}`}>
                      <span>{o.icon}</span><span>{o.label}</span>
                      {on && <span className="text-[9px]">✓</span>}
                    </div>
                    <div className="text-[10px] text-[var(--muted)] leading-relaxed mt-0.5">{o.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          </div>
          </div>

          <button onClick={() => setEdit(false)} className="text-xs font-medium text-white bg-[var(--green-dark)] rounded-lg px-3 py-1.5 mt-2">
            {L('تم ✓', 'Done ✓')}
          </button>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-2 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-[var(--muted)] w-14 shrink-0">{L('الوسيلة', 'Channel')}</span>
              {chosenVia.length > 0
                ? chosenVia.map((o) => <Chip key={o.k} icon={o.icon} label={o.label} />)
                : <span className="text-[11px] text-[var(--muted)] opacity-60">{L('لم تُحدَّد بعد', 'Not set yet')}</span>}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-[var(--muted)] w-14 shrink-0">{L('التكرار', 'Frequency')}</span>
              {chosenFreq.length > 0
                ? chosenFreq.map((o) => <Chip key={o.k} icon={o.icon} label={o.label} />)
                : <span className="text-[11px] text-[var(--muted)] opacity-60">{L('لم يُحدَّد بعد', 'Not set yet')}</span>}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-[var(--muted)] w-14 shrink-0">{L('التفصيل', 'Detail')}</span>
              {p.detail
                ? (() => { const o = DETAIL_OPTS.find((x) => x.k === p.detail)!; return <Chip icon={o.icon} label={o.label} />; })()
                : <span className="text-[11px] text-[var(--muted)] opacity-60">{L('لم يُحدَّد بعد', 'Not set yet')}</span>}
            </div>
          </div>
          {scheduleLines.length > 0 && (
            <div className="text-[10px] text-[var(--muted)] leading-relaxed mb-3">
              {scheduleLines.join(' · ')}
            </div>
          )}
          <button onClick={() => setEdit(true)} className="text-xs font-medium text-[var(--green-dark)] bg-[var(--green-bg)] border border-[var(--green-border)] rounded-lg px-3 py-1.5">
            {L('تعديل التفضيلات', 'Edit preferences')}
          </button>
        </>
      )}
    </>
  );
}

// The official WhatsApp glyph, drawn inline so the channel pill can carry
// the real mark instead of a stand-in emoji.
function WhatsAppGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#25D366]" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2a9.9 9.9 0 0 0-8.4 15.1L2 22l5.05-1.6A9.9 9.9 0 1 0 12.04 2Zm0 18a8.1 8.1 0 0 1-4.1-1.1l-.3-.18-3 .95.96-2.92-.2-.3a8.1 8.1 0 1 1 6.64 3.55Zm4.44-6.07c-.24-.12-1.43-.7-1.65-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06a6.6 6.6 0 0 1-1.94-1.2 7.3 7.3 0 0 1-1.34-1.67c-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.1.16 1.52.1.46-.07 1.43-.58 1.63-1.15.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z" />
    </svg>
  );
}

function SpaceTile({ icon, title, children, className = '' }: { icon: string; title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">{icon}</span>
        <span className="text-sm font-semibold text-[var(--ink)]">{title}</span>
      </div>
      {children}
    </div>
  );
}

function InfoLine({ label, value, mono, badge, badgeColor }: { label: string; value: string; mono?: boolean; badge?: boolean; badgeColor?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-[var(--muted)] shrink-0">{label}</span>
      {badge ? (
        <span className="font-semibold px-2 py-0.5 rounded-full text-[10px]" style={{ color: badgeColor, background: `${badgeColor}22` }}>{value}</span>
      ) : (
        <span className={`text-[var(--ink)] font-medium truncate ${mono ? 'font-mono text-[11px]' : ''}`} dir={mono ? 'ltr' : undefined}>{value}</span>
      )}
    </div>
  );
}
