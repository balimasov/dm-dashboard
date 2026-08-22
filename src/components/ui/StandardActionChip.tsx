import { StandardAction } from "@/lib/standardActions";
import { RichText } from "../RichText";
import { InfoTooltip } from "../InfoTooltip";
import { HINT_PANEL_DIVIDER_CLS, TOGGLE_PILL_INACTIVE_CLS } from "./containerStyles";
import { HintPanel } from "./HintPanel";

/**
 * The 15 fixed `STANDARD_ACTIONS` are a rules-reference list, not a
 * character-specific ability — no flame toggle (nothing to flag as a
 * reminder), no attack-style trailing stat. Rendered as the same toggle-pill
 * shape `FilterChipRow`'s own inactive chip uses (`TOGGLE_PILL_INACTIVE_CLS`)
 * since these already read as "a short reference tag" the same way a filter
 * chip does, just without a click handler — hover/tap opens the rules text
 * exactly like any other hint in this app.
 */
export function StandardActionChip({ action }: { action: StandardAction }) {
  return (
    <InfoTooltip
      hoverOnly
      panel={
        <HintPanel
          title={action.name}
          description={
            <span className="block space-y-1.5">
              <span className="block italic">{action.summary}</span>
              <span className={`block ${HINT_PANEL_DIVIDER_CLS}`}>
                <RichText text={action.description} />
              </span>
            </span>
          }
        />
      }
    >
      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${TOGGLE_PILL_INACTIVE_CLS}`}>{action.name}</span>
    </InfoTooltip>
  );
}
