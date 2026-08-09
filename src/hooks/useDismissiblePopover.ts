"use client";

import { useEffect, useRef, useState } from "react";
import { useEscapeToClose } from "./useEscapeToClose";

/**
 * Shared open/close mechanics for a corner-pinned quick-action popover
 * (`RemindersFab`, `QuickLinksButton`) — click-outside closes it, Escape
 * closes it — previously the same handful of lines hand-copied into each
 * of the two independently. `containerRef` goes on the outermost wrapper
 * that holds both the trigger button and the popover itself, so a click on
 * the trigger (which toggles `open`) isn't also mistaken for an outside
 * click that immediately closes it again. Deliberately not wired into
 * `QuickNotePopover` — its trigger/popover are a genuinely different shape
 * (a menu row, not a corner FAB, with open state controlled by its caller
 * rather than owned here), not just a near-miss of these two.
 */
export function useDismissiblePopover() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useEscapeToClose(() => setOpen(false), open);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return { open, setOpen, containerRef };
}
