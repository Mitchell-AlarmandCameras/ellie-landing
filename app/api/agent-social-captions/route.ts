import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/agent-social-captions
   THE SOCIAL MANAGER — Ellie's Instagram strategist.

   Runs every Monday at 8 AM ET (12:00 UTC) — 3 hours before the brief sends.

   What it does:
     1. Reads the approved weekly brief from Blob
     2. Generates 7 Instagram captions (Mon–Sun) — ready to copy-paste directly
        into Instagram with no editing needed
     3. Each caption: Ellie's voice, opening hook, 2-3 body sentences, CTA,
        20 targeted hashtags, and a photo direction note
     4. Emails the full week of captions as a formatted digest
     5. Saves to Blob: ellie-social/week-YYYY-MM-DD.json

   Owner workflow: open email Monday morning, copy caption, paste into IG,
   post the photo. That's it. No writing, no thinking, no hashtag research.
═══════════════════════════════════════════════════════════════════════════ */

export const runtime     = "nodejs";
export const maxDuration = 45;

interface LookItem { piece: string; brand: string; price: string; note: string; buyLink: string }
interface Look     { index: string; label: string; tagline: string; description: string; editorsNote: string; items: LookItem[] }
interface Brief    { weekOf: string; editorialLead: string; looks: Look[] }

interface Caption {
  day:          string;
  look:         string;
  photoNote:    string;
  caption:      string;
  hashtags:     string;
}

/* ─── Generate one caption via Claude ─────────────────────────────────── */
async function generateCaption(
  anthropicKey: string,
  look:         Look,
  dayLabel:     string,
  weekOf:       string,
  postIndex:    number,
): Promise<Caption> {

  /* Pick a featured item from the look to spotlight */
  const featuredItem = look.items[postIndex % look.items.length];

  const prompt = `You are Ellie — a private women's style consultant. Write one Instagram post for The Style Refresh, a $19/month curated fashion membership.

This week: "${weekOf}"
Look name: "${look.label}" — "${look.tagline}"
Look description: "${look.description}"
Editor's note: "${look.editorsNote}"
Featured piece for this post: "${featuredItem.piece}" by ${featuredItem.brand} (${featuredItem.price})
Item note: "${featuredItem.note}"

VOICE RULES:
- First line is always a declarative statement (hook), never a question, never emoji-first
- Warm and authoritative — like a real person writing to someone they know, not a brand broadcasting
- Specific always: name the exact piece, exact brand, exact occasion or pairing
- No engagement bait: no "Comment below!", "Double-tap if you agree!", "Save this! 📌", "What do you think?"
- No filler words: chic, stunning, gorgeous, amazing, obsessed, elevate, seamlessly, curated
- No AI phrases: "this season's must-have", "take your style to the next level", "look no further"
- 3 sentences max for the main body after the hook — make each one earn its place
- End with: "Link in bio → try free for 7 days."
- The reader reads Vogue and has zero patience for copy that could be from any brand. Write differently.

PHOTO DIRECTION (what the owner should photograph):
- Be specific: flat lay vs. worn, background color, styling details, natural light or not
- Keep it achievable at home — no studio, no model required
- The owner can model pieces herself or do styled flat lays

HASHTAGS: Exactly 20 hashtags. Mix:
- Brand/niche: #quietluxury #stylerefresh #therefresh #womensstylist #wardrobeessentials
- Item-specific: based on the actual piece (e.g. #ivoryblazer #blazeroutfit)
- Discovery: #ootd #womensfashion #outfitinspo #fashionover30 (use age-appropriate ones)
- Seasonal: based on current season and occasion

Return EXACTLY this format — no other text:
PHOTO: [specific photo direction in one sentence]
---
[The full Instagram caption, hook first, 3 body sentences, CTA last]
---
HASHTAGS: [all 20 hashtags on one line, space-separated, each starting with #]`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:  "POST",
    headers: {
      "x-api-key":         anthropicKey,
      "anthropic-version": "2023-06-01",
      "content-type":      "application/json",
    },
    body: JSON.stringify({
      model:      "claude-haiku-4-5",
      max_tokens: 600,
      messages:   [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = await res.json() as { content: Array<{ type: string; text: string }> };
  const raw  = data.content[0]?.text?.trim() ?? "";

  /* Parse the structured response */
  const photoMatch    = raw.match(/^PHOTO:\s*(.+?)(?:\n|---)/s);
  const hashtagMatch  = raw.match(/HASHTAGS:\s*(.+)$/s);
  const captionMatch  = raw.match(/---\n([\s\S]+?)\n---/);

  return {
    day:       dayLabel,
    look:      `${look.index} — ${look.label}`,
    photoNote: photoMatch?.[1]?.trim() ?? "Styled flat lay on neutral background, natural light.",
    caption:   captionMatch?.[1]?.trim() ?? raw,
    hashtags:  hashtagMatch?.[1]?.trim() ?? "#stylerefresh #quietluxury #womensfashion",
  };
}

/* ─── Build digest email ───────────────────────────────────────────────── */
function buildDigestEmail(captions: Caption[], weekOf: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com";

  const captionBlocks = captions.map((c, i) => `
  <!-- Caption ${i + 1} -->
  <tr><td style="padding:${i === 0 ? "24px" : "0"} 36px 0;">
    <table width="100%" cellpadding="0" cellspacing="0"
           style="border:1px solid #E8DDD0;border-radius:2px;">
      <tr><td style="background:#F5EFE4;padding:10px 16px;">
        <p style="margin:0;color:#C4956A;font-size:9px;letter-spacing:0.24em;
                   text-transform:uppercase;font-family:Arial,sans-serif;font-weight:bold;">
          ${c.day} · ${c.look}
        </p>
      </td></tr>
      <tr><td style="padding:12px 16px 6px;">
        <p style="margin:0 0 6px;color:#8A8580;font-size:10px;font-family:Arial,sans-serif;
                   letter-spacing:0.12em;text-transform:uppercase;">📸 Photo direction</p>
        <p style="margin:0 0 12px;color:#4A4A4A;font-size:12px;font-family:Arial,sans-serif;
                   line-height:1.6;font-style:italic;">${c.photoNote}</p>
        <p style="margin:0 0 6px;color:#8A8580;font-size:10px;font-family:Arial,sans-serif;
                   letter-spacing:0.12em;text-transform:uppercase;">✍️ Caption (copy-paste ready)</p>
        <p style="margin:0 0 12px;color:#2C2C2C;font-size:13px;font-family:Georgia,serif;
                   line-height:1.8;white-space:pre-line;">${c.caption}</p>
        <p style="margin:0 0 6px;color:#8A8580;font-size:10px;font-family:Arial,sans-serif;
                   letter-spacing:0.12em;text-transform:uppercase;"># Hashtags</p>
        <p style="margin:0;color:#6B6560;font-size:11px;font-family:Arial,sans-serif;
                   line-height:1.8;">${c.hashtags}</p>
      </td></tr>
    </table>
  </td></tr>`).join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F5EFE4;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5EFE4;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0"
       style="background:#FDFAF5;max-width:600px;width:100%;border:1px solid #DDD4C5;">
  <tr><td style="height:3px;background:linear-gradient(90deg,transparent,#C4956A,transparent);"></td></tr>

  <!-- Header -->
  <tr><td style="background:#EDE5D8;padding:28px 36px 22px;">
    <p style="margin:0 0 4px;color:#C4956A;font-size:10px;letter-spacing:0.38em;
               text-transform:uppercase;font-family:Arial,sans-serif;">
      Ellie · Social Manager
    </p>
    <h2 style="margin:4px 0 0;color:#2C2C2C;font-size:22px;font-weight:400;font-family:Georgia,serif;">
      Your Instagram week — ready to post
    </h2>
    <p style="margin:8px 0 0;color:#6B6560;font-size:12px;font-family:Arial,sans-serif;line-height:1.6;">
      Week of ${weekOf} · ${captions.length} captions · Copy, paste, post. Done.
    </p>
  </td></tr>

  <!-- Instructions -->
  <tr><td style="padding:20px 36px 0;">
    <p style="margin:0;color:#4A4A4A;font-size:13px;font-family:Arial,sans-serif;line-height:1.7;">
      Each caption below is ready to paste directly into Instagram. Follow the photo direction,
      paste the caption, add the hashtags, and post. Post 1/day for maximum reach.
      Best times: <strong>Tuesday–Friday, 11 AM–1 PM or 7–9 PM.</strong>
    </p>
  </td></tr>

  ${captionBlocks}

  <!-- Footer -->
  <tr><td style="padding:24px 36px 28px;">
    <p style="margin:0;font-size:11px;color:#B5A99A;font-family:Arial,sans-serif;line-height:1.6;">
      Generated every Monday morning from the approved brief.
      Always link your bio to <a href="${siteUrl}" style="color:#C4956A;">${siteUrl}</a>
      so followers can find the 7-day free trial.
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/* ─── Handler ──────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!anthropicKey) {
    return NextResponse.json({ skipped: true, reason: "ANTHROPIC_API_KEY not configured" });
  }

  /* ── Load approved brief from Blob ──────────────────────────────── */
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ skipped: true, reason: "Blob not configured" });
  }

  let brief: Brief | null = null;
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "ellie-approved/" });
    const latest = blobs
      .filter(b => b.pathname.endsWith(".json"))
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0];

    if (!latest) return NextResponse.json({ skipped: true, reason: "No approved brief in Blob" });

    const r = await fetch(latest.url, { cache: "no-store" });
    if (!r.ok) throw new Error(`Blob fetch failed: ${r.status}`);
    brief = await r.json() as Brief;
    if (!brief?.looks?.length) throw new Error("Brief has no looks");
  } catch (err) {
    console.error("[social-captions] Could not load brief:", err);
    return NextResponse.json({ error: "Could not load approved brief" }, { status: 500 });
  }

  /* ── Generate 7 captions — one per day Mon–Sun ───────────────────
     Strategy: 3 look-specific captions (one per look), then 4 lifestyle/
     brand-story captions that support the overall week's theme.
     All 7 pull from the brief's actual content.
  ─────────────────────────────────────────────────────────────────── */
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const captions: Caption[] = [];

  /* Days 0-2 (Mon-Wed): one caption per look */
  for (let i = 0; i < Math.min(3, brief.looks.length); i++) {
    try {
      const cap = await generateCaption(anthropicKey, brief.looks[i], days[i], brief.weekOf, i);
      captions.push(cap);
      console.log(`[social-captions] Generated caption for ${days[i]}: ${brief.looks[i].label}`);
    } catch (e) {
      console.error(`[social-captions] Caption ${i} failed:`, e);
    }
  }

  /* Days 3-6 (Thu-Sun): additional posts rotating through looks */
  for (let i = 3; i < 7; i++) {
    const lookIndex = i % brief.looks.length;
    try {
      const cap = await generateCaption(anthropicKey, brief.looks[lookIndex], days[i], brief.weekOf, i);
      captions.push(cap);
      console.log(`[social-captions] Generated caption for ${days[i]}: ${brief.looks[lookIndex].label}`);
    } catch (e) {
      console.error(`[social-captions] Caption ${i} failed:`, e);
    }
  }

  if (captions.length === 0) {
    return NextResponse.json({ error: "All caption generations failed" }, { status: 500 });
  }

  /* ── Save to Blob ──────────────────────────────────────────────── */
  try {
    const { put } = await import("@vercel/blob");
    const monday   = new Date();
    const day      = monday.getDay();
    const diff     = day === 0 ? 0 : 1 - day;
    monday.setDate(monday.getDate() + diff);
    const weekKey  = monday.toISOString().split("T")[0];

    await put(`ellie-social/week-${weekKey}.json`, JSON.stringify({ weekOf: brief.weekOf, captions }), {
      access:          "public",
      contentType:     "application/json",
      addRandomSuffix: false,
    });
    console.log("[social-captions] Captions saved to Blob");
  } catch (blobErr) {
    console.error("[social-captions] Blob save failed (non-fatal):", blobErr);
  }

  /* ── Email digest to owner ─────────────────────────────────────── */
  const resendKey   = process.env.RESEND_API_KEY?.trim();
  const notifyEmail = process.env.RESEND_NOTIFY_EMAIL?.trim();
  const fromEmail   = process.env.RESEND_FROM_EMAIL ?? "ellie@stylebyellie.com";

  if (resendKey && notifyEmail) {
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from:    `Ellie Social <${fromEmail}>`,
      to:      notifyEmail,
      subject: `📱 Your Instagram week — ${captions.length} captions ready to post (${brief.weekOf})`,
      html:    buildDigestEmail(captions, brief.weekOf),
    }).catch(e => console.error("[social-captions] Email failed:", e));
    console.log(`[social-captions] Digest email sent — ${captions.length} captions`);
  }

  return NextResponse.json({
    ok:       true,
    weekOf:   brief.weekOf,
    captions: captions.length,
    days:     captions.map(c => c.day),
  });
}
