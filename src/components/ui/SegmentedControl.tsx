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
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: React.ReactNode }[];
}) {
  return (
    <div className="flex gap-1 rounded-lg border border-slate-800 bg-slate-900 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition ${
            value === o.value ? "bg-sky-600 text-white" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
