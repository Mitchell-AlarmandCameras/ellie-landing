import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/* ═══════════════════════════════════════════════════════════════════════════
   POST /api/weekly-draft
   Backup entry point (used by scripts/weekly_curator.py if run manually).
   Primary automation uses GET /api/run-curator directly.
   Stores the lookbook to /tmp/ellie-draft.json.
═══════════════════════════════════════════════════════════════════════════ */

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { secret?: string; lookbook?: Record<string, unknown> };

    const cronSecret    = process.env.CRON_SECRET?.trim() ?? "";
    const approveSecret = process.env.CURATOR_APPROVE_SECRET?.trim() ?? "";

    if (!body.secret || (body.secret !== cronSecret && body.secret !== approveSecret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!body.lookbook) {
      return NextResponse.json({ error: "No lookbook provided" }, { status: 400 });
    }

    const draftPath = path.join("/tmp", "ellie-draft.json");
    fs.writeFileSync(draftPath, JSON.stringify(body.lookbook), "utf8");

    return NextResponse.json({
      success: true,
      weekOf:  body.lookbook.weekOf ?? "",
      message: "Draft saved to /tmp. Ellie can approve at /api/approve-weekly.",
    });
  } catch (err) {
    console.error("[weekly-draft] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
