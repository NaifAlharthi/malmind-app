// src/lib/drive.ts
// What DRIVES this person — the shape information should take before it
// reaches them:
//   story    — they think in things and one-liners; lead with narrative,
//              weave numbers into sentences
//   numbers  — they want the figures straight, no wrapping
//   both     — narrative that carries its numbers openly (the default)
// Surfaces read this to decide what leads: the hājis and prose, or the
// stat tiles, or the blend.

export type Drive = 'story' | 'numbers' | 'both';
export const DRIVE_KEY = 'mm-drive';
export const DRIVES: Drive[] = ['story', 'numbers', 'both'];

export const DRIVE_META: Record<Drive, { icon: string; label: { ar: string; en: string }; desc: { ar: string; en: string } }> = {
  story: {
    icon: '📖',
    label: { ar: 'قصص', en: 'Stories' },
    desc: { ar: 'يحكي لك مالك حكاياته قبل أي رقم', en: 'Your money tells its stories before any number' },
  },
  numbers: {
    icon: '🔢',
    label: { ar: 'أرقام', en: 'Numbers' },
    desc: { ar: 'الأرقام أولاً — مباشرة وبلا سرد', en: 'Figures first — straight, no wrapping' },
  },
  both: {
    icon: '🧭',
    label: { ar: 'قصص وأرقام', en: 'Stories & numbers' },
    desc: { ar: 'سردٌ يحمل أرقامه معه', en: 'Narrative that carries its numbers' },
  },
};

export function getStoredDrive(): Drive {
  if (typeof window === 'undefined') return 'both';
  try {
    const v = window.localStorage.getItem(DRIVE_KEY);
    return v === 'story' || v === 'numbers' ? v : 'both';
  } catch { return 'both'; }
}

export function storeDrive(d: Drive) {
  try { window.localStorage.setItem(DRIVE_KEY, d); } catch { /* ignore */ }
}
