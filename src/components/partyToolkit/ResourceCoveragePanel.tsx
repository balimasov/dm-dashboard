"use client";

import { useState } from "react";
import { Character, RECOVERY_LABELS } from "@/lib/types";
import { ordinalLevel } from "@/lib/format";
import {
  CoverageHolder,
  RESOURCE_COVERAGE_CATEGORY_ORDER,
  ResourceAvailability,
  ResourceCoverageCategory,
  ResourceCoverageEntry,
  computeResourceCoverage,
} from "@/lib/partyToolkit";
import { persistOpenCookie } from "../CollapsibleSection";
import { InfoTooltip } from "../InfoTooltip";
import { AbilityHintPanel } from "../ui/AbilityHintPanel";
import { CharacterChip, CharacterChipRow } from "../ui/CharacterChip";
import { RecoveryBadge } from "../ui/RecoveryBadge";
import { SectionLabel, ToolkitCard } from "../ui/ToolkitCard";
import { CANTRIP_HINT, HEROIC_INSPIRATION_DESCRIPTION, HolderListPanel, LevelBadge, distributeIntoColumns, usageColorClass } from "./shared";

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
function abilityMetaLine(kind?: ResourceCoverageEntry["kind"], source?: string, isCantrip?: boolean): string | undefined {
  const parts = [kind && KIND_LABELS[kind], isCantrip && "Cantrip", source].filter(Boolean) as string[];
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

/**
 * A spell's raw D&D Beyond `tags` verbatim — a sync diagnostic as much as an
 * info line. Coverage categorization is *derived* from these, but a category
 * (or the lack of one) can't tell a DM whether a spell just has no tags
 * D&D Beyond maps to a category, or has no tags at all (not yet re-synced
 * since this field shipped, or genuinely untagged upstream). This line
 * answers that directly instead of leaving it to guesswork. Spell-only — a
 * `Feature`/`Resource` entry has no `tags` field to show.
 */
function tagsLine(kind?: ResourceCoverageEntry["kind"], tags?: string[]): string | undefined {
  if (kind !== "spell") return undefined;
  return `D&D Beyond tags: ${tags && tags.length > 0 ? tags.join(", ") : "none"}`;
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
      <p>{ordinal}-level spell</p>
      <p className={availability.available ? "text-emerald-400" : "text-red-400"}>
        {availability.remaining} slot{availability.remaining === 1 ? "" : "s"} available at {ordinal} level or higher
      </p>
    </div>
  );
}

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
        <InfoTooltip
          panel={
            <AbilityHintPanel
              name={entry.name}
              metaLines={[abilityMetaLine(entry.kind, entry.source, entry.isCantrip), tagsLine(entry.kind, entry.tags)]}
              status={availability.kind === "pool" && <span className="text-sky-400">{RECOVERY_LABELS[availability.recovery]} recovery</span>}
              description={entry.description}
            />
          }
        >
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

/** A small "Cantrip" tag right before the avatar chips — same slot `AvailabilityBadge` sits in on a trackable row, so every row's badge-then-avatar rhythm reads the same regardless of which kind of row it is. Without it, a cantrip's row looks identical to an unlimited passive `Feature`'s (neither has an availability badge), which reads as a gap rather than the intentional "nothing to run out of" it actually is. */
function PassivePill({ group }: { group: NameGroup }) {
  const description = group.holders.find((h) => h.description)?.description;
  const sample = group.holders[0];
  const holders: CoverageHolder[] = group.holders
    .filter((h): h is ResourceCoverageEntry & { characterId: string } => Boolean(h.characterId))
    .map((h) => ({ characterId: h.characterId, characterName: h.characterName, avatarUrl: h.avatarUrl }));

  return (
    <div className="flex items-center gap-2 py-1 text-sm">
      <div className="min-w-0 flex-1">
        <InfoTooltip
          panel={
            <AbilityHintPanel
              name={group.name}
              metaLines={[abilityMetaLine(sample?.kind, sample?.source, group.isCantrip), tagsLine(sample?.kind, sample?.tags)]}
              description={description}
              holders={holders}
            />
          }
        >
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

/** Thin wrapper around the shared `distributeIntoColumns` — each category's weight is its own rendered line count plus one (for its own header), same as before. */
function distributeColumns(
  categories: ResourceCoverageCategory[],
  coverage: Record<ResourceCoverageCategory, ResourceCoverageEntry[]>,
  numColumns: number
): ResourceCoverageCategory[][] {
  return distributeIntoColumns(categories, (c) => categoryLineCount(coverage[c]) + 1, numColumns);
}

const STORAGE_KEY = "dm-dashboard-resource-coverage-open";

/** `initialOpen` is seeded from a cookie read server-side (see `page.tsx`), same reasoning as `CollapsibleSection` — this panel can get long once a party has a lot of tracked spells/resources, so a DM who's already read it once can collapse it, and that choice survives a reload instead of resetting open every time. */
export function ResourceCoveragePanel({ characters, initialOpen }: { characters: Character[]; initialOpen: boolean }) {
  const [open, setOpen] = useState(initialOpen);

  const coverage = computeResourceCoverage(characters);
  const categories = RESOURCE_COVERAGE_CATEGORY_ORDER.filter((category) => coverage[category].length > 0);
  const columns = distributeColumns(categories, coverage, COLUMNS);

  return (
    <ToolkitCard
      title={
        <>
          Resources & Coverage <span className="normal-case text-slate-600">(in progress)</span>
        </>
      }
      collapsible={{
        open,
        onToggle: () => {
          const next = !open;
          setOpen(next);
          persistOpenCookie(STORAGE_KEY, next);
        },
      }}
    >
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
