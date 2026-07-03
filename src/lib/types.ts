export type RecoveryType =
  | "short-rest"
  | "long-rest"
  | "dawn"
  | "daily"
  | "encounter"
  | "custom"
  | "manual";

export const RECOVERY_LABELS: Record<RecoveryType, string> = {
  "short-rest": "Short Rest",
  "long-rest": "Long Rest",
  dawn: "Dawn",
  daily: "Daily",
  encounter: "Per Encounter",
  custom: "Custom",
  manual: "Manual",
};

export interface Resource {
  id: string;
  name: string;
  current: number;
  max: number;
  recovery: RecoveryType;
  note?: string;
}

export interface SpellSlotLevel {
  level: number;
  current: number;
  max: number;
}

export interface AbilityScores {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export interface CombatState {
  hp: number;
  maxHp: number;
  tempHp: number;
  ac: number;
  speed: number;
  passivePerception: number;
  conditions: string[];
  exhaustion: number;
  concentration?: string;
  deathSaves?: {
    successes: number;
    failures: number;
  };
}

export interface Character {
  id: string;
  name: string;
  race: string;
  className: string;
  subclass?: string;
  level: number;
  role: string;
  heroicInspiration: boolean;
  initiative: number;
  combat: CombatState;
  stats: AbilityScores;
  resources: Resource[];
  spellSlots: SpellSlotLevel[];
  notes: string;
  dndBeyondUrl?: string;
  synced?: boolean;
  lastSyncedAt?: string;
  /**
   * When true, syncing from D&D Beyond keeps the current Max HP untouched and
   * only refreshes current HP against it (damage tracking is safe to trust;
   * the Max HP formula isn't once ability scores have changed after leveling).
   * Automatically set after the first successful sync, but editable — the DM
   * can uncheck it to let one sync recompute Max HP fresh again.
   */
  maxHpLocked?: boolean;
}

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

/** Formats an ISO timestamp using the viewer's own local timezone (not the server's). */
export function formatSyncTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("uk-UA", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function extractDndBeyondCharacterId(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    if (!parsed.hostname.endsWith("dndbeyond.com")) return null;
    const match = parsed.pathname.match(/\/characters\/(\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
