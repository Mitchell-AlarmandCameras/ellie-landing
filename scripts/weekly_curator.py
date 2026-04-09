#!/usr/bin/env python3
"""
weekly_curator.py — Ellie Style Refresh automated outfit curator

Runs every Sunday (via Vercel Cron → /api/run-curator, or manually).
  1. Scrapes trending men's fashion from Mr Porter and Nordstrom.
  2. Uses Claude AI to curate 3 complete looks (Executive, Weekender, Wildcard).
  3. POSTs the draft to /api/weekly-draft which emails Ellie a preview with an
     "Approve" link.
  4. On Monday morning /api/send-weekly fires and broadcasts to all members.

Environment variables needed (Vercel Production):
  ANTHROPIC_API_KEY        — Claude API key for curation
  CURATOR_BASE_URL         — https://stylebyellie.com (your live site)
  CURATOR_APPROVE_SECRET   — random secret string (keep private); used to
                             authenticate the approve + send endpoints
  RESEND_NOTIFY_EMAIL      — Ellie's inbox (receives the Sunday draft preview)
"""

import os
import json
import sys
import time
import random
import datetime
import textwrap
import urllib.request
import urllib.error
import urllib.parse

# ─── Optional: anthropic SDK (falls back to http if not installed) ────────────
try:
    import anthropic as _anthropic_sdk
    ANTHROPIC_SDK = True
except ImportError:
    ANTHROPIC_SDK = False


# ═══════════════════════════════════════════════════════════════════════════════
# CONFIG
# ═══════════════════════════════════════════════════════════════════════════════

ANTHROPIC_KEY  = os.environ.get("ANTHROPIC_API_KEY", "")
BASE_URL       = os.environ.get("CURATOR_BASE_URL", "http://localhost:3000")
APPROVE_SECRET = os.environ.get("CURATOR_APPROVE_SECRET", "")

# Scrape targets — bestseller / new-arrival pages that return stable HTML
SCRAPE_SOURCES = [
    {
        "name": "Mr Porter — Clothing",
        "url":  "https://www.mrporter.com/en-us/mens/clothing",
        "hint": "luxury menswear, designer brands, structured fashion",
    },
    {
        "name": "Mr Porter — Shoes",
        "url":  "https://www.mrporter.com/en-us/mens/shoes",
        "hint": "luxury men's shoes, loafers, Oxfords, sneakers",
    },
    {
        "name": "Nordstrom — Men's Trending",
        "url":  "https://www.nordstrom.com/browse/men/clothing?filterByTrending=trending",
        "hint": "mid-to-high price menswear, accessible luxury, trending",
    },
    {
        "name": "SSENSE — Men's New Arrivals",
        "url":  "https://www.ssense.com/en-us/men/new-arrivals",
        "hint": "designer menswear, editorial, high-fashion new arrivals",
    },
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
}

# ═══════════════════════════════════════════════════════════════════════════════
# SCRAPER — fetches page text (titles, brands, prices)
# ═══════════════════════════════════════════════════════════════════════════════

def fetch_page_text(url: str) -> str:
    """Return truncated visible text from a page; silently return '' on error."""
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=12) as resp:
            raw = resp.read()
    except Exception as exc:
        print(f"  [scraper] Could not fetch {url}: {exc}", file=sys.stderr)
        return ""

    # Minimal HTML → text: strip tags, collapse whitespace
    import re
    text = raw.decode("utf-8", errors="ignore")
    text = re.sub(r"<style[^>]*>.*?</style>", " ", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<script[^>]*>.*?</script>", " ", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s{2,}", " ", text).strip()
    # Keep first 3,000 chars — enough for Claude to work with
    return text[:3000]


def scrape_all_sources() -> str:
    """Return combined snippet of scraped fashion text."""
    parts = []
    for src in SCRAPE_SOURCES:
        print(f"  Scraping: {src['name']} …")
        snippet = fetch_page_text(src["url"])
        if snippet:
            parts.append(f"### {src['name']} ({src['hint']})\n{snippet}\n")
        time.sleep(random.uniform(1.5, 3.0))  # polite delay

    return "\n".join(parts) if parts else "[No scraped data — using AI knowledge only]"


# ═══════════════════════════════════════════════════════════════════════════════
# AI CURATOR — calls Claude to generate 3 looks
# ═══════════════════════════════════════════════════════════════════════════════

SYSTEM_PROMPT = textwrap.dedent("""
You are Ellie, a private menswear stylist with twenty years dressing executives,
editors, and high-net-worth individuals. You run "The Style Refresh" — a $19/month
membership delivering three complete, sourced looks every Monday.

Tone: authoritative, specific, warm. No filler. Every word earns its place.
Voice: speak as if writing a short note to a trusted client, not a magazine spread.
""").strip()

USER_PROMPT_TEMPLATE = textwrap.dedent("""
It is Sunday. Generate this week's Monday Style Refresh brief.

Use the scraped fashion data below as inspiration for real brands, pieces,
and price points that are currently available or trending. You may supplement
with your own expert knowledge for any gaps.

SCRAPED DATA:
{scraped_data}

TODAY'S DATE: {today}

BRIEF REQUIREMENTS:
- Three complete looks: The Executive, The Weekender, The Wildcard
- Each look: 4–5 pieces with brand, price, a short buyer's note, and a real buyLink URL
- editorialLead: one sentence setting the season/mood for the week
- editorsNote per look: one sentence insider observation (specific, not generic)
- Prices: mix of accessible ($100–$400) and aspirational ($400–$2000+)
- buyLink: use the brand's actual domain homepage if unsure of deep link (better than a fake URL)

Return ONLY valid JSON matching this exact structure (no markdown, no extra text):

{{
  "weekOf": "April 14, 2026",
  "weekNumber": 2,
  "editorialLead": "…",
  "looks": [
    {{
      "index": "01",
      "label": "The Executive",
      "tagline": "…",
      "description": "…",
      "editorsNote": "…",
      "items": [
        {{ "piece": "…", "brand": "…", "price": "$…", "note": "…", "buyLink": "https://…" }}
      ]
    }},
    {{
      "index": "02",
      "label": "The Weekender",
      "tagline": "…",
      "description": "…",
      "editorsNote": "…",
      "items": [...]
    }},
    {{
      "index": "03",
      "label": "The Wildcard",
      "tagline": "…",
      "description": "…",
      "editorsNote": "…",
      "items": [...]
    }}
  ]
}}
""").strip()


def call_claude(scraped_data: str) -> dict:
    today = datetime.date.today().strftime("%B %d, %Y")
    prompt = USER_PROMPT_TEMPLATE.format(scraped_data=scraped_data, today=today)

    if ANTHROPIC_SDK:
        client = _anthropic_sdk.Anthropic(api_key=ANTHROPIC_KEY)
        msg = client.messages.create(
            model="claude-opus-4-5",
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = msg.content[0].text
    else:
        # Fallback: raw HTTPS call to Anthropic API
        payload = json.dumps({
            "model": "claude-opus-4-5",
            "max_tokens": 4096,
            "system": SYSTEM_PROMPT,
            "messages": [{"role": "user", "content": prompt}],
        }).encode()
        req = urllib.request.Request(
            "https://api.anthropic.com/v1/messages",
            data=payload,
            headers={
                "x-api-key": ANTHROPIC_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
        )
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read())
        raw = result["content"][0]["text"]

    # Strip any accidental markdown fences
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1]
    if raw.endswith("```"):
        raw = raw.rsplit("```", 1)[0]

    return json.loads(raw.strip())


# ═══════════════════════════════════════════════════════════════════════════════
# POST DRAFT TO SITE API
# ═══════════════════════════════════════════════════════════════════════════════

def post_draft(lookbook: dict) -> bool:
    """POST the curated lookbook to /api/weekly-draft for email preview + approval."""
    url = f"{BASE_URL.rstrip('/')}/api/weekly-draft"
    payload = json.dumps({
        "secret": APPROVE_SECRET,
        "lookbook": lookbook,
    }).encode()
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            result = json.loads(resp.read())
            print(f"  Draft posted: {result}")
            return True
    except Exception as exc:
        print(f"  [post_draft] Error: {exc}", file=sys.stderr)
        return False


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    print("=== Ellie Weekly Curator — Sunday Draft Generation ===")

    if not ANTHROPIC_KEY:
        print("ERROR: ANTHROPIC_API_KEY not set.", file=sys.stderr)
        sys.exit(1)
    if not APPROVE_SECRET:
        print("ERROR: CURATOR_APPROVE_SECRET not set.", file=sys.stderr)
        sys.exit(1)

    print("\n[1/3] Scraping fashion sources …")
    scraped = scrape_all_sources()

    print("\n[2/3] Asking Claude to curate this week's looks …")
    lookbook = call_claude(scraped)
    print(f"  Generated week: {lookbook.get('weekOf')} (#{lookbook.get('weekNumber')})")
    for look in lookbook.get("looks", []):
        print(f"    {look['index']} {look['label']}: {len(look.get('items', []))} items")

    print("\n[3/3] Sending draft to site for Ellie's approval …")
    ok = post_draft(lookbook)

    if ok:
        print("\n✓ Done. Ellie will receive an approval email shortly.")
    else:
        print("\n✗ Failed to post draft. Check BASE_URL and APPROVE_SECRET.", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
