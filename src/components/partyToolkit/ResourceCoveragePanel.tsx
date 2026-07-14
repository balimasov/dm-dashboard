import { useState } from "react";
import { Character, RECOVERY_LABELS } from "@/lib/types";
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

const KIND_LABELS: Record<NonNullable<ResourceCoverageEntry["kind"]>, string> = {
  spell: "Spell",
  feature: "Feature",
  resource: "Resource",
};

/** "SPELL · Wizard" / "FEATURE · Barbarian" / "RESOURCE · Race" — the hint's own small-caps meta line, same tier the old `ResourceHintPanel` used for a resource's `source`, now generalized to spells/features too and folding in the kind so a DM doesn't have to guess what they're looking at. */
function AbilityMetaLine({ kind, source, isCantrip }: { kind?: ResourceCoverageEntry["kind"]; source?: string; isCantrip?: boolean }) {
  const parts = [kind && KIND_LABELS[kind], isCantrip && "Cantrip", source].filter(Boolean) as string[];
  if (parts.length === 0) return null;
  return <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{parts.join(" · ")}</p>;
}

/** How this specific ability recovers or what it costs — a distinct accent color from the meta line above so the two don't blur together in a hint that's already carrying a lot of text. */
function AvailabilityMetaLine({ availability }: { availability?: ResourceAvailability }) {
  if (!availability) return null;
  if (availability.kind === "pool") {
    return <p className="text-xs font-medium text-sky-400">{RECOVERY_LABELS[availability.recovery]} recovery</p>;
  }
  return <p className="text-xs font-medium text-sky-400">Costs a {ordinalLevel(availability.level)}-level spell slot</p>;
}

function TrackableHintPanel({ entry }: { entry: ResourceCoverageEntry }) {
  return (
    <div className="space-y-1">
      <p className="font-medium text-white">{entry.name}</p>
      <AbilityMetaLine kind={entry.kind} source={entry.source} isCantrip={entry.isCantrip} />
      <AvailabilityMetaLine availability={entry.availability} />
      {entry.description && (
        <p className="text-slate-300">
          <RichText text={entry.description} />
        </p>
      )}
    </div>
  );
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
  /** Whether this passive is a level-0 spell — see `ResourceCoverageEntry.isCantrip`. Every holder of the same name shares this, so it's hoisted onto the group rather than checked per-holder. */
  isCantrip: boolean;
}

function PassiveHintPanel({ group }: { group: NameGroup }) {
  const holdersWithCharacter = group.holders.filter((h) => h.characterId);
  const description = group.holders.find((h) => h.description)?.description;
  const sample = group.holders[0];
  return (
    <div className="space-y-1">
      <p className="font-medium text-white">{group.name}</p>
      <AbilityMetaLine kind={sample?.kind} source={sample?.source} isCantrip={group.isCantrip} />
      {description && (
        <p className="text-slate-300">
          <RichText text={description} />
        </p>
      )}
      {holdersWithCharacter.length > 0 && (
        <ul className="space-y-0.5 pt-1">
          {holdersWithCharacter.map((h) => (
            <li key={h.characterId} className="text-white">
              {h.characterName}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** A small "Cantrip" tag next to the name — without it, a cantrip's row looks identical to an unlimited passive `Feature`'s (neither has an availability badge), which reads as a gap rather than the intentional "nothing to run out of" it actually is. */
function PassivePill({ group }: { group: NameGroup }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1 text-sm">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <InfoTooltip panel={<PassiveHintPanel group={group} />}>
          <span className="min-w-0 truncate text-slate-300">{group.name}</span>
        </InfoTooltip>
        {group.isCantrip && (
          <span className="shrink-0 rounded border border-violet-800 px-1 text-[9px] font-semibold uppercase tracking-wide text-violet-400">
            Cantrip
          </span>
        )}
      </div>
      <CharacterChipRow holders={group.holders} />
    </div>
  );
}

type CategoryRow = { kind: "trackable"; entry: ResourceCoverageEntry } | { kind: "passive"; group: NameGroup };

/**
 * Builds one row per entry, grouping same-named entries with no
 * `availability` into a single passive pill (multiple characters knowing
 * the same cantrip/trait collapse into one row with several chips — there's
 * no per-holder quantity to lose by grouping, unlike a trackable row).
 * `entries` is already alphabetically sorted by `computeResourceCoverage`,
 * and grouping only ever merges into a name's *first* occurrence, so the
 * returned row order stays alphabetical too — trackable and passive rows
 * interleave by name instead of clustering into two separate blocks.
 */
function buildRows(entries: ResourceCoverageEntry[]): CategoryRow[] {
  const rows: CategoryRow[] = [];
  const passiveRows = new Map<string, CategoryRow & { kind: "passive" }>();
  for (const entry of entries) {
    if (entry.availability) {
      rows.push({ kind: "trackable", entry });
      continue;
    }
    const existing = passiveRows.get(entry.name);
    if (existing) {
      existing.group.holders.push(entry);
      continue;
    }
    const row: CategoryRow & { kind: "passive" } = {
      kind: "passive",
      group: { name: entry.name, holders: [entry], isCantrip: Boolean(entry.isCantrip) },
    };
    passiveRows.set(entry.name, row);
    rows.push(row);
  }
  return rows;
}

/** Splits a category's already-sorted entries into the special (Heroic Inspiration-style) rows and everything else — see `buildRows` for how the rest turn into a single alphabetical row list. */
function splitCategoryEntries(entries: ResourceCoverageEntry[]) {
  const special = entries.filter((e) => e.holders);
  const rows = buildRows(entries.filter((e) => !e.holders));
  return { special, rows };
}

/** Approximate rendered line count for a category — used only to balance column heights, so it doesn't need to be exact. */
function categoryLineCount(entries: ResourceCoverageEntry[]): number {
  const { special, rows } = splitCategoryEntries(entries);
  return special.length + rows.length;
}

/** The empty-category placeholder was reading as regular (if dim) content and blending into the populated blocks around it in a 4-column layout — italicized and a shade darker than `SectionLabel` itself so it unmistakably reads as "nothing here" rather than a line of real data. */
function EmptyCategoryPlaceholder() {
  return <p className="text-xs italic text-slate-700">— none —</p>;
}

function ResourceCoverageCategoryBlock({ category, entries }: { category: ResourceCoverageCategory; entries: ResourceCoverageEntry[] }) {
  const { special, rows } = splitCategoryEntries(entries);
  const isEmpty = special.length === 0 && rows.length === 0;
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
          {rows.map((row) =>
            row.kind === "trackable" ? (
              <TrackableRow key={`${row.entry.characterId}-${row.entry.name}`} entry={row.entry} />
            ) : (
              <PassivePill key={row.group.name} group={row.group} />
            )
          )}
        </div>
      )}
    </div>
  );
}

const COLUMNS = 4;

/**
 * Order-preserving column fill, the same idea CSS's `column-fill: balance`
 * uses for multi-column text — categories are walked in
 * `RESOURCE_COVERAGE_CATEGORY_ORDER` order and a column only closes once
 * its already-placed weight would exceed an even share of the total. A
 * greedy shortest-column-first bin pack (what `CoveragePanel.distributeCoverageColumns`
 * does) balances heights too, but it assigns whichever category is
 * heaviest to whichever column is shortest — the categories end up
 * scattered across columns by weight, not in reading order, so a DM
 * scanning top-to-bottom then across columns doesn't see them in the
 * `RESOURCE_COVERAGE_CATEGORY_ORDER` sequence. This keeps that order intact:
 * read down column 1, then column 2, and so on.
 */
function distributeColumns(
  categories: ResourceCoverageCategory[],
  coverage: Record<ResourceCoverageCategory, ResourceCoverageEntry[]>,
  numColumns: number
): ResourceCoverageCategory[][] {
  const weight = (category: ResourceCoverageCategory) => categoryLineCount(coverage[category]) + 1;
  const target = categories.reduce((sum, c) => sum + weight(c), 0) / numColumns;

  const columns: ResourceCoverageCategory[][] = [];
  let current: ResourceCoverageCategory[] = [];
  let currentWeight = 0;
  for (const category of categories) {
    if (current.length > 0 && currentWeight + weight(category) > target && columns.length < numColumns - 1) {
      columns.push(current);
      current = [];
      currentWeight = 0;
    }
    current.push(category);
    currentWeight += weight(category);
  }
  columns.push(current);
  while (columns.length < numColumns) columns.push([]);
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

      {categories.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">No tracked resources or known spells/abilities yet.</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
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
