"use client";

import { useEffect, useRef, useState } from "react";
import { ClockIcon, RefreshIcon } from "./ui/icons";
import { POPOVER_SHELL_CLS } from "./ui/containerStyles";
import { MICRO_LABEL_CLS } from "./ui/typography";
import { InfoTooltip } from "./InfoTooltip";
import { SyncTimestamp } from "./SyncTimestamp";
import { SYNC_TIER_CLASS, syncTier } from "@/lib/syncTier";

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
 *
 * When `lastSyncedAt` is given (the oldest sync timestamp across the linked
 * party), a status segment is prepended in the same bordered shell — one
 * visual unit that both shows when the party last synced and triggers the
 * next one, instead of a separate clock icon sitting next to the button.
 * The date text is desktop-only (`sm:inline`); on mobile only the
 * tier-colored clock icon remains, tappable via `InfoTooltip` for the exact
 * date. Icon and date share one color (`SYNC_TIER_CLASS`) rather than a
 * two-tone muted/bright split, so they read as a single colored signal.
 */
export function SyncAllButton({
  onSync,
  syncing,
  campaignId,
  lastSyncedAt,
}: {
  onSync: () => void;
  syncing: boolean;
  campaignId: string;
  lastSyncedAt?: string;
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

  const tier = lastSyncedAt ? syncTier(lastSyncedAt) : null;

  return (
    <div ref={containerRef} className="relative flex h-9">
      <div className="flex h-9 overflow-hidden rounded-lg border border-slate-700">
        {tier && (
          <InfoTooltip
            hoverOnly
            mobileOnly
            panel={
              <p>
                <span className={`font-semibold ${SYNC_TIER_CLASS[tier]}`}>
                  <SyncTimestamp iso={lastSyncedAt!} />
                </span>
              </p>
            }
          >
            {/* `mobileOnly` — above `sm` the date already sits in plain text
                right next to the icon, so a hint there would just repeat it.
                Below `sm` that text is hidden, and tap-to-toggle is how the
                exact date stays reachable from the icon alone. */}
            <span className="flex h-9 shrink-0 items-center gap-1.5 border-r border-slate-700 bg-slate-800 px-2.5">
              <ClockIcon className={`h-3.5 w-3.5 shrink-0 ${SYNC_TIER_CLASS[tier]}`} />
              <span className={`hidden whitespace-nowrap text-xs font-semibold sm:inline ${SYNC_TIER_CLASS[tier]}`}>
                <SyncTimestamp iso={lastSyncedAt!} />
              </span>
            </span>
          </InfoTooltip>
        )}
        <button
          onClick={onSync}
          disabled={syncing}
          title={autoSyncMinutes > 0 ? `Sync Party (S) — auto-syncing every ${autoSyncMinutes} min` : "Sync Party (S)"}
          className="flex h-9 min-w-[102px] items-center justify-center gap-1.5 bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
        >
          <RefreshIcon className={`h-4 w-4 shrink-0 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? (
            "Syncing..."
          ) : (
            <>
              Sync Party
              {autoSyncMinutes > 0 && <span className="font-normal text-amber-200">· {autoSyncMinutes}m</span>}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Auto-sync interval"
          title={autoSyncMinutes > 0 ? `Auto-sync: every ${autoSyncMinutes} min` : "Auto-sync: off"}
          className={`flex h-9 w-7 shrink-0 items-center justify-center border-l border-sky-800 bg-sky-600 hover:bg-sky-500 ${
            autoSyncMinutes > 0 ? "text-amber-300" : "text-white"
          }`}
        >
          ▾
        </button>
      </div>
      {menuOpen && (
        <div className={`absolute right-0 top-10 z-10 w-40 py-1 ${POPOVER_SHELL_CLS}`}>
          <p className={`px-3 pb-1 pt-0.5 ${MICRO_LABEL_CLS}`}>Auto-sync</p>
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
