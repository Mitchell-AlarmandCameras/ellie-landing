"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [status,   setStatus]   = useState<"idle" | "loading" | "error">("idle");
  const [error,    setError]    = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStatus("loading");

    try {
      const res  = await fetch("/api/member-login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json() as { success?: boolean; redirect?: string; error?: string };

      if (data.success && data.redirect) {
        router.push("/dashboard");
      } else {
        setStatus("error");
        setError(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setError("Network error. Please check your connection and try again.");
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
          <span style={{ fontFamily: "DM Serif Display, serif", color: "var(--charcoal)", fontSize: "1.4rem", letterSpacing: "0.22em", textTransform: "uppercase", display: "block" }}>
            Ellie
          </span>
          <span style={{ fontFamily: "Inter, sans-serif", color: "var(--blush)", fontSize: "0.68rem", letterSpacing: "0.22em", textTransform: "uppercase", display: "block", marginTop: "2px" }}>
            The Style Refresh
          </span>
        </Link>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm" style={{ background: "#FDFAF5", border: "1px solid var(--sand-border)", borderTop: "2px solid var(--blush)", padding: "2.5rem 2rem" }}>

        <p style={{ fontFamily: "Inter, sans-serif", color: "var(--blush)", fontSize: "0.72rem", letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: "8px" }}>
          Member Access
        </p>
        <h1 style={{ fontFamily: "DM Serif Display, serif", color: "var(--charcoal)", fontSize: "1.6rem", fontWeight: 400, marginBottom: "6px" }}>
          Enter the VIP Room.
        </h1>
        <p style={{ fontFamily: "Georgia, serif", color: "var(--charcoal-muted)", fontSize: "0.88rem", lineHeight: 1.65, marginBottom: "24px" }}>
          Sign in with your membership email and password. First time? Choose any password — we&apos;ll remember it for you.
        </p>

        {/* Error banner */}
        {status === "error" && error && (
          <div style={{ background: "#FDF0ED", border: "1px solid #e8b4a8", padding: "10px 14px", marginBottom: "18px", fontSize: "0.85rem", color: "#c0392b", fontFamily: "Inter, sans-serif", lineHeight: 1.5 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div style={{ marginBottom: "16px" }}>
            <label htmlFor="email" style={{ fontFamily: "Inter, sans-serif", fontSize: "0.72rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--warm-gray)", display: "block", marginBottom: "6px" }}>
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--sand-border)", background: "var(--cream)", fontFamily: "Inter, sans-serif", fontSize: "0.9rem", color: "var(--charcoal)", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: "24px" }}>
            <label htmlFor="password" style={{ fontFamily: "Inter, sans-serif", fontSize: "0.72rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--warm-gray)", display: "block", marginBottom: "6px" }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="password"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="Your password (min. 6 characters)"
                style={{ width: "100%", padding: "10px 40px 10px 12px", border: "1px solid var(--sand-border)", background: "var(--cream)", fontFamily: "Inter, sans-serif", fontSize: "0.9rem", color: "var(--charcoal)", outline: "none", boxSizing: "border-box" }}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--warm-gray)", fontSize: "0.75rem", fontFamily: "Inter, sans-serif" }}
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
            <p style={{ marginTop: "6px", fontFamily: "Inter, sans-serif", fontSize: "0.72rem", color: "var(--warm-gray)" }}>
              First time logging in? Just create a password now and use it every time.
            </p>
          </div>

          <button
            type="submit"
            disabled={status === "loading"}
            style={{ width: "100%", padding: "13px", background: "var(--charcoal)", color: "#FDFAF5", fontFamily: "Inter, sans-serif", fontSize: "0.72rem", letterSpacing: "0.2em", textTransform: "uppercase", border: "none", cursor: status === "loading" ? "not-allowed" : "pointer", opacity: status === "loading" ? 0.7 : 1 }}
          >
            {status === "loading" ? "Signing in…" : "Enter the VIP Room →"}
          </button>
        </form>

        <p style={{ marginTop: "20px", textAlign: "center", fontFamily: "Inter, sans-serif", color: "var(--warm-gray)", fontSize: "0.78rem" }}>
          Not a member yet?{" "}
          <Link href="/#join" style={{ color: "var(--blush)", textDecoration: "none" }}>
            Join for $19/mo →
          </Link>
        </p>
      </div>

      <p style={{ marginTop: "24px", fontFamily: "Inter, sans-serif", color: "var(--taupe)", fontSize: "0.72rem" }}>
        <Link href="/" style={{ color: "var(--taupe)", textDecoration: "none" }}>
          ← Back to site
        </Link>
      </p>
    </div>
  );
}
