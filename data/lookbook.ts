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
      tagline:  "Tonal authority. No distractions.",
      description:
        "The spring executive look built entirely in one color story — ivory to sand to nude. Closes the meeting, makes it to dinner, requires zero second-guessing.",
      editorsNote:
        "The power move this season is tonal, not contrast. Ivory blazer, Sand trouser, Nude shoe — all reading the same warm story. The Cognac bag grounds it without breaking it. This is how The Row does a work outfit. No black required.",
      items: [
        {
          piece:   "Single-Button Blazer in Ivory Stretch Cotton",
          brand:   "Theory",
          price:   "$345",
          note:    "Single-button, clean construction, touch of stretch. Structured enough to close the meeting, light enough for dinner straight after. Theory does the tailored ivory blazer better than anyone at this price.",
          buyLink: "https://www.theory.com/search?q=single+button+blazer+ivory&prefn1=gender&prefv1=Women",
        },
        {
          piece:   "Wide-Leg Trouser in Sand Stretch-Twill",
          brand:   "Quince",
          price:   "$49.90",
          note:    "Mid-rise, relaxed wide leg in warm Sand. The tonal bridge between Ivory blazer and Nude shoe — reads expensive at $49. Swap the black trouser and the whole look elevates.",
          buyLink: "https://www.quince.com/women/clothing/pants?q=wide+leg+trouser+sand",
        },
        {
          piece:   "Washable Silk V-Neck Cami in Ivory",
          brand:   "Quince",
          price:   "$49",
          note:    "100% mulberry silk in Ivory, 2,500+ reviews. Cream layered under Ivory is a quiet luxury masterclass.",
          buyLink: "https://www.quince.com/women/clothing/tops?q=silk+cami+ivory",
        },
        {
          piece:   "Pointed-Toe Pump in Nude Leather",
          brand:   "Stuart Weitzman",
          price:   "$298",
          note:    "Clean pointed toe, Nude leather that disappears into the leg line. Elongates under the wide trouser and ties directly to the Sand palette — no harsh black break.",
          buyLink: "https://www.stuartweitzman.com/search?q=pointed+toe+pump+nude+leather",
        },
        {
          piece:   "Perry Structured Leather Tote in Cognac",
          brand:   "Tory Burch",
          price:   "$298–$498",
          note:    "The one warm accent that grounds the tonal look. Cognac against Sand and Ivory is an editorial finishing touch, not an afterthought.",
          buyLink: "https://www.toryburch.com/en-us/search?q=perry+tote+cognac",
        },
      ],
    },

    /* ── THE WEEKENDER ─────────────────────────────────────── */
    {
      index:    "02",
      label:    "The Weekender",
      tagline:  "Effortless. Never accidental.",
      description:
        "The weekend look for women who don't disappear on Saturday. Every piece is in the ivory-to-ecru family — wear it together and it reads like one considered thought.",
      editorsNote:
        "Tonal Ivory weekend dressing is the Spring 2026 editorial moment. Flax blazer, Ivory tee, Ecru linen — the Veja Campo replaces the Stan Smith because it has zero color interruption. One palette, head to toe. Straw bag and gold hoops close it out.",
      items: [
        {
          piece:   "Linen Blazer in Flax Ivory",
          brand:   "Vince",
          price:   "$345–$395",
          note:    "Throw it open over the tee. Takes a Saturday morning outfit to lunch, gallery, anywhere. The one piece doing all the work — Vince linen has a softness that holds its structure.",
          buyLink: "https://www.vince.com/search?q=linen+blazer+ivory",
        },
        {
          piece:   "Fitted Pima Cotton Tee in Ivory",
          brand:   "Quince",
          price:   "$19.90",
          note:    "100% Peruvian pima cotton, fitted crew, Ivory. The difference between bone-white and warm Ivory matters — this matches the blazer's Flax tone instead of fighting it.",
          buyLink: "https://www.quince.com/women/clothing/tops?q=pima+cotton+tee+ivory",
        },
        {
          piece:   "Fernando Linen Wide-Leg Pant in Ecru",
          brand:   "Reformation",
          price:   "$188",
          note:    "100% linen, mid-rise, relaxed wide leg in Ecru. Pre-washed so it drapes from day one. Ecru keeps the full tonal story consistent.",
          buyLink: "https://www.thereformation.com/search?q=linen+wide+leg+pant+ecru&category=pants",
        },
        {
          piece:   "Campo Sneaker in Extra White / Natural",
          brand:   "Veja",
          price:   "$150",
          note:    "Clean White leather with Natural sole — no colored branding, no heel tab interruption. This is the sneaker editorial stylists actually reach for in 2026.",
          buyLink: "https://www.veja-store.com/search?q=campo+extra+white",
        },
        {
          piece:   "Straw Slouch Tote in Natural",
          brand:   "Revolve",
          price:   "$128–$198",
          note:    "Handwoven straw with leather strap. Makes the most relaxed outfit feel considered. Revolve carries the best selection of natural straw totes in one place.",
          buyLink: "https://www.revolve.com/r/Search.jsp?q=straw+tote+natural&gender[]=Womens",
        },
        {
          piece:   "Gold Hoop Earrings",
          brand:   "Mejuri",
          price:   "$78–$128",
          note:    "Demi-fine gold. The only jewelry this look needs.",
          buyLink: "https://mejuri.com/search?q=gold+hoop+earrings",
        },
      ],
    },

    /* ── THE WILDCARD ──────────────────────────────────────── */
    {
      index:    "03",
      label:    "The Wildcard",
      tagline:  "One deliberate departure.",
      description:
        "The look for the woman who knows the rules well enough to break exactly one. Denim over champagne silk — the most editorial contrast in a Spring wardrobe.",
      editorsNote:
        "The denim jacket over a champagne slip is a known editorial pairing — cool blue against warm gold. The mistake most people make is introducing a third story with the bag. A natural straw crossbody stays warm, keeps the champagne and tan in charge, and lets the denim be the wildcard it was always meant to be.",
      items: [
        {
          piece:   "Cropped Denim Jacket in Garment-Dyed Indigo",
          brand:   "Everlane",
          price:   "$128",
          note:    "The deliberate contrast piece. Cool Indigo against Champagne silk is the entire editorial statement of this look.",
          buyLink: "https://www.everlane.com/collections/womens-denim-jackets",
        },
        {
          piece:   "Bias-Cut Silk Slip Dress in Champagne",
          brand:   "Quince",
          price:   "$89",
          note:    "100% mulberry silk, bias cut, Champagne. 3,500+ reviews. The bias does everything — no styling required beyond the earring.",
          buyLink: "https://www.quince.com/women/clothing/dresses?q=silk+slip+dress+champagne",
        },
        {
          piece:   "Rhinestone Strappy Sandal in Nude",
          brand:   "Steve Madden",
          price:   "$89–$110",
          note:    "Barely-there Nude strap with delicate detail. Stays in the warm story with the Champagne instead of breaking it.",
          buyLink: "https://www.stevemadden.com/search?q=rhinestone+strappy+sandal+nude",
        },
        {
          piece:   "Mini Straw Crossbody in Natural",
          brand:   "Revolve",
          price:   "$88–$148",
          note:    "Woven Natural straw, mini crossbody format. Keeps the warm palette of the Champagne and Nude intact — a black bag would fight the entire color story.",
          buyLink: "https://www.revolve.com/r/Search.jsp?q=straw+mini+crossbody+natural&gender[]=Womens",
        },
        {
          piece:   "Tiny Pearl Station Necklace",
          brand:   "Mejuri",
          price:   "$98",
          note:    "18k gold vermeil with freshwater pearls. One layer against a champagne slip is exactly right — delicate, feminine, done.",
          buyLink: "https://mejuri.com/search?q=pearl+station+necklace",
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
