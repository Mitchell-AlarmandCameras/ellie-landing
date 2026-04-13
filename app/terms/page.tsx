import Link from "next/link";

export const metadata = {
  title: "Terms of Service — The Style Refresh",
  description: "Terms governing your use of The Style Refresh membership service.",
};

const sections = [
  {
    heading: "1. Agreement",
    body: `By subscribing to or using The Style Refresh ("Service"), you agree to these Terms of Service ("Terms"). If you do not agree, do not use the Service. These Terms constitute a binding agreement between you and The Style Refresh, operated in New York State.`,
  },
  {
    heading: "2. The Service",
    body: `The Style Refresh is a private membership that delivers three curated fashion looks to your email inbox every Monday morning. Each brief includes editorial descriptions, sourcing notes, and brand and price for every item. Membership also includes access to the VIP Room — an archive of all previously published briefs.

The specific looks, brands, and price points featured each week are selected at our sole editorial discretion.`,
  },
  {
    heading: "3. Eligibility",
    body: `You must be at least 18 years of age to subscribe. By subscribing, you represent that you are at least 18 years old and that you have the legal capacity to enter into this agreement. The Service is available to residents of the United States and internationally, subject to applicable local laws.`,
  },
  {
    heading: "4. Subscription & Billing",
    body: `• Membership is billed at $19 USD per month.
• Your subscription renews automatically each month on the same calendar date as your original purchase.
• By completing checkout, you authorize this recurring monthly charge to your payment method on file.
• All billing is processed by Stripe, Inc. You agree to Stripe's terms of service at stripe.com/legal.
• We reserve the right to change the subscription price with 30 days' advance notice to active subscribers. Price changes will not apply to your current billing cycle.
• All fees are non-refundable except as expressly stated in Section 5 (Cancellation & Refunds).`,
  },
  {
    heading: "5. Cancellation & Refunds",
    body: `You may cancel your subscription at any time:

• From the member dashboard ("Manage Billing")
• By emailing hello@thestylerefresh.com
• Through the Stripe customer portal

Cancellation takes effect at the end of your current billing period. You retain full access — including VIP Room and Monday briefs — until that date. No partial-month refunds are issued.

Exception: If you experience a technical failure that prevents you from accessing any Monday brief during your first 30 days of membership, contact us within 7 days and we will issue a full refund at our discretion.`,
  },
  {
    heading: "6. Content & Intellectual Property",
    body: `All editorial content, curation, sourcing notes, look descriptions, and design elements of The Style Refresh are our intellectual property and are protected by copyright law.

You may use our recommendations, sourcing notes, and looks for your own personal shopping and style decisions. You may not:

• Republish, resell, license, or distribute our curated content
• Share membership credentials or provide access to non-subscribers
• Screen-record or screenshot the VIP Room for commercial purposes
• Represent our curation as your own

Links to third-party retailers are provided for your convenience. We have no control over third-party websites, their content, pricing, or availability.`,
  },
  {
    heading: "7. Editorial Integrity",
    body: `The Style Refresh is a fully editorial membership. We do not use affiliate links and are not compensated by any brand, retailer, or product manufacturer featured in our briefs. Every item is selected solely on the basis of editorial merit — quality, fit, value, and relevance to the week's looks.

Our recommendations reflect our honest opinion. This editorial independence is fundamental to the membership.`,
  },
  {
    heading: "8. Disclaimer of Warranties",
    body: `THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT:

• The Service will be uninterrupted or error-free
• Any specific items featured in our briefs will remain available or at the stated price
• The style recommendations will meet your personal preferences

Fashion products featured in our briefs are sourced from third-party retailers. We do not sell, warehouse, ship, or fulfill any products. All purchases are made directly with third-party retailers and subject to their terms.`,
  },
  {
    heading: "9. Limitation of Liability",
    body: `TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE STYLE REFRESH SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF, OR INABILITY TO USE, THE SERVICE — INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR GOODWILL.

OUR TOTAL LIABILITY TO YOU FOR ANY CLAIM ARISING FROM THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID TO US IN THE 30 DAYS PRECEDING THE CLAIM.

Some jurisdictions do not allow the exclusion of certain warranties or the limitation of liability, so some of the above may not apply to you.`,
  },
  {
    heading: "10. Indemnification",
    body: `You agree to indemnify and hold harmless The Style Refresh and its operators, affiliates, and service providers from and against any claims, damages, liabilities, costs, and expenses (including reasonable attorneys' fees) arising from your breach of these Terms or your use of the Service in violation of applicable law.`,
  },
  {
    heading: "11. Privacy",
    body: `Your use of the Service is also governed by our Privacy Policy, available at thestylerefresh.com/privacy. By subscribing, you agree to the collection and use of your information as described therein.`,
  },
  {
    heading: "12. Third-Party Links",
    body: `Our Monday briefs and website contain links to third-party retailers and websites. These links are provided for convenience only. We have no control over the content, availability, or practices of third-party sites and accept no responsibility for them. Purchasing from third-party retailers is subject to their terms, return policies, and privacy practices.`,
  },
  {
    heading: "13. Modifications to the Service",
    body: `We reserve the right to modify, suspend, or discontinue the Service at any time with reasonable notice. If we permanently discontinue the Service, we will provide at least 30 days' notice and refund any prepaid unused subscription fees on a pro-rata basis.

We may update these Terms at any time. We will notify active subscribers by email at least 14 days before material changes take effect. Your continued use of the Service after the effective date constitutes acceptance of the revised Terms.`,
  },
  {
    heading: "14. Governing Law & Dispute Resolution",
    body: `These Terms are governed by the laws of the State of New York, without regard to conflict of law principles.

Any dispute arising out of or relating to these Terms or the Service that cannot be resolved informally shall be submitted to binding arbitration administered by the American Arbitration Association (AAA) under its Consumer Arbitration Rules, with proceedings conducted in New York County, New York.

You waive any right to a jury trial or to participate in a class-action lawsuit or class-wide arbitration with respect to any dispute arising from these Terms.

This arbitration clause does not prevent either party from seeking emergency injunctive relief in a court of competent jurisdiction.`,
  },
  {
    heading: "15. Entire Agreement",
    body: `These Terms, together with the Privacy Policy, constitute the entire agreement between you and The Style Refresh regarding the Service and supersede all prior agreements and understandings. If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in full effect.`,
  },
  {
    heading: "16. Contact",
    body: `Questions about these Terms:

Email: hello@thestylerefresh.com
Subject: "Terms Question"
Response time: Within 7 business days`,
  },
];

export default function Terms() {
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
            Terms of Service
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
            Please read these terms carefully before subscribing. They explain your rights,
            our obligations, and what happens if things go wrong.
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
            <strong>Questions?</strong> Email{" "}
            <a href="mailto:hello@thestylerefresh.com" style={{ color: "var(--blush)" }}>
              hello@thestylerefresh.com
            </a>
            . We respond within 7 business days.
          </p>
        </div>

      </div>
    </div>
  );
}
