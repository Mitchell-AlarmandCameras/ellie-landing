import { NextRequest, NextResponse } from "next/server";

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/go?to=[url]&src=[source]
   Affiliate click tracker and redirect.
   - Logs every click to Vercel function logs (visible in Vercel dashboard)
   - If SOVRN_PUBLISHER_KEY is set, routes through Sovrn Commerce (VigLink)
     which auto-monetizes 50,000+ retailers including Net-a-Porter, Nordstrom,
     Farfetch, SSENSE, Revolve, Shopbop, etc. Pays out monthly via PayPal.
   - If no affiliate key, redirects directly (zero friction, zero revenue)
   - Used in every member email brief for buy links
   - Skimlinks handles the website itself (added to layout.tsx)
═══════════════════════════════════════════════════════════════════════════ */

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const raw    = req.nextUrl.searchParams.get("to") ?? "";
  const source = req.nextUrl.searchParams.get("src") ?? "brief";
  const home   = new URL("/", req.nextUrl.origin).toString();

  /* Validate and decode target URL */
  let targetUrl: string;
  try {
    targetUrl = decodeURIComponent(raw);
    new URL(targetUrl); // throws if invalid
  } catch {
    return NextResponse.redirect(home, { status: 302 });
  }

  /* Block dangerous schemes */
  if (!targetUrl.startsWith("https://") && !targetUrl.startsWith("http://")) {
    return NextResponse.redirect(home, { status: 302 });
  }

  /* Log click — visible in Vercel → Project → Functions → go → Logs */
  console.log(`[affiliate] src=${source} url=${targetUrl}`);

  /* Sovrn Commerce (VigLink) — works for emails + site, 50k+ retailers */
  const sovrnKey = process.env.SOVRN_PUBLISHER_KEY?.trim();
  if (sovrnKey) {
    const affiliate = `https://redirect.viglink.com/?key=${encodeURIComponent(sovrnKey)}&u=${encodeURIComponent(targetUrl)}&cuid=${encodeURIComponent(source)}`;
    return NextResponse.redirect(affiliate, { status: 302 });
  }

  /* Direct redirect when affiliate not yet configured */
  return NextResponse.redirect(targetUrl, { status: 302 });
}
