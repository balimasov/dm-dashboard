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
      // `lastSyncError` cleared alongside every other freshly-synced field —
      // a successful sync means whatever failed last time doesn't apply
      // anymore, persisted (not just this component's own `error` state
      // below) so the card's own failure indicator clears too.
      await onUpdate(character.id, { ...synced, lastSyncError: "" });
    } catch (err) {
      const message = `Sync failed: ${err instanceof Error ? err.message : "Unknown error."}`;
      setError(message);
      // Persisted separately from the `throw`-free happy path above — this
      // is the one write that survives closing the card or reloading the
      // page, unlike `error` above which resets the moment this hook
      // remounts. See `Character.lastSyncError`'s own doc comment.
      await onUpdate(character.id, { lastSyncError: message });
    } finally {
      setSyncing(false);
    }
  }

  return { syncing, error, sync };
}
