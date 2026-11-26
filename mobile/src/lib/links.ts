// Where a product path leads on the phone. The Brain and the toolbox speak
// in website paths (/log?spot=spending, /gosi, /budgeting); paths with a
// native screen open it, everything else opens on malmind.ai in Safari's
// in-app sheet, tinted in MalMind green.

import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

export const SITE = 'https://www.malmind.ai';

const NATIVE: Record<string, string> = {
  '/home': '/home',
  '/log': '/log',
  '/today': '/today',
  '/toolbox': '/toolbox',
  '/advisor': '/brain',
  '/volatility': '/tool/volatility',
  '/gosi': '/tool/gosi',
};

export function isNative(href: string): boolean {
  return href.split('?')[0] in NATIVE;
}

/** a native tool screen (pushed, so it can zoom open from its tile), or null */
export function toolScreen(href: string): string | null {
  const target = NATIVE[href.split('?')[0]];
  return target?.startsWith('/tool/') ? target : null;
}

export function openWeb(url: string) {
  WebBrowser.openBrowserAsync(url, { controlsColor: '#5DCAA5', toolbarColor: '#0E1411', dismissButtonStyle: 'done' });
}

export function openPath(href: string) {
  const [path, query] = href.split('?');
  const target = NATIVE[path];
  if (!target) {
    openWeb(SITE + href);
    return;
  }
  const params: Record<string, string> = {};
  for (const pair of (query ?? '').split('&')) {
    const [k, v] = pair.split('=');
    if (k) params[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
  }
  router.navigate({ pathname: target, params } as never);
}
