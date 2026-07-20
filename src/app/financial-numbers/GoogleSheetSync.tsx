'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale } from '@/lib/i18n/LocaleProvider';

interface Status {
  configured: boolean;
  connected: boolean;
  email: string | null;
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
}

export default function GoogleSheetSync({ onSynced }: { onSynced: () => void }) {
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/google/status');
      if (res.ok) setStatus(await res.json());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadStatus();
    // Surface the outcome of the OAuth redirect.
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected')) setMsg(L('تم ربط Google.', 'Google connected.'));
    const gerror = params.get('gerror');
    if (gerror) {
      const map: Record<string, string> = {
        not_configured: L('لم يُفعَّل تكامل Google على الخادم بعد.', 'Google integration is not set up on the server yet.'),
        state: L('فشل التحقّق الأمني — يُرجى محاولة الربط مرة أخرى.', 'Security check failed — please try connecting again.'),
        no_refresh: L('لم يُرجِع Google صلاحية الوصول دون اتصال. حاول مجدداً ووافق على كل الأذونات.', 'Google did not return offline access. Try again and approve all prompts.'),
        exchange: L('تعذّر إكمال تسجيل الدخول عبر Google. يُرجى المحاولة مرة أخرى.', 'Could not complete the Google sign-in. Please try again.'),
      };
      setMsg(map[gerror] ?? L('فشل الاتصال بـ Google.', 'Google connection failed.'));
    }
    if (params.get('connected') || gerror) {
      window.history.replaceState({}, '', '/financial-numbers');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadStatus]);

  async function disconnect() {
    setBusy(true);
    await fetch('/api/integrations/google/disconnect', { method: 'POST' });
    setBusy(false);
    setMsg(L('تم قطع الاتصال.', 'Disconnected.'));
    loadStatus();
  }

  async function linkSheet() {
    if (!urlInput.trim()) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch('/api/integrations/google/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: urlInput }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) {
      setUrlInput('');
      setMsg(L('تم ربط الجدول.', 'Sheet linked.'));
      loadStatus();
    } else {
      setMsg(data.error ?? L('تعذّر ربط ذلك الجدول.', 'Could not link that sheet.'));
    }
  }

  async function pull() {
    setBusy(true);
    setMsg(null);
    const res = await fetch('/api/integrations/google/pull', { method: 'POST' });
    const data = await res.json();
    setBusy(false);
    if (res.ok) {
      setMsg(
        data.imported > 0
          ? L(`تم سحب ${data.imported} ${data.imported === 1 ? 'شهر' : 'شهراً'} من الجدول.`, `Pulled ${data.imported} month${data.imported === 1 ? '' : 's'} from the sheet.`)
          : (data.message ?? L('لم يُعثَر على صفوف.', 'No rows found.'))
      );
      onSynced();
    } else {
      setMsg(data.error ?? L('فشل السحب.', 'Pull failed.'));
    }
  }

  async function push() {
    setBusy(true);
    setMsg(null);
    const res = await fetch('/api/integrations/google/push', { method: 'POST' });
    const data = await res.json();
    setBusy(false);
    if (res.ok) {
      setMsg(L(`تم دفع ${data.exported} ${data.exported === 1 ? 'شهر' : 'شهراً'} إلى الجدول.`, `Pushed ${data.exported} month${data.exported === 1 ? '' : 's'} to the sheet.`));
      loadStatus();
    } else {
      setMsg(data.error ?? L('فشل الدفع.', 'Push failed.'));
    }
  }

  if (!status) return null;

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-2.5 mb-1">
        <span className="text-lg">🔗</span>
        <h2 className="font-serif text-lg font-semibold text-[var(--ink)]">{L('المزامنة مع Google Sheets', 'Sync with Google Sheets')}</h2>
      </div>

      {!status.configured ? (
        <p className="text-xs text-[var(--muted)]">
          {L(
            'لم يُفعَّل تكامل Google Sheets على الخادم بعد. بمجرّد ضبط بيانات اعتماد OAuth، ستتمكّن من ربط جدول هنا للمزامنة في الاتجاهين.',
            "The Google Sheets integration isn't configured on the server yet. Once the OAuth credentials are set, you'll be able to connect a sheet here for two-way sync."
          )}
        </p>
      ) : !status.connected ? (
        <>
          <p className="text-xs text-[var(--muted)] mb-3 max-w-xl">
            {L(
              'اربط حساب Google لمزامنة هذه الأرقام مع جدول Google — اسحب جدولاً تحتفظ به أصلاً، أو ادفع أرقامك إلى جدول، في كلا الاتجاهين.',
              'Connect your Google account to sync these numbers with a Google Sheet — pull a sheet you already keep, or push yours out to one, both directions.'
            )}
          </p>
          <a
            href="/api/integrations/google/start"
            className="inline-block text-sm bg-[var(--green-dark)] text-white rounded-lg px-4 py-2 font-medium"
          >
            {L('ربط Google Sheets', 'Connect Google Sheets')}
          </a>
        </>
      ) : (
        <>
          <p className="text-xs text-[var(--muted)] mb-3">
            {L('متّصل', 'Connected')}{status.email ? ` ${L('باسم', 'as')} ${status.email}` : ''}.
            {status.spreadsheetUrl ? (
              <>
                {' '}{L('الجدول المرتبط:', 'Linked sheet:')}{' '}
                <a href={status.spreadsheetUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--green-dark)] font-medium underline">
                  {L('فتح في Google Sheets ↗', 'open in Google Sheets ↗')}
                </a>
              </>
            ) : (
              ` ${L('لا يوجد جدول مرتبط بعد.', 'No sheet linked yet.')}`
            )}
          </p>

          {!status.spreadsheetId && (
            <div className="flex flex-wrap items-end gap-2 mb-3">
              <div className="flex-1 min-w-[200px]">
                <label className="text-[11px] text-[var(--muted)] block mb-1">{L('الصق رابط جدول Google موجود لربطه', 'Paste an existing Google Sheet link to link it')}</label>
                <input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/…"
                  dir="ltr"
                  className="w-full bg-[var(--surface-1)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--green)]"
                />
              </div>
              <button onClick={linkSheet} disabled={busy} className="text-sm border border-[var(--border-default)] text-[var(--ink-2)] rounded-lg px-4 py-2 font-medium disabled:opacity-50">
                {L('ربط الجدول', 'Link sheet')}
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={pull} disabled={busy || !status.spreadsheetId} className="text-sm bg-[var(--green-dark)] text-white rounded-lg px-4 py-2 font-medium disabled:opacity-50" title={!status.spreadsheetId ? L('اربط جدولاً أولاً', 'Link a sheet first') : ''}>
              {L('سحب من الجدول ←', 'Pull from sheet →')}
            </button>
            <button onClick={push} disabled={busy} className="text-sm bg-[var(--green-dark)] text-white rounded-lg px-4 py-2 font-medium disabled:opacity-50">
              {status.spreadsheetId ? L('دفع إلى الجدول', 'Push to sheet') : L('إنشاء ودفع إلى جدول جديد', 'Create & push to a new sheet')}
            </button>
            <button onClick={disconnect} disabled={busy} className="text-xs text-[var(--muted)] hover:text-[#C0504D] ms-auto">
              {L('قطع الاتصال', 'Disconnect')}
            </button>
          </div>
        </>
      )}

      {msg && <p className="text-xs text-[var(--ink-2)] mt-3">{msg}</p>}
    </div>
  );
}
