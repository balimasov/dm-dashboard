import { ReactNode } from "react";

/**
 * Top border + top padding marking a new section within a compact card —
 * the same divider repeated across `CharacterCard`, `CreatureStatBlock`,
 * `CharacterDetailsModal`, `NotesSection`, `QuickNotesSection`. `className`
 * appends extra utilities (e.g. `space-y-3`) a specific call site needs on
 * top of the shared border/padding.
 *
 * `compact` trims the padding from `pt-3` to `pt-2` — opt-in (default
 * unchanged) rather than a blanket app-wide shrink, since this divider is
 * shared with `CharacterDetailsModal`/`CreatureDetailsModal`, which have a
 * whole viewport to work with and weren't part of the "cards feel too tall"
 * complaint. `CharacterCard`/`CreatureCard` (and the `NotesSection`/
 * `QuickNotesSection` instances they render) pass `compact`; the modals
 * don't, so they keep today's spacing exactly.
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
  return <div className={`border-t border-slate-800 ${compact ? "pt-2" : "pt-3"} ${className}`.trim()}>{children}</div>;
}
