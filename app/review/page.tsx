"use client";

import { useState } from "react";

/* ═══════════════════════════════════════════════════════════════════════
   /review — Member feedback page
   Beautiful, brand-matched form. Submissions go privately to Ellie only.
   She reviews and decides what (if anything) gets published on the site.
═══════════════════════════════════════════════════════════════════════ */

export default function ReviewPage() {
  const [name,      setName]      = useState("");
  const [city,      setCity]      = useState("");
  const [thoughts,  setThoughts]  = useState("");
  const [canQuote,  setCanQuote]  = useState(false);
  const [status,    setStatus]    = useState<"idle" | "sending" | "done" | "error">("idle");
  const [focused,   setFocused]   = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!thoughts.trim()) return;
    setStatus("sending");
    try {
      const res  = await fetch("/api/testimonial", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name, city, thoughts, canQuote }),
      });
      const data = await res.json();
      setStatus(data.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  };

  const inputStyle = (field: string) => ({
    width:           "100%",
    background:      focused === field ? "#FDFAF5" : "#FAF6F0",
    border:          `1px solid ${focused === field ? "#C4956A" : "#DDD4C5"}`,
    borderRadius:    0,
    padding:         "14px 18px",
    fontFamily:      "Cormorant Garamond, serif",
    fontSize:        "1.05rem",
    color:           "#2C2C2C",
    outline:         "none",
    transition:      "border-color 0.2s, background 0.2s",
    boxSizing:       "border-box" as const,
  });

  /* ── Thank you screen ── */
  if (status === "done") {
    return (
      <div style={{
        minHeight:      "100vh",
        background:     "#F5EFE4",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        padding:        "40px 24px",
      }}>
        <div style={{ maxWidth: 520, width: "100%", textAlign: "center" }}>

          {/* Top accent line */}
          <div style={{
            height:     "1px",
            background: "linear-gradient(90deg, transparent, #C4956A, transparent)",
            marginBottom: 40,
          }} />

          {/* Monogram */}
          <div style={{
            width:        56,
            height:       56,
            border:       "1px solid #C4956A",
            margin:       "0 auto 28px",
            display:      "flex",
            alignItems:   "center",
            justifyContent: "center",
          }}>
            <span style={{
              fontFamily:    "DM Serif Display, serif",
              fontSize:      "1.4rem",
              color:         "#C4956A",
              letterSpacing: "0.1em",
            }}>E</span>
          </div>

          <p style={{
            fontFamily:    "Inter, sans-serif",
            fontSize:      "10px",
            letterSpacing: "0.36em",
            textTransform: "uppercase",
            color:         "#C4956A",
            margin:        "0 0 16px",
          }}>
            The Style Refresh
          </p>

          <h1 style={{
            fontFamily: "DM Serif Display, serif",
            fontSize:   "clamp(1.8rem, 6vw, 2.6rem)",
            fontWeight: 400,
            color:      "#2C2C2C",
            margin:     "0 0 20px",
            lineHeight: 1.2,
          }}>
            Thank you.
          </h1>

          <div style={{
            height:     "1px",
            width:      "48px",
            background: "linear-gradient(90deg, #C4956A, #DDD4C5)",
            margin:     "0 auto 24px",
          }} />

          <p style={{
            fontFamily: "Cormorant Garamond, serif",
            fontSize:   "1.2rem",
            color:      "#6B6560",
            lineHeight: 1.85,
            margin:     "0 0 32px",
            fontStyle:  "italic",
          }}>
            Your thoughts mean everything.<br />
            Ellie reads every single one personally.
          </p>

          <a
            href="/dashboard"
            style={{
              display:       "inline-block",
              background:    "#C4956A",
              color:         "#FDFAF5",
              padding:       "13px 32px",
              fontFamily:    "Inter, sans-serif",
              fontSize:      "10px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              textDecoration: "none",
            }}
          >
            Return to VIP Room
          </a>

          <div style={{
            height:     "1px",
            background: "linear-gradient(90deg, transparent, #C4956A, transparent)",
            marginTop:  40,
          }} />
        </div>
      </div>
    );
  }

  /* ── Main form ── */
  return (
    <div style={{
      minHeight:   "100vh",
      background:  "#F5EFE4",
      display:     "flex",
      alignItems:  "center",
      justifyContent: "center",
      padding:     "60px 24px 80px",
    }}>
      <div style={{ maxWidth: 560, width: "100%" }}>

        {/* Top accent */}
        <div style={{
          height:       "1px",
          background:   "linear-gradient(90deg, transparent, #C4956A, transparent)",
          marginBottom: 48,
        }} />

        {/* Monogram */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width:          52,
            height:         52,
            border:         "1px solid #C4956A",
            margin:         "0 auto 20px",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
          }}>
            <span style={{
              fontFamily:    "DM Serif Display, serif",
              fontSize:      "1.3rem",
              color:         "#C4956A",
            }}>E</span>
          </div>

          <p style={{
            fontFamily:    "Inter, sans-serif",
            fontSize:      "9px",
            letterSpacing: "0.38em",
            textTransform: "uppercase",
            color:         "#C4956A",
            margin:        "0 0 20px",
          }}>
            Ellie · The Style Refresh
          </p>

          <h1 style={{
            fontFamily: "DM Serif Display, serif",
            fontSize:   "clamp(1.9rem, 6vw, 2.8rem)",
            fontWeight: 400,
            color:      "#2C2C2C",
            margin:     "0 0 10px",
            lineHeight: 1.15,
          }}>
            Your thoughts.
          </h1>

          <div style={{
            height:   "1px",
            width:    "48px",
            background: "linear-gradient(90deg, #C4956A, #DDD4C5)",
            margin:   "14px auto 20px",
          }} />

          <p style={{
            fontFamily: "Cormorant Garamond, serif",
            fontSize:   "1.15rem",
            color:      "#6B6560",
            lineHeight: 1.85,
            fontStyle:  "italic",
            maxWidth:   440,
            margin:     "0 auto",
          }}>
            Four weeks in. What's the honest experience been?<br />
            Ellie reads every response personally.
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "#FDFAF5",
          border:     "1px solid #DDD4C5",
          padding:    "clamp(28px, 5vw, 44px)",
          marginTop:  32,
        }}>
          <form onSubmit={handleSubmit}>

            {/* Name */}
            <div style={{ marginBottom: 22 }}>
              <label style={{
                display:       "block",
                fontFamily:    "Inter, sans-serif",
                fontSize:      "9px",
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color:         "#C4956A",
                marginBottom:  8,
              }}>
                Your First Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onFocus={() => setFocused("name")}
                onBlur={() => setFocused(null)}
                placeholder="How Ellie will address you"
                style={inputStyle("name")}
              />
            </div>

            {/* City */}
            <div style={{ marginBottom: 22 }}>
              <label style={{
                display:       "block",
                fontFamily:    "Inter, sans-serif",
                fontSize:      "9px",
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color:         "#C4956A",
                marginBottom:  8,
              }}>
                City <span style={{ color: "#B5A99A", fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                onFocus={() => setFocused("city")}
                onBlur={() => setFocused(null)}
                placeholder="New York, Chicago, Los Angeles…"
                style={inputStyle("city")}
              />
            </div>

            {/* Thoughts */}
            <div style={{ marginBottom: 28 }}>
              <label style={{
                display:       "block",
                fontFamily:    "Inter, sans-serif",
                fontSize:      "9px",
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color:         "#C4956A",
                marginBottom:  8,
              }}>
                Your Experience
              </label>
              <textarea
                value={thoughts}
                onChange={e => setThoughts(e.target.value)}
                onFocus={() => setFocused("thoughts")}
                onBlur={() => setFocused(null)}
                required
                rows={5}
                placeholder="What has the weekly brief changed for you? Anything you'd do differently? Ellie wants the honest version."
                style={{
                  ...inputStyle("thoughts"),
                  resize:     "vertical",
                  lineHeight: "1.75",
                  minHeight:  "130px",
                }}
              />
            </div>

            {/* Permission checkbox */}
            <div style={{
              display:      "flex",
              alignItems:   "flex-start",
              gap:          12,
              marginBottom: 28,
              padding:      "16px",
              background:   "#F5EFE4",
              border:       "1px solid #EDE7DC",
            }}>
              <div style={{ paddingTop: 2 }}>
                <input
                  type="checkbox"
                  id="canQuote"
                  checked={canQuote}
                  onChange={e => setCanQuote(e.target.checked)}
                  style={{ width: 14, height: 14, accentColor: "#C4956A", cursor: "pointer" }}
                />
              </div>
              <label htmlFor="canQuote" style={{
                fontFamily: "Inter, sans-serif",
                fontSize:   "12px",
                color:      "#6B6560",
                lineHeight: 1.65,
                cursor:     "pointer",
              }}>
                Ellie may share my words on the website or in emails, using only my first name and city.
                {" "}<span style={{ color: "#B5A99A", fontSize: "11px" }}>
                  (Only checked responses are ever considered for publishing — and only after Ellie personally approves.)
                </span>
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={status === "sending" || !thoughts.trim()}
              style={{
                width:         "100%",
                background:    status === "sending" ? "#DDD4C5" : "#C4956A",
                color:         "#FDFAF5",
                border:        "none",
                padding:       "15px 24px",
                fontFamily:    "Inter, sans-serif",
                fontSize:      "10px",
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                cursor:        status === "sending" || !thoughts.trim() ? "default" : "pointer",
                transition:    "background 0.2s",
              }}
            >
              {status === "sending" ? "Sending…" : "Send to Ellie →"}
            </button>

            {status === "error" && (
              <p style={{
                marginTop:  12,
                fontFamily: "Inter, sans-serif",
                fontSize:   "11px",
                color:      "#c0392b",
                textAlign:  "center",
              }}>
                Something went wrong. Please try again or email ellie@stylebyellie.com directly.
              </p>
            )}

          </form>
        </div>

        {/* Footer note */}
        <p style={{
          textAlign:  "center",
          fontFamily: "Inter, sans-serif",
          fontSize:   "10px",
          color:      "#B5A99A",
          marginTop:  24,
          lineHeight: 1.7,
          letterSpacing: "0.04em",
        }}>
          Your response goes directly to Ellie — not published anywhere automatically.<br />
          Nothing is shared without your permission and her personal approval.
        </p>

        {/* Bottom accent */}
        <div style={{
          height:     "1px",
          background: "linear-gradient(90deg, transparent, #C4956A, transparent)",
          marginTop:  40,
        }} />

      </div>
    </div>
  );
}
