"use client";

import { useState } from "react";

interface SaveButtonProps {
  item: {
    piece:   string;
    brand:   string;
    price:   string;
    note:    string;
    buyLink: string;
    look:    string;
    weekOf:  string;
  };
}

export default function SaveButton({ item }: SaveButtonProps) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "duplicate">("idle");

  const handleSave = async () => {
    if (state === "saving" || state === "saved" || state === "duplicate") return;
    setState("saving");
    try {
      const res  = await fetch("/api/bag", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(item),
      });
      const data = await res.json();
      if (data.duplicate) {
        setState("duplicate");
        setTimeout(() => setState("saved"), 2000);
      } else {
        setState("saved");
      }
    } catch {
      setState("idle");
    }
  };

  const label =
    state === "saving"    ? "Saving…"     :
    state === "saved"     ? "Saved ♡"     :
    state === "duplicate" ? "Already saved ♡" :
    "Save ♡";

  const isSaved = state === "saved" || state === "duplicate";

  return (
    <button
      onClick={handleSave}
      disabled={state === "saving" || isSaved}
      title="Save for later"
      style={{
        background:    "transparent",
        border:        `1px solid ${isSaved ? "var(--blush)" : "var(--sand-border)"}`,
        color:         isSaved ? "var(--blush)" : "var(--warm-gray)",
        padding:       "0.35rem 0.75rem",
        fontFamily:    "Inter, sans-serif",
        fontSize:      "0.68rem",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        cursor:        isSaved ? "default" : "pointer",
        whiteSpace:    "nowrap",
        transition:    "all 0.2s ease",
      }}
    >
      {label}
    </button>
  );
}
