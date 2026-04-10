import { NextRequest, NextResponse } from "next/server";
import { currentWeek } from "@/data/lookbook";

/* ═══════════════════════════════════════════════════════════════════════
   GET /api/push-preview?secret=YOUR_CURATOR_APPROVE_SECRET

   One-time-use (but safe to call anytime) admin tool.
   Writes the current lookbook.ts data to Vercel Blob as the live
   approved brief, immediately updating the dashboard for all members.

   Use this whenever you manually update lookbook.ts and want the
   dashboard to reflect those changes right away — without waiting
   for Sunday's approval flow.

   Protected by CURATOR_APPROVE_SECRET query param.
═══════════════════════════════════════════════════════════════════════ */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  /* ── Auth ────────────────────────────────────────────────────────── */
  const secret   = process.env.CURATOR_APPROVE_SECRET?.trim();
  const provided = req.nextUrl.searchParams.get("secret")?.trim();

  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  /* ── Write to Blob ───────────────────────────────────────────────── */
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "BLOB_READ_WRITE_TOKEN not set" }, { status: 500 });
  }

  try {
    const { put } = await import("@vercel/blob");

    const slug = String(currentWeek.weekOf ?? "manual")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const payload = { ...currentWeek, approvedAt: new Date().toISOString(), source: "manual-push" };

    await put(
      `ellie-approved/${slug}.json`,
      JSON.stringify(payload),
      { access: "public", contentType: "application/json", addRandomSuffix: false }
    );

    return NextResponse.json({
      ok:      true,
      message: "Dashboard updated. All members now see the latest lookbook.",
      slug,
      weekOf:  currentWeek.weekOf,
      looks:   currentWeek.looks.map(l => ({
        label: l.label,
        items: l.items.map(i => ({ piece: i.piece, brand: i.brand, buyLink: i.buyLink })),
      })),
    });

  } catch (err) {
    console.error("[push-preview] Failed:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
