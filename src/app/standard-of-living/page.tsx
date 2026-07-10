'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface LifePhase {
  id: string;
  phase_name: string;
  start_year: number;
  target_tier: 'basic' | 'decent' | 'lavish';
  target_monthly_spend: number;
}

interface Actual {
  year: number;
  actual_monthly_spend: number;
}

function fmt(n: number) {
  return Math.round(n).toLocaleString();
}

const TIER_COLORS = { basic: '#D89A3E', decent: '#1D9E75', lavish: '#4A78C4' };

export default function StandardOfLivingPage() {
  return (
    <Suspense fallback={<div className="text-sm text-[#898781]">Loading…</div>}>
      <StandardOfLivingInner />
    </Suspense>
  );
}

function StandardOfLivingInner() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') === 'track' ? 'think' : 'decide';
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<'decide' | 'think'>(initialMode);
  const [userId, setUserId] = useState<string | null>(null);
  const [phases, setPhases] = useState<LifePhase[]>([]);
  const [actuals, setActuals] = useState<Actual[]>([]);
  const [loading, setLoading] = useState(true);

  const [trackYear, setTrackYear] = useState(new Date().getFullYear());
  const [trackSpend, setTrackSpend] = useState('');

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setUserId(user.id);

    const [{ data: phaseData }, { data: actualData }] = await Promise.all([
      supabase.from('life_phases').select('*').eq('user_id', user.id).order('start_year', { ascending: true }),
      supabase.from('living_standard_actuals').select('year, actual_monthly_spend').eq('user_id', user.id).order('year', { ascending: true }),
    ]);

    if (phaseData) setPhases(phaseData as LifePhase[]);
    if (actualData) setActuals(actualData as Actual[]);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function addPhase() {
    if (!userId) return;
    const lastYear = phases.length > 0 ? phases[phases.length - 1].start_year + 5 : new Date().getFullYear();
    const { data, error } = await supabase
      .from('life_phases')
      .insert({
        user_id: userId,
        phase_name: 'New phase',
        start_year: lastYear,
        target_tier: 'decent',
        target_monthly_spend: 8000,
        sort_order: phases.length,
      })
      .select()
      .single();
    if (!error && data) setPhases((prev) => [...prev, data as LifePhase]);
  }

  async function updatePhase(id: string, patch: Partial<LifePhase>) {
    setPhases((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    await supabase.from('life_phases').update(patch).eq('id', id);
  }

  async function deletePhase(id: string) {
    setPhases((prev) => prev.filter((p) => p.id !== id));
    await supabase.from('life_phases').delete().eq('id', id);
  }

  async function logActual() {
    if (!userId) return;
    const val = parseFloat(trackSpend.replace(/[^0-9.]/g, ''));
    if (!val) return;
    await supabase.from('living_standard_actuals').upsert(
      { user_id: userId, year: trackYear, actual_monthly_spend: val },
      { onConflict: 'user_id,year' }
    );
    setTrackSpend('');
    load();
  }

  if (loading) {
    return <div className="text-sm text-[#898781]">Loading your life design…</div>;
  }

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-[#141414] mb-1">
        Standard of Living
      </h1>
      <p className="text-sm text-[#3D3D3A] mb-5 max-w-xl">
        Design the stepping stones of your life across decades, then see how
        your actual spending compares to the plan.
      </p>

      <div className="inline-flex gap-1 bg-white border border-black/10 rounded-lg p-1 mb-6">
        <button
          onClick={() => setMode('decide')}
          className={`px-4 py-2 rounded-md text-xs font-medium flex items-center gap-2 ${
            mode === 'decide' ? 'bg-[#141414] text-white' : 'text-[#898781]'
          }`}
        >
          <span className="text-[9px] font-bold uppercase bg-[#E1F5EE] text-[#085041] px-1.5 py-0.5 rounded">
            Decide
          </span>
          Design my plan
        </button>
        <button
          onClick={() => setMode('think')}
          className={`px-4 py-2 rounded-md text-xs font-medium flex items-center gap-2 ${
            mode === 'think' ? 'bg-[#141414] text-white' : 'text-[#898781]'
          }`}
        >
          <span className="text-[9px] font-bold uppercase bg-[#E6F1FB] text-[#0C447C] px-1.5 py-0.5 rounded">
            Think
          </span>
          Track actual vs plan
        </button>
      </div>

      {mode === 'decide' && (
        <div className="space-y-3">
          {phases.map((phase) => (
            <div key={phase.id} className="bg-white border border-black/10 rounded-xl p-4">
              <div className="grid sm:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="text-[10px] text-[#898781] block mb-1">Phase name</label>
                  <input
                    value={phase.phase_name}
                    onChange={(e) => updatePhase(phase.id, { phase_name: e.target.value })}
                    className="w-full bg-[#F5F4F0] border border-black/10 rounded-md px-2 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#898781] block mb-1">Starting year</label>
                  <input
                    type="number"
                    value={phase.start_year}
                    onChange={(e) => updatePhase(phase.id, { start_year: parseInt(e.target.value) || phase.start_year })}
                    className="w-full bg-[#F5F4F0] border border-black/10 rounded-md px-2 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#898781] block mb-1">Target tier</label>
                  <select
                    value={phase.target_tier}
                    onChange={(e) => updatePhase(phase.id, { target_tier: e.target.value as LifePhase['target_tier'] })}
                    className="w-full bg-[#F5F4F0] border border-black/10 rounded-md px-2 py-1.5 text-xs"
                  >
                    <option value="basic">Basic</option>
                    <option value="decent">Decent</option>
                    <option value="lavish">Lavish</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-[#898781] block mb-1">Target monthly spend (SAR)</label>
                  <input
                    type="text"
                    defaultValue={fmt(phase.target_monthly_spend)}
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value.replace(/[^0-9.]/g, ''));
                      if (!isNaN(val)) updatePhase(phase.id, { target_monthly_spend: val });
                    }}
                    className="w-full bg-[#F5F4F0] border border-black/10 rounded-md px-2 py-1.5 text-xs"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: TIER_COLORS[phase.target_tier] }}
                />
                <button onClick={() => deletePhase(phase.id)} className="text-[10px] text-[#A32D2D] ml-auto">
                  Delete phase
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={addPhase}
            className="text-sm text-[#085041] bg-[#E1F5EE] border border-[#5DCAA5] rounded-lg px-4 py-2 font-medium"
          >
            + Add a life phase
          </button>
        </div>
      )}

      {mode === 'think' && (
        <div>
          <div className="bg-white border border-black/10 rounded-2xl p-5 mb-6 flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-[#898781] block mb-1">Year</label>
              <input
                type="number"
                value={trackYear}
                onChange={(e) => setTrackYear(parseInt(e.target.value) || trackYear)}
                className="w-24 border border-black/10 rounded-lg px-3 py-2 text-sm outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-[#898781] block mb-1">Actual monthly spend (SAR)</label>
              <input
                value={trackSpend}
                onChange={(e) => setTrackSpend(e.target.value)}
                placeholder="e.g. 9,200"
                className="w-40 border border-black/10 rounded-lg px-3 py-2 text-sm outline-none"
              />
            </div>
            <button
              onClick={logActual}
              className="text-sm bg-[#085041] text-white rounded-lg px-4 py-2 font-medium"
            >
              Log this year
            </button>
          </div>

          {phases.length === 0 ? (
            <div className="bg-white border border-black/10 rounded-2xl p-8 text-center text-sm text-[#898781]">
              Design your life phases first, in the Decide tab, so there is a
              plan to track against.
            </div>
          ) : (
            <div className="bg-white border border-black/10 rounded-2xl overflow-hidden">
              <div className="px-4 py-2.5 bg-[#F5F4F0] grid grid-cols-3 text-[10px] font-semibold text-[#898781]">
                <span>Year</span>
                <span>Nearest planned phase</span>
                <span className="text-right">Actual vs target</span>
              </div>
              {actuals.map((a) => {
                const nearestPhase = phases
                  .filter((p) => p.start_year <= a.year)
                  .sort((x, y) => y.start_year - x.start_year)[0] || phases[0];
                const diff = a.actual_monthly_spend - nearestPhase.target_monthly_spend;
                return (
                  <div key={a.year} className="px-4 py-2.5 grid grid-cols-3 items-center text-sm border-t border-black/5">
                    <span className="text-[#898781] text-xs">{a.year}</span>
                    <span className="text-xs">{nearestPhase.phase_name}</span>
                    <span className={`text-right text-xs font-medium ${diff <= 0 ? 'text-[#085041]' : 'text-[#A32D2D]'}`}>
                      SAR {fmt(a.actual_monthly_spend)} ({diff >= 0 ? '+' : ''}{fmt(diff)})
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
