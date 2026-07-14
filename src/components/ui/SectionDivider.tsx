import { ReactNode } from "react";

/**
 * Top border + top padding marking a new section within a compact card —
 * the same divider repeated across `CharacterCard`, `CreatureStatBlock`,
 * `CharacterDetailsModal`, `NotesSection`, `QuickNotesSection`. `className`
 * appends extra utilities (e.g. `space-y-3`) a specific call site needs on
 * top of the shared border/padding.
 */
export function SectionDivider({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`border-t border-slate-800 pt-3 ${className}`.trim()}>{children}</div>;
}
