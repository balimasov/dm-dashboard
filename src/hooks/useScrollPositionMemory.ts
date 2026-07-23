import { useLayoutEffect } from "react";

/**
 * Remembers this page's scroll position across a full navigation away and
 * back — e.g. clicking "Edit" on a character/creature (a dedicated page, not
 * a modal) and then returning via Save/Cancel. That round trip has to be a
 * real forward navigation (`router.push`, not `router.back()`) so the
 * dashboard actually refetches the just-edited data instead of a client
 * component instance restored as-is from the router's back/forward cache
 * with its pre-edit state still in memory — but a plain forward navigation
 * always scrolls back to the top by design, which is exactly the jump this
 * hook exists to undo.
 *
 * `key` should be unique per page instance (e.g. include the campaign id) so
 * unrelated pages don't fight over the same stored offset. Restoring happens
 * in a layout effect — before the browser paints the first frame — so the
 * corrected position is what the user actually sees, not a visible jump from
 * top-of-page to the remembered offset.
 */
export function useScrollPositionMemory(key: string) {
  useLayoutEffect(() => {
    const saved = sessionStorage.getItem(key);
    if (saved) window.scrollTo(0, Number(saved));

    let ticking = false;
    function handleScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        sessionStorage.setItem(key, String(window.scrollY));
        ticking = false;
      });
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [key]);
}
