import { Character } from "@/lib/types";
import { PartyConsumableTypeSummary, computePartyConsumablesSummary } from "@/lib/partyToolkit";
import { InfoTooltip } from "../InfoTooltip";
import { HintPanel } from "../ui/HintPanel";
import { ToolkitCard } from "../ui/ToolkitCard";
import { HISTOGRAM_COLUMN_WIDTH_PX, HISTOGRAM_MAX_HEIGHT_PX, HISTOGRAM_MIN_HEIGHT_PX } from "./shared";

/** Which named items make up one type's bar — same idea as `SpellSlotLevelPanel`'s per-character breakdown, just per-item instead. */
function ConsumableTypeColumnPanel({ typeSummary }: { typeSummary: PartyConsumableTypeSummary }) {
  return (
    <HintPanel
      title={typeSummary.type}
      rows={typeSummary.entries}
      rowKey={(e) => e.name}
      rowClassName="flex items-center justify-between gap-4"
      renderRow={(e) => (
        <>
          <span className="min-w-0 truncate">{e.name}</span>
          <span className="shrink-0 whitespace-nowrap font-medium text-slate-100">{e.totalQuantity}</span>
        </>
      )}
    />
  );
}

/**
 * One consumable type as a vertical bar — height is that type's own total
 * quantity, scaled against the party's largest type so every type stays
 * visible (same scaling `SpellSlotColumn` uses). A solid single-color fill,
 * not a track+fill split like `SpellSlotColumn`: a consumable type has no
 * intrinsic ceiling the way a spell slot level does (fixed by class level),
 * so there's nothing for the bar's own height to be a *percentage* of — it's
 * just a running total that only ever goes down, so one flat identity color
 * (not a danger tier) is enough.
 */
function ConsumableTypeColumn({ typeSummary, maxAcrossTypes }: { typeSummary: PartyConsumableTypeSummary; maxAcrossTypes: number }) {
  const barHeight =
    maxAcrossTypes > 0
      ? HISTOGRAM_MIN_HEIGHT_PX + (typeSummary.totalQuantity / maxAcrossTypes) * (HISTOGRAM_MAX_HEIGHT_PX - HISTOGRAM_MIN_HEIGHT_PX)
      : HISTOGRAM_MIN_HEIGHT_PX;

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] font-semibold tabular-nums text-slate-100">{typeSummary.totalQuantity}</span>
      <InfoTooltip hoverOnly panel={<ConsumableTypeColumnPanel typeSummary={typeSummary} />}>
        <div className="rounded-md bg-blue-400" style={{ width: `${HISTOGRAM_COLUMN_WIDTH_PX}px`, height: `${barHeight}px` }} />
      </InfoTooltip>
      <span className="max-w-[56px] truncate text-[10px] font-semibold text-slate-400" title={typeSummary.type}>
        {typeSummary.type}
      </span>
    </div>
  );
}

/** Same layout `SpellSlotHistogram` uses — columns on the left, a Total box on the right (below, on narrow screens). */
function ConsumablesHistogram({ types, totalQuantity }: { types: PartyConsumableTypeSummary[]; totalQuantity: number }) {
  const maxAcrossTypes = Math.max(...types.map((t) => t.totalQuantity));
  return (
    <div className="@container flex w-full max-w-full flex-col items-center gap-3 @[512px]:w-auto @[512px]:flex-row @[512px]:items-end @[512px]:gap-5">
      <div className="flex max-w-full shrink-0 items-end gap-3 overflow-x-auto pb-1 @[512px]:overflow-visible @[512px]:pb-0">
        {types.map((t) => (
          <ConsumableTypeColumn key={t.type} typeSummary={t} maxAcrossTypes={maxAcrossTypes} />
        ))}
      </div>
      <div className="flex shrink-0 flex-col items-center gap-1 border-t border-slate-800 pt-2 @[512px]:border-l @[512px]:border-t-0 @[512px]:pl-5 @[512px]:pt-0">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">Total</span>
        <span className="text-sm font-semibold tabular-nums text-slate-100">{totalQuantity}</span>
      </div>
    </div>
  );
}

/**
 * Party-wide Consumables, at a glance — how many potions/scrolls/etc are
 * left by D&D Beyond type, not which specific ones (see Actions &
 * Resources' own Consumables tab for the itemized list: per-item hints,
 * rarity color, who's carrying what — everything this panel used to show
 * directly before it grew into a long list). Same visual language as the
 * Spell Slots histogram right above it: one bar per type, a Total box on
 * the side. Always renders (with a placeholder when nobody's carrying
 * anything), same as every other Party Toolkit panel.
 */
export function ConsumablesPanel({ characters }: { characters: Character[] }) {
  const summary = computePartyConsumablesSummary(characters);

  return (
    <ToolkitCard title="Consumables">
      {summary ? (
        <ConsumablesHistogram types={summary.types} totalQuantity={summary.totalQuantity} />
      ) : (
        <p className="text-sm text-slate-500">No consumables tracked on any character.</p>
      )}
    </ToolkitCard>
  );
}
