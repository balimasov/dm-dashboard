"use client";

import { useSyncExternalStore } from "react";
import { getPendingRequestsSnapshot, subscribeToPendingRequests } from "@/lib/apiClient";

function getServerSnapshot(): boolean {
  return false;
}

/** A small centered spinner chip — a familiar, unmistakable "something is loading" cue, shown while a request has been in flight long enough to matter (a short delay avoids flicker on quick saves). */
export function GlobalLoadingIndicator() {
  const active = useSyncExternalStore(subscribeToPendingRequests, getPendingRequestsSnapshot, getServerSnapshot);

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 z-50 flex items-center justify-center transition-opacity ${
        active ? "opacity-100 delay-150 duration-150" : "opacity-0 duration-200"
      }`}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-800 bg-slate-950/90 shadow-xl">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-sky-400" />
      </div>
    </div>
  );
}
