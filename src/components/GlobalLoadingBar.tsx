"use client";

import { useSyncExternalStore } from "react";

let pendingCount = 0;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): boolean {
  return pendingCount > 0;
}

function getServerSnapshot(): boolean {
  return false;
}

function isApiRequest(input: RequestInfo | URL): boolean {
  try {
    const rawUrl = typeof input === "string" || input instanceof URL ? input : input.url;
    return new URL(rawUrl, window.location.origin).pathname.startsWith("/api/");
  } catch {
    return false;
  }
}

/**
 * Wraps the global `fetch` once, so every request this app makes to its own
 * `/api/*` routes — save/sync/create/delete calls across any page — nudges a
 * shared counter, without wiring loading state into every component by hand.
 * Scoped to `/api/*` rather than every `fetch` so Next's own background
 * link-prefetch requests (which also go through `fetch`, just to a route's
 * RSC payload, not `/api/`) don't keep the bar lit. Guarded by `typeof
 * window` so it only ever patches the browser's `fetch`, never the server's
 * (the module also runs during SSR of this client component, where `window`
 * is undefined).
 */
let patched = false;
function patchFetchOnce() {
  if (patched || typeof window === "undefined") return;
  patched = true;
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const track = isApiRequest(args[0]);
    if (track) {
      pendingCount++;
      notify();
    }
    try {
      return await originalFetch(...args);
    } finally {
      if (track) {
        pendingCount--;
        notify();
      }
    }
  };
}

/** A slim, always-mounted top-of-page progress bar — fades in only once a request has been in flight long enough to matter, so quick saves don't just flicker it. */
export function GlobalLoadingBar() {
  patchFetchOnce();
  const active = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-transparent transition-opacity ${
        active ? "opacity-100 delay-150 duration-150" : "opacity-0 duration-300"
      }`}
    >
      <div className="loading-bar-sweep h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-sky-400 to-transparent" />
    </div>
  );
}
