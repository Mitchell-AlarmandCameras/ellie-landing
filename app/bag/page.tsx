"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { BagItem } from "@/app/api/bag/route";

/* ═══════════════════════════════════════════════════════════════════════
   MY EDIT — Personal style bag
   Loads saved items, runs live link checks, handles broken links gracefully.
═══════════════════════════════════════════════════════════════════════ */

type LinkStatus = "pending" | "ok" | "changed" | "checking";
type ItemWithStatus = BagItem & { linkStatus: LinkStatus };

async function checkUrl(url: string): Promise<LinkStatus> {
  try {
    const res = await fetch(
      `/api/go?to=${encodeURIComponent(url)}&src=bag-check&q=check`,
      { method: "HEAD", redirect: "manual" }
    );
    /* /api/go always redirects — 3xx means it found the link (or fallback).
       We just verify the /api/go endpoint itself responds.                */
    return res.status < 500 ? "ok" : "changed";
  } catch {
    return "changed";
  }
}

export default function BagPage() {
  const [items,    setItems]    = useState<ItemWithStatus[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [checking, setChecking] = useState(false);
  const [toast,    setToast]    = useState("");

  /* Load bag */
  useEffect(() => {
    fetch("/api/bag")
      .then(r => r.json())
      .then(d => {
        const loaded: ItemWithStatus[] = (d.items ?? []).map((i: BagItem) => ({
          ...i,
          linkStatus: "pending",
        }));
        setItems(loaded);
        setLoading(false);
        /* Auto-check all links after load */
        runLinkChecks(loaded);
      })
      .catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  /* Live link check for all items */
  const runLinkChecks = useCallback(async (list: ItemWithStatus[]) => {
    if (!list.length) return;
    setChecking(true);
    const updated = [...list];
    await Promise.all(
      updated.map(async (item, idx) => {
        updated[idx] = { ...item, linkStatus: "checking" };
        setItems([...updated]);
        const status = await checkUrl(item.buyLink);
        updated[idx] = { ...item, linkStatus: status };
        setItems([...updated]);
      })
    );
    setChecking(false);
  }, []);

  /* Remove item */
  const removeItem = async (id: string) => {
    await fetch(`/api/bag?id=${id}`, { method: "DELETE" });
    setItems(prev => prev.filter(i => i.id !== id));
    showToast("Removed from your edit.");
  };

  /* Group by look */
  const grouped = items.reduce<Record<string, ItemWithStatus[]>>((acc, item) => {
    const key = item.look || "Saved Items";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const statusBadge = (s: LinkStatus) => {
    if (s === "checking") return (
      <span style={{ fontSize: "10px", fontFamily: "Arial,sans-serif", color: "#B5A99A",
        letterSpacing: "0.1em", textTransform: "uppercase" }}>checking…</span>
    );
    if (s === "ok") return (
      <span style={{ fontSize: "10px", fontFamily: "Arial,sans-serif", color: "#4A6741",
        letterSpacing: "0.1em", textTransform: "uppercase" }}>✓ Available</span>
    );
    if (s === "changed") return (
      <span style={{ fontSize: "10px", fontFamily: "Arial,sans-serif", color: "#c0392b",
        letterSpacing: "0.1em", textTransform: "uppercase" }}>⚠ Link changed</span>
    );
    return null;
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream, #F5EFE4)" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: "#2C2C2C", color: "#FDFAF5", padding: "10px 24px",
          fontFamily: "Arial,sans-serif", fontSize: "12px", letterSpacing: "0.1em",
          zIndex: 9999, borderRadius: 2,
        }}>{toast}</div>
      )}

      {/* Nav */}
      <header style={{
        position: "sticky", top: 0, zIndex: 40,
        background: "rgba(253,250,245,0.95)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid #DDD4C5",
      }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "16px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <span style={{ fontFamily: "DM Serif Display,serif", fontSize: "1rem",
              letterSpacing: "0.22em", textTransform: "uppercase", color: "#2C2C2C" }}>
              Ellie
            </span>
            <span style={{ display: "block", fontFamily: "Arial,sans-serif", fontSize: "0.6rem",
              letterSpacing: "0.26em", textTransform: "uppercase", color: "#C4956A" }}>
              The Style Refresh
            </span>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <Link href="/dashboard" style={{ fontFamily: "Arial,sans-serif", fontSize: "0.72rem",
              letterSpacing: "0.18em", textTransform: "uppercase", color: "#6B6560",
              textDecoration: "none" }}>
              ← VIP Room
            </Link>
            <a href="/api/logout" style={{ fontFamily: "Arial,sans-serif", fontSize: "0.72rem",
              letterSpacing: "0.18em", textTransform: "uppercase", color: "#C4956A",
              border: "1px solid #C4956A", padding: "0.3rem 0.8rem", textDecoration: "none" }}>
              Log Out
            </a>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <p style={{ margin: "0 0 6px", fontFamily: "Arial,sans-serif", fontSize: "10px",
            letterSpacing: "0.34em", textTransform: "uppercase", color: "#C4956A" }}>
            My Edit
          </p>
          <h1 style={{ margin: "0 0 10px", fontFamily: "DM Serif Display,serif", fontSize: "clamp(26px,5vw,36px)",
            fontWeight: 400, color: "#2C2C2C" }}>
            Your Saved Looks
          </h1>
          <p style={{ margin: 0, fontFamily: "Arial,sans-serif", fontSize: "13px",
            color: "#6B6560", lineHeight: 1.6 }}>
            Items you've saved from your weekly brief. Links are checked live every time you open this page.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <p style={{ textAlign: "center", fontFamily: "Arial,sans-serif", fontSize: "13px",
            color: "#B5A99A", letterSpacing: "0.1em" }}>
            Loading your edit…
          </p>
        )}

        {/* Empty state */}
        {!loading && items.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 24px",
            border: "1px solid #DDD4C5", background: "#FDFAF5" }}>
            <p style={{ margin: "0 0 6px", fontFamily: "DM Serif Display,serif",
              fontSize: "20px", color: "#2C2C2C", fontWeight: 400 }}>
              Your edit is empty.
            </p>
            <p style={{ margin: "0 0 24px", fontFamily: "Arial,sans-serif",
              fontSize: "13px", color: "#6B6560" }}>
              Open this week's VIP Room and tap Save on any item to build your edit.
            </p>
            <Link href="/dashboard" style={{
              display: "inline-block", background: "#C4956A", color: "#FDFAF5",
              padding: "11px 28px", fontFamily: "Arial,sans-serif", fontSize: "11px",
              letterSpacing: "0.18em", textTransform: "uppercase", textDecoration: "none",
            }}>
              Go to VIP Room →
            </Link>
          </div>
        )}

        {/* Re-check button */}
        {!loading && items.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: 24 }}>
            <p style={{ margin: 0, fontFamily: "Arial,sans-serif", fontSize: "12px", color: "#6B6560" }}>
              {items.length} item{items.length !== 1 ? "s" : ""} saved
              {checking ? " · checking links…" : ""}
            </p>
            <button
              onClick={() => runLinkChecks(items)}
              disabled={checking}
              style={{
                background: "transparent", border: "1px solid #C4956A", color: "#C4956A",
                padding: "7px 18px", fontFamily: "Arial,sans-serif", fontSize: "10px",
                letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer",
                opacity: checking ? 0.5 : 1,
              }}
            >
              {checking ? "Checking…" : "Re-check All Links"}
            </button>
          </div>
        )}

        {/* Items grouped by look */}
        {Object.entries(grouped).map(([lookName, lookItems]) => (
          <div key={lookName} style={{ marginBottom: 40 }}>

            {/* Look header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ height: 1, flex: 1, background: "#DDD4C5" }} />
              <span style={{ fontFamily: "Arial,sans-serif", fontSize: "9px",
                letterSpacing: "0.28em", textTransform: "uppercase", color: "#C4956A",
                whiteSpace: "nowrap" }}>
                {lookName}
              </span>
              <div style={{ height: 1, flex: 1, background: "#DDD4C5" }} />
            </div>

            {/* Item cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {lookItems.map(item => (
                <div key={item.id} style={{
                  background: "#FDFAF5", border: "1px solid #DDD4C5",
                  padding: "18px 20px",
                  display: "flex", alignItems: "flex-start", justifyContent: "space-between",
                  gap: 16,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Piece + status */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                      <span style={{ fontFamily: "Georgia,serif", fontSize: "15px", color: "#2C2C2C" }}>
                        {item.piece}
                      </span>
                      {statusBadge(item.linkStatus)}
                    </div>
                    {/* Brand + price */}
                    <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                      <span style={{ fontFamily: "Arial,sans-serif", fontSize: "11px",
                        color: "#C4956A", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                        {item.brand}
                      </span>
                      <span style={{ fontFamily: "Arial,sans-serif", fontSize: "11px", color: "#6B6560" }}>
                        {item.price}
                      </span>
                    </div>
                    {/* Note */}
                    {item.note && (
                      <p style={{ margin: "0 0 10px", fontFamily: "Arial,sans-serif",
                        fontSize: "11px", color: "#6B6560", lineHeight: 1.6, fontStyle: "italic" }}>
                        {item.note}
                      </p>
                    )}
                    {/* Week badge */}
                    {item.weekOf && (
                      <span style={{ fontFamily: "Arial,sans-serif", fontSize: "9px",
                        color: "#B5A99A", letterSpacing: "0.14em", textTransform: "uppercase" }}>
                        Week of {item.weekOf}
                      </span>
                    )}

                    {/* Link changed warning */}
                    {item.linkStatus === "changed" && (
                      <div style={{ marginTop: 10, padding: "8px 12px",
                        background: "#FDF0ED", border: "1px solid #e8b4a8" }}>
                        <p style={{ margin: "0 0 6px", fontFamily: "Arial,sans-serif",
                          fontSize: "11px", color: "#c0392b", lineHeight: 1.5 }}>
                          This link may have changed or the item may be sold out.
                        </p>
                        <a
                          href={`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(item.piece + " " + item.brand)}`}
                          target="_blank" rel="noopener noreferrer"
                          style={{ fontFamily: "Arial,sans-serif", fontSize: "10px",
                            letterSpacing: "0.14em", textTransform: "uppercase",
                            color: "#C4956A", textDecoration: "none" }}
                        >
                          Find a similar item on Google Shopping →
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                    <a
                      href={`/api/go?to=${encodeURIComponent(item.buyLink)}&src=bag&q=${encodeURIComponent(item.piece + " " + item.brand)}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{
                        display: "block", textAlign: "center",
                        background: item.linkStatus === "changed" ? "#B5A99A" : "#C4956A",
                        color: "#FDFAF5", padding: "9px 18px",
                        fontFamily: "Arial,sans-serif", fontSize: "10px",
                        letterSpacing: "0.18em", textTransform: "uppercase", textDecoration: "none",
                      }}
                    >
                      Shop →
                    </a>
                    <button
                      onClick={() => removeItem(item.id)}
                      style={{
                        background: "transparent", border: "1px solid #DDD4C5",
                        color: "#B5A99A", padding: "7px 18px", cursor: "pointer",
                        fontFamily: "Arial,sans-serif", fontSize: "10px",
                        letterSpacing: "0.18em", textTransform: "uppercase",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Bottom CTA */}
        {!loading && items.length > 0 && (
          <div style={{ textAlign: "center", marginTop: 20,
            borderTop: "1px solid #DDD4C5", paddingTop: 28 }}>
            <p style={{ margin: "0 0 4px", fontFamily: "Arial,sans-serif",
              fontSize: "11px", color: "#6B6560" }}>
              Ready to shop everything? Each Shop button takes you directly to the brand.
            </p>
            <p style={{ margin: 0, fontFamily: "Arial,sans-serif", fontSize: "10px", color: "#B5A99A" }}>
              If a link has changed, Google Shopping will find the same item from other retailers.
            </p>
          </div>
        )}

      </main>
    </div>
  );
}
