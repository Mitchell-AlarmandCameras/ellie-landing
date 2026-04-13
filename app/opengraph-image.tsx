import { ImageResponse } from "next/og";

/* ─── Next.js OG image config ────────────────────────────────── */
export const runtime     = "edge";
export const alt         = "Ellie — The Style Refresh. Three complete looks every Monday, every item by brand and price.";
export const size        = { width: 1200, height: 630 };
export const contentType = "image/png";

/* ─── On-brand charcoal + blush OG image ─────────────────────── */
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width:           "100%",
          height:          "100%",
          display:         "flex",
          flexDirection:   "column",
          alignItems:      "center",
          justifyContent:  "center",
          backgroundColor: "#2C2C2C",
          position:        "relative",
          overflow:        "hidden",
        }}
      >
        {/* Warm radial glow — center */}
        <div
          style={{
            position:     "absolute",
            top:          "50%",
            left:         "50%",
            width:        700,
            height:       700,
            marginTop:    -350,
            marginLeft:   -350,
            borderRadius: "50%",
            background:   "radial-gradient(circle, rgba(196,149,106,0.12) 0%, transparent 65%)",
          }}
        />

        {/* Blush top rule */}
        <div
          style={{
            position:   "absolute",
            top:        0,
            left:       0,
            right:      0,
            height:     3,
            background: "linear-gradient(90deg, transparent, #C4956A, #D4AB88, #C4956A, transparent)",
          }}
        />

        {/* Blush bottom rule */}
        <div
          style={{
            position:   "absolute",
            bottom:     0,
            left:       0,
            right:      0,
            height:     3,
            background: "linear-gradient(90deg, transparent, #C4956A, #D4AB88, #C4956A, transparent)",
          }}
        />

        {/* Content stack */}
        <div
          style={{
            display:        "flex",
            flexDirection:  "column",
            alignItems:     "center",
            justifyContent: "center",
          }}
        >
          {/* Eyebrow */}
          <p
            style={{
              fontFamily:    "serif",
              fontSize:      16,
              letterSpacing: "0.42em",
              textTransform: "uppercase",
              color:         "#C4956A",
              margin:        "0 0 28px 0",
            }}
          >
            Private Membership · $19/Month
          </p>

          {/* Rule */}
          <div
            style={{
              width:        60,
              height:       1,
              background:   "linear-gradient(90deg, transparent, #C4956A, transparent)",
              marginBottom: 36,
            }}
          />

          {/* Wordmark */}
          <h1
            style={{
              fontFamily:    "serif",
              fontWeight:    700,
              fontSize:      108,
              color:         "#FDFAF5",
              margin:        0,
              lineHeight:    1,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Ellie
          </h1>

          {/* Rule */}
          <div
            style={{
              width:      60,
              height:     1,
              background: "linear-gradient(90deg, transparent, #C4956A, transparent)",
              margin:     "36px 0",
            }}
          />

          {/* Subtitle */}
          <p
            style={{
              fontFamily:    "serif",
              fontSize:      30,
              fontWeight:    400,
              color:         "#EDE5D8",
              margin:        0,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            The Style Refresh
          </p>

          {/* Tagline */}
          <p
            style={{
              fontFamily:    "serif",
              fontSize:      17,
              color:         "rgba(253,250,245,0.42)",
              margin:        "22px 0 0 0",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
            }}
          >
            Three Complete Looks · Brand & Price · Every Monday
          </p>
        </div>
      </div>
    ),
    { ...size }
  );
}
