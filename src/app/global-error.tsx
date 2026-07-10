"use client";

import { useEffect } from "react";
import "./globals.css";

/**
 * Catches errors thrown by the root layout itself (rare — e.g. a failed
 * `cookies()`/auth read) — `error.tsx` alone can't handle those, since it
 * renders *inside* the root layout. Has to define its own `<html>`/`<body>`
 * and re-import the global stylesheet, since it fully replaces the layout
 * that would normally provide both.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full items-center justify-center bg-slate-950 px-4 text-slate-100">
        <div className="w-full max-w-sm space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-center shadow-lg shadow-black/20">
          <h1 className="text-lg font-semibold text-slate-100">Something went wrong</h1>
          <p className="text-sm text-slate-500">The app failed to load.</p>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
