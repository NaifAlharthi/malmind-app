'use client';

// A single, reusable "Contact us" dialog used from the signup, login and home
// pages. It posts to /api/contact, which captures every inquiry in Supabase
// and (when configured) emails the right inbox. Fully bilingual + RTL-aware,
// self-contained so any page can drop in <ContactModal open .../>.

import { useEffect, useState } from 'react';
import { useLocale } from '@/lib/i18n/LocaleProvider';

type Category = 'support' | 'investment' | 'partnership' | 'general';

const CATEGORIES: { id: Category; icon: string; ar: string; en: string }[] = [
  { id: 'support', icon: '💬', ar: 'دعم العملاء', en: 'Customer support' },
  { id: 'investment', icon: '📈', ar: 'استفسار استثماري', en: 'Investment inquiry' },
  { id: 'partnership', icon: '🤝', ar: 'شراكة', en: 'Partnership' },
  { id: 'general', icon: '✉️', ar: 'استفسار عام', en: 'General' },
];

export default function ContactModal({
  open,
  onClose,
  source,
  defaultCategory = 'general',
}: {
  open: boolean;
  onClose: () => void;
  source: string;
  defaultCategory?: Category;
}) {
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);

  const [category, setCategory] = useState<Category>(defaultCategory);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [company, setCompany] = useState(''); // honeypot — must stay empty
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Reset to a clean slate whenever the dialog is (re)opened.
  useEffect(() => {
    if (open) {
      setCategory(defaultCategory);
      setStatus('idle');
      setErrorMsg('');
    }
  }, [open, defaultCategory]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, name, email, subject, message, company, source, locale }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'failed');
      }
      setStatus('sent');
      setName(''); setEmail(''); setSubject(''); setMessage('');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error && err.message !== 'failed' ? err.message : '');
    }
  }

  const field =
    'w-full border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm bg-[var(--surface-0)] outline-none focus:border-[var(--green)]';

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        dir={ar ? 'rtl' : 'ltr'}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto"
      >
        <div className="absolute inset-x-0 top-0 h-1" style={{ background: 'linear-gradient(90deg, #1D9E75, #17B8C9, #C9A84C)' }} aria-hidden />
        <button
          onClick={onClose}
          className="absolute top-3 end-3 w-8 h-8 rounded-full flex items-center justify-center text-[var(--muted)] hover:bg-[var(--surface-1)]"
          aria-label={L('إغلاق', 'Close')}
        >
          ✕
        </button>

        <div className="p-6">
          {status === 'sent' ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-[var(--green-bg)] border border-[var(--green-border)] flex items-center justify-center text-2xl mx-auto mb-4">
                ✓
              </div>
              <h2 className="font-serif text-xl font-semibold text-[var(--ink)] mb-2">
                {L('وصلتنا رسالتك', 'Message received')}
              </h2>
              <p className="text-sm text-[var(--ink-2)] leading-relaxed mb-5">
                {L(
                  'شكراً لتواصلك معنا. سنردّ على بريدك في أقرب وقت.',
                  "Thanks for reaching out. We'll reply to your email as soon as we can."
                )}
              </p>
              <button
                onClick={onClose}
                className="bg-[var(--green-dark)] text-white rounded-lg px-5 py-2 text-sm font-medium"
              >
                {L('تمام', 'Done')}
              </button>
            </div>
          ) : (
            <>
              <h2 className="font-serif text-2xl font-semibold text-[var(--ink)] mb-1">
                {L('تواصل معنا', 'Contact us')}
              </h2>
              <p className="text-sm text-[var(--ink-2)] mb-5">
                {L(
                  'دعم، استفسار استثماري، أو شراكة — نقرأ كل رسالة.',
                  'Support, an investment inquiry, or a partnership — we read every message.'
                )}
              </p>

              {/* category chips */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {CATEGORIES.map((c) => {
                  const active = c.id === category;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id)}
                      className={`text-start rounded-lg px-3 py-2 text-xs border transition-colors ${
                        active
                          ? 'border-[var(--green)] bg-[var(--green-bg)] text-[var(--green-dark)] font-medium'
                          : 'border-[var(--border-default)] text-[var(--ink-2)] hover:border-[var(--green-border)]'
                      }`}
                    >
                      {c.icon} {L(c.ar, c.en)}
                    </button>
                  );
                })}
              </div>

              <form onSubmit={submit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[var(--muted)] block mb-1">{L('الاسم', 'Name')}</label>
                    <input required value={name} onChange={(e) => setName(e.target.value)} className={field} />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--muted)] block mb-1">{L('البريد الإلكتروني', 'Email')}</label>
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-[var(--muted)] block mb-1">{L('الموضوع (اختياري)', 'Subject (optional)')}</label>
                  <input value={subject} onChange={(e) => setSubject(e.target.value)} className={field} />
                </div>
                <div>
                  <label className="text-xs text-[var(--muted)] block mb-1">{L('رسالتك', 'Your message')}</label>
                  <textarea required rows={4} value={message} onChange={(e) => setMessage(e.target.value)} className={`${field} resize-none`} />
                </div>

                {/* honeypot: hidden from users, catches bots */}
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="hidden"
                  aria-hidden
                />

                {status === 'error' && (
                  <div className="text-xs text-[var(--red-dark-text)] bg-[var(--red-bg)] border border-[var(--red-border)] rounded-lg px-3 py-2">
                    {errorMsg ||
                      L('تعذّر الإرسال. جرّب مجدداً أو راسلنا مباشرة على ', 'Could not send. Try again or email us directly at ')}
                    <a href="mailto:hello@malmind.ai" className="underline font-medium">hello@malmind.ai</a>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="w-full bg-[var(--green-dark)] text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
                >
                  {status === 'sending' ? L('جارٍ الإرسال…', 'Sending…') : L('إرسال', 'Send message')}
                </button>

                <p className="text-[11px] text-[var(--muted)] text-center pt-1">
                  {L('أو راسلنا على ', 'Or email us at ')}
                  <a href="mailto:hello@malmind.ai" className="text-[var(--green-dark)] font-medium">hello@malmind.ai</a>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
