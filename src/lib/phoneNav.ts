// The phone companion's page strip: three pages side by side, walked by
// bottom tabs or horizontal finger swipes. One shared list keeps the tab
// bar, the swipe navigator, and the transition theater in agreement.

export const PHONE_NAV = [
  { href: '/home', labelKey: 'nav.home', icon: '⌂' },
  { href: '/daily-stack', labelKey: 'hub.card.dailyStack.title', icon: '🧾' },
  { href: '/advisor', labelKey: 'nav.brain', icon: '🧠' },
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
