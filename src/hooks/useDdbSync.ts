import { useState } from "react";
import { Character } from "@/lib/types";
import { fetchAndParseDdbCharacter } from "@/lib/sync";

/**
 * Shared "sync now" behavior for contexts that persist immediately on
 * success (`CharacterCard`, `CharacterDetailsModal`) — as opposed to
 * `EditCharacterForm`, which syncs into its own local draft and only saves
 * on an explicit Save, so it manages this state itself instead of using
 * this hook.
 */
export function useDdbSync(character: Character, onUpdate?: (id: string, updates: Partial<Character>) => void) {
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sync() {
    if (!onUpdate) return;
    setSyncing(true);
    setError(null);
    try {
      const synced = await fetchAndParseDdbCharacter(character);
      await onUpdate(character.id, synced);
    } catch (err) {
      setError(`Sync failed: ${err instanceof Error ? err.message : "Unknown error."}`);
    } finally {
      setSyncing(false);
    }
  }

  return { syncing, error, sync };
}
