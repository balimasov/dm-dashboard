import { InfoTooltip } from "@/components/InfoTooltip";
import { SyncTimestamp } from "@/components/SyncTimestamp";
import { SYNC_TIER_CLASS, syncTier } from "@/lib/syncTier";
import { ClockIcon, ExternalLinkIcon } from "./icons";

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
  showLink = true,
}: {
  dndBeyondUrl?: string;
  synced?: boolean;
  lastSyncedAt?: string;
  syncing?: boolean;
  error?: string | null;
  /** `CharacterCard`/`CharacterDetailsModal` now render the "D&D Beyond ↗" link themselves, inline on the header's "Lvl N" line (no clock/sync-date hint there — see `CharacterHeader`'s own comment) — passing `false` here keeps just the "not synced" banner and error line, so this component doesn't render the same link a second time. `EditCharacterForm`/`SortableCharacterRow` don't have that inline link, so they keep the default. */
  showLink?: boolean;
}) {
  if (!dndBeyondUrl) return null;
  const tier = syncTier(lastSyncedAt);

  return (
    <div className="space-y-1.5">
      {!synced && (
        <div className="rounded-md border border-amber-900 bg-amber-950/40 px-2 py-1 text-xs text-amber-300">
          Not synced with D&D Beyond — fill in manually.
        </div>
      )}
      {/* `flex-nowrap` deliberately, not `flex-wrap` — this row's parent
          shrinks whenever a sibling (the "🔥 N" reminder badge, the AI pill,
          the kebab menu) takes up more of the shared row's width, and
          letting this wrap to a second line grew the *whole card* taller the
          moment a reminder got flagged, shifting the HP bar and everything
          below it down. The link stays on one line and fully legible
          (`shrink-0`); the actual sync date moves into a hover/tap hint on a
          fixed-width clock icon rather than sitting in the row as plain
          text — a date long enough to need truncating was exactly the thing
          that used to disappear first once the AI pill and a reminder badge
          were both present. */}
      {showLink && (
        <div className="flex items-center gap-1.5 text-xs leading-none">
          <a
            href={dndBeyondUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-sky-400 hover:underline"
          >
            D&D Beyond <ExternalLinkIcon className="h-3 w-3" />
          </a>
          {(syncing || lastSyncedAt) && (
            <InfoTooltip
              hoverOnly
              panel={
                <p>
                  {syncing ? (
                    "Syncing with D&D Beyond…"
                  ) : (
                    lastSyncedAt && (
                      <>
                        Synced <span className={`font-semibold ${SYNC_TIER_CLASS[tier]}`}><SyncTimestamp iso={lastSyncedAt} /></span>
                      </>
                    )
                  )}
                </p>
              }
            >
              {/* Neutral while syncing (mid-spin, the tier doesn't matter yet) — otherwise colored by how old `lastSyncedAt` is, via the same tier this character's `EntityActionsMenu` "Sync" row and the header's own clock icon key off. */}
              <ClockIcon
                className={`h-3 w-3 shrink-0 ${syncing ? "animate-spin text-slate-500" : SYNC_TIER_CLASS[tier]}`}
              />
            </InfoTooltip>
          )}
        </div>
      )}
      {error && <p className="text-xs text-amber-400">{error}</p>}
    </div>
  );
}
