import { ReactNode } from "react";

type HintFactTone = "sky" | "bold" | "text" | "raw";

const TONE_CLS: Record<Exclude<HintFactTone, "raw">, string> = {
  sky: "font-semibold text-sky-400",
  bold: "font-semibold text-slate-100",
  text: "",
};

/**
 * One "label: value" fact line — the single grammar every hint panel in the
 * app (`AttackHintPanel`, `SpellHintPanel`, `CreatureAbilityHintPanel`,
 * `recoveryStatusLine`) already uses for To Hit/Damage/Save DC/Recharge/
 * Recovery/Duration/Casts/Area/Effect, previously hand-rolled slightly
 * differently in each place (same muted label, but drifting value colors —
 * exactly how a creature trait's damage type once ended up sky-400 instead
 * of plain text, and how the same label read at a different font-weight
 * depending on which hint it came from). A muted `text-slate-500` label,
 * then a value styled per `tone`:
 * - **"sky"** (default) — a fact the DM tracks mid-combat: To Hit, Damage,
 *   Save DC, Recharge, Recovery, Duration, Casts, Area, Effect. This is the
 *   overwhelming majority of facts in these hints, so it's the default
 *   rather than something every caller has to opt into.
 * - **"bold"** — bright but uncolored (`text-slate-100`); nothing currently
 *   uses this by default, kept for a future fact that wants emphasis
 *   without claiming the "trackable number" color.
 * - **"text"** — plain weight, no color override — Components' bare "V, S,
 *   M" list, which is prep-time info rather than a combat fact.
 * - **"raw"** — `value` is already fully composed/styled JSX (e.g. a
 *   creature attack's several damage rolls, each with its own dice/type
 *   pair) — rendered as-is after the label, with no extra color/weight
 *   wrapper.
 *
 * Always a block-level line — safe inside `HINT_FACT_ROW_CLS`'s flex row
 * too, since a flex item's own `display` doesn't change how it lays out as
 * a flex child.
 */
export function HintFact({
  label,
  value,
  trailing,
  tone = "sky",
}: {
  label: ReactNode;
  value?: ReactNode;
  /** Rendered immediately after `value` with no separator added — pass your own leading space/comma/dash (e.g. `` `, ${rest}` `` for a concentration duration, `` " " `` before a damage type). */
  trailing?: ReactNode;
  tone?: HintFactTone;
}) {
  return (
    <span className="block">
      <span className="text-slate-500">{label}</span>{" "}
      {tone === "raw" ? value : <span className={TONE_CLS[tone]}>{value}</span>}
      {trailing}
    </span>
  );
}
