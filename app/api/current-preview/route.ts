import { list } from "@vercel/blob";
import { NextResponse } from "next/server";

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/current-preview
   Returns the current week's look preview (no buy links — members only).
   Written to Vercel Blob by approve-weekly each Sunday.
   The homepage polls this on load to show live curated looks.
═══════════════════════════════════════════════════════════════════════════ */

export const runtime = "nodejs";

export async function GET() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Blob storage not configured — BLOB_READ_WRITE_TOKEN missing." },
      { status: 503 }
    );
  }

  try {
    const { blobs } = await list({ prefix: "ellie-preview/current" });

    if (!blobs.length || !blobs[0]) {
      return NextResponse.json(
        { error: "No preview published yet. Approve a weekly draft first." },
        { status: 404 }
      );
    }

    /* Fetch the blob's public URL content */
    const res = await fetch(blobs[0].url, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to read blob content." },
        { status: 500 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.error("[current-preview] Error:", err);
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
