// The five tabs — one list for both tab layouts (native and web). Icon
// names are typed by NativeTabs itself, so a misspelled SF Symbol or
// Material icon fails the type check instead of rendering blank.
import type { MaterialIcon, SFSymbolIcon } from 'expo-router/native-tabs';

export interface TabDef {
  name: 'home' | 'log' | 'today' | 'brain' | 'toolbox';
  label: string;
  glyph: string; // web fallback icon
  sf: NonNullable<SFSymbolIcon['sf']>; // iOS SF Symbols
  md: MaterialIcon['md']; // Android Material icon
}

export function tabDefs(L: (a: string, e: string) => string): TabDef[] {
  return [
    { name: 'home', label: L('الرئيسية', 'Home'), glyph: '⌂', sf: { default: 'house', selected: 'house.fill' }, md: 'home' },
    { name: 'log', label: L('السِّجل', 'Log'), glyph: '📒', sf: { default: 'book.closed', selected: 'book.closed.fill' }, md: 'menu_book' },
    { name: 'today', label: L('اليوم', 'Today'), glyph: '☀', sf: { default: 'sun.max', selected: 'sun.max.fill' }, md: 'wb_sunny' },
    { name: 'brain', label: L('العقل', 'Brain'), glyph: '🧠', sf: { default: 'brain.head.profile', selected: 'brain.head.profile.fill' }, md: 'psychology' },
    { name: 'toolbox', label: L('الأدوات', 'Toolbox'), glyph: '🧰', sf: { default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' }, md: 'apps' },
  ];
}
