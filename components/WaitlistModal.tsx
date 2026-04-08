"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

/* ─── Zod schema ──────────────────────────────────────────────── */
const schema = z.object({
  name: z
    .string()
    .min(2, "Please enter your full name.")
    .max(80, "Name is too long.")
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, "Name contains invalid characters."),
  email: z
    .string()
    .min(1, "Email is required.")
    .email("Please enter a valid email address."),
  styleInterest: z.enum(
    ["executive", "weekender", "wildcard", "all"],
    { errorMap: () => ({ message: "Please select a style direction." }) }
  ),
});

type FormValues = z.infer<typeof schema>;

const STYLE_OPTIONS: { value: FormValues["styleInterest"]; label: string }[] = [
  { value: "executive", label: "The Executive — Boardroom authority" },
  { value: "weekender", label: "The Weekender — Effortless refinement" },
  { value: "wildcard", label: "The Wildcard — Deliberate risk" },
  { value: "all",      label: "All Three — I want the full edit" },
];

/* ─── Props ───────────────────────────────────────────────────── */
interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/* ─── Reusable field-error message ───────────────────────────── */
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="mt-1.5 text-xs text-red-600 flex items-center gap-1.5"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <circle cx="6" cy="6" r="5.5" stroke="#dc2626" />
        <path d="M6 3.5v3M6 8.5v.5" stroke="#dc2626" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
      {message}
    </p>
  );
}

/* ─── Component ───────────────────────────────────────────────── */
export default function WaitlistModal({ isOpen, onClose }: WaitlistModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  // Explicit success flag — avoids the RHF isSubmitSuccessful pitfall where
  // it returns true even when setError("root") was called inside onSubmit.
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
  });

  /* -- Reset form + success flag each time modal opens -- */
  useEffect(() => {
    if (isOpen) {
      reset();
      setSubmitted(false);
      setTimeout(() => firstFieldRef.current?.focus(), 80);
    }
  }, [isOpen, reset]);

  /* -- ESC to close -- */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  /* -- Lock body scroll -- */
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  /* -- Submit handler -- */
  const onSubmit = async (data: FormValues) => {
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Surface the server error in the red banner — never show success state
        setError("root", {
          message: json.error ?? "Something went wrong. Please try again.",
        });
        return;
      }

      // Only flip to success when the server explicitly confirms
      setSubmitted(true);
    } catch {
      setError("root", {
        message: "Unable to reach the server. Please check your connection and try again.",
      });
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  /* -- RHF ref merge helper -- */
  const { ref: nameRef, ...nameRest } = register("name");

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.58)", backdropFilter: "blur(5px)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="waitlist-title"
    >
      {/* ── Modal card ── */}
      <div
        className={`
          relative w-full sm:max-w-lg bg-white
          ${submitted ? "modal-fade-in" : "modal-slide-up"}
        `}
        style={{ borderTop: "2px solid #D4AF37" }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center transition-colors rounded-full hover:bg-gray-50"
          aria-label="Close modal"
          style={{ color: "#9ca3af" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#000080")}
          onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>

        <div className="px-7 pt-9 pb-9 sm:px-10 sm:pt-11 sm:pb-11">

          {/* ════════════════════════════════════════════════════ */}
          {/* SUCCESS STATE                                        */}
          {/* ════════════════════════════════════════════════════ */}
          {submitted ? (
            <div className="text-center py-4">

              {/* Crown / crest icon */}
              <div className="flex items-center justify-center mb-7">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.22))",
                    border: "1px solid rgba(212,175,55,0.45)",
                  }}
                >
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                    <path
                      d="M4 20L7 10l7 6 7-6 3 10H4z"
                      stroke="#D4AF37"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <circle cx="7"  cy="9"  r="1.5" fill="#D4AF37" />
                    <circle cx="14" cy="6"  r="1.5" fill="#D4AF37" />
                    <circle cx="21" cy="9"  r="1.5" fill="#D4AF37" />
                    <line x1="4" y1="22" x2="24" y2="22" stroke="#D4AF37" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                </div>
              </div>

              {/* Gold rule */}
              <div
                className="h-px w-16 mx-auto mb-7"
                style={{ background: "linear-gradient(90deg, transparent, #D4AF37, transparent)" }}
              />

              {/* Headline */}
              <h2
                id="waitlist-title"
                className="font-bold mb-4 leading-tight"
                style={{
                  fontFamily: "Playfair Display, serif",
                  color: "#D4AF37",
                  fontSize: "clamp(1.6rem, 5vw, 2.1rem)",
                  textShadow: "0 1px 18px rgba(212,175,55,0.18)",
                }}
              >
                Welcome to the Elite Edit.
              </h2>

              {/* Sub-copy */}
              <p
                className="mb-3 leading-relaxed"
                style={{
                  fontFamily: "Cormorant Garamond, serif",
                  fontSize: "clamp(1rem, 3.5vw, 1.15rem)",
                  color: "#374151",
                  lineHeight: "1.8",
                }}
              >
                Your application has been received. Ellie reviews every name
                personally — you&apos;ll hear from her directly when the next
                spot opens.
              </p>

              {/* Fine print */}
              <p
                className="text-xs text-gray-400 mb-9"
                style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.04em" }}
              >
                Keep an eye on your inbox. This week&apos;s blueprint may be waiting.
              </p>

              {/* Close CTA */}
              <button
                onClick={onClose}
                className="btn-gold w-full sm:w-auto sm:px-14"
                style={{ minHeight: "50px" }}
              >
                Close
              </button>

              {/* Bottom rule */}
              <div
                className="h-px w-16 mx-auto mt-8"
                style={{ background: "linear-gradient(90deg, transparent, #D4AF37, transparent)" }}
              />
            </div>

          ) : (
          /* ════════════════════════════════════════════════════ */
          /* FORM STATE                                          */
          /* ════════════════════════════════════════════════════ */
          <>
            {/* Eyebrow */}
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1" style={{ background: "rgba(212,175,55,0.3)" }} />
              <span
                className="text-xs font-semibold tracking-widest uppercase shrink-0"
                style={{ color: "#D4AF37", letterSpacing: "0.3em", fontFamily: "Inter, sans-serif" }}
              >
                The Inner Circle
              </span>
              <div className="h-px flex-1" style={{ background: "rgba(212,175,55,0.3)" }} />
            </div>

            {/* Heading */}
            <h2
              id="waitlist-title"
              className="font-bold mb-2 leading-snug"
              style={{
                fontFamily: "Playfair Display, serif",
                color: "#000080",
                fontSize: "clamp(1.35rem, 4.5vw, 1.75rem)",
              }}
            >
              Membership is currently limited.
            </h2>
            <p
              className="mb-7 leading-relaxed"
              style={{
                fontFamily: "Cormorant Garamond, serif",
                fontSize: "clamp(0.95rem, 3.5vw, 1.1rem)",
                color: "#6b7280",
                lineHeight: "1.75",
              }}
            >
              Complete the form below to apply for the next available spot.
            </p>

            {/* ── Form ── */}
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

              {/* Full Name */}
              <div>
                <label
                  htmlFor="wl-name"
                  className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
                  style={{ color: "#000080", letterSpacing: "0.18em", fontFamily: "Inter, sans-serif" }}
                >
                  Full Name
                </label>
                <input
                  id="wl-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Alexandra Reynolds"
                  disabled={isSubmitting}
                  className={`field-input${errors.name ? " field-error" : ""}`}
                  {...nameRest}
                  ref={(el) => {
                    nameRef(el);
                    firstFieldRef.current = el;
                  }}
                />
                <FieldError message={errors.name?.message} />
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="wl-email"
                  className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
                  style={{ color: "#000080", letterSpacing: "0.18em", fontFamily: "Inter, sans-serif" }}
                >
                  Email Address
                </label>
                <input
                  id="wl-email"
                  type="email"
                  autoComplete="email"
                  placeholder="your@email.com"
                  disabled={isSubmitting}
                  className={`field-input${errors.email ? " field-error" : ""}`}
                  {...register("email")}
                />
                <FieldError message={errors.email?.message} />
              </div>

              {/* Style Interest */}
              <div>
                <label
                  htmlFor="wl-style"
                  className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
                  style={{ color: "#000080", letterSpacing: "0.18em", fontFamily: "Inter, sans-serif" }}
                >
                  Style Direction
                </label>
                <div className="field-select-wrap">
                  <select
                    id="wl-style"
                    disabled={isSubmitting}
                    defaultValue=""
                    className={`field-input pr-9${errors.styleInterest ? " field-error" : ""}`}
                    style={{ cursor: "pointer" }}
                    {...register("styleInterest")}
                  >
                    <option value="" disabled>
                      Select your direction…
                    </option>
                    {STYLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <FieldError message={errors.styleInterest?.message} />
              </div>

              {/* Server / root error */}
              {errors.root && (
                <div
                  className="px-4 py-3 border text-sm"
                  style={{
                    borderColor: "#dc2626",
                    background: "rgba(220,38,38,0.04)",
                    color: "#dc2626",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  {errors.root.message}
                </div>
              )}

              {/* Submit */}
              <div className="pt-1">
                <SubmitButton loading={isSubmitting} />
              </div>
            </form>

            <p
              className="mt-5 text-center text-xs text-gray-400"
              style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.04em" }}
            >
              No spam. No sharing. Every application reviewed personally.
            </p>
          </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Submit button with isolated hover state ─────────────────── */
function SubmitButton({ loading }: { loading: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="btn-gold w-full"
      style={{ minHeight: "52px", position: "relative" }}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2.5">
          <svg
            className="animate-spin h-4 w-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              cx="12" cy="12" r="10"
              stroke="currentColor"
              strokeWidth="4"
              className="opacity-25"
            />
            <path
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
              className="opacity-75"
            />
          </svg>
          Submitting Application…
        </span>
      ) : (
        <span className="flex items-center justify-center gap-3">
          Apply for the Inner Circle
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden="true"
            style={{ transition: "transform 0.25s" }}
          >
            <path
              d="M2 7h10M8 3l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      )}
    </button>
  );
}
