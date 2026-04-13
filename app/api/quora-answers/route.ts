import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/quora-answers
   Vercel Cron fires this every Thursday at 10 AM ET (14:00 UTC).

   What it does:
   1. Picks 5 high-traffic fashion questions from a rotating bank of 40+
   2. Loads the current approved brief from Blob (for this-week context)
   3. Asks Claude to write a genuine, helpful 200-250 word Quora answer
      for each question — formatted exactly as a real Quora answer
   4. Emails all 5 answers to the owner in a copy-paste-ready digest
   5. Saves to Blob at outreach/quora-[YYYY-MM-DD].json

   Why Quora:
   - Quora answers rank on Google's first page for fashion questions
   - 300M monthly visitors — huge passive discovery channel
   - Answers age well — a great answer drives traffic for years
   - Owner just logs in and pastes 1-2 per day (5 minutes total)
   - No follower count required — anyone can answer

   Key content rule: 90% genuine advice, 10% natural mention of the site.
   Never mention price or "subscribe". Mention the site as something
   you personally use, in passing. Let the value sell itself.
═══════════════════════════════════════════════════════════════════════════ */

export const runtime     = "nodejs";
export const dynamic     = "force-dynamic";
export const maxDuration = 55;

const SITE_URL  = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com").replace(/\/$/, "");
const SITE_NAME = "The Style Refresh";

/* ── Question bank — 40 real questions women search on Quora & Google ── */
const QUESTION_BANK = [
  // Capsule wardrobe
  "How do I build a capsule wardrobe on a budget?",
  "What is a capsule wardrobe and how do I start one?",
  "How many pieces should be in a capsule wardrobe?",
  "What are the essentials for a minimalist wardrobe?",
  "How do I create a functional wardrobe with fewer clothes?",

  // Personal style / fashion discovery
  "How do I find my personal style as a woman?",
  "How do I stay up to date with fashion trends without spending hours online?",
  "What is the best way to discover new fashion looks each week?",
  "How do I dress better without spending a lot of money?",
  "How do I know what's trending in women's fashion right now?",

  // Work / professional dressing
  "What should professional women wear to work in 2026?",
  "How do I dress for the office without looking boring?",
  "What are the best smart-casual outfits for women?",
  "How do I put together a polished work wardrobe?",
  "What are the must-have pieces for a women's work wardrobe?",

  // Shopping smarter
  "How do I stop wasting money on clothes I never wear?",
  "What is the best way to shop for clothes intentionally?",
  "How do I find quality clothing brands that are worth the price?",
  "What are the best affordable luxury fashion brands for women?",
  "How do I shop like a stylist on a normal budget?",

  // Subscription / curation
  "What are the best fashion subscription services for women?",
  "Is there a service that sends you weekly outfit ideas?",
  "What is the best way to get personalized fashion recommendations?",
  "Are fashion subscription boxes worth it?",
  "How can I get a personal stylist on a budget?",

  // Quiet luxury / aesthetic
  "What is quiet luxury fashion and how do I dress that way?",
  "How do I dress in a 'quiet luxury' style without buying designer?",
  "What are the best quiet luxury brands for women?",
  "How do I look expensive without spending a lot?",
  "What is old money style and how do I achieve it?",

  // Specific item categories
  "What should every woman have in her wardrobe?",
  "What are the most versatile pieces a woman can own?",
  "How do I build a wardrobe around neutral colors?",
  "What shoes go with everything and are worth investing in?",
  "How do I style basics to look more put-together?",

  // Seasonal
  "What are the best fall fashion trends for women this year?",
  "How do I transition my wardrobe from summer to fall?",
  "What are the key spring fashion pieces to buy this season?",
  "How do I update my wardrobe for a new season without buying everything new?",
  "What are the most wearable fashion trends for women right now?",
];

/* ── Pick N unique questions for this week using week number as seed ── */
function pickQuestions(n: number): string[] {
  const now        = new Date();
  const weekNumber = Math.floor(now.getTime() / (7 * 24 * 60 * 60 * 1000));
  const shuffled   = [...QUESTION_BANK].sort((a, b) => {
    const hashA = (a.charCodeAt(0) * 31 + weekNumber) % QUESTION_BANK.length;
    const hashB = (b.charCodeAt(0) * 31 + weekNumber) % QUESTION_BANK.length;
    return hashA - hashB;
  });
  return shuffled.slice(0, n);
}

/* ── Load approved brief context from Blob (for this-week relevance) ── */
async function loadWeeklyContext(): Promise<string> {
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "approved/brief-" });
    const latest = blobs
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0];
    if (!latest) return "";
    const r = await fetch(latest.url);
    if (!r.ok) return "";
    const data = await r.json() as { looks?: Array<{ label: string; editorialLead?: string; items?: Array<{ piece: string; brand: string }> }> };
    if (!data?.looks?.length) return "";
    const lookSummary = data.looks.map(l =>
      `"${l.label}": ${l.items?.slice(0, 2).map(i => `${i.piece} by ${i.brand}`).join(", ") ?? "curated pieces"}`
    ).join("; ");
    return `This week's curated looks: ${lookSummary}.`;
  } catch {
    return "";
  }
}

/* ── Generate one Quora answer via Claude ─────────────────────────── */
async function generateAnswer(
  question: string,
  weekContext: string,
  apiKey: string
): Promise<string> {
  const contextNote = weekContext
    ? `For additional context, this week's curated fashion looks included: ${weekContext}`
    : "";

  const prompt = `You are Ellie — twenty years working alongside executives and editors, helping the quietly powerful women who ran the room look effortlessly right. You're answering this real Quora question:

"${question}"

Write a genuine, helpful answer in first person as Ellie. Format it exactly like a polished Quora answer:
- 200-250 words
- Start with the most useful insight — no preamble, no restatement of the question
- Be specific: real brand names, real prices, real specific advice — not generic guidance that could apply to anyone
- 2-3 short paragraphs or a paragraph + a brief list if that's actually clearer
- At the END only: one natural, non-salesy mention that you also curate a weekly fashion brief called "${SITE_NAME}" (${SITE_URL}) — mention it the way someone mentions something they actually use, not like an ad. One sentence. No price.
- Tone: like a knowledgeable friend giving real advice, not a professional delivering a service
- Do NOT start with "I" as the first word
- BANNED phrases: "As a fashion stylist...", "Great question", "It's important to note", "It's worth mentioning",
  "In today's world", "Whether you're a beginner or seasoned", "At the end of the day",
  "Take your style to the next level", "elevate your look", "curated selection", "seamlessly"
- Have an opinion. Real experts have preferences and aren't afraid to state them.
- Avoid the AI tell of always having exactly 3 evenly-sized bullets. Vary structure when it reads better.

${contextNote}

Return ONLY the answer text — no JSON, no quotes around it, no preamble. Just the answer, ready to paste into Quora.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:  "POST",
    headers: {
      "x-api-key":         apiKey,
      "anthropic-version": "2023-06-01",
      "content-type":      "application/json",
    },
    body: JSON.stringify({
      model:      "claude-haiku-4-5",
      max_tokens: 600,
      messages:   [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Claude API ${res.status}`);
  const json = await res.json() as { content: Array<{ text: string }> };
  return (json.content[0]?.text ?? "").trim();
}

/* ── Build the digest email HTML ──────────────────────────────────── */
function buildDigestEmail(
  answers: Array<{ question: string; answer: string }>,
  weekOf: string
): string {
  const mailingAddress = (process.env.BUSINESS_MAILING_ADDRESS ?? "The Style Refresh · 3811 Ditmars Blvd #2278 · Astoria, NY 11105").trim();

  const answerBlocks = answers.map((a, i) => `
  <!-- Answer ${i + 1} -->
  <tr><td style="padding:${i === 0 ? "28px" : "0"} 36px 0;">
    <div style="background:#F5EFE4;border:1px solid #DDD4C5;padding:20px 24px;">
      <p style="margin:0 0 10px;font-family:Arial,sans-serif;font-size:9px;
                 letter-spacing:0.26em;text-transform:uppercase;color:#C4956A;">
        Answer ${i + 1} of ${answers.length}
      </p>
      <p style="margin:0 0 12px;font-family:Georgia,serif;font-size:14px;
                 font-weight:600;color:#2C2C2C;line-height:1.5;">
        Q: ${a.question}
      </p>
      <div style="height:1px;background:linear-gradient(90deg,#C9B99A,transparent);margin-bottom:14px;"></div>
      <p style="margin:0;font-family:Georgia,serif;font-size:13px;
                 color:#4A4A4A;line-height:1.85;white-space:pre-wrap;">${a.answer}</p>
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
      This Week's Quora Answers
    </h1>
    <p style="margin:0;color:#6B6560;font-size:12px;font-family:Arial,sans-serif;">
      Week of ${weekOf} · 5 answers ready to copy &amp; paste
    </p>
  </td></tr>

  <!-- Instructions -->
  <tr><td style="padding:20px 36px 0;">
    <div style="background:#2C2C2C;padding:16px 20px;">
      <p style="margin:0 0 8px;color:#C4956A;font-family:Arial,sans-serif;
                 font-size:9px;letter-spacing:0.24em;text-transform:uppercase;">
        How to use these — 5 minutes total
      </p>
      <p style="margin:0;color:rgba(253,250,245,0.85);font-family:Arial,sans-serif;font-size:12px;line-height:1.7;">
        1. Go to <strong>quora.com</strong> — log in or create a free account<br/>
        2. Search for the question (copy the text below into Quora's search bar)<br/>
        3. Click "Answer" → paste the answer below → hit Post<br/>
        4. Do 1-2 per day — Quora flags rapid-fire posting. Spread them out.<br/>
        5. Quora answers index on Google within days and drive traffic for years.
      </p>
    </div>
  </td></tr>

  ${answerBlocks}

  <!-- Footer note -->
  <tr><td style="padding:24px 36px 0;">
    <div style="background:#F0E8D8;border:1px solid #DDD4C5;border-left:3px solid #C4956A;padding:14px 18px;">
      <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#4A4A4A;line-height:1.7;">
        <strong>Pro tip:</strong> After posting, click "Share" on your answer and share it to any Facebook groups or subreddits where the question is relevant.
        Each share multiplies the reach without extra writing.
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

  const weekOf      = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const weekContext = await loadWeeklyContext();
  const questions   = pickQuestions(5);

  console.log(`[quora] Generating ${questions.length} answers for week of ${weekOf}`);

  /* Generate all 5 answers in parallel */
  const answerResults = await Promise.all(
    questions.map(async (q) => {
      try {
        const answer = await generateAnswer(q, weekContext, apiKey);
        return { question: q, answer, ok: true };
      } catch (err) {
        console.error(`[quora] Failed to generate answer for: "${q}"`, err);
        return { question: q, answer: "", ok: false };
      }
    })
  );

  const successful = answerResults.filter(r => r.ok && r.answer.length > 50);

  /* Save to Blob if available */
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put } = await import("@vercel/blob");
      const dateKey = new Date().toISOString().split("T")[0];
      await put(
        `outreach/quora-${dateKey}.json`,
        JSON.stringify({ weekOf, generatedAt: new Date().toISOString(), answers: successful }),
        { access: "public", contentType: "application/json", addRandomSuffix: false }
      );
      console.log(`[quora] Saved ${successful.length} answers to Blob`);
    } catch (err) {
      console.error("[quora] Blob save failed (non-fatal):", err);
    }
  }

  /* Send digest email */
  if (successful.length > 0) {
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from:    `Ellie <${fromEmail}>`,
      to:      notifyEmail,
      subject: `📋 ${successful.length} Quora answers ready to post — week of ${weekOf}`,
      html:    buildDigestEmail(successful, weekOf),
    });
    console.log(`[quora] Digest sent to ${notifyEmail}`);
  }

  return NextResponse.json({
    ok:            true,
    weekOf,
    answersGenerated: successful.length,
    questionsFailed:  answerResults.length - successful.length,
  });
}
