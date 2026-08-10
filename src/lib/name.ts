// src/lib/name.ts
// The profiles table stores one "name" column ("First Last"). These helpers
// split/join it so the UI can collect first/last name separately while
// addressing the user by first name only everywhere else.

export function splitName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim();
  if (!trimmed) return { firstName: '', lastName: '' };
  const [firstName, ...rest] = trimmed.split(/\s+/);
  return { firstName, lastName: rest.join(' ') };
}

export function joinName(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
}

export function firstNameOf(fullName: string | null | undefined): string {
  if (!fullName) return '';
  return splitName(fullName).firstName;
}

// The demo personas are stored with Latin names, but Arabic mode must greet
// them in Arabic (real users' names pass through untouched).
const ARABIC_FIRST_NAMES: Record<string, string> = {
  Layla: 'ليلى',
  Faisal: 'فيصل',
  Reem: 'ريم',
  Khalid: 'خالد',
};

export function localizedFirstName(fullName: string | null | undefined, ar: boolean): string {
  const first = firstNameOf(fullName);
  return ar ? (ARABIC_FIRST_NAMES[first] ?? first) : first;
}
