"use client";

import { useState } from "react";

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
}: {
  src?: string;
  label: string;
  size?: keyof typeof SIZE_CLASSES;
}) {
  const [failed, setFailed] = useState(false);
  const sizeClass = SIZE_CLASSES[size];

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external/base64 sources, not worth configuring next/image for a small thumbnail
      <img
        src={src}
        alt=""
        onError={() => setFailed(true)}
        className={`${sizeClass} shrink-0 rounded-md border border-slate-800 object-cover`}
      />
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
