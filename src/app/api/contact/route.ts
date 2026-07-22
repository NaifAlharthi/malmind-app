// src/app/api/contact/route.ts
// Receives "Contact us" inquiries from the marketing/auth/home pages. Two
// delivery channels, used together and each best-effort:
//
//   1. Supabase  — always attempted. The contact_messages table (see
//      supabase/schema_part17.sql) guarantees the inquiry is captured even
//      when no email provider is set up. This needs NO extra configuration
//      beyond running that SQL: the anon key already present can insert.
//
//   2. Email     — only when RESEND_API_KEY is set. Forwards the inquiry to
//      the right inbox so you get notified without watching the dashboard.
//
// The request succeeds if at least one channel accepts it. A hidden honeypot
// field ("company") and light validation keep out the most basic bots.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Category = 'support' | 'investment' | 'partnership' | 'general';
const CATEGORIES: Category[] = ['support', 'investment', 'partnership', 'general'];

// Where each kind of inquiry should be emailed. Every one can be overridden by
// an env var; all fall back to CONTACT_TO (or a single default) so you can
// start with ONE inbox and split later without touching code.
function inboxFor(category: Category): string {
  const fallback = process.env.CONTACT_TO || 'hello@malmind.ai';
  const map: Record<Category, string | undefined> = {
    support: process.env.CONTACT_TO_SUPPORT,
    investment: process.env.CONTACT_TO_INVEST,
    partnership: process.env.CONTACT_TO_PARTNER,
    general: process.env.CONTACT_TO_GENERAL,
  };
  return map[category] || fallback;
}

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const clip = (s: unknown, n: number) => String(s ?? '').trim().slice(0, n);

async function sendEmail(opts: {
  to: string;
  replyTo: string;
  subject: string;
  text: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const from = process.env.CONTACT_FROM || 'MalMind <onboarding@resend.dev>';
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [opts.to],
        reply_to: opts.replyTo,
        subject: opts.subject,
        text: opts.text,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  // Honeypot: real users never fill a hidden field. Pretend success.
  if (clip(body.company, 100)) {
    return NextResponse.json({ ok: true });
  }

  const name = clip(body.name, 120);
  const email = clip(body.email, 200);
  const subject = clip(body.subject, 200);
  const message = clip(body.message, 5000);
  const rawCategory = clip(body.category, 40) as Category;
  const category: Category = CATEGORIES.includes(rawCategory) ? rawCategory : 'general';
  const locale = clip(body.locale, 5) || 'en';
  const source = clip(body.source, 40) || 'unknown';

  if (!name || !isEmail(email) || message.length < 5) {
    return NextResponse.json(
      { error: 'Please provide your name, a valid email, and a message.' },
      { status: 422 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Channel 1: durable capture in Supabase (guaranteed inbox).
  const { error: dbError } = await supabase.from('contact_messages').insert({
    category,
    name,
    email,
    subject: subject || null,
    message,
    locale,
    source,
    user_id: user?.id ?? null,
    user_agent: clip(req.headers.get('user-agent'), 400) || null,
  });

  // Channel 2: email notification (only if configured).
  const emailSent = await sendEmail({
    to: inboxFor(category),
    replyTo: email,
    subject: `[MalMind · ${category}] ${subject || 'New inquiry'} — from ${name}`,
    text:
      `New ${category} inquiry from the ${source} page (${locale}).\n\n` +
      `Name:  ${name}\n` +
      `Email: ${email}\n` +
      (user?.id ? `User:  ${user.id} (signed in)\n` : `User:  guest\n`) +
      `\n${message}\n`,
  });

  if (dbError && !emailSent) {
    // Both channels failed — surface a real error so the message isn't silently lost.
    console.error('Contact submission failed:', dbError);
    return NextResponse.json(
      { error: 'We could not send your message right now. Please email us directly.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
