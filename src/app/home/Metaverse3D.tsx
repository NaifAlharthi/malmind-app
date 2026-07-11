'use client';

import { useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { createClient } from '@/lib/supabase/client';

const AGE_START = 18;
const AGE_END = 100;
const BLOCK_SPACING = 2.2;
const BLOCK_SIZE = 1.6;

type AssetType = 'cash' | 'car' | 'house';

interface Asset {
  id: string;
  type: AssetType;
  amount: string;
  age: number;
}

const ASSET_COLORS: Record<AssetType, string> = {
  cash: '#C9A84C',
  car: '#4A78C4',
  house: '#8a5a3c',
};

const ASSET_LABEL: Record<AssetType, string> = {
  cash: 'Cash',
  car: 'Car',
  house: 'House',
};

function zForAge(age: number) {
  return (age - AGE_START) * BLOCK_SPACING;
}

function Avatar({ age }: { age: number }) {
  const z = zForAge(age);
  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <capsuleGeometry args={[0.35, 0.9, 6, 12]} />
        <meshStandardMaterial color="#1D9E75" />
      </mesh>
      <mesh position={[0, 1.75, 0]} castShadow>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#085041" />
      </mesh>
    </group>
  );
}

function TimelineBlocks() {
  const blocks = [];
  for (let age = AGE_START; age <= AGE_END; age++) {
    const z = zForAge(age);
    const labeled = age % 5 === 0;
    blocks.push(
      <group key={age} position={[0, 0, z]}>
        <mesh receiveShadow position={[0, -0.05, 0]}>
          <boxGeometry args={[BLOCK_SIZE, 0.1, BLOCK_SIZE]} />
          <meshStandardMaterial color={labeled ? '#3D3D3A' : '#EFEDE8'} />
        </mesh>
        {labeled && (
          <Text position={[-1.3, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.35} color="#898781" anchorX="right" anchorY="middle">
            {age}
          </Text>
        )}
      </group>
    );
  }
  return <>{blocks}</>;
}

function AssetObject({ asset }: { asset: Asset }) {
  const z = zForAge(asset.age);
  const color = ASSET_COLORS[asset.type];
  const label = `${ASSET_LABEL[asset.type]} — SAR ${Number(asset.amount).toLocaleString()}`;

  let shape = null;
  if (asset.type === 'cash') {
    shape = (
      <group position={[0.9, 0, 0]}>
        <mesh position={[0, 0.1, 0]} castShadow><boxGeometry args={[0.5, 0.2, 0.35]} /><meshStandardMaterial color={color} /></mesh>
        <mesh position={[0, 0.32, 0]} castShadow><boxGeometry args={[0.45, 0.2, 0.32]} /><meshStandardMaterial color={color} /></mesh>
        <mesh position={[0, 0.54, 0]} castShadow><boxGeometry args={[0.4, 0.2, 0.28]} /><meshStandardMaterial color={color} /></mesh>
      </group>
    );
  } else if (asset.type === 'car') {
    shape = (
      <group position={[0.9, 0, 0]}>
        <mesh position={[0, 0.25, 0]} castShadow><boxGeometry args={[0.9, 0.35, 0.5]} /><meshStandardMaterial color={color} /></mesh>
        <mesh position={[0, 0.5, 0]} castShadow><boxGeometry args={[0.55, 0.25, 0.45]} /><meshStandardMaterial color={color} /></mesh>
      </group>
    );
  } else {
    shape = (
      <group position={[0.9, 0, 0]}>
        <mesh position={[0, 0.35, 0]} castShadow><boxGeometry args={[0.7, 0.7, 0.7]} /><meshStandardMaterial color={color} /></mesh>
        <mesh position={[0, 0.85, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[0.58, 0.5, 4]} /><meshStandardMaterial color="#5c3a24" /></mesh>
      </group>
    );
  }

  return (
    <group position={[0, 0, z]}>
      {shape}
      <Text position={[0.9, 1.15, 0]} fontSize={0.22} color="#141414" anchorX="center" anchorY="middle" outlineWidth={0.01} outlineColor="#F5F4F0">
        {label}
      </Text>
    </group>
  );
}

export default function Metaverse3D() {
  const supabase = createClient();
  const [currentAge, setCurrentAge] = useState(25);
  const [assets, setAssets] = useState<Asset[]>([]);

  const [type, setType] = useState<AssetType>('cash');
  const [amount, setAmount] = useState('100000');
  const [placeAge, setPlaceAge] = useState('25');

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('age').eq('id', user.id).single();
      if (data?.age) {
        setCurrentAge(data.age);
        setPlaceAge(String(data.age));
      }
    })();
  }, [supabase]);

  const cameraTarget = useMemo<[number, number, number]>(() => [0, 0.5, zForAge(currentAge)], [currentAge]);

  function addAsset() {
    const ageNum = Math.max(AGE_START, Math.min(AGE_END, parseInt(placeAge) || currentAge));
    const amountNum = parseFloat(amount.replace(/[^0-9.]/g, ''));
    if (!amountNum) return;
    setAssets((prev) => [...prev, { id: crypto.randomUUID(), type, amount: String(amountNum), age: ageNum }]);
  }

  function removeAsset(id: string) {
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="bg-white border border-black/10 rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-1">
        <div>
          <div className="text-[10px] tracking-[0.1em] uppercase text-[#C9A84C] font-semibold mb-1">Prototype</div>
          <h2 className="font-serif text-lg font-semibold text-[#141414]">Your life, in space</h2>
        </div>
      </div>
      <p className="text-xs text-[#898781] mb-4 max-w-lg">
        You&apos;re standing on the block for age {currentAge}. Add an asset to any year on the timeline to see it
        take shape. Drag to look around.
      </p>

      <div className="h-[380px] rounded-xl overflow-hidden bg-[#F5F4F0] border border-black/5">
        <Canvas shadows camera={{ position: [4.5, 3.2, zForAge(currentAge) + 6], fov: 45 }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 8, 5]} intensity={1} castShadow />
          <TimelineBlocks />
          <Avatar age={currentAge} />
          {assets.map((a) => (
            <AssetObject key={a.id} asset={a} />
          ))}
          <OrbitControls target={cameraTarget} minDistance={2} maxDistance={30} />
        </Canvas>
      </div>

      <div className="flex flex-wrap items-end gap-3 mt-4">
        <div>
          <label className="text-xs text-[#898781] block mb-1">Asset</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as AssetType)}
            className="border border-black/10 rounded-lg px-3 py-2 text-sm outline-none"
          >
            <option value="cash">Cash</option>
            <option value="car">Car</option>
            <option value="house">House</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-[#898781] block mb-1">Amount (SAR)</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-32 border border-black/10 rounded-lg px-3 py-2 text-sm outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-[#898781] block mb-1">At age</label>
          <input
            type="number"
            min={AGE_START}
            max={AGE_END}
            value={placeAge}
            onChange={(e) => setPlaceAge(e.target.value)}
            className="w-20 border border-black/10 rounded-lg px-3 py-2 text-sm outline-none"
          />
        </div>
        <button
          onClick={addAsset}
          className="text-sm bg-[#085041] text-white rounded-lg px-4 py-2 font-medium"
        >
          Add to timeline
        </button>
      </div>

      {assets.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {assets.map((a) => (
            <span key={a.id} className="flex items-center gap-2 text-xs bg-[#F5F4F0] border border-black/10 rounded-full px-3 py-1.5">
              {ASSET_LABEL[a.type]} · SAR {Number(a.amount).toLocaleString()} · age {a.age}
              <button onClick={() => removeAsset(a.id)} className="text-[#898781] hover:text-[#A32D2D]">✕</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
