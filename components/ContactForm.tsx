"use client";
import { useState } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   ContactForm — lightweight support form.
   Used in the member dashboard and the site footer/contact section.
   Sends via /api/contact which both emails Ellie and auto-replies to the member.
═══════════════════════════════════════════════════════════════════════════ */

const INPUT = {
  width:         "100%",
  padding:       "10px 12px",
  border:        "1px solid #DDD4C5",
  background:    "#FDFAF5",
  fontFamily:    "Georgia, serif",
  fontSize:      "14px",
  color:         "#2C2C2C",
  outline:       "none",
  boxSizing:     "border-box" as const,
};

export default function ContactForm({ compact = false }: { compact?: boolean }) {
  const [fields,  setFields]  = useState({ name: "", email: "", type: "general", message: "" });
  const [status,  setStatus]  = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setError]  = useState("");

  function set(k: string, v: string) {
    setFields(f => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!fields.email.includes("@") || !fields.message.trim()) {
      setError("Please provide your email and a message.");
      return;
    }
    setStatus("sending");
    setError("");
    try {
      const res  = await fetch("/api/contact", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(fields),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (data.ok) {
        setStatus("sent");
      } else {
        setError(data.error ?? "Something went wrong. Please try again.");
        setStatus("error");
      }
    } catch {
      setError("Could not send. Check your connection and try again.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div style={{ padding: compact ? "16px 0" : "24px 0", textAlign: "center" }}>
        <p style={{ margin: "0 0 6px", fontSize: "17px", color: "#2C2C2C", fontFamily: "Georgia, serif" }}>
          Message received. ✓
        </p>
        <p style={{ margin: 0, fontSize: "13px", color: "#8A8580", fontFamily: "Arial, sans-serif" }}>
          You&rsquo;ll get a confirmation email shortly. Ellie will respond within 24 hours.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: compact ? "100%" : "520px" }}>
      <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
        <input
          placeholder="Your name"
          value={fields.name}
          onChange={e => set("name", e.target.value)}
          style={INPUT}
          autoComplete="name"
        />
        <input
          type="email"
          placeholder="Your email *"
          value={fields.email}
          onChange={e => set("email", e.target.value)}
          required
          style={INPUT}
          autoComplete="email"
        />
      </div>

      <select
        value={fields.type}
        onChange={e => set("type", e.target.value)}
        style={{ ...INPUT, marginBottom: "12px", cursor: "pointer", appearance: "none" as const }}
      >
        <option value="general">General question</option>
        <option value="billing">Billing or cancellation</option>
        <option value="content">Question about the brief</option>
        <option value="technical">Technical issue</option>
        <option value="other">Something else</option>
      </select>

      <textarea
        placeholder="Your message *"
        value={fields.message}
        onChange={e => set("message", e.target.value)}
        required
        rows={compact ? 4 : 5}
        style={{ ...INPUT, resize: "vertical", display: "block", marginBottom: "12px" }}
      />

      {errorMsg && (
        <p style={{ margin: "0 0 10px", fontSize: "12px", color: "#c0392b", fontFamily: "Arial, sans-serif" }}>
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        style={{
          background:    "#2C2C2C",
          color:         "#FDFAF5",
          border:        "none",
          padding:       "12px 28px",
          fontFamily:    "Arial, sans-serif",
          fontSize:      "11px",
          letterSpacing: "0.2em",
          textTransform: "uppercase" as const,
          cursor:        status === "sending" ? "default" : "pointer",
          opacity:       status === "sending" ? 0.6 : 1,
        }}
      >
        {status === "sending" ? "Sending…" : "Send Message"}
      </button>
    </form>
  );
}
