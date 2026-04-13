/**
 * POST-LINKEDIN — The Style Refresh (Fashion)
 * =============================================
 * Cron: every Friday at 9 AM ET (13:00 UTC)
 * Posts a professional style/business fashion angle to LinkedIn company page.
 *
 * LinkedIn is B2B — angle the content toward professional dressing,
 * building a personal brand through style, and the business of curation.
 *
 * Setup:
 *   1. Create a LinkedIn Company Page for The Style Refresh
 *   2. Go to linkedin.com/developers → create an app → request r_organization_social + w_organization_social
 *   3. Generate an OAuth 2.0 access token with those scopes
 *
 * Required env vars:
 *   LINKEDIN_ACCESS_TOKEN    OAuth 2.0 access token
 *   LINKEDIN_COMPANY_URN     e.g. "urn:li:organization:12345678"
 *
 * Optional:
 *   BLOB_READ_WRITE_TOKEN  reads approved brief
 *   ANTHROPIC_API_KEY      generates platform copy
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime     = "nodejs";
export const maxDuration = 45;
export const dynamic     = "force-dynamic";

type LookItem = { piece: string; brand: string; price: string };
type Look     = { label: string; tagline: string; editorsNote: string; items: LookItem[] };
type Brief    = { weekOf: string; editorialLead: string; looks: Look[] };

const SITE        = "https://stylebyellie.com";
const LI_TOKEN    = process.env.LINKEDIN_ACCESS_TOKEN ?? "";
const COMPANY_URN = process.env.LINKEDIN_COMPANY_URN ?? "";

/* ── Post to LinkedIn ─────────────────────────────────────────────── */
async function linkedInPost(text: string): Promise<boolean> {
  try {
    const body = {
      author:     COMPANY_URN,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory: "NONE",
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    };
    const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${LI_TOKEN}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) { console.error("[linkedin] post failed", res.status, await res.text()); }
    return res.ok;
  } catch (e) { console.error("[linkedin] post error", e); return false; }
}

/* ── Load brief ───────────────────────────────────────────────────── */
async function loadBrief(): Promise<Brief | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "ellie-approved/" });
    const latest = blobs
      .filter(b => b.pathname.endsWith(".json"))
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0];
    if (!latest) return null;
    const r = await fetch(latest.url, { cache: "no-store" });
    const d = await r.json() as Brief;
    return d?.looks ? d : null;
  } catch { return null; }
}

/* ── Claude generates LinkedIn copy ──────────────────────────────── */
async function generatePost(brief: Brief): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    const look = brief.looks[0];
    return `The business of dressing well: "${look.tagline}"\n\n${look.editorsNote}\n\nEvery Monday we send three curated looks to members of The Style Refresh — a $19/month curation membership for professionals who want to dress well without spending hours researching it.\n\n→ ${SITE}\n\n#PersonalStyle #ProfessionalDevelopment #FashionIndustry #StyleCuration`;
  }

  const looksText = brief.looks.map(l => `"${l.tagline}": ${l.editorsNote.slice(0, 100)}`).join("\n");
  const prompt = `Write a LinkedIn post for The Style Refresh fashion curation company.

LinkedIn audience: professionals, entrepreneurs, people who care about personal branding.
Angle: the ROI of dressing well, efficiency of curation, the business angle of personal style.

This week's looks:
${looksText}
Mood: "${brief.editorialLead}"

Rules:
- Professional but warm tone. Not stuffy.
- Lead with an insight about why style matters in professional contexts OR the efficiency/curation angle
- Mention the membership naturally: "every Monday, The Style Refresh sends three fully sourced looks to members"
- End with: ${SITE}
- 3-4 short paragraphs. LinkedIn rewards conversational, scannable posts.
- 4-6 professional hashtags: #PersonalStyle #ProfessionalDevelopment etc
- 600 chars max before hashtags
- Return only the post text`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:  "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body:    JSON.stringify({
        model: "claude-haiku-4-5", max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const j = await res.json() as { content: Array<{ text: string }> };
    return (j.content[0]?.text ?? "").trim();
  } catch {
    return `Curation is a skill.\n\nThis week: "${brief.looks[0]?.tagline}"\n\n${SITE}\n\n#PersonalStyle #FashionCuration`;
  }
}

/* ── Rate limit ───────────────────────────────────────────────────── */
async function alreadyPosted(): Promise<boolean> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return false;
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "linkedin-fashion/last-post.json" });
    if (!blobs[0]) return false;
    const r = await fetch(blobs[0].url);
    if (!r.ok) return false;
    const { postedAt } = await r.json() as { postedAt: string };
    return (Date.now() - new Date(postedAt).getTime()) < 5 * 86_400_000;
  } catch { return false; }
}

async function markPosted() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;
  try {
    const { put } = await import("@vercel/blob");
    await put("linkedin-fashion/last-post.json",
      JSON.stringify({ postedAt: new Date().toISOString() }),
      { access: "public", contentType: "application/json", addRandomSuffix: false }
    );
  } catch { /* non-fatal */ }
}

/* ── Handler ──────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!LI_TOKEN || !COMPANY_URN) {
    return NextResponse.json({ skipped: true, reason: "LINKEDIN_ACCESS_TOKEN or LINKEDIN_COMPANY_URN not set" });
  }
  if (await alreadyPosted()) {
    return NextResponse.json({ skipped: true, reason: "Already posted this week" });
  }

  const brief = await loadBrief();
  if (!brief) return NextResponse.json({ skipped: true, reason: "No approved brief" });

  const text = await generatePost(brief);
  const ok   = await linkedInPost(text);
  if (ok) await markPosted();

  return NextResponse.json({ ok, weekOf: brief.weekOf, preview: text.slice(0, 80) });
}
