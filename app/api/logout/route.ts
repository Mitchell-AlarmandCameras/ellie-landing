import { NextRequest, NextResponse } from "next/server";

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/logout
   Clears the session cookies and redirects to the homepage.
═══════════════════════════════════════════════════════════════════════════ */

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const baseUrl  = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com").replace(/\/$/, "");
  const response = NextResponse.redirect(new URL("/", baseUrl));

  response.cookies.set("ellie_access", "", {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   0,
    path:     "/",
  });

  response.cookies.set("ellie_customer", "", {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   0,
    path:     "/",
  });

  return response;
}
