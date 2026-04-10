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

/* ─── Current week — replaced every Monday after approval ─────── */
export const currentWeek: WeeklyLookbook = {
  weekOf:     "April 9, 2026",
  weekNumber: 1,
  editorialLead:
    "Spring is asking for softness with a spine this week — effortless at first glance, entirely considered on closer inspection.",

  looks: [
    /* ── THE EXECUTIVE ─────────────────────────────────────── */
    {
      index:    "01",
      label:    "The Executive",
      tagline:  "Quiet authority. Fully sourced.",
      description:
        "The spring executive look that closes the meeting and makes it to dinner without changing. Structure where it counts, ease where it matters.",
      editorsNote:
        "The ivory blazer over wide-leg black is the power move of the season. It reads decisive without trying — which is exactly the point.",
      items: [
        {
          piece:   "Ivory structured blazer",
          brand:   "Theory / Veronica Beard",
          price:   "$395–$595",
          note:    "A double-breasted cut in off-white. Wear open over anything and it reads finished.",
          buyLink: "https://www.nordstrom.com/sr?origin=keywordsearch&keyword=ivory+structured+blazer+women",
        },
        {
          piece:   "Wide-leg black trousers",
          brand:   "Theory / Vince",
          price:   "$195–$295",
          note:    "Holds its shape all day, drapes like it cost twice as much.",
          buyLink: "https://www.nordstrom.com/sr?origin=keywordsearch&keyword=wide+leg+black+trousers+women",
        },
        {
          piece:   "Silk camisole in cream",
          brand:   "Vince",
          price:   "$95–$195",
          note:    "The layering piece that does the quiet work. Cream under ivory is a masterclass in tonal dressing.",
          buyLink: "https://www.nordstrom.com/sr?origin=keywordsearch&keyword=silk+camisole+cream+women",
        },
        {
          piece:   "Block-heel pointed pump in black",
          brand:   "Nordstrom Edit",
          price:   "$80–$250",
          note:    "Polished enough for the boardroom, comfortable enough for a full day.",
          buyLink: "https://www.nordstrom.com/sr?origin=keywordsearch&keyword=black+block+heel+pointed+pump+women",
        },
        {
          piece:   "Structured leather tote in cognac",
          brand:   "Tory Burch",
          price:   "$298–$498",
          note:    "One bag that handles everything without looking like it's trying.",
          buyLink: "https://www.nordstrom.com/sr?origin=keywordsearch&keyword=Tory+Burch+leather+tote+cognac",
        },
      ],
    },

    /* ── THE WEEKENDER ─────────────────────────────────────── */
    {
      index:    "02",
      label:    "The Weekender",
      tagline:  "Effortless. Never accidental.",
      description:
        "The weekend look for women who don't disappear on Saturday. Relaxed in proportion, intentional in every detail.",
      editorsNote:
        "Linen wide-legs in ecru with a fitted white tee is the spring uniform that photographs beautifully and requires zero effort to pull together.",
      items: [
        {
          piece:   "Linen wide-leg trousers in ecru",
          brand:   "Vince / Mango",
          price:   "$148–$295",
          note:    "Pre-washed linen that drapes from day one — no breaking in required.",
          buyLink: "https://www.nordstrom.com/sr?origin=keywordsearch&keyword=linen+wide+leg+pants+ecru+cream+women",
        },
        {
          piece:   "Fitted white cotton tee",
          brand:   "Everlane",
          price:   "$35–$55",
          note:    "The fitted crew. The one white tee worth owning. Everything else is extra.",
          buyLink: "https://www.everlane.com/collections/womens-tshirts",
        },
        {
          piece:   "Gold hoop earrings — medium",
          brand:   "Mejuri",
          price:   "$78–$128",
          note:    "The Demi-Fine Bold Hoops. The only jewelry the look needs. Wear them and stop.",
          buyLink: "https://www.nordstrom.com/sr?origin=keywordsearch&keyword=mejuri+gold+hoop+earrings+women",
        },
        {
          piece:   "White leather sneaker",
          brand:   "Adidas",
          price:   "$100",
          note:    "Stan Smith. The answer to every casual shoe question since 1965.",
          buyLink: "https://www.nordstrom.com/sr?origin=keywordsearch&keyword=adidas+stan+smith+white+women",
        },
        {
          piece:   "Canvas market tote in natural",
          brand:   "Baggu",
          price:   "$38",
          note:    "The standard tote. Holds everything, folds to nothing, looks exactly right.",
          buyLink: "https://baggu.com/products/standard-baggu-natural",
        },
      ],
    },

    /* ── THE WILDCARD ──────────────────────────────────────── */
    {
      index:    "03",
      label:    "The Wildcard",
      tagline:  "One deliberate departure.",
      description:
        "The look for the woman who knows the rules well enough to break exactly one. A slip dress worn in spring with intention.",
      editorsNote:
        "A bias-cut slip dress in the right shade of champagne reads like lingerie as outerwear — which is how it should read. Add the denim jacket and it becomes daytime.",
      items: [
        {
          piece:   "Bias-cut slip dress in champagne",
          brand:   "Vince / Free People",
          price:   "$98–$350",
          note:    "The bias cut does everything — no styling required beyond the earring.",
          buyLink: "https://www.nordstrom.com/sr?origin=keywordsearch&keyword=bias+cut+slip+dress+champagne+women",
        },
        {
          piece:   "Cropped denim jacket",
          brand:   "Frame / Madewell",
          price:   "$128–$248",
          note:    "Throw it on the slip and you've turned evening into afternoon.",
          buyLink: "https://www.nordstrom.com/sr?origin=keywordsearch&keyword=cropped+denim+jacket+women",
        },
        {
          piece:   "Strappy flat sandal in tan",
          brand:   "Nordstrom Edit",
          price:   "$60–$200",
          note:    "Understated, goes with everything, doesn't compete with the dress.",
          buyLink: "https://www.nordstrom.com/sr?origin=keywordsearch&keyword=strappy+flat+sandal+tan+women",
        },
        {
          piece:   "Delicate gold chain necklace",
          brand:   "Mejuri",
          price:   "$68–$98",
          note:    "The fine chain necklace. One layer, mid-length. The dress asks for nothing more.",
          buyLink: "https://www.nordstrom.com/sr?origin=keywordsearch&keyword=mejuri+gold+chain+necklace+women",
        },
        {
          piece:   "Mini crossbody bag in black",
          brand:   "Nordstrom Edit",
          price:   "$50–$250",
          note:    "Small enough to be intentional, structured enough to look considered.",
          buyLink: "https://www.nordstrom.com/sr?origin=keywordsearch&keyword=mini+crossbody+bag+black+women",
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
