function FlameIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path
        d="M12 2.5c-2.2 3-4.5 5.5-4.5 9a4.5 4.5 0 0 0 9 0c0-1.4-.5-2.6-1.2-3.6.3 2-.8 3.3-2 3.3-1.1 0-1.8-.9-1.8-2 0-2.2 1.8-3.6.5-6.7z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Toggling this marks an ability as a reminder the DM wants to flag for the
 * player (players forget they have a spell/skill) — a lit flame icon plus
 * amber row color, persisted on the character (see `flaggedAbilities`) so it
 * survives a page reload, not just component state.
 */
function FlameToggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
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
      <span className={`min-w-0 flex-1 ${flagged ? "text-amber-300" : "text-slate-300"}`}>{children}</span>
      {trailing && <span className="basis-full sm:basis-auto">{trailing}</span>}
    </div>
  );
}
