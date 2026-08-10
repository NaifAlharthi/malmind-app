// src/app/api/sol-assist/route.ts
// "Assist me" for a Standard-of-Living phase: given a phase (name, years,
// target tier) and the signed-in user's real profile, suggest a theme/events
// list, a to-do list, and a one-line growth target — tailored to their
// situation. Falls back to a tier-appropriate template when no model key is
// set, and always verifies the caller from their session cookie.

import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { localizedFirstName } from '@/lib/name';
import { suggestForTier, tierLabel, type Tier } from '@/lib/standardOfLiving';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const body = (await req.json()) as {
    phaseName?: string; startYear?: number; endYear?: number; tier?: Tier; locale?: 'ar' | 'en';
  };
  const locale: 'ar' | 'en' = body.locale === 'ar' ? 'ar' : 'en';
  const tier: Tier = (['national_average', 'basic', 'decent', 'lavish'] as Tier[]).includes(body.tier as Tier)
    ? (body.tier as Tier)
    : 'decent';

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // No model configured — return the tier-appropriate template.
    return NextResponse.json(suggestForTier(tier, locale));
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, age, employment, city, monthly_income')
    .eq('id', user.id)
    .single();

  const name = localizedFirstName(profile?.name, locale === 'ar') || (locale === 'ar' ? 'المستخدم' : 'the user');
  const ctx = [
    profile?.age ? `age ${profile.age}` : null,
    profile?.employment || null,
    profile?.city || null,
    profile?.monthly_income ? `~SAR ${Number(profile.monthly_income).toLocaleString()}/month` : null,
  ].filter(Boolean).join(', ');

  const langRule = locale === 'ar'
    ? 'Write every string in Arabic.'
    : 'Write every string in English.';

  const system = `You are MalMind, a Saudi-first financial planning assistant. The user, ${name} (${ctx || 'no extra context'}), is designing a life phase called "${body.phaseName ?? 'a phase'}" running ${body.startYear ?? ''}–${body.endYear ?? ''}, targeting a "${tierLabel(tier, 'en')}" standard of living.

Return ONLY a JSON object, no prose, of the exact shape:
{"theme": string[], "todo": string[], "growth": string}
- "theme": 2–3 short phrases naming the life themes/major events of this phase.
- "todo": 2–3 short, concrete money actions to reach the target this phase.
- "growth": ONE short line quantifying the growth/milestone to aim for.
Keep each string under ~8 words, practical and specific to Saudi context (GOSI, Zakat, real estate, Tadawul where relevant). Never name specific banks or products. ${langRule}`;

  try {
    const anthropic = new Anthropic({ apiKey });
    const res = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 400,
      system,
      messages: [{ role: 'user', content: 'Generate the JSON now.' }],
    });
    const text = res.content.find((b) => b.type === 'text');
    const raw = text && text.type === 'text' ? text.text : '';
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      const theme = Array.isArray(parsed.theme) ? parsed.theme.map(String).slice(0, 4) : [];
      const todo = Array.isArray(parsed.todo) ? parsed.todo.map(String).slice(0, 4) : [];
      const growth = typeof parsed.growth === 'string' ? parsed.growth : '';
      if (theme.length || todo.length || growth) return NextResponse.json({ theme, todo, growth });
    }
  } catch (err) {
    console.error('sol-assist error:', err);
  }
  // Any failure → safe template so the button never dead-ends.
  return NextResponse.json(suggestForTier(tier, locale));
}
