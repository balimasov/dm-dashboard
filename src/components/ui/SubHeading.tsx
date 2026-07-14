import { ReactNode } from "react";

/**
 * The small uppercase label above a card section's content ("Senses",
 * "Stats", "Resources"...) — same size/color/spacing everywhere it appears
 * on the compact character/creature cards and their details modals. Not for
 * the bigger `text-sm` section headings on the full edit-page forms —
 * those are a visually distinct, separate tier of heading.
 */
export function SubHeading({ children }: { children: ReactNode }) {
  return <h3 className="mb-1.5 text-xs uppercase tracking-wide text-slate-500">{children}</h3>;
}
