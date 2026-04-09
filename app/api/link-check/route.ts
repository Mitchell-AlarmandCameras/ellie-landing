import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import fs from "fs";
import path from "path";

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/link-check
   Vercel Cron fires this every Wednesday at 9:00 PM ET (01:00 UTC Thursday).
   
   Checks every buy link in the current approved brief.
   Sends Ellie an email report — green if all pass, red with details if any fail.
   Gives her Thursday + Friday + weekend to fix before the next Monday send.
═══════════════════════════════════════════════════════════════════════════ */

export const runtime     = "nodejs";
export const dynamic     = "force-dynamic";
export const maxDuration = 30;

type LinkResult = {
  piece:    string;
  brand:    string;
  url:      string;
  ok:       boolean;
  status:   number | string;
};

async function checkLink(url: string): Promise<{ ok: boolean; status: number | string }> {
  try {
    const res = await fetch(url, {
      method:  "HEAD",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; StyleRefreshBot/1.0)",
      },
      redirect: "follow",
    });
    return { ok: res.status < 400, status: res.status };
  } catch (err) {
    return { ok: false, status: String(err).slice(0, 60) };
  }
}

function buildReportEmail(
  results:    LinkResult[],
  allGood:    boolean,
  failCount:  number,
  checkTime:  string,
  mailingAddress: string
): string {
  const rows = results.map(r => `
    <tr>
      <td style="padding:9px 14px;border-bottom:1px solid #E8DDD0;font-family:Arial,sans-serif;
                  font-size:13px;color:#2C2C2C;">${r.piece}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #E8DDD0;font-family:Arial,sans-serif;
                  font-size:12px;color:#6B6560;">${r.brand}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #E8DDD0;text-align:center;
                  font-size:14px;">${r.ok ? "✅" : "❌"}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #E8DDD0;font-family:Arial,sans-serif;
                  font-size:11px;color:${r.ok ? "#6B6560" : "#c0392b"};">
        ${r.ok ? String(r.status) : `${r.status} — <a href="${r.url}" style="color:#C4956A;">check link</a>`}
      </td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F5EFE4;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5EFE4;padding:36px 16px;">
<tr><td align="center">
<table width="640" cellpadding="0" cellspacing="0"
       style="background:#FDFAF5;max-width:640px;width:100%;border:1px solid #DDD4C5;">

  <tr><td style="height:3px;background:linear-gradient(90deg,transparent,${allGood ? "#4A6741" : "#c0392b"},transparent);"></td></tr>

  <tr><td style="background:#EDE5D8;padding:26px 36px;text-align:center;">
    <p style="margin:0 0 4px;color:#C4956A;font-size:10px;letter-spacing:0.34em;
               text-transform:uppercase;font-family:Arial,sans-serif;">
      Ellie · Wednesday Link Check
    </p>
    <h1 style="margin:6px 0 4px;color:#2C2C2C;font-size:22px;font-weight:400;font-family:Georgia,serif;">
      ${allGood
        ? "✅ All links working perfectly"
        : `⚠️ ${failCount} broken link${failCount !== 1 ? "s" : ""} found`}
    </h1>
    <p style="margin:0;color:#6B6560;font-size:12px;font-family:Arial,sans-serif;">${checkTime}</p>
  </td></tr>

  ${!allGood ? `
  <tr><td style="padding:16px 36px 0;">
    <div style="background:#FDF0ED;border:1px solid #e8b4a8;padding:14px 18px;">
      <p style="margin:0;font-size:13px;color:#c0392b;font-family:Arial,sans-serif;line-height:1.6;">
        <strong>Action needed before Monday morning.</strong> The broken links below will send
        members to an error page. Click each red link to check it manually and update the brief
        in Vercel if needed. You have until Sunday night to fix.
      </p>
    </div>
  </td></tr>` : `
  <tr><td style="padding:16px 36px 0;">
    <div style="background:#F0F7EE;border:1px solid #a8d4a0;padding:14px 18px;">
      <p style="margin:0;font-size:13px;color:#2d6a27;font-family:Arial,sans-serif;line-height:1.6;">
        All ${results.length} links checked and working. Monday brief is clear to send.
      </p>
    </div>
  </td></tr>`}

  <tr><td style="padding:20px 36px 0;">
    <p style="margin:0 0 10px;font-size:10px;letter-spacing:0.24em;text-transform:uppercase;
               color:#C4956A;font-family:Arial,sans-serif;">Link Results</p>
    <table width="100%" cellpadding="0" cellspacing="0"
           style="border-collapse:collapse;border:1px solid #E8DDD0;">
      <tr style="background:#F5EFE4;">
        <th style="padding:8px 14px;text-align:left;font-family:Arial,sans-serif;
                    font-size:10px;letter-spacing:0.16em;text-transform:uppercase;
                    color:#C4956A;border-bottom:1px solid #E8DDD0;">Item</th>
        <th style="padding:8px 14px;text-align:left;font-family:Arial,sans-serif;
                    font-size:10px;letter-spacing:0.16em;text-transform:uppercase;
                    color:#C4956A;border-bottom:1px solid #E8DDD0;">Brand</th>
        <th style="padding:8px 14px;text-align:center;font-family:Arial,sans-serif;
                    font-size:10px;letter-spacing:0.16em;text-transform:uppercase;
                    color:#C4956A;border-bottom:1px solid #E8DDD0;">Status</th>
        <th style="padding:8px 14px;text-align:left;font-family:Arial,sans-serif;
                    font-size:10px;letter-spacing:0.16em;text-transform:uppercase;
                    color:#C4956A;border-bottom:1px solid #E8DDD0;">Details</th>
      </tr>
      ${rows}
    </table>
  </td></tr>

  <tr><td style="height:24px;"></td></tr>
  <tr><td style="padding:0 36px;">
    <div style="height:1px;background:linear-gradient(90deg,transparent,#C9B99A,transparent);"></div>
  </td></tr>
  <tr><td style="padding:16px 36px 24px;text-align:center;">
    <p style="margin:0;font-size:10px;color:#B5A99A;font-family:Arial,sans-serif;line-height:1.6;">
      ${mailingAddress}<br/>
      Automated Wednesday link check · The Style Refresh
    </p>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;
}

export async function GET(req: NextRequest) {
  /* Authenticate */
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const resendKey     = process.env.RESEND_API_KEY?.trim();
  const notifyEmail   = process.env.RESEND_NOTIFY_EMAIL?.trim();
  const fromEmail     = process.env.RESEND_FROM_EMAIL ?? "ellie@stylebyellie.com";
  const mailingAddress = process.env.BUSINESS_MAILING_ADDRESS ?? "The Style Refresh · New York, NY";

  /* ── Load the current approved brief ───────────────────────── */
  type LookItem = { piece: string; brand: string; buyLink: string };
  type Look     = { label: string; items: LookItem[] };
  type Brief    = { looks: Look[] };

  let brief: Brief | null = null;

  /* Try Vercel Blob first (persistent approved brief) */
  try {
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (blobToken) {
      const { list } = await import("@vercel/blob");
      const { blobs } = await list({ prefix: "ellie-preview/" });
      const previewBlob = blobs.find(b => b.pathname.includes("current.json"));
      if (previewBlob) {
        const res  = await fetch(previewBlob.url);
        const data = await res.json();
        if (data?.looks) brief = data;
      }
    }
  } catch { /* fall through */ }

  /* Fall back to /tmp (same-instance approved brief) */
  if (!brief) {
    try {
      const tmpPath = path.join("/tmp", "ellie-approved.json");
      if (fs.existsSync(tmpPath)) {
        brief = JSON.parse(fs.readFileSync(tmpPath, "utf-8"));
      }
    } catch { /* fall through */ }
  }

  if (!brief?.looks?.length) {
    console.log("[link-check] No approved brief found — skipping check.");
    return NextResponse.json({ ok: true, message: "No approved brief to check yet." });
  }

  /* ── Check every buy link ───────────────────────────────────── */
  const results: LinkResult[] = [];

  for (const look of brief.looks) {
    for (const item of look.items) {
      if (!item.buyLink) continue;
      const { ok, status } = await checkLink(item.buyLink);
      results.push({
        piece:  item.piece,
        brand:  item.brand,
        url:    item.buyLink,
        ok,
        status,
      });
    }
  }

  const failCount = results.filter(r => !r.ok).length;
  const allGood   = failCount === 0;

  const checkTime = new Date().toLocaleString("en-US", {
    weekday: "long", month: "long", day: "numeric",
    hour: "numeric", minute: "2-digit",
    timeZone: "America/New_York",
  }) + " ET";

  console.log(`[link-check] ${allGood ? "ALL GOOD" : `${failCount} FAILURES`} — ${results.length} links checked`);

  /* ── Send report email ──────────────────────────────────────── */
  if (resendKey && notifyEmail) {
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from:    `Ellie <${fromEmail}>`,
      to:      notifyEmail,
      subject: allGood
        ? `✅ All links good — Monday brief is clear · ${checkTime}`
        : `⚠️ ${failCount} broken link${failCount !== 1 ? "s" : ""} in Monday brief — fix before Sunday`,
      html: buildReportEmail(results, allGood, failCount, checkTime, mailingAddress),
    });
  }

  return NextResponse.json({
    ok:        allGood,
    checked:   results.length,
    failures:  failCount,
    results:   results.map(r => ({ piece: r.piece, ok: r.ok, status: r.status })),
    timestamp: checkTime,
  });
}
