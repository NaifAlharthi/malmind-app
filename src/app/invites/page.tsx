'use client';

// The Welcome Program's console — founder-only. Hand-pick a person,
// write them a personal note, choose the email's language, and send:
// the invitation carries a short MalMind story, the note, and an
// unguessable /welcome?i= link that greets them by name and walks them
// into the guided tour. The guest list below tracks every invitation's
// journey: created → sent → opened → joined. When no email provider is
// configured the console degrades to copy-and-send, so the program can
// run from any inbox.

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { isAdminEmail } from '@/lib/admin';

interface InviteRow {
  id: string; name: string; email: string; note: string | null;
  lang: 'ar' | 'en'; status: 'created' | 'sent' | 'opened' | 'joined';
  created_at: string; sent_at: string | null; opened_at: string | null; joined_at: string | null;
}

interface SendResult { ok: boolean; id: string; link: string; sent: boolean; subject: string; text: string }

const STATUS_META: Record<InviteRow['status'], { ar: string; en: string; color: string; icon: string }> = {
  created: { ar: 'أُنشئت', en: 'Created', color: 'var(--muted)', icon: '📝' },
  sent: { ar: 'أُرسلت', en: 'Sent', color: '#3B6FD4', icon: '✉️' },
  opened: { ar: 'فُتحت', en: 'Opened', color: '#C9A84C', icon: '👀' },
  joined: { ar: 'انضمّ', en: 'Joined', color: '#1D9E75', icon: '🎉' },
};

export default function InvitesPage() {
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);

  const [admin, setAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<InviteRow[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [busy, setBusy] = useState<string | null>(null); // 'new' or an invite id
  const [result, setResult] = useState<SendResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      let demo = false;
      try { demo = window.localStorage.getItem('mm-demo') === '1'; } catch { /* ignore */ }
      const { data: { user } } = await supabase.auth.getUser();
      const ok = !demo && isAdminEmail(user?.email);
      setAdmin(ok);
      if (ok) {
        const { data } = await supabase.from('invites').select('*').order('created_at', { ascending: false });
        setRows((data as InviteRow[]) ?? []);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send(inviteId?: string) {
    setBusy(inviteId ?? 'new');
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/invites/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteId ? { inviteId } : { name, email, note, lang }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed.'); return; }
      setResult(data as SendResult);
      if (!inviteId) { setName(''); setEmail(''); setNote(''); }
      const { data: fresh } = await supabase.from('invites').select('*').order('created_at', { ascending: false });
      setRows((fresh as InviteRow[]) ?? []);
    } catch {
      setError(L('تعذّر الاتصال — حاول مجدداً.', 'Could not reach the server — try again.'));
    } finally {
      setBusy(null);
    }
  }

  async function copy(text: string, tag: string) {
    try { await navigator.clipboard.writeText(text); setCopied(tag); setTimeout(() => setCopied(null), 1800); } catch { /* ignore */ }
  }

  if (admin === null) return <div className="text-sm text-[var(--muted)]">…</div>;
  if (!admin) {
    return (
      <div className="max-w-xl bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 text-sm text-[var(--muted)] leading-relaxed">
        🎟 {L('هذه الصفحة لمؤسسي مال مايند — سجّل الدخول بحساب مؤسس لإدارة برنامج الترحيب.', 'This page is for MalMind founders — sign in with a founder account to run the welcome program.')}
      </div>
    );
  }

  const inputCls = 'w-full bg-[var(--surface-0)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--green)]';

  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-3xl font-semibold text-[var(--ink)] mb-1">🎟 {L('برنامج الترحيب', 'The Welcome Program')}</h1>
      <p className="text-sm text-[var(--ink-2)] mb-6 max-w-2xl">
        {L('ادعُ أشخاصاً تعرفهم ليستكشفوا مال مايند قبل الجميع — بريدٌ شخصي، رابط باسمهم، وجولة موجّهة.', 'Invite people you know to explore MalMind before everyone — a personal email, a link in their name, and a guided tour.')}
      </p>

      {/* the new-invitation card */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-4">
        <div className="text-sm font-medium text-[var(--ink)] mb-3">✍️ {L('دعوة جديدة', 'New invitation')}</div>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={L('الاسم الأول — كما سيُخاطَب', 'First name — as they will be greeted')} className={inputCls} />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={L('البريد الإلكتروني', 'Email address')} dir="ltr" className={inputCls} />
        </div>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder={L('كلمة شخصية منك تُدرج في البريد (اختياري)', 'A personal note from you, embedded in the email (optional)')} className={`${inputCls} mb-3 resize-none`} />
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="inline-flex border border-[var(--border-default)] rounded-lg overflow-hidden">
            {(['ar', 'en'] as const).map((k) => (
              <button key={k} onClick={() => setLang(k)} className={`px-3 py-1.5 text-[11px] font-medium ${lang === k ? 'bg-[var(--ink)] text-[var(--surface-0)]' : 'text-[var(--ink-2)]'}`}>
                {k === 'ar' ? 'بريد عربي' : 'English email'}
              </button>
            ))}
          </div>
          <button onClick={() => send()} disabled={busy !== null || !name.trim() || !email.trim()} className="text-sm font-semibold text-white bg-[var(--green-dark)] rounded-xl px-5 py-2.5 disabled:opacity-50">
            {busy === 'new' ? L('يُرسل…', 'Sending…') : L('أنشئ وأرسل الدعوة', 'Create & send the invitation')}
          </button>
        </div>
        {error && <p className="text-[11px] text-[#D64545] mt-2">{error}</p>}
        {result && (
          <div className={`mt-3 rounded-xl border px-4 py-3 text-[11px] leading-relaxed ${result.sent ? 'border-[var(--green-border)] bg-[var(--green-bg)]/50 text-[var(--green-dark)]' : 'border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--ink-2)]'}`}>
            {result.sent
              ? <>✓ {L('أُرسلت الدعوة بالبريد — وستتبع رحلتها في القائمة أدناه.', 'The invitation was emailed — follow its journey in the list below.')}</>
              : <>
                  {L('لم يُرسل البريد تلقائياً (لا يوجد RESEND_API_KEY) — أرسلها بنفسك:', 'The email was not sent automatically (no RESEND_API_KEY) — send it yourself:')}
                  <span className="inline-flex gap-2 ms-2">
                    <button onClick={() => copy(result.link, 'rl')} className="font-semibold underline">{copied === 'rl' ? L('نُسخ ✓', 'Copied ✓') : L('انسخ الرابط', 'Copy link')}</button>
                    <button onClick={() => copy(`${result.subject}\n\n${result.text}`, 'rt')} className="font-semibold underline">{copied === 'rt' ? L('نُسخ ✓', 'Copied ✓') : L('انسخ نص البريد', 'Copy email text')}</button>
                  </span>
                </>}
          </div>
        )}
      </div>

      {/* the guest list */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5">
        <div className="flex items-baseline justify-between mb-3">
          <div className="text-sm font-medium text-[var(--ink)]">📜 {L('قائمة الضيوف', 'The guest list')}</div>
          <div className="text-[10px] text-[var(--muted)]">
            {L(`${rows.length} دعوة · ${rows.filter((r) => r.status === 'joined').length} انضمّوا`, `${rows.length} invites · ${rows.filter((r) => r.status === 'joined').length} joined`)}
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="text-[11px] text-[var(--muted)]">{L('لا دعوات بعد — ابدأ بأول اسم تثق برأيه.', 'No invitations yet — start with the first person whose opinion you trust.')}</p>
        ) : (
          <div className="flex flex-col divide-y divide-[var(--border-faint)]">
            {rows.map((r) => {
              const m = STATUS_META[r.status];
              const when = r.joined_at ?? r.opened_at ?? r.sent_at ?? r.created_at;
              return (
                <div key={r.id} className="py-2.5 flex items-center gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-[var(--ink)]">{r.name} <span className="font-normal text-[var(--muted)]" dir="ltr">· {r.email}</span></div>
                    <div className="text-[10px] text-[var(--muted)]" dir="ltr">{new Date(when).toLocaleDateString('en-GB')} · {r.lang === 'ar' ? 'عربي' : 'EN'}</div>
                  </div>
                  <span className="text-[10px] font-bold rounded-full px-2.5 py-1" style={{ color: m.color, background: `color-mix(in srgb, ${m.color} 12%, transparent)` }}>
                    {m.icon} {ar ? m.ar : m.en}
                  </span>
                  <div className="flex gap-1.5">
                    <button onClick={() => copy(`${window.location.origin}/welcome?i=${r.id}`, r.id)} className="text-[10px] font-semibold text-[var(--ink-2)] border border-[var(--border-default)] rounded-lg px-2.5 py-1.5 hover:border-[var(--green)]">
                      {copied === r.id ? L('نُسخ ✓', 'Copied ✓') : L('انسخ الرابط', 'Copy link')}
                    </button>
                    {r.status !== 'joined' && (
                      <button onClick={() => send(r.id)} disabled={busy !== null} className="text-[10px] font-semibold text-[var(--green-dark)] border border-[var(--green-border)] rounded-lg px-2.5 py-1.5 hover:bg-[var(--green-bg)] disabled:opacity-50">
                        {busy === r.id ? L('يُرسل…', 'Sending…') : L('أعد الإرسال', 'Resend')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-[9px] text-[var(--muted)] leading-relaxed mt-3">
        {L('يتطلب تشغيل البرنامج تنفيذ supabase/schema_part20.sql في قاعدة البيانات، وإضافة RESEND_API_KEY في Vercel للإرسال التلقائي.', 'Running the program needs supabase/schema_part20.sql applied in the database, and RESEND_API_KEY in Vercel for automatic sending.')}
      </p>
    </div>
  );
}
