"use client";

import { useEffect } from "react";

const VARIANT_TEXT_CLASS = {
  info: "text-amber-300",
  success: "text-emerald-300",
  error: "text-red-300",
} as const;

export function Toast({
  message,
  onDismiss,
  durationMs = 5000,
  variant = "info",
}: {
  message: string;
  onDismiss: () => void;
  durationMs?: number;
  /** "info" (default) is this component's original amber sync-summary look; "success"/"error" are for a definite good/bad outcome (e.g. a creature import). */
  variant?: keyof typeof VARIANT_TEXT_CLASS;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [message, onDismiss, durationMs]);

  return (
    // z-[60] — above `CampaignFormModal`'s own z-50 overlay, since this can
    // now be triggered from inside that modal (creature add/import result)
    // and would otherwise render invisibly behind its backdrop.
    <div className="fixed bottom-5 left-1/2 z-[60] flex max-w-[90vw] -translate-x-1/2 items-start gap-3 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm shadow-xl">
      <span className={VARIANT_TEXT_CLASS[variant]}>{message}</span>
      <button
        onClick={onDismiss}
        aria-label="Close"
        className="shrink-0 text-slate-500 hover:text-slate-300"
      >
        ✕
      </button>
    </div>
  );
}
