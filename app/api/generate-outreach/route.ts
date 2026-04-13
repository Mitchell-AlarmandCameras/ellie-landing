import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/generate-outreach
   Vercel Cron fires this every Friday at 9 AM ET (13:00 UTC).

   What it does:
   1. Selects 5 blogger/creator profiles from a rotating bank of 24
   2. Asks Claude to write a concise, personalized pitch email for each type
   3. Emails all 5 pitches to owner in a ready-to-send digest
   4. Owner spends 15 minutes: finds 5 real bloggers via Instagram/Google,
      pastes their email, sends the pre-written pitch. Done.
   5. Saves outreach log to Blob at outreach/blogger-pitches-[date].json

   The pitch strategy:
   - Offer a FREE 3-month membership in exchange for an honest review
   - Lead with what's in it for THEM (content + their readers)
   - 100-130 words max — busy creators don't read long emails
   - No price mentioned in the subject line
   - Tone: peer-to-peer, not corporate
   - Each pitch is personalized to the blogger TYPE's specific audience

   Why this works:
   - A micro-blogger with 3,000 engaged followers converts better than
     a macro-influencer with 500,000 passive ones
   - Fashion micro-bloggers are always looking for content to review
   - A free trial costs nothing and could bring 5-50 signups per review
═══════════════════════════════════════════════════════════════════════════ */

export const runtime     = "nodejs";
export const dynamic     = "force-dynamic";
export const maxDuration = 55;

const SITE_URL  = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com").replace(/\/$/, "");
const SITE_NAME = "The Style Refresh by Ellie";

/* ── Blogger profile bank — 24 types, each with a distinct audience ── */
const BLOGGER_PROFILES = [
  {
    type:       "Capsule Wardrobe Creator",
    platform:   "Instagram + blog",
    audience:   "Women 28-45 who want to buy less but dress better",
    findThem:   "Search Instagram: #capsulewardrobe, #minimalistfashion, #slowfashion — look for 2k-20k followers with high engagement (5%+ likes/comments ratio)",
    angleHook:  "their readers already want curation — this is the exact product for them",
  },
  {
    type:       "Quiet Luxury / Old Money Aesthetic Creator",
    platform:   "Instagram Reels + TikTok",
    audience:   "Women 28-45 obsessed with the 'looks expensive' aesthetic",
    findThem:   "Search Instagram: #quietluxury #oldmoneyaesthetic #thatgirl — micro-creators under 15k followers are most responsive",
    angleHook:  "their audience wants exactly the kind of editorial curation Ellie provides",
  },
  {
    type:       "Corporate / Work Fashion Blogger",
    platform:   "Blog + Pinterest",
    audience:   "Professional women 28-50 looking for polished work outfits",
    findThem:   "Google 'work outfit ideas women blog 2026' — check the blogs on page 2-3 of results (they're hungry for traffic and collaborations)",
    angleHook:  "Ellie's Monday brief solves exactly their readers' weekly problem",
  },
  {
    type:       "Midsize Fashion Creator",
    platform:   "Instagram + TikTok",
    audience:   "Women size 10-18 who feel underserved by fashion media",
    findThem:   "Search Instagram: #midfashion #midsizemom #midsizefashion — this community is tight-knit and share content aggressively",
    angleHook:  "curation that works across sizes is a gap — Ellie's looks are styled for real women",
  },
  {
    type:       "Over-40 Fashion Creator",
    platform:   "Instagram + Facebook Group",
    audience:   "Women 40-60 who want to look polished and current",
    findThem:   "Search Instagram: #over40style #fashionover40 #styleafter40 — highly engaged, loyal followers who trust recommendations",
    angleHook:  "this audience has money to spend and values a curated, non-trend-chasing approach",
  },
  {
    type:       "Sustainable / Slow Fashion Advocate",
    platform:   "Blog + Instagram",
    audience:   "Women who want to buy intentionally and avoid fast fashion",
    findThem:   "Google 'slow fashion blog' or search Instagram: #slowfashion #ethicalfashion #sustainablestyle",
    angleHook:  "Ellie's approach is anti-impulse-buy by design — 3 considered picks per week, not a firehose",
  },
  {
    type:       "Subscription Box Reviewer",
    platform:   "YouTube + Blog",
    audience:   "Women who follow 'unboxing' and subscription service content",
    findThem:   "YouTube search: 'women fashion subscription review 2026' — target channels with 1k-50k subscribers",
    angleHook:  "this creator already has an audience pre-qualified to buy subscription services",
  },
  {
    type:       "Minimalist Lifestyle Blogger",
    platform:   "Blog + Newsletter",
    audience:   "Women who want a more intentional, less cluttered life",
    findThem:   "Google 'minimalist lifestyle blog women' — reach out via their contact form or email in About page",
    angleHook:  "fashion curation as intentional living — fewer, better pieces delivered every Monday",
  },
  {
    type:       "Budget Luxury Fashion Creator",
    platform:   "Instagram + Pinterest",
    audience:   "Women who want quality fashion without luxury prices",
    findThem:   "Search Instagram: #affordableluxury #lookforless #highstreetfashion",
    angleHook:  "Ellie finds quality pieces at real-world prices — this audience will buy",
  },
  {
    type:       "New Mom / Return-to-Work Fashion Creator",
    platform:   "Instagram + TikTok",
    audience:   "New moms and women re-entering the workforce wanting their style back",
    findThem:   "Search Instagram: #momstyle #momswhostyle #workingmomfashion",
    angleHook:  "zero time to browse = exact target for a weekly curated inbox",
  },
  {
    type:       "NYC / LA City Fashion Creator",
    platform:   "Instagram",
    audience:   "Urban professional women 25-40 who care deeply about dressing well",
    findThem:   "Search Instagram: #nycstyle #nycfashion #lafashion with 2k-15k followers",
    angleHook:  "city women are Ellie's core persona and respond most to editorial curation",
  },
  {
    type:       "Fashion Newsletter Writer",
    platform:   "Substack + Newsletter",
    audience:   "Women who already subscribe to fashion content newsletters",
    findThem:   "Substack search: 'fashion' or 'style' — look for newsletters under 5k subscribers (they'll respond to collaboration)",
    angleHook:  "audience already proven to value paid fashion content — easiest conversion",
  },
  {
    type:       "Personal Stylist (freelance)",
    platform:   "Instagram + website",
    audience:   "Their personal styling clients and followers",
    findThem:   "Search Instagram: #personalstyleconsultant #stylistforhire #wardrobeconsultant",
    angleHook:  "they can recommend Ellie to clients who can't afford full personal styling",
  },
  {
    type:       "Workwear Pinterest Creator",
    platform:   "Pinterest",
    audience:   "Women actively pinning work outfit ideas",
    findThem:   "Pinterest search: 'office outfit ideas' — look for pinners with 10k-500k monthly views who have a website or email",
    angleHook:  "Pinterest drives fashion purchase intent — this audience shops what they pin",
  },
  {
    type:       "Fashion Resale / Thrift Creator",
    platform:   "TikTok + Instagram",
    audience:   "Women interested in elevated style on a real budget",
    findThem:   "Search Instagram: #thrifthaul #thriftflip #depopfinds — creators who appreciate curation",
    angleHook:  "they understand value per dollar — Ellie's $19 monthly cost makes sense to this crowd",
  },
  {
    type:       "Petite Fashion Creator",
    platform:   "Instagram + blog",
    audience:   "Women under 5'4\" who struggle to find well-fitting clothes",
    findThem:   "Search Instagram: #petitefashion #petitestyle #shortgirlstyle",
    angleHook:  "petite women are underserved in fashion media — a curated brief that considers fit nuances is gold",
  },
  {
    type:       "Career Women / Ambition Blogger",
    platform:   "LinkedIn + blog",
    audience:   "Ambitious professional women building their brand and wardrobe",
    findThem:   "LinkedIn search: 'women's fashion blogger' or 'personal branding coach women'",
    angleHook:  "dressing well = professional credibility — Ellie makes this effortless",
  },
  {
    type:       "Seasonal Trend Recap Creator",
    platform:   "YouTube",
    audience:   "Women who want trend guidance before shopping each season",
    findThem:   "YouTube search: 'fall fashion haul 2026 women' or 'spring wardrobe essentials' — target 5k-100k subscribers",
    angleHook:  "Ellie's AI scans real trend data weekly — positions perfectly as the year-round trend solution",
  },
  {
    type:       "Fashion Subscription Comparison Blogger",
    platform:   "Blog",
    audience:   "Comparison shoppers actively evaluating subscription services",
    findThem:   "Google 'fashion subscription box comparison' or 'stitch fix alternatives 2026' — contact page on their blog",
    angleHook:  "this creator actively reviews services — one positive review could drive 100+ signups",
  },
  {
    type:       "Career Transition / Promotion Style Creator",
    platform:   "Instagram + LinkedIn",
    audience:   "Women 30-48 leveling up professionally and wanting their wardrobe to match",
    findThem:   "Search Instagram: #careerwomen #workwear #professionalstyle — look for creators who talk about promotion, career moves, re-entering the workforce",
    angleHook:  "their audience is at the exact moment when having a reliable stylist in your inbox has maximum ROI",
  },
  {
    type:       "French Girl / European Style Creator",
    platform:   "Instagram + blog",
    audience:   "Women who aspire to effortless, chic European aesthetics",
    findThem:   "Search Instagram: #frenchgirlstyle #parisienstyle #europeanstyle",
    angleHook:  "Ellie's editorial approach and restrained 3-look format fits the less-is-more European aesthetic",
  },
  {
    type:       "Luxury on a Budget Creator",
    platform:   "Instagram + TikTok",
    audience:   "Women who want Net-a-Porter taste on a normal income",
    findThem:   "Search Instagram: #lookforless #luxuryfoless #dupes",
    angleHook:  "Ellie sources from real brands at attainable prices — this is their core promise",
  },
  {
    type:       "Mom Blogger (general lifestyle)",
    platform:   "Blog + Instagram",
    audience:   "Mothers 30-50 who want to reclaim their personal style",
    findThem:   "Google 'mom blogger fashion style' or search Instagram: #momlife #momstyle with 3k-30k followers",
    angleHook:  "moms are time-poor and money-conscious — a $19 Monday morning brief solves both problems",
  },
  {
    type:       "Women's Podcast Host",
    platform:   "Podcast + Instagram",
    audience:   "Women who consume content during commutes and routines",
    findThem:   "Spotify search: podcasts for women under 500 reviews but consistent publishing — check their show notes for contact",
    angleHook:  "podcast listeners are loyal buyers — a mention in an episode can drive 20-50 signups in one day",
  },
];

/* ── Pick N profiles this week using a seeded rotation ──────────── */
function pickProfiles(n: number) {
  const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  return [...BLOGGER_PROFILES]
    .sort((a, b) => {
      const ha = (a.type.charCodeAt(0) * 37 + weekNumber) % BLOGGER_PROFILES.length;
      const hb = (b.type.charCodeAt(0) * 37 + weekNumber) % BLOGGER_PROFILES.length;
      return ha - hb;
    })
    .slice(0, n);
}

/* ── Generate one pitch email via Claude ──────────────────────────── */
async function generatePitch(
  profile: typeof BLOGGER_PROFILES[0],
  apiKey:  string
): Promise<string> {
  const prompt = `Write a cold outreach pitch email from Ellie to a "${profile.type}" creator.

About the sender: Ellie runs The Style Refresh (${SITE_URL}) — a $19/month membership where women receive 3 expertly curated fashion looks every Monday morning, every item named by brand and price. Like having a personal stylist in your inbox.

About the recipient: A ${profile.type} creator on ${profile.platform}. Their audience: ${profile.audience}.

Why this is relevant to them: ${profile.angleHook}.

The offer: A free 3-month membership in exchange for an honest review/mention to their audience. No requirement to be positive — just honest. Ellie will also create a custom referral link so they get credit for any signups they drive.

Email requirements:
- Subject line: compelling, curiosity-driven, NOT salesy — do not mention price
- Body: 100-120 words max
- Tone: peer-to-peer, warm, direct — NOT corporate, NOT a pitch template
- Lead with what's in it for THEM and their audience, not features
- Mention the free 3-month offer naturally in 1 sentence
- End with a simple ask: "Worth a quick chat or a trial membership to see if it's a fit for your audience?"
- Sign off as "Ellie — The Style Refresh"

Return the email in this exact format:
SUBJECT: [subject line here]

[email body here]`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:  "POST",
    headers: {
      "x-api-key":         apiKey,
      "anthropic-version": "2023-06-01",
      "content-type":      "application/json",
    },
    body: JSON.stringify({
      model:      "claude-haiku-4-5",
      max_tokens: 500,
      messages:   [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Claude API ${res.status}`);
  const json = await res.json() as { content: Array<{ text: string }> };
  return (json.content[0]?.text ?? "").trim();
}

/* ── Parse subject + body from generated email text ──────────────── */
function parseEmail(raw: string): { subject: string; body: string } {
  const lines   = raw.split("\n");
  const subjIdx = lines.findIndex(l => l.startsWith("SUBJECT:"));
  if (subjIdx === -1) return { subject: "Collaboration idea for your audience", body: raw };
  const subject = lines[subjIdx].replace(/^SUBJECT:\s*/i, "").trim();
  const body    = lines.slice(subjIdx + 2).join("\n").trim();
  return { subject, body };
}

/* ── Build digest email HTML ──────────────────────────────────────── */
function buildDigestEmail(
  pitches: Array<{ profile: typeof BLOGGER_PROFILES[0]; subject: string; body: string }>,
  weekOf:  string
): string {
  const mailingAddress = (process.env.BUSINESS_MAILING_ADDRESS ?? "The Style Refresh · 3811 Ditmars Blvd #2278 · Astoria, NY 11105").trim();

  const pitchBlocks = pitches.map((p, i) => `
  <!-- Pitch ${i + 1} -->
  <tr><td style="padding:${i === 0 ? "28px" : "16px"} 36px 0;">
    <div style="background:#F5EFE4;border:1px solid #DDD4C5;">

      <!-- Pitch header -->
      <div style="background:#2C2C2C;padding:14px 20px;">
        <p style="margin:0 0 2px;color:#C4956A;font-family:Arial,sans-serif;
                   font-size:9px;letter-spacing:0.26em;text-transform:uppercase;">
          Pitch ${i + 1} of ${pitches.length} — ${p.profile.type}
        </p>
        <p style="margin:0;color:rgba(253,250,245,0.7);font-family:Arial,sans-serif;font-size:11px;">
          Platform: ${p.profile.platform}
        </p>
      </div>

      <div style="padding:16px 20px 8px;">
        <!-- Where to find them -->
        <div style="background:#EDE5D8;border-left:3px solid #C4956A;padding:10px 14px;margin-bottom:14px;">
          <p style="margin:0 0 4px;color:#C4956A;font-family:Arial,sans-serif;
                     font-size:9px;letter-spacing:0.2em;text-transform:uppercase;">
            Where to find them
          </p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#4A4A4A;line-height:1.6;">
            ${p.profile.findThem}
          </p>
        </div>

        <!-- Subject line -->
        <p style="margin:0 0 4px;color:#C4956A;font-family:Arial,sans-serif;
                   font-size:9px;letter-spacing:0.2em;text-transform:uppercase;">
          Subject line (copy exactly)
        </p>
        <div style="background:#FDFAF5;border:1px solid #DDD4C5;padding:10px 14px;margin-bottom:14px;">
          <p style="margin:0;font-family:Georgia,serif;font-size:13px;
                     color:#2C2C2C;font-weight:600;">${p.subject}</p>
        </div>

        <!-- Email body -->
        <p style="margin:0 0 4px;color:#C4956A;font-family:Arial,sans-serif;
                   font-size:9px;letter-spacing:0.2em;text-transform:uppercase;">
          Email body (copy exactly — personalize [NAME] if you know it)
        </p>
        <div style="background:#FDFAF5;border:1px solid #DDD4C5;padding:14px 16px;margin-bottom:0;">
          <p style="margin:0;font-family:Georgia,serif;font-size:13px;
                     color:#4A4A4A;line-height:1.85;white-space:pre-wrap;">${p.body}</p>
        </div>
      </div>
    </div>
  </td></tr>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F5EFE4;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5EFE4;padding:32px 12px;">
<tr><td align="center">
<table width="640" cellpadding="0" cellspacing="0" style="background:#FDFAF5;max-width:640px;width:100%;border:1px solid #DDD4C5;">

  <tr><td style="height:4px;background:linear-gradient(90deg,#C4956A,#2C2C2C,#C4956A);"></td></tr>

  <!-- Header -->
  <tr><td style="background:#EDE5D8;padding:28px 36px;text-align:center;">
    <p style="margin:0 0 4px;color:#C4956A;font-size:10px;letter-spacing:0.36em;
               text-transform:uppercase;font-family:Arial,sans-serif;">
      Ellie · Weekly Outreach Kit
    </p>
    <h1 style="margin:6px 0 6px;color:#2C2C2C;font-size:22px;font-weight:400;font-family:Georgia,serif;">
      This Week's Blogger Pitches
    </h1>
    <p style="margin:0;color:#6B6560;font-size:12px;font-family:Arial,sans-serif;">
      Week of ${weekOf} · ${pitches.length} pitches ready to send
    </p>
  </td></tr>

  <!-- Instructions -->
  <tr><td style="padding:20px 36px 0;">
    <div style="background:#2C2C2C;padding:16px 20px;">
      <p style="margin:0 0 8px;color:#C4956A;font-family:Arial,sans-serif;
                 font-size:9px;letter-spacing:0.24em;text-transform:uppercase;">
        How to use these — 15 minutes total
      </p>
      <p style="margin:0;color:rgba(253,250,245,0.85);font-family:Arial,sans-serif;font-size:12px;line-height:1.7;">
        1. For each pitch, follow the "Where to find them" instructions to find 1 real creator<br/>
        2. Find their contact email (usually in Instagram bio or website contact page)<br/>
        3. Open Gmail → copy the subject line and body → personalize [NAME] → send<br/>
        4. Send 1-2 per day, not all 5 at once — staggering looks more natural<br/>
        5. If they say yes: reply with their custom referral link from the VIP Room dashboard
      </p>
    </div>
  </td></tr>

  ${pitchBlocks}

  <!-- Footer note -->
  <tr><td style="padding:20px 36px 0;">
    <div style="background:#F0E8D8;border:1px solid #DDD4C5;border-left:3px solid #C4956A;padding:14px 18px;">
      <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:12px;color:#2C2C2C;font-weight:600;">
        What to offer: 3 months free membership + a custom referral link
      </p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#4A4A4A;line-height:1.7;">
        A micro-blogger with 5,000 engaged followers who mentions you once can send 10-50 trial signups.
        At $19/mo, converting just 5 of those = $95/mo recurring — permanently — from one 15-minute task.
        The ROI on a free 3-month membership ($57) is enormous.
      </p>
    </div>
  </td></tr>

  <!-- Divider -->
  <tr><td style="padding:28px 36px 0;">
    <div style="height:1px;background:linear-gradient(90deg,transparent,#C9B99A,transparent);"></div>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:18px 36px 28px;text-align:center;">
    <p style="margin:0;font-size:10px;color:#B5A99A;font-family:Arial,sans-serif;line-height:1.7;">
      ${mailingAddress}<br/>
      Automated weekly outreach kit · The Style Refresh by Ellie
    </p>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;
}

/* ── Main handler ─────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const apiKey      = process.env.ANTHROPIC_API_KEY?.trim();
  const resendKey   = process.env.RESEND_API_KEY?.trim();
  const fromEmail   = process.env.RESEND_FROM_EMAIL ?? "ellie@stylebyellie.com";
  const notifyEmail = process.env.RESEND_NOTIFY_EMAIL?.trim();

  if (!apiKey)    return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 503 });
  if (!resendKey) return NextResponse.json({ error: "RESEND_API_KEY not set"    }, { status: 503 });
  if (!notifyEmail) return NextResponse.json({ error: "RESEND_NOTIFY_EMAIL not set" }, { status: 503 });

  const weekOf   = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const profiles = pickProfiles(5);

  console.log(`[outreach] Generating ${profiles.length} pitcher pitches for week of ${weekOf}`);

  /* Generate all 5 pitches in parallel */
  const pitchResults = await Promise.all(
    profiles.map(async (profile) => {
      try {
        const raw             = await generatePitch(profile, apiKey);
        const { subject, body } = parseEmail(raw);
        return { profile, subject, body, ok: true };
      } catch (err) {
        console.error(`[outreach] Failed to generate pitch for: "${profile.type}"`, err);
        return { profile, subject: "", body: "", ok: false };
      }
    })
  );

  const successful = pitchResults.filter(r => r.ok && r.body.length > 50);

  /* Save to Blob */
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put } = await import("@vercel/blob");
      const dateKey = new Date().toISOString().split("T")[0];
      await put(
        `outreach/blogger-pitches-${dateKey}.json`,
        JSON.stringify({ weekOf, generatedAt: new Date().toISOString(), pitches: successful }),
        { access: "public", contentType: "application/json", addRandomSuffix: false }
      );
      console.log(`[outreach] Saved ${successful.length} pitches to Blob`);
    } catch (err) {
      console.error("[outreach] Blob save failed (non-fatal):", err);
    }
  }

  /* Send digest email */
  if (successful.length > 0) {
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from:    `Ellie <${fromEmail}>`,
      to:      notifyEmail,
      subject: `📬 ${successful.length} blogger pitches ready to send — week of ${weekOf}`,
      html:    buildDigestEmail(successful, weekOf),
    });
    console.log(`[outreach] Digest sent to ${notifyEmail}`);
  }

  return NextResponse.json({
    ok:              true,
    weekOf,
    pitchesGenerated: successful.length,
    pitchesFailed:   pitchResults.length - successful.length,
  });
}
