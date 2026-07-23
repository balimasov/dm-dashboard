"use client";

import { ReminderGroup } from "@/lib/reminders";
import { MoreMenu } from "./MoreMenu";
import { ReminderRow } from "./ReminderRow";

/**
 * Small "🔥 N" pill shown on a `CharacterCard`/`CreatureCard` header row —
 * only when that specific card actually has flagged reminders, never taking
 * up space otherwise (same "presence toggles visibility" convention as the
 * rest of this app's card actions). Clicking it opens a compact popover
 * listing just *this* card's flagged abilities/traits, right next to the
 * card they belong to — the thing the dashboard-wide `RemindersPanel` can't
 * do, since that one lives in a single fixed spot in the page and needs
 * scrolling back to whenever a reminder is actually needed mid-session.
 *
 * Built on `MoreMenu`'s `renderTrigger` escape hatch rather than a new
 * from-scratch popover — reuses its portal positioning and outside-click/
 * scroll-to-close handling, which a plain custom dropdown would otherwise
 * have to reimplement from `InfoTooltip`/`MoreMenu` a third time.
 */
export function ReminderBadge({ group, onRemove }: { group: ReminderGroup | null; onRemove?: (name: string) => void }) {
  if (!group || group.entries.length === 0) return null;

  const label = `${group.entries.length} reminder${group.entries.length === 1 ? "" : "s"}`;

  return (
    <MoreMenu
      label={label}
      portal
      renderTrigger={({ toggle }) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggle();
          }}
          title={label}
          className="flex shrink-0 items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20"
        >
          <span aria-hidden="true">🔥</span>
          {group.entries.length}
        </button>
      )}
    >
      <div className="w-64 max-w-[80vw] p-2">
        <h3 className="mb-2 flex items-center gap-2 px-0.5 text-sm font-bold text-slate-50">
          <span aria-hidden="true">🔥</span>
          Reminders
          <span className="font-normal text-slate-500">({group.entries.length})</span>
        </h3>
        <div className="space-y-0.5">
          {group.entries.map((entry) => (
            <ReminderRow key={entry.name} entry={entry} onRemove={onRemove ? () => onRemove(entry.name) : undefined} />
          ))}
        </div>
      </div>
    </MoreMenu>
  );
}
