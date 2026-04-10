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
  weekOf:     "April 7, 2026",
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
          buyLink: "https://toteme-studio.com/search?type=product&q=blazer",
        },
        {
          piece:   "Wide-leg black trousers",
          brand:   "Theory",
          price:   "$295",
          note:    "Admiral crepe — holds its shape all day, drapes like it cost twice as much.",
          buyLink: "https://www.theory.com/search?q=wide+leg+trouser",
        },
        {
          piece:   "Silk camisole in cream",
          brand:   "Vince",
          price:   "$195",
          note:    "The layering piece that does the quiet work. Cream under ivory is a masterclass in tonal dressing.",
          buyLink: "https://www.vince.com/search?q=silk+camisole",
        },
        {
          piece:   "Block-heel pointed pump in black",
          brand:   "Sam Edelman",
          price:   "$130",
          note:    "The Hazel pump. Comfortable enough for a full day, polished enough for the boardroom.",
          buyLink: "https://www.samedelman.com/collections/heels",
        },
        {
          piece:   "Structured leather tote in cognac",
          brand:   "Tory Burch",
          price:   "$498",
          note:    "The Lee Radziwill double bag. One bag that handles everything without looking like it's trying.",
          buyLink: "https://www.toryburch.com/en-us/search?q=leather+tote",
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
          buyLink: "https://www.thereformation.com/search?q=linen+wide+leg+pant",
        },
        {
          piece:   "Fitted white cotton tee",
          brand:   "Everlane",
          price:   "$35",
          note:    "The fitted crew. The one white tee worth owning. Everything else is extra.",
          buyLink: "https://www.everlane.com/search?q=fitted+crew+tee",
        },
        {
          piece:   "Gold hoop earrings — medium",
          brand:   "Mejuri",
          price:   "$98",
          note:    "The Demi-Fine Bold Hoops. The only jewelry the look needs. Wear them and stop.",
          buyLink: "https://mejuri.com/collections/earrings",
        },
        {
          piece:   "White leather sneaker",
          brand:   "Adidas",
          price:   "$100",
          note:    "Stan Smith. The answer to every casual shoe question since 1965.",
          buyLink: "https://www.adidas.com/us/search?q=stan+smith+white",
        },
        {
          piece:   "Canvas market tote in natural",
          brand:   "Baggu",
          price:   "$38",
          note:    "The standard tote. Holds everything, folds to nothing, looks exactly right.",
          buyLink: "https://baggu.com/collections/bags",
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
          note:    "The bias cut does everything — no styling required beyond the earring. Dozens of options in the right champagne and ivory tones.",
          buyLink: "https://www.anthropologie.com/search?q=slip+dress",
        },
        {
          piece:   "Classic denim jacket",
          brand:   "Everlane",
          price:   "$128",
          note:    "The cropped denim jacket. Throw it on the slip and you've turned evening into afternoon. Everlane's fit is the cleanest version of this silhouette.",
          buyLink: "https://www.everlane.com/search?q=denim+jacket",
        },
        {
          piece:   "Strappy flat sandal in tan",
          brand:   "Sam Edelman",
          price:   "$90",
          note:    "The Gigi sandal. Understated, goes with everything, doesn't compete with the dress.",
          buyLink: "https://www.samedelman.com/collections/sandals",
        },
        {
          piece:   "Delicate gold chain necklace",
          brand:   "Mejuri",
          price:   "$68",
          note:    "The fine chain necklace. One layer, mid-length. The dress asks for nothing more.",
          buyLink: "https://mejuri.com/collections/necklaces",
        },
        {
          piece:   "Mini crossbody in black",
          brand:   "& Other Stories",
          price:   "$79",
          note:    "Small enough to be intentional, structured enough to look considered.",
          buyLink: "https://www.stories.com/en_usd/bags.html",
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
