import { StandardAction } from "@/lib/standardActions";
import { AbilityHintPanel } from "./AbilityHintPanel";
import { Pill } from "./Pill";

/**
 * The 15 fixed `STANDARD_ACTIONS` are a rules-reference list, not a
 * character-specific ability — no flame toggle (nothing to flag as a
 * reminder), no attack-style trailing stat. Rendered through `Pill` itself
 * (not a hand-rolled span reusing `Pill`'s classes) — the same component
 * skill/proficiency chips already use — rather than borrowing the filter-
 * chip/toggle-pill look (`TOGGLE_PILL_INACTIVE_CLS`) an earlier round of
 * this component used: a filter chip is a *toggle* (its color pair signals
 * an on/off selection state) while this is a *reference tag* like a skill
 * or proficiency, a different component in substance, not just visually —
 * sharing `Pill` means it automatically gets the same neutral fill
 * (`color="slate"`) and the same `hover:brightness-125` hoverable-chip
 * feedback every skill/proficiency pill already has, instead of drifting
 * out of sync with them the next time either one's hover treatment changes.
 * Hover/tap opens the rules text through `AbilityHintPanel`, the exact same
 * title/meta-line/description shape every other hint in the app (attacks,
 * features, spells) already uses, with the fixed `"Action Standard"` meta
 * line standing in for what a `Feature`'s own `source` line would say.
 */
export function StandardActionChip({ action }: { action: StandardAction }) {
  return (
    <Pill color="slate" panel={<AbilityHintPanel name={action.name} metaLines={["Action Standard"]} description={action.description} />}>
      {action.name}
    </Pill>
  );
}
