"use client";
import { useState } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   ReferralButton — client component rendered inside the member dashboard.
   Calls /api/referral/generate with the customer's Stripe ID and shows
   the shareable link. One click to copy.
═══════════════════════════════════════════════════════════════════════════ */

export default function ReferralButton({ customerId }: { customerId: string }) {
  const [state, setState]     = useState<"idle" | "loading" | "done" | "error">("idle");
  const [link, setLink]       = useState("");
  const [copied, setCopied]   = useState(false);

  async function generate() {
    if (!customerId) return;
    setState("loading");
    try {
      const res = await fetch("/api/referral/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ customerId }),
      });
      const data = await res.json() as { referralUrl?: string };
      if (data.referralUrl) {
        setLink(data.referralUrl);
        setState("done");
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* Fallback — select the text */
    }
  }

  if (state === "idle") {
    return (
      <button
        onClick={generate}
        style={{
          background:     "#2C2C2C",
          color:          "#FDFAF5",
          border:         "none",
          padding:        "11px 26px",
          fontFamily:     "Arial, sans-serif",
          fontSize:       "11px",
          letterSpacing:  "0.2em",
          textTransform:  "uppercase" as const,
          cursor:         "pointer",
          display:        "inline-block",
        }}
      >
        Get My Referral Link
      </button>
    );
  }

  if (state === "loading") {
    return (
      <p style={{ fontFamily: "Arial, sans-serif", fontSize: "12px", color: "#8A8580" }}>
        Generating your link…
      </p>
    );
  }

  if (state === "error") {
    return (
      <p style={{ fontFamily: "Arial, sans-serif", fontSize: "12px", color: "#c0392b" }}>
        Could not generate link. Please try again.
      </p>
    );
  }

  /* done — show the link */
  return (
    <div>
      <p style={{ margin: "0 0 8px", fontSize: "12px", color: "#6B6560", fontFamily: "Arial, sans-serif" }}>
        Share this link — your friend gets 50% off their first month:
      </p>
      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" as const }}>
        <input
          readOnly
          value={link}
          style={{
            flex:           1,
            minWidth:       "200px",
            padding:        "9px 12px",
            border:         "1px solid #DDD4C5",
            background:     "#F5EFE4",
            fontFamily:     "Arial, sans-serif",
            fontSize:       "12px",
            color:          "#2C2C2C",
            outline:        "none",
          }}
        />
        <button
          onClick={copyLink}
          style={{
            background:    copied ? "#4A6741" : "#C4956A",
            color:         "#FDFAF5",
            border:        "none",
            padding:       "9px 18px",
            fontFamily:    "Arial, sans-serif",
            fontSize:      "11px",
            letterSpacing: "0.18em",
            textTransform: "uppercase" as const,
            cursor:        "pointer",
            whiteSpace:    "nowrap" as const,
          }}
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <p style={{ margin: "10px 0 0", fontSize: "11px", color: "#8A8580", fontFamily: "Arial, sans-serif" }}>
        No limit on referrals. Every friend you send earns them a discount — and keeps you in good company.
      </p>
    </div>
  );
}
