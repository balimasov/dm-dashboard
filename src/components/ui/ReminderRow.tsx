"use client";

import { ReminderEntry } from "@/lib/reminders";
import { CONTENT_KIND_ICON } from "@/lib/contentKindIcons";
import { InfoTooltip } from "../InfoTooltip";

/**
 * One reminder row — every entry here is inherently "flagged" (that's the
 * only way it got into a reminders list), but unlike `FlaggableRow`'s own
 * amber flagged *text* on the origin card (Weapons/Features/Spells/
 * Consumables, Creature Traits — deliberately left alone), this row doesn't
 * repeat that part: with every row here already flagged, forcing amber
 * *text* on all of them drowned out each entry's own natural color (e.g.
 * `RARITY_COLOR` on a weapon/consumable name) instead of just tinting the
 * row like the subtle background still does. Plain default text lets that
 * per-entry color read normally, same as it does on the row's origin card
 * when not flagged — the soft amber backing stays, marking the row as a
 * reminder the way it always did. No flame toggle here either: a full
 * flame-icon button at the *start* of every row sat right where a tap
 * aiming for the row's own hover-hint would naturally land, so it doubled
 * as an easy-to-fumble "remove" button. The small "✕" trades that for
 * something deliberately less grabby — off to the side, muted until
 * hovered, small enough not to read as its own row of content the way the
 * flame's `h-6 w-6` circle did.
 *
 * Shared by every place reminders get listed — the dashboard's own
 * `RemindersPanel`, the per-card `ReminderBadge` popover, and the floating
 * `RemindersFab` overlay — so all three read as the same feature rather
 * than three near-identical row implementations drifting apart. `onRemove`
 * is optional: omitted (button hidden) for a read-only view with no way to
 * mutate the underlying character/creature, same "presence toggles
 * visibility" convention used throughout this app's action menus.
 *
 * The hint trigger wraps only the name text, not the whole row — an
 * earlier version put `flex-1` directly on `InfoTooltip`'s own trigger
 * span, which stretched its hover/tap target across all the row's leftover
 * width (past a short name, right up to the "✕" button) instead of just
 * the text itself. `flex-1`/`truncate` now live on a plain sibling span
 * that only handles layout — the `InfoTooltip` nested inside it stays its
 * default `inline-block`, sized to the text alone regardless of how much
 * extra room its flex-item parent claims.
 */
export function ReminderRow({ entry, onRemove }: { entry: ReminderEntry; onRemove?: () => void }) {
  return (
    <div className="-mx-1.5 flex items-center gap-1.5 rounded bg-amber-500/10 px-1.5 py-0.5 text-sm text-slate-300">
      <span aria-hidden="true" className="shrink-0 text-xs leading-none">
        {CONTENT_KIND_ICON[entry.kind]}
      </span>
      <span className="min-w-0 flex-1 truncate">
        <InfoTooltip panel={entry.panel}>{entry.label}</InfoTooltip>
      </span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label="Remove reminder"
          title="Remove reminder"
          className="shrink-0 rounded px-1 text-xs leading-none text-slate-600 hover:bg-slate-800 hover:text-red-400"
        >
          ✕
        </button>
      )}
    </div>
  );
}
