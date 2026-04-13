import { NextResponse } from "next/server";
import { Resend } from "resend";
import { currentWeek } from "@/data/lookbook";

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/director-editorial
   THE EDITORIAL DIRECTOR — Ellie's Editor-in-Chief equivalent.

   Equivalent role at: Vogue (Anna Wintour), Net-a-Porter (Editorial Director),
   Harper's Bazaar (Glenda Bailey). Every major fashion publication has someone
   whose sole job is to make sure the voice is right before anything goes out.

   Runs every Monday at 6 AM ET (10:00 UTC) — 1 hour before weekly send.

   What it does:
     1. Reads every look in the current week's approved lookbook
     2. Asks Claude to evaluate editorial copy quality against Ellie's brand
        voice standard (anti-generic, anti-filler, specific, authoritative)
     3. Scores each look's editorial writing 1–10
     4. Flags weak copy and suggests sharper rewrites
     5. Emails owner: "READY" (avg ≥7) or "HOLD — revise these before sending"
═══════════════════════════════════════════════════════════════════════════ */

export const runtime     = "nodejs";
export const maxDuration = 45;

const BRAND_VOICE = `Ellie's editorial voice: sharp, specific, never generic. Like a best friend who happens to be a Net-a-Porter buyer — she says "the ivory blazer over sand trouser is the power move that reads like The Row at half the price" not "this stylish blazer is perfect for any occasion." 

Rules:
- NO empty praise: "stunning", "chic", "beautiful", "gorgeous", "lovely", "perfect" = red flags
- NO vague utility: "great for any occasion", "versatile", "timeless" without specifics = red flags  
- YES specific styling intent: tell the reader exactly when, why, and how
- YES honest editorial takes: "the bias-cut does everything — no styling required" > "this dress is flattering"
- YES specific product intel: materials, details, why THIS brand/piece specifically
- Brand customers: professional women 34–50, income to buy without deliberating, done with fast fashion`;

interface EditorialScore {
  label:     string;
  score:     number;
  issues:    string[];
  rewrites:  { original: string; suggested: string }[];
  verdict:   string;
}

async function scoreLook(
  look: { label: string; tagline: string; description: string; editorsNote: string },
  anthropicKey: string,
): Promise<EditorialScore> {
  const prompt = `${BRAND_VOICE}

Evaluate this fashion editorial copy for the look labeled "${look.label}":

TAGLINE: "${look.tagline}"
DESCRIPTION: "${look.description}"
EDITOR'S NOTE: "${look.editorsNote}"

Score the editorial quality 1–10 where 10 = ready to publish exactly as-is, 1 = generic AI filler that would embarrass a real fashion editor.

Return ONLY a JSON object:
{
  "score": <number 1-10>,
  "issues": [<list of specific problems — max 4, be blunt>],
  "rewrites": [
    { "original": "<the weak phrase>", "suggested": "<sharper rewrite>" }
  ],
  "verdict": "<one sentence — READY or REVISE, with brief reason>"
}`;

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
  const data = await res.json() as { content: Array<{ text: string }> };
  const raw  = data.content[0]?.text?.trim() ?? "{}";
  const json = raw.match(/\{[\s\S]*\}/)?.[0] ?? "{}";
  const parsed = JSON.parse(json) as Partial<EditorialScore>;

  return {
    label:    look.label,
    score:    parsed.score    ?? 5,
    issues:   parsed.issues   ?? [],
    rewrites: parsed.rewrites ?? [],
    verdict:  parsed.verdict  ?? "Unknown",
  };
}

function buildEmail(scores: EditorialScore[], weekOf: string): string {
  const siteUrl  = process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com";
  const avgScore = Math.round(scores.reduce((s, r) => s + r.score, 0) / scores.length * 10) / 10;
  const allReady = scores.every(s => s.score >= 7);

  const lookCards = scores.map(s => {
    const scoreColor = s.score >= 8 ? "#2D6A4F" : s.score >= 6 ? "#D4A017" : "#C0392B";
    const issueHtml = s.issues.map(i =>
      `<p style="margin:3px 0;font-size:12px;color:#555;">· ${i}</p>`).join("");
    const rewriteHtml = s.rewrites.map(r => `
      <div style="margin:8px 0;padding:8px 12px;background:#FEF9F0;border-left:3px solid #C4956A;border-radius:0 4px 4px 0;">
        <p style="margin:0;font-size:11px;color:#999;text-decoration:line-through;">${r.original}</p>
        <p style="margin:4px 0 0;font-size:12px;color:#3D2B1F;font-style:italic;">→ ${r.suggested}</p>
      </div>`).join("");

    return `
    <div style="margin:20px 0;padding:20px;border:1px solid #E8DDD0;border-radius:8px;background:#fff;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
        <strong style="font-size:14px;color:#2C1A0E;font-family:Georgia,serif;">${s.label}</strong>
        <div style="text-align:center;">
          <div style="font-size:24px;font-weight:700;color:${scoreColor};font-family:Georgia,serif;line-height:1;">${s.score}</div>
          <div style="font-size:9px;color:#999;text-transform:uppercase;">/10</div>
        </div>
      </div>
      ${s.issues.length ? `<p style="margin:0 0 6px;font-size:10px;color:#C0392B;letter-spacing:0.1em;text-transform:uppercase;">Issues</p>${issueHtml}` : `<p style="color:#2D6A4F;font-size:12px;margin:0;">✓ Copy is sharp and on-brand.</p>`}
      ${s.rewrites.length ? `<p style="margin:12px 0 4px;font-size:10px;color:#C4956A;letter-spacing:0.1em;text-transform:uppercase;">Suggested Rewrites</p>${rewriteHtml}` : ""}
      <p style="margin:12px 0 0;font-size:11px;color:#777;border-top:1px solid #f0e8e0;padding-top:8px;">${s.verdict}</p>
    </div>`;
  }).join("");

  const headerBg  = allReady ? "#2D6A4F" : "#8B3A22";
  const headerMsg = allReady
    ? `Brief cleared. Editorial quality avg ${avgScore}/10 — ready to send.`
    : `Editorial flag: avg ${avgScore}/10. Review marked sections before Monday send.`;

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F5EFE4;font-family:Georgia,serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">

  <div style="text-align:center;margin-bottom:28px;">
    <p style="margin:0;font-size:9px;letter-spacing:0.25em;text-transform:uppercase;color:#9A7B5A;font-family:Arial,sans-serif;">Style by Ellie</p>
    <h1 style="margin:8px 0 4px;font-size:24px;color:#2C1A0E;font-weight:400;">Editorial Director Report</h1>
    <p style="margin:0;font-size:12px;color:#7A5C3A;">Week of ${weekOf}</p>
  </div>

  <div style="background:${headerBg};color:#fff;padding:14px 20px;border-radius:6px;margin-bottom:20px;text-align:center;">
    <p style="margin:0;font-size:13px;">${headerMsg}</p>
  </div>

  <div style="background:#FDF8F2;border:1px solid #E8DDD0;border-radius:4px;padding:12px 16px;margin-bottom:24px;">
    <p style="margin:0;font-size:11px;color:#7A5C3A;line-height:1.6;">
      <strong>Standard:</strong> Copy is scored against the Ellie brand voice —
      specificity over vagueness, editorial takes over empty praise, honest product intel
      over marketing fluff. Equivalent to Net-a-Porter's editorial review before publish.
    </p>
  </div>

  ${lookCards}

  <div style="margin-top:28px;text-align:center;">
    <a href="${siteUrl}/api/run-curator" style="display:inline-block;background:#3D2B1F;color:#fff;
       padding:12px 28px;border-radius:4px;text-decoration:none;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;">
      View Lookbook →
    </a>
  </div>

  <p style="margin:36px 0 0;text-align:center;font-size:10px;color:#C4A882;letter-spacing:0.15em;text-transform:uppercase;">
    Style by Ellie · Editorial Director
  </p>
</div>
</body></html>`;
}

export async function GET() {
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? "";
  const resend       = new Resend(process.env.RESEND_API_KEY);
  const ownerEmail   = process.env.OWNER_EMAIL ?? "owner@stylebyellie.com";

  if (!anthropicKey) {
    return NextResponse.json({ ok: false, error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
  }

  try {
    const scores = await Promise.all(
      currentWeek.looks.map(look =>
        scoreLook({
          label:       look.label,
          tagline:     look.tagline,
          description: look.description,
          editorsNote: look.editorsNote,
        }, anthropicKey)
      )
    );

    const avgScore  = Math.round(scores.reduce((s, r) => s + r.score, 0) / scores.length * 10) / 10;
    const allReady  = scores.every(s => s.score >= 7);
    const subject   = allReady
      ? `✓ Editorial Director: Brief cleared — avg ${avgScore}/10 — ready to send`
      : `⚠ Editorial Director: ${scores.filter(s => s.score < 7).length} look(s) need copy revision`;

    await resend.emails.send({
      from:    "Style by Ellie <ellie@stylebyellie.com>",
      to:      ownerEmail,
      subject,
      html:    buildEmail(scores, currentWeek.weekOf),
    });

    return NextResponse.json({
      ok:    true,
      weekOf: currentWeek.weekOf,
      avgScore,
      allReady,
      scores: scores.map(s => ({ label: s.label, score: s.score, issues: s.issues.length })),
    });

  } catch (err) {
    console.error("[director-editorial]", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
