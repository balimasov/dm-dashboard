import { SyncTimestamp } from "@/components/SyncTimestamp";
import { ExternalLinkIcon, RefreshIcon } from "./icons";

/**
 * Single shared block for a character's D&D Beyond link/sync state — used
 * identically by `CharacterCard`, `CharacterDetailsModal`, and
 * `EditCharacterForm` (previously each of these built its own version, with
 * three different layouts, colors, and button styles). Renders nothing when
 * there's no `dndBeyondUrl`, since an unlinked character has nothing to show
 * here.
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
  onSync,
}: {
  dndBeyondUrl?: string;
  synced?: boolean;
  lastSyncedAt?: string;
  syncing?: boolean;
  error?: string | null;
  onSync?: () => void;
}) {
  if (!dndBeyondUrl) return null;

  return (
    <div className="space-y-1.5">
      {!synced && (
        <div className="rounded-md border border-amber-900 bg-amber-950/40 px-2 py-1 text-xs text-amber-300">
          Not synced with D&D Beyond — fill in manually.
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs leading-none">
        <a
          href={dndBeyondUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-0.5 whitespace-nowrap text-sky-400 hover:underline"
        >
          D&D Beyond <ExternalLinkIcon className="h-3 w-3" />
        </a>
        {onSync && (
          <button
            type="button"
            onClick={onSync}
            disabled={syncing}
            aria-label="Sync with D&D Beyond"
            title="Sync with D&D Beyond"
            className="rounded p-0.5 text-slate-500 hover:text-sky-400 disabled:opacity-50"
          >
            <RefreshIcon className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
          </button>
        )}
        {syncing ? (
          <span className="whitespace-nowrap text-sky-400">Syncing...</span>
        ) : (
          lastSyncedAt && (
            <span className="whitespace-nowrap text-slate-500">
              Synced <SyncTimestamp iso={lastSyncedAt} />
            </span>
          )
        )}
      </div>
      {error && <p className="text-xs text-amber-400">{error}</p>}
    </div>
  );
}
