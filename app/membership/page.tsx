import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Membership & billing",
  description:
    "How The Style Refresh membership works: month-to-month billing, cancellation, and access.",
};

export default function MembershipPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--cream)" }}>
      <header
        className="sticky top-0 z-40 border-b"
        style={{
          background: "rgba(253,250,245,0.95)",
          backdropFilter: "blur(20px)",
          borderColor: "var(--sand-border)",
        }}
      >
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex flex-col leading-none">
            <span
              style={{
                fontFamily: "DM Serif Display, serif",
                color: "var(--charcoal)",
                fontSize: "1rem",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
              }}
            >
              Ellie
            </span>
            <span
              style={{
                fontFamily: "Inter, sans-serif",
                color: "var(--blush)",
                fontSize: "0.66rem",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                marginTop: "1px",
              }}
            >
              The Style Refresh
            </span>
          </div>
          <Link
            href="/"
            className="text-xs uppercase tracking-widest transition-colors"
            style={{
              fontSize: "0.78rem",
              fontFamily: "Inter, sans-serif",
              letterSpacing: "0.15em",
              color: "var(--warm-gray)",
            }}
          >
            ← Home
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 sm:px-8 py-14 sm:py-20">
        <p
          className="section-label block mb-3"
          style={{ fontSize: "0.75rem", letterSpacing: "0.28em" }}
        >
          Legal &amp; billing
        </p>
        <h1
          className="font-bold mb-4"
          style={{
            fontFamily: "DM Serif Display, serif",
            color: "var(--charcoal)",
            fontSize: "clamp(1.75rem, 5vw, 2.35rem)",
            lineHeight: "1.15",
          }}
        >
          Membership &amp; billing
        </h1>
        <p
          className="mb-10 leading-relaxed"
          style={{
            fontFamily: "Cormorant Garamond, serif",
            color: "var(--charcoal-muted)",
            fontSize: "1.15rem",
            lineHeight: "1.85",
          }}
        >
          Plain-language summary of how your subscription works. For payment processing we use{" "}
          <a
            href="https://stripe.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--blush)", textDecoration: "underline", textUnderlineOffset: "3px" }}
          >
            Stripe
          </a>
          . You can manage or cancel your subscription anytime through the billing portal linked from
          your account emails or the VIP Room.
        </p>

        <div
          className="h-px w-full mb-12"
          style={{ background: "linear-gradient(90deg, transparent, var(--sand-dark), transparent)" }}
        />

        <section className="mb-12">
          <h2
            className="font-bold mb-4"
            style={{
              fontFamily: "DM Serif Display, serif",
              color: "var(--charcoal)",
              fontSize: "1.35rem",
            }}
          >
            Month-to-month membership
          </h2>
          <div
            className="space-y-4"
            style={{
              fontFamily: "Cormorant Garamond, serif",
              color: "var(--charcoal-muted)",
              fontSize: "1.08rem",
              lineHeight: "1.85",
            }}
          >
            <p>
              The Style Refresh is billed as a <strong style={{ color: "var(--charcoal)", fontWeight: 600 }}>month-to-month</strong>{" "}
              subscription. There is no long-term contract or minimum number of months. Each payment covers your
              membership for about the next billing period (typically one month), until you cancel or your
              payment method fails.
            </p>
            <p>
              The current public price is <strong style={{ color: "var(--charcoal)", fontWeight: 600 }}>$19 per month</strong>{" "}
              (plus applicable taxes where required). Stripe charges your card automatically on each renewal date.
            </p>
          </div>
        </section>

        <section className="mb-12">
          <h2
            className="font-bold mb-4"
            style={{
              fontFamily: "DM Serif Display, serif",
              color: "var(--charcoal)",
              fontSize: "1.35rem",
            }}
          >
            Cancel anytime
          </h2>
          <div
            className="space-y-4"
            style={{
              fontFamily: "Cormorant Garamond, serif",
              color: "var(--charcoal-muted)",
              fontSize: "1.08rem",
              lineHeight: "1.85",
            }}
          >
            <p>
              You may cancel your membership at any time. When you cancel,{" "}
              <strong style={{ color: "var(--charcoal)", fontWeight: 600 }}>
                you keep access through the end of the billing period you already paid for
              </strong>
              . You will not be charged again after that period ends, unless you subscribe again later.
            </p>
            <p>
              How cancellation is processed in your account (for example, “cancel at end of period” vs. immediate)
              is controlled in Stripe’s customer billing experience. If you’re unsure, check the confirmation shown
              when you cancel, or contact us using the email on your receipts.
            </p>
          </div>
        </section>

        <section className="mb-12">
          <h2
            className="font-bold mb-4"
            style={{
              fontFamily: "DM Serif Display, serif",
              color: "var(--charcoal)",
              fontSize: "1.35rem",
            }}
          >
            When your subscription ends
          </h2>
          <div
            className="space-y-4"
            style={{
              fontFamily: "Cormorant Garamond, serif",
              color: "var(--charcoal-muted)",
              fontSize: "1.08rem",
              lineHeight: "1.85",
            }}
          >
            <p>
              After your subscription ends (because you canceled, a payment did not go through, or you asked to
              close your account),{" "}
              <strong style={{ color: "var(--charcoal)", fontWeight: 600 }}>
                recurring charges stop
              </strong>
              . Member-only benefits—including access to the VIP Room and weekly briefs tied to active
              membership—are intended to be available only while your subscription is in good standing.
            </p>
            <p>
              If you join again later, billing resumes on the new subscription terms in effect at that time.
            </p>
          </div>
        </section>

        <section className="mb-12">
          <h2
            className="font-bold mb-4"
            style={{
              fontFamily: "DM Serif Display, serif",
              color: "var(--charcoal)",
              fontSize: "1.35rem",
            }}
          >
            Refunds &amp; billing questions
          </h2>
          <p
            style={{
              fontFamily: "Cormorant Garamond, serif",
              color: "var(--charcoal-muted)",
              fontSize: "1.08rem",
              lineHeight: "1.85",
            }}
          >
            If you believe you were charged in error, reply to any membership email or use the contact information
            on your Stripe receipt. We handle refund requests fairly and in line with applicable law; many issues
            can be resolved quickly by checking your subscription status in the billing portal first.
          </p>
        </section>

        <section
          className="p-6 sm:p-8"
          style={{
            background: "var(--cream-dark)",
            border: "1px solid var(--sand-border)",
            borderTop: "2px solid var(--blush)",
          }}
        >
          <p
            className="mb-2"
            style={{
              fontFamily: "Inter, sans-serif",
              color: "var(--blush)",
              fontSize: "0.72rem",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontWeight: 500,
            }}
          >
            Summary
          </p>
          <ul
            className="space-y-2 list-disc pl-5"
            style={{
              fontFamily: "Cormorant Garamond, serif",
              color: "var(--charcoal-muted)",
              fontSize: "1.05rem",
              lineHeight: "1.75",
            }}
          >
            <li>
              <strong style={{ color: "var(--charcoal)" }}>Month-to-month</strong> — no multi-month lock-in.
            </li>
            <li>
              <strong style={{ color: "var(--charcoal)" }}>Cancel anytime</strong> — no future charges after you cancel;
              you keep what you already paid for through that period.
            </li>
            <li>
              <strong style={{ color: "var(--charcoal)" }}>When it ends</strong> — charges stop; member access aligns with
              an active subscription.
            </li>
          </ul>
        </section>

        <p
          className="mt-12 text-center text-xs"
          style={{ fontFamily: "Inter, sans-serif", color: "var(--taupe)", letterSpacing: "0.06em" }}
        >
          This page is a customer-friendly summary. A full Terms of Service may be added as your business grows.
        </p>
      </main>

      <footer
        className="py-8 px-5 sm:px-8 border-t"
        style={{ background: "var(--cream)", borderColor: "var(--sand-border)" }}
      >
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" style={{ fontFamily: "Inter, sans-serif", color: "var(--warm-gray)", fontSize: "0.82rem" }}>
            ← Back to Ellie
          </Link>
          <p style={{ fontFamily: "Inter, sans-serif", color: "var(--warm-gray)", fontSize: "0.78rem" }}>
            © {new Date().getFullYear()} Ellie · The Style Refresh
          </p>
        </div>
      </footer>
    </div>
  );
}
