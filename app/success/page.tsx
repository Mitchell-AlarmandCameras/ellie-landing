"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/* ─────────────────────────────────────────────────────────────────
   /success — Google Ads conversion page
   Fires gtag conversion event, then redirects to /dashboard.
   verify-session redirects here after a completed Stripe checkout.
───────────────────────────────────────────────────────────────── */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export default function SuccessPage() {
  const router = useRouter();

  useEffect(() => {
    /* Fire Google Ads conversion if gtag is loaded */
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", "conversion", {
        send_to: process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID ?? "AW-CONVERSION_ID/CONVERSION_LABEL",
        value:   19.0,
        currency: "USD",
        transaction_id: "",
      });
    }

    /* Redirect to dashboard after a short delay so the event fires */
    const timer = setTimeout(() => {
      router.replace("/dashboard");
    }, 1200);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div style={{
      minHeight: "100vh", background: "#F5EFE4",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "Georgia, serif",
    }}>
      <div style={{ textAlign: "center" }}>
        <p style={{
          margin: "0 0 12px", color: "#C4956A", fontSize: "10px",
          letterSpacing: "0.38em", textTransform: "uppercase", fontFamily: "Arial, sans-serif",
        }}>
          The Style Refresh
        </p>
        <h1 style={{ margin: "0 0 16px", color: "#2C2C2C", fontSize: "28px", fontWeight: 400 }}>
          Welcome to the VIP Room.
        </h1>
        <p style={{ margin: 0, color: "#6B6560", fontSize: "14px", fontFamily: "Arial, sans-serif" }}>
          Taking you to your dashboard…
        </p>
      </div>
    </div>
  );
}
