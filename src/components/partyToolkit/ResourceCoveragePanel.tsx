import { ReactNode } from "react";
import { Character, RECOVERY_LABELS } from "@/lib/types";
import { ordinalLevel } from "@/lib/format";
import {
  RESOURCE_COVERAGE_CATEGORY_ORDER,
  ResourceAvailability,
  ResourceCoverageCategory,
  ResourceCoverageEntry,
  computePartyRestRecoveryGauge,
  computePartySpellSlotSummary,
  computeResourceCoverage,
} from "@/lib/partyToolkit";
import { InfoTooltip } from "../InfoTooltip";
import { RichText } from "../RichText";
import { CharacterChip, CharacterChipRow } from "../ui/CharacterChip";
import { MetaBadge } from "../ui/MetaBadge";
import { RecoveryBadge } from "../ui/RecoveryBadge";
import { SectionLabel, ToolkitCard } from "../ui/ToolkitCard";
import { HEROIC_INSPIRATION_DESCRIPTION, HolderListPanel, SpellChartsRow, usageColorClass } from "./shared";

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
 * `AvailabilityBadge` and a cantrip's `PassivePill` — built on the same
 * `MetaBadge` primitive `RecoveryBadge`'s LR/SR tag uses (just violet
 * instead of slate), so every small inline tag in this panel — and every
 * recovery-type badge elsewhere in the app — reads and behaves as one
 * consistent thing. Deliberately *not* colored green/red by availability the
 * way the badge used to be — that status now lives in the hint's own text
 * (`panel`), not the badge's border color, so one badge style covers both
 * "here's a level" and "here's a cantrip" without a mismatched accent.
 */
function LevelBadge({ label, panel }: { label: string; panel: ReactNode }) {
  return <MetaBadge label={label} panel={panel} colorClassName="border-violet-800 text-violet-400" />;
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

/** Only ever called with a category that already has at least one entry — `ResourceCoveragePanel` filters empty categories out before rendering, so there's no "nothing here" state to design for. */
function ResourceCoverageCategoryBlock({ category, entries }: { category: ResourceCoverageCategory; entries: ResourceCoverageEntry[] }) {
  const { special, rows } = splitCategoryEntries(entries);
  return (
    <div>
      <SectionLabel>{category}</SectionLabel>
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
    </div>
  );
}

const COLUMNS = 4;

/**
 * Order-preserving column fill that targets each column's fair share of the
 * total weight, not just "whatever's left after the earlier columns filled
 * up." A previous version minimized the *tallest* column via binary search
 * (the classic "split into k contiguous parts minimizing the max part"
 * problem) — a different objective than "balanced," and it showed: with a
 * few heavy categories (`Resources`, `Control`, `Protection`) each anchored
 * near that shared cap, the light, alphabetically-clustered categories
 * (`Social`/`Summoning`/`Survival`) all landed in whatever column was left
 * once the cap was reached, however little that left it (confirmed: a
 * column with 7 lines sitting next to three columns with 30+). Minimizing
 * the max never has to fix that, since it's already satisfied once no
 * column *exceeds* the cap — an unbalanced-but-legal split scores the same
 * as a balanced one.
 *
 * This version instead places each boundary at whichever category's
 * cumulative weight lands closest to *that column's own* fair-share target
 * (`total * (columnIndex + 1) / numColumns`) — column 1 aims for the first
 * quarter of the total, column 2 the first half, and so on, so leftover
 * weight spreads across every column instead of piling onto the last one.
 * Still walks categories in `RESOURCE_COVERAGE_CATEGORY_ORDER` and keeps
 * each column a contiguous run of that order — the grid still reads
 * top-to-bottom within a column, then across to the next one.
 */
function distributeColumns(
  categories: ResourceCoverageCategory[],
  coverage: Record<ResourceCoverageCategory, ResourceCoverageEntry[]>,
  numColumns: number
): ResourceCoverageCategory[][] {
  if (categories.length === 0) return Array.from({ length: numColumns }, () => []);

  const weights = categories.map((c) => categoryLineCount(coverage[c]) + 1);
  const total = weights.reduce((sum, w) => sum + w, 0);

  const columns: ResourceCoverageCategory[][] = [];
  let current: ResourceCoverageCategory[] = [];
  let cumulative = 0;
  let columnsUsed = 0;

  categories.forEach((category, i) => {
    const isLastColumn = numColumns - columnsUsed <= 1;
    if (!isLastColumn && current.length > 0) {
      const target = (total * (columnsUsed + 1)) / numColumns;
      const withoutThis = cumulative;
      const withThis = cumulative + weights[i];
      // Close the column now, before adding this category, if that lands
      // closer to its fair-share target than including it would.
      if (Math.abs(withoutThis - target) <= Math.abs(withThis - target)) {
        columns.push(current);
        current = [];
        columnsUsed += 1;
      }
    }
    current.push(category);
    cumulative += weights[i];
  });
  columns.push(current);
  while (columns.length < numColumns) columns.push([]);
  return columns;
}

export function ResourceCoveragePanel({ characters }: { characters: Character[] }) {
  const coverage = computeResourceCoverage(characters);
  const categories = RESOURCE_COVERAGE_CATEGORY_ORDER.filter((category) => coverage[category].length > 0);
  const columns = distributeColumns(categories, coverage, COLUMNS);

  const spellSlots = computePartySpellSlotSummary(characters);
  const restRecovery = computePartyRestRecoveryGauge(characters);

  return (
    <ToolkitCard title="Resources & Coverage">
      <SpellChartsRow restRecovery={restRecovery} spellSlots={spellSlots} />

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
