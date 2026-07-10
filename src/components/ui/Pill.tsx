import { InfoTooltip } from "@/components/InfoTooltip";

/**
 * `panel` (not a native `title`) so every hoverable hint in the card shares
 * the same styled InfoTooltip affordance — the box itself can't carry
 * `truncate` (InfoTooltip's own inner span already does, and nesting it
 * under another truncating ancestor is the clipping bug this codebase hit
 * more than once), so truncation only applies in the no-panel fallback.
 */
export function Pill({
  panel,
  color = "slate",
  children,
}: {
  panel?: React.ReactNode;
  color?: "slate" | "sky" | "amber" | "orange" | "rose";
  children: React.ReactNode;
}) {
  const colorCls =
    color === "rose"
      ? "border-rose-600 bg-rose-950/40 text-rose-300"
      : color === "amber"
        ? "border-amber-700 bg-amber-950/30 text-amber-300"
        : color === "sky"
          ? "border-sky-700 bg-sky-950/40 text-sky-300"
          : color === "orange"
            ? "border-orange-700 bg-orange-950/30 text-orange-300"
            : "border-slate-800 bg-slate-800/40 text-slate-200";
  const boxCls = `rounded-md border px-2 py-1 text-center text-xs font-medium ${colorCls}`;
  if (!panel) {
    return <span className={`block truncate ${boxCls}`}>{children}</span>;
  }
  return (
    <span className={`block ${boxCls}`}>
      <InfoTooltip panel={panel}>{children}</InfoTooltip>
    </span>
  );
}
