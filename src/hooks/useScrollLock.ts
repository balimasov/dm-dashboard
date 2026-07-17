import { useEffect } from "react";

let lockCount = 0;
let savedScrollY = 0;
let savedStyle: { position: string; top: string; width: string; overflow: string } | null = null;

/**
 * Locks page scroll while a full-screen modal/overlay is open — every
 * overlay in the app (`CharacterDetailsModal`, `CreatureDetailsModal`,
 * `CampaignFormModal`) calls this instead of rolling its own effect, since
 * that's exactly where this bug keeps coming back: three separate
 * hand-copied `document.body.style.overflow = "hidden"` effects, any one of
 * which can silently drift out of sync with the others (or just doesn't
 * cover a case the original wasn't tested against) the next time a fourth
 * modal gets added. One implementation, called from everywhere.
 *
 * `overflow: hidden` alone is also known to not fully do the job on iOS
 * Safari — it can still chain-scroll the page underneath a `fixed` backdrop
 * regardless of the body's overflow value. Pinning the body to
 * `position: fixed` at its current scroll offset (via a negative `top`) is
 * the standard workaround, restored to the exact previous scroll position
 * on unlock.
 *
 * A module-level counter (not per-instance state) so two overlays open at
 * once (e.g. `AvatarPicker`'s crop screen opened from inside
 * `CampaignFormModal`) compose correctly — only the outermost lock/unlock
 * actually touches `body.style`, the same "only the last one out turns off
 * the lights" pattern `useEscapeToClose`'s stack uses for the Escape key.
 */
export function useScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;
    if (lockCount === 0) {
      savedScrollY = window.scrollY;
      const body = document.body;
      savedStyle = { position: body.style.position, top: body.style.top, width: body.style.width, overflow: body.style.overflow };
      body.style.position = "fixed";
      body.style.top = `-${savedScrollY}px`;
      body.style.width = "100%";
      body.style.overflow = "hidden";
    }
    lockCount++;
    return () => {
      lockCount--;
      if (lockCount === 0 && savedStyle) {
        const body = document.body;
        body.style.position = savedStyle.position;
        body.style.top = savedStyle.top;
        body.style.width = savedStyle.width;
        body.style.overflow = savedStyle.overflow;
        window.scrollTo(0, savedScrollY);
        savedStyle = null;
      }
    };
  }, [active]);
}
