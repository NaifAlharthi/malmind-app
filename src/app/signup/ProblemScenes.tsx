'use client';

// The living mini-scenes for the four fundamental problems, rendered inside
// the landing splash's act rotation. Each scene draws its problem rather than
// stating it: branching futures for "balances, not decisions", filling gauges
// for "numbers without meaning", and the hidden-wealth reveal for "wealth
// isn't just cash". (The scattered-chips scene lives in Splash itself.)
// Keyframes fpDraw / fpGlowIn are defined in Splash's style block.

// Act 1 — the scattered life as it actually looks: three separate app
// screens (bank · trading · subscriptions), each holding one shard of the
// picture, visibly not talking to each other. Generic Saudi-style app UIs —
// deliberately no real bank branding.
export function SceneApps({ ar }: { ar: boolean }) {
  const phone = 'absolute w-[150px] rounded-2xl border border-white/15 shadow-2xl overflow-hidden backdrop-blur-sm';
  return (
    <div className="relative h-full" dir={ar ? 'rtl' : 'ltr'}>
      {/* bank app */}
      <div className={phone} style={{ insetInlineStart: '2%', top: '6%', transform: 'rotate(-5deg)', background: '#101B3A', animation: 'mmFloat 5s ease-in-out infinite' }}>
        <div className="px-3 py-2 text-[9px] font-semibold text-white flex items-center gap-1.5" style={{ background: 'linear-gradient(120deg, #1B2C64, #3D2B7D)' }}>
          🏦 {ar ? 'تطبيق البنك' : 'Bank app'}
        </div>
        <div className="p-3">
          <div className="text-[8px] text-white/45">{ar ? 'الحساب الجاري' : 'Current account'}</div>
          <div className="text-[15px] font-bold text-white mb-1.5">28,450 <span className="text-[8px] font-normal text-white/50">{ar ? 'ريال' : 'SAR'}</span></div>
          <div className="text-[8px] text-white/40 mb-2" dir="ltr">SA03 8000 •••• 2210</div>
          <div className="flex gap-1">
            {[ar ? 'تحويل' : 'Send', ar ? 'سداد' : 'Pay', ar ? 'فواتير' : 'Bills'].map((b) => (
              <span key={b} className="text-[7.5px] text-white/80 bg-white/10 rounded-md px-1.5 py-1">{b}</span>
            ))}
          </div>
        </div>
      </div>

      {/* trading app */}
      <div className={phone} style={{ insetInlineStart: '38%', top: '0%', transform: 'rotate(3deg)', background: '#0A231C', animation: 'mmFloat 5.6s ease-in-out 0.6s infinite' }}>
        <div className="px-3 py-2 text-[9px] font-semibold text-white flex items-center gap-1.5" style={{ background: 'linear-gradient(120deg, #0E5A3E, #17B8C9)' }}>
          📈 {ar ? 'تطبيق التداول' : 'Trading app'}
        </div>
        <div className="p-3">
          <div className="text-[8px] text-white/45">{ar ? 'قيمة المحفظة' : 'Portfolio value'}</div>
          <div className="text-[15px] font-bold text-white">96,300 <span className="text-[8px] font-normal text-[#7FE8C4]">+8.2%</span></div>
          <svg viewBox="0 0 100 26" className="w-full h-6 mt-1">
            <path d="M2 22 C20 20 30 14 45 15 C60 16 70 8 98 4" fill="none" stroke="#5DCAA5" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <div className="flex justify-between text-[7.5px] text-white/50 mt-1"><span>2222</span><span>1120</span><span>7010</span></div>
        </div>
      </div>

      {/* subscriptions / wallet app */}
      <div className={phone} style={{ insetInlineStart: '20%', top: '46%', transform: 'rotate(-2deg)', background: '#2A1035', animation: 'mmFloat 6.2s ease-in-out 1.1s infinite' }}>
        <div className="px-3 py-2 text-[9px] font-semibold text-white flex items-center gap-1.5" style={{ background: 'linear-gradient(120deg, #5B2B7D, #A03A6E)' }}>
          📱 {ar ? 'الاشتراكات' : 'Subscriptions'}
        </div>
        <div className="p-2.5 space-y-1">
          {[['نتفلكس', 'Netflix', 56], ['سبوتيفاي', 'Spotify', 22], ['آيكلاود', 'iCloud', 37]].map(([a, e, v]) => (
            <div key={e as string} className="flex justify-between text-[8.5px] text-white/80 bg-white/[0.07] rounded-md px-2 py-1">
              <span>{ar ? a : e}</span><span className="text-white/50">−{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* the broken links between them */}
      <svg viewBox="0 0 400 340" className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
        <path d="M150 90 C190 100 210 60 240 55" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeDasharray="5 7" />
        <path d="M120 150 C150 210 160 220 175 240" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeDasharray="5 7" />
        <text x="200" y="180" textAnchor="middle" fontSize="30" fill="rgba(255,255,255,0.14)" fontFamily="serif">؟</text>
      </svg>
    </div>
  );
}

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
