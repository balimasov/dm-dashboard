import { SyncTimestamp } from "@/components/SyncTimestamp";
import { ExternalLinkIcon } from "./icons";

/**
 * Single shared block for a character's D&D Beyond link/sync state — used
 * identically by `CharacterCard`, `CharacterDetailsModal`,
 * `EditCharacterForm`, and `SortableCharacterRow` (previously each of these
 * built its own version, with three different layouts, colors, and button
 * styles). Renders nothing when there's no `dndBeyondUrl`, since an unlinked
 * character has nothing to show here.
 *
 * Purely read-only display — no sync trigger of its own. Every caller that
 * needs one already has its own dedicated "Sync" action elsewhere (the
 * card/modal kebab menu, the add-character flow's automatic first sync), so
 * this block just reflects whatever that action last did rather than
 * duplicating a second, redundant button for it.
 *
 * `synced` (persisted — did the last save reflect a good D&D Beyond fetch or
 * a manual confirmation?) and `error` (transient — did *this* sync attempt
 * just fail?) are deliberately separate: a stale-but-previously-good
 * character can have a failed refresh attempt without losing its "synced"
 * standing, and vice versa a brand-new link shows the persistent banner
 * until the first sync (or manual Save) clears it.
 */
export function DdbSyncStatus({
  dndBeyondUrl,
  synced,
  lastSyncedAt,
  syncing,
  error,
}: {
  dndBeyondUrl?: string;
  synced?: boolean;
  lastSyncedAt?: string;
  syncing?: boolean;
  error?: string | null;
}) {
  if (!dndBeyondUrl) return null;

  return (
    <div className="space-y-1.5">
      {!synced && (
        <div className="rounded-md border border-amber-900 bg-amber-950/40 px-2 py-1 text-xs text-amber-300">
          Not synced with D&D Beyond — fill in manually.
        </div>
      )}
      {/* `flex-nowrap` deliberately, not `flex-wrap` — this row's parent
          shrinks whenever a sibling (the "🔥 N" reminder badge, the kebab
          menu) takes up more of the shared row's width, and letting this
          wrap to a second line grew the *whole card* taller the moment a
          reminder got flagged, shifting the HP bar and everything below it
          down. The link and sync button always stay on one line and fully
          legible (`shrink-0`); only the trailing timestamp — the least
          essential part — truncates first when room gets tight. */}
      <div className="flex items-center gap-1.5 text-xs leading-none">
        <a
          href={dndBeyondUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-sky-400 hover:underline"
        >
          D&D Beyond <ExternalLinkIcon className="h-3 w-3" />
        </a>
        {syncing ? (
          <span className="min-w-0 truncate text-sky-400">Syncing...</span>
        ) : (
          lastSyncedAt && (
            <span className="min-w-0 truncate text-slate-500">
              <SyncTimestamp iso={lastSyncedAt} />
            </span>
          )
        )}
      </div>
      {error && <p className="text-xs text-amber-400">{error}</p>}
    </div>
  );
}
