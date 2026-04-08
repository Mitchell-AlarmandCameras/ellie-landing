import { ImageResponse } from "next/og";

/* ─── Next.js OG image config ────────────────────────────────── */
export const runtime     = "edge";
export const alt         = "Ellie — The Elite Edit";
export const size        = { width: 1200, height: 630 };
export const contentType = "image/png";

/* ─── Branded navy / gold OG image ───────────────────────────── */
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
          backgroundColor: "#000080",
          position:        "relative",
          overflow:        "hidden",
        }}
      >
        {/* ── Subtle radial glow — top-right ── */}
        <div
          style={{
            position:        "absolute",
            top:             -120,
            right:           -120,
            width:           480,
            height:          480,
            borderRadius:    "50%",
            background:
              "radial-gradient(circle, rgba(212,175,55,0.10) 0%, transparent 70%)",
          }}
        />

        {/* ── Subtle radial glow — bottom-left ── */}
        <div
          style={{
            position:        "absolute",
            bottom:          -120,
            left:            -120,
            width:           480,
            height:          480,
            borderRadius:    "50%",
            background:
              "radial-gradient(circle, rgba(212,175,55,0.07) 0%, transparent 70%)",
          }}
        />

        {/* ── Gold top border ── */}
        <div
          style={{
            position:   "absolute",
            top:        0,
            left:       0,
            right:      0,
            height:     3,
            background: "linear-gradient(90deg, transparent, #D4AF37, #f5e9b8, #D4AF37, transparent)",
          }}
        />

        {/* ── Gold bottom border ── */}
        <div
          style={{
            position:   "absolute",
            bottom:     0,
            left:       0,
            right:      0,
            height:     3,
            background: "linear-gradient(90deg, transparent, #D4AF37, #f5e9b8, #D4AF37, transparent)",
          }}
        />

        {/* ── Content ── */}
        <div
          style={{
            display:        "flex",
            flexDirection:  "column",
            alignItems:     "center",
            justifyContent: "center",
            gap:            0,
          }}
        >
          {/* Eyebrow */}
          <p
            style={{
              fontFamily:    "serif",
              fontSize:      18,
              letterSpacing: "0.35em",
              textTransform: "uppercase",
              color:         "rgba(212,175,55,0.75)",
              margin:        "0 0 24px 0",
            }}
          >
            Private Membership
          </p>

          {/* Top gold rule */}
          <div
            style={{
              width:        80,
              height:       1,
              background:   "linear-gradient(90deg, transparent, #D4AF37, transparent)",
              marginBottom: 32,
            }}
          />

          {/* Wordmark */}
          <h1
            style={{
              fontFamily:    "serif",
              fontWeight:    700,
              fontSize:      120,
              color:         "#D4AF37",
              margin:        0,
              lineHeight:    1,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Ellie
          </h1>

          {/* Bottom gold rule */}
          <div
            style={{
              width:       80,
              height:      1,
              background:  "linear-gradient(90deg, transparent, #D4AF37, transparent)",
              margin:      "32px 0",
            }}
          />

          {/* Subtitle */}
          <p
            style={{
              fontFamily:    "serif",
              fontSize:      32,
              fontWeight:    400,
              color:         "#ffffff",
              margin:        0,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            The Elite Edit
          </p>

          {/* Tagline */}
          <p
            style={{
              fontFamily:    "serif",
              fontSize:      18,
              color:         "rgba(255,255,255,0.45)",
              margin:        "20px 0 0 0",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            Style Intelligence · Three Looks · Every Monday
          </p>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
