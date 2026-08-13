// The time axis as a swipeable strip — the touch mirror of the desktop's
// horizontal wheel-tilt (past · today · future). One shared list keeps the
// swipe navigator and the transition theater in agreement.

export const TIME_STRIP = [
  { href: '/past', labelKey: 'nav.past', icon: '🕰' },
  { href: '/today', labelKey: 'nav.today', icon: '☀' },
  { href: '/future', labelKey: 'nav.future', icon: '🔭' },
];

export interface PageNavDetail {
  dir: 'left' | 'right'; // on-screen direction the current view sweeps toward
  icon: string;
  label: string;
}

// Fired by whoever initiates a page change (tab tap, swipe); DepthStage
// listens and plays the sweep + destination flash over the navigation.
export function announcePageNav(detail: PageNavDetail) {
  window.dispatchEvent(new CustomEvent<PageNavDetail>('mm-page-nav', { detail }));
}
