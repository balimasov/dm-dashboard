import { TabDef } from "./TabBar";

/**
 * A second, visually distinct "pick one of N" switcher alongside `TabBar`
 * (icon-over-label pill segments) and `SegmentedControl` (filled pill
 * segments) — this one reads as a browser-style tab strip: icon and label
 * inline, a full-width bottom rule under the row, and the active tab marked
 * by an accent bottom border instead of a filled background. Not a `variant`
 * prop on `TabBar`: the two don't share a markup skeleton (border-bottom
 * indicator vs. background-fill indicator, inline vs. stacked icon+label),
 * only the same "one active key out of a list" data shape — reuses `TabBar`'s
 * own `TabDef` so callers can switch between the two looks without touching
 * their tab config. Same "nothing to switch between" rule as `TabBar`: a
 * single tab renders no chrome, just its (already-selected) content.
 */
export function TabStrip<T extends string>({
  tabs,
  current,
  onChange,
  className = "",
}: {
  tabs: TabDef<T>[];
  current: T | undefined;
  onChange: (key: T) => void;
  className?: string;
}) {
  if (tabs.length <= 1) return null;
  return (
    <div className={`flex gap-1 overflow-x-auto border-b border-slate-800 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${
            current === tab.key ? "border-sky-400 text-sky-400" : "border-transparent text-slate-500 hover:text-slate-200"
          }`}
        >
          <span aria-hidden="true" className="leading-none">
            {tab.icon}
          </span>
          {tab.text}
        </button>
      ))}
    </div>
  );
}
