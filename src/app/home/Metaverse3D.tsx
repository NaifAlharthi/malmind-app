'use client';

import { useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { createClient } from '@/lib/supabase/client';

const AGE_START = 18;
const AGE_END = 100;
const YEAR_DEPTH = 2.2; // z-distance per year
const PLATFORM_WIDTH = 4.4;

type AssetType = 'cash' | 'car' | 'house';

interface DerivedAsset {
  id: string;
  type: AssetType;
  label: string;
  amount: number;
  age: number;
}

const ASSET_COLORS: Record<AssetType, string> = {
  cash: '#C9A84C',
  car: '#4A78C4',
  house: '#8a5a3c',
};

function zForAge(age: number) {
  return (age - AGE_START) * YEAR_DEPTH;
}

function inferAssetType(fundName: string): AssetType {
  const n = fundName.toLowerCase();
  if (/(home|house|villa|apartment|flat)/.test(n)) return 'house';
  if (/(car|vehicle|auto)/.test(n)) return 'car';
  return 'cash';
}

// ── Avatar: a simple, blocky human figure — torso, head with a basic
// face, arms with hands, legs with feet. No rigging or animation.
function Avatar({ age }: { age: number }) {
  const z = zForAge(age);
  const skin = '#1D9E75';
  const dark = '#085041';
  return (
    <group position={[0, 0, z]}>
      {/* legs */}
      <mesh position={[-0.15, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.11, 0.6, 10]} />
        <meshStandardMaterial color={dark} />
      </mesh>
      <mesh position={[0.15, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.11, 0.6, 10]} />
        <meshStandardMaterial color={dark} />
      </mesh>
      {/* feet */}
      <mesh position={[-0.15, 0.07, 0.06]} castShadow>
        <boxGeometry args={[0.18, 0.12, 0.34]} />
        <meshStandardMaterial color="#141414" />
      </mesh>
      <mesh position={[0.15, 0.07, 0.06]} castShadow>
        <boxGeometry args={[0.18, 0.12, 0.34]} />
        <meshStandardMaterial color="#141414" />
      </mesh>
      {/* torso */}
      <mesh position={[0, 1.05, 0]} castShadow>
        <capsuleGeometry args={[0.32, 0.65, 6, 12]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      {/* arms */}
      <mesh position={[-0.46, 0.95, 0]} rotation={[0, 0, 0.25]} castShadow>
        <cylinderGeometry args={[0.09, 0.09, 0.62, 10]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      <mesh position={[0.46, 0.95, 0]} rotation={[0, 0, -0.25]} castShadow>
        <cylinderGeometry args={[0.09, 0.09, 0.62, 10]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      {/* hands */}
      <mesh position={[-0.58, 0.66, 0]} castShadow>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial color={dark} />
      </mesh>
      <mesh position={[0.58, 0.66, 0]} castShadow>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial color={dark} />
      </mesh>
      {/* head */}
      <mesh position={[0, 1.68, 0]} castShadow>
        <sphereGeometry args={[0.3, 20, 20]} />
        <meshStandardMaterial color={dark} />
      </mesh>
      {/* face: two eyes + a simple mouth, facing +z */}
      <mesh position={[-0.11, 1.72, 0.26]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#141414" />
      </mesh>
      <mesh position={[0.11, 1.72, 0.26]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#141414" />
      </mesh>
      <mesh position={[0, 1.58, 0.27]}>
        <boxGeometry args={[0.16, 0.03, 0.02]} />
        <meshStandardMaterial color="#141414" />
      </mesh>
    </group>
  );
}

// ── One continuous platform (not separate tiles) spanning the whole
// timeline, with a flush marker line + "age · year" label every 5 years.
function Timeline({ currentYear, currentAge }: { currentYear: number; currentAge: number }) {
  const totalDepth = zForAge(AGE_END) - zForAge(AGE_START);
  const centerZ = zForAge(AGE_START) + totalDepth / 2;

  const markers = [];
  for (let age = AGE_START; age <= AGE_END; age += 5) {
    const z = zForAge(age);
    const year = currentYear + (age - currentAge);
    markers.push(
      <group key={age} position={[0, 0.001, z]}>
        <mesh receiveShadow>
          <boxGeometry args={[PLATFORM_WIDTH, 0.01, 0.05]} />
          <meshStandardMaterial color="#3D3D3A" />
        </mesh>
        <Text
          position={[-PLATFORM_WIDTH / 2 - 0.15, 0.02, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.3}
          color="#898781"
          anchorX="right"
          anchorY="middle"
        >
          {`Age ${age} · ${year}`}
        </Text>
      </group>
    );
  }

  return (
    <>
      <mesh receiveShadow position={[0, -0.05, centerZ]}>
        <boxGeometry args={[PLATFORM_WIDTH, 0.1, totalDepth + 0.4]} />
        <meshStandardMaterial color="#EFEDE8" />
      </mesh>
      {markers}
    </>
  );
}

function AssetObject({ asset }: { asset: DerivedAsset }) {
  const z = zForAge(asset.age);
  const color = ASSET_COLORS[asset.type];
  const label = `${asset.label} — SAR ${Math.round(asset.amount).toLocaleString()}`;

  let shape = null;
  if (asset.type === 'cash') {
    shape = (
      <group position={[1.1, 0, 0]}>
        <mesh position={[0, 0.1, 0]} castShadow><boxGeometry args={[0.5, 0.2, 0.35]} /><meshStandardMaterial color={color} /></mesh>
        <mesh position={[0, 0.32, 0]} castShadow><boxGeometry args={[0.45, 0.2, 0.32]} /><meshStandardMaterial color={color} /></mesh>
        <mesh position={[0, 0.54, 0]} castShadow><boxGeometry args={[0.4, 0.2, 0.28]} /><meshStandardMaterial color={color} /></mesh>
      </group>
    );
  } else if (asset.type === 'car') {
    shape = (
      <group position={[1.1, 0, 0]}>
        <mesh position={[0, 0.25, 0]} castShadow><boxGeometry args={[0.9, 0.35, 0.5]} /><meshStandardMaterial color={color} /></mesh>
        <mesh position={[0, 0.5, 0]} castShadow><boxGeometry args={[0.55, 0.25, 0.45]} /><meshStandardMaterial color={color} /></mesh>
      </group>
    );
  } else {
    shape = (
      <group position={[1.1, 0, 0]}>
        <mesh position={[0, 0.35, 0]} castShadow><boxGeometry args={[0.7, 0.7, 0.7]} /><meshStandardMaterial color={color} /></mesh>
        <mesh position={[0, 0.85, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[0.58, 0.5, 4]} /><meshStandardMaterial color="#5c3a24" /></mesh>
      </group>
    );
  }

  return (
    <group position={[0, 0, z]}>
      {shape}
      <Text position={[1.1, 1.15, 0]} fontSize={0.2} color="#141414" anchorX="center" anchorY="middle" outlineWidth={0.01} outlineColor="#F5F4F0">
        {label}
      </Text>
    </group>
  );
}

export default function Metaverse3D() {
  const supabase = createClient();
  const [currentAge, setCurrentAge] = useState(25);
  const [liquidSavings, setLiquidSavings] = useState<number | null>(null);
  const [goalFunds, setGoalFunds] = useState<{ name: string; target_amount: number; maturity_years: number; start_date: string }[]>([]);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: profile }, { data: funds }] = await Promise.all([
        supabase.from('profiles').select('age, liquid_savings').eq('id', user.id).single(),
        supabase.from('goal_funds').select('name, target_amount, maturity_years, start_date').eq('user_id', user.id),
      ]);

      if (profile?.age) setCurrentAge(profile.age);
      if (profile?.liquid_savings != null) setLiquidSavings(Number(profile.liquid_savings));
      if (funds) setGoalFunds(funds);
    })();
  }, [supabase]);

  const assets = useMemo<DerivedAsset[]>(() => {
    const list: DerivedAsset[] = [];
    if (liquidSavings && liquidSavings > 0) {
      list.push({ id: 'cash', type: 'cash', label: 'Cash', amount: liquidSavings, age: currentAge });
    }
    goalFunds.forEach((f, i) => {
      const startYear = new Date(f.start_date).getFullYear();
      const maturityYear = startYear + Math.round(f.maturity_years);
      const age = Math.max(AGE_START, Math.min(AGE_END, currentAge + (maturityYear - currentYear)));
      list.push({
        id: `fund-${i}`,
        type: inferAssetType(f.name),
        label: f.name,
        amount: f.target_amount,
        age,
      });
    });
    return list;
  }, [liquidSavings, goalFunds, currentAge, currentYear]);

  const cameraTarget = useMemo<[number, number, number]>(() => [0, 0.5, zForAge(currentAge)], [currentAge]);

  return (
    <div className="bg-white border border-black/10 rounded-2xl p-5 mb-6">
      <div className="text-[10px] tracking-[0.1em] uppercase text-[#C9A84C] font-semibold mb-1">Prototype</div>
      <h2 className="font-serif text-lg font-semibold text-[#141414] mb-1">Your life, in space</h2>
      <p className="text-xs text-[#898781] mb-4 max-w-lg">
        You&apos;re standing at age {currentAge}, {currentYear}. Your cash and goal funds appear automatically,
        placed where they matter on the timeline. Drag to look around.
      </p>

      <div className="h-[380px] rounded-xl overflow-hidden bg-[#F5F4F0] border border-black/5">
        <Canvas shadows camera={{ position: [5.5, 3.4, zForAge(currentAge) + 7], fov: 45 }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 8, 5]} intensity={1} castShadow />
          <Timeline currentYear={currentYear} currentAge={currentAge} />
          <Avatar age={currentAge} />
          {assets.map((a) => (
            <AssetObject key={a.id} asset={a} />
          ))}
          <OrbitControls target={cameraTarget} minDistance={2} maxDistance={30} />
        </Canvas>
      </div>

      {assets.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {assets.map((a) => (
            <span key={a.id} className="text-xs bg-[#F5F4F0] border border-black/10 rounded-full px-3 py-1.5">
              {a.label} · SAR {Math.round(a.amount).toLocaleString()} · age {a.age}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
