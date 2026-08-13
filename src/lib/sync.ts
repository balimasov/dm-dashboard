import { Character } from "./types";
import { extractDndBeyondCharacterId } from "./dndBeyondUrl";
import { parseDdbCharacter } from "./ddbParser";
import { apiFetch } from "./apiClient";

export interface CharacterSyncIssue {
  label: string;
  message: string;
}

/**
 * One thing to show for both "this character's last sync attempt failed"
 * AND "this character has never synced at all" — `lastSyncError` takes
 * priority since it's the more specific fact when both happen to be true
 * (a freshly-added character whose automatic first sync just failed has
 * `synced: false` *and* a `lastSyncError`). Callers render this through one
 * shared pill (`SyncIssuePill`) instead of the two separate, differently-
 * worded banners this app used to show side by side for the same problem —
 * confirmed redundant against a real screenshot: an already-synced
 * character's failed retry showed the new pill *and* the old amber error
 * line at once, and a freshly-added character whose first sync failed
 * showed the new pill *and* the old "Not synced" banner at once.
 */
export function characterSyncIssue(character: Character): CharacterSyncIssue | null {
  if (character.lastSyncError) {
    return { label: "Sync failed", message: character.lastSyncError };
  }
  if (character.dndBeyondUrl && !character.synced) {
    return { label: "Not synced", message: "Not synced with D&D Beyond yet — fill in manually, or try syncing." };
  }
  return null;
}

export async function fetchAndParseDdbCharacter(character: Character): Promise<Character> {
  const ddbId = character.dndBeyondUrl ? extractDndBeyondCharacterId(character.dndBeyondUrl) : null;
  if (!ddbId) {
    throw new Error("This character doesn't have a valid D&D Beyond link.");
  }

  const res = await apiFetch(`/api/ddb/${ddbId}`);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || `Sync error (${res.status}).`);
  }

  return parseDdbCharacter(json, character);
}
