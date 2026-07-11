'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sky, Text } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { createClient } from '@/lib/supabase/client';

const AGE_START = 18;
const AGE_END = 100;
const YEAR_DEPTH = 2.6; // z-distance per year
const PLATFORM_WIDTH = 13.4; // ~triple the old 4.4 so assets can sit on it

// ── Asset model ──────────────────────────────────────────────────────
type AssetType = 'cash' | 'stocks' | 'real_estate' | 'gold' | 'car' | 'business' | 'crypto' | 'other';
type AssetClass = 'cash' | 'equity' | 'real_estate' | 'commodity' | 'business' | 'alternative' | 'other';

const ASSET_TYPES: { type: AssetType; label: string; cls: AssetClass }[] = [
  { type: 'cash', label: 'Cash', cls: 'cash' },
  { type: 'stocks', label: 'Stocks / funds', cls: 'equity' },
  { type: 'real_estate', label: 'Real estate', cls: 'real_estate' },
  { type: 'gold', label: 'Gold', cls: 'commodity' },
  { type: 'car', label: 'Car', cls: 'other' },
  { type: 'business', label: 'Business', cls: 'business' },
  { type: 'crypto', label: 'Crypto', cls: 'alternative' },
  { type: 'other', label: 'Other', cls: 'other' },
];

const CLASS_LABEL: Record<AssetClass, string> = {
  cash: 'Cash', equity: 'Equity', real_estate: 'Real estate',
  commodity: 'Commodity', business: 'Business', alternative: 'Alternative', other: 'Other',
};

interface AssetRow {
  id: string;
  name: string;
  asset_type: AssetType;
  asset_class: AssetClass;
  value: number;
}

interface WorldObject {
  key: string;
  kind: AssetType | 'portfolio';
  label: string;
  value: number;
}

function zForAge(age: number) {
  return (age - AGE_START) * YEAR_DEPTH;
}

// Log-ish size factor so a huge value doesn't tower absurdly over a small one.
function scaleFor(value: number) {
  return Math.max(0.7, Math.min(2.4, 0.7 + (Math.log10(Math.max(1, value)) / 7) * 1.9));
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ── Avatar in Saudi attire (Minecraft-style, unchanged) ──────────────
function Avatar() {
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
    </group>
  );
}

function SaudiFlag() {
  return (
    <group position={[-1.5, 0, 0.4]}>
      <mesh position={[0, 1.25, 0]} castShadow><cylinderGeometry args={[0.03, 0.03, 2.5, 8]} /><meshStandardMaterial color="#B4B2A9" /></mesh>
      <mesh position={[0.45, 2.2, 0]} castShadow><boxGeometry args={[0.9, 0.55, 0.03]} /><meshStandardMaterial color="#165B33" /></mesh>
      <mesh position={[0.45, 2.26, 0.02]}><boxGeometry args={[0.6, 0.08, 0.01]} /><meshStandardMaterial color="#F7F5EF" /></mesh>
      <mesh position={[0.45, 2.1, 0.02]}><boxGeometry args={[0.5, 0.04, 0.01]} /><meshStandardMaterial color="#F7F5EF" /></mesh>
    </group>
  );
}

// ── Miniature Riyadh skyline, set back off the platform ──────────────
function RiyadhSkyline() {
  return (
    <group position={[-6.5, 0, 0]}>
      <group position={[0, 0, -2.2]}>
        <mesh position={[0, 1.5, 0]} castShadow><boxGeometry args={[1.3, 3, 0.55]} /><meshStandardMaterial color="#34495E" metalness={0.4} roughness={0.4} /></mesh>
        <mesh position={[-0.45, 3.55, 0]} castShadow><boxGeometry args={[0.4, 1.1, 0.5]} /><meshStandardMaterial color="#34495E" metalness={0.4} roughness={0.4} /></mesh>
        <mesh position={[0.45, 3.55, 0]} castShadow><boxGeometry args={[0.4, 1.1, 0.5]} /><meshStandardMaterial color="#34495E" metalness={0.4} roughness={0.4} /></mesh>
        <mesh position={[0, 4.22, 0]} castShadow><boxGeometry args={[1.3, 0.25, 0.5]} /><meshStandardMaterial color="#5DCAA5" metalness={0.3} roughness={0.5} /></mesh>
      </group>
      <group position={[-0.4, 0, 1.2]}>
        <mesh position={[0, 1.6, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[0.85, 3.2, 4]} /><meshStandardMaterial color="#7E96A8" metalness={0.4} roughness={0.4} /></mesh>
        <mesh position={[0, 2.75, 0]} castShadow><sphereGeometry args={[0.26, 16, 16]} /><meshStandardMaterial color="#C9A84C" metalness={0.6} roughness={0.3} /></mesh>
        <mesh position={[0, 3.5, 0]} castShadow><coneGeometry args={[0.06, 0.7, 6]} /><meshStandardMaterial color="#7E96A8" /></mesh>
      </group>
      <group position={[-1.3, 0, 4.2]}>
        <mesh position={[0, 1.4, 0]} rotation={[0, 0.3, 0]} castShadow><boxGeometry args={[0.6, 2.8, 0.6]} /><meshStandardMaterial color="#2C3E50" metalness={0.5} roughness={0.35} /></mesh>
        <mesh position={[0.75, 1.05, 0.4]} rotation={[0, -0.2, 0]} castShadow><boxGeometry args={[0.5, 2.1, 0.5]} /><meshStandardMaterial color="#3D5166" metalness={0.5} roughness={0.35} /></mesh>
        <mesh position={[-0.6, 0.85, 0.55]} rotation={[0, 0.55, 0]} castShadow><boxGeometry args={[0.45, 1.7, 0.45]} /><meshStandardMaterial color="#22303E" metalness={0.5} roughness={0.35} /></mesh>
      </group>
    </group>
  );
}

// ── The platform: one continuous strip, tripled width, with a year+age
// label AND a marker line on EVERY block, and a green "today" band.
function Timeline({ currentYear, currentAge, todayLabel }: { currentYear: number; currentAge: number; todayLabel: string }) {
  const totalDepth = zForAge(AGE_END) - zForAge(AGE_START);
  const centerZ = zForAge(AGE_START) + totalDepth / 2;
  const halfW = PLATFORM_WIDTH / 2;

  const rows = [];
  for (let age = AGE_START; age <= AGE_END; age++) {
    const z = zForAge(age);
    const isMajor = age % 5 === 0;
    const isToday = age === currentAge;
    const year = currentYear + (age - currentAge);
    rows.push(
      <group key={age} position={[0, 0.001, z]}>
        {/* divider line between years */}
        <mesh position={[0, 0, YEAR_DEPTH / 2]} receiveShadow>
          <boxGeometry args={[PLATFORM_WIDTH, 0.012, isMajor ? 0.05 : 0.02]} />
          <meshStandardMaterial color={isMajor ? '#9A978C' : '#D5D1C4'} />
        </mesh>
        {/* year + age label, flush on the surface, left edge */}
        <Text
          position={[-halfW + 0.3, 0.02, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={isMajor ? 0.34 : 0.24}
          color={isToday ? '#085041' : isMajor ? '#3D3D3A' : '#A8A49A'}
          anchorX="left"
          anchorY="middle"
          fontWeight={isMajor ? 700 : 400}
        >
          {`${year}   ·   age ${age}`}
        </Text>
        {isToday && (
          <>
            {/* green "today" band across the whole block */}
            <mesh position={[0, 0.004, 0]}>
              <boxGeometry args={[PLATFORM_WIDTH, 0.014, YEAR_DEPTH * 0.9]} />
              <meshStandardMaterial color="#1D9E75" transparent opacity={0.16} />
            </mesh>
            <Text
              position={[halfW - 0.3, 0.02, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.34}
              color="#085041"
              anchorX="right"
              anchorY="middle"
              fontWeight={700}
            >
              {`▸ TODAY · ${todayLabel}`}
            </Text>
          </>
        )}
      </group>
    );
  }

  return (
    <>
      {/* desert ground */}
      <mesh receiveShadow position={[0, -0.14, centerZ]}>
        <boxGeometry args={[120, 0.04, totalDepth + 80]} />
        <meshStandardMaterial color="#E8E2D0" />
      </mesh>
      {/* the platform */}
      <mesh receiveShadow position={[0, -0.05, centerZ]}>
        <boxGeometry args={[PLATFORM_WIDTH, 0.1, totalDepth + YEAR_DEPTH]} />
        <meshStandardMaterial color="#EFEDE8" />
      </mesh>
      {rows}
    </>
  );
}

// ── Object shapes, one per asset kind ────────────────────────────────
function CashPile({ scale }: { scale: number }) {
  const c = '#C9A84C';
  return (
    <group scale={scale}>
      <mesh position={[0, 0.1, 0]} castShadow><boxGeometry args={[0.5, 0.2, 0.35]} /><meshStandardMaterial color={c} /></mesh>
      <mesh position={[0.04, 0.32, 0.02]} castShadow><boxGeometry args={[0.45, 0.2, 0.32]} /><meshStandardMaterial color="#D8BC63" /></mesh>
      <mesh position={[-0.03, 0.54, -0.01]} castShadow><boxGeometry args={[0.4, 0.2, 0.28]} /><meshStandardMaterial color={c} /></mesh>
    </group>
  );
}

function PortfolioObject({ scale }: { scale: number }) {
  // A briefcase with a rising bar-chart on the lid — "the portfolio".
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

function WorldObjectMesh({ obj, x, z }: { obj: WorldObject; x: number; z: number }) {
  const scale = scaleFor(obj.value);
  const label = `${obj.label} — SAR ${Math.round(obj.value).toLocaleString()}`;
  return (
    <group position={[x, 0, z]}>
      {obj.kind === 'portfolio' ? <PortfolioObject scale={scale} /> : <AssetShape kind={obj.kind} scale={scale} />}
      <Text position={[0, 1.5 * scale + 0.15, 0]} fontSize={0.24} color="#141414" anchorX="center" anchorY="middle" outlineWidth={0.012} outlineColor="#F5F4F0">
        {label}
      </Text>
    </group>
  );
}

// ── Smoothly pan the camera + orbit target along the timeline ────────
function CameraRig({ viewAge, controlsRef }: { viewAge: number; controlsRef: React.RefObject<OrbitControlsImpl | null> }) {
  const initialized = useRef(false);
  useFrame(({ camera }) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const desired = zForAge(viewAge);
    if (!initialized.current) {
      controls.target.set(0, 0.9, desired);
      camera.position.set(8, 4.4, desired + 10);
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
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentAge, setCurrentAge] = useState(25);
  const [viewAge, setViewAge] = useState(25);
  const [liquidSavings, setLiquidSavings] = useState<number | null>(null);
  const [portfolioValue, setPortfolioValue] = useState<number | null>(null);
  const [assets, setAssets] = useState<AssetRow[]>([]);

  // add-asset form
  const [name, setName] = useState('');
  const [assetType, setAssetType] = useState<AssetType>('stocks');
  const [value, setValue] = useState('');

  const now = new Date();
  const currentYear = now.getFullYear();
  const todayLabel = `${MONTHS[now.getMonth()]} ${currentYear}`;

  const loadAssets = useCallback(
    async (uid: string) => {
      const { data } = await supabase
        .from('assets')
        .select('id, name, asset_type, asset_class, value')
        .eq('user_id', uid)
        .order('created_at', { ascending: true });
      if (data) setAssets(data as AssetRow[]);
    },
    [supabase]
  );

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [{ data: profile }, { data: invest }] = await Promise.all([
        supabase.from('profiles').select('age, liquid_savings').eq('id', user.id).single(),
        supabase.from('investment_settings').select('portfolio_value').eq('user_id', user.id).maybeSingle(),
      ]);

      if (profile?.age) {
        setCurrentAge(profile.age);
        setViewAge(profile.age);
      }
      if (profile?.liquid_savings != null) setLiquidSavings(Number(profile.liquid_savings));
      if (invest?.portfolio_value != null) setPortfolioValue(Number(invest.portfolio_value));
      await loadAssets(user.id);
    })();
  }, [supabase, loadAssets]);

  // Every "wealth object" that sits next to the avatar: the cash pile
  // (liquid savings), the investment portfolio, plus each logged asset.
  const worldObjects = useMemo<WorldObject[]>(() => {
    const list: WorldObject[] = [];
    if (liquidSavings && liquidSavings > 0) {
      list.push({ key: 'cash', kind: 'cash', label: 'Cash', value: liquidSavings });
    }
    if (portfolioValue && portfolioValue > 0) {
      list.push({ key: 'portfolio', kind: 'portfolio', label: 'Investment portfolio', value: portfolioValue });
    }
    assets.forEach((a) => list.push({ key: a.id, kind: a.asset_type, label: a.name, value: a.value }));
    return list;
  }, [liquidSavings, portfolioValue, assets]);

  // Lay objects out on the platform beside the avatar, marching outward
  // on alternating sides, staggered slightly in z so labels don't collide.
  const placed = useMemo(() => {
    const z0 = zForAge(currentAge);
    return worldObjects.map((obj, i) => {
      const side = i % 2 === 0 ? 1 : -1;
      const tier = Math.floor(i / 2);
      const x = side * Math.min(PLATFORM_WIDTH / 2 - 0.9, 2.1 + tier * 1.9);
      const z = z0 + (i % 2 === 0 ? 0.7 : -0.7);
      return { obj, x, z };
    });
  }, [worldObjects, currentAge]);

  const totalNetWorth = useMemo(() => worldObjects.reduce((s, o) => s + o.value, 0), [worldObjects]);

  const classTotals = useMemo(() => {
    const m = new Map<AssetClass, number>();
    if (liquidSavings && liquidSavings > 0) m.set('cash', (m.get('cash') ?? 0) + liquidSavings);
    if (portfolioValue && portfolioValue > 0) m.set('equity', (m.get('equity') ?? 0) + portfolioValue);
    assets.forEach((a) => m.set(a.asset_class, (m.get(a.asset_class) ?? 0) + a.value));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [liquidSavings, portfolioValue, assets]);

  const viewYear = currentYear + (viewAge - currentAge);

  async function addAsset() {
    if (!userId) return;
    const v = parseFloat(value.replace(/[^0-9.]/g, ''));
    if (!name.trim() || !v) return;
    const cls = ASSET_TYPES.find((t) => t.type === assetType)?.cls ?? 'other';
    const { error } = await supabase.from('assets').insert({
      user_id: userId,
      name: name.trim(),
      asset_type: assetType,
      asset_class: cls,
      value: v,
    });
    if (!error) {
      setName('');
      setValue('');
      loadAssets(userId);
    }
  }

  async function removeAsset(id: string) {
    if (!userId) return;
    await supabase.from('assets').delete().eq('id', id);
    loadAssets(userId);
  }

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 mb-6">
      <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--gold)] font-semibold mb-1">Prototype</div>
      <h2 className="font-serif text-lg font-semibold text-[var(--ink)] mb-1">Your life, in space</h2>
      <p className="text-xs text-[var(--muted)] mb-4 max-w-lg">
        You&apos;re standing on today&apos;s block — age {currentAge}, {currentYear}, in Riyadh. Your cash, portfolio
        and assets stand beside you. Slide through the years below; drag inside the scene to look around.
      </p>

      <div className="h-[420px] rounded-xl overflow-hidden bg-[var(--surface-1)] border border-[var(--border-default)]">
        <Canvas shadows camera={{ position: [8, 4.4, zForAge(25) + 10], fov: 45 }}>
          <Sky sunPosition={[80, 25, 60]} turbidity={6} rayleigh={1.2} />
          <ambientLight intensity={0.75} />
          <directionalLight position={[8, 12, 6]} intensity={1.1} castShadow />
          <Timeline currentYear={currentYear} currentAge={currentAge} todayLabel={todayLabel} />
          <group position={[0, 0, zForAge(currentAge)]}>
            <Avatar />
            <SaudiFlag />
          </group>
          <RiyadhSkyline />
          {placed.map(({ obj, x, z }) => (
            <WorldObjectMesh key={obj.key} obj={obj} x={x} z={z} />
          ))}
          <OrbitControls ref={controlsRef} minDistance={2} maxDistance={60} />
          <CameraRig viewAge={viewAge} controlsRef={controlsRef} />
        </Canvas>
      </div>

      {/* year scrubber */}
      <div className="flex items-center gap-4 mt-4 flex-wrap">
        <span className="text-xs text-[var(--muted)] whitespace-nowrap">Age {AGE_START}</span>
        <input
          type="range"
          min={AGE_START}
          max={AGE_END}
          step={1}
          value={viewAge}
          onChange={(e) => setViewAge(parseInt(e.target.value))}
          className="flex-1 min-w-[160px] accent-[var(--green-dark)]"
        />
        <span className="text-xs text-[var(--muted)] whitespace-nowrap">Age {AGE_END}</span>
        <span className="text-xs font-semibold text-[var(--green-dark)] bg-[var(--green-bg)] border border-[var(--green-border)] rounded-full px-3 py-1.5 whitespace-nowrap">
          Viewing age {viewAge} · {viewYear}
        </span>
        {viewAge !== currentAge && (
          <button onClick={() => setViewAge(currentAge)} className="text-xs text-[var(--green-dark)] font-medium whitespace-nowrap">
            Back to today
          </button>
        )}
      </div>

      {/* asset manager */}
      <div className="mt-5 pt-5 border-t border-[var(--border-default)]">
        <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-serif text-base font-semibold text-[var(--ink)]">Your assets</h3>
          <div className="text-xs text-[var(--muted)]">
            Total in scene: <span className="font-semibold text-[var(--ink)]">SAR {Math.round(totalNetWorth).toLocaleString()}</span>
          </div>
        </div>

        {classTotals.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {classTotals.map(([cls, total]) => (
              <span key={cls} className="text-[11px] bg-[var(--surface-1)] border border-[var(--border-default)] rounded-full px-3 py-1 text-[var(--ink-2)]">
                {CLASS_LABEL[cls]} · SAR {Math.round(total).toLocaleString()}
              </span>
            ))}
          </div>
        )}

        {/* add-asset row */}
        <div className="flex flex-wrap items-end gap-2 mb-3">
          <div className="flex-1 min-w-[140px]">
            <label className="text-[11px] text-[var(--muted)] block mb-1">Asset name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tadawul portfolio"
              className="w-full bg-[var(--surface-1)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--green)]"
            />
          </div>
          <div>
            <label className="text-[11px] text-[var(--muted)] block mb-1">Type</label>
            <select
              value={assetType}
              onChange={(e) => setAssetType(e.target.value as AssetType)}
              className="bg-[var(--surface-1)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--ink)] outline-none"
            >
              {ASSET_TYPES.map((t) => (
                <option key={t.type} value={t.type}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-[var(--muted)] block mb-1">Value (SAR)</label>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="100,000"
              className="w-32 bg-[var(--surface-1)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--green)]"
            />
          </div>
          <button onClick={addAsset} className="text-sm bg-[var(--green-dark)] text-white rounded-lg px-4 py-2 font-medium">
            Add asset
          </button>
        </div>

        {/* asset list */}
        {assets.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {assets.map((a) => (
              <span key={a.id} className="flex items-center gap-2 text-xs bg-[var(--surface-1)] border border-[var(--border-default)] rounded-full px-3 py-1.5 text-[var(--ink-2)]">
                {a.name} · SAR {Math.round(a.value).toLocaleString()} · {CLASS_LABEL[a.asset_class]}
                <button onClick={() => removeAsset(a.id)} className="text-[var(--muted)] hover:text-[#C0504D]" title="Remove">✕</button>
              </span>
            ))}
          </div>
        )}
        {liquidSavings == null && portfolioValue == null && assets.length === 0 && (
          <p className="text-xs text-[var(--muted)]">
            Add an asset above, or set your liquid savings (Edit Profile) and portfolio value (Doubling Path) to see
            them appear beside you.
          </p>
        )}
      </div>
    </div>
  );
}
