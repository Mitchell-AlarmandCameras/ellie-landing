/**
 * OWNER INBOX — The Style Refresh
 * =================================
 * Private page showing every customer conversation in real time.
 * Customers never know this exists.
 *
 * Access: /admin/inbox?secret=YOUR_ADMIN_SECRET
 * Protected by ADMIN_SECRET env var (falls back to CRON_SECRET).
 * Auto-refreshes every 60 seconds via meta tag.
 *
 * Shows conversations from BOTH sites (fashion + skincare) if Blob is shared.
 */

import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Inbox — Owner Only", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Conversation = {
  id:           string;
  site:         string;
  timestamp:    string;
  name:         string;
  email:        string;
  type:         string;
  message:      string;
  category:     string;
  aiHandled:    boolean;
  needsFollowup: boolean;
  aiReply:      string | null;
};

async function loadConversations(): Promise<Conversation[]> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return [];
  try {
    const { list } = await import("@vercel/blob");
    /* Load from both sites if Blob is shared */
    const [fashionBlobs, skincareBlobs] = await Promise.all([
      list({ prefix: "ellie-inbox/fashion/" }),
      list({ prefix: "ellie-inbox/skincare/" }),
    ]);
    const allBlobs = [
      ...fashionBlobs.blobs,
      ...skincareBlobs.blobs,
    ].sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    const conversations = await Promise.all(
      allBlobs.slice(0, 100).map(async blob => {
        try {
          const r = await fetch(blob.url, { cache: "no-store" });
          if (!r.ok) return null;
          return await r.json() as Conversation;
        } catch { return null; }
      })
    );
    return conversations.filter((c): c is Conversation => c !== null);
  } catch { return []; }
}

function categoryColor(cat: string): string {
  const map: Record<string, string> = {
    cancel:           "#dc2626",
    refund:           "#dc2626",
    complaint:        "#dc2626",
    billing:          "#d97706",
    missing_email:    "#d97706",
    access:           "#d97706",
    general:          "#2563eb",
    other:            "#6b7280",
    positive_feedback: "#16a34a",
  };
  return map[cat] ?? "#6b7280";
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: { secret?: string };
}) {
  const adminSecret  = process.env.ADMIN_SECRET?.trim() || process.env.CRON_SECRET?.trim();
  const providedSecret = searchParams.secret ?? "";

  if (adminSecret && providedSecret !== adminSecret) {
    redirect("/");
  }

  const conversations = await loadConversations();
  const needsReply    = conversations.filter(c => c.needsFollowup);
  const autoHandled   = conversations.filter(c => !c.needsFollowup);

  return (
    <>
      {/* Auto-refresh every 60 seconds */}
      <meta httpEquiv="refresh" content="60" />

      <div style={{ minHeight: "100vh", background: "#F5EFE4", fontFamily: "Arial, sans-serif", padding: "32px 16px" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>

          {/* Header */}
          <div style={{ marginBottom: "28px" }}>
            <p style={{ margin: "0 0 4px", fontSize: "10px", letterSpacing: "0.3em", textTransform: "uppercase", color: "#C4956A" }}>
              Owner Only · Refreshes every 60s
            </p>
            <h1 style={{ margin: "0 0 6px", fontFamily: "Georgia, serif", fontSize: "1.8rem", color: "#2C2C2C", fontWeight: 400 }}>
              Customer Inbox
            </h1>
            <p style={{ margin: 0, fontSize: "13px", color: "#6B6560" }}>
              {conversations.length} conversation{conversations.length !== 1 ? "s" : ""} total ·{" "}
              <strong style={{ color: needsReply.length > 0 ? "#dc2626" : "#16a34a" }}>
                {needsReply.length} need{needsReply.length !== 1 ? "" : "s"} your reply
              </strong>
              {" · "}{autoHandled.length} auto-handled
            </p>
          </div>

          {/* Needs Reply — top priority */}
          {needsReply.length > 0 && (
            <div style={{ marginBottom: "32px" }}>
              <p style={{ margin: "0 0 12px", fontSize: "10px", letterSpacing: "0.28em", textTransform: "uppercase", color: "#dc2626", fontWeight: 700 }}>
                ⚠️ Needs Your Reply
              </p>
              {needsReply.map(c => <ConversationCard key={c.id} c={c} secret={providedSecret} />)}
            </div>
          )}

          {/* All conversations */}
          {conversations.length === 0 ? (
            <div style={{ padding: "48px", textAlign: "center", background: "#FDFAF5", border: "1px solid #DDD4C5" }}>
              <p style={{ margin: 0, color: "#8A8580", fontSize: "14px" }}>No conversations yet.</p>
              <p style={{ margin: "8px 0 0", color: "#aaa", fontSize: "12px" }}>
                Conversations appear here as soon as customers use the contact form.
              </p>
            </div>
          ) : (
            <div>
              <p style={{ margin: "0 0 12px", fontSize: "10px", letterSpacing: "0.28em", textTransform: "uppercase", color: "#8A8580" }}>
                All Conversations
              </p>
              {conversations.map(c => <ConversationCard key={c.id} c={c} secret={providedSecret} />)}
            </div>
          )}

          <p style={{ marginTop: "32px", fontSize: "11px", color: "#aaa", textAlign: "center" }}>
            To reply: click the email address or use the notification emails in your inbox.
            This page is invisible to customers.
          </p>
        </div>
      </div>
    </>
  );
}

function ConversationCard({ c, secret }: { c: Conversation; secret: string }) {
  const borderColor = c.needsFollowup ? "#dc2626" : "#16a34a";
  const catColor    = categoryColor(c.category);

  return (
    <div style={{
      background:    "#FDFAF5",
      border:        "1px solid #DDD4C5",
      borderLeft:    `3px solid ${borderColor}`,
      marginBottom:  "16px",
      padding:       "20px 24px",
    }}>
      {/* Row 1: meta */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
        <span style={{
          background: borderColor, color: "#fff",
          padding: "2px 8px", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase",
        }}>
          {c.needsFollowup ? "NEEDS REPLY" : "AUTO-HANDLED"}
        </span>
        <span style={{
          background: catColor, color: "#fff",
          padding: "2px 8px", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase",
        }}>
          {c.category}
        </span>
        <span style={{
          background: c.site === "fashion" ? "#2C2C2C" : "#1A2E28", color: "#fff",
          padding: "2px 8px", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase",
        }}>
          {c.site === "fashion" ? "Style Refresh" : "Skincare"}
        </span>
        <span style={{ fontSize: "11px", color: "#8A8580", marginLeft: "auto" }}>
          {timeAgo(c.timestamp)} · {new Date(c.timestamp).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} ET
        </span>
      </div>

      {/* Row 2: sender */}
      <p style={{ margin: "0 0 12px", fontSize: "14px", color: "#2C2C2C" }}>
        <strong>{c.name || "(no name)"}</strong>{" — "}
        <a href={`mailto:${c.email}`} style={{ color: "#C4956A", textDecoration: "none" }}>{c.email}</a>
        <span style={{ color: "#aaa", fontSize: "12px" }}> · {c.type}</span>
      </p>

      {/* Row 3: their message */}
      <div style={{
        background: "#F5EFE4", borderLeft: "3px solid #C4956A",
        padding: "12px 16px", marginBottom: c.aiReply ? "14px" : 0,
      }}>
        <p style={{ margin: "0 0 4px", fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: "#C4956A" }}>
          Customer message
        </p>
        <p style={{ margin: 0, fontSize: "14px", color: "#2C2C2C", lineHeight: "1.65", whiteSpace: "pre-wrap" }}>
          {c.message}
        </p>
      </div>

      {/* Row 4: AI reply */}
      {c.aiReply && (
        <div style={{
          background: "#f9f9f9", borderLeft: `3px solid ${borderColor}`,
          padding: "12px 16px",
        }}>
          <p style={{ margin: "0 0 4px", fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: borderColor }}>
            {c.aiHandled ? "✅ AI reply sent to customer" : "⚠️ AI reply sent — but needs your personal follow-up"}
          </p>
          <p style={{ margin: 0, fontSize: "13px", color: "#4A4A4A", lineHeight: "1.65", whiteSpace: "pre-wrap" }}>
            {c.aiReply}
          </p>
        </div>
      )}

      {/* Reply CTA if needed */}
      {c.needsFollowup && (
        <div style={{ marginTop: "12px" }}>
          <a
            href={`mailto:${c.email}?subject=Re: Your message to ${c.site === "fashion" ? "The Style Refresh" : "Skincare by Ellie"}`}
            style={{
              display:       "inline-block",
              padding:       "8px 20px",
              background:    "#2C2C2C",
              color:         "#FDFAF5",
              fontSize:      "11px",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              textDecoration: "none",
            }}
          >
            Reply to {c.email} →
          </a>
        </div>
      )}
    </div>
  );
}
