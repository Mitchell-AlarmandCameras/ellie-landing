import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

/* ═══════════════════════════════════════════════════════════════════════════
   POST /api/contact
   Body: { name, email, message, type }

   Flow:
     1. Call Claude Haiku to categorize the message and write a full reply
     2. Send AI-crafted reply to the member immediately
     3. Notify owner with category + whether it was auto-handled
     4. Falls back to static keyword matching if Claude is unavailable
═══════════════════════════════════════════════════════════════════════════ */

export const runtime = "nodejs";

/* ── Claude triage ───────────────────────────────────────────────────── */
async function triageWithClaude(
  name:    string,
  email:   string,
  message: string,
  siteUrl: string,
): Promise<{ reply: string; category: string; needsFollowup: boolean } | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return null;

  const prompt = `A paying member of "The Style Refresh" ($19/month curated fashion subscription at ${siteUrl}) sent this message to Ellie, the founder and curator.

Member: ${name || "Member"} <${email}>
Message: "${message.replace(/"/g, "'").substring(0, 800)}"

Tasks:
1. Classify into ONE: cancel | refund | missing_email | billing | access | positive_feedback | complaint | general | other
2. Can this be fully resolved without Ellie personally following up? true/false
3. Write Ellie's complete reply — warm, direct, personal, 2-3 short paragraphs, first person, signed "— Ellie"
   Key facts:
   - Cancel or manage billing: ${siteUrl}/dashboard → "Manage subscription"
   - Monday brief: arrives 7 AM ET every Monday — check spam, add ellie@stylebyellie.com to safe senders
   - Refund policy: non-refundable for current billing period per Terms; cancel anytime to stop future charges  
   - Positive feedback: genuine thanks, invite testimonial at ${siteUrl}/review
   - Access issue: access link sent after payment — check original welcome email or reply to it

Return ONLY valid JSON with no markdown fences:
{"category":"...","needsFollowup":false,"reply":"full reply here"}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:  "POST",
      headers: {
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
        "content-type":      "application/json",
      },
      body: JSON.stringify({
        model:      "claude-haiku-4-5",
        max_tokens: 700,
        messages:   [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return null;
    const json = await res.json() as { content: Array<{ text: string }> };
    let raw = (json.content[0]?.text ?? "").trim();
    if (raw.startsWith("```")) raw = raw.split("\n").slice(1).join("\n").replace(/`{3}\s*$/, "").trim();
    return JSON.parse(raw) as { reply: string; category: string; needsFollowup: boolean };
  } catch (err) {
    console.error("[contact] Claude triage failed:", err);
    return null;
  }
}

/* ── Email builder for AI reply ──────────────────────────────────────── */
function buildAIReplyEmail(
  replyText:      string,
  siteUrl:        string,
  mailingAddress: string,
): string {
  const paragraphs = replyText
    .split(/\n\n+/)
    .filter(Boolean)
    .map(p =>
      `<p style="margin:0 0 16px;font-size:15px;color:#2C2C2C;font-family:Georgia,serif;line-height:1.75;">
        ${p.replace(/\n/g, "<br/>")}
      </p>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>The Style Refresh</title></head>
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
    ${paragraphs}
    <p style="margin:16px 0 0;font-size:13px;color:#6B6560;font-family:Georgia,serif;line-height:1.7;font-style:italic;">
      Most billing and membership questions can be handled instantly through your
      <a href="${siteUrl}/dashboard" style="color:#C4956A;">member dashboard</a>.
    </p>
  </td></tr>
  <tr><td style="padding:12px 36px 8px;">
    <div style="height:1px;background:linear-gradient(90deg,transparent,#C9B99A,transparent);"></div>
  </td></tr>
  <tr><td style="padding:14px 36px 22px;text-align:center;">
    <p style="margin:0;font-size:10px;color:#B5A99A;font-family:Arial,sans-serif;line-height:1.6;">
      ${mailingAddress}<br/>
      The Style Refresh by Ellie
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/* ── Static keyword fallback (used when Claude is unavailable) ──────── */
const FAQ: Record<string, string> = {
  cancel:  "You can cancel anytime — no questions asked. Go to your dashboard and click Manage subscription.",
  refund:  "Memberships are non-refundable for the current billing period per our Terms. Cancel before your next renewal and you won't be charged again.",
  brief:   "Your Monday brief arrives at 7:00 AM Eastern Time. If you don't see it, check your spam folder and add ellie@stylebyellie.com to your safe senders list.",
  billing: "All billing is handled securely by Stripe. Update your payment method or cancel anytime from your member dashboard.",
};

function buildFallbackEmail(
  name:           string,
  message:        string,
  siteUrl:        string,
  mailingAddress: string,
): string {
  const firstName = (name?.split(" ")[0] ?? "there").trim();
  const lower     = message.toLowerCase();
  let faqHtml = "";
  if (lower.includes("cancel") || lower.includes("unsubscribe")) {
    faqHtml = `<p style="margin:0 0 14px;font-size:14px;color:#4A4A4A;font-family:Georgia,serif;line-height:1.7;background:#F0E8D8;padding:14px 16px;border-left:3px solid #C4956A;">${FAQ.cancel}</p>`;
  } else if (lower.includes("refund")) {
    faqHtml = `<p style="margin:0 0 14px;font-size:14px;color:#4A4A4A;font-family:Georgia,serif;line-height:1.7;background:#F0E8D8;padding:14px 16px;border-left:3px solid #C4956A;">${FAQ.refund}</p>`;
  } else if (lower.includes("brief") || lower.includes("monday") || lower.includes("email") || lower.includes("arrive")) {
    faqHtml = `<p style="margin:0 0 14px;font-size:14px;color:#4A4A4A;font-family:Georgia,serif;line-height:1.7;background:#F0E8D8;padding:14px 16px;border-left:3px solid #C4956A;">${FAQ.brief}</p>`;
  } else if (lower.includes("billing") || lower.includes("payment") || lower.includes("charge")) {
    faqHtml = `<p style="margin:0 0 14px;font-size:14px;color:#4A4A4A;font-family:Georgia,serif;line-height:1.7;background:#F0E8D8;padding:14px 16px;border-left:3px solid #C4956A;">${FAQ.billing}</p>`;
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
    <p style="margin:0 0 16px;font-size:15px;color:#2C2C2C;font-family:Georgia,serif;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:15px;color:#2C2C2C;font-family:Georgia,serif;line-height:1.75;">
      I received your message and will personally respond within 24 hours — usually much sooner.
    </p>
    ${faqHtml}
    <p style="margin:0 0 16px;font-size:14px;color:#6B6560;font-family:Georgia,serif;line-height:1.7;font-style:italic;">
      Most billing and cancellation questions can be handled instantly through your
      <a href="${siteUrl}/dashboard" style="color:#C4956A;">member dashboard</a>.
    </p>
    <p style="margin:0;font-size:15px;color:#2C2C2C;font-family:Georgia,serif;">— Ellie</p>
  </td></tr>
  <tr><td style="padding:0 36px 8px;">
    <div style="height:1px;background:linear-gradient(90deg,transparent,#C9B99A,transparent);"></div>
  </td></tr>
  <tr><td style="padding:16px 36px 22px;text-align:center;">
    <p style="margin:0;font-size:10px;color:#B5A99A;font-family:Arial,sans-serif;line-height:1.6;">
      ${mailingAddress}<br/>This is a confirmation that your message was received.
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/* ── Handler ─────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const { name, email, message, type } = await req.json() as {
      name?: string; email?: string; message?: string; type?: string;
    };

    if (!email?.includes("@") || !message?.trim()) {
      return NextResponse.json({ error: "Email and message are required." }, { status: 400 });
    }

    const apiKey         = process.env.RESEND_API_KEY?.trim();
    const notifyEmail    = process.env.RESEND_NOTIFY_EMAIL?.trim();
    const fromEmail      = process.env.RESEND_FROM_EMAIL ?? "ellie@stylebyellie.com";
    const siteUrl        = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com").replace(/\/$/, "");
    const mailingAddress = process.env.BUSINESS_MAILING_ADDRESS ?? "The Style Refresh · New York, NY";

    if (!apiKey) {
      return NextResponse.json({ error: "Email service not configured." }, { status: 503 });
    }

    const resend = new Resend(apiKey);

    /* ── Claude triage ──────────────────────────────────────────── */
    const triage    = await triageWithClaude(name ?? "", email, message!, siteUrl);
    const aiHandled = !!triage && !triage.needsFollowup;
    const category  = triage?.category ?? (type ?? "general");

    /* ── Notify owner ───────────────────────────────────────────── */
    if (notifyEmail) {
      const badge = triage?.needsFollowup
        ? `<span style="background:#c0392b;color:#fff;padding:2px 8px;border-radius:3px;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;">NEEDS REPLY</span>`
        : `<span style="background:#2d6a27;color:#fff;padding:2px 8px;border-radius:3px;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;">AUTO-HANDLED</span>`;

      await resend.emails.send({
        from:     `Style Refresh Support <${fromEmail}>`,
        to:       notifyEmail,
        reply_to: email,
        subject:  `[${category.toUpperCase()}] ${triage?.needsFollowup ? "⚠️ Needs reply — " : "✅ Auto-handled — "}${name || email}`,
        html: `<div style="font-family:sans-serif;font-size:14px;color:#111;line-height:1.6;max-width:620px;">
          <p style="margin:0 0 12px;">${badge}
            <strong style="margin-left:8px;font-size:11px;letter-spacing:0.1em;color:#666;text-transform:uppercase;">
              Category: ${category}
            </strong>
          </p>
          <p><strong>From:</strong> ${name || "(no name)"} &lt;${email}&gt;</p>
          <p><strong>Their message:</strong></p>
          <blockquote style="border-left:3px solid #C4956A;margin:0;padding:12px 16px;background:#faf6f0;color:#4A4A4A;">
            ${message!.replace(/\n/g, "<br/>")}
          </blockquote>
          ${triage ? `
          <p style="margin-top:20px;"><strong>Reply sent to member:</strong></p>
          <blockquote style="border-left:3px solid ${triage.needsFollowup ? "#c0392b" : "#2d6a27"};margin:0;padding:12px 16px;background:#f9f9f9;">
            ${triage.reply.replace(/\n/g, "<br/>")}
          </blockquote>
          <p style="margin-top:10px;color:${triage.needsFollowup ? "#c0392b" : "#2d6a27"};">
            ${triage.needsFollowup
              ? `⚠️ Claude flagged this as needing your personal reply. Hit Reply to respond to ${email}.`
              : `✅ Claude handled this fully. No action needed.`}
          </p>` : `<p style="color:#999;font-size:12px;margin-top:16px;">(AI unavailable — fallback auto-reply sent to member)</p>`}
          <p style="font-size:11px;color:#aaa;margin-top:20px;">
            ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} ET
          </p>
        </div>`,
      });
    }

    /* ── Reply to member ────────────────────────────────────────── */
    const replyHtml = triage?.reply
      ? buildAIReplyEmail(triage.reply, siteUrl, mailingAddress)
      : buildFallbackEmail(name ?? "", message!, siteUrl, mailingAddress);

    const { data: replyData, error: replyError } = await resend.emails.send({
      from:     `Ellie <${fromEmail}>`,
      to:       email,
      reply_to: fromEmail,
      subject:  aiHandled
        ? "Re: Your message to The Style Refresh"
        : "I received your message — The Style Refresh",
      html: replyHtml,
    });

    if (replyError) {
      console.error("[contact] Reply send failed:", JSON.stringify(replyError));
      /* Surface a meaningful error to the form so the customer knows what happened */
      const msg = typeof replyError === "object" && "message" in replyError
        ? String((replyError as { message: string }).message)
        : "Email delivery failed";
      return NextResponse.json({ ok: false, error: `Message received but reply failed: ${msg}. Please email ${fromEmail} directly.` }, { status: 502 });
    }

    console.log("[contact] Reply sent to", email, "| AI handled:", aiHandled, "| category:", category);

    /* ── Log conversation to Blob for owner inbox ───────────────── */
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const { put } = await import("@vercel/blob");
        const id  = `${Date.now()}-${email.replace(/[^a-z0-9]/gi, "_").slice(0, 30)}`;
        await put(
          `ellie-inbox/fashion/${id}.json`,
          JSON.stringify({
            id, site: "fashion", timestamp: new Date().toISOString(),
            name: name ?? "", email, type: type ?? "general",
            message, category, aiHandled,
            needsFollowup: triage?.needsFollowup ?? true,
            aiReply: triage?.reply ?? null,
          }),
          { access: "public", contentType: "application/json", addRandomSuffix: false }
        );
      } catch (blobErr) {
        console.warn("[contact] Blob log failed (non-fatal):", blobErr);
      }
    }

    return NextResponse.json({ ok: true, replyId: replyData?.id ?? null, aiHandled, category });
  } catch (err) {
    console.error("[contact]", err);
    return NextResponse.json({ error: "Failed to send message. Please try again or email us directly." }, { status: 500 });
  }
}
