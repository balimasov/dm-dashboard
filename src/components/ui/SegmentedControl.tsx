"use client";

/**
 * Generic segmented control — same visual weight as the roster-manager's
 * category tabs and a two-option Active/Hidden switch alike, so both reuse
 * one component instead of each roster editor inventing its own pill.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  scrollable = false,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: React.ReactNode }[];
  /**
   * When true, buttons keep their natural content width and the row scrolls
   * horizontally instead of every button shrinking to fit — for option sets
   * with enough entries (e.g. 4 category tabs) that the default even-fill
   * behavior squeezes labels unreadably on a narrow/mobile viewport. Off by
   * default so the compact two-option Active/Hidden toggle keeps evenly
   * filling whatever width it's given.
   */
  scrollable?: boolean;
}) {
  return (
    <div
      className={`scrollbar-themed flex gap-1 rounded-lg border border-slate-800 bg-slate-900 p-1 ${
        scrollable ? "overflow-x-auto" : ""
      }`}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`${scrollable ? "shrink-0" : "flex-1"} whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition ${
            value === o.value ? "bg-sky-600 text-white" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
