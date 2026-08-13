'use client';

// One shared answer to "is this a phone?" — small viewport with a coarse
// pointer, or a mobile user agent (which catches landscape phones whose
// width sneaks past the breakpoint). Tablets and narrow desktop windows
// are deliberately not phones.

import { useEffect, useState } from 'react';

export function isPhoneNow(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    (window.matchMedia('(max-width: 767px)').matches &&
      window.matchMedia('(pointer: coarse)').matches) ||
    /Android.*Mobile|iPhone|iPod/i.test(navigator.userAgent)
  );
}

export function useIsPhone(): boolean {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const update = () => setPhone(isPhoneNow());
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);
  return phone;
}
