import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

/* ═══════════════════════════════════════════════════════════════════════════
   POST /api/contact
   Body: { name, email, message, type: "billing" | "content" | "technical" | "other" }

   Sends the inquiry to Ellie's notify inbox immediately.
   Sends an auto-reply to the customer so they know they were heard.
   Typical questions answered by the auto-reply FAQ so Ellie never has to:
     - When does the brief arrive? → Monday 7 AM ET
     - How do I cancel? → Link to Stripe portal
     - Will I get a refund? → Terms of Service
     - Can I change my email? → Reply with new email
═══════════════════════════════════════════════════════════════════════════ */

export const runtime = "nodejs";

const FAQ_ANSWERS: Record<string, string> = {
  cancel:    "You can cancel your membership anytime — no questions asked. Log in to your dashboard and click Manage subscription, or go directly to your Stripe customer portal.",
  refund:    "Memberships are billed monthly and are non-refundable for the current billing period per our Terms of Service. If you cancel before your next renewal date, you will not be charged again.",
  brief:     "Your Monday brief arrives in your inbox at 7:00 AM Eastern Time every Monday. If you don't see it, check your spam folder and mark our address as safe.",
  billing:   "All billing is handled securely by Stripe. To update your payment method, visit your member dashboard and click Manage subscription.",
  password:  "The Style Refresh does not use passwords — access is via a secure link sent after payment. If you have lost access, reply to your original welcome email.",
};

function buildAutoReply(name: string, message: string, siteUrl: string): string {
  const firstName     = (name?.split(" ")[0] ?? "there").trim();
  const lowerMsg      = message.toLowerCase();
  const mailingAddress = (process.env.BUSINESS_MAILING_ADDRESS ?? "The Style Refresh · New York, NY").trim();

  /* Try to serve an instant FAQ answer */
  let faqHtml = "";
  if (lowerMsg.includes("cancel") || lowerMsg.includes("unsubscribe")) {
    faqHtml = `<p style="margin:0 0 14px;font-size:14px;color:#4A4A4A;font-family:Georgia,serif;line-height:1.7;background:#F0E8D8;padding:14px 16px;border-left:3px solid #C4956A;">${FAQ_ANSWERS.cancel}</p>`;
  } else if (lowerMsg.includes("refund")) {
    faqHtml = `<p style="margin:0 0 14px;font-size:14px;color:#4A4A4A;font-family:Georgia,serif;line-height:1.7;background:#F0E8D8;padding:14px 16px;border-left:3px solid #C4956A;">${FAQ_ANSWERS.refund}</p>`;
  } else if (lowerMsg.includes("monday") || lowerMsg.includes("brief") || lowerMsg.includes("email") || lowerMsg.includes("arrive")) {
    faqHtml = `<p style="margin:0 0 14px;font-size:14px;color:#4A4A4A;font-family:Georgia,serif;line-height:1.7;background:#F0E8D8;padding:14px 16px;border-left:3px solid #C4956A;">${FAQ_ANSWERS.brief}</p>`;
  } else if (lowerMsg.includes("billing") || lowerMsg.includes("payment") || lowerMsg.includes("charge")) {
    faqHtml = `<p style="margin:0 0 14px;font-size:14px;color:#4A4A4A;font-family:Georgia,serif;line-height:1.7;background:#F0E8D8;padding:14px 16px;border-left:3px solid #C4956A;">${FAQ_ANSWERS.billing}</p>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>We received your message</title></head>
<body style="margin:0;padding:0;background:#F5EFE4;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5EFE4;padding:40px 16px;">
<tr><td align="center">
<table width="540" cellpadding="0" cellspacing="0"
       style="background:#FDFAF5;max-width:540px;width:100%;border:1px solid #DDD4C5;">
  <tr><td style="height:3px;background:linear-gradient(90deg,transparent,#C4956A,transparent);"></td></tr>
  <tr><td style="background:#EDE5D8;padding:26px 36px;text-align:center;">
    <p style="margin:0;color:#C4956A;font-size:10px;letter-spacing:0.34em;text-transform:uppercase;font-family:Arial,sans-serif;">
      Ellie · The Style Refresh
    </p>
  </td></tr>
  <tr><td style="padding:30px 36px 10px;">
    <p style="margin:0 0 16px;font-size:15px;color:#2C2C2C;font-family:Georgia,serif;line-height:1.75;">
      Hi ${firstName},
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#2C2C2C;font-family:Georgia,serif;line-height:1.75;">
      I received your message and will personally respond within 24 hours — usually much sooner.
    </p>
    ${faqHtml}
    <p style="margin:0 0 16px;font-size:14px;color:#6B6560;font-family:Georgia,serif;line-height:1.7;font-style:italic;">
      In the meantime, most billing and cancellation questions can be handled instantly through 
      your <a href="${siteUrl}/dashboard" style="color:#C4956A;">member dashboard</a>.
    </p>
    <p style="margin:0 0 8px;font-size:15px;color:#2C2C2C;font-family:Georgia,serif;">
      — Ellie
    </p>
  </td></tr>
  <tr><td style="padding:0 36px 8px;">
    <div style="height:1px;background:linear-gradient(90deg,transparent,#C9B99A,transparent);"></div>
  </td></tr>
  <tr><td style="padding:16px 36px 22px;text-align:center;">
    <p style="margin:0;font-size:10px;color:#B5A99A;font-family:Arial,sans-serif;line-height:1.6;">
      ${mailingAddress}<br/>
      This is a confirmation that your message was received.
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, message, type } = await req.json() as {
      name?: string; email?: string; message?: string; type?: string;
    };

    if (!email?.includes("@") || !message?.trim()) {
      return NextResponse.json({ error: "Email and message are required." }, { status: 400 });
    }

    const apiKey      = process.env.RESEND_API_KEY?.trim();
    const notifyEmail = process.env.RESEND_NOTIFY_EMAIL?.trim();
    const fromEmail   = process.env.RESEND_FROM_EMAIL ?? "ellie@stylebyellie.com";
    const siteUrl     = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com").replace(/\/$/, "");

    if (!apiKey) {
      return NextResponse.json({ error: "Email service not configured." }, { status: 503 });
    }

    const resend = new Resend(apiKey);

    /* Send inquiry to Ellie */
    if (notifyEmail) {
      await resend.emails.send({
        from:    `Style Refresh Support <${fromEmail}>`,
        to:      notifyEmail,
        reply_to: email,
        subject: `[${(type ?? "general").toUpperCase()}] New inquiry from ${name || email}`,
        html: `<div style="font-family:sans-serif;font-size:14px;color:#111;line-height:1.6;">
          <p><strong>From:</strong> ${name || "(no name)"} &lt;${email}&gt;</p>
          <p><strong>Type:</strong> ${type ?? "general"}</p>
          <p><strong>Message:</strong></p>
          <blockquote style="border-left:3px solid #C4956A;padding-left:12px;color:#4A4A4A;">
            ${message!.replace(/\n/g, "<br/>")}
          </blockquote>
          <p style="margin-top:16px;font-size:12px;color:#888;">
            Received: ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} ET
          </p>
        </div>`,
      });
    }

    /* Send auto-reply to customer */
    await resend.emails.send({
      from:    `Ellie <${fromEmail}>`,
      to:      email,
      reply_to: fromEmail,
      subject: "I received your message — The Style Refresh",
      html:    buildAutoReply(name ?? "", message!, siteUrl),
      headers: { "List-Unsubscribe": `<${siteUrl}/unsubscribe>` },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[contact]", err);
    return NextResponse.json({ error: "Failed to send message." }, { status: 500 });
  }
}
