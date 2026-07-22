'use client';

// Flat, modern SVG portraits for the four demo personas — Saudi attire, no
// image assets. Each is a self-contained illustration keyed by persona id.

const SKIN = '#E7B98C';
const SKIN_SH = '#D9A574';

function Frame({ children, bg }: { children: React.ReactNode; bg: string }) {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" className="block">
      <defs>
        <linearGradient id={`bg-${bg}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={bg} stopOpacity="0.22" />
          <stop offset="100%" stopColor={bg} stopOpacity="0.06" />
        </linearGradient>
        <clipPath id="clip-round"><rect x="0" y="0" width="100" height="100" rx="22" /></clipPath>
      </defs>
      <g clipPath="url(#clip-round)">
        <rect x="0" y="0" width="100" height="100" fill={`url(#bg-${bg})`} />
        {children}
      </g>
    </svg>
  );
}

// ── Layla — young woman, teal hijab, glasses (student) ──
function Layla() {
  return (
    <Frame bg="#4A78C4">
      <path d="M22 100 C22 74 34 66 50 66 C66 66 78 74 78 100 Z" fill="#3E68B0" />
      {/* hijab back */}
      <path d="M26 52 C26 30 38 20 50 20 C62 20 74 30 74 52 C74 70 66 84 66 84 L34 84 C34 84 26 70 26 52 Z" fill="#5B8DD9" />
      {/* face opening */}
      <ellipse cx="50" cy="52" rx="16" ry="19" fill={SKIN} />
      <path d="M50 71 C43 71 39 66 38 62 C42 66 58 66 62 62 C61 66 57 71 50 71 Z" fill={SKIN_SH} opacity="0.5" />
      {/* hijab front frame */}
      <path d="M34 34 C40 26 60 26 66 34 C70 40 68 50 66 54 C66 40 60 34 50 34 C40 34 34 40 34 54 C32 50 30 40 34 34 Z" fill="#4A78C4" />
      {/* glasses */}
      <g stroke="#2C3E50" strokeWidth="1.6" fill="none">
        <circle cx="43" cy="52" r="5" />
        <circle cx="57" cy="52" r="5" />
        <line x1="48" y1="52" x2="52" y2="52" />
      </g>
      {/* eyes + smile */}
      <circle cx="43" cy="52" r="1.6" fill="#2C3E50" />
      <circle cx="57" cy="52" r="1.6" fill="#2C3E50" />
      <path d="M45 60 Q50 63 55 60" stroke="#B5714E" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </Frame>
  );
}

// ── Faisal — young man, red-white shemagh + agal ──
function Faisal() {
  return (
    <Frame bg="#D89A3E">
      <path d="M24 100 C24 76 36 68 50 68 C64 68 76 76 76 100 Z" fill="#E9E4D6" />
      {/* shemagh drape */}
      <path d="M26 46 C26 26 38 16 50 16 C62 16 74 26 74 46 L78 92 L70 74 C70 52 62 40 50 40 C38 40 30 52 30 74 L22 92 Z" fill="#F5F1E6" />
      {/* red pattern hint */}
      <path d="M30 30 L36 24 M40 26 L46 20 M54 20 L60 26 M64 24 L70 30" stroke="#C0392B" strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
      {/* face */}
      <ellipse cx="50" cy="52" rx="15" ry="18" fill={SKIN} />
      {/* agal */}
      <ellipse cx="50" cy="24" rx="22" ry="7" fill="none" stroke="#1A1A1A" strokeWidth="3.4" />
      {/* light beard */}
      <path d="M37 56 C40 68 60 68 63 56 C63 64 58 70 50 70 C42 70 37 64 37 56 Z" fill={SKIN_SH} opacity="0.55" />
      {/* eyes + brows + smile */}
      <path d="M40 47 Q43 45 46 47 M54 47 Q57 45 60 47" stroke="#3A2A1A" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <circle cx="43" cy="51" r="1.7" fill="#2C1E12" />
      <circle cx="57" cy="51" r="1.7" fill="#2C1E12" />
      <path d="M45 60 Q50 63 55 60" stroke="#A65A3A" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </Frame>
  );
}

// ── Reem — woman, warm-green hijab, professional ──
function Reem() {
  return (
    <Frame bg="#1D9E75">
      <path d="M22 100 C22 74 34 66 50 66 C66 66 78 74 78 100 Z" fill="#0E7A57" />
      <path d="M26 52 C26 30 38 20 50 20 C62 20 74 30 74 52 C74 70 66 84 66 84 L34 84 C34 84 26 70 26 52 Z" fill="#2AB585" />
      <ellipse cx="50" cy="52" rx="16" ry="19" fill={SKIN} />
      <path d="M50 71 C43 71 39 66 38 62 C42 66 58 66 62 62 C61 66 57 71 50 71 Z" fill={SKIN_SH} opacity="0.5" />
      <path d="M34 34 C40 26 60 26 66 34 C70 40 68 50 66 54 C66 40 60 34 50 34 C40 34 34 40 34 54 C32 50 30 40 34 34 Z" fill="#1D9E75" />
      {/* eyes + brows + smile */}
      <path d="M39 48 Q43 46 47 48 M53 48 Q57 46 61 48" stroke="#5A3A22" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <circle cx="43" cy="52" r="1.7" fill="#3A2A1A" />
      <circle cx="57" cy="52" r="1.7" fill="#3A2A1A" />
      <path d="M45 61 Q50 64 55 61" stroke="#B5714E" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </Frame>
  );
}

// ── Khalid — older man, white ghutra + agal + grey beard + bisht ──
function Khalid() {
  return (
    <Frame bg="#C9A84C">
      {/* bisht shoulders with gold trim */}
      <path d="M18 100 C18 74 32 66 50 66 C68 66 82 74 82 100 Z" fill="#3B3A34" />
      <path d="M18 100 C18 78 30 70 30 70 M82 100 C82 78 70 70 70 70" stroke="#C9A84C" strokeWidth="2.2" fill="none" />
      {/* white ghutra */}
      <path d="M26 46 C26 24 38 14 50 14 C62 14 74 24 74 46 L78 90 L70 72 C70 50 62 38 50 38 C38 38 30 50 30 72 L22 90 Z" fill="#FAFAF6" />
      {/* face */}
      <ellipse cx="50" cy="50" rx="15" ry="18" fill={SKIN} />
      {/* agal */}
      <ellipse cx="50" cy="22" rx="22" ry="7" fill="none" stroke="#1A1A1A" strokeWidth="3.6" />
      {/* full grey beard */}
      <path d="M35 50 C35 68 42 76 50 76 C58 76 65 68 65 50 C65 62 58 66 50 66 C42 66 35 62 35 50 Z" fill="#C9CBC9" />
      <path d="M37 48 C40 46 45 46 47 48 M53 48 Q57 45 63 48" stroke="#8A8C8A" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      {/* eyes + gentle smile */}
      <circle cx="43" cy="50" r="1.7" fill="#2C2A26" />
      <circle cx="57" cy="50" r="1.7" fill="#2C2A26" />
      <path d="M46 58 Q50 60 54 58" stroke="#9A8060" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </Frame>
  );
}

const MAP: Record<string, () => React.ReactElement> = {
  layla: Layla, faisal: Faisal, reem: Reem, khalid: Khalid,
};

export default function PersonaAvatar({ id, className = '' }: { id: string; className?: string }) {
  const A = MAP[id] ?? Faisal;
  return (
    <div className={className}>
      <A />
    </div>
  );
}
