/* ═══════════════════════════════════════════════════════════════
   LOOKBOOK DATA — The Style Refresh
   ─────────────────────────────────────────────────────────────
   To update the weekly brief:
     1. Edit `currentWeek` below.
     2. Move the old week to `archiveWeeks` so the archive tab works.
     3. Replace `buyLink` values with real affiliate / product URLs.
   ═══════════════════════════════════════════════════════════════ */

export interface LookItem {
  piece:   string;
  brand:   string;
  price:   string;
  note:    string;
  buyLink: string;
}

export interface Look {
  index:       string;
  label:       string;
  tagline:     string;
  description: string;
  items:       LookItem[];
  editorsNote: string;
}

export interface WeeklyLookbook {
  weekOf:       string;
  weekNumber:   number;
  editorialLead: string;
  looks:        Look[];
}

/* ─── Current week — edit this every Monday ───────────────────── */
export const currentWeek: WeeklyLookbook = {
  weekOf:     "April 7, 2026",
  weekNumber: 1,
  editorialLead:
    "Spring is testing its edges this week — warm enough for linen, sharp enough to warrant structure. We split the difference with intention.",

  looks: [
    /* ── THE EXECUTIVE ─────────────────────────────────────── */
    {
      index:    "01",
      label:    "The Executive",
      tagline:  "Command the room before you speak.",
      description:
        "Authority through restraint. This week's executive look is structured without being stiff — the kind of dressing that closes deals quietly.",
      editorsNote:
        "The wool-linen blend in stone is the perfect spring executive play. It photographs beautifully and communicates taste the moment you walk in.",
      items: [
        {
          piece:   "Wool-linen blazer in stone",
          brand:   "Loro Piana",
          price:   "$2,995",
          note:    "The stone colourway is the move — transitions from boardroom to dinner without effort.",
          buyLink: "https://www.loropiana.com",
        },
        {
          piece:   "Slim charcoal trousers",
          brand:   "Incotex",
          price:   "$395",
          note:    "Half-break only. Incotex's Venezia fabric holds a crease all day without a second thought.",
          buyLink: "https://www.incotex.com",
        },
        {
          piece:   "White Bengal stripe shirt",
          brand:   "Turnbull & Asser",
          price:   "$295",
          note:    "The Bengal stripe reads classic without tipping into City banker. Wear it open at the collar.",
          buyLink: "https://www.turnbullandasser.com",
        },
        {
          piece:   "Cognac cap-toe Oxford",
          brand:   "Edward Green",
          price:   "$1,195",
          note:    "Dover last in cognac. A decision you will never regret and never need to repeat.",
          buyLink: "https://www.edwardgreen.com",
        },
        {
          piece:   "Slim leather card case",
          brand:   "Smythson",
          price:   "$195",
          note:    "The briefcase is finished. A slim card case from Smythson says the same thing, louder.",
          buyLink: "https://www.smythson.com",
        },
      ],
    },

    /* ── THE WEEKENDER ─────────────────────────────────────── */
    {
      index:    "02",
      label:    "The Weekender",
      tagline:  "Effortless without trying.",
      description:
        "Weekend dressing for those who refuse to disappear on Saturday. Considered, comfortable, and never casual.",
      editorsNote:
        "Ivory over ecru linen is the Hamptons play. It's effortless in the way only considered dressing can be.",
      items: [
        {
          piece:   "Linen trousers in warm ecru",
          brand:   "Sunspel",
          price:   "$225",
          note:    "Pre-washed so it sits properly from day one. No ironing required — that's the point.",
          buyLink: "https://www.sunspel.com",
        },
        {
          piece:   "Oversized merino crewneck in ivory",
          brand:   "Johnstons of Elgin",
          price:   "$385",
          note:    "Light enough for spring, rich enough to look intentional over linen.",
          buyLink: "https://www.johnstonsofelgin.com",
        },
        {
          piece:   "White leather tennis sneaker",
          brand:   "Common Projects",
          price:   "$495",
          note:    "The Original Achilles Low. If you don't own a pair, start here.",
          buyLink: "https://www.commonprojects.com",
        },
        {
          piece:   "Field watch in brushed steel",
          brand:   "Nomos Glashütte",
          price:   "$1,680",
          note:    "The Tangente 33. Under 8mm thick. Goes with everything and announces nothing.",
          buyLink: "https://www.nomos-glashuette.com",
        },
        {
          piece:   "Waxed canvas tote in sand",
          brand:   "Mismo",
          price:   "$350",
          note:    "Mismo's M/S Shopper. Structure is everything — this doesn't slouch.",
          buyLink: "https://www.mismo.dk",
        },
      ],
    },

    /* ── THE WILDCARD ──────────────────────────────────────── */
    {
      index:    "03",
      label:    "The Wildcard",
      tagline:  "Wear the conversation.",
      description:
        "One deliberate departure, executed precisely. Not for everyone — but then, not everything should be.",
      editorsNote:
        "Chalk on cream with one terracotta anchor. This is how you wear white in spring without looking like you're going to a tennis club.",
      items: [
        {
          piece:   "Unstructured blazer in chalk linen",
          brand:   "De Bonne Facture",
          price:   "$895",
          note:    "Chore-coat cut in chalk linen. It looks unconstructed. It is not.",
          buyLink: "https://www.debonnefacture.com",
        },
        {
          piece:   "Wide-leg cream trousers",
          brand:   "Margaret Howell",
          price:   "$520",
          note:    "The wide leg is fully rehabilitated. MHL's version in cream is the one to own.",
          buyLink: "https://www.margarethowell.co.uk",
        },
        {
          piece:   "Terracotta linen tee",
          brand:   "Sunspel",
          price:   "$95",
          note:    "One colour accent under the chalk blazer. The terracotta does all the work.",
          buyLink: "https://www.sunspel.com",
        },
        {
          piece:   "Suede penny loafer in tan",
          brand:   "Meermin",
          price:   "$265",
          note:    "Hand-welted, unlined suede. At this price it's genuinely embarrassing how good these are.",
          buyLink: "https://www.meermin.com",
        },
        {
          piece:   "Woven silver ring",
          brand:   "Bottega Veneta",
          price:   "$390",
          note:    "One ring. Worn alone on the right hand. The intrecciato weave reads deliberate, not loud.",
          buyLink: "https://www.bottegaveneta.com",
        },
      ],
    },
  ],
};

/* ─── Archive — add previous weeks here ──────────────────────── */
export const archiveWeeks: WeeklyLookbook[] = [
  // Older weeks go here. Example:
  // { weekOf: "March 31, 2026", weekNumber: 0, editorialLead: "…", looks: [...] },
];
