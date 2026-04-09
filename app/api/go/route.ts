import { NextRequest, NextResponse } from "next/server";

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/go?to=[url]&src=[source]
   Affiliate click tracker + redirect.

   Every click is written to Vercel Blob as a tiny JSON file under:
     analytics/clicks/[week-monday]/[timestamp]-[rand].json
   The Sunday curator reads the past 4 weeks of these files to understand
   which looks and retailers resonated — and feeds that back to Claude so
   the brief improves every single week automatically.
═══════════════════════════════════════════════════════════════════════════ */

export const runtime    = "nodejs";
export const maxDuration = 10;

function getWeekKey(d = new Date()): string {
  const day    = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return monday.toISOString().split("T")[0];
}

function retailerOf(url: string): string {
  try   { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return "unknown"; }
}

export async function GET(req: NextRequest) {
  const raw    = req.nextUrl.searchParams.get("to") ?? "";
  const source = req.nextUrl.searchParams.get("src") ?? "brief";
  const home   = new URL("/", req.nextUrl.origin).toString();

  /* Validate and decode */
  let targetUrl: string;
  try {
    targetUrl = decodeURIComponent(raw);
    new URL(targetUrl);
  } catch {
    return NextResponse.redirect(home, { status: 302 });
  }
  if (!targetUrl.startsWith("http")) {
    return NextResponse.redirect(home, { status: 302 });
  }

  /* ── Write click analytics to Blob ─────────────────────────────── */
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put } = await import("@vercel/blob");
      const ts   = Date.now();
      const rand = Math.random().toString(36).slice(2, 6);
      await put(
        `analytics/clicks/${getWeekKey()}/${ts}-${rand}.json`,
        JSON.stringify({
          ts:       new Date(ts).toISOString(),
          src:      source,
          url:      targetUrl,
          retailer: retailerOf(targetUrl),
        }),
        { access: "public", contentType: "application/json", addRandomSuffix: false }
      );
    } catch (e) {
      console.warn("[go] analytics write skipped:", e);
    }
  }

  console.log(`[affiliate] src=${source} url=${targetUrl}`);

  /* ── Sovrn Commerce affiliate redirect ─────────────────────────── */
  const sovrnKey = process.env.SOVRN_PUBLISHER_KEY?.trim();
  if (sovrnKey) {
    return NextResponse.redirect(
      `https://redirect.viglink.com/?key=${encodeURIComponent(sovrnKey)}&u=${encodeURIComponent(targetUrl)}&cuid=${encodeURIComponent(source)}`,
      { status: 302 }
    );
  }

  return NextResponse.redirect(targetUrl, { status: 302 });
}
