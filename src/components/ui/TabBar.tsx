export interface TabDef<T extends string> {
  key: T;
  icon: string;
  text: string;
}

/**
 * The icon-tab switcher shared by `CharacterDetailsModal`'s own
 * Weapons/Features and Traits/Spells/Consumables tabs and the party-wide
 * "Actions & Resources" panel's identical set — one implementation so both
 * always look and wrap the same way instead of drifting apart (previously
 * each panel built its own `${icon} ${text}` string as a single label,
 * which the browser was free to line-wrap between icon and text, or mid-
 * phrase for a longer label like "Features and Traits" — inconsistent both
 * from tab to tab and between the two call sites). Icon and text are
 * separate elements stacked vertically, so every tab reads the same way
 * regardless of label length or viewport width: icon on its own line, label
 * centered underneath, wrapping to a second line on its own terms rather
 * than fighting the icon for the first one. Renders nothing when there's
 * only one tab — a single populated section needs no switcher, same "don't
 * show chrome with nothing to choose between" rule both callers already
 * followed before this was extracted.
 */
export function TabBar<T extends string>({
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
    <div className={`flex gap-1 rounded-lg bg-slate-800/60 p-1 text-sm ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1.5 text-center font-medium leading-tight transition-colors ${
            current === tab.key ? "bg-slate-700 text-slate-100" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <span aria-hidden="true" className="text-sm leading-none">
            {tab.icon}
          </span>
          <span>{tab.text}</span>
        </button>
      ))}
    </div>
  );
}
