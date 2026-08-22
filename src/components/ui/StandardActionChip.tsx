import { StandardAction } from "@/lib/standardActions";
import { InfoTooltip } from "../InfoTooltip";
import { AbilityHintPanel } from "./AbilityHintPanel";
import { TOGGLE_PILL_INACTIVE_CLS } from "./containerStyles";

/**
 * The 15 fixed `STANDARD_ACTIONS` are a rules-reference list, not a
 * character-specific ability — no flame toggle (nothing to flag as a
 * reminder), no attack-style trailing stat. Rendered as the same toggle-pill
 * shape `FilterChipRow`'s own inactive chip uses (`TOGGLE_PILL_INACTIVE_CLS`)
 * since these already read as "a short reference tag" the same way a filter
 * chip does, just without a click handler — hover/tap opens the rules text
 * through `AbilityHintPanel`, the exact same title/meta-line/description
 * shape every other hint in the app (attacks, features, spells) already
 * uses, with the fixed `"Action Standard"` meta line standing in for what a
 * `Feature`'s own `source` line would say.
 */
export function StandardActionChip({ action }: { action: StandardAction }) {
  return (
    <InfoTooltip hoverOnly panel={<AbilityHintPanel name={action.name} metaLines={["Action Standard"]} description={action.description} />}>
      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${TOGGLE_PILL_INACTIVE_CLS}`}>{action.name}</span>
    </InfoTooltip>
  );
}
