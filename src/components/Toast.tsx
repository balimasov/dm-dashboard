"use client";

import { useEffect } from "react";

export function Toast({
  message,
  onDismiss,
  durationMs = 5000,
}: {
  message: string;
  onDismiss: () => void;
  durationMs?: number;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [message, onDismiss, durationMs]);

  return (
    <div className="fixed bottom-5 left-1/2 z-40 flex max-w-[90vw] -translate-x-1/2 items-start gap-3 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-amber-300 shadow-xl">
      <span>{message}</span>
      <button
        onClick={onDismiss}
        aria-label="Закрити"
        className="shrink-0 text-slate-500 hover:text-slate-300"
      >
        ✕
      </button>
    </div>
  );
}
