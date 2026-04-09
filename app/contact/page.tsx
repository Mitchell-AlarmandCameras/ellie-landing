import type { Metadata } from "next";
import Link from "next/link";
import ContactForm from "@/components/ContactForm";
import React from "react";

export const metadata: Metadata = {
  title: "Contact | The Style Refresh",
  description: "Questions about your membership, billing, or the Monday brief? Ellie personally reads and responds to every message within 24 hours.",
  robots: { index: true, follow: true },
};

export default function ContactPage() {
  return (
    <div style={{ background: "#F5EFE4", minHeight: "100vh", fontFamily: "Georgia, serif" }}>

      {/* ── Nav ── */}
      <nav style={{
        background: "#2C2C2C", padding: "0 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: "52px",
      }}>
        <Link href="/" style={{
          color: "#FDFAF5", fontFamily: "Arial, sans-serif", fontSize: "11px",
          letterSpacing: "0.28em", textTransform: "uppercase", textDecoration: "none",
        }}>
          ← Ellie · The Style Refresh
        </Link>
        <Link href="/#join" style={{
          background: "#C4956A", color: "#FDFAF5", padding: "8px 18px",
          fontFamily: "Arial, sans-serif", fontSize: "10px", letterSpacing: "0.2em",
          textTransform: "uppercase", textDecoration: "none",
        }}>
          Join $19/mo
        </Link>
      </nav>

      {/* ── Header ── */}
      <div style={{
        background: "#EDE5D8", padding: "52px 24px 40px", textAlign: "center",
        borderBottom: "1px solid #DDD4C5",
      }}>
        <p style={{
          margin: "0 0 10px", color: "#C4956A", fontSize: "10px",
          letterSpacing: "0.34em", textTransform: "uppercase", fontFamily: "Arial, sans-serif",
        }}>
          Ellie · The Style Refresh
        </p>
        <h1 style={{ margin: "0 0 12px", color: "#2C2C2C", fontSize: "32px", fontWeight: 400 }}>
          Get in Touch
        </h1>
        <p style={{
          margin: "0 auto", maxWidth: "480px", color: "#6B6560",
          fontSize: "15px", lineHeight: 1.75,
        }}>
          I personally read and respond to every message — usually within a few hours, 
          always within 24. No support tickets. No chatbots.
        </p>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: "880px", margin: "0 auto", padding: "56px 24px" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "56px",
          alignItems: "start",
        }}>

          {/* Left — form */}
          <div>
            <p style={{
              margin: "0 0 24px", fontSize: "13px",
              letterSpacing: "0.24em", textTransform: "uppercase",
              color: "#C4956A", fontFamily: "Arial, sans-serif",
            }}>
              Send a Message
            </p>
            <ContactForm />
          </div>

          {/* Right — FAQ quick answers */}
          <div>
            <p style={{
              margin: "0 0 20px", fontSize: "13px",
              letterSpacing: "0.24em", textTransform: "uppercase",
              color: "#C4956A", fontFamily: "Arial, sans-serif",
            }}>
              Quick Answers
            </p>
            {[
              {
                q: "When does the brief arrive?",
                a: "Every Monday at 7:00 AM Eastern. If it's not in your inbox, check your spam and mark us as safe.",
              },
              {
                q: "How do I cancel?",
                a: "Visit your member dashboard and click Manage Subscription. Cancellation is instant — no forms, no phone calls.",
              },
              {
                q: "Can I get a refund?",
                a: "Memberships are billed monthly and non-refundable for the current period. Cancel before your renewal date and you won't be charged again.",
              },
              {
                q: "I lost access to my account.",
                a: "Reply to your original welcome email and I'll restore access manually within a few hours.",
              },
              {
                q: "Can I pause my membership?",
                a: "Not yet — but cancelling and rejoining later is always an option. Your spot is never closed.",
              },
            ].map(({ q, a }, i) => (
              <div key={i} style={{
                padding: "16px 0",
                borderBottom: "1px solid #DDD4C5",
              }}>
                <p style={{ margin: "0 0 6px", fontSize: "14px", color: "#2C2C2C", fontWeight: "bold" as const }}>
                  {q}
                </p>
                <p style={{ margin: 0, fontSize: "13px", color: "#6B6560", lineHeight: 1.7 }}>
                  {a}
                </p>
              </div>
            ))}

            <p style={{
              margin: "20px 0 0", fontSize: "12px", color: "#8A8580",
              fontFamily: "Arial, sans-serif", lineHeight: 1.6,
            }}>
              For anything not covered above, use the form — or email directly:{" "}
              <a
                href={`mailto:${process.env.RESEND_FROM_EMAIL ?? "ellie@stylebyellie.com"}`}
                style={{ color: "#C4956A", textDecoration: "none" }}
              >
                {process.env.RESEND_FROM_EMAIL ?? "ellie@stylebyellie.com"}
              </a>
            </p>
          </div>

        </div>
      </div>

      {/* ── Footer ── */}
      <footer style={{ background: "#1A1A1A", padding: "24px", textAlign: "center" }}>
        <p style={{ margin: 0, color: "#5A5550", fontSize: "11px", fontFamily: "Arial, sans-serif" }}>
          © {new Date().getFullYear()} The Style Refresh &nbsp;·&nbsp;
          <Link href="/blog"    style={{ color: "#8A8580", textDecoration: "none" }}>The Edit</Link>
          &nbsp;·&nbsp;
          <Link href="/privacy" style={{ color: "#8A8580", textDecoration: "none" }}>Privacy</Link>
          &nbsp;·&nbsp;
          <Link href="/terms"   style={{ color: "#8A8580", textDecoration: "none" }}>Terms</Link>
        </p>
      </footer>
    </div>
  );
}
