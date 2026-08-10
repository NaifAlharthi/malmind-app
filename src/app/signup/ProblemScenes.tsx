'use client';

// The living mini-scenes for the four fundamental problems, rendered inside
// the landing splash's act rotation. Each scene draws its problem rather than
// stating it: branching futures for "balances, not decisions", filling gauges
// for "numbers without meaning", and the hidden-wealth reveal for "wealth
// isn't just cash". (The scattered-chips scene lives in Splash itself.)
// Keyframes fpDraw / fpGlowIn are defined in Splash's style block.

export function SceneFutures({ ar }: { ar: boolean }) {
  return (
    <div className="w-full h-full" dir="ltr">
    <svg viewBox="0 0 360 240" className="w-full h-full">
      {[40, 100, 160, 220].map((y) => <line key={y} x1="0" y1={y} x2="360" y2={y} stroke="rgba(255,255,255,0.06)" />)}
      <path d="M20 190 C70 180 110 168 150 150" fill="none" stroke="#5DCAA5" strokeWidth="3" strokeLinecap="round" strokeDasharray="300" style={{ animation: 'fpDraw 1.2s ease-out both' }} />
      <circle cx="150" cy="150" r="6" fill="#EAFBF3" stroke="#5DCAA5" strokeWidth="2.5" />
      <text x="150" y="136" textAnchor="middle" fontSize="10" fill="#ffffff99">{ar ? 'اليوم' : 'today'}</text>
      {[
        { d: 'M150 150 C210 120 270 70 340 34', color: '#5DCAA5', label: ar ? 'استثمر الفائض' : 'invest the surplus', lx: 268, ly: 52 },
        { d: 'M150 150 C215 140 280 132 340 126', color: '#E4C465', label: ar ? 'اشترِ الفيلا 2028' : 'buy the villa 2028', lx: 272, ly: 118 },
        { d: 'M150 150 C210 165 275 185 340 200', color: '#E08A6D', label: ar ? 'واصِل كما أنت' : 'change nothing', lx: 268, ly: 196 },
      ].map((f, i) => (
        <g key={i}>
          <path d={f.d} fill="none" stroke={f.color} strokeWidth="2" strokeDasharray="6 5" opacity="0.9" style={{ animation: `fpDraw 1.4s ease-out ${0.5 + i * 0.25}s both` }} />
          <text x={f.lx} y={f.ly} textAnchor="middle" fontSize="10" fill={f.color}>{f.label}</text>
        </g>
      ))}
    </svg>
    </div>
  );
}

export function SceneVitals({ ar }: { ar: boolean }) {
  const gauges = [
    { label: ar ? 'مدى الأمان' : 'runway', value: ar ? '7.8 أشهر' : '7.8 months', pct: 0.78, color: '#5DCAA5' },
    { label: ar ? 'معدل الادخار' : 'savings rate', value: '34%', pct: 0.34, color: '#E4C465' },
    { label: ar ? 'عبء الدين' : 'debt burden', value: '18%', pct: 0.18, color: '#17B8C9' },
  ];
  const R = 34, C = Math.PI * R; // half circle
  return (
    <div className="h-full flex items-center justify-center gap-5 flex-wrap" dir="ltr">
      {gauges.map((g, i) => (
        <div key={g.label} className="text-center">
          <svg viewBox="0 0 100 60" className="w-28 h-16">
            <path d={`M 16 54 A ${R} ${R} 0 0 1 84 54`} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="9" strokeLinecap="round" />
            <path d={`M 16 54 A ${R} ${R} 0 0 1 84 54`} fill="none" stroke={g.color} strokeWidth="9" strokeLinecap="round"
              strokeDasharray={`${C * g.pct} ${C}`} style={{ animation: `fpDraw 1.3s ease-out ${0.3 + i * 0.3}s both`, strokeDashoffset: 0 }} />
          </svg>
          <div className="font-serif text-lg font-bold text-white -mt-1">{g.value}</div>
          <div className="text-[10px] text-white/50">{g.label}</div>
        </div>
      ))}
    </div>
  );
}

export function SceneHiddenWealth({ ar }: { ar: boolean }) {
  const seen = [
    { icon: '💳', label: ar ? 'حساب البنك' : 'bank account' },
    { icon: '📈', label: ar ? 'المحفظة' : 'portfolio' },
  ];
  const hidden = [
    { icon: '🏜️', label: ar ? 'أرض القصيم' : 'Qassim land' },
    { icon: '🐫', label: ar ? 'الإبل' : 'camels' },
    { icon: '🪙', label: ar ? 'ذهب البيت' : 'household gold' },
    { icon: '🏪', label: ar ? 'حصة المشروع' : 'venture stake' },
  ];
  return (
    <div className="h-full flex flex-col justify-center gap-4">
      <div>
        <div className="text-[10px] text-white/40 uppercase tracking-[0.1em] mb-2">{ar ? 'ما تراه التطبيقات' : 'what apps see'}</div>
        <div className="flex gap-2.5 flex-wrap">
          {seen.map((s) => (
            <span key={s.icon} className="text-[11px] text-white/85 bg-white/[0.07] border border-white/20 rounded-xl px-3.5 py-2.5">{s.icon} {s.label}</span>
          ))}
        </div>
      </div>
      <div>
        <div className="text-[10px] text-[#E4C465] uppercase tracking-[0.1em] mb-2">{ar ? '…وما لا تراه — ونراه نحن' : "…what they don't — and we do"}</div>
        <div className="flex gap-2.5 flex-wrap">
          {hidden.map((h, i) => (
            <span key={h.icon} className="text-[11px] text-white bg-[#C9A84C]/15 border border-[#C9A84C]/50 rounded-xl px-3.5 py-2.5"
              style={{ animation: `fpGlowIn 0.8s ease ${0.5 + i * 0.35}s both` }}>
              {h.icon} {h.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
