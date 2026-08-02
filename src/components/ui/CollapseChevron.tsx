/**
 * The "▶" indicator every collapsible section/card header uses to show
 * open/closed state — rotates 90° when open. Pulled out after `ToolkitCard`
 * and `AiAssistantModal`'s `PlanCard` were found hand-copying the same
 * chevron+rotate markup for the same idea.
 *
 * Deliberately just the indicator, not a full collapsible-header component:
 * `ToolkitCard`'s collapsible header (inline label, `group`-hover text
 * color, card padding baked into `ENTITY_CARD_BASE_CLS`) and `PlanCard`'s
 * (full-width row, background-tint hover, no card padding, richer header
 * content) diverge enough around it that forcing one to wrap the other
 * would mean growing `ToolkitCard`'s prop surface just for this one
 * caller's different layout — the same "same idea, different surrounding
 * layout stays two call sites" reasoning `containerStyles.ts`'s own
 * `ENTITY_CARD_BASE_CLS` comment already applies to `CharacterCard`/
 * `CreatureCard` vs. `ToolkitCard`. `className` covers each caller's own
 * color/hover treatment (e.g. `ToolkitCard`'s `group-hover:text-slate-300`).
 */
export function CollapseChevron({ open, className = "" }: { open: boolean; className?: string }) {
  return <span className={`shrink-0 text-[10px] transition-transform ${open ? "rotate-90" : ""} ${className}`}>▶</span>;
}
