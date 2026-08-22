import { ReactNode } from "react";
import { InfoTooltip } from "../InfoTooltip";

/**
 * Small bordered badge, optionally with a hover/tap hint — the shared visual
 * and behavioral base for every short meta-tag across the app (recovery
 * type, spell level, mastery, recharge, trait mechanic summaries...). Only
 * the border/text color varies per badge family, chosen deliberately to
 * carry identity — size/shape/weight stay identical everywhere. `panel` is
 * optional: a badge with nothing to explain (e.g. a recharge string that's
 * already self-explanatory) renders the bare span, no `InfoTooltip` wrapper
 * and no hover feedback — there's nothing to reveal, so nothing should hint
 * that there is. `hover:brightness-125` only when `panel` is set mirrors
 * `Pill`'s own identical rule (the app's other rectangular-chip family, used
 * for skills/proficiencies) so every hoverable chip signals "more info on
 * hover" the same way, rather than each chip family inventing its own (or,
 * as this one previously did, no) hover treatment.
 * `uppercase` defaults to on but can be turned off — dice-roll/damage
 * notation (`1d8+SL radiant`) and proper nouns (a spell's own name) must not
 * be force-cased the way a short label like "SR" or "Cantrip" is.
 */
export function MetaBadge({
  label,
  panel,
  colorClassName,
  uppercase = true,
}: {
  label: string;
  panel?: ReactNode;
  colorClassName: string;
  uppercase?: boolean;
}) {
  const badge = (
    <span
      // `inline-block`, not just `no-underline`: a plain inline `<span>`'s own
      // `text-decoration: none` does NOT stop an ancestor's underline (e.g.
      // `FlaggableRow`'s dotted name underline) from painting straight through
      // it — CSS only excludes *atomic* inline-level boxes (inline-block and
      // similar) from an ancestor's decoration line. This was the actual fix
      // needed; `no-underline` alone (the first attempt) does nothing here.
      className={`inline-block shrink-0 whitespace-nowrap rounded border px-1.5 py-0.5 text-[10px] font-semibold no-underline ${uppercase ? "uppercase" : ""} ${panel ? "transition hover:brightness-125" : ""} ${colorClassName}`}
    >
      {label}
    </span>
  );
  if (!panel) return badge;
  return (
    <InfoTooltip hoverOnly panel={panel}>
      {badge}
    </InfoTooltip>
  );
}
