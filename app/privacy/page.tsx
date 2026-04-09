import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — The Style Refresh",
  description: "How The Style Refresh collects, uses, and protects your personal information.",
};

const sections = [
  {
    heading: "1. Who We Are",
    body: `The Style Refresh ("we," "us," or "our") is a private fashion membership service operated by Ellie / The Style Refresh, based in New York State. We deliver a curated weekly fashion brief to paying subscribers via email. Our contact email is hello@thestylerefresh.com.`,
  },
  {
    heading: "2. Information We Collect",
    body: `We collect the following personal information:

• Name and email address — provided when you subscribe to the membership or join the waitlist.
• Payment information — collected and processed by Stripe, Inc. We never store, see, or handle your full card number, expiration date, or CVV.
• Session data — a single authentication cookie ("ellie_access") is set when you log into your membership to verify your access. This cookie expires after 30 days.
• Waitlist records — if you join the waitlist, we log your name and email in a temporary file. This is used solely to contact you when a membership spot opens.

We do not collect or use tracking pixels, advertising cookies, browser fingerprints, or behavioral analytics.`,
  },
  {
    heading: "3. How We Use Your Information",
    body: `We use your information exclusively to:

• Deliver your weekly Monday fashion brief.
• Send one-time transactional emails (welcome confirmation, billing receipts, cancellation confirmation).
• Contact waitlist applicants when a membership spot opens.
• Verify your active membership status for VIP Room access.

We do not use your information for advertising, profiling, or selling to third parties. Ever.`,
  },
  {
    heading: "4. Third-Party Services",
    body: `We share minimal data with the following trusted processors required to operate the service:

• Stripe, Inc. — processes your subscription payments. Stripe is PCI-DSS Level 1 compliant. Their privacy policy is available at stripe.com/privacy.
• Resend — sends transactional and membership emails on our behalf. Their privacy policy is available at resend.com/privacy.
• Vercel — hosts our website and serves our application. Their privacy policy is available at vercel.com/legal/privacy-policy.
• Anthropic — provides AI-assisted fashion research used internally to prepare weekly briefs. No subscriber personal data is shared with Anthropic.

No other third parties receive your data.`,
  },
  {
    heading: "5. Cookies",
    body: `We use one functional cookie:

• ellie_access — A session cookie set after successful Stripe checkout. It allows you to access the VIP Room without re-entering payment details. It expires after 30 days and contains no personal information.

We do not use advertising cookies, third-party tracking cookies, or analytics cookies. You may decline cookies using our cookie consent banner, but doing so will prevent access to the VIP Room.`,
  },
  {
    heading: "6. Data Retention",
    body: `• Active subscription data is retained for as long as your membership is active and for 7 years thereafter for legal and tax compliance purposes.
• Waitlist records are retained until a spot is offered to you or until you request removal.
• Email logs are retained by Resend for up to 30 days.
• Stripe payment records are retained in accordance with Stripe's data retention policies and applicable financial regulations.

When you cancel your subscription, you will continue to receive the current billing period's Monday briefs. After expiry, all active email delivery stops immediately.`,
  },
  {
    heading: "7. Your Rights (All Users)",
    body: `Regardless of where you live, you have the right to:

• Access: Request a copy of the personal data we hold about you.
• Correction: Ask us to correct inaccurate information.
• Deletion: Request erasure of your personal data. Note that we may retain billing records as required by law.
• Portability: Receive your personal data in a readable format.
• Withdraw consent: Cancel your subscription at any time to stop receiving marketing emails.

To exercise any of these rights, email hello@thestylerefresh.com. We will respond within 30 days.`,
  },
  {
    heading: "8. California Residents (CCPA)",
    body: `If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA):

• The right to know what personal information we collect, use, disclose, and sell.
• The right to delete your personal information.
• The right to opt out of the sale of personal information.

We do not sell your personal information to any third parties. We do not share it for cross-context behavioral advertising. To submit a CCPA request, email hello@thestylerefresh.com with the subject line "CCPA Request."`,
  },
  {
    heading: "9. European / UK Users (GDPR)",
    body: `If you are located in the European Economic Area or United Kingdom, our legal basis for processing your personal data is:

• Contract performance — processing your name and email to deliver the membership service you paid for.
• Legitimate interests — sending transactional emails related to your active subscription.

You have the right to lodge a complaint with your local supervisory authority. To submit a GDPR request, email hello@thestylerefresh.com with the subject line "GDPR Request." We will respond within 30 days.`,
  },
  {
    heading: "10. Security",
    body: `We implement reasonable administrative and technical safeguards to protect your personal information. All data is transmitted over HTTPS. Payment processing is handled entirely by Stripe, which maintains industry-leading security certifications. We do not store payment card data on our systems.`,
  },
  {
    heading: "11. Children's Privacy",
    body: `The Style Refresh is not directed to individuals under the age of 18. We do not knowingly collect personal information from minors. If you believe a minor has submitted information to us, contact us at hello@thestylerefresh.com and we will promptly delete it.`,
  },
  {
    heading: "12. Changes to This Policy",
    body: `We may update this Privacy Policy from time to time. When we do, we will update the "Last Updated" date at the top of this page. For material changes, we will notify active members by email at least 14 days before the change takes effect. Your continued use of the service constitutes acceptance of the updated policy.`,
  },
  {
    heading: "13. Contact Us",
    body: `For any privacy questions, data requests, or concerns:

Email: hello@thestylerefresh.com
Subject line: "Privacy Request"
Response time: Within 30 days`,
  },
];

export default function Privacy() {
  const updated = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="min-h-screen py-24 px-5 sm:px-8" style={{ background: "var(--cream)" }}>
      <div className="max-w-2xl mx-auto">

        <Link
          href="/"
          style={{
            fontFamily:    "Inter, sans-serif",
            color:         "var(--blush)",
            fontSize:      "0.78rem",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            textDecoration: "none",
          }}
        >
          ← Back
        </Link>

        <div className="mt-8 mb-10">
          <span
            style={{
              fontFamily:    "Inter, sans-serif",
              color:         "var(--blush)",
              fontSize:      "0.72rem",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
            }}
          >
            Legal
          </span>
          <h1
            className="mt-2 mb-1"
            style={{
              fontFamily: "DM Serif Display, serif",
              color:      "var(--charcoal)",
              fontSize:   "clamp(1.8rem, 5vw, 2.5rem)",
            }}
          >
            Privacy Policy
          </h1>
          <p style={{ fontFamily: "Inter, sans-serif", color: "var(--warm-gray)", fontSize: "0.8rem" }}>
            Last updated: {updated}
          </p>
          <p
            className="mt-4"
            style={{
              fontFamily: "Cormorant Garamond, serif",
              color:      "var(--charcoal-muted)",
              fontSize:   "1.05rem",
              lineHeight: "1.85",
            }}
          >
            Your privacy matters to us. This policy explains exactly what we collect, why we collect it,
            and how we protect it. We keep this simple because we keep our data practices simple.
          </p>
        </div>

        <div
          className="h-px mb-10"
          style={{ background: "linear-gradient(90deg, var(--sand-dark), transparent)", width: "72px" }}
        />

        {sections.map(({ heading, body }) => (
          <div key={heading} className="mb-10">
            <h2
              style={{
                fontFamily:   "DM Serif Display, serif",
                color:        "var(--charcoal)",
                fontSize:     "1.1rem",
                marginBottom: "10px",
                lineHeight:   "1.3",
              }}
            >
              {heading}
            </h2>
            <p
              style={{
                fontFamily: "Cormorant Garamond, serif",
                color:      "var(--charcoal-muted)",
                fontSize:   "1.05rem",
                lineHeight: "1.85",
                whiteSpace: "pre-line",
              }}
            >
              {body}
            </p>
          </div>
        ))}

        <div
          className="mt-12 p-6"
          style={{ background: "var(--cream-dark)", borderLeft: "2px solid var(--blush)" }}
        >
          <p
            style={{
              fontFamily: "Inter, sans-serif",
              color:      "var(--charcoal)",
              fontSize:   "0.82rem",
              lineHeight: "1.7",
            }}
          >
            <strong>Questions?</strong> Email us at{" "}
            <a href="mailto:hello@thestylerefresh.com" style={{ color: "var(--blush)" }}>
              hello@thestylerefresh.com
            </a>
            . We respond within 30 days.
          </p>
        </div>

      </div>
    </div>
  );
}
