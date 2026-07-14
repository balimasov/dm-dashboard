"use client";

import { useState } from "react";

/**
 * Open/closed state is seeded from a cookie read server-side (see
 * `initialOpen`) rather than `localStorage`, specifically so the very first
 * server-rendered HTML already reflects the user's real preference — a
 * `localStorage`-only approach can't be read during SSR, so the server has
 * to guess a default, and every page load then shows a visible flash the
 * moment the client corrects it to the real (different) value. Toggling
 * writes back to the same cookie so the next full page load starts correct
 * too.
 */
export function persistOpenCookie(storageKey: string, open: boolean) {
  document.cookie = `${storageKey}=${open ? "1" : "0"}; path=/; max-age=31536000; SameSite=Lax`;
}

export function CollapsibleSection({
  title,
  actions,
  storageKey,
  initialOpen,
  children,
}: {
  title: React.ReactNode;
  actions?: React.ReactNode;
  storageKey: string;
  /** The section's real open/closed preference, read from a cookie on the server so this component's very first render already matches it. */
  initialOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(initialOpen);

  function toggle() {
    const next = !open;
    setOpen(next);
    persistOpenCookie(storageKey, next);
  }

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button type="button" onClick={toggle} className="group flex items-start gap-2 text-left">
          <span
            className={`mt-1 shrink-0 text-slate-500 transition-transform group-hover:text-slate-300 ${open ? "rotate-90" : ""}`}
          >
            ▶
          </span>
          <h2 className="break-words text-2xl font-bold text-slate-50 group-hover:text-slate-200">{title}</h2>
        </button>
        {actions}
      </div>
      {open && children}
    </section>
  );
}
