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
 * the same styled InfoTooltip affordance — `hoverOnly` since the pill's own
 * border/fill already reads as a distinct clickable unit, the same call
 * `AbilityScoreBox` makes for the same reason (and the same reason this
 * wraps the *whole* box rather than just the text inside it — an earlier
 * version nested `InfoTooltip` around only `children`, so hovering the
 * pill's own padding/border, not directly over the text, didn't trigger the
 * hint; wrapping the whole box makes the entire rectangle hoverable, same
 * target size as `AbilityScoreBox`). `truncate` lives on the box itself
 * either way, `panel` or not, so behavior doesn't change based on whether
 * one's passed.
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
  // `hover:brightness-125` (not a `hover:bg-*` swap) so the highlight works
  // identically across every one of `COLOR_STYLES`' hues without a
  // per-color override — same reasoning, same utility, `AbilityScoreBox`
  // uses for its own hover.
  const boxCls = `block truncate rounded-md border px-2 py-1 text-center text-xs font-medium ${colorCls} ${
    panel ? "transition hover:brightness-125" : ""
  }`;
  const content = <span className={boxCls}>{children}</span>;
  if (!panel) return content;
  return (
    <InfoTooltip hoverOnly panel={panel}>
      {content}
    </InfoTooltip>
  );
}
