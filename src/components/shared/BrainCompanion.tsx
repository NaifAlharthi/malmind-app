'use client';

// The Brain — MalMind's mascot and the face of all AI interaction. A
// voxel figure (same blocky family as the 3D avatar) that floats over
// every page, bobs while you scroll, hops when you navigate, and visibly
// grows as you feed it data: more voxels, grooves, golden synapses, and
// finally orbiting sparks. Click it for its training panel and the door
// to the advisor.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Canvas, useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import {
  BRAIN_SOURCES, BRAIN_VOXELS, brainAppearance, cacheBrainLevel, cachedBrainLevel,
  computeBrainStats, type BrainStats,
} from '@/lib/brain';

const V = 0.17; // voxel size

function BrainFigure({ level, excitementRef }: { level: number; excitementRef: React.RefObject<number> }) {
  const group = useRef<Group>(null);
  const orbit = useRef<Group>(null);
  const look = brainAppearance(level);
  const voxels = useMemo(() => BRAIN_VOXELS.slice(0, look.voxelCount), [look.voxelCount]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const ex = Math.max(0, excitementRef.current ?? 0);
    if (group.current) {
      group.current.position.y = Math.sin(t * (2 + ex * 4)) * (0.06 + ex * 0.16) - 0.1;
      group.current.rotation.y = t * (0.35 + ex * 1.2);
      const squash = 1 + Math.sin(t * (2 + ex * 4)) * ex * 0.06;
      group.current.scale.set(1, squash, 1);
    }
    if (orbit.current) orbit.current.rotation.y = t * 1.6;
    if (excitementRef.current && excitementRef.current > 0) excitementRef.current *= 0.97;
  });

  return (
    <group ref={group}>
      {voxels.map((v, i) => {
        const kind = v.kind === 'groove' && !look.showGrooves ? 'flesh' : v.kind === 'synapse' && !look.showSynapses ? 'flesh' : v.kind;
        const color = kind === 'synapse' ? '#E4C465' : kind === 'groove' ? '#B76B84' : '#E8A0B4';
        return (
          <mesh key={i} position={[v.x * V, (v.y - 1.4) * V, v.z * V]}>
            <boxGeometry args={[V * 0.96, V * 0.96, V * 0.96]} />
            <meshStandardMaterial
              color={color}
              emissive={look.glow && kind === 'synapse' ? '#C9A84C' : '#000000'}
              emissiveIntensity={look.glow && kind === 'synapse' ? 0.55 : 0}
            />
          </mesh>
        );
      })}
      {/* brain stem */}
      <mesh position={[0, -3 * V + 0.35 * V, -0.5 * V]}>
        <boxGeometry args={[V * 1.4, V * 1.2, V * 1.4]} />
        <meshStandardMaterial color="#B76B84" />
      </mesh>
      {/* orbiting sparks at high levels */}
      {look.orbitals > 0 && (
        <group ref={orbit}>
          {Array.from({ length: look.orbitals }).map((_, i) => (
            <mesh key={i} position={[Math.cos((i * Math.PI * 2) / look.orbitals) * 0.85, 0.1 + i * 0.18, Math.sin((i * Math.PI * 2) / look.orbitals) * 0.85]}>
              <octahedronGeometry args={[0.07, 0]} />
              <meshStandardMaterial color="#E4C465" emissive="#C9A84C" emissiveIntensity={0.8} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

export default function BrainCompanion() {
  const supabase = createClient();
  const pathname = usePathname();
  const { t } = useLocale();
  const [stats, setStats] = useState<BrainStats | null>(null);
  const [open, setOpen] = useState(false);
  const excitementRef = useRef(0);

  // Train-o-meter: count rows across every table the Brain feeds on.
  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const counts: Record<string, number> = {};
    await Promise.all(
      BRAIN_SOURCES.map(async (s) => {
        try {
          const { data } = await supabase.from(s.key).select('id').eq('user_id', user.id);
          counts[s.key] = Array.isArray(data) ? data.length : 0;
        } catch {
          counts[s.key] = 0;
        }
      })
    );
    const { data: profile } = await supabase
      .from('profiles')
      .select('monthly_income, liquid_savings, monthly_debt_payments, has_health_insurance, age, monthly_housing_payment, monthly_investment_contribution')
      .eq('id', user.id)
      .single();

    const computed = computeBrainStats(counts, profile ?? null);
    cacheBrainLevel(computed.level.level); // for lightweight renders elsewhere
    setStats(computed);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  // Hop on navigation, stir on scroll.
  useEffect(() => {
    excitementRef.current = 1.6;
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => {
      excitementRef.current = Math.min(1.2, (excitementRef.current ?? 0) + 0.35);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!stats) return null;
  const { level, nextLevel, xp, progressToNext, suggestions } = stats;
  const levelName = t(`brain.level.${level.level}.name`);
  const levelBlurb = t(`brain.level.${level.level}.blurb`);
  const nextName = nextLevel ? t(`brain.level.${nextLevel.level}.name`) : '';

  return (
    <>
      {/* the floating Brain */}
      <button
        onClick={() => { setOpen((o) => !o); excitementRef.current = 2; }}
        title={t('brain.tooltip', { level: level.level, name: levelName })}
        className="mm-brain fixed bottom-5 right-5 z-40 w-24 h-24 rounded-full cursor-pointer focus:outline-none"
        style={{ background: 'transparent' }}
        aria-label={t('brain.open')}
      >
        <Canvas camera={{ position: [0, 0.2, 2.3], fov: 40 }} dpr={[1, 1.5]} gl={{ alpha: true }} style={{ pointerEvents: 'none' }}>
          <ambientLight intensity={0.85} />
          <directionalLight position={[3, 4, 5]} intensity={1.1} />
          <BrainFigure level={level.level} excitementRef={excitementRef} />
        </Canvas>
        <span className="mm-brain-badge absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full bg-[#085041] border border-[#5DCAA5] text-[10px] font-bold text-[#5DCAA5] flex items-center justify-center">
          {level.level}
        </span>
      </button>

      {/* training panel */}
      {open && (
        <div className="mm-brain-panel fixed bottom-32 right-5 z-40 w-80 max-w-[92vw] bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl shadow-2xl p-5">
          <div className="flex items-start justify-between mb-1">
            <div>
              <div className="text-[10px] tracking-[0.12em] uppercase text-[var(--gold)]">{t('brain.title')}</div>
              <div className="font-serif text-lg font-semibold text-[var(--ink)]">
                {t('brain.levelName', { level: level.level, name: levelName })}
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-[var(--muted)] hover:text-[var(--ink)] text-sm">✕</button>
          </div>
          <p className="text-xs text-[var(--ink-2)] leading-relaxed mb-3">{levelBlurb}</p>

          <div className="flex justify-between items-baseline mb-1">
            <span className="text-[10px] text-[var(--muted)]">{t('brain.synapses', { xp })}</span>
            <span className="text-[10px] text-[var(--muted)]">
              {nextLevel
                ? t('brain.toNext', { n: nextLevel.minXp - xp, level: nextLevel.level, name: nextName })
                : t('brain.fullyTrained')}
            </span>
          </div>
          <div className="h-2 bg-[var(--surface-1)] rounded-full overflow-hidden mb-4">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#1D9E75] to-[#5DCAA5] transition-all duration-700"
              style={{ width: `${Math.max(4, progressToNext * 100)}%` }}
            />
          </div>

          {suggestions.length > 0 && (
            <div className="mb-4">
              <div className="text-[10px] tracking-[0.08em] uppercase text-[var(--muted)] mb-2">{t('brain.feed')}</div>
              <ul className="flex flex-col gap-1.5">
                {suggestions.map((s) => (
                  <li key={s.i18nKey} className="text-xs">
                    <Link href={s.href} onClick={() => setOpen(false)} className="flex items-center justify-between gap-2 text-[var(--ink-2)] hover:text-[var(--green-dark)] group">
                      <span className="group-hover:underline">{t(s.i18nKey)}</span>
                      <span className="text-[10px] text-[var(--gold)] whitespace-nowrap">+{s.possible - s.earned}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Link
            href="/advisor"
            onClick={() => setOpen(false)}
            className="block w-full text-center text-sm font-semibold bg-[var(--green-dark)] text-white rounded-lg px-4 py-2.5"
          >
            {t('brain.ask')}
          </Link>
          <p className="text-[10px] text-[var(--muted)] mt-2 text-center">
            {t('brain.footer')}
          </p>
        </div>
      )}
    </>
  );
}

// A small inline Brain for embedding next to UI (e.g. the hub pages' prompt
// bar). Purely presentational: renders at the last computed level (the
// floating companion keeps the cache warm) and links to the advisor.
export function MiniBrain({ className = '' }: { className?: string }) {
  const idleRef = useRef(0);
  const { t } = useLocale();
  return (
    <Link
      href="/advisor"
      title={t('brain.title')}
      aria-label={t('brain.open')}
      className={`block w-16 h-16 shrink-0 ${className}`}
    >
      <Canvas camera={{ position: [0, 0.2, 2.3], fov: 40 }} dpr={[1, 1.5]} gl={{ alpha: true }} style={{ pointerEvents: 'none' }}>
        <ambientLight intensity={0.85} />
        <directionalLight position={[3, 4, 5]} intensity={1.1} />
        <BrainFigure level={cachedBrainLevel()} excitementRef={idleRef} />
      </Canvas>
    </Link>
  );
}
