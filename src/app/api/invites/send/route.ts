// src/app/api/invites/send/route.ts
// The Welcome Program's sender. Admin-only (verified server-side against
// the signed-in session): creates — or, on resend, reuses — an invite row,
// composes the invitation in the invitee's language, and delivers it via
// Resend when RESEND_API_KEY is set. Without a key the invite is still
// created and the response carries the subject/body text plus the join
// link, so the admin console can fall back to copy-and-send from any
// mail client. The join link is /welcome?i=<unguessable uuid>.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';

export const runtime = 'nodejs';

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const clip = (s: unknown, n: number) => String(s ?? '').trim().slice(0, n);
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function compose(name: string, note: string, link: string, ar: boolean) {
  const subject = ar
    ? `${name}، دعوة خاصة لتجربة مال مايند`
    : `${name}, a personal invitation to try MalMind`;

  const intro = ar
    ? 'مال مايند طبقة تفكير لحياتك المالية: بنكك يعرف حركاتك ووسيطك يعرف أسهمك، ولا أحد يعرف ماذا تعني الأرقام مجتمعةً لك أنت. نجمعها في سِجلّ واحد، نحوّلها إلى معنى، ونجيب بأرقامك أنت: ماذا يعني وضعي؟ وماذا يحدث لو قرّرت؟'
    : "MalMind is a thinking layer for your financial life: your bank knows your transactions and your broker knows your stocks, but nobody knows what the numbers MEAN together for you. We gather them into one record, turn them into meaning, and answer from YOUR numbers: what does my situation mean — and what happens if I decide?";

  const invite = ar
    ? 'أنت من أوائل من ندعوهم لاستكشاف المنتج قبل إطلاقه — افتح الرابط، خذ الجولة الموجّهة، وجرّب كل شيء بنفسك. رأيك في هذه المرحلة يشكّل المنتج فعلاً.'
    : "You're among the first we're inviting to explore the product before launch — open the link, take the guided tour, and try everything yourself. At this stage, your opinion genuinely shapes the product.";

  const cta = ar ? 'افتح دعوتك وابدأ' : 'Open your invitation';
  const fromLine = ar ? 'نايف الحارثي — مؤسس مال مايند' : 'Naif Alharthi — founder, MalMind';
  const greeting = ar ? `أهلاً ${name}،` : `Hi ${name},`;
  const noteLabel = ar ? 'كلمة من نايف:' : 'A note from Naif:';

  const text =
    `${greeting}\n\n${intro}\n\n${invite}\n\n` +
    (note ? `${noteLabel}\n"${note}"\n\n` : '') +
    `${cta}: ${link}\n\n${fromLine}\n`;

  const dir = ar ? 'rtl' : 'ltr';
  const align = ar ? 'right' : 'left';
  const html = `<!doctype html><html dir="${dir}"><body style="margin:0;padding:0;background:#F4F3EE;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F3EE;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#FFFFFF;border-radius:16px;overflow:hidden;font-family:Segoe UI,Tahoma,Arial,sans-serif;">
<tr><td style="background:#073626;padding:22px 28px;">
  <span style="font-size:20px;font-weight:700;color:#FFFFFF;">Mal<span style="color:#5DCAA5;">Mind</span></span>
  <span style="font-size:11px;color:#C9A84C;margin-${ar ? 'right' : 'left'}:10px;">${ar ? 'طبقة تفكير لحياتك المالية' : 'A thinking layer for your financial life'}</span>
</td></tr>
<tr><td style="padding:28px;direction:${dir};text-align:${align};">
  <p style="font-size:15px;color:#1C2B24;margin:0 0 14px;font-weight:700;">${esc(greeting)}</p>
  <p style="font-size:13px;color:#3D4A43;line-height:1.8;margin:0 0 14px;">${esc(intro)}</p>
  <p style="font-size:13px;color:#3D4A43;line-height:1.8;margin:0 0 18px;">${esc(invite)}</p>
  ${note ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:#F2F7F4;border-${ar ? 'right' : 'left'}:3px solid #C9A84C;border-radius:8px;padding:12px 16px;direction:${dir};text-align:${align};">
    <p style="font-size:11px;color:#8A948E;margin:0 0 4px;">${esc(noteLabel)}</p>
    <p style="font-size:13px;color:#1C2B24;line-height:1.7;margin:0;">${esc(note)}</p>
  </td></tr></table>` : ''}
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px auto 6px;"><tr><td style="background:#1D9E75;border-radius:10px;">
    <a href="${link}" style="display:inline-block;padding:13px 34px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;">${esc(cta)}</a>
  </td></tr></table>
  <p style="font-size:11px;color:#8A948E;text-align:center;margin:0 0 18px;direction:ltr;">${link}</p>
  <p style="font-size:12px;color:#3D4A43;margin:18px 0 0;">${esc(fromLine)}</p>
</td></tr>
<tr><td style="background:#F8F7F3;padding:14px 28px;direction:${dir};text-align:${align};">
  <p style="font-size:10px;color:#8A948E;margin:0;">${ar ? 'وصلتك هذه الدعوة لأن نايف أضاف بريدك إلى برنامج الترحيب — إن لم تكن المعنيّ، تجاهلها بأمان.' : "You received this because Naif added your email to the welcome program — if that's not you, safely ignore it."}</p>
</td></tr>
</table></td></tr></table></body></html>`;

  return { subject, text, html };
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Admins only.' }, { status: 403 });
  }

  let body: { inviteId?: string; name?: string; email?: string; note?: string; lang?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const name = clip(body.name, 80);
  const email = clip(body.email, 200).toLowerCase();
  const note = clip(body.note, 600);
  const lang = body.lang === 'en' ? 'en' : 'ar';

  let inviteId = clip(body.inviteId, 40);
  if (inviteId) {
    // resend: the row must exist and be visible to this admin
    const { data } = await supabase.from('invites').select('id').eq('id', inviteId).single();
    if (!data) return NextResponse.json({ error: 'Invite not found.' }, { status: 404 });
  } else {
    if (!name || !isEmail(email)) {
      return NextResponse.json({ error: 'A name and a valid email are required.' }, { status: 422 });
    }
    const { data, error } = await supabase
      .from('invites')
      .insert({ name, email, note: note || null, lang })
      .select('id')
      .single();
    if (error || !data) {
      // the likely cause: schema_part20.sql hasn't been run yet
      return NextResponse.json(
        { error: 'Could not create the invite — has supabase/schema_part20.sql been run?' },
        { status: 500 }
      );
    }
    inviteId = data.id;
  }

  // compose from the stored row (covers resends where the body is bare)
  const { data: row } = await supabase
    .from('invites')
    .select('name, email, note, lang')
    .eq('id', inviteId)
    .single();
  if (!row) return NextResponse.json({ error: 'Invite not found.' }, { status: 404 });

  const origin = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
  const link = `${origin}/welcome?i=${inviteId}`;
  const ar = row.lang !== 'en';
  const { subject, text, html } = compose(row.name, row.note ?? '', link, ar);

  let sent = false;
  const key = process.env.RESEND_API_KEY;
  if (key) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.INVITE_FROM || process.env.CONTACT_FROM || 'MalMind <onboarding@resend.dev>',
          to: [row.email],
          reply_to: user.email,
          subject,
          text,
          html,
        }),
      });
      sent = res.ok;
    } catch { sent = false; }
  }

  if (sent) {
    await supabase
      .from('invites')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', inviteId)
      .eq('status', 'created');
  }

  // Unsent is not failure: the console falls back to copy-and-send.
  return NextResponse.json({ ok: true, id: inviteId, link, sent, subject, text });
}
