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
  // The Log (financial_snapshots) rides along so the Brain can SEE the
  // numbers it advises on — and draw them.
  const [{ data: profile }, { data: chapters }, { data: snaps }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('story_chapters')
      .select('*')
      .eq('user_id', user.id)
      .order('start_year', { ascending: true }),
    supabase
      .from('financial_snapshots')
      .select('year, month, cash, stocks, real_estate, equity, other_assets, liabilities, income, expenses')
      .eq('user_id', user.id)
      .order('year', { ascending: true })
      .order('month', { ascending: true }),
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

  // The Log, compacted for the prompt: the last 12 months, one line each.
  const rows = (snaps ?? []).slice(-12);
  const finLines = rows.length
    ? rows
        .map((s) => {
          const assets = Number(s.cash) + Number(s.stocks) + Number(s.equity) + Number(s.real_estate) + Number(s.other_assets);
          return `${s.year}-${String(s.month).padStart(2, '0')}: income ${Number(s.income)}, spending ${Number(s.expenses)}, cash ${Number(s.cash)}, invested ${Number(s.stocks) + Number(s.equity)}, property+other ${Number(s.real_estate) + Number(s.other_assets)}, liabilities ${Number(s.liabilities)}, netWorth ${assets - Number(s.liabilities)}`;
        })
        .join('\n')
    : 'No months logged yet.';

  // Every door the Brain may point the user through, as internal paths.
  const toolCatalog = [
    '/log — The Log: the record of all their numbers (grid, chart, income, spending, portfolios, liabilities tiles)',
    '/log/update?f=income|expenses|cash|stocks|equity|property|liabilities — focused one-line editors',
    '/today — the Today dashboard (cash flow, balances, quadrant, ratios at depth 4)',
    '/past — the Past hub · /future — the Future hub',
    '/toolbox — every tool on one page',
    '/markets — Markets & Indices: global board + them vs national benchmarks',
    '/financial-numbers — the month-by-month editor and imports',
    '/holdings — assets & live-priced portfolio · /commitments — loans, cards, subscriptions',
    '/budgeting — capped budgets · /year-plan — the year master plan · /waterfall — riyal priority waterfall',
    '/freedom — financial freedom date · /goal-fund — saving toward a goal · /what-if — scenario play',
    '/ratios — health ratios · /risks — exposure · /credit — SIMAH standing · /positioning — them vs peers',
    '/velocity — wealth speed · /doubling-path — compounding path · /lifetime-income — income across life',
    '/standard-of-living?mode=track — living-standard ladder · /compare — big-decision comparisons',
    '/story — their financial story chapters · /daily-stack — daily money stack',
  ].join('\n');

  const systemPrompt = `You are MalMind, a neutral, warm financial advisor for Saudi Arabia. You are speaking with ${name}, age ${age}, who works as ${employment} in ${city} and earns approximately SAR ${Number(income).toLocaleString()} per month.

Their financial story so far:
${chapterSummary}

Their Log — the last 12 logged months (all amounts SAR):
${finLines}

You have two abilities beyond text, rendered natively by the app:

1. CHARTS. When a picture genuinely helps, emit a fenced block exactly like:
\`\`\`chart
{"type":"bar","title":"Income vs your pace","data":[{"label":"May","value":10000},{"label":"Jun","value":10000}]}
\`\`\`
Rules: type is "bar", "line" or "pie"; data is [{label, value}] with at most 12 points; use their REAL numbers from the Log above — never invent values; write labels in the language the user is speaking; one chart per reply at most, and only when it adds understanding.

2. TOOL LINKS. When pointing them at a part of the product, use a markdown link with an internal path — it renders as a clickable chip. Catalog:
${toolCatalog}
Example: "سجّل شهرك في [السِّجل](/log)" or "check your [ratios](/ratios)". Use 1-3 links max per reply, only paths from the catalog.

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
      max_tokens: 1000,
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
