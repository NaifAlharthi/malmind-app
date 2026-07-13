// src/app/api/what-if-analysis/route.ts
// AI analysis for the "What if" sandbox — same pattern as the ratios
// analyst: the client sends a plain-text description of the scenario it
// already computed plus the running conversation; nothing is persisted.

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
    scenarioSummary: string;
    messages: { role: 'user' | 'assistant'; content: string }[];
  };
  const { scenarioSummary, messages } = body;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      reply: "The analyst isn't connected to a live model yet — set ANTHROPIC_API_KEY in your deployment environment to enable real responses.",
    });
  }

  const { data: profile } = await supabase.from('profiles').select('name').eq('id', user.id).single();
  const name = firstNameOf(profile?.name) || 'there';

  const systemPrompt = `You are MalMind's scenario analyst, speaking with ${name}. They are imagining a financial future in a sandbox, and you have their scenario below — treat it the way a sharp, warm advisor treats a client's "what if I..." question.

${scenarioSummary}

Guidelines:
- Judge the imagination on their terms: point out what it wins, what it costs, and the one risk or assumption most likely to break it.
- Be specific with their actual numbers; never invent figures not given above.
- If cash goes negative or thin, treat that as the headline — a plan that can't be financed isn't a plan yet.
- Suggest at most one or two concrete variations worth trying in the sandbox.
- Never recommend a specific bank, investment platform, or institution by name.
- A few tight paragraphs. This is informational and educational, not licensed financial advice — say so if asked for a recommendation.`;

  const anthropic = new Anthropic({ apiKey });

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 700,
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
    console.error('What-if analysis API error:', err);
    return NextResponse.json(
      { reply: 'Something went wrong reaching the analyst. Please try again.' },
      { status: 500 }
    );
  }
}
