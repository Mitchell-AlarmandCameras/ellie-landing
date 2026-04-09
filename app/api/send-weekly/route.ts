import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import Stripe from "stripe";
import fs from "fs";
import path from "path";

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/send-weekly
   Vercel Cron fires this every Monday at 7:00 AM ET (11:00 UTC in vercel.json).
   Reads /tmp/ellie-approved.json and sends the brief to all active Stripe subscribers.
   Also handles POST for the manual "Send Now" button on the approve confirmation page.
═══════════════════════════════════════════════════════════════════════════ */

export const runtime    = "nodejs";
export const maxDuration = 60;

type LookItem = { piece: string; brand: string; price: string; note: string; buyLink: string };
type Look     = { index: string; label: string; tagline: string; description: string; editorsNote: string; items: LookItem[] };
type Lookbook = { weekOf: string; weekNumber: number; editorialLead: string; looks: Look[]; approvedAt?: string };

function trackLink(url: string, trackBase: string, src = "brief"): string {
  if (!trackBase) return url;
  return `${trackBase}/api/go?to=${encodeURIComponent(url)}&src=${src}`;
}

function buildMemberEmail(lookbook: Lookbook, dashboardUrl: string, manageUrl: string, trackBase = ""): string {
  const mailingAddress = (process.env.BUSINESS_MAILING_ADDRESS ?? "The Style Refresh · [ADD MAILING ADDRESS] · New York, NY").trim();
  const looks = lookbook.looks ?? [];

  const looksHtml = looks.map(look => `
    <tr>
      <td style="padding:22px 0 0;">
        <p style="margin:0 0 2px;font-size:10px;letter-spacing:0.28em;text-transform:uppercase;
                   color:#C4956A;font-family:Arial,sans-serif;">${look.index} — ${look.label}</p>
        <p style="margin:4px 0 6px;font-size:20px;color:#2C2C2C;font-family:Georgia,serif;font-style:italic;">
          &ldquo;${look.tagline}&rdquo;
        </p>
        <p style="margin:0 0 10px;font-size:13px;color:#4A4A4A;font-family:Georgia,serif;line-height:1.65;">
          ${look.description}
        </p>
        <p style="margin:0 0 12px;font-size:11px;color:#8A8580;font-family:Arial,sans-serif;font-style:italic;
                   line-height:1.55;border-left:2px solid #C4956A;padding-left:10px;">
          ${look.editorsNote}
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          ${look.items.map(item => `
          <tr>
            <td style="padding:9px 12px;background:#F5EFE4;border-bottom:1px solid #E8DDD0;">
              <strong style="font-family:Georgia,serif;font-size:14px;color:#2C2C2C;">${item.piece}</strong>
              <span style="color:#C4956A;font-size:11px;font-family:Arial,sans-serif;margin-left:8px;">
                ${item.brand} · ${item.price}
              </span>
              <br/>
              <span style="font-size:11px;color:#6B6560;font-family:Arial,sans-serif;line-height:1.5;">
                ${item.note}
              </span>
              <br/>
              <a href="${trackLink(item.buyLink, trackBase)}"
                 style="font-size:10px;color:#C4956A;font-family:Arial,sans-serif;
                         letter-spacing:0.1em;text-decoration:none;">
                Shop now →
              </a>
            </td>
          </tr>`).join("")}
        </table>
      </td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>Your Monday Style Brief — Ellie</title></head>
<body style="margin:0;padding:0;background:#F5EFE4;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5EFE4;padding:36px 16px;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0"
       style="background:#FDFAF5;max-width:580px;width:100%;border:1px solid #DDD4C5;">

  <tr><td style="height:3px;background:linear-gradient(90deg,transparent,#C4956A,transparent);"></td></tr>

  <tr><td style="background:#EDE5D8;padding:28px 36px;text-align:center;">
    <p style="margin:0 0 4px;color:#C4956A;font-size:10px;letter-spacing:0.34em;
               text-transform:uppercase;font-family:Arial,sans-serif;">
      The Style Refresh · Week of ${lookbook.weekOf}
    </p>
    <h1 style="margin:6px 0 0;color:#2C2C2C;font-size:26px;font-weight:400;
                letter-spacing:0.02em;font-family:Georgia,serif;">
      Your Monday Brief
    </h1>
  </td></tr>

  <tr><td style="padding:22px 36px 0;">
    <p style="margin:0;font-size:15px;color:#4A4A4A;font-family:Georgia,serif;font-style:italic;
               line-height:1.75;border-bottom:1px solid #E8DDD0;padding-bottom:18px;">
      ${lookbook.editorialLead}
    </p>
  </td></tr>

  <tr><td style="padding:0 36px;">
    <table width="100%" cellpadding="0" cellspacing="0">${looksHtml}</table>
  </td></tr>

  <tr><td style="height:28px;"></td></tr>

  <tr><td style="padding:0 36px 30px;text-align:center;">
    <a href="${dashboardUrl}"
       style="display:inline-block;background:#2C2C2C;color:#FDFAF5;padding:14px 36px;
               font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.2em;
               text-transform:uppercase;text-decoration:none;">
      Open Full Brief in VIP Room →
    </a>
  </td></tr>

  <tr><td style="padding:0 36px 18px;">
    <div style="height:1px;background:linear-gradient(90deg,transparent,#C9B99A,transparent);"></div>
  </td></tr>

  <tr><td style="padding:14px 36px 20px;text-align:center;background:#F5EFE4;">
    <p style="margin:0 0 4px;color:#8A8580;font-size:10px;letter-spacing:0.18em;
               text-transform:uppercase;font-family:Arial,sans-serif;">
      ELLIE · The Style Refresh · Private Membership
    </p>
    <p style="margin:4px 0;color:#B5A99A;font-size:10px;font-family:Arial,sans-serif;">
      You received this as an active paying member. To stop receiving these emails,
      <a href="${manageUrl}" style="color:#C4956A;">cancel your subscription here</a>.
    </p>
    <p style="margin:4px 0 0;color:#B5A99A;font-size:10px;font-family:Arial,sans-serif;">
      ${mailingAddress}
    </p>
    <p style="margin:4px 0 0;color:#B5A99A;font-size:10px;font-family:Arial,sans-serif;">
      Links in this email may include affiliate links. We may earn a small commission
      at no extra cost to you. This never influences our curation.
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

async function getActiveSubscriberEmails(stripe: Stripe): Promise<string[]> {
  const emails: string[] = [];
  let startingAfter: string | undefined;

  while (true) {
    const params: Stripe.SubscriptionListParams = {
      status:  "active",
      limit:   100,
      expand:  ["data.customer"],
    };
    if (startingAfter) params.starting_after = startingAfter;

    const page = await stripe.subscriptions.list(params);

    for (const sub of page.data) {
      const customer = sub.customer as Stripe.Customer;
      if (customer?.email) emails.push(customer.email.toLowerCase().trim());
    }

    if (!page.has_more) break;
    startingAfter = page.data[page.data.length - 1].id;
  }

  return [...new Set(emails)];
}

async function runSend(req?: NextRequest): Promise<NextResponse> {
  /* Auth: Vercel cron sends Authorization: Bearer <CRON_SECRET>
     Manual "Send Now" button uses GET with secret param */
  const authHeader    = req?.headers.get("authorization") ?? "";
  const secretParam   = req ? new URL(req.url).searchParams.get("secret") ?? "" : "";
  const cronSecret    = process.env.CRON_SECRET?.trim() ?? "";
  const approveSecret = process.env.CURATOR_APPROVE_SECRET?.trim() ?? "";

  const validAuth   = authHeader === `Bearer ${cronSecret}`;
  const validParam  = secretParam && (secretParam === cronSecret || secretParam === approveSecret);

  if (!validAuth && !validParam) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /* Read approved lookbook from /tmp */
  const approvedPath = path.join("/tmp", "ellie-approved.json");
  if (!fs.existsSync(approvedPath)) {
    /* Email Ellie that no draft was approved */
    const resendKey   = process.env.RESEND_API_KEY?.trim();
    const fromEmail   = process.env.RESEND_FROM_EMAIL?.trim();
    const notifyEmail = process.env.RESEND_NOTIFY_EMAIL?.trim();
    if (resendKey && fromEmail && notifyEmail) {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from:    `Ellie Curator <${fromEmail}>`,
        to:      notifyEmail,
        subject: "[ACTION NEEDED] No approved draft — Monday send skipped",
        html: `<p style="font-family:sans-serif;color:#111;padding:20px;">
          The Monday Style Refresh send was skipped because no approved draft was found.<br/><br/>
          This usually means the Sunday approval wasn't clicked in time, or the server restarted.<br/><br/>
          To send manually, go to Vercel → your project → run the curator again from the dashboard.
        </p>`,
      });
    }
    return NextResponse.json({ error: "No approved draft found. Ellie has been notified.", sent: 0 }, { status: 404 });
  }

  let lookbook: Lookbook;
  try {
    lookbook = JSON.parse(fs.readFileSync(approvedPath, "utf8")) as Lookbook;
  } catch (err) {
    return NextResponse.json({ error: "Could not read approved draft.", detail: String(err) }, { status: 500 });
  }

  const stripeKey  = process.env.STRIPE_SECRET_KEY?.trim();
  const resendKey  = process.env.RESEND_API_KEY?.trim();
  const fromEmail  = process.env.RESEND_FROM_EMAIL?.trim();
  const baseUrl    = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com").replace(/\/$/, "");

  if (!stripeKey || !resendKey || !fromEmail) {
    return NextResponse.json(
      { error: "Missing STRIPE_SECRET_KEY, RESEND_API_KEY, or RESEND_FROM_EMAIL in Production env." },
      { status: 503 }
    );
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
  const resend = new Resend(resendKey);

  let emails: string[];
  try {
    emails = await getActiveSubscriberEmails(stripe);
    console.log(`[send-weekly] ${emails.length} active subscribers found.`);
  } catch (err) {
    return NextResponse.json({ error: "Stripe error", detail: String(err) }, { status: 500 });
  }

  if (emails.length === 0) {
    return NextResponse.json({ success: true, sent: 0, message: "No active subscribers yet." });
  }

  const stripePortal = "https://billing.stripe.com/p/login/test_00g00000000000000000";
  const emailHtml = buildMemberEmail(lookbook, `${baseUrl}/dashboard`, stripePortal, baseUrl);
  const subject   = `Your Monday Style Brief — Week of ${lookbook.weekOf}`;
  let sentCount   = 0;
  const failed: string[] = [];

  /* Send in batches of 50 with 500ms pause */
  const BATCH = 50;
  for (let i = 0; i < emails.length; i += BATCH) {
    const batch = emails.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(email => resend.emails.send({ from: `Ellie <${fromEmail}>`, to: email, subject, html: emailHtml }))
    );
    results.forEach((r, idx) => {
      if (r.status === "fulfilled" && !r.value.error) {
        sentCount++;
      } else {
        failed.push(batch[idx]);
        console.error("[send-weekly] Failed:", batch[idx], r.status === "rejected" ? r.reason : r.value.error);
      }
    });
    if (i + BATCH < emails.length) await new Promise(r => setTimeout(r, 500));
  }

  /* Clean up approved file so it doesn't send again */
  try { fs.unlinkSync(approvedPath); } catch { /* ignore */ }

  console.log(`[send-weekly] Done. Sent: ${sentCount}, Failed: ${failed.length}`);
  return NextResponse.json({ success: true, weekOf: lookbook.weekOf, sent: sentCount, failed: failed.length });
}

export async function GET(req: NextRequest) {
  return runSend(req);
}

export async function POST(req: NextRequest) {
  return runSend(req);
}
