import { ReactNode } from "react";

/** The bordered card every Party Toolkit/Inventory panel is built from — `actions` is an optional right-aligned slot next to the title (e.g. Coins' party total). `collapsible` is opt-in per caller (controlled, not internal state — the caller owns open/closed so it can persist it, same as `CollapsibleSection` does for whole dashboard sections); a card without it always renders its content, unchanged from before this prop existed. */
export function ToolkitCard({
  title,
  actions,
  collapsible,
  children,
}: {
  title: ReactNode;
  actions?: ReactNode;
  collapsible?: { open: boolean; onToggle: () => void };
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/20">
      <div className="mb-2 flex items-center justify-between gap-3">
        {collapsible ? (
          <button type="button" onClick={collapsible.onToggle} className="group flex items-center gap-1.5 text-left">
            <span
              className={`shrink-0 text-[10px] text-slate-500 transition-transform group-hover:text-slate-300 ${collapsible.open ? "rotate-90" : ""}`}
            >
              ▶
            </span>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 group-hover:text-slate-400">{title}</h3>
          </button>
        ) : (
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
        )}
        {actions}
      </div>
      {(!collapsible || collapsible.open) && children}
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
