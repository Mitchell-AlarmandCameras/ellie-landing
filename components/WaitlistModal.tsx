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
});

type FormValues = z.infer<typeof schema>;

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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

export default function WaitlistModal({ isOpen, onClose }: WaitlistModalProps) {
  const overlayRef   = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const [submitted, setSubmitted] = useState(false);
  /** Set from API: false when Resend isn’t configured or confirmation failed. */
  const [confirmationEmailSent, setConfirmationEmailSent] = useState(true);

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

  useEffect(() => {
    if (isOpen) {
      reset();
      setSubmitted(false);
      setConfirmationEmailSent(true);
      setTimeout(() => firstFieldRef.current?.focus(), 80);
    }
  }, [isOpen, reset]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const onSubmit = async (data: FormValues) => {
    try {
      const res  = await fetch("/api/waitlist", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        confirmationEmailSent?: boolean;
      };

      if (!res.ok) {
        setError("root", { message: json.error ?? "Something went wrong. Please try again." });
        return;
      }
      const sent =
        typeof json.confirmationEmailSent === "boolean" ? json.confirmationEmailSent : true;
      setConfirmationEmailSent(sent);
      setSubmitted(true);
    } catch {
      setError("root", { message: "Unable to reach the server. Please check your connection." });
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const { ref: nameRef, ...nameRest } = register("name");

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ backgroundColor: "rgba(44,44,44,0.55)", backdropFilter: "blur(6px)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="waitlist-title"
    >
      {/* ── Modal card ── */}
      <div
        className={`relative w-full sm:max-w-lg bg-white ${submitted ? "modal-fade-in" : "modal-slide-up"}`}
        style={{ borderTop: "2px solid var(--blush)" }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full transition-colors"
          aria-label="Close modal"
          style={{ color: "var(--taupe)" }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--cream-dark)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>

        <div className="px-7 pt-9 pb-9 sm:px-10 sm:pt-11 sm:pb-11">

          {/* ══════════════════════════════════════════════════════ */}
          {/* SUCCESS STATE                                          */}
          {/* ══════════════════════════════════════════════════════ */}
          {submitted ? (
            <div className="text-center py-4">

              {/* Icon */}
              <div className="flex items-center justify-center mb-6">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{
                    background: "var(--cream-dark)",
                    border:     "1px solid var(--sand-border)",
                  }}
                >
                  <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
                    <path
                      d="M4 19l3-9 6 5 6-5 3 9H4z"
                      stroke="var(--blush)"
                      strokeWidth="1.4"
                      strokeLinejoin="round"
                    />
                    <circle cx="7"  cy="9"  r="1.4" fill="var(--blush)" />
                    <circle cx="13" cy="6"  r="1.4" fill="var(--blush)" />
                    <circle cx="19" cy="9"  r="1.4" fill="var(--blush)" />
                    <line x1="4" y1="21" x2="22" y2="21" stroke="var(--sand-dark)" strokeWidth="1.1" strokeLinecap="round" />
                  </svg>
                </div>
              </div>

              {/* Divider */}
              <div
                className="h-px w-14 mx-auto mb-6"
                style={{ background: "linear-gradient(90deg, transparent, var(--sand-dark), transparent)" }}
              />

              {/* Headline */}
              <h2
                id="waitlist-title"
                className="font-bold mb-4 leading-tight"
                style={{
                  fontFamily: "DM Serif Display, serif",
                  color:      "var(--blush)",
                  fontSize:   "clamp(1.6rem, 5vw, 2.1rem)",
                }}
              >
                You&apos;re on the list.
              </h2>

              <p
                className="mb-3 leading-relaxed"
                style={{
                  fontFamily: "Cormorant Garamond, serif",
                  fontSize:   "clamp(1rem, 3.5vw, 1.12rem)",
                  color:      "var(--charcoal-muted)",
                  lineHeight: "1.85",
                }}
              >
                Your application has been received. Ellie reviews every name
                personally — you&apos;ll hear from her when the next spot opens.
              </p>

              <p
                className="text-xs mb-9"
                style={{
                  fontFamily: "Inter, sans-serif",
                  color:      "var(--warm-gray)",
                  letterSpacing: "0.04em",
                }}
              >
                {confirmationEmailSent ? (
                  <>
                    Keep an eye on your inbox. The Style Refresh may be waiting.
                  </>
                ) : (
                  <>
                    If you don&apos;t see a confirmation email, check spam. Your request is still saved —
                    Ellie will reach out when a spot opens.
                  </>
                )}
              </p>

              <button
                onClick={onClose}
                className="btn-primary w-full sm:w-auto sm:px-14"
                style={{ minHeight: "50px" }}
              >
                Close
              </button>

              <div
                className="h-px w-14 mx-auto mt-8"
                style={{ background: "linear-gradient(90deg, transparent, var(--sand-dark), transparent)" }}
              />
            </div>

          ) : (
          /* ══════════════════════════════════════════════════════ */
          /* FORM STATE                                             */
          /* ══════════════════════════════════════════════════════ */
          <>
            {/* Eyebrow */}
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1" style={{ background: "var(--sand-border)" }} />
              <span
                className="text-xs font-medium tracking-widest uppercase shrink-0"
                style={{ color: "var(--blush)", letterSpacing: "0.28em", fontFamily: "Inter, sans-serif" }}
              >
                Join the Waitlist
              </span>
              <div className="h-px flex-1" style={{ background: "var(--sand-border)" }} />
            </div>

            {/* Heading */}
            <h2
              id="waitlist-title"
              className="font-bold mb-2 leading-snug"
              style={{
                fontFamily: "DM Serif Display, serif",
                color:      "var(--charcoal)",
                fontSize:   "clamp(1.35rem, 4.5vw, 1.75rem)",
              }}
            >
              Spots are currently limited.
            </h2>
            <p
              className="mb-7 leading-relaxed"
              style={{
                fontFamily: "Cormorant Garamond, serif",
                fontSize:   "clamp(0.95rem, 3.5vw, 1.1rem)",
                color:      "var(--charcoal-muted)",
                lineHeight: "1.8",
              }}
            >
              Add your name below. You&apos;ll be the first to know when the next
              spot in The Style Refresh opens.
            </p>

            {/* ── Form ── */}
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

              {/* Full Name */}
              <div>
                <label
                  htmlFor="wl-name"
                  className="block text-xs font-medium uppercase tracking-widest mb-1.5"
                  style={{ color: "var(--charcoal-muted)", letterSpacing: "0.16em", fontFamily: "Inter, sans-serif" }}
                >
                  Full Name
                </label>
                <input
                  id="wl-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Your name"
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
                  className="block text-xs font-medium uppercase tracking-widest mb-1.5"
                  style={{ color: "var(--charcoal-muted)", letterSpacing: "0.16em", fontFamily: "Inter, sans-serif" }}
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

              {/* Server error */}
              {errors.root && (
                <div
                  className="px-4 py-3 border text-sm"
                  style={{
                    borderColor: "#dc2626",
                    background:  "rgba(220,38,38,0.04)",
                    color:       "#dc2626",
                    fontFamily:  "Inter, sans-serif",
                  }}
                >
                  {errors.root.message}
                </div>
              )}

              <div className="pt-1">
                <SubmitButton loading={isSubmitting} />
              </div>
            </form>

            <p
              className="mt-5 text-center text-xs"
              style={{ fontFamily: "Inter, sans-serif", color: "var(--warm-gray)", letterSpacing: "0.04em" }}
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

/* ─── Submit button ───────────────────────────────────────────── */
function SubmitButton({ loading }: { loading: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="btn-primary w-full"
      style={{ minHeight: "52px" }}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2.5">
          <svg className="animate-spin h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
            <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" className="opacity-75" />
          </svg>
          Submitting…
        </span>
      ) : (
        <span className="flex items-center justify-center gap-3">
          Join the Waitlist
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
    </button>
  );
}
