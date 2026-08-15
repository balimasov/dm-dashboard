import { ReactNode } from "react";
import { InfoTooltip } from "../InfoTooltip";

/**
 * Small bordered badge, optionally with a hover/tap hint — the shared visual
 * and behavioral base for every short meta-tag across the app (recovery
 * type, spell level, mastery, recharge, trait mechanic summaries...). Only
 * the border/text color varies per badge family, chosen deliberately to
 * carry identity — size/shape/weight stay identical everywhere. `panel` is
 * optional: a badge with nothing to explain (e.g. a recharge string that's
 * already self-explanatory) renders the bare span, no `InfoTooltip` wrapper.
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
      className={`shrink-0 whitespace-nowrap rounded border px-1.5 py-0.5 text-[10px] font-semibold no-underline ${uppercase ? "uppercase" : ""} ${colorClassName}`}
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
