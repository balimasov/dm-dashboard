"use client";

import { useEffect, useRef, useState } from "react";

export interface SelectMenuOption<T extends string> {
  value: T;
  label: React.ReactNode;
}

/**
 * A dropdown styled entirely with this app's own CSS instead of a native
 * `<select>` — a native select's *popup* is drawn by the browser/OS itself,
 * which `color-scheme: dark` only partially hands back control of (in
 * practice it still flashed light and used the browser's own blue accent
 * for the highlighted option, clashing with this app's theme). Same
 * open/close-on-outside-click shape as `SyncAllButton`'s auto-sync menu.
 */
export function SelectMenu<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: SelectMenuOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={containerRef} className={`relative shrink-0 ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-900 px-2 py-1.5 text-sm font-semibold text-slate-100 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-600"
      >
        {current?.label}
        <span className="text-xs text-slate-500">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 min-w-full whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-lg shadow-black/40">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-sm hover:bg-slate-800 ${
                opt.value === value ? "text-sky-400" : "text-slate-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
