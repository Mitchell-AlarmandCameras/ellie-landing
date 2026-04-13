import { NextRequest, NextResponse } from "next/server";

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/director-content
   THE CONTENT DIRECTOR — Tier 2 manager, reports to CEO, leads Tier 3 content workers.

   Runs every Sunday at 1 PM ET (17:00 UTC) — AFTER CEO brief, BEFORE Trend Scout.

   Chain of command:
     CEO brief (12 PM) → Content Director (1 PM) → Trend Scout (2 PM) → Curator (6 PM)

   What it does:
     1. Reads the CEO's strategic brief from Blob (set 1 hour ago)
     2. Reads the last 2 approved briefs to understand what content was recently covered
     3. Reads the most recent trend brief (from last week) for continuity
     4. Asks Claude to synthesize a content directive:
        - Which look themes to emphasize vs rest
        - Brands that should appear more or less
        - Specific pieces to avoid (recently covered)
        - A one-sentence creative note for the Curator
     5. Saves the directive to ellie-directives/content.json — read by Trend Scout + Curator
     6. No owner email — this is internal management only
═══════════════════════════════════════════════════════════════════════════ */

export const runtime     = "nodejs";
export const maxDuration = 45;

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface ContentDirective {
  weekOf:           string;
  generatedAt:      string;
  ceoPriority:      string;
  emphasize:        string[];   /* themes/occasions to lean into this week */
  brandsToFeature:  string[];   /* brands underrepresented recently */
  brandsToRest:     string[];   /* brands shown recently — give them a break */
  avoidRepeat:      string[];   /* specific piece types just covered */
  curatorNote:      string;     /* one sentence creative direction for Curator */
  trendScoutNote:   string;     /* one sentence for Trend Scout to weight */
}

interface ApprovedBrief {
  weekOf?: string;
  looks?:  Array<{
    title?: string;
    items?: Array<{ piece: string; brand: string }>;
  }>;
}

interface CeoBrief {
  weekOf?:           string;
  strategicPriority?: string;
  contentDirective?:  string;
}

/* ─── Load CEO brief from Blob ──────────────────────────────────────────── */
async function loadCeoBrief(): Promise<CeoBrief> {
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "ellie-ceo/" });
    const file = blobs.find(b => b.pathname === "ellie-ceo/brief.json");
    if (!file) return {};
    const r = await fetch(file.url, { cache: "no-store" });
    if (!r.ok) return {};
    return await r.json() as CeoBrief;
  } catch {
    return {};
  }
}

/* ─── Load recent approved briefs from Blob ────────────────────────────── */
async function loadRecentBriefs(): Promise<ApprovedBrief[]> {
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "ellie-approved/" });
    /* Sort newest first, take last 2 weeks */
    const sorted = blobs
      .filter(b => b.pathname.endsWith(".json"))
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
      .slice(0, 2);

    const results: ApprovedBrief[] = [];
    for (const blob of sorted) {
      try {
        const r = await fetch(blob.url, { cache: "no-store" });
        if (r.ok) results.push(await r.json() as ApprovedBrief);
      } catch { /* skip */ }
    }
    return results;
  } catch {
    return [];
  }
}

/* ─── Extract recently used brands and pieces ───────────────────────────── */
function extractRecentContent(briefs: ApprovedBrief[]): {
  brands:    string[];
  pieces:    string[];
  lookTypes: string[];
} {
  const brands:    string[] = [];
  const pieces:    string[] = [];
  const lookTypes: string[] = [];

  for (const brief of briefs) {
    for (const look of brief.looks ?? []) {
      if (look.title) lookTypes.push(look.title);
      for (const item of look.items ?? []) {
        if (item.brand) brands.push(item.brand);
        if (item.piece) pieces.push(item.piece);
      }
    }
  }

  /* Deduplicate */
  return {
    brands:    [...new Set(brands)],
    pieces:    [...new Set(pieces)],
    lookTypes: [...new Set(lookTypes)],
  };
}

/* ─── Ask Claude for the content directive ──────────────────────────────── */
async function generateDirective(
  anthropicKey:  string,
  ceoBrief:      CeoBrief,
  recentBrands:  string[],
  recentPieces:  string[],
  recentLooks:   string[],
  weekOf:        string,
): Promise<ContentDirective | null> {
  const prompt = `You are the Content Director for "The Style Refresh by Ellie" — a women's style membership ($19/month). You manage the Trend Scout and the AI Curator.

Today is Sunday. You need to produce a content directive for this week's curation.

INFORMATION AVAILABLE:

CEO Strategic Priority this week:
"${ceoBrief.contentDirective ?? ceoBrief.strategicPriority ?? "No specific directive — follow standard quality standards."}"

Recently covered look types (last 2 weeks — avoid repeating):
${recentLooks.length ? recentLooks.join(", ") : "No data yet"}

Brands featured recently (last 2 weeks — consider resting some):
${recentBrands.length ? recentBrands.join(", ") : "No data yet"}

Piece types recently covered (avoid exact repeats):
${recentPieces.slice(0, 20).join(", ") || "No data yet"}

THE ELLIE BRAND: Accessible luxury women's styling. Core target: professional women 34-50 — too busy to scroll, income to spend without deliberating, done with fast fashion. Extended: 28-52. Tone: warm, expert, exclusive. Never mass-market, never youth-culture. Think Theory, Vince, Reformation, Tory Burch, Revolve, SSENSE.

Return ONLY a valid JSON object with exactly these fields — no markdown, no preamble:
{
  "weekOf": "${weekOf}",
  "generatedAt": "${new Date().toISOString()}",
  "ceoPriority": "one sentence summary of CEO's directive",
  "emphasize": ["3-4 specific themes, occasions, or moods to lean into this week"],
  "brandsToFeature": ["3-5 quality brands that haven't appeared recently and deserve a spot"],
  "brandsToRest": ["2-3 brands from the recent list that should sit out this week"],
  "avoidRepeat": ["3-5 specific piece types just covered that should not appear again"],
  "curatorNote": "One sentence creative brief for the Curator — specific, actionable, no clichés.",
  "trendScoutNote": "One sentence for the Trend Scout about what cultural/seasonal angle to emphasize."
}`;

  try {
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
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    return JSON.parse(jsonMatch[0]) as ContentDirective;
  } catch (err) {
    console.error("[director-content] Claude failed:", err);
    return null;
  }
}

/* ─── Handler ───────────────────────────────────────────────────────────── */
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

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ skipped: true, reason: "BLOB_READ_WRITE_TOKEN not configured" });
  }

  /* 1 — Gather inputs */
  const [ceoBrief, recentBriefs] = await Promise.all([
    loadCeoBrief(),
    loadRecentBriefs(),
  ]);

  const { brands, pieces, lookTypes } = extractRecentContent(recentBriefs);

  /* 2 — Calculate week label */
  const monday = new Date();
  const day    = monday.getDay();
  const diff   = day === 0 ? 1 : 8 - day;
  monday.setDate(monday.getDate() + diff);
  const weekOf = monday.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  /* 3 — Generate directive */
  const directive = await generateDirective(
    anthropicKey,
    ceoBrief,
    brands,
    pieces,
    lookTypes,
    weekOf,
  );

  if (!directive) {
    return NextResponse.json({ error: "Directive generation failed" }, { status: 500 });
  }

  /* 4 — Save to Blob */
  try {
    const { put } = await import("@vercel/blob");
    await put("ellie-directives/content.json", JSON.stringify(directive), {
      access:          "public",
      contentType:     "application/json",
      addRandomSuffix: false,
    });
    console.log("[director-content] Directive saved to Blob");
  } catch (blobErr) {
    console.error("[director-content] Blob save failed:", blobErr);
  }

  console.log(`[director-content] Done — week of ${weekOf} · note: "${directive.curatorNote}"`);

  return NextResponse.json({
    ok:              true,
    weekOf:          directive.weekOf,
    emphasize:       directive.emphasize,
    brandsToFeature: directive.brandsToFeature,
    brandsToRest:    directive.brandsToRest,
    curatorNote:     directive.curatorNote,
  });
}
