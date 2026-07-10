// src/app/api/advisor/route.ts
// This route no longer trusts whatever "profile" the browser sends. It
// verifies who is actually logged in via their session cookie, then reads
// THAT user's real profile and story chapters from the database before
// calling Claude — so one user could never see, or spoof, another user's
// financial context.

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
    messages: { role: 'user' | 'assistant'; content: string }[];
  };
  const { messages } = body;

  // Pull this user's REAL stored data — never trust the client for this.
  const [{ data: profile }, { data: chapters }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('story_chapters')
      .select('*')
      .eq('user_id', user.id)
      .order('start_year', { ascending: true }),
  ]);

  // Save the user's new message to their real chat history.
  const lastUserMessage = messages[messages.length - 1];
  if (lastUserMessage?.role === 'user') {
    await supabase.from('advisor_messages').insert({
      user_id: user.id,
      role: 'user',
      content: lastUserMessage.content,
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const placeholder =
      "The advisor isn't connected to a live model yet — set ANTHROPIC_API_KEY in your deployment environment to enable real responses.";
    return NextResponse.json({ reply: placeholder });
  }

  const chapterSummary =
    chapters && chapters.length > 0
      ? chapters
          .map((c) => `- ${c.title} (${c.start_year}-${c.end_year}): ${c.note}`)
          .join('\n')
      : 'No chapters recorded yet.';

  const name = firstNameOf(profile?.name) || 'there';
  const age = profile?.age ?? 'unknown';
  const employment = profile?.employment || 'unspecified employment';
  const city = profile?.city || 'an unspecified city';
  const income = profile?.monthly_income ?? 0;

  const systemPrompt = `You are MalMind, a neutral, warm financial advisor for Saudi Arabia. You are speaking with ${name}, age ${age}, who works as ${employment} in ${city} and earns approximately SAR ${Number(income).toLocaleString()} per month.

Their financial story so far:
${chapterSummary}

Guidelines:
- Reference their specific situation and numbers where relevant.
- Never recommend a specific bank, investment platform, or institution by name.
- Keep responses concise and conversational, 3-6 sentences unless asked for more detail.
- Use both English and, where natural, Saudi financial context (GOSI, Zakat, REDF) if relevant.
- This is informational and educational, not licensed financial advice — make that clear if the user asks for a specific recommendation.`;

  const anthropic = new Anthropic({ apiKey });

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 600,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    const reply =
      textBlock && textBlock.type === 'text'
        ? textBlock.text
        : "I couldn't generate a response just now — please try again.";

    // Save the advisor's real reply too, so the chat history persists.
    await supabase.from('advisor_messages').insert({
      user_id: user.id,
      role: 'assistant',
      content: reply,
    });

    return NextResponse.json({ reply });
  } catch (err) {
    console.error('Advisor API error:', err);
    return NextResponse.json(
      { reply: 'Something went wrong reaching the advisor. Please try again.' },
      { status: 500 }
    );
  }
}
