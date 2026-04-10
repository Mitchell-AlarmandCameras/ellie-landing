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
          brand:   "Totême",
          price:   "$690",
          note:    "Totême's double-breasted cut in off-white. Wear open over anything and it reads finished.",
          buyLink: "https://www.google.com/search?q=Tot%C3%AAme+ivory+double+breasted+blazer+women&tbm=shop",
        },
        {
          piece:   "Wide-leg black trousers",
          brand:   "Theory",
          price:   "$295",
          note:    "Admiral crepe — holds its shape all day, drapes like it cost twice as much.",
          buyLink: "https://www.google.com/search?q=Theory+admiral+crepe+wide+leg+trouser+black+women&tbm=shop",
        },
        {
          piece:   "Silk camisole in cream",
          brand:   "Vince",
          price:   "$195",
          note:    "The layering piece that does the quiet work. Cream under ivory is a masterclass in tonal dressing.",
          buyLink: "https://www.google.com/search?q=Vince+silk+camisole+cream+women&tbm=shop",
        },
        {
          piece:   "Block-heel pointed pump in black",
          brand:   "Various",
          price:   "$80–$150",
          note:    "The block heel pointed pump — polished enough for the boardroom, comfortable enough for a full day.",
          buyLink: "https://www.google.com/search?q=black+block+heel+pointed+pump+women&tbm=shop",
        },
        {
          piece:   "Structured leather tote in cognac",
          brand:   "Tory Burch",
          price:   "$498",
          note:    "The Lee Radziwill double bag. One bag that handles everything without looking like it's trying.",
          buyLink: "https://www.google.com/search?q=Tory+Burch+Lee+Radziwill+Double+Bag+cognac&tbm=shop",
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
          brand:   "Reformation",
          price:   "$178",
          note:    "Reformation's Cleo pant. Pre-washed linen that drapes from day one — no breaking in required.",
          buyLink: "https://www.google.com/search?q=Reformation+Cleo+linen+wide+leg+pant+ecru+cream&tbm=shop",
        },
        {
          piece:   "Fitted white cotton tee",
          brand:   "Everlane",
          price:   "$35",
          note:    "The fitted crew. The one white tee worth owning. Everything else is extra.",
          buyLink: "https://www.google.com/search?q=Everlane+fitted+crew+tee+white+women&tbm=shop",
        },
        {
          piece:   "Gold hoop earrings — medium",
          brand:   "Mejuri",
          price:   "$98",
          note:    "The Demi-Fine Bold Hoops. The only jewelry the look needs. Wear them and stop.",
          buyLink: "https://www.google.com/search?q=Mejuri+Demi+Fine+Bold+Hoops+gold+medium&tbm=shop",
        },
        {
          piece:   "White leather sneaker",
          brand:   "Adidas",
          price:   "$100",
          note:    "Stan Smith. The answer to every casual shoe question since 1965.",
          buyLink: "https://www.adidas.com/us/stan_smith-shoes/WI6368.html",
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
          brand:   "Anthropologie",
          price:   "$168",
          note:    "The bias cut does everything — no styling required beyond the earring.",
          buyLink: "https://www.google.com/search?q=Anthropologie+bias+cut+slip+dress+champagne+women&tbm=shop",
        },
        {
          piece:   "Cropped denim jacket",
          brand:   "Everlane",
          price:   "$128",
          note:    "Throw it on the slip and you've turned evening into afternoon. Everlane's fit is the cleanest version of this silhouette.",
          buyLink: "https://www.google.com/search?q=Everlane+cropped+denim+jacket+women&tbm=shop",
        },
        {
          piece:   "Strappy flat sandal in tan",
          brand:   "Various",
          price:   "$60–$120",
          note:    "Understated, goes with everything, doesn't compete with the dress.",
          buyLink: "https://www.google.com/search?q=strappy+flat+sandal+tan+women&tbm=shop",
        },
        {
          piece:   "Delicate gold chain necklace",
          brand:   "Mejuri",
          price:   "$68",
          note:    "The fine chain necklace. One layer, mid-length. The dress asks for nothing more.",
          buyLink: "https://www.google.com/search?q=Mejuri+fine+gold+chain+necklace+women&tbm=shop",
        },
        {
          piece:   "Mini crossbody bag in black",
          brand:   "Various",
          price:   "$50–$120",
          note:    "Small enough to be intentional, structured enough to look considered.",
          buyLink: "https://www.google.com/search?q=mini+crossbody+bag+black+leather+women&tbm=shop",
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
