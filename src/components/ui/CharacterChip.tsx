"use client";

import { useState } from "react";

/** A handful of distinguishable colors, picked deterministically per name — not tied to any character identity elsewhere in the app, just enough variety to tell rows apart at a glance in a dense list. */
const CHARACTER_CHIP_COLORS = [
  "border-sky-700 bg-sky-950/40 text-sky-300",
  "border-emerald-700 bg-emerald-950/40 text-emerald-300",
  "border-amber-700 bg-amber-950/40 text-amber-300",
  "border-rose-700 bg-rose-950/40 text-rose-300",
  "border-violet-700 bg-violet-950/40 text-violet-300",
  "border-teal-700 bg-teal-950/40 text-teal-300",
];

function chipColorClass(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return CHARACTER_CHIP_COLORS[Math.abs(hash) % CHARACTER_CHIP_COLORS.length];
}

/**
 * A compact stand-in for a full character name — their avatar if one's set,
 * otherwise the first letter of their name in a small colored circle, full
 * name on hover either way (or `title` override, e.g. "Name x2" for an
 * inventory holder). Only needs a name + optional avatar (not a full
 * `Character`), so it works anywhere a tight row/pill needs to name an
 * owner without a wide, truncating name column — Party Toolkit's resource
 * and coverage rows, Inventory's item-holder clusters.
 *
 * `showTitle` (default on) sets the native `title` attribute, which is the
 * only naming mechanism for a bare chip. Turn it off when the chip is
 * already nested inside our own `InfoTooltip` (e.g. `StrengthChip`) — that
 * hint already states the name, so the browser's native tooltip would just
 * pop up right alongside ours, duplicating it.
 */
export function CharacterChip({
  name,
  avatarUrl,
  title,
  showTitle = true,
}: {
  name: string;
  avatarUrl?: string;
  title?: string;
  showTitle?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const label = showTitle ? (title ?? name) : undefined;
  if (avatarUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external/base64 sources, not worth configuring next/image for a small chip
      <img
        src={avatarUrl}
        alt=""
        title={label}
        onError={() => setFailed(true)}
        className="h-5 w-5 shrink-0 rounded-full border border-slate-700 object-cover"
      />
    );
  }
  return (
    <span
      title={label}
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold ${chipColorClass(name)}`}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

interface ChipHolder {
  characterId?: string;
  characterName: string;
  avatarUrl?: string;
}

/**
 * A row of `CharacterChip`s for the "who has this" cluster — item holders,
 * coverage/ability owners, spell-slot holders, all render the same tight
 * chip-row shape. `chipTitle` overrides the default hover label per holder
 * (e.g. "Name x2" for a stacked inventory item).
 */
export function CharacterChipRow<T extends ChipHolder>({
  holders,
  chipTitle,
}: {
  holders: T[];
  chipTitle?: (holder: T) => string;
}) {
  return (
    <span className="flex shrink-0 items-center gap-0.5">
      {holders.map((h) => (
        <CharacterChip key={h.characterId ?? h.characterName} name={h.characterName} avatarUrl={h.avatarUrl} title={chipTitle?.(h)} />
      ))}
    </span>
  );
}
