'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sky, Text } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
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

// ── Avatar: a Minecraft-style blocky figure in Saudi attire — a white
// thobe covering torso and legs down to the ankles, sandals, skin-tone
// face and hands, and a red-and-white shemagh with a black agal.
function Avatar({ age }: { age: number }) {
  const z = zForAge(age);
  const thobe = '#F7F5EF';
  const skin = '#C68E5A';
  const shemagh = '#C0392B';
  const agal = '#141414';
  return (
    <group position={[0, 0, z]}>
      {/* thobe skirt — one long block down to the ankles */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[0.56, 1.1, 0.36]} />
        <meshStandardMaterial color={thobe} />
      </mesh>
      {/* sandaled feet peeking out */}
      <mesh position={[-0.15, 0.05, 0.08]} castShadow>
        <boxGeometry args={[0.2, 0.1, 0.34]} />
        <meshStandardMaterial color="#8a5a3c" />
      </mesh>
      <mesh position={[0.15, 0.05, 0.08]} castShadow>
        <boxGeometry args={[0.2, 0.1, 0.34]} />
        <meshStandardMaterial color="#8a5a3c" />
      </mesh>
      {/* torso */}
      <mesh position={[0, 1.35, 0]} castShadow>
        <boxGeometry args={[0.6, 0.5, 0.38]} />
        <meshStandardMaterial color={thobe} />
      </mesh>
      {/* arms — thobe sleeves */}
      <mesh position={[-0.42, 1.25, 0]} castShadow>
        <boxGeometry args={[0.22, 0.68, 0.24]} />
        <meshStandardMaterial color={thobe} />
      </mesh>
      <mesh position={[0.42, 1.25, 0]} castShadow>
        <boxGeometry args={[0.22, 0.68, 0.24]} />
        <meshStandardMaterial color={thobe} />
      </mesh>
      {/* hands */}
      <mesh position={[-0.42, 0.85, 0]} castShadow>
        <boxGeometry args={[0.18, 0.16, 0.2]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      <mesh position={[0.42, 0.85, 0]} castShadow>
        <boxGeometry args={[0.18, 0.16, 0.2]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      {/* head */}
      <mesh position={[0, 1.85, 0]} castShadow>
        <boxGeometry args={[0.42, 0.42, 0.42]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      {/* face: eyes + beard, facing +z */}
      <mesh position={[-0.09, 1.92, 0.215]}>
        <boxGeometry args={[0.07, 0.07, 0.02]} />
        <meshStandardMaterial color="#141414" />
      </mesh>
      <mesh position={[0.09, 1.92, 0.215]}>
        <boxGeometry args={[0.07, 0.07, 0.02]} />
        <meshStandardMaterial color="#141414" />
      </mesh>
      <mesh position={[0, 1.7, 0.215]}>
        <boxGeometry args={[0.3, 0.1, 0.02]} />
        <meshStandardMaterial color="#4a2f1b" />
      </mesh>
      {/* shemagh: cap over the top, drape behind and over the shoulders */}
      <mesh position={[0, 2.09, -0.02]} castShadow>
        <boxGeometry args={[0.5, 0.14, 0.5]} />
        <meshStandardMaterial color={shemagh} />
      </mesh>
      <mesh position={[0, 1.82, -0.24]} castShadow>
        <boxGeometry args={[0.5, 0.6, 0.08]} />
        <meshStandardMaterial color={shemagh} />
      </mesh>
      <mesh position={[-0.25, 1.85, 0]} castShadow>
        <boxGeometry args={[0.06, 0.5, 0.46]} />
        <meshStandardMaterial color={shemagh} />
      </mesh>
      <mesh position={[0.25, 1.85, 0]} castShadow>
        <boxGeometry args={[0.06, 0.5, 0.46]} />
        <meshStandardMaterial color={shemagh} />
      </mesh>
      {/* agal — the black double ring on top */}
      <mesh position={[0, 2.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.24, 0.035, 8, 20]} />
        <meshStandardMaterial color={agal} />
      </mesh>
    </group>
  );
}

// ── Saudi flag on a pole beside the figure.
function SaudiFlag({ age }: { age: number }) {
  const z = zForAge(age);
  return (
    <group position={[-1.5, 0, z]}>
      <mesh position={[0, 1.25, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 2.5, 8]} />
        <meshStandardMaterial color="#B4B2A9" />
      </mesh>
      <mesh position={[0.45, 2.2, 0]} castShadow>
        <boxGeometry args={[0.9, 0.55, 0.03]} />
        <meshStandardMaterial color="#165B33" />
      </mesh>
      {/* white band hinting the shahada script and sword */}
      <mesh position={[0.45, 2.26, 0.02]}>
        <boxGeometry args={[0.6, 0.08, 0.01]} />
        <meshStandardMaterial color="#F7F5EF" />
      </mesh>
      <mesh position={[0.45, 2.1, 0.02]}>
        <boxGeometry args={[0.5, 0.04, 0.01]} />
        <meshStandardMaterial color="#F7F5EF" />
      </mesh>
    </group>
  );
}

// ── Miniature Riyadh skyline: Kingdom Centre, Al Faisaliyah, and a KAFD
// cluster, standing on the ground beside the figure's current position.
function RiyadhSkyline({ age }: { age: number }) {
  const z = zForAge(age);
  return (
    <group position={[-4.2, 0, z]}>
      {/* Kingdom Centre — tapering slab with the signature opening + bridge */}
      <group position={[0, 0, -2.2]}>
        <mesh position={[0, 1.5, 0]} castShadow>
          <boxGeometry args={[1.3, 3, 0.55]} />
          <meshStandardMaterial color="#34495E" metalness={0.4} roughness={0.4} />
        </mesh>
        <mesh position={[-0.45, 3.55, 0]} castShadow>
          <boxGeometry args={[0.4, 1.1, 0.5]} />
          <meshStandardMaterial color="#34495E" metalness={0.4} roughness={0.4} />
        </mesh>
        <mesh position={[0.45, 3.55, 0]} castShadow>
          <boxGeometry args={[0.4, 1.1, 0.5]} />
          <meshStandardMaterial color="#34495E" metalness={0.4} roughness={0.4} />
        </mesh>
        <mesh position={[0, 4.22, 0]} castShadow>
          <boxGeometry args={[1.3, 0.25, 0.5]} />
          <meshStandardMaterial color="#5DCAA5" metalness={0.3} roughness={0.5} />
        </mesh>
        <Text position={[0, -0.01, 1.1]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.22} color="#3D3D3A" anchorX="center">
          Kingdom Centre
        </Text>
      </group>

      {/* Al Faisaliyah — four-sided taper with the golden sphere and spike */}
      <group position={[-0.4, 0, 1.2]}>
        <mesh position={[0, 1.6, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[0.85, 3.2, 4]} />
          <meshStandardMaterial color="#7E96A8" metalness={0.4} roughness={0.4} />
        </mesh>
        <mesh position={[0, 2.75, 0]} castShadow>
          <sphereGeometry args={[0.26, 16, 16]} />
          <meshStandardMaterial color="#C9A84C" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0, 3.5, 0]} castShadow>
          <coneGeometry args={[0.06, 0.7, 6]} />
          <meshStandardMaterial color="#7E96A8" />
        </mesh>
        <Text position={[0, -0.01, 1.15]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.22} color="#3D3D3A" anchorX="center">
          Al Faisaliyah
        </Text>
      </group>

      {/* KAFD — a cluster of angular dark towers */}
      <group position={[-1.3, 0, 4.2]}>
        <mesh position={[0, 1.4, 0]} rotation={[0, 0.3, 0]} castShadow>
          <boxGeometry args={[0.6, 2.8, 0.6]} />
          <meshStandardMaterial color="#2C3E50" metalness={0.5} roughness={0.35} />
        </mesh>
        <mesh position={[0.75, 1.05, 0.4]} rotation={[0, -0.2, 0]} castShadow>
          <boxGeometry args={[0.5, 2.1, 0.5]} />
          <meshStandardMaterial color="#3D5166" metalness={0.5} roughness={0.35} />
        </mesh>
        <mesh position={[-0.6, 0.85, 0.55]} rotation={[0, 0.55, 0]} castShadow>
          <boxGeometry args={[0.45, 1.7, 0.45]} />
          <meshStandardMaterial color="#22303E" metalness={0.5} roughness={0.35} />
        </mesh>
        <Text position={[0, -0.01, 1.2]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.22} color="#3D3D3A" anchorX="center">
          KAFD
        </Text>
      </group>
    </group>
  );
}

// ── One continuous platform with a marker line for EVERY year, and a
// bolder line + "age · year" label every 5 years.
function Timeline({ currentYear, currentAge }: { currentYear: number; currentAge: number }) {
  const totalDepth = zForAge(AGE_END) - zForAge(AGE_START);
  const centerZ = zForAge(AGE_START) + totalDepth / 2;

  const markers = [];
  for (let age = AGE_START; age <= AGE_END; age++) {
    const z = zForAge(age);
    const isMajor = age % 5 === 0;
    const year = currentYear + (age - currentAge);
    markers.push(
      <group key={age} position={[0, 0.001, z]}>
        <mesh receiveShadow>
          <boxGeometry args={[PLATFORM_WIDTH, 0.01, isMajor ? 0.06 : 0.02]} />
          <meshStandardMaterial color={isMajor ? '#3D3D3A' : '#C9C6B8'} />
        </mesh>
        {isMajor && (
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
        )}
      </group>
    );
  }

  return (
    <>
      {/* wide desert ground beneath everything */}
      <mesh receiveShadow position={[0, -0.12, centerZ]}>
        <boxGeometry args={[80, 0.04, totalDepth + 60]} />
        <meshStandardMaterial color="#E8E2D0" />
      </mesh>
      {/* the timeline platform itself */}
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

// ── Smoothly pans the camera + orbit target along the timeline whenever
// the "viewing age" changes, without disturbing the user's orbit angle.
function CameraRig({ viewAge, controlsRef }: { viewAge: number; controlsRef: React.RefObject<OrbitControlsImpl | null> }) {
  const initialized = useRef(false);
  useFrame(({ camera }) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const desired = zForAge(viewAge);
    if (!initialized.current) {
      controls.target.set(0, 0.8, desired);
      camera.position.set(6, 3.6, desired + 8);
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
  const [currentAge, setCurrentAge] = useState(25);
  const [viewAge, setViewAge] = useState(25);
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

      if (profile?.age) {
        setCurrentAge(profile.age);
        setViewAge(profile.age);
      }
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

  const viewYear = currentYear + (viewAge - currentAge);

  return (
    <div className="bg-white border border-black/10 rounded-2xl p-5 mb-6">
      <div className="text-[10px] tracking-[0.1em] uppercase text-[#C9A84C] font-semibold mb-1">Prototype</div>
      <h2 className="font-serif text-lg font-semibold text-[#141414] mb-1">Your life, in space</h2>
      <p className="text-xs text-[#898781] mb-4 max-w-lg">
        You&apos;re standing at age {currentAge}, {currentYear}, in Riyadh. Slide through the years below and the
        view follows. Drag inside the scene to look around.
      </p>

      <div className="h-[380px] rounded-xl overflow-hidden bg-[#F5F4F0] border border-black/5">
        <Canvas shadows camera={{ position: [6, 3.6, zForAge(25) + 8], fov: 45 }}>
          <Sky sunPosition={[80, 25, 60]} turbidity={6} rayleigh={1.2} />
          <ambientLight intensity={0.75} />
          <directionalLight position={[8, 12, 6]} intensity={1.1} castShadow />
          <Timeline currentYear={currentYear} currentAge={currentAge} />
          <Avatar age={currentAge} />
          <SaudiFlag age={currentAge} />
          <RiyadhSkyline age={currentAge} />
          {assets.map((a) => (
            <AssetObject key={a.id} asset={a} />
          ))}
          <OrbitControls ref={controlsRef} minDistance={2} maxDistance={40} />
          <CameraRig viewAge={viewAge} controlsRef={controlsRef} />
        </Canvas>
      </div>

      {/* year scrubber */}
      <div className="flex items-center gap-4 mt-4">
        <span className="text-xs text-[#898781] whitespace-nowrap">Age {AGE_START}</span>
        <input
          type="range"
          min={AGE_START}
          max={AGE_END}
          step={1}
          value={viewAge}
          onChange={(e) => setViewAge(parseInt(e.target.value))}
          className="flex-1 accent-[#085041]"
        />
        <span className="text-xs text-[#898781] whitespace-nowrap">Age {AGE_END}</span>
        <span className="text-xs font-semibold text-[#085041] bg-[#E1F5EE] border border-[#5DCAA5] rounded-full px-3 py-1.5 whitespace-nowrap">
          Viewing age {viewAge} · {viewYear}
        </span>
        {viewAge !== currentAge && (
          <button
            onClick={() => setViewAge(currentAge)}
            className="text-xs text-[#085041] font-medium whitespace-nowrap"
          >
            Back to today
          </button>
        )}
      </div>

      {assets.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {assets.map((a) => (
            <button
              key={a.id}
              onClick={() => setViewAge(a.age)}
              className="text-xs bg-[#F5F4F0] border border-black/10 rounded-full px-3 py-1.5 hover:border-[#1D9E75]"
              title="Jump to this point on the timeline"
            >
              {a.label} · SAR {Math.round(a.amount).toLocaleString()} · age {a.age}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
