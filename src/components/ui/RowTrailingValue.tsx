import { ReactNode } from "react";

/**
 * The two atoms every row's "trailing" combat-numbers block
 * (`SpellTrailing`, `AttackTrailing`, `AbilityTraitTrailing`) is built from —
 * named here after those three drifted from each other twice over (a
 * container text size drift, a middle-dot size drift) purely because each
 * one hand-rolled the same value/label/separator spans in its own file. Same
 * idea as `HintFact` for hint-panel fact lines, one level down: this is the
 * row itself, not its hover-hint.
 */

/** A bold `sky-400` combat value (to-hit, damage die, DC...), with an optional small muted label right after it (damage type, save ability) — `items-baseline` so the label's smaller text still sits on the value's baseline instead of floating above it. */
export function TrailingValue({ value, label }: { value: ReactNode; label?: ReactNode }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="font-semibold text-sky-400">{value}</span>
      {label && <span className="text-[10px] text-slate-300">{label}</span>}
    </span>
  );
}

/**
 * The middle-dot seam between two `TrailingValue`s on the same line (e.g.
 * to-hit · damage). Fixed at one size (`text-sm`) — `AttackTrailing` once
 * bumped its own copy to `text-base` because `text-slate-600` read too faint
 * at this row's dense size, but that reasoning no longer applies now that
 * every dot uses the brighter `text-slate-500`; a single shared size just
 * removes the drift instead of re-deciding it per file.
 */
export function TrailingDot() {
  return <span className="text-sm font-bold leading-none text-slate-500">·</span>;
}
