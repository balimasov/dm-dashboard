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
  // Same bottom-of-screen caption `DashboardClient`'s "Sync Party" already
  // shows ("Synced 4 of 5.") after it finishes, just scoped to this one
  // character by name — a single "Sync" here previously finished in total
  // silence (only the persisted `lastSyncError` pill hinted at a failure,
  // and nothing at all confirmed a success), unlike the party button which
  // always had this same summary. Each caller (`CharacterCard`/
  // `CharacterDetailsModal`/`SortableCharacterRow`) renders its own `Toast`
  // off this, the same way `DashboardClient` renders its own off
  // `syncSummary` — one hook instance per mounted sync trigger, so a sync
  // started from the card and one started from its details modal never
  // fight over the same message. `{ message, variant }`, not a bare
  // string — same shape `CampaignsClient`/`CreatureRosterEditor`'s own
  // toast state already uses, so success/failure actually render green/red
  // instead of both falling back to `Toast`'s default amber "info" look
  // (confirmed bug: this was the one toast in the app where a failure
  // didn't read as one).
  const [syncSummary, setSyncSummary] = useState<{ message: string; variant: "success" | "error" } | null>(null);

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
      setSyncSummary({ message: `Synced "${character.name}".`, variant: "success" });
    } catch (err) {
      const message = `Sync failed: ${err instanceof Error ? err.message : "Unknown error."}`;
      setError(message);
      // Persisted separately from the `throw`-free happy path above — this
      // is the one write that survives closing the card or reloading the
      // page, unlike `error` above which resets the moment this hook
      // remounts. See `Character.lastSyncError`'s own doc comment. Keeps
      // the full reason (unlike the toast below) — this is what
      // `SyncIssuePill`'s own tooltip reads back out, and that one's meant
      // to be the detailed, persistent "why" surface.
      await onUpdate(character.id, { lastSyncError: message });
      // Terse "Failed to X" phrasing, matching every other failure toast in
      // the app (`CampaignsClient`/`CreatureRosterEditor`) — the specific
      // reason lives in the persisted `lastSyncError` above (surfaced via
      // `SyncIssuePill`'s tooltip), not duplicated into this transient one.
      setSyncSummary({ message: `Failed to sync "${character.name}".`, variant: "error" });
    } finally {
      setSyncing(false);
    }
  }

  return { syncing, error, syncSummary, dismissSyncSummary: () => setSyncSummary(null), sync };
}
