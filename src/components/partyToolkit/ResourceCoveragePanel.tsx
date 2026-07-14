import { useState } from "react";
import { Character } from "@/lib/types";
import { ordinalLevel } from "@/lib/format";
import {
  RESOURCE_COVERAGE_CATEGORY_ORDER,
  ResourceAvailability,
  ResourceCoverageCategory,
  ResourceCoverageEntry,
  computePartyResourceGauge,
  computePartyRestRecoveryGauge,
  computePartySpellSlotSummary,
  computeResourceCoverage,
} from "@/lib/partyToolkit";
import { InfoTooltip } from "../InfoTooltip";
import { RichText } from "../RichText";
import { CharacterChip, CharacterChipRow } from "../ui/CharacterChip";
import { RecoveryBadge } from "../ui/RecoveryBadge";
import { SectionLabel, ToolkitCard } from "../ui/ToolkitCard";
import {
  CHART_AREA_MIN_HEIGHT_CLASS,
  HEROIC_INSPIRATION_DESCRIPTION,
  HintPanel,
  HolderListPanel,
  PartyResourceGaugeDisplay,
  PartyResourcesHint,
  PartyRestRecoveryDisplay,
  SpellSlotLevelPanel,
  usageColorClass,
} from "./shared";

/**
 * NEW — built alongside `SpellSlotsResourcesPanel`/`CoveragePanel` rather
 * than replacing them, while this merged layout is being shaped. See
 * `computeResourceCoverage`'s doc comment for why the two old panels don't
 * cover the same question: one answered "how much is left", the other "who
 * can solve X problem" — a DM had to jump between them to get both halves
 * of "what can I use, and is it actually available right now". Delete the
 * two old panels (and their now-dead `SpellSlotsResourcesPanel`/
 * `CoveragePanel` components) once this one is confirmed as their
 * replacement.
 */

/** Heroic Inspiration is the one entry with no real character behind it — same special case `CoveragePanel` handled, rendered as plain "x/partySize" text instead of a chip row. */
function SpecialRow({ entry }: { entry: ResourceCoverageEntry }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1 text-sm">
      <div className="min-w-0 flex-1">
        <InfoTooltip
          panel={<HolderListPanel label={entry.name} description={HEROIC_INSPIRATION_DESCRIPTION} holders={entry.holders ?? []} />}
        >
          <span className="text-slate-300">{entry.name}</span>
        </InfoTooltip>
      </div>
      <span className="shrink-0 text-slate-500">{entry.characterName}</span>
    </div>
  );
}

function TrackableHintPanel({ entry }: { entry: ResourceCoverageEntry }) {
  return <HintPanel title={entry.name} description={entry.description && <RichText text={entry.description} />} />;
}

/** `pool` shows the exact charge count, same convention as the old Resources row. `slot` can't show one exact number the way a pool can (a spell slot is a shared party-wide/per-caster pool, not this ability's own) — an available/depleted badge instead, with the precise count in the hover title. */
function AvailabilityBadge({ availability }: { availability: ResourceAvailability }) {
  if (availability.kind === "pool") {
    return (
      <span className={`shrink-0 whitespace-nowrap text-xs font-medium tabular-nums ${usageColorClass(availability.current, availability.max)}`}>
        {availability.current}/{availability.max}
      </span>
    );
  }
  const ordinal = ordinalLevel(availability.level);
  return (
    <span
      title={`${availability.remaining} slot${availability.remaining === 1 ? "" : "s"} available at ${ordinal} level or higher`}
      className={`shrink-0 rounded border px-1 text-[10px] font-semibold uppercase ${
        availability.available ? "border-emerald-700 text-emerald-400" : "border-red-800 text-red-400"
      }`}
    >
      {ordinal}+
    </span>
  );
}

/** One row per (character, ability) — deliberately not grouped by name like a passive pill below, since grouping would hide exactly the "how much is left" detail this merged panel exists to surface. */
function TrackableRow({ entry }: { entry: ResourceCoverageEntry }) {
  const availability = entry.availability!;
  return (
    <div className="flex items-center gap-2 py-1 text-sm">
      <div className="min-w-0 flex-1">
        <InfoTooltip panel={<TrackableHintPanel entry={entry} />}>
          <span className="text-slate-300">{entry.name}</span>
        </InfoTooltip>
      </div>
      {availability.kind === "pool" && <RecoveryBadge recovery={availability.recovery} />}
      <AvailabilityBadge availability={availability} />
      <CharacterChip name={entry.characterName} avatarUrl={entry.avatarUrl} />
    </div>
  );
}

interface NameGroup {
  name: string;
  holders: ResourceCoverageEntry[];
}

/** Same grouping `CoveragePanel` uses — multiple characters knowing the same passive spell/trait collapse into one pill with several chips, since there's no per-holder quantity to lose by grouping (unlike `TrackableRow` above). */
function groupByName(entries: ResourceCoverageEntry[]): NameGroup[] {
  const byName = new Map<string, NameGroup>();
  for (const entry of entries) {
    if (!byName.has(entry.name)) byName.set(entry.name, { name: entry.name, holders: [] });
    byName.get(entry.name)!.holders.push(entry);
  }
  return Array.from(byName.values());
}

function PassiveHintPanel({ group }: { group: NameGroup }) {
  const holdersWithCharacter = group.holders.filter((h) => h.characterId);
  const description = group.holders.find((h) => h.description)?.description;
  return (
    <HintPanel
      title={group.name}
      description={description && <RichText text={description} />}
      rows={holdersWithCharacter}
      rowKey={(h) => h.characterId!}
      renderRow={(h) => h.characterName}
    />
  );
}

function PassivePill({ group }: { group: NameGroup }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1 text-sm">
      <div className="min-w-0 flex-1">
        <InfoTooltip panel={<PassiveHintPanel group={group} />}>
          <span className="text-slate-300">{group.name}</span>
        </InfoTooltip>
      </div>
      <CharacterChipRow holders={group.holders} />
    </div>
  );
}

/** Splits a category's already-sorted entries into the three row shapes above — `computeResourceCoverage` already ranks trackable-and-available first, so this only needs to separate by *kind* of row, not re-sort. */
function splitCategoryEntries(entries: ResourceCoverageEntry[]) {
  const special = entries.filter((e) => e.holders);
  const trackable = entries.filter((e) => !e.holders && e.availability);
  const passiveGroups = groupByName(entries.filter((e) => !e.holders && !e.availability));
  return { special, trackable, passiveGroups };
}

/** Approximate rendered line count for a category — used only to balance column heights, so it doesn't need to be exact. */
function categoryLineCount(entries: ResourceCoverageEntry[]): number {
  const { special, trackable, passiveGroups } = splitCategoryEntries(entries);
  return special.length + trackable.length + passiveGroups.length;
}

/** The empty-category placeholder was reading as regular (if dim) content and blending into the populated blocks around it in a 4-column layout — italicized and a shade darker than `SectionLabel` itself so it unmistakably reads as "nothing here" rather than a line of real data. */
function EmptyCategoryPlaceholder() {
  return <p className="text-xs italic text-slate-700">— none —</p>;
}

function ResourceCoverageCategoryBlock({ category, entries }: { category: ResourceCoverageCategory; entries: ResourceCoverageEntry[] }) {
  const { special, trackable, passiveGroups } = splitCategoryEntries(entries);
  const isEmpty = special.length === 0 && trackable.length === 0 && passiveGroups.length === 0;
  return (
    <div>
      <SectionLabel>{category}</SectionLabel>
      {isEmpty ? (
        <EmptyCategoryPlaceholder />
      ) : (
        <div className="divide-y divide-slate-800/60">
          {special.map((e) => (
            <SpecialRow key={e.name} entry={e} />
          ))}
          {trackable.map((e) => (
            <TrackableRow key={`${e.characterId}-${e.name}`} entry={e} />
          ))}
          {passiveGroups.map((g) => (
            <PassivePill key={g.name} group={g} />
          ))}
        </div>
      )}
    </div>
  );
}

const COLUMNS = 4;

/** Same greedy bin-packing `CoveragePanel.distributeCoverageColumns` uses, kept as its own local copy rather than a shared export — this panel's category set (`+ "Other"`) and per-category weight (line count, not group count) both differ enough that sharing the function would need a generic wrapper for one caller each. */
function distributeColumns(
  categories: ResourceCoverageCategory[],
  coverage: Record<ResourceCoverageCategory, ResourceCoverageEntry[]>,
  numColumns: number
): ResourceCoverageCategory[][] {
  const weight = (category: ResourceCoverageCategory) => categoryLineCount(coverage[category]) + 1;
  const columns: ResourceCoverageCategory[][] = Array.from({ length: numColumns }, () => []);
  const heights = new Array(numColumns).fill(0);

  for (const category of [...categories].sort((a, b) => weight(b) - weight(a))) {
    let shortest = 0;
    for (let i = 1; i < numColumns; i++) {
      if (heights[i] < heights[shortest]) shortest = i;
    }
    columns[shortest].push(category);
    heights[shortest] += weight(category);
  }

  for (const column of columns) {
    column.sort((a, b) => RESOURCE_COVERAGE_CATEGORY_ORDER.indexOf(a) - RESOURCE_COVERAGE_CATEGORY_ORDER.indexOf(b));
  }
  return columns;
}

export function ResourceCoveragePanel({ characters }: { characters: Character[] }) {
  const [showAll, setShowAll] = useState(false);
  const coverage = computeResourceCoverage(characters);
  const categoriesWithEntries = RESOURCE_COVERAGE_CATEGORY_ORDER.filter((category) => coverage[category].length > 0);
  const categories = showAll ? RESOURCE_COVERAGE_CATEGORY_ORDER : categoriesWithEntries;
  const columns = distributeColumns(categories, coverage, COLUMNS);

  const spellSlots = computePartySpellSlotSummary(characters);
  const gauge = computePartyResourceGauge(characters);
  const restRecovery = computePartyRestRecoveryGauge(characters);

  return (
    <ToolkitCard
      title="Resources & Coverage"
      actions={
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="shrink-0 text-xs text-sky-400 hover:text-sky-300"
        >
          {showAll ? "Show fewer" : `Show all ${RESOURCE_COVERAGE_CATEGORY_ORDER.length} categories`}
        </button>
      }
    >
      {gauge && (
        <div className={CHART_AREA_MIN_HEIGHT_CLASS}>
          <SectionLabel className="text-center">
            <InfoTooltip inline panel={<PartyResourcesHint resourceCount={gauge.resourceCount} />}>
              Party Resources
            </InfoTooltip>
          </SectionLabel>
          <PartyResourceGaugeDisplay gauge={gauge} />
          <PartyRestRecoveryDisplay recovery={restRecovery} />
        </div>
      )}

      <SectionLabel className={gauge ? "mt-4" : ""}>Spell Slots</SectionLabel>
      {!spellSlots ? (
        <p className="text-sm text-slate-600">No spell slots in the party.</p>
      ) : (
        <div className="divide-y divide-slate-800/60">
          {spellSlots.levels.map((l) => (
            <div key={l.level} className="flex items-center justify-between gap-3 py-1 text-sm">
              <InfoTooltip panel={<SpellSlotLevelPanel level={l.level} holders={l.holders} />}>
                <span className="text-slate-300">{ordinalLevel(l.level)} Level</span>
              </InfoTooltip>
              <span className={`font-medium ${usageColorClass(l.current, l.max)}`}>
                {l.current}/{l.max}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 py-1 text-sm">
            <span className="text-slate-300">Total</span>
            <span className={`font-medium ${usageColorClass(spellSlots.totalCurrent, spellSlots.totalMax)}`}>
              {spellSlots.totalCurrent}/{spellSlots.totalMax}
            </span>
          </div>
        </div>
      )}

      <SectionLabel className="mt-4">Coverage</SectionLabel>
      {categories.length === 0 ? (
        <p className="text-sm text-slate-600">No tracked resources or known spells/abilities yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
          {columns.map(
            (column, i) =>
              column.length > 0 && (
                <div key={i} className="space-y-3">
                  {column.map((category) => (
                    <ResourceCoverageCategoryBlock key={category} category={category} entries={coverage[category]} />
                  ))}
                </div>
              )
          )}
        </div>
      )}
    </ToolkitCard>
  );
}
