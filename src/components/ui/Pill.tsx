import { InfoTooltip } from "@/components/InfoTooltip";

export type PillColor = "slate" | "sky" | "amber" | "orange" | "rose" | "violet" | "teal" | "zinc";

/**
 * Each color's recipe is picked independently rather than derived from one
 * shared formula — `rose`'s weight already differed slightly from
 * `amber`/`orange` before `bold` existed. `bold` is a second, deliberate
 * variant some colors carry: a heavier border and a lighter, more opaque
 * fill than the default "dim" recipe. It exists because a faint same-family
 * tint reads as barely-there against the app's warm dark background for
 * small, information-dense content — originally `CoinChip`'s own standalone
 * recipe (5 currency colors), folded in here once `Pill` grew the colors to
 * support them. `violet`/`teal`/`zinc` have no "dim" form since nothing used
 * them before coins did; `amber`/`orange` keep their original dim form for
 * skill/passive pills, with `bold` as an explicit opt-in for the coin case.
 */
const COLOR_STYLES: Record<PillColor, { dim?: string; bold?: string }> = {
  slate: { dim: "border-slate-800 bg-slate-800/40 text-slate-200" },
  sky: { dim: "border-sky-700 bg-sky-950/40 text-sky-300" },
  amber: {
    dim: "border-amber-700 bg-amber-950/30 text-amber-300",
    bold: "border-amber-400 bg-amber-500/15 text-amber-300",
  },
  orange: {
    dim: "border-orange-700 bg-orange-950/30 text-orange-300",
    bold: "border-orange-400 bg-orange-500/15 text-orange-300",
  },
  rose: { dim: "border-rose-600 bg-rose-950/40 text-rose-300" },
  violet: { bold: "border-violet-400 bg-violet-500/15 text-violet-300" },
  teal: { bold: "border-teal-400 bg-teal-500/15 text-teal-300" },
  zinc: { bold: "border-zinc-300 bg-zinc-400/15 text-zinc-300" },
};

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
  bold = false,
  children,
}: {
  panel?: React.ReactNode;
  color?: PillColor;
  /** Heavier border + lighter fill instead of the default dim recipe — see `COLOR_STYLES`'s doc comment. Colors with no dim form of their own (violet/teal/zinc) render bold either way. */
  bold?: boolean;
  children: React.ReactNode;
}) {
  const style = COLOR_STYLES[color];
  const colorCls = (bold ? style.bold : style.dim) ?? style.bold ?? style.dim!;
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
