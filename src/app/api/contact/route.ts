// src/app/api/contact/route.ts
// Receives "Contact us" inquiries from the marketing/auth/home pages, sent as
// multipart/form-data so an optional image or PDF can ride along. Two delivery
// channels, used together and each best-effort:
//
//   1. Supabase  — always attempted. The contact_messages table (see
//      supabase/schema_part17.sql) guarantees the inquiry is captured even
//      when no email provider is set up. An attached file is uploaded to the
//      private contact-attachments Storage bucket (schema_part18.sql) and the
//      row records its path.
//
//   2. Email     — only when RESEND_API_KEY is set. Forwards the inquiry to
//      the right inbox, with the file attached, so you get notified without
//      watching the dashboard.
//
// The request succeeds if at least one channel accepts it. A hidden honeypot
// field ("company") and light validation keep out the most basic bots.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type Category = 'support' | 'investment' | 'partnership' | 'general';
const CATEGORIES: Category[] = ['support', 'investment', 'partnership', 'general'];

const ATTACH_BUCKET = 'contact-attachments';
const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4 MB — stays under Vercel's request-body limit
const ALLOWED_FILE = (t: string) => t === 'application/pdf' || t.startsWith('image/');

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
const field = (form: FormData, key: string, n: number) => clip(form.get(key), n);
// Keep only a safe basename for the stored object key.
const safeName = (name: string) =>
  (name.split(/[\\/]/).pop() || 'file').replace(/[^\w.\-]+/g, '_').slice(0, 100) || 'file';

async function sendEmail(opts: {
  to: string;
  replyTo: string;
  subject: string;
  text: string;
  attachment?: { filename: string; contentB64: string };
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
        ...(opts.attachment
          ? { attachments: [{ filename: opts.attachment.filename, content: opts.attachment.contentB64 }] }
          : {}),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  // Honeypot: real users never fill a hidden field. Pretend success.
  if (field(form, 'company', 100)) {
    return NextResponse.json({ ok: true });
  }

  const name = field(form, 'name', 120);
  const email = field(form, 'email', 200);
  const subject = field(form, 'subject', 200);
  const message = field(form, 'message', 5000);
  const rawCategory = field(form, 'category', 40) as Category;
  const category: Category = CATEGORIES.includes(rawCategory) ? rawCategory : 'general';
  const locale = field(form, 'locale', 5) || 'en';
  const source = field(form, 'source', 40) || 'unknown';

  if (!name || !isEmail(email) || message.length < 5) {
    return NextResponse.json(
      { error: 'Please provide your name, a valid email, and a message.' },
      { status: 422 }
    );
  }

  // Optional attachment: an image or a PDF, capped at 4 MB.
  const raw = form.get('file');
  const file = raw instanceof File && raw.size > 0 ? raw : null;
  if (file) {
    if (!ALLOWED_FILE(file.type)) {
      return NextResponse.json(
        { error: 'Attachments must be an image or a PDF.' },
        { status: 415 }
      );
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: 'That file is too large — the limit is 4 MB.' },
        { status: 413 }
      );
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Read the file once; reuse the bytes for both Storage and email.
  let fileBytes: Buffer | null = null;
  let attachmentPath: string | null = null;
  let attachmentName: string | null = null;
  if (file) {
    fileBytes = Buffer.from(await file.arrayBuffer());
    attachmentName = safeName(file.name);
    const objectKey = `${new Date().getFullYear()}/${crypto.randomUUID()}-${attachmentName}`;
    const { error: upErr } = await supabase.storage
      .from(ATTACH_BUCKET)
      .upload(objectKey, fileBytes, { contentType: file.type, upsert: false });
    // If the upload fails (e.g. bucket not created yet), keep going — the
    // message text still lands, and the email still carries the file.
    if (!upErr) attachmentPath = objectKey;
  }

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
    attachment_path: attachmentPath,
    attachment_name: file ? attachmentName : null,
    attachment_type: file ? file.type : null,
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
      (file ? `Attachment: ${attachmentName} (${file.type})\n` : '') +
      `\n${message}\n`,
    attachment:
      file && fileBytes ? { filename: attachmentName!, contentB64: fileBytes.toString('base64') } : undefined,
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
