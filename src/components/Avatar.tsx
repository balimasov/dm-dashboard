"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";
import { useScrollLock } from "@/hooks/useScrollLock";

const SIZE_CLASSES = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-14 w-14 text-lg",
  md: "h-16 w-16 text-xl",
} as const;

/**
 * Square image-or-initial avatar shared by characters, creatures, and
 * campaign logos — anywhere a portrait may or may not exist yet. Falls back
 * to the initials placeholder if `src` fails to load (a stale/expired D&D
 * Beyond portrait URL, a 404, ...) instead of the browser's own broken-image
 * icon — same `onError` convention as `CharacterChip`'s avatar.
 */
export function Avatar({
  src,
  label,
  size = "sm",
  zoomable = false,
}: {
  src?: string;
  label: string;
  size?: keyof typeof SIZE_CLASSES;
  /**
   * Click-to-enlarge, opening `src` full-size in a lightbox. Off by default
   * — a caller only turns this on where the avatar isn't already nested
   * inside its own bigger click target. `CharacterHeader`/`CreatureHeader`
   * wrap this in `ClickableCardHeader`'s own `<button>` when they're given
   * an `onClick` (the compact card, which opens the details modal on any
   * header click) — a zoomable `<button>` nested inside that one would be
   * invalid HTML and fight the outer click, so those two only pass
   * `zoomable` through when they *aren't* wrapped in that outer button
   * (i.e. inside the details modal itself, where the avatar has nothing
   * else to click).
   */
  zoomable?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const sizeClass = SIZE_CLASSES[size];

  if (src && !failed) {
    const img = (
      // eslint-disable-next-line @next/next/no-img-element -- external/base64 sources, not worth configuring next/image for a small thumbnail
      <img
        src={src}
        alt=""
        onError={() => setFailed(true)}
        className={zoomable ? "h-full w-full object-cover" : `${sizeClass} shrink-0 rounded-md border border-slate-800 object-cover`}
      />
    );
    if (!zoomable) return img;
    return (
      <>
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          aria-label={`View larger image of ${label}`}
          className={`${sizeClass} block shrink-0 cursor-zoom-in overflow-hidden rounded-md border border-slate-800 transition hover:brightness-110`}
        >
          {img}
        </button>
        {lightboxOpen && <AvatarLightbox src={src} label={label} onClose={() => setLightboxOpen(false)} />}
      </>
    );
  }
  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-md border border-slate-800 bg-slate-800 font-semibold text-slate-600`}
    >
      {label.trim().charAt(0).toUpperCase() || "?"}
    </div>
  );
}

function AvatarLightbox({ src, label, onClose }: { src: string; label: string; onClose: () => void }) {
  useScrollLock();
  useEscapeToClose(onClose);
  return (
    <Modal
      onClose={onClose}
      zIndexClassName="z-[60]"
      title={label}
      panelClassName="h-[80vh] w-[80vw] max-h-[80vh] max-w-[80vw] gap-3 border-slate-800 bg-slate-950 p-4"
    >
      {/*
        `flex-1` + `min-h-0` (not `max-h-*`/`max-w-*` alone) is what makes
        this actually fill the panel: a plain `<img>` with only a max-size
        cap renders at its own intrinsic pixel size up to that cap, so a
        small source (a creature's 200×200 `AvatarPicker` crop) stayed tiny
        while a large one (a character's full-res D&D Beyond portrait) filled
        the same cap — same lightbox, wildly different apparent size. Giving
        the image a real flexed box plus `object-contain` scales BOTH up or
        down to fill it, so every avatar opens equally large regardless of
        its source resolution.
      */}
      {/* eslint-disable-next-line @next/next/no-img-element -- same external/base64 source as the thumbnail above, just shown at full size */}
      <img src={src} alt={label} className="min-h-0 w-full flex-1 rounded-md object-contain" />
    </Modal>
  );
}
