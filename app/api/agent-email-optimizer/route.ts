import { NextResponse } from "next/server";
import { Resend } from "resend";
import { currentWeek } from "@/data/lookbook";

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/agent-email-optimizer
   THE EMAIL PERFORMANCE DIRECTOR — Ellie's email marketing strategist.

   Equivalent role at: Vogue (Email Director), Net-a-Porter (CRM Director),
   Allure (Newsletter Strategist). Major brands A/B test every single
   subject line before sending to their full list. 

   Runs every Monday at 6:30 AM ET (10:30 UTC) — after send-weekly goes out.

   What it does:
     1. Reads the current week's lookbook for editorial context
     2. Uses Claude to generate 5 subject line variants for the NEXT week's email
        — each using a different proven copywriting frame
     3. Analyzes the psychological trigger each variant uses
     4. Emails owner a subject line card: pick one for next Monday's send
     5. Over time, the owner can identify which frames work best for the audience
═══════════════════════════════════════════════════════════════════════════ */

export const runtime     = "nodejs";
export const maxDuration = 30;

interface SubjectVariant {
  line:      string;
  frame:     string;
  trigger:   string;
  predicted: string;
}

async function generateSubjects(
  editorialLead: string,
  lookLabels: string[],
  anthropicKey: string,
): Promise<SubjectVariant[]> {
  const prompt = `You are Ellie's email marketing director. The weekly fashion brief is live.

This week's editorial lead: "${editorialLead}"
This week's looks: ${lookLabels.join(", ")}

Write 5 subject line variants for next Monday's email to paying members. Each must use a DIFFERENT psychological frame. The list: mystery, exclusivity, utility, urgency, social proof.

Rules:
- Max 52 characters each (mobile preview limit)
- NO emoji unless it's genuinely editorial
- NO "chic", "stunning", "amazing" 
- Sound like they came from a real editor, not a marketing tool
- Ellie's audience: professional women 34–50 who want curation, not hype

Return ONLY a JSON array:
[
  { "line": "<subject line>", "frame": "mystery", "trigger": "<what psychological need this hits>", "predicted": "<why this frame works for this audience>" },
  { "line": "<subject line>", "frame": "exclusivity", "trigger": "...", "predicted": "..." },
  { "line": "<subject line>", "frame": "utility", "trigger": "...", "predicted": "..." },
  { "line": "<subject line>", "frame": "urgency", "trigger": "...", "predicted": "..." },
  { "line": "<subject line>", "frame": "social proof", "trigger": "...", "predicted": "..." }
]`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:  "POST",
    headers: {
      "x-api-key":         anthropicKey,
      "anthropic-version": "2023-06-01",
      "content-type":      "application/json",
    },
    body: JSON.stringify({
      model:      "claude-haiku-4-5",
      max_tokens: 700,
      messages:   [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = await res.json() as { content: Array<{ text: string }> };
  const raw  = data.content[0]?.text?.trim() ?? "[]";
  const json = raw.match(/\[[\s\S]*\]/)?.[0] ?? "[]";
  return JSON.parse(json) as SubjectVariant[];
}

function buildOptimizerEmail(variants: SubjectVariant[], weekOf: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com";

  const frameColors: Record<string, string> = {
    mystery:      "#7B5EA7",
    exclusivity:  "#C4956A",
    utility:      "#2D6A4F",
    urgency:      "#C0392B",
    "social proof": "#2980B9",
  };

  const cards = variants.map((v, i) => {
    const color = frameColors[v.frame] ?? "#555";
    return `
    <div style="margin:12px 0;padding:16px 20px;background:#fff;border-radius:8px;border:1px solid #E8DDD0;border-left:4px solid ${color};">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-size:10px;color:${color};letter-spacing:0.12em;text-transform:uppercase;font-weight:600;">${i + 1}. ${v.frame}</span>
      </div>
      <p style="margin:0 0 8px;font-size:16px;color:#2C1A0E;font-family:Georgia,serif;font-weight:400;">"${v.line}"</p>
      <p style="margin:0 0 4px;font-size:11px;color:#777;"><strong>Trigger:</strong> ${v.trigger}</p>
      <p style="margin:0;font-size:11px;color:#777;"><strong>Why it works:</strong> ${v.predicted}</p>
    </div>`;
  }).join("");

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F5EFE4;font-family:Georgia,serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">

  <p style="margin:0;font-size:9px;letter-spacing:0.25em;text-transform:uppercase;color:#9A7B5A;font-family:Arial,sans-serif;">Style by Ellie · Email Director</p>
  <h1 style="margin:8px 0 4px;font-size:22px;color:#2C1A0E;font-weight:400;">Next Week's Subject Lines</h1>
  <p style="margin:0 0 8px;font-size:12px;color:#7A5C3A;">For the brief going out the week of ${weekOf}</p>
  <p style="margin:0 0 28px;font-size:11px;color:#999;">Pick one for next Monday's send. Each uses a different proven frame. Track which frame your audience responds to best over time.</p>

  ${cards}

  <div style="margin:24px 0;padding:16px 20px;background:#FEF9F0;border-radius:8px;border:1px solid #C4956A;">
    <p style="margin:0;font-size:12px;color:#7A5C3A;line-height:1.6;">
      <strong>Pro tip:</strong> Send to 20% of your list with variant 1, 20% with variant 2, then send the winner to the remaining 60%. Most email platforms (Resend, Mailchimp, Klaviyo) support this natively. Even a 5% lift in open rate = significantly more VIP room visits = better retention.
    </p>
  </div>

  <a href="${siteUrl}/api/send-weekly"
     style="display:inline-block;background:#3D2B1F;color:#fff;padding:12px 28px;border-radius:4px;
            text-decoration:none;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;margin-top:8px;">
    View Weekly Brief →
  </a>

  <p style="margin:36px 0 0;font-size:10px;color:#C4A882;letter-spacing:0.15em;text-transform:uppercase;">Style by Ellie · Email Performance Director</p>
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
    const lookLabels = currentWeek.looks.map(l => l.label);
    const variants   = await generateSubjects(currentWeek.editorialLead, lookLabels, anthropicKey);

    const nextWeekOf = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toLocaleDateString("en-US", { month: "long", day: "numeric" });

    await resend.emails.send({
      from:    "Style by Ellie <ellie@stylebyellie.com>",
      to:      ownerEmail,
      subject: `5 subject line options for next Monday's send`,
      html:    buildOptimizerEmail(variants, nextWeekOf),
    });

    return NextResponse.json({ ok: true, variantsGenerated: variants.length, weekOf: nextWeekOf });

  } catch (err) {
    console.error("[agent-email-optimizer]", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
