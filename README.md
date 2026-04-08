# Ellie — Landing Page

Premium Next.js 14 landing page for the Ellie private style membership.
Navy (#000080) + Gold (#D4AF37) on white. App Router · Tailwind CSS · Waitlist email capture.
Optimised for desktop and Samsung Galaxy S26 Ultra.

---

## Prerequisites

- **Node.js 18+** — [Download here](https://nodejs.org)

---

## Quick Start

```bash
# 1. Install Node.js from https://nodejs.org if you haven't already
# 2. Open a terminal in this folder (ellie-landing/)

npm install

# 3. Copy env file (optional — only needed when wiring up an email service)
cp .env.local.example .env.local

npm run dev
# → open http://localhost:3000
```

---

## Waitlist / Email Integration

By default the waitlist API saves submissions to `waitlist.txt` in the project root — no configuration needed.

When you're ready to connect a real email service, open `app/api/waitlist/route.ts` and uncomment one of the pre-wired integrations:

| Service | Env vars needed |
|---------|----------------|
| **Resend** (recommended) | `RESEND_API_KEY`, `RESEND_AUDIENCE_ID` |
| **Mailchimp** | `MAILCHIMP_API_KEY`, `MAILCHIMP_LIST_ID`, `MAILCHIMP_DC` |
| **ConvertKit** | `CONVERTKIT_API_KEY`, `CONVERTKIT_FORM_ID` |

---

## Project Structure

```
ellie-landing/
├── app/
│   ├── api/
│   │   └── waitlist/
│   │       └── route.ts        ← Waitlist API (pluggable email service)
│   ├── globals.css             ← Fonts, base styles, btn-gold utility
│   ├── layout.tsx              ← Root layout + metadata + viewport
│   └── page.tsx                ← Full landing page (client component)
├── components/
│   └── WaitlistModal.tsx       ← Email capture modal (bottom-sheet on mobile)
├── .env.local.example
├── package.json
├── tailwind.config.ts          ← Navy/gold colour tokens
└── tsconfig.json
```

---

## Sections

| Section | Description |
|---------|-------------|
| **Hero** | Full-viewport with headline, sub-copy, and "Apply for the Inner Circle" button |
| **The Waitlist** | Modal/bottom-sheet triggered by CTA — email capture with loading + success states |
| **The Lore** | Navy-background section with Ellie's quote and 3 credential stats |
| **The Style Grid** | 3-column responsive grid — The Executive, The Weekender, The Wildcard |
| **Apply Banner** | Final navy CTA section |

---

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Add any email service env vars in **Project → Settings → Environment Variables**.

---

## Customisation

| What | Where |
|------|-------|
| Headlines & copy | `app/page.tsx` |
| Style grid cards | `styleCards` array in `app/page.tsx` |
| Colour tokens | `tailwind.config.ts` → `theme.extend.colors` |
| Fonts | `app/globals.css` Google Fonts import |
| Email service | `app/api/waitlist/route.ts` |
| Modal copy | `components/WaitlistModal.tsx` |
