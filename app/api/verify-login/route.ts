import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/verify-login?token=...&cid=...
   Called when member clicks magic link from their email.
   Verifies HMAC signature + expiry, sets access cookie, redirects to dashboard.
═══════════════════════════════════════════════════════════════════════════ */

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com").replace(/\/$/, "");
  const secret  = process.env.CRON_SECRET?.trim() ?? process.env.CURATOR_APPROVE_SECRET?.trim() ?? "fallback";

  const token      = req.nextUrl.searchParams.get("token") ?? "";
  const customerId = req.nextUrl.searchParams.get("cid")   ?? "";

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=invalid", baseUrl));
  }

  try {
    const decoded  = Buffer.from(token, "base64url").toString("utf8");
    const parts    = decoded.split(":");
    if (parts.length < 3) throw new Error("malformed");

    const sig    = parts.pop()!;
    const expiry = Number(parts.pop()!);
    const email  = parts.join(":");   // handles emails with colons (unlikely but safe)

    /* Check expiry */
    if (Date.now() > expiry) {
      return NextResponse.redirect(new URL("/login?error=expired", baseUrl));
    }

    /* Verify HMAC */
    const payload  = `${email}:${expiry}`;
    const expected = createHmac("sha256", secret).update(payload).digest("hex");

    const sigBuf = Buffer.from(sig,      "hex");
    const expBuf = Buffer.from(expected, "hex");

    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      throw new Error("invalid signature");
    }

    /* All good — set access cookie and redirect */
    const response = NextResponse.redirect(new URL("/dashboard", baseUrl));

    response.cookies.set("ellie_access", "true", {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   60 * 60 * 24 * 30,
      path:     "/",
    });

    if (customerId) {
      response.cookies.set("ellie_customer", customerId, {
        httpOnly: true,
        secure:   process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge:   60 * 60 * 24 * 30,
        path:     "/",
      });
    }

    console.log(`[verify-login] Member logged in: ${email}`);
    return response;

  } catch (err) {
    console.error("[verify-login] Invalid token:", err);
    return NextResponse.redirect(new URL("/login?error=invalid", baseUrl));
  }
}
