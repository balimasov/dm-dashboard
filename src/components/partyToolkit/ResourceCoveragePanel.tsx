import { ReactNode } from "react";
import { Character, RECOVERY_LABELS } from "@/lib/types";
import { ordinalLevel } from "@/lib/format";
import { tierBgClass, tierTextClass } from "@/lib/tierColor";
import {
  PartyRestRecoveryBucket,
  PartyRestRecoveryGauge,
  PartySpellSlotLevel,
  PartySpellSlotSummary,
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
import { RecoveryBadge } from "../ui/RecoveryBadge";
import { SectionLabel, ToolkitCard } from "../ui/ToolkitCard";
import { HEROIC_INSPIRATION_DESCRIPTION, HintPanel, HolderListPanel, SpellSlotLevelPanel, usageColorClass } from "./shared";

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

/** Per-resource breakdown for a Short/Long Rest bucket — same idea as `SpellSlotLevelPanel`, but each row is a distinct named resource (possibly several per character) rather than one number per character. */
function RestRecoveryHintPanel({ label, bucket }: { label: string; bucket: PartyRestRecoveryBucket }) {
  return (
    <HintPanel
      title={label}
      description="Average remaining % across every resource of this recovery type — one pool, one equal vote."
      rows={bucket.entries}
      rowKey={(e) => e.id}
      rowClassName="flex items-center justify-between gap-4"
      renderRow={(e) => (
        <>
          <span className="min-w-0 truncate">
            {e.resourceName} <span className="text-slate-500">— {e.characterName}</span>
          </span>
          <span className={`shrink-0 whitespace-nowrap ${usageColorClass(e.current, e.max)}`}>
            {e.current}/{e.max}
          </span>
        </>
      )}
    />
  );
}

/** One recovery type's readiness as a horizontal meter (track = same-ramp light step, fill = danger-tier color) — same visual language as `ResourceTrackerBar` on a character card, just labeled per rest type instead of blended into one "overall" number. Hovering/tapping the bar itself (not just the number) shows the per-resource breakdown, matching the hit-target size of every other hintable row in this panel. */
function RestRecoveryMeterRow({ label, bucket }: { label: string; bucket: PartyRestRecoveryBucket }) {
  return (
    <div className="flex items-center gap-2 text-xs leading-none">
      <span className="w-20 shrink-0 whitespace-nowrap font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <InfoTooltip hoverOnly panel={<RestRecoveryHintPanel label={label} bucket={bucket} />}>
        <div className="h-3.5 w-36 overflow-hidden rounded-full bg-slate-800 sm:w-48">
          <div className={`h-full rounded-full ${tierBgClass(bucket.percent)}`} style={{ width: `${bucket.percent}%` }} />
        </div>
      </InfoTooltip>
      <span className={`shrink-0 font-semibold tabular-nums ${tierTextClass(bucket.percent)}`}>{bucket.percent}%</span>
    </div>
  );
}

/** Stacks the Short Rest and Long Rest meters — either row is omitted (not just empty) when the party has no resources of that kind, same as the arcs this replaces used to do. `null` when neither exists, so the caller can skip the whole block instead of rendering an empty wrapper. */
function RestRecoveryMeters({ recovery }: { recovery: PartyRestRecoveryGauge }) {
  if (!recovery.shortRest && !recovery.longRest) return null;
  return (
    <div className="flex flex-col gap-1.5">
      {recovery.shortRest && <RestRecoveryMeterRow label="Short Rest" bucket={recovery.shortRest} />}
      {recovery.longRest && <RestRecoveryMeterRow label="Long Rest" bucket={recovery.longRest} />}
    </div>
  );
}

/** Widest column height in px — every column's height is proportional to its own `max` between this and `HISTOGRAM_MIN_HEIGHT_PX`, so a party's 1st-level pool (often 20+ slots) doesn't dwarf a 9th-level pool (often 1) into invisibility, while relative pool size still reads at a glance. */
const HISTOGRAM_MAX_HEIGHT_PX = 64;
/** Every column gets at least this much height regardless of `max` — the floor that keeps a 1-slot 9th-level column a real, hoverable bar instead of a sliver. */
const HISTOGRAM_MIN_HEIGHT_PX = 18;
/** Mark-spec column thickness (`≤24px`, see the dataviz skill's bar/column spec) — same width for the outer track and the inner fill so the fill never peeks past the track's rounded corners. */
const HISTOGRAM_COLUMN_WIDTH_PX = 24;

/** One spell slot level as a vertical meter column — full column height (the dim track) is that level's own `max`, scaled against the party's largest level so every level stays visible; the colored fill from the baseline is `current`. Same hover hint as the old text row (`SpellSlotLevelPanel`), just triggered by the column instead of a line of text. */
function SpellSlotColumn({ level, maxAcrossLevels }: { level: PartySpellSlotLevel; maxAcrossLevels: number }) {
  const percent = level.max > 0 ? (level.current / level.max) * 100 : 0;
  const barHeight =
    maxAcrossLevels > 0
      ? HISTOGRAM_MIN_HEIGHT_PX + (level.max / maxAcrossLevels) * (HISTOGRAM_MAX_HEIGHT_PX - HISTOGRAM_MIN_HEIGHT_PX)
      : HISTOGRAM_MIN_HEIGHT_PX;
  const fillHeight = (percent / 100) * barHeight;

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Same `percent` the bar's own fill color reads off (`tierBgClass`) — using
          `usageColorClass` here instead used to disagree with the bar at the 25%
          boundary (its 50%-split doesn't line up with the bar's 25%-split tier),
          so a red (≤25%) column could sit under an amber-labeled number. */}
      <span className={`text-[10px] font-semibold tabular-nums ${tierTextClass(percent)}`}>
        {level.current}/{level.max}
      </span>
      <InfoTooltip hoverOnly panel={<SpellSlotLevelPanel level={level.level} holders={level.holders} />}>
        <div
          className="relative overflow-hidden rounded-md bg-slate-800"
          style={{ width: `${HISTOGRAM_COLUMN_WIDTH_PX}px`, height: `${barHeight}px` }}
        >
          <div className={`absolute bottom-0 left-0 w-full rounded-md ${tierBgClass(percent)}`} style={{ height: `${fillHeight}px` }} />
        </div>
      </InfoTooltip>
      <span className="text-[10px] text-slate-600">{level.level}</span>
    </div>
  );
}

/** The histogram of every spell slot level the party has, plus the running total off to the side — replaces the old plain-number "1st Level ... 22/24" rows with one glanceable shape: which levels are topped up, which are running dry, at what relative depth. Its own caption lives on the enclosing `ChartBox`, not here. */
function SpellSlotHistogram({ spellSlots }: { spellSlots: PartySpellSlotSummary }) {
  const maxAcrossLevels = Math.max(...spellSlots.levels.map((l) => l.max));
  return (
    <div className="flex items-end gap-5">
      <div className="flex items-end gap-3">
        {spellSlots.levels.map((level) => (
          <SpellSlotColumn key={level.level} level={level} maxAcrossLevels={maxAcrossLevels} />
        ))}
      </div>
      <div className="flex flex-col items-center gap-1 border-l border-slate-800 pl-5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">Total</span>
        <span className={`text-sm font-semibold tabular-nums ${usageColorClass(spellSlots.totalCurrent, spellSlots.totalMax)}`}>
          {spellSlots.totalCurrent}/{spellSlots.totalMax}
        </span>
      </div>
    </div>
  );
}

/** A bordered mini-panel for one chart, its label inside the top of the box (same idea as `SectionLabel`) — same visual language `SensesPanel`/`DefensesPanel`/`LanguagesToolsPanel` use as full `ToolkitCard`s, just one nesting level down since these two charts share a single "Resources & Coverage" card instead of getting their own. The border also does the separating job a divider line would otherwise need to — two boxed charts read as distinct instruments without one. */
function ChartBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-6 py-4 sm:px-8">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{title}</span>
      {children}
    </div>
  );
}

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
  const coverage = computeResourceCoverage(characters);
  const categories = RESOURCE_COVERAGE_CATEGORY_ORDER.filter((category) => coverage[category].length > 0);
  const columns = distributeColumns(categories, coverage, COLUMNS);

  const spellSlots = computePartySpellSlotSummary(characters);
  const restRecovery = computePartyRestRecoveryGauge(characters);
  const hasRestMeters = Boolean(restRecovery.shortRest || restRecovery.longRest);

  return (
    <ToolkitCard title="Resources & Coverage">
      {(hasRestMeters || spellSlots) && (
        <div className="mt-2 flex flex-col items-center gap-4 lg:flex-row lg:justify-center lg:gap-6">
          {hasRestMeters && (
            <ChartBox title="Rest Recovery">
              <RestRecoveryMeters recovery={restRecovery} />
            </ChartBox>
          )}
          {spellSlots ? (
            <ChartBox title="Spell Slots">
              <SpellSlotHistogram spellSlots={spellSlots} />
            </ChartBox>
          ) : (
            <p className="text-sm text-slate-600">No spell slots in the party.</p>
          )}
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
