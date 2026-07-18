import { Character } from "@/lib/types";
import { computePartyRestRecoveryGauge, computePartySpellSlotSummary } from "@/lib/partyToolkit";
import { ToolkitCard } from "../ui/ToolkitCard";
import { SpellChartsRow } from "./shared";

/**
 * Rest Recovery + Spell Slots, side by side in their own compact card right
 * under Party Vitals — pulled out of `SpellSlotsResourcesPanel` ("Actions &
 * Resources") and `ResourceCoveragePanel` ("Resources & Coverage"), which
 * both used to show this exact same chart pair above their own tabbed/listed
 * content. Rendering it twice never showed different numbers (same party,
 * same aggregation), just doubled the vertical space it cost; one shared
 * glance-level instrument up top, next to the HP rings, reads as the more
 * compact layout. `null` when there's nothing to chart, so an empty party
 * doesn't reserve a blank card.
 */
export function PartyChartsPanel({ characters }: { characters: Character[] }) {
  const restRecovery = computePartyRestRecoveryGauge(characters);
  const spellSlots = computePartySpellSlotSummary(characters);
  const hasRestMeters = Boolean(restRecovery.shortRest || restRecovery.longRest);
  if (!hasRestMeters && !spellSlots) return null;

  return (
    <ToolkitCard title="Rest & Spell Slots">
      <SpellChartsRow restRecovery={restRecovery} spellSlots={spellSlots} />
    </ToolkitCard>
  );
}
