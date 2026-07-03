/**
 * Truncating an element requires `overflow: hidden`, which would also clip an
 * absolutely-positioned tooltip nested inside it. So the truncated text and
 * the tooltip panel are siblings under one non-clipping `relative` wrapper —
 * only the text span truncates, the panel is free to render outside its box.
 */
export function InfoTooltip({
  children,
  panel,
}: {
  children: React.ReactNode;
  panel: React.ReactNode;
}) {
  return (
    <span className="group/tooltip relative block max-w-full cursor-help">
      <span className="block truncate underline decoration-dotted decoration-slate-600 underline-offset-2">
        {children}
      </span>
      <span className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden w-64 max-w-[80vw] rounded-md border border-slate-700 bg-slate-950 p-2 text-xs font-normal normal-case leading-snug text-slate-300 shadow-xl group-hover/tooltip:block group-focus/tooltip:block">
        {panel}
      </span>
    </span>
  );
}
