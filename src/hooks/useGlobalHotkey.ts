import { useEffect, useRef } from "react";
import { hasOpenLayer } from "./useEscapeToClose";

/**
 * Single unmodified-key global shortcut (e.g. `j` opens the Journal). Ignores
 * the keydown whenever: a modifier is held (never steals a browser/OS
 * combo), any modal/overlay tracked by `useEscapeToClose` is currently open
 * (`hasOpenLayer()` — a hotkey firing underneath an open modal would be
 * surprising, not useful), or focus is inside something that accepts typed
 * text. That last check can't be a bare `tagName` test: Tiptap's
 * `NotesEditor` renders its editable surface as a `contenteditable` `div`,
 * not a native `<input>`/`<textarea>`, so `isContentEditable` is checked
 * too — without it, typing "j" mid-sentence in a journal entry would pop
 * the Journal modal open.
 */
export function useGlobalHotkey(key: string, handler: () => void, enabled = true) {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== key.toLowerCase()) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (hasOpenLayer()) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      e.preventDefault();
      handlerRef.current();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [key, enabled]);
}
