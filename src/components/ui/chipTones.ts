/**
 * One shared fill recipe for every colored chip/badge/pill in the app:
 * border/bg/text at a matched weight, same fill intensity, same text
 * lightness for every hue, so no chip reads "more filled" than its
 * neighbor just because someone picked a different alpha by hand.
 * `MetaBadge` callers (`RecoveryBadge`, weapon mastery, recharge, trait
 * effects, `SpellBadges`) and `Pill`'s "dim" skill/senses recipe both draw
 * from this map instead of each hardcoding their own
 * border/background/text triplet.
 *
 * Most tones are still plain Tailwind hues at `700/950-alpha/300`. `sr`,
 * `lr`, `steel`, and `neutral` are arbitrary hex triplets instead — picked
 * by hand in the interactive chip-color prototype (click a hue, nudge a
 * per-chip lightness slider until the background stays visible against
 * the app's own near-black) rather than derived from a single named
 * Tailwind hue, so they're spelled out as literal `bg-[#hex]/alpha`
 * values instead of a `{hue}-950/40` reference.
 *
 * `violet` stays reserved for Spell Slots and spell Concentration — no
 * other tone may use it. `blue` was reserved the same way for the Limited
 * Use resource identity dot, but `lr` below is now a deliberately chosen
 * blue-family hex after several rounds of hands-on iteration — a
 * conscious tradeoff picked in the prototype, not an oversight. A Limited
 * Use dot and an `lr` chip can land on the same row (`ChargeBadge`), so
 * this is worth knowing before reusing blue again elsewhere.
 */
export type ChipTone =
  | "neutral"
  | "steel"
  | "sr"
  | "lr"
  | "lime"
  | "pink"
  | "fuchsia"
  | "yellow"
  | "gold"
  | "violet"
  | "cyan"
  | "emerald"
  | "rose"
  | "amber"
  | "orange";

export const CHIP_TONE_CLASSES: Record<ChipTone, string> = {
  /** Skill "Untrained" (`Pill`'s `slate`, also Languages/Tools proficiency pills) and Recovery "Custom" — nudged a few points warmer (more red/less blue in each channel) than a flatly cool gray would be, to sit comfortably in the app's warm-reskinned palette, while staying desaturated enough to still read as "no particular color" rather than becoming its own accent hue. */
  neutral: "border-[#736550] bg-[#362f24]/46 text-[#d6cebe]",
  /**
   * Recovery "Manual"/"Short Rest"/"Long Rest" now read as one blue family,
   * palest to darkest — `steel` (M), `sr`, `lr` — instead of M sitting in
   * the unrelated warm-neutral family while only SR/LR were blue. Picked in
   * a dedicated color-prototype round (three graduated options compared
   * against the app's real rendered background, not an approximation) —
   * `steel`/`sr` are that round's "Balanced" option, `lr` is deliberately
   * its "Restrained" option instead of Balanced's own (darker, less
   * saturated navy reads calmer as the *longest*-recovery tier than
   * Balanced's own LR did).
   */
  steel: "border-[#93aabb] bg-[#283440]/46 text-[#d6e3ec]",
  sr: "border-[#2a8ce0] bg-[#0a4278]/46 text-[#b9ddf9]",
  lr: "border-[#1f4080] bg-[#0a1f47]/46 text-[#a3bce6]",
  lime: "border-lime-700 bg-lime-950/40 text-lime-300",
  pink: "border-pink-700 bg-pink-950/40 text-pink-300",
  fuchsia: "border-fuchsia-700 bg-fuchsia-950/40 text-fuchsia-300",
  yellow: "border-yellow-700 bg-yellow-950/40 text-yellow-300",
  /** The app's warm reskinned accent ramp (see `globals.css`'s `sky` `@theme` override) — recharge and Ritual's shared "auxiliary mechanical tag" gold. */
  gold: "border-sky-700 bg-sky-950/40 text-sky-300",
  violet: "border-violet-700 bg-violet-950/40 text-violet-300",
  cyan: "border-cyan-700 bg-cyan-950/40 text-cyan-300",
  emerald: "border-emerald-700 bg-emerald-950/40 text-emerald-300",
  rose: "border-rose-700 bg-rose-950/40 text-rose-300",
  amber: "border-amber-700 bg-amber-950/40 text-amber-300",
  orange: "border-orange-700 bg-orange-950/40 text-orange-300",
};
