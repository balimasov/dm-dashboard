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
  /** Recovery "Manual" only — deliberately a different lightness than `neutral` even though both start from the same gray hue, so Manual and Untrained/Custom don't read as identical. */
  steel: "border-[#a8a094] bg-[#655d53]/46 text-[#f1f0ee]",
  sr: "border-[#1daff1] bg-[#085c82]/46 text-[#c8e8f6]",
  lr: "border-[#0950c3] bg-[#04265e]/46 text-[#acc6f1]",
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
