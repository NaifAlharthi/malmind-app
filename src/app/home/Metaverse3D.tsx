'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sky, Text, Billboard } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { createClient } from '@/lib/supabase/client';
import { firstNameOf } from '@/lib/name';
import { useLocale } from '@/lib/i18n/LocaleProvider';

// WebGL text (troika) can't shape Arabic with the default Latin font, so
// in Arabic we hand the in-scene <Text> a Cairo web font that carries both
// Arabic and Latin glyphs. Latin/digits still render fine through it.
const ARABIC_FONT = 'https://cdn.jsdelivr.net/npm/@fontsource/cairo@5.0.14/files/cairo-arabic-600-normal.woff2';

const AGE_START = 18;
const AGE_END = 100;
const SQUARE = 6; // each year is a perfect SQUARE x SQUARE tile

type AssetType = 'cash' | 'stocks' | 'real_estate' | 'gold' | 'car' | 'business' | 'crypto' | 'other';

interface WorldObject {
  key: string;
  kind: AssetType | 'portfolio';
  label: string;
  value: number;
}

function zForAge(age: number) {
  return (age - AGE_START) * SQUARE;
}

function scaleFor(value: number) {
  return Math.max(0.7, Math.min(2.2, 0.7 + (Math.log10(Math.max(1, value)) / 7) * 1.8));
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ── Avatar in Saudi attire, with a "P1"-style floating name tag ──────
function Avatar({ name, ar }: { name: string; ar: boolean }) {
  const thobe = '#F7F5EF';
  const skin = '#C68E5A';
  const shemagh = '#C0392B';
  const agal = '#141414';
  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 0.55, 0]} castShadow><boxGeometry args={[0.56, 1.1, 0.36]} /><meshStandardMaterial color={thobe} /></mesh>
      <mesh position={[-0.15, 0.05, 0.08]} castShadow><boxGeometry args={[0.2, 0.1, 0.34]} /><meshStandardMaterial color="#8a5a3c" /></mesh>
      <mesh position={[0.15, 0.05, 0.08]} castShadow><boxGeometry args={[0.2, 0.1, 0.34]} /><meshStandardMaterial color="#8a5a3c" /></mesh>
      <mesh position={[0, 1.35, 0]} castShadow><boxGeometry args={[0.6, 0.5, 0.38]} /><meshStandardMaterial color={thobe} /></mesh>
      <mesh position={[-0.42, 1.25, 0]} castShadow><boxGeometry args={[0.22, 0.68, 0.24]} /><meshStandardMaterial color={thobe} /></mesh>
      <mesh position={[0.42, 1.25, 0]} castShadow><boxGeometry args={[0.22, 0.68, 0.24]} /><meshStandardMaterial color={thobe} /></mesh>
      <mesh position={[-0.42, 0.85, 0]} castShadow><boxGeometry args={[0.18, 0.16, 0.2]} /><meshStandardMaterial color={skin} /></mesh>
      <mesh position={[0.42, 0.85, 0]} castShadow><boxGeometry args={[0.18, 0.16, 0.2]} /><meshStandardMaterial color={skin} /></mesh>
      <mesh position={[0, 1.85, 0]} castShadow><boxGeometry args={[0.42, 0.42, 0.42]} /><meshStandardMaterial color={skin} /></mesh>
      <mesh position={[-0.09, 1.92, 0.215]}><boxGeometry args={[0.07, 0.07, 0.02]} /><meshStandardMaterial color="#141414" /></mesh>
      <mesh position={[0.09, 1.92, 0.215]}><boxGeometry args={[0.07, 0.07, 0.02]} /><meshStandardMaterial color="#141414" /></mesh>
      <mesh position={[0, 1.7, 0.215]}><boxGeometry args={[0.3, 0.1, 0.02]} /><meshStandardMaterial color="#4a2f1b" /></mesh>
      <mesh position={[0, 2.09, -0.02]} castShadow><boxGeometry args={[0.5, 0.14, 0.5]} /><meshStandardMaterial color={shemagh} /></mesh>
      <mesh position={[0, 1.82, -0.24]} castShadow><boxGeometry args={[0.5, 0.6, 0.08]} /><meshStandardMaterial color={shemagh} /></mesh>
      <mesh position={[-0.25, 1.85, 0]} castShadow><boxGeometry args={[0.06, 0.5, 0.46]} /><meshStandardMaterial color={shemagh} /></mesh>
      <mesh position={[0.25, 1.85, 0]} castShadow><boxGeometry args={[0.06, 0.5, 0.46]} /><meshStandardMaterial color={shemagh} /></mesh>
      <mesh position={[0, 2.18, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.24, 0.035, 8, 20]} /><meshStandardMaterial color={agal} /></mesh>

      {/* P1-style name tag: a billboarded pill + a downward pointer */}
      <Billboard position={[0, 2.95, 0]}>
        <mesh><planeGeometry args={[Math.max(1.2, name.length * 0.26 + 0.5), 0.5]} /><meshBasicMaterial color="#085041" /></mesh>
        <Text position={[0, 0, 0.01]} fontSize={0.3} color="#F7F5EF" anchorX="center" anchorY="middle" font={ar ? ARABIC_FONT : undefined}>
          {name || (ar ? 'أنت' : 'You')}
        </Text>
      </Billboard>
      <mesh position={[0, 2.5, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.13, 0.24, 4]} />
        <meshStandardMaterial color="#085041" />
      </mesh>
    </group>
  );
}

function SaudiFlag() {
  return (
    <group position={[1.7, 0, -0.4]}>
      <mesh position={[0, 1.25, 0]} castShadow><cylinderGeometry args={[0.03, 0.03, 2.5, 8]} /><meshStandardMaterial color="#B4B2A9" /></mesh>
      <mesh position={[0.45, 2.2, 0]} castShadow><boxGeometry args={[0.9, 0.55, 0.03]} /><meshStandardMaterial color="#165B33" /></mesh>
      <mesh position={[0.45, 2.26, 0.02]}><boxGeometry args={[0.6, 0.08, 0.01]} /><meshStandardMaterial color="#F7F5EF" /></mesh>
      <mesh position={[0.45, 2.1, 0.02]}><boxGeometry args={[0.5, 0.04, 0.01]} /><meshStandardMaterial color="#F7F5EF" /></mesh>
    </group>
  );
}

// ── Miniature Riyadh skyline, placed just beside the avatar ──────────
function RiyadhSkyline() {
  return (
    <group scale={0.7}>
      <group position={[0, 0, -2.4]}>
        <mesh position={[0, 1.5, 0]} castShadow><boxGeometry args={[1.3, 3, 0.55]} /><meshStandardMaterial color="#34495E" metalness={0.4} roughness={0.4} /></mesh>
        <mesh position={[-0.45, 3.55, 0]} castShadow><boxGeometry args={[0.4, 1.1, 0.5]} /><meshStandardMaterial color="#34495E" metalness={0.4} roughness={0.4} /></mesh>
        <mesh position={[0.45, 3.55, 0]} castShadow><boxGeometry args={[0.4, 1.1, 0.5]} /><meshStandardMaterial color="#34495E" metalness={0.4} roughness={0.4} /></mesh>
        <mesh position={[0, 4.22, 0]} castShadow><boxGeometry args={[1.3, 0.25, 0.5]} /><meshStandardMaterial color="#5DCAA5" metalness={0.3} roughness={0.5} /></mesh>
      </group>
      <group position={[1.6, 0, 0.4]}>
        <mesh position={[0, 1.6, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[0.85, 3.2, 4]} /><meshStandardMaterial color="#7E96A8" metalness={0.4} roughness={0.4} /></mesh>
        <mesh position={[0, 2.75, 0]} castShadow><sphereGeometry args={[0.26, 16, 16]} /><meshStandardMaterial color="#C9A84C" metalness={0.6} roughness={0.3} /></mesh>
        <mesh position={[0, 3.5, 0]} castShadow><coneGeometry args={[0.06, 0.7, 6]} /><meshStandardMaterial color="#7E96A8" /></mesh>
      </group>
      <group position={[-1.6, 0, 1.6]}>
        <mesh position={[0, 1.4, 0]} rotation={[0, 0.3, 0]} castShadow><boxGeometry args={[0.6, 2.8, 0.6]} /><meshStandardMaterial color="#2C3E50" metalness={0.5} roughness={0.35} /></mesh>
        <mesh position={[0.7, 1.05, 0.4]} rotation={[0, -0.2, 0]} castShadow><boxGeometry args={[0.5, 2.1, 0.5]} /><meshStandardMaterial color="#3D5166" metalness={0.5} roughness={0.35} /></mesh>
        <mesh position={[-0.6, 0.85, 0.5]} rotation={[0, 0.55, 0]} castShadow><boxGeometry args={[0.45, 1.7, 0.45]} /><meshStandardMaterial color="#22303E" metalness={0.5} roughness={0.35} /></mesh>
      </group>
    </group>
  );
}

// ── The platform: one perfect-square tile per year, painted with its
// year, gently checkerboarded, with today's tile highlighted green. ──
function Timeline({ currentYear, currentAge, todayLabel, ar }: { currentYear: number; currentAge: number; todayLabel: string; ar: boolean }) {
  const tiles = [];
  for (let age = AGE_START; age <= AGE_END; age++) {
    const z = zForAge(age);
    const isToday = age === currentAge;
    const year = currentYear + (age - currentAge);
    const base = isToday ? '#DDF1E7' : age % 2 === 0 ? '#EFEDE8' : '#E6E1D4';
    tiles.push(
      <group key={age} position={[0, 0, z]}>
        <mesh position={[0, -0.04, 0]} receiveShadow>
          <boxGeometry args={[SQUARE, 0.08, SQUARE]} />
          <meshStandardMaterial color={base} />
        </mesh>
        {/* thin border so each square reads as a discrete tile */}
        <mesh position={[0, 0.001, SQUARE / 2 - 0.02]}>
          <boxGeometry args={[SQUARE, 0.02, 0.04]} />
          <meshStandardMaterial color={isToday ? '#5DCAA5' : '#CFC9B8'} />
        </mesh>
        {/* big year painted on the ground toward the back of the tile */}
        <Text
          position={[0, 0.02, -SQUARE * 0.28]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={1.5}
          color={isToday ? '#1D9E75' : '#D3CDBC'}
          anchorX="center"
          anchorY="middle"
        >
          {String(year)}
        </Text>
        <Text
          position={[0, 0.02, SQUARE * 0.34]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.34}
          color={isToday ? '#085041' : '#A8A49A'}
          anchorX="center"
          anchorY="middle"
          font={ar ? ARABIC_FONT : undefined}
        >
          {isToday
            ? (ar ? `◂ اليوم · العمر ${age} · ${todayLabel}` : `▸ TODAY · age ${age} · ${todayLabel}`)
            : (ar ? `العمر ${age}` : `age ${age}`)}
        </Text>
      </group>
    );
  }

  const totalDepth = zForAge(AGE_END) - zForAge(AGE_START);
  const centerZ = zForAge(AGE_START) + totalDepth / 2;
  return (
    <>
      <mesh receiveShadow position={[0, -0.16, centerZ]}>
        <boxGeometry args={[160, 0.04, totalDepth + 120]} />
        <meshStandardMaterial color="#E8E2D0" />
      </mesh>
      {tiles}
    </>
  );
}

// ── Object shapes ────────────────────────────────────────────────────
function CashPile({ scale }: { scale: number }) {
  return (
    <group scale={scale}>
      <mesh position={[0, 0.1, 0]} castShadow><boxGeometry args={[0.5, 0.2, 0.35]} /><meshStandardMaterial color="#C9A84C" /></mesh>
      <mesh position={[0.04, 0.32, 0.02]} castShadow><boxGeometry args={[0.45, 0.2, 0.32]} /><meshStandardMaterial color="#D8BC63" /></mesh>
      <mesh position={[-0.03, 0.54, -0.01]} castShadow><boxGeometry args={[0.4, 0.2, 0.28]} /><meshStandardMaterial color="#C9A84C" /></mesh>
    </group>
  );
}

function PortfolioObject({ scale }: { scale: number }) {
  return (
    <group scale={scale}>
      <mesh position={[0, 0.35, 0]} castShadow><boxGeometry args={[0.8, 0.55, 0.28]} /><meshStandardMaterial color="#2C3E50" metalness={0.3} roughness={0.5} /></mesh>
      <mesh position={[0, 0.66, 0]} castShadow><torusGeometry args={[0.12, 0.03, 8, 16, Math.PI]} /><meshStandardMaterial color="#141414" /></mesh>
      <mesh position={[-0.2, 0.5, 0.16]}><boxGeometry args={[0.1, 0.18, 0.02]} /><meshStandardMaterial color="#5DCAA5" /></mesh>
      <mesh position={[-0.03, 0.55, 0.16]}><boxGeometry args={[0.1, 0.3, 0.02]} /><meshStandardMaterial color="#1D9E75" /></mesh>
      <mesh position={[0.15, 0.6, 0.16]}><boxGeometry args={[0.1, 0.42, 0.02]} /><meshStandardMaterial color="#085041" /></mesh>
    </group>
  );
}

function AssetShape({ kind, scale }: { kind: AssetType; scale: number }) {
  switch (kind) {
    case 'cash':
      return <CashPile scale={scale} />;
    case 'stocks':
      return (
        <group scale={scale}>
          <mesh position={[-0.22, 0.25, 0]} castShadow><boxGeometry args={[0.16, 0.5, 0.16]} /><meshStandardMaterial color="#B8CCE8" /></mesh>
          <mesh position={[0, 0.4, 0]} castShadow><boxGeometry args={[0.16, 0.8, 0.16]} /><meshStandardMaterial color="#4A78C4" /></mesh>
          <mesh position={[0.22, 0.6, 0]} castShadow><boxGeometry args={[0.16, 1.2, 0.16]} /><meshStandardMaterial color="#2a5aa0" /></mesh>
        </group>
      );
    case 'real_estate':
      return (
        <group scale={scale}>
          <mesh position={[0, 0.35, 0]} castShadow><boxGeometry args={[0.7, 0.7, 0.7]} /><meshStandardMaterial color="#8a5a3c" /></mesh>
          <mesh position={[0, 0.85, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[0.58, 0.5, 4]} /><meshStandardMaterial color="#5c3a24" /></mesh>
        </group>
      );
    case 'gold':
      return (
        <group scale={scale}>
          <mesh position={[-0.16, 0.09, 0]} rotation={[0, 0, 0.04]} castShadow><boxGeometry args={[0.34, 0.16, 0.2]} /><meshStandardMaterial color="#C9A84C" metalness={0.7} roughness={0.25} /></mesh>
          <mesh position={[0.16, 0.09, 0.02]} rotation={[0, 0, -0.04]} castShadow><boxGeometry args={[0.34, 0.16, 0.2]} /><meshStandardMaterial color="#D8BC63" metalness={0.7} roughness={0.25} /></mesh>
          <mesh position={[0, 0.26, 0]} castShadow><boxGeometry args={[0.34, 0.16, 0.2]} /><meshStandardMaterial color="#E4CE82" metalness={0.7} roughness={0.25} /></mesh>
        </group>
      );
    case 'car':
      return (
        <group scale={scale}>
          <mesh position={[0, 0.25, 0]} castShadow><boxGeometry args={[0.9, 0.35, 0.5]} /><meshStandardMaterial color="#4A78C4" /></mesh>
          <mesh position={[0, 0.5, 0]} castShadow><boxGeometry args={[0.55, 0.25, 0.45]} /><meshStandardMaterial color="#3a5f9e" /></mesh>
        </group>
      );
    case 'business':
      return (
        <group scale={scale}>
          <mesh position={[0, 0.7, 0]} castShadow><boxGeometry args={[0.55, 1.4, 0.55]} /><meshStandardMaterial color="#34495E" metalness={0.4} roughness={0.4} /></mesh>
          <mesh position={[0, 1.45, 0]} castShadow><boxGeometry args={[0.3, 0.16, 0.3]} /><meshStandardMaterial color="#5DCAA5" /></mesh>
        </group>
      );
    case 'crypto':
      return (
        <group scale={scale}>
          <mesh position={[0, 0.5, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><octahedronGeometry args={[0.4, 0]} /><meshStandardMaterial color="#C9A84C" metalness={0.6} roughness={0.25} /></mesh>
        </group>
      );
    default:
      return (
        <group scale={scale}>
          <mesh position={[0, 0.3, 0]} castShadow><boxGeometry args={[0.55, 0.55, 0.55]} /><meshStandardMaterial color="#898781" /></mesh>
        </group>
      );
  }
}

function WorldObjectMesh({ obj, x, z, ar }: { obj: WorldObject; x: number; z: number; ar: boolean }) {
  const scale = scaleFor(obj.value);
  const money = ar
    ? `${Math.round(obj.value).toLocaleString('en-US')} ريال`
    : `SAR ${Math.round(obj.value).toLocaleString()}`;
  const label = `${obj.label} — ${money}`;
  return (
    <group position={[x, 0, z]}>
      {obj.kind === 'portfolio' ? <PortfolioObject scale={scale} /> : <AssetShape kind={obj.kind} scale={scale} />}
      <Text position={[0, 1.5 * scale + 0.15, 0]} fontSize={0.22} color="#141414" anchorX="center" anchorY="middle" outlineWidth={0.012} outlineColor="#F5F4F0" font={ar ? ARABIC_FONT : undefined}>
        {label}
      </Text>
    </group>
  );
}

function CameraRig({ viewAge, controlsRef }: { viewAge: number; controlsRef: React.RefObject<OrbitControlsImpl | null> }) {
  const initialized = useRef(false);
  useFrame(({ camera }) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const desired = zForAge(viewAge);
    if (!initialized.current) {
      controls.target.set(0, 0.9, desired);
      camera.position.set(9, 5, desired + 13);
      controls.update();
      initialized.current = true;
      return;
    }
    const delta = (desired - controls.target.z) * 0.08;
    if (Math.abs(desired - controls.target.z) > 0.002) {
      controls.target.z += delta;
      camera.position.z += delta;
      controls.update();
    }
  });
  return null;
}

export default function Metaverse3D() {
  const supabase = createClient();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const [name, setName] = useState('');
  const [currentAge, setCurrentAge] = useState(25);
  const [viewAge, setViewAge] = useState(25);
  const [liquidSavings, setLiquidSavings] = useState<number | null>(null);
  const [portfolioValue, setPortfolioValue] = useState<number | null>(null);
  const [assets, setAssets] = useState<{ id: string; name: string; asset_type: AssetType; value: number }[]>([]);

  const now = new Date();
  const currentYear = now.getFullYear();
  const todayLabel = ar
    ? `${new Intl.DateTimeFormat('ar', { month: 'short' }).format(now)} ${currentYear}`
    : `${MONTHS[now.getMonth()]} ${currentYear}`;

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: profile }, { data: invest }, { data: assetRows }] = await Promise.all([
      supabase.from('profiles').select('name, age, liquid_savings').eq('id', user.id).single(),
      supabase.from('investment_settings').select('portfolio_value').eq('user_id', user.id).maybeSingle(),
      supabase.from('assets').select('id, name, asset_type, value').eq('user_id', user.id).order('created_at', { ascending: true }),
    ]);

    if (profile?.name) setName(firstNameOf(profile.name));
    if (profile?.age) {
      setCurrentAge(profile.age);
      setViewAge(profile.age);
    }
    if (profile?.liquid_savings != null) setLiquidSavings(Number(profile.liquid_savings));
    if (invest?.portfolio_value != null) setPortfolioValue(Number(invest.portfolio_value));
    if (assetRows) setAssets(assetRows as { id: string; name: string; asset_type: AssetType; value: number }[]);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const worldObjects = useMemo<WorldObject[]>(() => {
    const list: WorldObject[] = [];
    if (liquidSavings && liquidSavings > 0) list.push({ key: 'cash', kind: 'cash', label: L('النقد', 'Cash'), value: liquidSavings });
    if (portfolioValue && portfolioValue > 0) list.push({ key: 'portfolio', kind: 'portfolio', label: L('محفظة الاستثمار', 'Investment portfolio'), value: portfolioValue });
    assets.forEach((a) => list.push({ key: a.id, kind: a.asset_type, label: a.name, value: a.value }));
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liquidSavings, portfolioValue, assets, ar]);

  // Lay the wealth objects in a neat row in front of the avatar, centered
  // and spaced to fit within the current square tile.
  const placed = useMemo(() => {
    const z0 = zForAge(currentAge);
    const n = worldObjects.length;
    const spacing = Math.min(1.6, (SQUARE - 1.4) / Math.max(1, n - 1));
    const startX = -((n - 1) / 2) * spacing;
    return worldObjects.map((obj, i) => ({ obj, x: startX + i * spacing, z: z0 + 1.7 }));
  }, [worldObjects, currentAge]);

  const viewYear = currentYear + (viewAge - currentAge);

  return (
    <div data-tour="world" className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-6">
      <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--gold)] font-semibold mb-1">{L('نموذج أوّلي', 'Prototype')}</div>
      <h2 className="font-serif text-lg font-semibold text-[var(--ink)] mb-1">{L('حياتك، في فضاء', 'Your life, in space')}</h2>
      <p className="text-xs text-[var(--muted)] mb-4 max-w-lg">
        {L(
          `تقف على مربّع اليوم — العمر ${currentAge}، عام ${currentYear}، في الرياض. نقدك ومحفظتك وأصولك المسجَّلة تقف بجانبك. انزلق عبر السنوات أدناه؛ واسحب داخل المشهد لتنظر حولك.`,
          `You're standing on today's square — age ${currentAge}, ${currentYear}, in Riyadh. Your cash, portfolio and logged assets stand beside you. Slide through the years below; drag inside the scene to look around.`
        )}
      </p>

      <div className="h-[440px] rounded-xl overflow-hidden bg-[var(--surface-1)] border border-[var(--border-default)]">
        <Canvas shadows camera={{ position: [9, 5, zForAge(25) + 13], fov: 45 }}>
          <Sky sunPosition={[80, 25, 60]} turbidity={6} rayleigh={1.2} />
          <ambientLight intensity={0.75} />
          <directionalLight position={[8, 12, 6]} intensity={1.1} castShadow />
          <Timeline currentYear={currentYear} currentAge={currentAge} todayLabel={todayLabel} ar={ar} />
          <group position={[0, 0, zForAge(currentAge)]}>
            <Avatar name={name} ar={ar} />
            <SaudiFlag />
            <group position={[-SQUARE / 2 - 3.4, 0, 0]}>
              <RiyadhSkyline />
            </group>
          </group>
          {placed.map(({ obj, x, z }) => (
            <WorldObjectMesh key={obj.key} obj={obj} x={x} z={z} ar={ar} />
          ))}
          <OrbitControls ref={controlsRef} minDistance={2} maxDistance={80} />
          <CameraRig viewAge={viewAge} controlsRef={controlsRef} />
        </Canvas>
      </div>

      {/* year scrubber (the only control — the scene itself stays clean) */}
      <div className="flex items-center gap-4 mt-4 flex-wrap">
        <span className="text-xs text-[var(--muted)] whitespace-nowrap">{L('العمر', 'Age')} {AGE_START}</span>
        <input
          type="range"
          min={AGE_START}
          max={AGE_END}
          step={1}
          value={viewAge}
          onChange={(e) => setViewAge(parseInt(e.target.value))}
          className="flex-1 min-w-[160px] accent-[var(--green-dark)]"
        />
        <span className="text-xs text-[var(--muted)] whitespace-nowrap">{L('العمر', 'Age')} {AGE_END}</span>
        <span className="text-xs font-semibold text-[var(--green-dark)] bg-[var(--green-bg)] border border-[var(--green-border)] rounded-full px-3 py-1.5 whitespace-nowrap">
          {L(`تعرض العمر ${viewAge} · ${viewYear}`, `Viewing age ${viewAge} · ${viewYear}`)}
        </span>
        {viewAge !== currentAge && (
          <button onClick={() => setViewAge(currentAge)} className="text-xs text-[var(--green-dark)] font-medium whitespace-nowrap">
            {L('العودة إلى اليوم', 'Back to today')}
          </button>
        )}
      </div>
    </div>
  );
}
