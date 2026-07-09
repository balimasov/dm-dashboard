"use client";

import { useEffect, useRef, useState } from "react";

const AUTO_SYNC_OPTIONS: Array<{ minutes: number; label: string }> = [
  { minutes: 0, label: "Off" },
  { minutes: 1, label: "Every 1 min" },
  { minutes: 2, label: "Every 2 min" },
  { minutes: 5, label: "Every 5 min" },
];

/**
 * Split button (main click = sync now, caret = auto-sync interval menu),
 * same shape as Grafana's refresh button — deliberately two separate click
 * targets so adding the auto-sync menu can't change what a plain click on
 * "Sync All" does, since that's the one folks are used to clicking.
 */
export function SyncAllButton({
  onSync,
  syncing,
  campaignId,
}: {
  onSync: () => void;
  syncing: boolean;
  campaignId: string;
}) {
  const [autoSyncMinutes, setAutoSyncMinutesState] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const storageKey = `dm-dashboard-auto-sync-${campaignId}`;

  // Read the saved interval only after mount — localStorage isn't available
  // during SSR, and this is a per-browser preference with no layout impact,
  // so (unlike CollapsibleSection's open/closed cookie) there's no flash to
  // avoid by seeding it any earlier. This is a genuine one-time bootstrap
  // read from an external store, not state derived from props/state, so the
  // usual "don't setState in an effect" guidance doesn't apply here.
  useEffect(() => {
    const stored = Number(localStorage.getItem(storageKey) ?? "0");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- bootstrapping from localStorage, not derived state
    if (AUTO_SYNC_OPTIONS.some((o) => o.minutes === stored)) setAutoSyncMinutesState(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-read on a real campaign change
  }, [campaignId]);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  // `onSync` is a fresh closure every render (it captures the parent's
  // latest character list) — routing ticks through a ref instead of putting
  // it in the interval effect's deps means the timer itself is only ever
  // torn down and rebuilt when the chosen interval actually changes, not on
  // every render a sync happens to cause.
  const onSyncRef = useRef(onSync);
  useEffect(() => {
    onSyncRef.current = onSync;
  });

  useEffect(() => {
    if (autoSyncMinutes === 0) return;
    const id = setInterval(() => onSyncRef.current(), autoSyncMinutes * 60 * 1000);
    return () => clearInterval(id);
  }, [autoSyncMinutes]);

  function chooseInterval(minutes: number) {
    setAutoSyncMinutesState(minutes);
    localStorage.setItem(storageKey, String(minutes));
    setMenuOpen(false);
    if (minutes > 0) onSync();
  }

  return (
    <div ref={containerRef} className="relative flex h-9">
      <button
        onClick={onSync}
        disabled={syncing}
        className="flex h-9 min-w-[102px] items-center justify-center rounded-l-lg bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
      >
        {syncing ? "Syncing..." : "Sync All"}
      </button>
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        aria-label="Auto-sync interval"
        title={autoSyncMinutes > 0 ? `Auto-sync: every ${autoSyncMinutes} min` : "Auto-sync: off"}
        className={`flex h-9 w-7 shrink-0 items-center justify-center rounded-r-lg border-l border-sky-800 bg-sky-600 hover:bg-sky-500 ${
          autoSyncMinutes > 0 ? "text-amber-300" : "text-white"
        }`}
      >
        ▾
      </button>
      {menuOpen && (
        <div className="absolute right-0 top-10 z-10 w-40 rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-lg shadow-black/40">
          <p className="px-3 pb-1 pt-0.5 text-[10px] uppercase tracking-wide text-slate-500">Auto-sync</p>
          {AUTO_SYNC_OPTIONS.map((opt) => (
            <button
              key={opt.minutes}
              type="button"
              onClick={() => chooseInterval(opt.minutes)}
              className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-slate-800 ${
                autoSyncMinutes === opt.minutes ? "text-sky-400" : "text-slate-300"
              }`}
            >
              {opt.label}
              {autoSyncMinutes === opt.minutes && <span>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
