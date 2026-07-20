import { useEffect, useRef } from "react";

/**
 * Shared stack of currently-active escape-closeable layers (across every
 * mounted `useEscapeToClose` instance) — a plain module-level array rather
 * than context, since this needs to work across components with no shared
 * parent (e.g. `AvatarPicker`'s crop overlay nested inside `CampaignFormModal`).
 * Each hook instance pushes its own id while active; only the *topmost* id
 * reacts to Escape, so opening a picker on top of a modal and pressing
 * Escape once closes just the picker, not both at the same time.
 */
let stack: symbol[] = [];

/** Read-only view of the same stack — lets `useGlobalHotkey` suppress every hotkey while any modal/overlay using `useEscapeToClose` is open, without a second "is anything open" tracker to keep in sync with this one. */
export function hasOpenLayer(): boolean {
  return stack.length > 0;
}

/** Closes a modal/overlay on Escape — shared so every modal in the app behaves identically instead of each one (re)wiring its own listener. When several are stacked (e.g. a crop picker opened from inside a settings modal), only the topmost one closes per keypress. */
export function useEscapeToClose(onClose: () => void, active = true) {
  const idRef = useRef<symbol | undefined>(undefined);
  idRef.current ??= Symbol("escape-layer");

  useEffect(() => {
    if (!active) return;
    const id = idRef.current!;
    stack.push(id);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (stack[stack.length - 1] !== id) return;
      onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      stack = stack.filter((s) => s !== id);
    };
  }, [onClose, active]);
}
