import { ReactNode } from "react";
import { ordinalLevel } from "@/lib/format";
import { tierBgClass, tierTextClass } from "@/lib/tierColor";
import {
  PartyRestRecoveryBucket,
  CoverageHolder,
  NamedCoverageEntry,
  PartyRestRecoveryGauge,
  PartySpellSlotHolder,
  PartySpellSlotLevel,
  PartySpellSlotSummary,
} from "@/lib/partyToolkit";
import { InfoTooltip } from "../InfoTooltip";
import { HintPanel } from "../ui/HintPanel";
import { MetaBadge } from "../ui/MetaBadge";

/**
 * The small violet level/cantrip tag shared by a slot-cost spell's
 * availability badge and a cantrip's passive pill — built on the same
 * `MetaBadge` primitive `RecoveryBadge`'s LR/SR tag uses (just violet
 * instead of slate), so every small inline tag across the Party Toolkit —
 * and every recovery-type badge elsewhere in the app — reads and behaves as
 * one consistent thing.
 */
export function LevelBadge({ label, panel }: { label: string; panel: ReactNode }) {
  return <MetaBadge label={label} panel={panel} colorClassName="border-violet-800 text-violet-400" />;
}

export const CANTRIP_HINT = <p>Cantrip — cast at will, no spell slot required.</p>;

/** Shared green/amber/red usage-danger palette (same tiers `HpBar` uses) — full or better reads plain white, half or less reads amber, empty reads red. Applied to every current/max value across the Party Toolkit panels: spell slots, Heroic Inspiration, and limited-use resources. */
export function usageColorClass(current: number, max: number): string {
  if (max <= 0 || current <= 0) return "text-red-400";
  if (current <= max / 2) return "text-amber-400";
  return "text-white";
}

export const HEROIC_INSPIRATION_DESCRIPTION =
  "Spend it to gain advantage on one attack roll, saving throw, or ability check.";

/** Same hover-hint idea as a skill row's `SkillAllScoresPanel` — just who has it, no modifier column needed here. Handles the empty case (e.g. nobody currently holding Heroic Inspiration) since most callers only ever pass a non-empty list, but that one can't guarantee it. */
export function HolderListPanel({ label, description, holders }: { label: string; description?: string; holders: CoverageHolder[] }) {
  return (
    <HintPanel
      title={label}
      description={description}
      rows={holders}
      rowKey={(h) => h.characterId}
      renderRow={(h) => h.characterName}
      emptyText="No one currently has it."
    />
  );
}

/** Shared row for resistances/immunities/languages/tools — all four reduce to the same `NamedCoverageEntry` shape (name, count, holders), so one row renders all of them: name with a hover hint listing who has it (same pattern as a skill row), count on the right. `description` is a short generic blurb of what this kind of entry means (a resistance halves damage, a tool adds proficiency, ...) — the entry's own `name` is the specific type/language/tool, not a describable "ability" on its own. */
export function CoverageCountRow({ entry, description }: { entry: NamedCoverageEntry; description?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <InfoTooltip panel={<HolderListPanel label={entry.name} description={description} holders={entry.holders} />}>
        <span className="text-slate-300">{entry.name}</span>
      </InfoTooltip>
      <span className="font-medium text-slate-100">{entry.count}</span>
    </div>
  );
}

/** Per-character breakdown for a spell slot level — the row's hover hint, same idea as a skill row's per-character panel. Shared by `SpellSlotsResourcesPanel` and `ResourceCoveragePanel`, which both show the same party-wide slot totals. */
export function SpellSlotLevelPanel({ level, holders }: { level: number; holders: PartySpellSlotHolder[] }) {
  return (
    <HintPanel
      title={`${ordinalLevel(level)} Level`}
      rows={holders}
      rowKey={(h) => h.characterId}
      rowClassName="flex items-center justify-between gap-4"
      renderRow={(h) => (
        <>
          <span className="min-w-0 truncate">{h.characterName}</span>
          <span className={`shrink-0 whitespace-nowrap ${usageColorClass(h.current, h.max)}`}>
            {h.current}/{h.max}
          </span>
        </>
      )}
    />
  );
}

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

/** One recovery type's readiness as a horizontal meter (track = same-ramp light step, fill = danger-tier color) — same visual language as `ResourceTrackerBar` on a character card, just labeled per rest type instead of blended into one "overall" number. Hovering/tapping either the bar *or* the percent shows the same per-resource breakdown — both are inside the one `InfoTooltip`, so there's no dead zone between them where the hint silently doesn't fire. The `(N)` after the percent is the pool count the percent is an average *of* — without it, a 50% bar reads the same whether it's one resource or ten, which matters exactly when it's low: a lone empty resource is a smaller problem than five of them. `emphasized` is only ever the Total row, bold enough to stand apart from the two rows it sums up. */
function RestRecoveryMeterRow({ label, bucket, emphasized = false }: { label: string; bucket: PartyRestRecoveryBucket; emphasized?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs leading-none">
      <span
        className={`w-20 shrink-0 whitespace-nowrap uppercase tracking-wide ${emphasized ? "font-bold text-slate-300" : "font-semibold text-slate-500"}`}
      >
        {label}
      </span>
      <InfoTooltip hoverOnly panel={<RestRecoveryHintPanel label={label} bucket={bucket} />}>
        <span className="flex items-center gap-2">
          <div className="h-3.5 w-36 overflow-hidden rounded-full bg-slate-800 sm:w-48">
            <div className={`h-full rounded-full ${tierBgClass(bucket.percent)}`} style={{ width: `${bucket.percent}%` }} />
          </div>
          <span className={`shrink-0 font-semibold tabular-nums ${tierTextClass(bucket.percent)}`}>{bucket.percent}%</span>
        </span>
      </InfoTooltip>
      <span className="shrink-0 tabular-nums text-slate-600">({bucket.resourceCount})</span>
    </div>
  );
}

/**
 * Stacks the Short Rest and Long Rest meters, plus a combined Total row once
 * both exist (same idea as the Spell Slots histogram's own Total column) —
 * either of the two main rows is omitted (not just empty) when the party has
 * no resources of that kind, same as the arcs this replaces used to do.
 * Total only makes sense with both present — with just one, it would repeat
 * that row's own number. `null` when neither exists, so the caller can skip
 * the whole block instead of rendering an empty wrapper.
 */
function RestRecoveryMeters({ recovery }: { recovery: PartyRestRecoveryGauge }) {
  if (!recovery.shortRest && !recovery.longRest) return null;
  return (
    <div className="flex flex-col gap-3">
      {recovery.shortRest && <RestRecoveryMeterRow label="Short Rest" bucket={recovery.shortRest} />}
      {recovery.longRest && <RestRecoveryMeterRow label="Long Rest" bucket={recovery.longRest} />}
      {recovery.shortRest && recovery.longRest && recovery.total && (
        <div className="mt-1 border-t border-slate-800/60 pt-2">
          <RestRecoveryMeterRow label="Total" bucket={recovery.total} emphasized />
        </div>
      )}
    </div>
  );
}

/** Widest column height in px — every column's height is proportional to its own `max` between this and `HISTOGRAM_MIN_HEIGHT_PX`, so a party's 1st-level pool (often 20+ slots) doesn't dwarf a 9th-level pool (often 1) into invisibility, while relative pool size still reads at a glance. */
const HISTOGRAM_MAX_HEIGHT_PX = 64;
/** Every column gets at least this much height regardless of `max` — the floor that keeps a 1-slot 9th-level column a real, hoverable bar instead of a sliver. */
const HISTOGRAM_MIN_HEIGHT_PX = 18;
/** Mark-spec column thickness (`≤24px`, see the dataviz skill's bar/column spec) — same width for the outer track and the inner fill so the fill never peeks past the track's rounded corners. Kept toward the narrow end of that range (not the full 24px) so all 9 possible spell levels plus their gaps still fit a phone-width `ChartBox` without scrolling. */
const HISTOGRAM_COLUMN_WIDTH_PX = 20;

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
      <span className="text-[10px] font-semibold text-slate-400">{level.level}</span>
    </div>
  );
}

/**
 * The histogram of every spell slot level the party has, plus the running
 * total — replaces the old plain-number "1st Level ... 22/24" rows with one
 * glanceable shape: which levels are topped up, which are running dry, at
 * what relative depth. Its own caption lives on the enclosing `ChartBox`,
 * not here.
 *
 * Up to 9 columns (one per spell level) plus the Total block used to sit in
 * one unbroken row — a narrow `ChartBox` overflows that. Total now stacks
 * below the columns when narrow (a divider on top instead of the left) and
 * only moves back beside them once there's `@[512px]` of room, and
 * `overflow-x-auto` on the column row is a safety net for whatever's still
 * too tight below that (a party with several high-level casters can
 * genuinely fill all 9 levels) — scrolling a chart beats it silently
 * pushing the whole card off-screen.
 *
 * These are **container** queries (`@[…]:`), not viewport ones (`sm:`/
 * `lg:`) — what matters is this chart's own box width, not the browser
 * window's (`@container` on `SpellChartsRow`'s own root, below, is what
 * makes `@[512px]` mean "*this chart's own space* is ≥512px," not "the
 * window is"). `shrink-0` still matters alongside it — a flex item with any
 * `overflow-x-auto` descendant loses its normal min-content-width floor (a
 * separate CSS flexbox quirk), which let a sibling squeeze this column row
 * narrower than 9 columns need even when the container query above says
 * there's room.
 */
function SpellSlotHistogram({ spellSlots }: { spellSlots: PartySpellSlotSummary }) {
  const maxAcrossLevels = Math.max(...spellSlots.levels.map((l) => l.max));
  return (
    <div className="flex w-full max-w-full flex-col items-center gap-3 @[512px]:w-auto @[512px]:flex-row @[512px]:items-end @[512px]:gap-5">
      <div className="flex max-w-full shrink-0 items-end gap-2 overflow-x-auto pb-1 @[512px]:gap-3 @[512px]:overflow-visible @[512px]:pb-0">
        {spellSlots.levels.map((level) => (
          <SpellSlotColumn key={level.level} level={level} maxAcrossLevels={maxAcrossLevels} />
        ))}
      </div>
      <div className="flex shrink-0 flex-col items-center gap-1 border-t border-slate-800 pt-2 @[512px]:border-l @[512px]:border-t-0 @[512px]:pl-5 @[512px]:pt-0">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">Total</span>
        <span className={`text-sm font-semibold tabular-nums ${usageColorClass(spellSlots.totalCurrent, spellSlots.totalMax)}`}>
          {spellSlots.totalCurrent}/{spellSlots.totalMax}
        </span>
      </div>
    </div>
  );
}

/**
 * A bordered mini-panel for one chart, its label pinned to the top of the box
 * (same idea as `SectionLabel`) — same visual language `SensesPanel`/
 * `DefensesPanel`/`LanguagesToolsPanel` use as full `ToolkitCard`s, just one
 * nesting level down since two charts can share a single card instead of
 * getting their own.
 */
function ChartBox({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-4">
      {hint ? (
        <InfoTooltip inline panel={hint}>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{title}</span>
        </InfoTooltip>
      ) : (
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{title}</span>
      )}
      <div className="flex w-full flex-1 flex-col items-center justify-center">{children}</div>
    </div>
  );
}

/** Same shape as `AbilitySkillRadarHint` (title, description, then a row per reading the chart itself shows) — the meters below already show these same percentages, but restating them as text here matches every other chart-header hint in the Party Toolkit and gives a screen reader/no-hover reader the same summary at a glance. */
function RestRecoveryHeaderHint({ recovery }: { recovery: PartyRestRecoveryGauge }) {
  const rows = [
    recovery.shortRest && { label: "Short Rest", bucket: recovery.shortRest },
    recovery.longRest && { label: "Long Rest", bucket: recovery.longRest },
    recovery.shortRest && recovery.longRest && recovery.total && { label: "Total", bucket: recovery.total },
  ].filter((r): r is { label: string; bucket: PartyRestRecoveryBucket } => Boolean(r));
  return (
    <HintPanel
      title="Rest Recovery"
      description="How rested the party is right now — average % of resources back for each rest type."
      rows={rows}
      rowKey={(r) => r.label}
      rowClassName="flex items-center justify-between gap-4"
      renderRow={(r) => (
        <>
          <span>{r.label}</span>
          <span className={`shrink-0 font-semibold tabular-nums ${tierTextClass(r.bucket.percent)}`}>{r.bucket.percent}%</span>
        </>
      )}
    />
  );
}

/** Same shape as `RestRecoveryHeaderHint` — one row per spell level, same current/max the histogram's own columns show. */
function SpellSlotsHeaderHint({ spellSlots }: { spellSlots: PartySpellSlotSummary }) {
  return (
    <HintPanel
      title="Spell Slots"
      description="Spell slots left vs. max, one level at a time — taller columns on the chart are levels the party has more of."
      rows={spellSlots.levels}
      rowKey={(l) => String(l.level)}
      rowClassName="flex items-center justify-between gap-4"
      renderRow={(l) => (
        <>
          <span>{ordinalLevel(l.level)} Level</span>
          <span className={`shrink-0 font-semibold tabular-nums ${usageColorClass(l.current, l.max)}`}>
            {l.current}/{l.max}
          </span>
        </>
      )}
    />
  );
}

/**
 * Rest Recovery + Spell Slots charts, side by side in their own mini-boxes —
 * its own standalone card under Party Vitals (see `PartyChartsPanel`).
 * `flex-wrap` rather than a hard `sm:`-only switch: on a narrow phone
 * viewport where two boxes plus the Spell Slots histogram's own columns
 * genuinely can't fit side by side, this wraps to stacked instead of
 * squeezing/overflowing. `null` when neither chart has anything to show, so
 * the caller can skip the wrapper entirely instead of rendering empty
 * chrome.
 */
export function SpellChartsRow({ restRecovery, spellSlots }: { restRecovery: PartyRestRecoveryGauge; spellSlots: PartySpellSlotSummary | null }) {
  const hasRestMeters = Boolean(restRecovery.shortRest || restRecovery.longRest);
  if (!hasRestMeters && !spellSlots) return null;
  return (
    <div className="@container flex flex-wrap items-stretch justify-center gap-4">
      {hasRestMeters && (
        <ChartBox title="Rest Recovery" hint={<RestRecoveryHeaderHint recovery={restRecovery} />}>
          <RestRecoveryMeters recovery={restRecovery} />
        </ChartBox>
      )}
      {spellSlots ? (
        <ChartBox title="Spell Slots" hint={<SpellSlotsHeaderHint spellSlots={spellSlots} />}>
          <SpellSlotHistogram spellSlots={spellSlots} />
        </ChartBox>
      ) : (
        <p className="text-sm text-slate-600">No spell slots in the party.</p>
      )}
    </div>
  );
}

/**
 * Order-preserving column fill that targets each column's fair share of the
 * total weight, not just "whatever's left after the earlier columns filled
 * up" — built for `ResourceCoveragePanel`'s category grid, and shared with
 * any other panel that needs the same "distribute whole groups across N
 * columns, balanced by size, without splitting a group's own rows across a
 * column boundary" shape. Only fits well when there are at least as many
 * groups as columns — with fewer groups than columns (or one group much
 * larger than the rest), whole-group placement can't spread far enough and
 * leaves columns empty; `splitIntoColumns` below solves that case by
 * splitting at row granularity instead. Each boundary here is placed at
 * whichever item's cumulative weight lands closest to *that column's own*
 * fair-share target (`total * (columnIndex + 1) / numColumns`) — column 1
 * aims for the first quarter of the total, column 2 the first half, and so
 * on, so leftover weight spreads across every column instead of piling onto
 * the last one. Order-preserving: a column is always a contiguous run of the
 * input order, so the grid still reads top-to-bottom within a column, then
 * across to the next one.
 */
export function distributeIntoColumns<T>(items: T[], weightOf: (item: T) => number, numColumns: number): T[][] {
  if (items.length === 0) return Array.from({ length: numColumns }, () => []);

  const weights = items.map(weightOf);
  const total = weights.reduce((sum, w) => sum + w, 0);

  const columns: T[][] = [];
  let current: T[] = [];
  let cumulative = 0;
  let columnsUsed = 0;

  items.forEach((item, i) => {
    const isLastColumn = numColumns - columnsUsed <= 1;
    if (!isLastColumn && current.length > 0) {
      const target = (total * (columnsUsed + 1)) / numColumns;
      const withoutThis = cumulative;
      const withThis = cumulative + weights[i];
      // Close the column now, before adding this item, if that lands
      // closer to its fair-share target than including it would.
      if (Math.abs(withoutThis - target) <= Math.abs(withThis - target)) {
        columns.push(current);
        current = [];
        columnsUsed += 1;
      }
    }
    current.push(item);
    cumulative += weights[i];
  });
  columns.push(current);
  while (columns.length < numColumns) columns.push([]);
  return columns;
}

/**
 * Splits an ordered, header-tagged row list into `numColumns` contiguous
 * slices — a group's rows are free to break across a column boundary, so
 * columns come out balanced even with far fewer groups than columns (the
 * exact case `distributeIntoColumns` above can't handle, since it never
 * splits a group's own rows apart). Originally `InventoryOverview.tsx`'s own
 * private `splitRowsIntoColumns`, generalized so `ConsumablesPanel` — which
 * hit that same "2 groups, 4 columns" gap — can share it instead of
 * duplicating the same row-continuation logic.
 *
 * `isHeader` identifies header rows so a split is never placed right after
 * one with nothing following it in the same column (a header with no rows
 * under it reads as broken). `continuationHeader` builds the synthetic
 * "resumed" header inserted at the top of whichever column a group's rows
 * carry over into, from the first row of that carried-over remainder — so
 * it's never ambiguous which group a row belongs to after a column break.
 */
export function splitIntoColumns<R>(
  rows: R[],
  numColumns: number,
  isHeader: (row: R) => boolean,
  continuationHeader: (firstRestRow: R) => R
): R[][] {
  if (rows.length === 0) return Array.from({ length: numColumns }, () => []);

  const columns: R[][] = [];
  let remaining = rows;
  for (let col = 0; col < numColumns - 1; col++) {
    const columnsLeft = numColumns - col;
    if (remaining.length === 0) {
      columns.push([]);
      continue;
    }
    let splitIndex = Math.ceil(remaining.length / columnsLeft);
    while (splitIndex > 0 && isHeader(remaining[splitIndex - 1])) splitIndex--;
    if (splitIndex === 0) {
      columns.push([]);
      continue;
    }
    const colRows = remaining.slice(0, splitIndex);
    let rest = remaining.slice(splitIndex);
    if (rest.length > 0 && !isHeader(rest[0])) {
      rest = [continuationHeader(rest[0]), ...rest];
    }
    columns.push(colRows);
    remaining = rest;
  }
  columns.push(remaining);
  return columns;
}
