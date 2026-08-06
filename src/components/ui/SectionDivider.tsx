import { ReactNode } from "react";

/**
 * Top border + top padding marking a new section within a compact card —
 * the same divider repeated across `CharacterCard`, `CreatureStatBlock`,
 * `CharacterDetailsModal`, `NotesSection`, `QuickNotesSection`. `className`
 * appends extra utilities (e.g. `space-y-3`) a specific call site needs on
 * top of the shared border/padding.
 *
 * `compact` trims the padding from `pt-3` to `pt-2.5` — a deliberate
 * halfway point, not the fully-tightened `pt-2` an earlier round shipped:
 * that read as too dense once it was live. Opt-in (default unchanged)
 * rather than a blanket app-wide shrink; `CharacterCard`/`CreatureCard`
 * *and* `CharacterDetailsModal`/`CreatureDetailsModal` all pass it now, so
 * the compact cards and their detail popups share one consistent rhythm
 * instead of the cards alone feeling tighter than the modal they open into.
 */
export function SectionDivider({
  children,
  className = "",
  compact = false,
}: {
  children: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return <div className={`border-t border-slate-800 ${compact ? "pt-2.5" : "pt-3"} ${className}`.trim()}>{children}</div>;
}
