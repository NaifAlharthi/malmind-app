// src/components/shared/Logo.tsx
// The MalMind logo — "the growth mind": a single line rising like a wealth
// chart that curls into a thought-spiral, ending in a gold node (the insight).
// Money momentum becoming a mind. Pure SVG, no assets; the badge is
// self-contained so it sits on any background, light or dark.

import { useId } from 'react';

export function LogoMark({ size = 28, className = '' }: { size?: number; className?: string }) {
  // Unique gradient ids so multiple marks on one page never collide.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const bg = `lmBg${uid}`;
  const line = `lmLine${uid}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={bg} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0C4531" />
          <stop offset="100%" stopColor="#062B1F" />
        </linearGradient>
        <linearGradient id={line} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#17B8C9" />
          <stop offset="55%" stopColor="#2FD3A0" />
          <stop offset="100%" stopColor="#7FE8C4" />
        </linearGradient>
      </defs>

      {/* the coin-squircle night field */}
      <rect x="1" y="1" width="62" height="62" rx="16" fill={`url(#${bg})`} />
      <rect x="1" y="1" width="62" height="62" rx="16" stroke="#5DCAA5" strokeOpacity="0.22" strokeWidth="1.5" />

      {/* the growth line curling into a mind */}
      <path
        d="M10 52 C17 52 21 47 25 40 C29 33 33 26 40 21 C47 17 55 21 55 29 C55 37 48 42 41 40 C35 38 32 32 36 27.5 C39 24.5 44.5 25.5 45.5 29.5"
        stroke={`url(#${line})`}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* the insight — a golden node at the spiral's heart */}
      <circle cx="45.8" cy="30.4" r="3.4" fill="#E4C465" />
      <circle cx="45.8" cy="30.4" r="3.4" stroke="#C9A84C" strokeWidth="0.8" />
    </svg>
  );
}

// Mark + serif wordmark. `onDark` renders the "Mal" half in white for the
// splash's night sky; elsewhere it follows the surface ink colour.
export default function Logo({
  size = 28,
  textClassName = 'text-lg',
  onDark = false,
  className = '',
}: {
  size?: number;
  textClassName?: string;
  onDark?: boolean;
  className?: string;
}) {
  return (
    <span dir="ltr" className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={size} />
      <span className={`font-serif font-semibold tracking-tight leading-none ${textClassName} ${onDark ? 'text-white' : 'text-[var(--ink)]'}`}>
        Mal<span className={onDark ? 'text-[#5DCAA5]' : 'text-[var(--green)]'}>Mind</span>
      </span>
    </span>
  );
}
