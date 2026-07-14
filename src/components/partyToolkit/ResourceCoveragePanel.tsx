import { ReactNode, useState } from "react";
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

/** How this specific ability recovers — pool kind only. A slot-cost spell's level/remaining-slot info used to live here too, but that duplicated what `LevelBadge`'s own minimal hint (right below) now says right next to it, so it moved out entirely rather than being said twice in two nearby tooltips. */
function AvailabilityMetaLine({ availability }: { availability?: ResourceAvailability }) {
  if (!availability || availability.kind !== "pool") return null;
  return <p className="text-xs font-medium text-sky-400">{RECOVERY_LABELS[availability.recovery]} recovery</p>;
}

/**
 * Shows a spell's raw D&D Beyond `tags` verbatim — a sync diagnostic as much
 * as an info line. Coverage categorization is *derived* from these, but a
 * category (or the lack of one) can't tell a DM whether a spell just has no
 * tags D&D Beyond maps to a category, or has no tags at all (not yet
 * re-synced since this field shipped, or genuinely untagged upstream). This
 * line answers that directly instead of leaving it to guesswork. Spell-only
 * — a `Feature`/`Resource` entry has no `tags` field to show.
 */
function SpellTagsLine({ kind, tags }: { kind?: ResourceCoverageEntry["kind"]; tags?: string[] }) {
  if (kind !== "spell") return null;
  return (
    <p className="text-[11px] text-slate-500">
      D&amp;D Beyond tags: {tags && tags.length > 0 ? tags.join(", ") : "none"}
    </p>
  );
}

function TrackableHintPanel({ entry }: { entry: ResourceCoverageEntry }) {
  return (
    <div className="space-y-1">
      <p className="font-medium text-white">{entry.name}</p>
      <AbilityMetaLine kind={entry.kind} source={entry.source} isCantrip={entry.isCantrip} />
      <SpellTagsLine kind={entry.kind} tags={entry.tags} />
      <AvailabilityMetaLine availability={entry.availability} />
      {entry.description && (
        <p className="text-slate-300">
          <RichText text={entry.description} />
        </p>
      )}
    </div>
  );
}

/**
 * The small violet level/cantrip tag shared by a slot-cost spell's
 * `AvailabilityBadge` and a cantrip's `PassivePill` — same border/text
 * treatment as `RecoveryBadge`'s LR/SR tag (just violet instead of slate),
 * so every small inline tag in this panel reads as one consistent visual
 * language. Deliberately *not* colored green/red by availability the way
 * the badge used to be — that status now lives in the hint's own text
 * (`panel`), not the badge's border color, so one badge style covers both
 * "here's a level" and "here's a cantrip" without a mismatched accent.
 */
function LevelBadge({ label, panel }: { label: string; panel: ReactNode }) {
  return (
    <InfoTooltip hoverOnly panel={panel}>
      <span className="shrink-0 whitespace-nowrap rounded border border-violet-800 px-1 text-[10px] font-medium uppercase text-violet-400">
        {label}
      </span>
    </InfoTooltip>
  );
}

/**
 * Deliberately minimal — just the one status fact a DM actually needs when
 * checking a slot-cost spell's badge: what level it is, and how many slots
 * at that level (or higher) the character has left right now. The full
 * name/kind/source/description hint already lives on the row's name itself
 * (`TrackableHintPanel`); repeating all of that here too read as noise once
 * both tooltips sat this close together.
 */
function SlotAvailabilityHint({ availability }: { availability: Extract<ResourceAvailability, { kind: "slot" }> }) {
  const ordinal = ordinalLevel(availability.level);
  return (
    <div className="space-y-1">
      <p className="text-white">{ordinal}-level spell</p>
      <p className={availability.available ? "text-emerald-400" : "text-red-400"}>
        {availability.remaining} slot{availability.remaining === 1 ? "" : "s"} available at {ordinal} level or higher
      </p>
    </div>
  );
}

const CANTRIP_HINT = <p className="text-white">Cantrip — cast at will, no spell slot required.</p>;

/** `pool` shows the exact charge count, same convention as the old Resources row. `slot` can't show one exact number the way a pool can (a spell slot is a shared party-wide/per-caster pool, not this ability's own) — a plain level badge instead, with the actual available-count in its own minimal hint (`SlotAvailabilityHint`). */
function AvailabilityBadge({ entry }: { entry: ResourceCoverageEntry }) {
  const availability = entry.availability!;
  if (availability.kind === "pool") {
    return (
      <span className={`shrink-0 whitespace-nowrap text-xs font-medium tabular-nums ${usageColorClass(availability.current, availability.max)}`}>
        {availability.current}/{availability.max}
      </span>
    );
  }
  return <LevelBadge label={`${availability.level} lvl`} panel={<SlotAvailabilityHint availability={availability} />} />;
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
      <AvailabilityBadge entry={entry} />
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
      <SpellTagsLine kind={sample?.kind} tags={sample?.tags} />
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

/** A small "Cantrip" tag right before the avatar chips — same slot `AvailabilityBadge` sits in on a trackable row, so every row's badge-then-avatar rhythm reads the same regardless of which kind of row it is. Without it, a cantrip's row looks identical to an unlimited passive `Feature`'s (neither has an availability badge), which reads as a gap rather than the intentional "nothing to run out of" it actually is. */
function PassivePill({ group }: { group: NameGroup }) {
  return (
    <div className="flex items-center gap-2 py-1 text-sm">
      <div className="min-w-0 flex-1">
        <InfoTooltip panel={<PassiveHintPanel group={group} />}>
          <span className="text-slate-300">{group.name}</span>
        </InfoTooltip>
      </div>
      {group.isCantrip && <LevelBadge label="Cantrip" panel={CANTRIP_HINT} />}
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
 * Whether `weights` can be split into at most `numColumns` contiguous runs
 * with no run's sum exceeding `maxSum` — the feasibility check the binary
 * search in `distributeColumns` below probes at each candidate `maxSum`.
 */
function fitsInColumns(weights: number[], numColumns: number, maxSum: number): boolean {
  let columnsUsed = 1;
  let currentSum = 0;
  for (const w of weights) {
    if (currentSum + w > maxSum) {
      columnsUsed += 1;
      currentSum = w;
      if (columnsUsed > numColumns) return false;
    } else {
      currentSum += w;
    }
  }
  return true;
}

/**
 * Order-preserving column fill that's actually balanced — the classic
 * "split an array into k contiguous parts minimizing the tallest part"
 * problem (binary search over the candidate max-column-weight, using
 * `fitsInColumns` as the feasibility check). An earlier version tried to
 * eyeball this by closing a column once its running weight passed a flat
 * `total / numColumns` average, but that average doesn't account for how
 * the *remaining* categories are distributed — with one very heavy category
 * up front (`Resources`, reliably the biggest bucket) followed by many
 * lighter ones, it closed the first three columns early and dumped
 * everything left over into the last one (confirmed: a visibly lopsided
 * last column). Binary search finds the true minimum-possible tallest
 * column instead of guessing at one, while still walking categories in
 * `RESOURCE_COVERAGE_CATEGORY_ORDER` and keeping each column a contiguous
 * run of that order — the grid still reads top-to-bottom within a column,
 * then across to the next one.
 */
function distributeColumns(
  categories: ResourceCoverageCategory[],
  coverage: Record<ResourceCoverageCategory, ResourceCoverageEntry[]>,
  numColumns: number
): ResourceCoverageCategory[][] {
  if (categories.length === 0) return Array.from({ length: numColumns }, () => []);

  const weights = categories.map((c) => categoryLineCount(coverage[c]) + 1);

  let lo = Math.max(...weights);
  let hi = weights.reduce((sum, w) => sum + w, 0);
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (fitsInColumns(weights, numColumns, mid)) hi = mid;
    else lo = mid + 1;
  }
  const maxColumnWeight = lo;

  const columns: ResourceCoverageCategory[][] = [];
  let current: ResourceCoverageCategory[] = [];
  let currentWeight = 0;
  categories.forEach((category, i) => {
    if (current.length > 0 && currentWeight + weights[i] > maxColumnWeight) {
      columns.push(current);
      current = [];
      currentWeight = 0;
    }
    current.push(category);
    currentWeight += weights[i];
  });
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
