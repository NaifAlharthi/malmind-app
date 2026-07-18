// src/app/api/geocode/route.ts
// Resolve a city name to its country, so the profile can auto-fill Country
// when the user types a City. Uses OpenStreetMap's Nominatim (free, no key);
// their usage policy requires a descriptive User-Agent.

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const UA = 'MalMind/1.0 (financial thinking app; contact naif.alharthi94@gmail.com)';

export async function GET(request: Request) {
  const city = new URL(request.url).searchParams.get('city')?.trim();
  if (!city) return NextResponse.json({ country: null, code: null });

  try {
    const res = await fetch(
      `${NOMINATIM}?city=${encodeURIComponent(city)}&format=jsonv2&addressdetails=1&limit=1&accept-language=en`,
      { headers: { 'User-Agent': UA, Accept: 'application/json', 'Accept-Language': 'en' }, cache: 'no-store' }
    );
    if (!res.ok) return NextResponse.json({ country: null, code: null });
    const json = await res.json();
    const first = Array.isArray(json) ? json[0] : null;
    const address = first?.address as Record<string, unknown> | undefined;
    const country = address?.country ? String(address.country) : null;
    const code = address?.country_code ? String(address.country_code).toUpperCase() : null;
    return NextResponse.json({ country, code });
  } catch {
    return NextResponse.json({ country: null, code: null });
  }
}
