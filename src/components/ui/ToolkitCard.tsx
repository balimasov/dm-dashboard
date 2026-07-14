import { ReactNode } from "react";

/** The bordered card every Party Toolkit/Inventory panel is built from — `actions` is an optional right-aligned slot next to the title (e.g. Coins' party total). */
export function ToolkitCard({ title, actions, children }: { title: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/20">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
        {actions}
      </div>
      {children}
    </div>
  );
}

/**
 * The small uppercase subsection label used inside a `ToolkitCard` (Passives/Skills, Resistances/Immunities, ...) — `className` extends spacing per call site (e.g. `mt-4` before a second subsection).
 *
 * A `<div>`, not a `<p>`: a label that wraps an `InfoTooltip` can contain that
 * tooltip's hint panel in the DOM (the panel is an absolutely-positioned
 * sibling of the trigger text, but still a DOM descendant of this element),
 * and hint panels render block content (`HintPanel`'s root is a `<div>`). A
 * `<p>` can only hold phrasing content, so the browser would silently
 * auto-close it right before that nested `<div>` — the rendered DOM no longer
 * matches what React thinks it produced, and React "corrects" it after
 * hydration (confirmed via a real `<p> cannot contain a nested <div>` console
 * warning once a `SectionLabel` first wrapped an `InfoTooltip` with a
 * `HintPanel`).
 */
export function SectionLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600 ${className}`}>{children}</div>;
}
