import { Character } from "@/lib/types";
import { computeConditionProtectionCoverage, computeResistanceCoverage } from "@/lib/partyToolkit";
import { SectionLabel, ToolkitCard } from "../ui/ToolkitCard";
import { CoverageCountRow } from "./shared";

/**
 * Only resistance/immunity types the party actually has — see
 * `computeResistanceCoverage`/`computeConditionProtectionCoverage`. No
 * pinned "campaign-relevant" list anymore: a DM already knows what matters
 * for their campaign, and showing every possible type at 0/partySize just
 * added noise this simplified view drops.
 */
const RESISTANCE_DESCRIPTION = "Takes half damage from this damage type.";
const IMMUNITY_DESCRIPTION = "Takes no damage or effect from this immunity.";

export function DefensesPanel({ characters }: { characters: Character[] }) {
  const resistances = computeResistanceCoverage(characters);
  const immunities = computeConditionProtectionCoverage(characters);

  return (
    <ToolkitCard title="Defense Coverage">
      <SectionLabel>Resistances</SectionLabel>
      {resistances.length === 0 ? (
        <p className="text-sm text-slate-600">No resistances in the party.</p>
      ) : (
        <div className="space-y-1.5">
          {resistances.map((entry) => (
            <CoverageCountRow key={entry.name} entry={entry} description={RESISTANCE_DESCRIPTION} />
          ))}
        </div>
      )}
      <SectionLabel className="mt-3">Immunities</SectionLabel>
      {immunities.length === 0 ? (
        <p className="text-sm text-slate-600">No immunities in the party.</p>
      ) : (
        <div className="space-y-1.5">
          {immunities.map((entry) => (
            <CoverageCountRow key={entry.name} entry={entry} description={IMMUNITY_DESCRIPTION} />
          ))}
        </div>
      )}
    </ToolkitCard>
  );
}
