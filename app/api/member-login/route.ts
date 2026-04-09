import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { createHash } from "crypto";

/* ═══════════════════════════════════════════════════════════════════════════
   POST /api/member-login
   Body: { email, password }

   Flow:
   - Verify email has an active Stripe subscription
   - If first login: hash + store password, set session cookie
   - If returning:   verify password, set session cookie
   - Redirect to /dashboard on success
═══════════════════════════════════════════════════════════════════════════ */

export const runtime = "nodejs";

const scryptAsync = promisify(scrypt);

/* ── Password hashing (Node crypto scrypt — no extra dependencies) ─────── */
async function hashPassword(password: string, salt: string): Promise<string> {
  const key = await scryptAsync(password, salt, 64) as Buffer;
  return key.toString("hex");
}

async function verifyPassword(password: string, salt: string, storedHash: string): Promise<boolean> {
  const hash    = await hashPassword(password, salt);
  const hashBuf = Buffer.from(hash,       "hex");
  const stored  = Buffer.from(storedHash, "hex");
  if (hashBuf.length !== stored.length) return false;
  return timingSafeEqual(hashBuf, stored);
}

/* ── Key for Vercel Blob — short hash of email to avoid special chars ───── */
function memberKey(email: string): string {
  return createHash("sha256").update(email.toLowerCase().trim()).digest("hex").slice(0, 24);
}

/* ── Load/save password record via Vercel Blob ──────────────────────────── */
type PasswordRecord = { salt: string; hash: string; createdAt: string };

async function loadRecord(key: string): Promise<PasswordRecord | null> {
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: `auth/${key}` });
    if (!blobs[0]) return null;
    const res = await fetch(blobs[0].url);
    if (!res.ok) return null;
    return await res.json() as PasswordRecord;
  } catch {
    return null;
  }
}

async function saveRecord(key: string, record: PasswordRecord): Promise<void> {
  const { put } = await import("@vercel/blob");
  await put(`auth/${key}.json`, JSON.stringify(record), {
    access:          "public",
    contentType:     "application/json",
    addRandomSuffix: false,
  });
}

export async function POST(req: NextRequest) {
  const baseUrl   = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com").replace(/\/$/, "");
  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();

  let body: { email?: string; password?: string } = {};
  try { body = await req.json(); } catch { /* ignore */ }

  const email    = (body.email    ?? "").trim().toLowerCase();
  const password = (body.password ?? "").trim();

  if (!email.includes("@")) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  if (!stripeKey) {
    return NextResponse.json({ error: "Service temporarily unavailable." }, { status: 503 });
  }

  /* ── Verify active Stripe subscription ──────────────────────────────── */
  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
  let customerId: string | null = null;

  try {
    const customers = await stripe.customers.list({ email, limit: 5 });
    for (const customer of customers.data) {
      const subs = await stripe.subscriptions.list({ customer: customer.id, status: "active", limit: 1 });
      if (subs.data.length > 0) { customerId = customer.id; break; }
    }
  } catch (err) {
    console.error("[member-login] Stripe error:", err);
    return NextResponse.json({ error: "Service error. Please try again." }, { status: 500 });
  }

  if (!customerId) {
    return NextResponse.json(
      { error: "No active membership found for that email. Check your email address or join below." },
      { status: 401 }
    );
  }

  /* ── Check/create password in Vercel Blob ───────────────────────────── */
  const key    = memberKey(email);
  let   record = await loadRecord(key);

  if (!record) {
    /* First login — create password */
    const salt = randomBytes(16).toString("hex");
    const hash = await hashPassword(password, salt);
    record = { salt, hash, createdAt: new Date().toISOString() };
    try {
      await saveRecord(key, record);
    } catch (err) {
      console.error("[member-login] Could not save password:", err);
      return NextResponse.json({ error: "Could not save password. Please try again." }, { status: 500 });
    }
  } else {
    /* Returning login — verify password */
    const valid = await verifyPassword(password, record.salt, record.hash);
    if (!valid) {
      return NextResponse.json({ error: "Incorrect password. Try again or contact support." }, { status: 401 });
    }
  }

  /* ── Set session cookies (30-day, persists across tabs and navigation) ── */
  const response = NextResponse.json({ success: true, redirect: `${baseUrl}/dashboard` });

  response.cookies.set("ellie_access", "true", {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   60 * 60 * 24 * 30,
    path:     "/",
  });

  response.cookies.set("ellie_customer", customerId, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   60 * 60 * 24 * 30,
    path:     "/",
  });

  console.log(`[member-login] Logged in: ${email}`);
  return response;
}
