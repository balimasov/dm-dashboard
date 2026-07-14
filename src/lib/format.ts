/** Display-string formatting helpers — split out of `types.ts` so that file stays interfaces/constants only. No game-rules math here (see `characterMath.ts`); these only turn an already-computed value into UI text. */
import { Character, Creature } from "./types";

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function ordinalLevel(level: number): string {
  if (level % 10 === 1 && level % 100 !== 11) return `${level}st`;
  if (level % 10 === 2 && level % 100 !== 12) return `${level}nd`;
  if (level % 10 === 3 && level % 100 !== 13) return `${level}rd`;
  return `${level}th`;
}

/** e.g. "Orc · Barbarian/Path of the Berserker" (level shown separately) */
export function characterInfoLine(character: Character): string {
  const classPart = character.subclass
    ? `${character.className}/${character.subclass}`
    : character.className;
  return [character.race, classPart].filter(Boolean).join(" · ");
}

/** e.g. "Large Celestial" — mirrors `characterInfoLine`'s "Race · Class" convention for the compact creature card. */
export function creatureInfoLine(creature: Pick<Creature, "size" | "creatureType">): string {
  return [creature.size, creature.creatureType].filter(Boolean).join(" ");
}

/**
 * Formats an ISO timestamp using the viewer's own local timezone (not the
 * server's) — this app is used from wherever the DM happens to be, so the
 * displayed time has to track the browser's real zone rather than a fixed
 * one. `timeZone` lets `SyncTimestamp` force a deterministic zone (UTC) for
 * its very first render, matching what the server rendered, before
 * correcting to the real local zone right after mounting — omitted, this
 * defaults to the runtime's own ambient zone (the browser's real one, once
 * called client-side). Omits the year (e.g. "5 Jul, 14:32") — this is
 * always a recent sync, so the year is dead weight that's a common culprit
 * for text overflow next to the header's sync button on narrow mobile
 * viewports.
 */
export function formatSyncTimestamp(iso: string, timeZone?: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    ...(timeZone ? { timeZone } : {}),
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
