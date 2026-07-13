import { ReactNode } from "react";

/** The bordered card every Party Toolkit/Inventory panel is built from — `actions` is an optional right-aligned slot next to the title (e.g. Coverage's "Show all" toggle, Coins' party total). */
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

/** The small uppercase subsection label used inside a `ToolkitCard` (Passives/Skills, Resistances/Immunities, ...) — `className` extends spacing per call site (e.g. `mt-4` before a second subsection). */
export function SectionLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600 ${className}`}>{children}</p>;
}
