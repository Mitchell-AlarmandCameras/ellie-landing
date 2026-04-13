/* ═══════════════════════════════════════════════════════════════
   STATIC SEO BLOG POSTS — The Style Refresh
   These are always available even without Vercel Blob.
   Target: organic Google search traffic for fashion queries.
   ═══════════════════════════════════════════════════════════════ */

export interface StaticPost {
  slug:          string;
  title:         string;
  metaTitle:     string;
  metaDesc:      string;
  publishedAt:   string;
  category:      string;
  readTime:      string;
  intro:         string;
  sections:      { heading: string; body: string }[];
  closingCta:    string;
}

export const staticBlogPosts: StaticPost[] = [

  /* ── POST 1 ──────────────────────────────────────────────── */
  {
    slug:        "spring-2026-capsule-wardrobe-women",
    title:       "The Spring 2026 Capsule Wardrobe: 3 Complete Looks That Cover Everything",
    metaTitle:   "Spring 2026 Capsule Wardrobe for Women: 3 Looks, Every Occasion Covered",
    metaDesc:    "Build a spring 2026 capsule wardrobe with just three complete outfits. Real pieces, every item by brand and price, styled by a 20-year fashion consultant.",
    publishedAt: "2026-04-07",
    category:    "Style Guide",
    readTime:    "6 min read",
    intro:
      "The capsule wardrobe concept gets overcomplicated. You don't need forty pieces that all supposedly work together — you need three looks that are completely resolved. One for work, one for the weekend, one for everything else. Here's exactly how to build that for Spring 2026, with the real pieces worth buying and the ones worth skipping.",
    sections: [
      {
        heading: "Why Three Looks Beat Forty Pieces Every Time",
        body:
          "Most capsule wardrobe guides focus on individual items: a white shirt, a straight-leg jean, a blazer. The problem is that you can own all of those things and still stare at your closet every morning with nothing to wear. The missing piece is resolution — knowing exactly how those items work together as a complete outfit. Three fully resolved looks takes the decision out of your morning entirely. You know what you're wearing. You know it works. You move on.",
      },
      {
        heading: "Look 1: The Work Look That Goes to Dinner",
        body:
          "Spring 2026 executive dressing is built on the ivory blazer. Not because it's trendy — because it's one of the few pieces that makes everything underneath it look more considered. The J.Crew Parke blazer in ivory bi-stretch cotton ($148) with Theory wide-leg black trousers and a washable Quince silk cami underneath is the combination that works in a meeting at 9 AM and at a restaurant at 8 PM without changing a single thing. The silk cami does the quiet work — cream under ivory reads as tonal dressing, which is always right. Add a block-heel pump and a structured leather tote and the look is complete.",
      },
      {
        heading: "Look 2: The Weekend Look That Photographs Well",
        body:
          "The spring weekend uniform that's showing up everywhere right now: linen wide-leg pants, a fitted white tee, and white leather sneakers. The edit here is the linen blazer thrown open over it — wear it closed and it reads intentional, wear it open and it reads effortless. Reformation's Fernando linen wide-leg pant in white ($188) drapes from the first wear. No breaking in. The Everlane fitted organic cotton crew tee is the white tee that doesn't go transparent after six washes. Stan Smiths are the answer to the shoe question. Add a Madewell straw tote and Mejuri gold hoops and you have a look that photographs well without trying.",
      },
      {
        heading: "Look 3: The One They Ask About",
        body:
          "Every capsule needs one unexpected piece — the look that doesn't try to be safe. This spring, that look is a bias-cut silk slip dress in champagne with a cropped denim jacket. The Quince 100% mulberry silk slip dress ($89) has over 3,500 reviews and the bias cut does the styling for you — there's nothing to think about except the one finishing piece. Add a denim jacket and it reads daytime. Take it off and it reads evening. A block heel sandal in tan nubuck and a mini crossbody in black complete it. One tiny pearl necklace from Mejuri is the only jewelry it needs.",
      },
      {
        heading: "What Not to Buy This Spring",
        body:
          "Skip sheer fabrics in white for the office — they require too much thought underneath. Skip statement sneakers with tailored pieces — they fight each other. Skip anything in bright orange or cobalt if you're building for longevity — both are trend-driven and will read dated by September. The color story for a Spring 2026 capsule is ivory, white, champagne, black, tan, and natural. Everything works with everything else. That's the point.",
      },
    ],
    closingCta:
      "Every Monday, The Style Refresh delivers three completely sourced looks exactly like these — every item named by brand and price. $19/month. Cancel anytime.",
  },

  /* ── POST 2 ──────────────────────────────────────────────── */
  {
    slug:        "how-to-dress-for-work-spring-2026",
    title:       "How to Dress for Work in Spring 2026 Without Looking Like You're Trying Too Hard",
    metaTitle:   "Work Outfits Spring 2026: How to Dress for the Office Without Overthinking",
    metaDesc:    "The best work outfits for spring 2026. Expert-sourced pieces for women who want to look polished without spending hours getting dressed.",
    publishedAt: "2026-04-05",
    category:    "Work Style",
    readTime:    "5 min read",
    intro:
      "The best-dressed women in any office share one thing: their outfits look considered without looking like they spent an hour considering them. That quality — effortful effortlessness — is not a personality trait. It's a system. Here's the spring 2026 version of that system.",
    sections: [
      {
        heading: "The Problem With 'Business Casual' in 2026",
        body:
          "Business casual has always been a terrible category because it has no definition. It means something different in a law firm than it does in a tech startup than it does in a design agency. The more useful framing: you want to look like you made a decision this morning, not like you grabbed whatever was clean. That requires fewer pieces than most women think — and much more specific ones.",
      },
      {
        heading: "The Three-Piece Formula That Never Fails",
        body:
          "The most reliable spring work formula is a structured top or layer, a wide-leg trouser, and one clean shoe. This season: an ivory blazer over a silk cami over Theory wide-leg black trousers is the combination that reads authoritative without being stiff. The silk underneath the blazer makes it feel like a choice, not a costume. A block-heel pump in black or a leather loafer keeps the shoe clean. The mistake most women make is adding too much — a statement necklace, a printed scarf, a colored bag. One of those things at a time. Not all three.",
      },
      {
        heading: "The Pieces Worth Investing In vs. Saving On",
        body:
          "Invest in the trouser and the bag. Save on the top underneath. The Theory wide-leg pant in a textured gabardine holds its shape through a full day and drapes like it costs twice as much. The Tory Burch structured leather tote in cognac handles a laptop, a lunch, and a meeting without looking like a tote bag. The silk cami underneath? The Quince washable silk V-neck in ivory is $49 and has over 2,500 reviews. It looks identical to the $195 version. The money lives in the structural pieces.",
      },
      {
        heading: "Colors That Work in a Professional Setting This Spring",
        body:
          "Ivory, ecru, and off-white are the colors doing the most work in professional settings this spring. They read clean, considered, and current without demanding attention. Pair any of these with black or navy trousers and a tan or cognac accessory and the color story is done. Avoid white-white for the office — it reads either clinical or naive. The warm off-whites read expensive.",
      },
      {
        heading: "The One Thing That Elevates Any Work Outfit Instantly",
        body:
          "A structured leather bag. Not a tote, not a backpack — a bag with a defined shape that holds its form when you set it down. It signals that you make decisions. It reads organized. It ages well. A Tory Burch Perry tote in cognac works with everything in this color story and handles the actual weight of a working day.",
      },
    ],
    closingCta:
      "The Style Refresh curates exactly this — three complete, sourced work-ready looks every Monday morning, every item named by brand and price. First week free.",
  },

  /* ── POST 3 ──────────────────────────────────────────────── */
  {
    slug:        "quiet-luxury-fashion-guide-2026",
    title:       "Quiet Luxury in 2026: What It Actually Means (And What to Buy)",
    metaTitle:   "Quiet Luxury Fashion 2026: The Real Style Guide With Actual Pieces to Buy",
    metaDesc:    "What quiet luxury actually means for your wardrobe in 2026. Not mood boards — real pieces, real prices, real styling advice from a 20-year fashion consultant.",
    publishedAt: "2026-04-03",
    category:    "Trend Guide",
    readTime:    "7 min read",
    intro:
      "Quiet luxury has been called a trend. It's not. It's a philosophy — and it predates TikTok by several decades. The women who dressed this way in 1995 didn't have a name for it. They just knew that certain things looked expensive and certain things looked like they were trying to look expensive. Here's the difference, and how to build a wardrobe around it.",
    sections: [
      {
        heading: "What 'Quiet Luxury' Actually Means",
        body:
          "Quiet luxury is the rejection of visible branding. It's the choice to look expensive through quality, cut, and restraint rather than logos, embellishment, or trend-chasing. A cashmere sweater in camel with no visible label is quiet luxury. The same sweater with a large logo across the chest is not. The distinction is not about price — it's about intention. The goal is to look like you chose these things because they're excellent, not because you wanted to signal that you spent money.",
      },
      {
        heading: "The Colors That Define the Aesthetic",
        body:
          "Ivory, cream, ecru, camel, oat, bone, sand, black, navy, and chocolate brown. These are the colors of quiet luxury in 2026. Occasionally a muted olive or a dusty sage. Never neon, rarely print, almost never red. The neutrals work because they make quality visible — a beautifully draped ivory trouser registers as expensive immediately. A yellow one requires more work from the piece itself to achieve the same effect.",
      },
      {
        heading: "The Fabrics That Actually Matter",
        body:
          "Silk (especially bias-cut), linen (washed, not stiff), cashmere, fine wool gabardine, and leather (structured, not distressed). The Quince 100% mulberry silk slip dress at $89 looks identical in photographs to the $895 version — the drape is the same because the material is the same. Linen is the fabric of Spring 2026 quiet luxury — Reformation's Fernando wide-leg linen pant is pre-washed and drapes correctly from day one. The mistake is buying poly-blend linen blends that go shiny after washing.",
      },
      {
        heading: "The Biggest Mistake People Make With This Aesthetic",
        body:
          "Buying beige things that don't fit properly and calling it quiet luxury. Cut is everything. A well-cut ivory blazer in bi-stretch cotton reads as deliberately expensive. A poorly cut one in the same color reads as a nurse's jacket. Investing in fit — either in the quality of the initial construction or in alterations — is non-negotiable for this aesthetic to work. The J.Crew Parke blazer in ivory bi-stretch cotton is $148 and fits well off the rack for most women because it's designed with structured shoulders and a clean single-button closure.",
      },
      {
        heading: "Three Entry Points If You're Starting From Zero",
        body:
          "First: a silk cami or slip in ivory or champagne. Quince does this better than brands charging five times more. Second: a wide-leg trouser in black or camel that's not a ponte knit — an actual woven fabric with drape. Third: one good bag with structure. A Tory Burch Perry tote in cognac or tan is within reach and reads correctly. These three things work together as a complete look and serve as the foundation for everything else in this wardrobe.",
      },
    ],
    closingCta:
      "The Style Refresh sources three complete quiet-luxury-adjacent looks every Monday — every piece researched, every link direct to the product. $19/month.",
  },

  /* ── POST 4 ──────────────────────────────────────────────── */
  {
    slug:        "best-women-fashion-subscription-2026",
    title:       "The Best Women's Fashion Subscription in 2026 Isn't a Box of Clothes",
    metaTitle:   "Best Women's Fashion Subscription 2026: Style Curation vs. Clothing Boxes",
    metaDesc:    "Comparing women's fashion subscription services in 2026. Why curated style briefs beat clothing rental boxes for women who know what they like.",
    publishedAt: "2026-04-01",
    category:    "Style Resources",
    readTime:    "5 min read",
    intro:
      "The women's fashion subscription market has two very different products that get lumped together. There are the boxes — Stitch Fix, Trunk Club when it existed, the services that ship you clothes to try and return. And then there are style briefs — services that tell you exactly what to buy and where, without shipping you anything. For most women over 30 with a clear sense of their aesthetic, one of these is dramatically more useful than the other.",
    sections: [
      {
        heading: "What's Wrong With Clothing Rental Boxes",
        body:
          "The clothing box model has structural problems. A stylist you've never met picks items based on a questionnaire and ships them to your door. You try them on in your own bathroom, surrounded by your actual wardrobe, and you return what you don't want. The problem: the pieces rarely work with what you own, the quality ceiling is limited by the economics of return shipping, and the styling is generic by necessity. After a few boxes, most women cancel.",
      },
      {
        heading: "What a Style Brief Actually Does",
        body:
          "A curated style brief does something different. It researches what's worth buying this week — across every retailer, at every price point — and tells you exactly what the complete look is, every brand, every price, and why these things work together. You don't receive a box. You receive three completely resolved outfits, every item named so you can find it yourself. You buy what fits your life and skip what doesn't. There's no return shipping, no subscription boxes piling up, no trying on polyester in your bathroom.",
      },
      {
        heading: "Who This Model Works Best For",
        body:
          "Women who know what they like but don't have time to research what's worth buying. Women who want to look well-dressed without spending eight hours a week on fashion content. Women who want real answers — not mood boards, not vague inspiration, not 'check out this brand' — actual sourced pieces with brand and price so they can act on it. The Style Refresh delivers this every Monday morning.",
      },
      {
        heading: "The Economics Actually Make Sense",
        body:
          "The average fashion subscription box costs $20–$49 per month plus the pressure to buy items you don't love. A style brief is $19/month with no purchase pressure — you buy only what resonates. For women who use it consistently, the ROI is clear: instead of five impulsive purchases that half-work, you make two deliberate ones that complete an actual outfit.",
      },
    ],
    closingCta:
      "The Style Refresh: three complete, sourced looks every Monday. Every item named by brand and price. $19/month, cancel anytime. First week free.",
  },

  /* ── POST 5 ──────────────────────────────────────────────── */
  {
    slug:        "how-to-style-silk-slip-dress-spring-2026",
    title:       "How to Style a Silk Slip Dress in Spring 2026 (Without Looking Like You're in Lingerie)",
    metaTitle:   "How to Style a Silk Slip Dress Spring 2026: 4 Complete Outfit Ideas",
    metaDesc:    "The silk slip dress is Spring 2026's most versatile piece. Here's exactly how to style it for day, work, and evening without looking underdressed.",
    publishedAt: "2026-03-29",
    category:    "How to Wear It",
    readTime:    "5 min read",
    intro:
      "The silk slip dress walks a specific line — it's intentionally intimate in its construction, and that's exactly what makes it interesting. The challenge is wearing it in a way that reads deliberate rather than accidental. Four complete outfits that solve this, from Saturday afternoon to evening.",
    sections: [
      {
        heading: "Start With the Right Dress",
        body:
          "Not all slip dresses are the same. You want a true bias cut, a true silk (not satin, not charmeuse-poly blend), and a champagne or ivory tone for maximum versatility. The Quince 100% mulberry silk slip dress in champagne at $89 has over 3,500 reviews and the bias cut does the work — it drapes correctly on the body without pinning or pulling. This is the piece to build from.",
      },
      {
        heading: "The Daytime Edit: Denim Jacket + Block Heel",
        body:
          "The fastest way to make a slip dress daytime-appropriate is a cropped denim jacket. It adds structure, it cuts the silhouette at the waist, and it reads casual enough to wear on a Saturday afternoon without looking like you forgot to get dressed. Everlane's cropped denim jacket in garment-dyed indigo ($128) is the right weight — not too stiff, not too thin. Finish with a tan block heel sandal and a mini crossbody. This is the look that works for brunch, a gallery, a weekend afternoon.",
      },
      {
        heading: "The Evening Edit: Remove the Jacket, Add the Necklace",
        body:
          "The exact same outfit without the denim jacket becomes evening. The only addition needed is one piece of jewelry — a tiny pearl station necklace from Mejuri ($98 in 18k gold vermeil) worn as a single layer. That's the entire edit. The slip does the rest. The block heel sandal and mini crossbody work for both versions of the look, which is the point.",
      },
      {
        heading: "The Office Edit: Blazer Over Everything",
        body:
          "A slip dress under a structured ivory blazer reads professional immediately. The blazer covers the lingerie-reference entirely and the silk underneath adds interest through texture rather than cut. This only works if the blazer fits correctly — the J.Crew Parke blazer in ivory bi-stretch cotton ($148) has clean structured shoulders and a single-button closure that keeps the proportion right. Swap the block heel for a pointed-toe pump and the entire look works for a professional setting.",
      },
      {
        heading: "What to Avoid",
        body:
          "Don't layer the slip dress over a t-shirt or turtleneck — it flattens the bias cut and removes the intentionality of the piece. Don't wear it with flat sandals unless the rest of the outfit is extremely considered — flat + slip reads unfinished. Don't wear a white or ivory slip with white underwear visible through the fabric — this is the difference between intentional and accidental. The champagne tone is specifically chosen because it's neutral enough to wear without layering anything opaque underneath.",
      },
    ],
    closingCta:
      "The Style Refresh sources looks exactly like these every Monday — three completely resolved outfits, every item named by brand and price. $19/month.",
  },
];
