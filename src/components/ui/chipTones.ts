/**
 * One shared fill recipe for every colored chip/badge/pill in the app:
 * `border-{hue}-700 bg-{hue}-950/40 text-{hue}-300` — same border weight,
 * same fill intensity, same text lightness for every hue, so no chip reads
 * "more filled" than its neighbor just because someone picked a different
 * alpha by hand. `MetaBadge` callers (`RecoveryBadge`, weapon mastery,
 * recharge, trait effects, `SpellBadges`) and `Pill`'s "dim" skill/senses
 * recipe both draw from this map instead of each hardcoding their own
 * border/background/text triplet.
 *
 * `blue` and `violet` are reserved and deliberately absent: blue is the
 * Limited Use resource identity color, violet is Spell Slots and spell
 * Concentration (`violet` itself stays available below only because
 * Concentration is the one place besides Spell Slots it's allowed to
 * appear) — no other tone below may use either.
 */
export type ChipTone =
  | "neutral"
  | "red"
  | "green"
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
  neutral: "border-slate-700 bg-slate-950/40 text-slate-300",
  red: "border-red-700 bg-red-950/40 text-red-300",
  green: "border-green-700 bg-green-950/40 text-green-300",
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
