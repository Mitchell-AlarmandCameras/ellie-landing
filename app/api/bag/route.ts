import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/* ═══════════════════════════════════════════════════════════════════════
   /api/bag  — My Edit personal style bag
   GET    → returns all saved items for this member
   POST   → adds one item to the bag
   DELETE → removes one item by id
   Storage: Vercel Blob keyed by Stripe customer ID (persistent, cross-device)
═══════════════════════════════════════════════════════════════════════ */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface BagItem {
  id:       string;   /* uuid */
  piece:    string;
  brand:    string;
  price:    string;
  note:     string;
  buyLink:  string;
  look:     string;   /* "The Executive" etc. */
  weekOf:   string;
  addedAt:  string;   /* ISO */
}

function bagKey(customerId: string): string {
  return `bags/${customerId}.json`;
}

async function readBag(customerId: string): Promise<BagItem[]> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return [];
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: bagKey(customerId) });
    if (!blobs[0]) return [];
    const res = await fetch(blobs[0].url, { cache: "no-store" });
    if (!res.ok) return [];
    return await res.json() as BagItem[];
  } catch { return []; }
}

async function writeBag(customerId: string, items: BagItem[]): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;
  const { put } = await import("@vercel/blob");
  await put(bagKey(customerId), JSON.stringify(items), {
    access:          "public",
    contentType:     "application/json",
    addRandomSuffix: false,
  });
}

function getCustomerId(): string {
  const cookieStore = cookies();
  return cookieStore.get("ellie_customer")?.value ?? "";
}

function hasAccess(): boolean {
  const cookieStore = cookies();
  return cookieStore.get("ellie_access")?.value === "true";
}

/* GET — return bag */
export async function GET() {
  if (!hasAccess()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const cid = getCustomerId();
  if (!cid)   return NextResponse.json({ items: [] });
  const items = await readBag(cid);
  return NextResponse.json({ items });
}

/* POST — add item */
export async function POST(req: NextRequest) {
  if (!hasAccess()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const cid = getCustomerId();
  if (!cid)   return NextResponse.json({ error: "no customer id" }, { status: 400 });

  const body = await req.json() as Partial<BagItem>;
  if (!body.piece || !body.buyLink) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const items = await readBag(cid);

  /* Prevent duplicates by buyLink */
  if (items.some(i => i.buyLink === body.buyLink)) {
    return NextResponse.json({ ok: true, duplicate: true, items });
  }

  const newItem: BagItem = {
    id:      crypto.randomUUID(),
    piece:   body.piece   ?? "",
    brand:   body.brand   ?? "",
    price:   body.price   ?? "",
    note:    body.note    ?? "",
    buyLink: body.buyLink ?? "",
    look:    body.look    ?? "",
    weekOf:  body.weekOf  ?? "",
    addedAt: new Date().toISOString(),
  };

  items.unshift(newItem);
  if (items.length > 100) items.splice(100); /* cap at 100 saved items */
  await writeBag(cid, items);
  return NextResponse.json({ ok: true, item: newItem, items });
}

/* DELETE — remove item by id */
export async function DELETE(req: NextRequest) {
  if (!hasAccess()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const cid = getCustomerId();
  if (!cid)   return NextResponse.json({ error: "no customer id" }, { status: 400 });

  const id      = req.nextUrl.searchParams.get("id") ?? "";
  const items   = await readBag(cid);
  const updated = items.filter(i => i.id !== id);
  await writeBag(cid, updated);
  return NextResponse.json({ ok: true, items: updated });
}
