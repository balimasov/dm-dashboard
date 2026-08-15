import { InfoTooltip } from "@/components/InfoTooltip";
import { CHIP_TONE_CLASSES } from "./chipTones";

export type PillColor = "slate" | "sky" | "amber" | "orange" | "rose" | "violet" | "teal" | "zinc" | "box";

/**
 * `dim` (skill/passive pills) draws every *chip*-family color straight from
 * `CHIP_TONE_CLASSES` — the same border-700/bg-950-alpha/text-300 recipe
 * every other chip in the details modal uses, so a skill pill's fill reads
 * exactly as intense as a recovery/mastery/recharge badge next to it. `bold`
 * is a separate, deliberate variant some colors carry: a heavier border and
 * a lighter, more opaque fill than `dim` — it exists because a faint
 * same-family tint reads as barely-there against the app's warm dark
 * background for small, information-dense content — originally `CoinChip`'s
 * own standalone recipe (5 currency colors), folded in here once `Pill`
 * grew the colors to support them. `violet`/`teal`/`zinc` have no `dim` form
 * since nothing used them before coins did; `bold` stays hand-picked rather
 * than derived from `CHIP_TONE_CLASSES` since it's a different visual
 * weight for a different context (currency), not part of the chip-fill
 * unification.
 *
 * `box` is deliberately its own thing, NOT derived from `CHIP_TONE_CLASSES`:
 * it's `AbilityScoreBox`'s own neutral recipe (`border-slate-800
 * bg-slate-800/40`), used by `SensesSection`'s passive-score pills — those
 * are conceptually siblings of the ability-score boxes, not a "chip" with a
 * meaningful hue, and they broke once already when they silently rode
 * `slate`'s default and `slate` was repointed at the chip-fill formula for
 * skill pills' own Untrained state. Keep `box` pinned to `AbilityScoreBox`'s
 * literal classes, not a cross-reference, so a future edit to either one is
 * a deliberate choice instead of an accidental shared side effect.
 */
const COLOR_STYLES: Record<PillColor, { dim?: string; bold?: string }> = {
  slate: { dim: CHIP_TONE_CLASSES.neutral },
  sky: { dim: CHIP_TONE_CLASSES.gold },
  amber: { dim: CHIP_TONE_CLASSES.amber, bold: "border-amber-400 bg-amber-500/15 text-amber-300" },
  orange: { dim: CHIP_TONE_CLASSES.orange, bold: "border-orange-400 bg-orange-500/15 text-orange-300" },
  rose: { dim: CHIP_TONE_CLASSES.rose },
  violet: { bold: "border-violet-400 bg-violet-500/15 text-violet-300" },
  teal: { bold: "border-teal-400 bg-teal-500/15 text-teal-300" },
  zinc: { bold: "border-zinc-300 bg-zinc-400/15 text-zinc-300" },
  box: { dim: "border-slate-800 bg-slate-800/40 text-slate-200" },
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
  color,
  bold = false,
  children,
}: {
  panel?: React.ReactNode;
  /** No default on purpose — an implicit `"slate"` default is exactly how `SensesSection` silently rode the chip-family recipe and broke the moment `slate` was repointed for skill pills' own Untrained state (see `COLOR_STYLES`'s `box` doc comment). Every caller picks a tone on purpose. */
  color: PillColor;
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
