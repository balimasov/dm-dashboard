import { FlameIcon } from "./icons";

/**
 * Toggling this marks an ability as a reminder the DM wants to flag for the
 * player (players forget they have a spell/skill) — a lit flame icon plus
 * amber row color, persisted on the character (see `flaggedAbilities`) so it
 * survives a page reload, not just component state. Exported so
 * `QuickNotesSection` can reuse the exact same flame for marking a quick
 * note as a reminder too, rather than a second hand-rolled copy.
 */
export function FlameToggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-label={active ? "Remove reminder" : "Flag as a reminder"}
      aria-pressed={active}
      title={active ? "Remove reminder" : "Flag as a reminder"}
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
        active ? "text-amber-300 hover:bg-amber-500/10" : "text-slate-600 hover:bg-slate-800 hover:text-amber-400"
      }`}
    >
      <FlameIcon className="h-3.5 w-3.5" filled={active} />
    </button>
  );
}

/**
 * Shared row shell for anything the DM can flag with a reminder flame (a
 * character's features/spells, a creature's traits/actions) — kept as one
 * component so callers never drift out of sync in how a flagged row looks.
 *
 * `flex-wrap` (rather than the plain nowrap row this used to be) matters
 * once `trailing` carries several badges — an imported stat block can pack
 * more than one effect badge onto a single trait (e.g. two or three "other"
 * effects), and `trailing`'s own `shrink-0` refuses to give up width for
 * them. Without wrap, the name's `flex-1 min-w-0` had nowhere left to go but
 * zero — it silently vanished, `truncate` and all, while the badges spilled
 * out past the panel's edge instead of just moving to their own line.
 *
 * `trailing` renders as a direct flex child, not wrapped in its own
 * `basis-full` span — an earlier version forced it onto its own line below
 * every viewport under Tailwind's 640px `sm` breakpoint, i.e. on every phone,
 * regardless of whether the row actually needed to wrap. Each `trailing`
 * component already sets its own `shrink-0 whitespace-nowrap`, so the
 * container's `flex-wrap` alone is enough: it only drops `trailing` to a new
 * line when the row genuinely runs out of room, one-line otherwise.
 *
 * The name itself carries a dotted underline (`decoration-slate-600`
 * explicitly, rather than inheriting the row's own text color) — the same
 * subtle "this is hoverable for more detail" signal on every flaggable row
 * across both details modals and the Reminders panel, regardless of a
 * row's rarity color or flagged state.
 */
export function FlaggableRow({
  flagged,
  onToggleFlag,
  children,
  trailing,
}: {
  flagged: boolean;
  onToggleFlag: () => void;
  children: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded px-1.5 py-0.5 -mx-1.5 text-sm ${flagged ? "bg-amber-500/10" : ""}`}
    >
      <FlameToggle active={flagged} onToggle={onToggleFlag} />
      <span
        className={`min-w-0 flex-1 underline decoration-dotted decoration-slate-600 underline-offset-2 ${flagged ? "text-amber-300" : "text-slate-300"}`}
      >
        {children}
      </span>
      {trailing}
    </div>
  );
}
