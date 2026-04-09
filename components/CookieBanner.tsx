"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem("ellie_cookie_consent");
      if (!consent) setVisible(true);
    } catch {
      // localStorage blocked (private browsing, etc.) — hide banner
    }
  }, []);

  const accept = () => {
    try { localStorage.setItem("ellie_cookie_consent", "accepted"); } catch { /* ignore */ }
    setVisible(false);
  };

  const decline = () => {
    try { localStorage.setItem("ellie_cookie_consent", "declined"); } catch { /* ignore */ }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-[200] md:bottom-4 md:left-4 md:right-auto md:max-w-sm"
      style={{
        background:   "var(--cream, #FDFAF5)",
        border:       "1px solid var(--sand-border, #DDD4C5)",
        borderBottom: "none",
        boxShadow:    "0 -4px 32px rgba(44,44,44,0.10)",
        padding:      "20px 22px",
      }}
    >
      {/* On desktop this becomes a small card in the bottom-left corner */}
      <style>{`@media(min-width:768px){[role="dialog"]{border-bottom:1px solid var(--sand-border,#DDD4C5)!important;}}`}</style>

      <p
        style={{
          fontFamily: "Inter, sans-serif",
          color:      "var(--charcoal, #2C2C2C)",
          fontSize:   "0.8rem",
          lineHeight: "1.6",
          marginBottom: "14px",
        }}
      >
        We use a single cookie to keep you logged in to your membership.
        No tracking, no advertising.{" "}
        <Link
          href="/privacy"
          style={{ color: "var(--blush, #C4956A)", textDecoration: "underline" }}
        >
          Privacy Policy
        </Link>
      </p>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={accept}
          style={{
            fontFamily:    "Inter, sans-serif",
            fontSize:      "0.72rem",
            fontWeight:    600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            background:    "var(--charcoal, #2C2C2C)",
            color:         "var(--cream, #FDFAF5)",
            border:        "none",
            padding:       "9px 18px",
            cursor:        "pointer",
            flex:          "1",
          }}
        >
          Accept
        </button>
        <button
          type="button"
          onClick={decline}
          style={{
            fontFamily:    "Inter, sans-serif",
            fontSize:      "0.72rem",
            fontWeight:    500,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            background:    "transparent",
            color:         "var(--warm-gray, #8A8580)",
            border:        "1px solid var(--sand-border, #DDD4C5)",
            padding:       "9px 18px",
            cursor:        "pointer",
          }}
        >
          Decline
        </button>
      </div>
    </div>
  );
}
