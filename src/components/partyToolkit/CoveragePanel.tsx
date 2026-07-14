import { useState } from "react";
import { Character } from "@/lib/types";
import {
  COVERAGE_CATEGORY_ORDER,
  CoverageCategory,
  CoverageEntry,
  computeSpellAbilityCoverage,
} from "@/lib/partyToolkit";
import { InfoTooltip } from "../InfoTooltip";
import { RichText } from "../RichText";
import { CharacterChipRow } from "../ui/CharacterChip";
import { SectionLabel, ToolkitCard } from "../ui/ToolkitCard";
import { HEROIC_INSPIRATION_DESCRIPTION, HintPanel, HolderListPanel } from "./shared";

interface CoverageNameGroup {
  name: string;
  holders: CoverageEntry[];
}

/** Groups same-named entries (multiple characters knowing the same spell/ability collapse into one pill with several chips) instead of one line per name-character pair — this is most of where the old layout's height came from. */
function groupCoverageEntries(entries: CoverageEntry[]): CoverageNameGroup[] {
  const byName = new Map<string, CoverageNameGroup>();
  for (const entry of entries) {
    if (!byName.has(entry.name)) byName.set(entry.name, { name: entry.name, holders: [] });
    byName.get(entry.name)!.holders.push(entry);
  }
  return Array.from(byName.values());
}

/** Leads with the spell's/feature's own rules text (same source the character's own card shows), then who has it — same "description first, then characters" order as every other hint panel in this file. */
function CoverageHintPanel({ group }: { group: CoverageNameGroup }) {
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

/** Heroic Inspiration is the one entry with no real character behind it (`characterName` is a party-wide ratio) — rendered as plain text instead of a chip cluster. Its hover hint uses the same `HolderListPanel` as every other "who has it" row, listing whoever currently holds it (the row's own `holders`, threaded through from `computeHeroicInspirationSummary`), not just the description. One ability per line — name on the left, its holders' chips right-aligned to the category column's edge, same "name … value" row shape as every other coverage row in the panel. */
function CoveragePill({ group }: { group: CoverageNameGroup }) {
  if (group.holders.length === 1 && !group.holders[0].characterId) {
    const entry = group.holders[0];
    return (
      <div className="flex items-center justify-between gap-3 py-1 text-sm">
        <div className="min-w-0 flex-1">
          <InfoTooltip
            panel={
              <HolderListPanel label={group.name} description={HEROIC_INSPIRATION_DESCRIPTION} holders={entry.holders ?? []} />
            }
          >
            <span className="text-slate-300">{group.name}</span>
          </InfoTooltip>
        </div>
        <span className="shrink-0 text-slate-500">{entry.characterName}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between gap-3 py-1 text-sm">
      <div className="min-w-0 flex-1">
        <InfoTooltip panel={<CoverageHintPanel group={group} />}>
          <span className="text-slate-300">{group.name}</span>
        </InfoTooltip>
      </div>
      <CharacterChipRow holders={group.holders} />
    </div>
  );
}

function CoverageCategoryBlock({ category, entries }: { category: CoverageCategory; entries: CoverageEntry[] }) {
  const groups = groupCoverageEntries(entries);
  return (
    <div>
      <SectionLabel>{category}</SectionLabel>
      {groups.length === 0 ? (
        <p className="text-sm text-slate-600">none</p>
      ) : (
        <div className="divide-y divide-slate-800/60">
          {groups.map((g) => (
            <CoveragePill key={g.name} group={g} />
          ))}
        </div>
      )}
    </div>
  );
}

const COVERAGE_COLUMNS = 4;

/**
 * Balances category blocks across `numColumns` real DOM columns (greedy
 * "always add to the currently-shortest column" bin-packing) instead of
 * letting CSS Grid auto-flow them into rows — a plain grid aligns every
 * cell in a row to its tallest neighbor, which left large empty gaps under
 * short categories once rows had 4 uneven-height blocks side by side. Each
 * category's "weight" is its own group count (or 1, for a "none" block),
 * so heavier categories get spread across different columns rather than
 * stacking together. Column contents are then re-sorted back into
 * `COVERAGE_CATEGORY_ORDER` so each column still reads top-to-bottom in
 * the same order a DM would scan the full category list.
 */
function distributeCoverageColumns(
  categories: CoverageCategory[],
  coverage: Record<CoverageCategory, CoverageEntry[]>,
  numColumns: number
): CoverageCategory[][] {
  const weight = (category: CoverageCategory) => Math.max(groupCoverageEntries(coverage[category]).length, 1) + 1;
  const columns: CoverageCategory[][] = Array.from({ length: numColumns }, () => []);
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
    column.sort((a, b) => COVERAGE_CATEGORY_ORDER.indexOf(a) - COVERAGE_CATEGORY_ORDER.indexOf(b));
  }
  return columns;
}

/**
 * Which party-level problems the party can solve via spells/abilities — see
 * `computeSpellAbilityCoverage`'s doc comment for the matching rules. Only
 * names and owners are shown, never descriptions (the spec is explicit
 * about this — the character card is where the full spell/ability text
 * lives). Compact by default (only categories with at least one match);
 * "show all" reveals the rest with an explicit "none", same show/hide
 * pattern as the Skills panel's "show all skills".
 */
export function CoveragePanel({ characters }: { characters: Character[] }) {
  const [showAll, setShowAll] = useState(false);
  const coverage = computeSpellAbilityCoverage(characters);
  const categoriesWithEntries = COVERAGE_CATEGORY_ORDER.filter((category) => coverage[category].length > 0);
  const categories = showAll ? COVERAGE_CATEGORY_ORDER : categoriesWithEntries;
  const columns = distributeCoverageColumns(categories, coverage, COVERAGE_COLUMNS);

  return (
    <ToolkitCard
      title="Spell & Ability Coverage"
      actions={
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="shrink-0 text-xs text-sky-400 hover:text-sky-300"
        >
          {showAll ? "Show fewer" : `Show all ${COVERAGE_CATEGORY_ORDER.length} categories`}
        </button>
      }
    >
      {categories.length === 0 ? (
        <p className="text-sm text-slate-600">
          No known spells or abilities match a tracked coverage category yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
          {columns.map(
            (column, i) =>
              column.length > 0 && (
                <div key={i} className="space-y-3">
                  {column.map((category) => (
                    <CoverageCategoryBlock key={category} category={category} entries={coverage[category]} />
                  ))}
                </div>
              )
          )}
        </div>
      )}
    </ToolkitCard>
  );
}
