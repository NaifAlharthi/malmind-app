'use client';

// The iceberg — the product's depth dimension. A slim vertical rail perched
// on the start edge of the viewport (desktop only): the tip of an iceberg
// above a waterline, three chunks sinking below it. Each chunk is one depth
// of the person's CURRENT position (bad version · baseline · ahead ·
// ceiling), and clicking one dives into a full-screen ocean overlay with
// one section per depth. Together with the top bar's Past·Today·Future
// timeline this gives the product two axes: time runs horizontally, depth
// runs vertically.
//
// Navigation grammar (inside the dive):
//   wheel / ↑↓ — move between depths
//   wheel tilt (deltaX) / ←→ — move through time (past · today · future)
//   Esc — surface

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { diagnoseQuadrant, QUADRANT_META, type QuadKey } from '@/lib/quadrant';
import { DEPTH_COPY, DEPTH_LEVELS, DEPTH_META, assessDepthLevel, type DepthLevel } from '@/lib/depth';
import Link from 'next/link';

const TIME_ROUTES = ['/past', '/today', '/future'];

export default function DepthRail() {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = useCallback((a: string, e: string) => (ar ? a : e), [ar]);

  const [quad, setQuad] = useState<QuadKey | null>(null);
  const [myLevel, setMyLevel] = useState<DepthLevel>(2);
  const [dive, setDive] = useState<DepthLevel | null>(null); // open overlay at this level
  const [hover, setHover] = useState<DepthLevel | null>(null);
  const seaRef = useRef<HTMLDivElement>(null);
  const timeCooldown = useRef(0);

  // Same diagnosis inputs as the home card: last six snapshots.
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: snaps } = await supabase
        .from('financial_snapshots')
        .select('cash, stocks, real_estate, equity, other_assets, liabilities, income, expenses')
        .eq('user_id', user.id)
        .order('year', { ascending: true })
        .order('month', { ascending: true });
      if (!snaps || snaps.length === 0) return;
      const last = snaps[snaps.length - 1];
      const assets =
        Number(last.cash) + Number(last.stocks) + Number(last.real_estate) + Number(last.equity) + Number(last.other_assets);
      const recent = snaps.slice(-6);
      const avgIncome = recent.reduce((a, r) => a + Number(r.income), 0) / recent.length;
      const avgExpenses = recent.reduce((a, r) => a + Number(r.expenses), 0) / recent.length;
      setQuad(diagnoseQuadrant(avgIncome, avgExpenses, assets));
      setMyLevel(assessDepthLevel(avgIncome, avgExpenses, Number(last.cash), Number(last.stocks) + Number(last.equity)));
    })();
  }, [supabase]);

  // Scroll the dive to a level's section.
  const scrollToLevel = useCallback((lvl: DepthLevel, smooth = true) => {
    const el = seaRef.current;
    if (!el) return;
    el.scrollTo({ top: (lvl - 1) * el.clientHeight, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  // Open the dive at a level.
  const openDive = useCallback((lvl: DepthLevel) => {
    setDive(lvl);
    requestAnimationFrame(() => requestAnimationFrame(() => scrollToLevel(lvl, false)));
  }, [scrollToLevel]);

  // Which level the dive is currently showing (derived from scroll).
  const [seaLevel, setSeaLevel] = useState<DepthLevel>(1);
  const onSeaScroll = useCallback(() => {
    const el = seaRef.current;
    if (!el) return;
    const lvl = (Math.round(el.scrollTop / el.clientHeight) + 1) as DepthLevel;
    if (lvl >= 1 && lvl <= 4) setSeaLevel(lvl);
  }, []);

  // Time travel: wheel tilt / arrow keys move across past·today·future and
  // surface, so the dive feels like strafing through the product's 2D map.
  const travelTime = useCallback((dir: 1 | -1) => {
    const now = Date.now();
    if (now - timeCooldown.current < 700) return;
    timeCooldown.current = now;
    const idx = TIME_ROUTES.indexOf(pathname);
    const next = TIME_ROUTES[Math.min(2, Math.max(0, (idx === -1 ? 1 : idx) + dir))];
    if (next !== pathname) {
      setDive(null);
      router.push(next);
    }
  }, [pathname, router]);

  // Keyboard + horizontal wheel inside the dive.
  useEffect(() => {
    if (dive === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDive(null);
      if (e.key === 'ArrowDown') { e.preventDefault(); scrollToLevel(Math.min(4, seaLevel + 1) as DepthLevel); }
      if (e.key === 'ArrowUp') { e.preventDefault(); scrollToLevel(Math.max(1, seaLevel - 1) as DepthLevel); }
      if (e.key === 'ArrowRight') travelTime(ar ? -1 : 1);
      if (e.key === 'ArrowLeft') travelTime(ar ? 1 : -1);
    };
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > 24 && Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.5) {
        e.preventDefault();
        travelTime(e.deltaX > 0 ? 1 : -1); // tilt is physical, not logical
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('wheel', onWheel);
    };
  }, [dive, seaLevel, scrollToLevel, travelTime, ar]);

  const q: QuadKey = quad ?? 'A';
  const qMeta = QUADRANT_META[q];
  const qc = ar ? qMeta.ar : qMeta.en;

  return (
    <>
      {/* ── the iceberg rail ── */}
      <div
        className="mm-depth-rail hidden lg:flex fixed start-3 top-1/2 -translate-y-1/2 z-30 flex-col items-center select-none"
        aria-label={L('عمق موقفك', 'The depth of your position')}
      >
        <div className="text-[9px] text-[var(--muted)] mb-1 tracking-wide">{L('العمق', 'Depth')}</div>
        <div className="relative">
          <svg width="56" height="240" viewBox="0 0 56 240" aria-hidden="true">
            {/* waterline */}
            <line x1="0" y1="44" x2="56" y2="44" stroke="#4A85B9" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
            {/* the tip — the smallest piece, all that shows above water */}
            <polygon points="28,14 33,27 35,42 20,42 23,25" fill={hover === 1 || (dive !== null && seaLevel === 1) ? '#F3FAFF' : '#DDEEFA'} stroke="#9CC8E8" strokeWidth="1" />
            {/* submerged mass — each chunk wider than the one above it */}
            <polygon points="17,48 39,48 44,100 12,102" fill={hover === 2 || (dive !== null && seaLevel === 2) ? '#7FB6DE' : '#5E9CCB'} opacity="0.92" />
            <polygon points="10,106 46,105 51,164 6,166" fill={hover === 3 || (dive !== null && seaLevel === 3) ? '#3F7AAE' : '#2F6494'} opacity="0.92" />
            <polygon points="4,170 52,169 47,224 28,236 9,226" fill={hover === 4 || (dive !== null && seaLevel === 4) ? '#1E4E7A' : '#153D63'} opacity="0.95" />
          </svg>

          {/* click zones + you-are-here marker */}
          {DEPTH_LEVELS.map((lvl) => {
            const zones = [
              { top: 0, height: 44 },
              { top: 44, height: 60 },
              { top: 104, height: 64 },
              { top: 168, height: 72 },
            ][lvl - 1];
            const meta = DEPTH_META[lvl];
            return (
              <button
                key={lvl}
                onClick={() => openDive(lvl)}
                onMouseEnter={() => setHover(lvl)}
                onMouseLeave={() => setHover(null)}
                className="absolute start-0 w-full cursor-pointer group"
                style={{ top: zones.top, height: zones.height }}
                title={`${meta.icon} ${ar ? meta.name.ar : meta.name.en}`}
                aria-label={ar ? meta.name.ar : meta.name.en}
              >
                {myLevel === lvl && (
                  <span className="absolute top-1/2 -translate-y-1/2 -end-1.5 w-3 h-3 rounded-full bg-[var(--gold)] ring-2 ring-[var(--surface-0)] animate-pulse" />
                )}
                {/* hover flyout */}
                <span className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-full ms-2 whitespace-nowrap rounded-lg bg-[var(--surface-card)] border border-[var(--border-default)] px-2.5 py-1 text-[10px] text-[var(--ink-2)] opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                  {meta.icon} {ar ? meta.name.ar : meta.name.en}
                  {myLevel === lvl && <span className="text-[var(--gold)] font-semibold"> · {L('أنت هنا', 'you are here')}</span>}
                </span>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => openDive(myLevel)}
          className="mt-1.5 text-[9px] text-[var(--muted)] hover:text-[var(--ink-2)] transition-colors leading-tight text-center"
        >
          {L('اغطس ↓', 'Dive ↓')}
        </button>
      </div>

      {/* ── the dive ── */}
      {dive !== null && (
        <div className="fixed inset-0 z-[95]" role="dialog" aria-modal="true" aria-label={L('الغوص في عمق موقفك', 'Diving into your position')}>
          {/* surface button + header */}
          <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-5 py-3 text-white/90">
            <div className="text-xs">
              <span className="opacity-70">{L('موقفك:', 'Your position:')}</span>{' '}
              <span className="font-semibold">{qMeta.icon} {qc.title}</span>
            </div>
            <button
              onClick={() => setDive(null)}
              className="rounded-full bg-white/10 hover:bg-white/20 border border-white/20 px-3.5 py-1.5 text-xs transition-colors"
            >
              {L('اصعد للسطح ✕', 'Surface ✕')}
            </button>
          </div>

          {/* depth meter */}
          <div className="absolute start-4 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-1.5">
            {DEPTH_LEVELS.map((lvl) => (
              <button
                key={lvl}
                onClick={() => scrollToLevel(lvl)}
                className="flex flex-col items-center group"
                aria-label={ar ? DEPTH_META[lvl].name.ar : DEPTH_META[lvl].name.en}
              >
                <span
                  className={`rounded-full transition-all ${
                    seaLevel === lvl ? 'w-2.5 h-2.5 bg-white' : 'w-1.5 h-1.5 bg-white/40 group-hover:bg-white/70'
                  }`}
                />
                {lvl < 4 && <span className="w-px h-5 bg-white/20" />}
              </button>
            ))}
            <div className="mt-2 text-[9px] text-white/60" dir="ltr">{ar ? DEPTH_META[seaLevel].depth.ar : DEPTH_META[seaLevel].depth.en}</div>
          </div>

          {/* the ocean: one full-height snap section per depth */}
          <div
            ref={seaRef}
            onScroll={onSeaScroll}
            className="h-full overflow-y-auto snap-y snap-mandatory overscroll-contain"
            style={{ scrollbarWidth: 'none' }}
          >
            {DEPTH_LEVELS.map((lvl) => {
              const meta = DEPTH_META[lvl];
              const copy = DEPTH_COPY[q][lvl];
              return (
                <section
                  key={lvl}
                  className="h-full snap-start flex items-center justify-center px-6 relative"
                  style={{
                    background: `linear-gradient(180deg, ${meta.water} 0%, ${DEPTH_META[Math.min(4, lvl + 1) as DepthLevel].water} 100%)`,
                  }}
                >
                  {/* drifting bubbles, sparser the deeper you go */}
                  {lvl < 4 && (
                    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
                      {Array.from({ length: 5 - lvl }).map((_, i) => (
                        <span
                          key={i}
                          className="absolute rounded-full border border-white/15"
                          style={{
                            width: 8 + i * 5, height: 8 + i * 5,
                            insetInlineStart: `${18 + i * 19}%`, top: `${25 + ((i * 31) % 55)}%`,
                            animation: `mmBubble ${7 + i * 2.5}s ease-in-out ${i * 1.3}s infinite`,
                          }}
                        />
                      ))}
                    </div>
                  )}

                  <div className="max-w-xl w-full text-white">
                    <div className="flex items-center gap-2 text-[10px] tracking-[0.14em] uppercase text-white/55 mb-2" >
                      <span dir="ltr">{ar ? meta.depth.ar : meta.depth.en}</span>
                      <span>·</span>
                      <span>{L(`العمق ${lvl} من 4`, `Depth ${lvl} of 4`)}</span>
                      {myLevel === lvl && (
                        <span className="normal-case tracking-normal text-[10px] font-semibold text-[#F5D77A] bg-white/10 rounded-full px-2 py-0.5">
                          {L('أنت هنا اليوم', 'you are here today')}
                        </span>
                      )}
                    </div>
                    <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-3 flex items-center gap-2.5">
                      <span>{meta.icon}</span>
                      <span>{ar ? meta.name.ar : meta.name.en}</span>
                    </h2>
                    <p className="text-sm sm:text-[15px] leading-relaxed text-white/85 mb-5">{ar ? copy.vignette.ar : copy.vignette.en}</p>
                    <ul className="space-y-1.5 mb-6">
                      {copy.markers.map((m, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-white/70">
                          <span className="text-white/40 mt-px">◆</span>
                          <span>{ar ? m.ar : m.en}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-wrap gap-2">
                      {copy.tools.map((tool) => (
                        <Link
                          key={tool.href}
                          href={tool.href}
                          onClick={() => setDive(null)}
                          className="text-xs rounded-full border border-white/25 bg-white/10 hover:bg-white/20 px-3.5 py-2 transition-colors"
                        >
                          {ar ? tool.ar : tool.en} →
                        </Link>
                      ))}
                    </div>
                    {lvl < 4 && (
                      <button
                        onClick={() => scrollToLevel((lvl + 1) as DepthLevel)}
                        className="mt-8 text-xs text-white/50 hover:text-white/80 transition-colors flex items-center gap-1.5"
                      >
                        {L('اغطس أعمق', 'Dive deeper')} <span className="animate-bounce inline-block">↓</span>
                      </button>
                    )}
                  </div>
                </section>
              );
            })}
          </div>

          {/* navigation grammar hint */}
          <div className="absolute bottom-3 inset-x-0 z-10 text-center text-[10px] text-white/45 pointer-events-none">
            {L('عجلة الفأرة: أعمق وأضحل · إمالة العجلة أو ← →: عبر الزمن · Esc: اصعد', 'Wheel: deeper & shallower · wheel tilt or ← →: through time · Esc: surface')}
          </div>
        </div>
      )}
    </>
  );
}
