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
import { useDepth } from '@/components/shared/ExperienceMode';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { DEPTH_META, type DepthLevel } from '@/lib/depth';

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
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = useCallback((a: string, e: string) => (ar ? a : e), [ar]);

  const [open, setOpen] = useState(false);
  const holdTimer = useRef<number | undefined>(undefined);
  const suppressed = useRef(false); // Shift is being used for typing/selection
  const cooldown = useRef(0);

  const depthRef = useRef(depth); useEffect(() => { depthRef.current = depth; }, [depth]);
  const setDepthRef = useRef(setDepth); useEffect(() => { setDepthRef.current = setDepth; }, [setDepth]);
  const pathRef = useRef(pathname); useEffect(() => { pathRef.current = pathname; }, [pathname]);

  useEffect(() => {
    const act = (fn: () => void) => {
      const now = Date.now();
      if (now < cooldown.current) return;
      cooldown.current = now + 650;
      fn();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      if (e.key === 'Shift' && !e.repeat) {
        suppressed.current = false;
        window.clearTimeout(holdTimer.current);
        holdTimer.current = window.setTimeout(() => {
          if (!suppressed.current) setOpen(true);
        }, 200);
        return;
      }

      if (!e.shiftKey) return;

      // ⇧B — summon the Brain to comment on the current view
      if (e.key === 'B' || e.key === 'b') {
        if (suppressed.current) return;
        e.preventDefault();
        setOpen(false);
        act(() => window.dispatchEvent(new CustomEvent('mm-brain-summon')));
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
        act(() => { const d = depthRef.current; if (d > 1) setDepthRef.current((d - 1) as DepthLevel); });
      } else if (e.key === 'ArrowDown') {
        act(() => { const d = depthRef.current; if (d < 4) setDepthRef.current((d + 1) as DepthLevel); });
      } else {
        // horizontal = the timeline, in on-screen direction
        const toRight = ar ? -1 : 1;
        const step = e.key === 'ArrowRight' ? toRight : -toRight;
        act(() => {
          const idx = TIME_ROUTES.indexOf(pathRef.current);
          const next = TIME_ROUTES[Math.min(2, Math.max(0, (idx === -1 ? 1 : idx) + step))];
          if (next !== pathRef.current) router.push(next);
        });
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        window.clearTimeout(holdTimer.current);
        suppressed.current = false;
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

  if (!open) return null;

  const idx = TIME_ROUTES.indexOf(pathname);
  const here = idx === -1 ? '/today' : pathname;
  // what sits to each physical side on the timeline
  const rightRoute = TIME_ROUTES[TIME_ROUTES.indexOf(here) + (ar ? -1 : 1)];
  const leftRoute = TIME_ROUTES[TIME_ROUTES.indexOf(here) - (ar ? -1 : 1)];
  const up = depth > 1 ? DEPTH_META[(depth - 1) as DepthLevel] : null;
  const down = depth < 4 ? DEPTH_META[(depth + 1) as DepthLevel] : null;

  const Key = ({ label }: { label: string }) => (
    <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-[var(--border-medium)] bg-[var(--surface-1)] text-[var(--ink)] text-base font-semibold shadow-inner">
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
          <Key label="↑" />
          <Hint text={up ? `${up.icon} ${L(`اصعد إلى «${up.name.ar}»`, `Surface to “${up.name.en}”`)}` : L('أنت على السطح', 'At the surface')} dim={!up} />
        </div>

        {/* ← current → */}
        <div className="flex items-center justify-center gap-4 my-3" dir="ltr">
          <div className="flex flex-col items-center gap-1">
            <Key label="←" />
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
            <Key label="→" />
            <Hint text={rightRoute ? `${TIME_LABEL[rightRoute].icon} ${ar ? TIME_LABEL[rightRoute].ar : TIME_LABEL[rightRoute].en}` : '·'} dim={!rightRoute} />
          </div>
        </div>

        {/* ↓ dive */}
        <div className="flex flex-col items-center gap-1 mt-2">
          <Key label="↓" />
          <Hint text={down ? `${down.icon} ${L(`اغطس إلى «${down.name.ar}»`, `Dive to “${down.name.en}”`)}` : L('أنت في القاع', 'At the deepest point')} dim={!down} />
        </div>

        {/* other commands */}
        <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-[var(--border-faint)]">
          <Key label="B" />
          <Hint text={`🧠 ${L('استدعِ العقل — يعلّق على ما تراه ويجيبك', 'Summon the Brain — it comments on this view and answers you')}`} />
        </div>
      </div>
    </div>
  );
}
