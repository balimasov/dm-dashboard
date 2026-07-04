"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

function subscribe() {
  return () => {};
}

/**
 * Renders children into the root layout's `#header-actions` slot instead of
 * wherever this component sits in the tree — lets a specific page (e.g. the
 * dashboard) put a button in the shared sticky header while keeping the
 * button's state/logic (sync-all, in this case) owned by that page, not
 * duplicated in the layout.
 *
 * A plain `typeof document === "undefined"` guard looks like it'd be enough,
 * but it isn't: that check evaluates to false on the client during the
 * hydration render too (the browser's `document` already exists by then),
 * so the client's very first render disagrees with the server's (which saw
 * `undefined`) — a real hydration mismatch (React error #418), confirmed
 * when this shipped with that guard. useSyncExternalStore is the sanctioned
 * escape hatch here (same one this repo already uses for the collapsible
 * sections' localStorage state): its getServerSnapshot always answers
 * "not mounted" for SSR and the initial hydration pass, then flips once
 * mounted, without React treating the flip as a mismatch.
 */
export function HeaderPortal({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
  if (!mounted) return null;
  const target = document.getElementById("header-actions");
  if (!target) return null;
  return createPortal(children, target);
}
