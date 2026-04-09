"use client";

import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [email,   setEmail]   = useState("");
  const [status,  setStatus]  = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");

    try {
      const res  = await fetch("/api/member-login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus("sent");
        setMessage(data.message ?? "Check your email for a login link.");
      } else {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5"
      style={{ background: "var(--cream-dark)" }}
    >
      {/* Brand */}
      <div className="text-center mb-10">
        <Link href="/">
          <span
            style={{
              fontFamily:    "DM Serif Display, serif",
              color:         "var(--charcoal)",
              fontSize:      "1.4rem",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              display:       "block",
            }}
          >
            Ellie
          </span>
          <span
            style={{
              fontFamily:    "Inter, sans-serif",
              color:         "var(--blush)",
              fontSize:      "0.68rem",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              display:       "block",
              marginTop:     "2px",
            }}
          >
            The Style Refresh
          </span>
        </Link>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-sm"
        style={{
          background:  "#FDFAF5",
          border:      "1px solid var(--sand-border)",
          borderTop:   "2px solid var(--blush)",
          padding:     "2.5rem 2rem",
        }}
      >
        {status === "sent" ? (
          /* ── Success state ── */
          <div className="text-center">
            <div
              style={{
                fontFamily:    "Inter, sans-serif",
                color:         "var(--blush)",
                fontSize:      "0.72rem",
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                marginBottom:  "12px",
              }}
            >
              Check your inbox
            </div>
            <h1
              style={{
                fontFamily: "DM Serif Display, serif",
                color:      "var(--charcoal)",
                fontSize:   "1.5rem",
                fontWeight: 400,
                marginBottom: "12px",
              }}
            >
              Link sent.
            </h1>
            <p
              style={{
                fontFamily:  "Georgia, serif",
                color:       "var(--charcoal-muted)",
                fontSize:    "0.95rem",
                lineHeight:  1.7,
                marginBottom: "20px",
              }}
            >
              {message}
            </p>
            <p
              style={{
                fontFamily: "Inter, sans-serif",
                color:      "var(--warm-gray)",
                fontSize:   "0.78rem",
              }}
            >
              Didn&apos;t get it? Check spam, or{" "}
              <button
                onClick={() => setStatus("idle")}
                style={{ color: "var(--blush)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontSize: "0.78rem" }}
              >
                try again
              </button>
              .
            </p>
          </div>
        ) : (
          /* ── Form state ── */
          <>
            <p
              style={{
                fontFamily:    "Inter, sans-serif",
                color:         "var(--blush)",
                fontSize:      "0.72rem",
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                marginBottom:  "8px",
              }}
            >
              Member Access
            </p>
            <h1
              style={{
                fontFamily:   "DM Serif Display, serif",
                color:        "var(--charcoal)",
                fontSize:     "1.6rem",
                fontWeight:   400,
                marginBottom: "8px",
              }}
            >
              Enter the VIP Room.
            </h1>
            <p
              style={{
                fontFamily:   "Georgia, serif",
                color:        "var(--charcoal-muted)",
                fontSize:     "0.92rem",
                lineHeight:   1.7,
                marginBottom: "24px",
              }}
            >
              Enter the email you used to subscribe. We&apos;ll send you a secure one-click login link.
            </p>

            {status === "error" && (
              <div
                style={{
                  background:   "#FDF0ED",
                  border:       "1px solid #e8b4a8",
                  padding:      "10px 14px",
                  marginBottom: "16px",
                  fontSize:     "0.85rem",
                  color:        "#c0392b",
                  fontFamily:   "Inter, sans-serif",
                }}
              >
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  style={{
                    fontFamily:    "Inter, sans-serif",
                    fontSize:      "0.72rem",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color:         "var(--warm-gray)",
                    display:       "block",
                    marginBottom:  "6px",
                  }}
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  style={{
                    width:        "100%",
                    padding:      "10px 12px",
                    border:       "1px solid var(--sand-border)",
                    background:   "var(--cream)",
                    fontFamily:   "Inter, sans-serif",
                    fontSize:     "0.9rem",
                    color:        "var(--charcoal)",
                    outline:      "none",
                    boxSizing:    "border-box",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={status === "sending"}
                style={{
                  width:          "100%",
                  padding:        "12px",
                  background:     "var(--charcoal)",
                  color:          "#FDFAF5",
                  fontFamily:     "Inter, sans-serif",
                  fontSize:       "0.72rem",
                  letterSpacing:  "0.2em",
                  textTransform:  "uppercase",
                  border:         "none",
                  cursor:         status === "sending" ? "not-allowed" : "pointer",
                  opacity:        status === "sending" ? 0.7 : 1,
                }}
              >
                {status === "sending" ? "Sending…" : "Send login link"}
              </button>
            </form>

            <p
              style={{
                marginTop:  "20px",
                textAlign:  "center",
                fontFamily: "Inter, sans-serif",
                color:      "var(--warm-gray)",
                fontSize:   "0.78rem",
              }}
            >
              Not a member yet?{" "}
              <Link
                href="/#join"
                style={{ color: "var(--blush)", textDecoration: "none" }}
              >
                Join for $19/mo →
              </Link>
            </p>
          </>
        )}
      </div>

      <p
        style={{
          marginTop:  "24px",
          fontFamily: "Inter, sans-serif",
          color:      "var(--taupe)",
          fontSize:   "0.72rem",
        }}
      >
        <Link href="/" style={{ color: "var(--taupe)", textDecoration: "none" }}>
          ← Back to site
        </Link>
      </p>
    </div>
  );
}
