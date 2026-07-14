import { Character, RECOVERY_LABELS } from "@/lib/types";
import {
  HeroicInspirationSummary,
  PartyResourceEntry,
  computeHeroicInspirationSummary,
  computePartyResourceSummary,
  computePartyRestRecoveryGauge,
  computePartySpellSlotSummary,
} from "@/lib/partyToolkit";
import { InfoTooltip } from "../InfoTooltip";
import { CharacterChip } from "../ui/CharacterChip";
import { RecoveryBadge } from "../ui/RecoveryBadge";
import { SectionLabel, ToolkitCard } from "../ui/ToolkitCard";
import { CHART_AREA_MIN_HEIGHT_CLASS, HEROIC_INSPIRATION_DESCRIPTION, HolderListPanel, SpellChartsRow, usageColorClass } from "./shared";

function HeroicInspirationRow({ summary }: { summary: HeroicInspirationSummary }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <InfoTooltip
        panel={<HolderListPanel label="Heroic Inspiration" description={HEROIC_INSPIRATION_DESCRIPTION} holders={summary.holders} />}
      >
        <span className="text-slate-300">Heroic Inspiration</span>
      </InfoTooltip>
      <span className={`font-medium ${usageColorClass(summary.withInspiration, summary.partySize)}`}>
        {summary.withInspiration}/{summary.partySize}
      </span>
    </div>
  );
}

/** Same hover-hint content as `ResourceMeter` on the character card (name/source/description) — resources aren't duplicated data here, just a different view of the same fields. */
function ResourceHintPanel({ entry }: { entry: PartyResourceEntry }) {
  return (
    <div className="space-y-1">
      <p className="font-medium text-white">{entry.resourceName}</p>
      {entry.source && <p className="text-xs uppercase tracking-wide text-slate-500">{entry.source}</p>}
      <p>{RECOVERY_LABELS[entry.recovery]} recovery</p>
      {entry.description && <p>{entry.description}</p>}
    </div>
  );
}

function ResourceRow({ entry }: { entry: PartyResourceEntry }) {
  return (
    <div className="flex items-center gap-3 py-1 text-sm">
      <div className="min-w-0 flex-1">
        <InfoTooltip panel={<ResourceHintPanel entry={entry} />}>
          <span className="text-slate-300">{entry.resourceName}</span>
        </InfoTooltip>
      </div>
      <RecoveryBadge recovery={entry.recovery} />
      <span className={`shrink-0 whitespace-nowrap font-medium ${usageColorClass(entry.current, entry.max)}`}>
        {entry.current}/{entry.max}
      </span>
      <CharacterChip name={entry.characterName} avatarUrl={entry.avatarUrl} />
    </div>
  );
}

/**
 * Spell Slots & Resources — the same Rest Recovery/Spell Slots charts
 * `ResourceCoveragePanel` shows (via the shared `SpellChartsRow`), so both
 * panels read as one consistent instrument instead of this one showing an
 * older, different chart style. Below that: Heroic Inspiration, then every
 * limited-use resource in the party.
 */
export function SpellSlotsResourcesPanel({ characters }: { characters: Character[] }) {
  const spellSlots = computePartySpellSlotSummary(characters);
  const inspiration = computeHeroicInspirationSummary(characters);
  const resources = computePartyResourceSummary(characters);
  const restRecovery = computePartyRestRecoveryGauge(characters);

  return (
    <ToolkitCard title="Spell Slots & Resources">
      <div className={CHART_AREA_MIN_HEIGHT_CLASS}>
        <SpellChartsRow restRecovery={restRecovery} spellSlots={spellSlots} />
      </div>

      <SectionLabel className="mt-4">Heroic Inspiration</SectionLabel>
      <HeroicInspirationRow summary={inspiration} />

      <SectionLabel className="mt-4">Resources</SectionLabel>
      {resources.length === 0 ? (
        <p className="mt-2 text-sm text-slate-600">No limited-use resources tracked.</p>
      ) : (
        <div className="divide-y divide-slate-800/60">
          {resources.map((entry) => (
            <ResourceRow key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </ToolkitCard>
  );
}
