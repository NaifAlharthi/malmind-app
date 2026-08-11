'use client';

// Command mode — hold Shift and the product becomes keyboard-navigable:
// a centered palette appears showing the 2D map, and while Shift is held
//   ↑ / ↓  travel the iceberg (surface / dive one depth)
//   ← / →  travel the timeline (past · today · future, following the
//           on-screen direction, so → always means "the view to the right")
// The palette never appears while typing in a field, and a brief hold
// delay keeps it from flashing during Shift+letter typing.

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useDepth, useXMode } from '@/components/shared/ExperienceMode';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { DEPTH_META, type DepthLevel } from '@/lib/depth';
import { XMODES, XMODE_META, type XMode } from '@/lib/experienceMode';

const TIME_ROUTES = ['/past', '/today', '/future'];
const TIME_LABEL: Record<string, { ar: string; en: string; icon: string }> = {
  '/past': { ar: 'الماضي', en: 'The Past', icon: '🕰' },
  '/today': { ar: 'اليوم', en: 'Today', icon: '☀' },
  '/future': { ar: 'المستقبل', en: 'The Future', icon: '🔭' },
};

function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
}

export default function CommandMode() {
  const router = useRouter();
  const pathname = usePathname();
  const { depth, setDepth } = useDepth();
  const { mode, setMode } = useXMode();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = useCallback((a: string, e: string) => (ar ? a : e), [ar]);

  const [open, setOpen] = useState(false);
  // which key is lighting up right now (the choice flashes before executing)
  const [activeKey, setActiveKey] = useState<'up' | 'down' | 'left' | 'right' | 'b' | null>(null);
  const holdTimer = useRef<number | undefined>(undefined);
  const suppressed = useRef(false); // Shift is being used for typing/selection
  const cooldown = useRef(0);
  // ⇧B press tracking: a tap summons the side figure, a long press opens
  // the full Brain page.
  const bTimer = useRef<number | undefined>(undefined);
  const bActive = useRef(false);
  const bLongFired = useRef(false);
  // ⇧M mode cycling (alt-tab style): each press advances the candidate,
  // idle or releasing Shift confirms it.
  const [modeSel, setModeSel] = useState<XMode | null>(null);
  const modeSelRef = useRef<XMode | null>(null);
  useEffect(() => { modeSelRef.current = modeSel; }, [modeSel]);
  const mConfirmTimer = useRef<number | undefined>(undefined);
  const mThrottle = useRef(0);
  const MODE_CONFIRM_MS = 1500;

  const depthRef = useRef(depth); useEffect(() => { depthRef.current = depth; }, [depth]);
  const setDepthRef = useRef(setDepth); useEffect(() => { setDepthRef.current = setDepth; }, [setDepth]);
  const modeRef = useRef(mode); useEffect(() => { modeRef.current = mode; }, [mode]);
  const setModeRef = useRef(setMode); useEffect(() => { setModeRef.current = setMode; }, [setMode]);
  const pathRef = useRef(pathname); useEffect(() => { pathRef.current = pathname; }, [pathname]);

  useEffect(() => {
    const act = (fn: () => void) => {
      const now = Date.now();
      if (now < cooldown.current) return;
      cooldown.current = now + 650;
      fn();
    };

    // ⇧M confirm: apply the candidate mode and close the switcher.
    const confirmMode = () => {
      window.clearTimeout(mConfirmTimer.current);
      const sel = modeSelRef.current;
      if (sel) {
        setModeRef.current(sel);
        setModeSel(null);
      }
    };

    // Highlight the chosen key in the palette first, THEN execute — the
    // palette acknowledges the choice before the view moves.
    const trigger = (keyId: 'up' | 'down' | 'left' | 'right', fn: () => void) => {
      const now = Date.now();
      if (now < cooldown.current) return;
      cooldown.current = now + 650;
      setOpen(true); // even if the hold delay hasn't elapsed yet
      setActiveKey(keyId);
      window.setTimeout(fn, 180);
      window.setTimeout(() => setActiveKey(null), 520);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      if (e.key === 'Shift') {
        // holding Shift auto-repeats this event — repeats must never fall
        // through to the "Shift is being used for typing" branch below
        if (e.repeat) return;
        suppressed.current = false;
        window.clearTimeout(holdTimer.current);
        holdTimer.current = window.setTimeout(() => {
          if (!suppressed.current) setOpen(true);
        }, 200);
        return;
      }

      if (!e.shiftKey) return;

      // ⇧B — tap: the Brain figure comments here · long press: full Brain page
      // (match the physical key, so Arabic and other layouts work too)
      if (e.code === 'KeyB' || e.key === 'B' || e.key === 'b') {
        if (suppressed.current) return;
        e.preventDefault();
        if (e.repeat) return; // key auto-repeat while held — the timer decides
        bActive.current = true;
        bLongFired.current = false;
        setActiveKey('b');
        window.clearTimeout(bTimer.current);
        bTimer.current = window.setTimeout(() => {
          bLongFired.current = true;
          bActive.current = false;
          setOpen(false);
          router.push('/advisor');
        }, 550);
        return;
      }

      // ⇧M — cycle the experience modes alt-tab style; idle or releasing
      // Shift confirms the highlighted one (physical key: layout-independent)
      if (e.code === 'KeyM' || e.key === 'M' || e.key === 'm') {
        if (suppressed.current) return;
        e.preventDefault();
        const now = Date.now();
        if (now - mThrottle.current < 220) return; // readable cycling pace
        mThrottle.current = now;
        setOpen(false); // the switcher takes the stage
        const base = modeSelRef.current ?? modeRef.current;
        const next = XMODES[(XMODES.indexOf(base) + 1) % XMODES.length];
        setModeSel(next);
        window.clearTimeout(mConfirmTimer.current);
        mConfirmTimer.current = window.setTimeout(confirmMode, MODE_CONFIRM_MS);
        return;
      }

      // Escape cancels a pending mode selection without applying it
      if (e.key === 'Escape' && modeSelRef.current) {
        window.clearTimeout(mConfirmTimer.current);
        setModeSel(null);
        return;
      }

      const isArrow = e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight';
      if (!isArrow) {
        // Shift is being used for something else (typing, shortcuts)
        suppressed.current = true;
        setOpen(false);
        return;
      }
      if (suppressed.current) return;
      e.preventDefault();

      if (e.key === 'ArrowUp') {
        trigger('up', () => { const d = depthRef.current; if (d > 1) setDepthRef.current((d - 1) as DepthLevel); });
      } else if (e.key === 'ArrowDown') {
        trigger('down', () => { const d = depthRef.current; if (d < 4) setDepthRef.current((d + 1) as DepthLevel); });
      } else {
        // horizontal = the timeline, in on-screen direction
        const toRight = ar ? -1 : 1;
        const step = e.key === 'ArrowRight' ? toRight : -toRight;
        trigger(e.key === 'ArrowRight' ? 'right' : 'left', () => {
          const idx = TIME_ROUTES.indexOf(pathRef.current);
          const next = TIME_ROUTES[Math.min(2, Math.max(0, (idx === -1 ? 1 : idx) + step))];
          if (next !== pathRef.current) router.push(next);
        });
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyB' || e.key === 'B' || e.key === 'b') {
        window.clearTimeout(bTimer.current);
        window.setTimeout(() => setActiveKey(null), 300);
        if (bActive.current && !bLongFired.current) {
          // a tap — the figure comments right here, no navigation
          bActive.current = false;
          setOpen(false);
          act(() => window.dispatchEvent(new CustomEvent('mm-brain-summon')));
        }
        return;
      }
      if (e.key === 'Shift') {
        window.clearTimeout(holdTimer.current);
        window.clearTimeout(bTimer.current);
        bActive.current = false;
        suppressed.current = false;
        confirmMode(); // releasing Shift confirms a pending mode, alt-tab style
        setOpen(false);
      }
    };
    const onBlur = () => { window.clearTimeout(holdTimer.current); setOpen(false); };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.clearTimeout(holdTimer.current);
    };
  }, [router, ar]);

  if (!open && !modeSel) return null;

  // ── the ⇧M mode switcher: the top bar's segmented control, center stage ──
  if (modeSel) {
    return (
      <div className="fixed inset-0 z-[95] pointer-events-none flex items-center justify-center" role="status" aria-live="polite">
        <div
          className="rounded-2xl border border-[var(--border-default)] backdrop-blur-md px-7 py-6 shadow-2xl text-center"
          style={{ background: 'color-mix(in srgb, var(--surface-card) 88%, transparent)' }}
          dir={ar ? 'rtl' : 'ltr'}
        >
          <div className="flex items-center justify-center gap-2 mb-4 text-[var(--ink)]">
            <span className="inline-flex items-center justify-center h-7 px-2.5 rounded-md border border-[var(--border-medium)] bg-[var(--surface-1)] text-sm font-bold">⇧ M</span>
            <span className="text-xs font-semibold tracking-wide">{L('تبديل النمط', 'Switch mode')}</span>
          </div>

          {/* the same segmented control as the top bar, enlarged */}
          <div className="flex items-center bg-[var(--surface-1)] border border-[var(--border-default)] rounded-full p-1 w-fit mx-auto" role="radiogroup">
            {XMODES.map((m) => {
              const meta = XMODE_META[m];
              const candidate = m === modeSel;
              return (
                <span
                  key={m}
                  role="radio"
                  aria-checked={candidate}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm transition-all whitespace-nowrap ${
                    candidate
                      ? 'bg-[var(--ink)] text-[var(--surface-0)] font-semibold shadow-sm ring-2 ring-[var(--green)]/50 scale-105'
                      : 'text-[var(--muted)]'
                  }`}
                >
                  <span className="leading-none">{meta.icon}</span>
                  <span>{ar ? meta.label.ar : meta.label.en}</span>
                </span>
              );
            })}
          </div>

          <div className="text-[10px] text-[var(--muted)] mt-3 mb-1.5">
            {L('اضغط M للتنقّل · أفلت Shift للتأكيد', 'Press M to cycle · release Shift to confirm')}
          </div>
          {/* the confirm countdown, restarting with every press */}
          <div className="w-40 h-1 rounded-full bg-[var(--surface-1)] overflow-hidden mx-auto" key={modeSel + String(mThrottle.current)}>
            <span
              className="block h-full bg-[var(--green)]"
              style={{ animation: `mmModeConfirm ${MODE_CONFIRM_MS}ms linear forwards` }}
            />
          </div>
        </div>
      </div>
    );
  }

  const idx = TIME_ROUTES.indexOf(pathname);
  const here = idx === -1 ? '/today' : pathname;
  // what sits to each physical side on the timeline
  const rightRoute = TIME_ROUTES[TIME_ROUTES.indexOf(here) + (ar ? -1 : 1)];
  const leftRoute = TIME_ROUTES[TIME_ROUTES.indexOf(here) - (ar ? -1 : 1)];
  const up = depth > 1 ? DEPTH_META[(depth - 1) as DepthLevel] : null;
  const down = depth < 4 ? DEPTH_META[(depth + 1) as DepthLevel] : null;

  const Key = ({ label, active }: { label: string; active?: boolean }) => (
    <span
      className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border text-base font-semibold transition-all duration-150 ${
        active
          ? 'border-[var(--green)] bg-[var(--green-bg)] text-[var(--green-dark)] ring-2 ring-[var(--green)]/40 scale-110 shadow-lg'
          : 'border-[var(--border-medium)] bg-[var(--surface-1)] text-[var(--ink)] shadow-inner'
      }`}
    >
      {label}
    </span>
  );
  const Hint = ({ text, dim }: { text: string; dim?: boolean }) => (
    <span className={`text-[11px] whitespace-nowrap ${dim ? 'text-[var(--muted)] opacity-50' : 'text-[var(--ink-2)]'}`}>{text}</span>
  );

  return (
    <div className="fixed inset-0 z-[95] pointer-events-none flex items-center justify-center" role="status" aria-live="polite">
      {/* just-slightly transparent, tinted by the page's own surface palette */}
      <div
        className="rounded-2xl border border-[var(--border-default)] backdrop-blur-md px-7 py-6 shadow-2xl text-center"
        style={{ background: 'color-mix(in srgb, var(--surface-card) 88%, transparent)' }}
        dir={ar ? 'rtl' : 'ltr'}
      >
        <div className="flex items-center justify-center gap-2 mb-4 text-[var(--ink)]">
          <span className="inline-flex items-center justify-center h-7 px-2.5 rounded-md border border-[var(--border-medium)] bg-[var(--surface-1)] text-sm font-bold">⇧ Shift</span>
          <span className="text-xs font-semibold tracking-wide">{L('وضع الأوامر', 'Command mode')}</span>
        </div>

        {/* ↑ surface */}
        <div className="flex flex-col items-center gap-1 mb-2">
          <Key label="↑" active={activeKey === 'up'} />
          <Hint text={up ? `${up.icon} ${L(`اصعد إلى «${up.name.ar}»`, `Surface to “${up.name.en}”`)}` : L('أنت على السطح', 'At the surface')} dim={!up} />
        </div>

        {/* ← current → */}
        <div className="flex items-center justify-center gap-4 my-3" dir="ltr">
          <div className="flex flex-col items-center gap-1">
            <Key label="←" active={activeKey === 'left'} />
            <Hint text={leftRoute ? `${TIME_LABEL[leftRoute].icon} ${ar ? TIME_LABEL[leftRoute].ar : TIME_LABEL[leftRoute].en}` : '·'} dim={!leftRoute} />
          </div>
          <div className="px-4 py-2 rounded-xl bg-[var(--surface-1)] border border-[var(--border-default)] text-[var(--ink)]">
            <div className="text-[10px] text-[var(--muted)] mb-0.5">{L('أنت الآن', 'You are at')}</div>
            <div className="text-xs font-semibold whitespace-nowrap">
              {TIME_LABEL[here].icon} {ar ? TIME_LABEL[here].ar : TIME_LABEL[here].en}
              <span className="text-[var(--muted)]"> · </span>
              {DEPTH_META[depth].icon} {ar ? DEPTH_META[depth].name.ar : DEPTH_META[depth].name.en}
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Key label="→" active={activeKey === 'right'} />
            <Hint text={rightRoute ? `${TIME_LABEL[rightRoute].icon} ${ar ? TIME_LABEL[rightRoute].ar : TIME_LABEL[rightRoute].en}` : '·'} dim={!rightRoute} />
          </div>
        </div>

        {/* ↓ dive */}
        <div className="flex flex-col items-center gap-1 mt-2">
          <Key label="↓" active={activeKey === 'down'} />
          <Hint text={down ? `${down.icon} ${L(`اغطس إلى «${down.name.ar}»`, `Dive to “${down.name.en}”`)}` : L('أنت في القاع', 'At the deepest point')} dim={!down} />
        </div>

        {/* other commands */}
        <div className="flex flex-col items-center gap-2 mt-4 pt-3 border-t border-[var(--border-faint)]">
          <div className="flex items-center justify-center gap-2">
            <Key label="B" active={activeKey === 'b'} />
            <Hint text={`🧠 ${L('نقرة: يعلّق العقل هنا · مطوّلاً: صفحة العقل', 'Tap: the Brain comments here · hold: full Brain page')}`} />
          </div>
          <div className="flex items-center justify-center gap-2">
            <Key label="M" />
            <Hint text={`${XMODE_META[mode].icon} ${L('بدّل النمط — أرشدني · شبه محترف · محترف', 'Switch mode — Guide me · Semi-pro · Pro')}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
