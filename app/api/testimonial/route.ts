import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

/* ═══════════════════════════════════════════════════════════════════════
   POST /api/testimonial
   Receives member feedback from /review page.
   Sends it ONLY to Ellie's private notify email — never published
   automatically. Ellie reviews and decides what to share.
═══════════════════════════════════════════════════════════════════════ */

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { name, city, thoughts, canQuote } = await req.json() as {
    name:     string;
    city:     string;
    thoughts: string;
    canQuote: boolean;
  };

  if (!thoughts?.trim()) {
    return NextResponse.json({ ok: false, error: "No feedback provided" }, { status: 400 });
  }

  const resendKey   = process.env.RESEND_API_KEY?.trim();
  const notifyEmail = process.env.RESEND_NOTIFY_EMAIL?.trim();
  const fromEmail   = process.env.RESEND_FROM_EMAIL ?? "ellie@stylebyellie.com";

  if (resendKey && notifyEmail) {
    const resend    = new Resend(resendKey);
    const firstName = name?.trim() || "A member";
    const location  = city?.trim() || "location not provided";
    const quoteTag  = canQuote
      ? `<span style="background:#F0F7EE;border:1px solid #a8d4a0;padding:3px 10px;font-size:11px;color:#2d6a27;font-family:Arial,sans-serif;">✓ Gave permission to quote</span>`
      : `<span style="background:#FDF0ED;border:1px solid #e8b4a8;padding:3px 10px;font-size:11px;color:#c0392b;font-family:Arial,sans-serif;">✗ Did not give quote permission</span>`;

    await resend.emails.send({
      from:    `Ellie <${fromEmail}>`,
      to:      notifyEmail,
      subject: `New member feedback — ${firstName}${city ? `, ${city}` : ""} ${canQuote ? "✓ can quote" : ""}`,
      html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F5EFE4;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5EFE4;padding:36px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0"
       style="background:#FDFAF5;max-width:560px;width:100%;border:1px solid #DDD4C5;">

  <tr><td style="height:3px;background:linear-gradient(90deg,transparent,#C4956A,transparent);"></td></tr>

  <tr><td style="background:#EDE5D8;padding:24px 36px;text-align:center;">
    <p style="margin:0 0 4px;color:#C4956A;font-size:10px;letter-spacing:0.34em;
               text-transform:uppercase;font-family:Arial,sans-serif;">
      Ellie · Member Feedback
    </p>
    <h1 style="margin:6px 0 4px;color:#2C2C2C;font-size:20px;font-weight:400;">
      New response from ${firstName}
    </h1>
    <p style="margin:4px 0 0;color:#6B6560;font-size:12px;font-family:Arial,sans-serif;">
      ${location}
    </p>
  </td></tr>

  <tr><td style="padding:28px 36px 0;">
    <p style="margin:0 0 10px;font-family:Arial,sans-serif;font-size:9px;letter-spacing:0.26em;
               text-transform:uppercase;color:#C4956A;">Their words</p>
    <div style="background:#F5EFE4;border-left:3px solid #C4956A;padding:18px 20px;">
      <p style="margin:0;font-family:Georgia,serif;font-size:1.1rem;color:#2C2C2C;
                 line-height:1.85;font-style:italic;">
        &ldquo;${thoughts.trim().replace(/\n/g, "<br/>")}&rdquo;
      </p>
    </div>
  </td></tr>

  <tr><td style="padding:20px 36px 0;">
    <p style="margin:0 0 10px;font-family:Arial,sans-serif;font-size:9px;letter-spacing:0.26em;
               text-transform:uppercase;color:#C4956A;">Quote permission</p>
    ${quoteTag}
    ${canQuote ? `
    <p style="margin:12px 0 0;font-family:Arial,sans-serif;font-size:12px;color:#6B6560;line-height:1.6;">
      This member gave permission to share their words on the site using their first name and city.<br/>
      <strong>If you want this published, forward it to your developer with the exact wording you'd like used.</strong>
    </p>` : `
    <p style="margin:12px 0 0;font-family:Arial,sans-serif;font-size:12px;color:#6B6560;line-height:1.6;">
      This member did not give quote permission. Keep this response private — for your eyes only.
    </p>`}
  </td></tr>

  <tr><td style="padding:28px 36px;">
    <div style="height:1px;background:linear-gradient(90deg,transparent,#C9B99A,transparent);margin-bottom:16px;"></div>
    <p style="margin:0;font-size:10px;color:#B5A99A;font-family:Arial,sans-serif;text-align:center;line-height:1.7;">
      This response went only to you — not published anywhere automatically.<br/>
      The Style Refresh · Private member feedback
    </p>
  </td></tr>

</table>
</td></tr></table>
</body></html>`,
    });
  }

  return NextResponse.json({ ok: true });
}
