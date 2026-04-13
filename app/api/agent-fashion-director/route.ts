import { NextResponse } from "next/server";
import { Resend } from "resend";
import { currentWeek, type Look, type LookItem } from "@/data/lookbook";

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/agent-fashion-director
   THE FASHION DIRECTOR — Ellie's in-house editorial color expert.

   Channels the eye of:
     • Phoebe Philo (Celine 2008-18)  — tonal mastery, no wasted piece
     • Nicolas Ghesquière (LV)        — structural logic, clean palette
     • The Row aesthetic              — quiet luxury, one color story per look

   Runs every Sunday at 7 PM ET (23:00 UTC) — 1 hour before the Curator.

   What it does:
     1. Reads every look in the current week's lookbook
     2. Applies color theory rules (warm/cool conflict, accent discipline,
        shoe/bag palette rules, jewelry-metal alignment)
     3. Scores each look 1–10 for editorial coherence
     4. Emails the owner a flagged audit with specific fix suggestions
        before Monday's brief goes out
═══════════════════════════════════════════════════════════════════════════ */

export const runtime     = "nodejs";
export const maxDuration = 30;

/* ─── Color vocabulary ──────────────────────────────────────────────────── */

const WARM_NEUTRALS = new Set([
  "ivory","cream","ecru","sand","camel","cognac","tan","champagne","nude",
  "blush","flax","natural","straw","bone","khaki","wheat","linen","oat",
  "shell","parchment","off-white","warm white","canvas","almond",
]);

const COOL_NEUTRALS = new Set([
  "black","white","bright white","navy","charcoal","grey","gray","slate",
  "stone","cool gray","steel","midnight",
]);

const COOL_COLORS = new Set([
  "blue","denim","indigo","cobalt","periwinkle","mint","lavender","teal",
  "powder blue","ice blue","cornflower",
]);

const WARM_COLORS = new Set([
  "red","orange","terracotta","rust","burgundy","wine","coral","peach",
  "pink","blush pink","salmon","mustard","gold","amber","copper",
]);

const METALS_WARM = new Set(["gold","yellow gold","rose gold","cognac hardware","gold vermeil"]);
const METALS_COOL = new Set(["silver","rhodium","platinum","gunmetal","oxidized silver"]);

/* ─── Color extraction ──────────────────────────────────────────────────── */

type ColorFamily = "warm-neutral" | "cool-neutral" | "warm-color" | "cool-color" | "unknown";

function classifyColor(text: string): ColorFamily {
  const t = text.toLowerCase();
  for (const w of WARM_NEUTRALS) if (t.includes(w)) return "warm-neutral";
  for (const c of COOL_NEUTRALS) if (t.includes(c)) return "cool-neutral";
  for (const w of WARM_COLORS)   if (t.includes(w)) return "warm-color";
  for (const c of COOL_COLORS)   if (t.includes(c)) return "cool-color";
  return "unknown";
}

function extractItemColor(item: LookItem): string {
  /* Pull color from piece name first, then note */
  const combined = `${item.piece} ${item.note}`.toLowerCase();
  const colorHints = [
    "ivory","cream","ecru","sand","camel","cognac","tan","champagne","nude",
    "blush","black","white","navy","denim","indigo","gold","silver","natural",
    "straw","terracotta","rust","burgundy","coral","pink","flax","bone","shell",
    "slate","charcoal","gray","grey","linen","oat","khaki","rose","copper",
  ];
  for (const c of colorHints) {
    if (combined.includes(c)) return c;
  }
  return "unknown";
}

/* ─── Scoring rules ─────────────────────────────────────────────────────── */

interface ColorIssue {
  severity: "error" | "warning";
  rule:     string;
  detail:   string;
  fix:      string;
}

interface LookAudit {
  label:       string;
  score:       number;         // 1–10
  grade:       string;         // Editorial grade
  colorStory:  string;
  issues:      ColorIssue[];
  verdict:     string;
}

function auditLook(look: Look): LookAudit {
  const issues: ColorIssue[] = [];
  const colorMap = look.items.map(item => ({
    item,
    color:  extractItemColor(item),
    family: classifyColor(`${item.piece} ${item.note}`),
  }));

  /* Count families */
  const warmNeutralCount = colorMap.filter(c => c.family === "warm-neutral").length;
  const coolNeutralCount = colorMap.filter(c => c.family === "cool-neutral").length;
  const warmColorCount   = colorMap.filter(c => c.family === "warm-color").length;
  const coolColorCount   = colorMap.filter(c => c.family === "cool-color").length;

  /* Rule 1: Warm/cool neutral conflict */
  if (warmNeutralCount >= 2 && coolNeutralCount >= 2) {
    issues.push({
      severity: "error",
      rule:     "WARM_COOL_CONFLICT",
      detail:   `${warmNeutralCount} warm neutrals vs ${coolNeutralCount} cool neutrals — no dominant palette story.`,
      fix:      "Commit to one neutral family. Swap cool pieces to warm, or redesign around a single cool story.",
    });
  }

  /* Rule 2: Too many accent colors */
  const accentCount = warmColorCount + coolColorCount;
  if (accentCount > 1) {
    issues.push({
      severity: "error",
      rule:     "TOO_MANY_ACCENTS",
      detail:   `${accentCount} accent colors in one look creates visual noise.`,
      fix:      "One accent maximum. Remove or neutralize the secondary accent piece.",
    });
  }

  /* Rule 3: Shoe palette check */
  const shoeItem = colorMap.find(c =>
    c.item.piece.toLowerCase().includes("shoe") ||
    c.item.piece.toLowerCase().includes("pump") ||
    c.item.piece.toLowerCase().includes("sneaker") ||
    c.item.piece.toLowerCase().includes("sandal") ||
    c.item.piece.toLowerCase().includes("mule") ||
    c.item.piece.toLowerCase().includes("loafer")
  );
  if (shoeItem && shoeItem.family === "cool-neutral" && warmNeutralCount >= 2) {
    issues.push({
      severity: "warning",
      rule:     "SHOE_COLD_BREAK",
      detail:   `Shoe color "${shoeItem.color}" interrupts an otherwise warm look with a cold note.`,
      fix:      "Switch to a nude, sand, or camel shoe that stays in the warm story.",
    });
  }
  if (shoeItem && shoeItem.family === "warm-neutral" && coolNeutralCount >= 2) {
    issues.push({
      severity: "warning",
      rule:     "SHOE_WARM_BREAK",
      detail:   `Shoe color "${shoeItem.color}" introduces warmth into an otherwise cool look.`,
      fix:      "Switch to a white, grey, or black shoe that matches the cool palette.",
    });
  }

  /* Rule 4: Bag palette check */
  const bagItem = colorMap.find(c =>
    c.item.piece.toLowerCase().includes("bag") ||
    c.item.piece.toLowerCase().includes("tote") ||
    c.item.piece.toLowerCase().includes("crossbody") ||
    c.item.piece.toLowerCase().includes("clutch")
  );
  if (bagItem && bagItem.family === "cool-neutral" && warmNeutralCount >= 3) {
    issues.push({
      severity: "error",
      rule:     "BAG_PALETTE_BREAK",
      detail:   `Bag color "${bagItem.color}" introduces a cold accent into a warm look — breaks the palette story.`,
      fix:      "Use a natural, tan, cognac, or straw bag. Save black bags for cool or monochromatic looks.",
    });
  }

  /* Rule 5: Jewelry metal alignment */
  const jewelryItem = colorMap.find(c =>
    c.item.piece.toLowerCase().includes("necklace") ||
    c.item.piece.toLowerCase().includes("earring") ||
    c.item.piece.toLowerCase().includes("bracelet") ||
    c.item.piece.toLowerCase().includes("ring") ||
    c.item.piece.toLowerCase().includes("hoop")
  );
  if (jewelryItem) {
    const jewelryText = `${jewelryItem.item.piece} ${jewelryItem.item.note}`.toLowerCase();
    const hasCoolMetal = [...METALS_COOL].some(m => jewelryText.includes(m));
    const hasWarmMetal = [...METALS_WARM].some(m => jewelryText.includes(m));
    if (hasCoolMetal && warmNeutralCount >= 3) {
      issues.push({
        severity: "warning",
        rule:     "METAL_MISMATCH",
        detail:   "Silver or cool metal jewelry in a warm-palette look can feel disconnected.",
        fix:      "Swap to gold, gold vermeil, or yellow gold hardware to warm up.",
      });
    }
    if (hasWarmMetal && coolNeutralCount >= 3 && warmNeutralCount === 0) {
      issues.push({
        severity: "warning",
        rule:     "METAL_MISMATCH",
        detail:   "Gold jewelry in an all-cool or monochromatic look can disrupt the palette.",
        fix:      "Consider silver or keeping jewelry minimal for a cleaner editorial result.",
      });
    }
  }

  /* ─── Score ───────────────────────────────────────────────────────────── */
  const errorCount   = issues.filter(i => i.severity === "error").length;
  const warningCount = issues.filter(i => i.severity === "warning").length;
  let score = 10 - (errorCount * 2) - (warningCount * 1);
  score = Math.max(1, Math.min(10, score));

  const grade =
    score >= 9 ? "Editorial Ready ✦" :
    score >= 7 ? "Strong — Minor Polish" :
    score >= 5 ? "Needs Revision" :
                 "Pull & Rebuild";

  /* Color story summary */
  const dominantFamily =
    warmNeutralCount > coolNeutralCount ? "warm neutrals"  :
    coolNeutralCount > warmNeutralCount ? "cool neutrals"  :
    coolColorCount   > 0                ? "cool + neutral" :
                                          "mixed";

  const colorStory = issues.length === 0
    ? `Clean tonal story in ${dominantFamily}. Cohesive from blazer to shoe.`
    : `${dominantFamily} base with ${issues.length} palette conflict${issues.length > 1 ? "s" : ""}.`;

  const verdict = issues.length === 0
    ? "This look is ready to publish. The color story is deliberate and editorial."
    : issues.some(i => i.severity === "error")
      ? "This look needs revision before publishing. Color conflicts will undermine the editorial standard."
      : "This look is publishable with minor styling adjustments noted above.";

  return { label: look.label, score, grade, colorStory, issues, verdict };
}

/* ─── Email builder ─────────────────────────────────────────────────────── */

function buildAuditEmail(audits: LookAudit[]): string {
  const siteUrl  = process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com";
  const allClean = audits.every(a => a.issues.length === 0);

  const lookRows = audits.map(a => {
    const issueHtml = a.issues.length === 0
      ? `<p style="color:#2D6A4F;margin:8px 0 0;">✓ No issues found. Color story is clean.</p>`
      : a.issues.map(i => `
          <div style="border-left:3px solid ${i.severity === "error" ? "#C0392B" : "#E67E22"};
                      padding:8px 12px;margin:8px 0;background:#fafafa;border-radius:0 4px 4px 0;">
            <strong style="color:${i.severity === "error" ? "#C0392B" : "#E67E22"};
                           font-size:10px;letter-spacing:0.12em;text-transform:uppercase;">
              ${i.severity === "error" ? "⚠ COLOR ERROR" : "△ WARNING"} — ${i.rule}
            </strong>
            <p style="margin:4px 0 0;font-size:13px;color:#333;">${i.detail}</p>
            <p style="margin:4px 0 0;font-size:12px;color:#666;font-style:italic;">Fix: ${i.fix}</p>
          </div>`).join("");

    const scoreColor = a.score >= 9 ? "#2D6A4F" : a.score >= 7 ? "#D4A017" : "#C0392B";

    return `
      <div style="margin:20px 0;padding:20px;border:1px solid #E8DDD0;border-radius:8px;background:#fff;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <div>
            <span style="font-size:10px;color:#9A7B5A;letter-spacing:0.18em;text-transform:uppercase;
                         font-weight:600;">LOOK ${a.label}</span>
            <h3 style="margin:4px 0 0;font-size:16px;color:#2C1A0E;font-family:Georgia,serif;">
              ${a.grade}
            </h3>
          </div>
          <div style="text-align:center;">
            <div style="font-size:28px;font-weight:700;color:${scoreColor};
                        font-family:Georgia,serif;line-height:1;">${a.score}</div>
            <div style="font-size:9px;color:#999;letter-spacing:0.1em;text-transform:uppercase;">/10</div>
          </div>
        </div>
        <p style="font-size:12px;color:#7A5C3A;margin:0 0 12px;font-style:italic;">${a.colorStory}</p>
        ${issueHtml}
        <p style="margin:12px 0 0;font-size:12px;color:#555;border-top:1px solid #f0e8e0;
                  padding-top:10px;">${a.verdict}</p>
      </div>`;
  }).join("");

  const headerBg  = allClean ? "#2D6A4F" : "#8B3A22";
  const headerMsg = allClean
    ? "All looks cleared. The lookbook is ready to publish."
    : "Palette conflicts detected. Review before Monday's send.";

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F5EFE4;font-family:Georgia,serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">

  <div style="text-align:center;margin-bottom:32px;">
    <p style="margin:0;font-size:9px;letter-spacing:0.25em;text-transform:uppercase;
               color:#9A7B5A;font-family:Arial,sans-serif;">Style by Ellie</p>
    <h1 style="margin:8px 0 4px;font-size:26px;color:#2C1A0E;font-weight:400;">
      Fashion Director Report
    </h1>
    <p style="margin:0;font-size:12px;color:#7A5C3A;">
      ${new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}
    </p>
  </div>

  <div style="background:${headerBg};color:#fff;padding:16px 20px;border-radius:8px;
               margin-bottom:24px;text-align:center;">
    <p style="margin:0;font-size:13px;letter-spacing:0.05em;">${headerMsg}</p>
  </div>

  <div style="background:#FDF8F2;border:1px solid #E8DDD0;border-radius:4px;
               padding:14px 18px;margin-bottom:28px;">
    <p style="margin:0;font-size:11px;color:#7A5C3A;line-height:1.6;">
      <strong>Methodology:</strong> Each look is evaluated against the Ellie color standard —
      tonal discipline (warm vs cool conflict), accent count (max 1), shoe and bag palette
      alignment, and jewelry metal match. Inspired by the editorial eye of Phoebe Philo,
      Nicolas Ghesquière, and The Row's quiet luxury standard.
    </p>
  </div>

  ${lookRows}

  <div style="margin-top:32px;text-align:center;">
    <a href="${siteUrl}/api/run-curator"
       style="display:inline-block;background:#3D2B1F;color:#fff;padding:12px 28px;
              border-radius:4px;text-decoration:none;font-size:11px;
              letter-spacing:0.18em;text-transform:uppercase;">
      View Lookbook →
    </a>
  </div>

  <p style="margin:40px 0 0;text-align:center;font-size:10px;color:#C4A882;
             letter-spacing:0.15em;text-transform:uppercase;">
    Style by Ellie · Fashion Director Agent
  </p>

</div>
</body></html>`;
}

/* ─── Main handler ──────────────────────────────────────────────────────── */

export async function GET() {
  const resend  = new Resend(process.env.RESEND_API_KEY);
  const ownerEmail = process.env.OWNER_EMAIL ?? "owner@stylebyellie.com";

  try {
    /* Audit every look in the current week */
    const audits: LookAudit[] = currentWeek.looks.map(auditLook);

    const errorCount   = audits.reduce((n, a) => n + a.issues.filter(i => i.severity === "error").length, 0);
    const warningCount = audits.reduce((n, a) => n + a.issues.filter(i => i.severity === "warning").length, 0);
    const avgScore     = Math.round(audits.reduce((s, a) => s + a.score, 0) / audits.length * 10) / 10;

    const subject = errorCount > 0
      ? `⚠ Fashion Director: ${errorCount} color conflict${errorCount > 1 ? "s" : ""} in this week's lookbook`
      : warningCount > 0
        ? `△ Fashion Director: ${warningCount} style note${warningCount > 1 ? "s" : ""} — avg score ${avgScore}/10`
        : `✓ Fashion Director: Lookbook cleared — avg score ${avgScore}/10`;

    const html = buildAuditEmail(audits);

    await resend.emails.send({
      from:    "Style by Ellie <ellie@stylebyellie.com>",
      to:      ownerEmail,
      subject,
      html,
    });

    return NextResponse.json({
      ok:           true,
      weekOf:       currentWeek.weekOf,
      looksAudited: audits.length,
      avgScore,
      errors:       errorCount,
      warnings:     warningCount,
      audits:       audits.map(a => ({
        label:  a.label,
        score:  a.score,
        grade:  a.grade,
        issues: a.issues.length,
      })),
    });

  } catch (err) {
    console.error("[agent-fashion-director]", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
