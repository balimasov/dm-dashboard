"use client";

import { useSyncExternalStore } from "react";

/**
 * A minimal external store over localStorage so the open/closed state can go
 * through useSyncExternalStore instead of useState+useEffect — calling
 * setState directly inside an effect (to sync from localStorage after mount)
 * trips this repo's react-hooks/set-state-in-effect lint rule with no clean
 * escape hatch, the same issue solved elsewhere via SyncTimestamp. This is
 * the fully reactive version: toggling notifies subscribers, so any other
 * mounted section reading the same key would also update.
 */
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(storageKey: string): boolean {
  return localStorage.getItem(storageKey) !== "0";
}

function getServerSnapshot(): boolean {
  return true;
}

function setOpenState(storageKey: string, open: boolean) {
  localStorage.setItem(storageKey, open ? "1" : "0");
  listeners.forEach((listener) => listener());
}

export function CollapsibleSection({
  title,
  actions,
  storageKey,
  children,
}: {
  title: React.ReactNode;
  actions?: React.ReactNode;
  storageKey: string;
  children: React.ReactNode;
}) {
  const open = useSyncExternalStore(
    subscribe,
    () => getSnapshot(storageKey),
    getServerSnapshot
  );

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpenState(storageKey, !open)}
          className="group flex items-center gap-2"
        >
          <span
            className={`text-slate-500 transition-transform group-hover:text-slate-300 ${open ? "rotate-90" : ""}`}
          >
            ▶
          </span>
          <h2 className="text-2xl font-bold text-slate-50 group-hover:text-slate-200">{title}</h2>
        </button>
        {actions}
      </div>
      {open && children}
    </section>
  );
}
