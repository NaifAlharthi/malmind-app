// src/app/api/ratios-synthesis/route.ts
// Powers "Talk to your analyst" on the Ratios & Stats page. Reuses the
// same real Claude integration as the AI advisor, but scoped to this page:
// the client sends a plain-text summary of the ratios it already computed
// (from this same user's session-scoped Supabase reads) plus the running
// conversation, and this route just reasons over that - it doesn't persist
// to advisor_messages, so it stays separate from the main advisor thread.

import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { firstNameOf } from '@/lib/name';

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const body = (await req.json()) as {
    ratiosSummary: string;
    messages: { role: 'user' | 'assistant'; content: string }[];
  };
  const { ratiosSummary, messages } = body;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const placeholder =
      "The analyst isn't connected to a live model yet — set ANTHROPIC_API_KEY in your deployment environment to enable real responses.";
    return NextResponse.json({ reply: placeholder });
  }

  const { data: profile } = await supabase.from('profiles').select('name').eq('id', user.id).single();
  const name = firstNameOf(profile?.name) || 'there';

  const systemPrompt = `You are MalMind's financial ratio analyst, speaking with ${name}. You have been handed their complete set of real, computed financial ratios below - treat it the way a world-class analyst would treat a client's real financial statement.

${ratiosSummary}

Guidelines:
- Reason across the ratios together, not one at a time - look for patterns between them (e.g. strong savings but low investment, or low debt with rising net worth).
- Be specific and reference their actual numbers. Never invent numbers not given above.
- Surface genuine opportunities implied by the combination of ratios, and a short list of what matters most right now.
- Never recommend a specific bank, investment platform, or institution by name.
- Keep responses conversational and grounded - a few tight paragraphs unless asked for more detail.
- This is informational and educational, not licensed financial advice - make that clear if asked for a specific recommendation.
- Some ratios may be marked "not enough data yet" - don't fabricate a value for those, just note what logging would unlock the reading.`;

  const anthropic = new Anthropic({ apiKey });

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 800,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    const reply =
      textBlock && textBlock.type === 'text'
        ? textBlock.text
        : "I couldn't generate a response just now — please try again.";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error('Ratios synthesis API error:', err);
    return NextResponse.json(
      { reply: 'Something went wrong reaching your analyst. Please try again.' },
      { status: 500 }
    );
  }
}
