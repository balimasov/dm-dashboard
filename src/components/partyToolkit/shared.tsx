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

export const CANTRIP_HINT = <p className="text-white">Cantrip — cast at will, no spell slot required.</p>;

/** Shared green/amber/red usage-danger palette (same tiers `HpBar` uses) — full or better reads plain white, half or less reads amber, empty reads red. Applied to every current/max value across the Party Toolkit panels: spell slots, Heroic Inspiration, and limited-use resources. */
export function usageColorClass(current: number, max: number): string {
  if (max <= 0 || current <= 0) return "text-red-400";
  if (current <= max / 2) return "text-amber-400";
  return "text-white";
}

/**
 * Shared by the Skills radar and the Spell Slots & Resources gauges — the
 * two cards sit side by side in a `lg:grid-cols-2` row, but the radar (a
 * fixed-size SVG) and the gauge stack (a shorter dial plus an optional
 * SR/LR row) render to different natural heights, so "Passives"/"Spell
 * Slots" below them landed at different y-coordinates across the two
 * columns (confirmed: 303px vs 263px). Both chart wrappers get this same
 * fixed min-height so the section labels that follow always start level
 * with each other; `justify-center` distributes whatever's left over
 * between top and bottom instead of dumping it all below the shorter one's
 * content as a single lopsided gap. `lg:`-only: below that breakpoint the
 * grid stacks to one column, where the two charts are never side by side
 * and forcing the height would just waste vertical space on a phone.
 */
export const CHART_AREA_MIN_HEIGHT_CLASS = "lg:flex lg:min-h-[304px] lg:flex-col lg:justify-center";

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

/** One recovery type's readiness as a horizontal meter (track = same-ramp light step, fill = danger-tier color) — same visual language as `ResourceTrackerBar` on a character card, just labeled per rest type instead of blended into one "overall" number. Hovering/tapping the bar itself (not just the number) shows the per-resource breakdown, matching the hit-target size of every other hintable row in this panel. The `(N)` after the percent is the pool count the percent is an average *of* — without it, a 50% bar reads the same whether it's one resource or ten, which matters exactly when it's low: a lone empty resource is a smaller problem than five of them. `emphasized` is only ever the Total row, bold enough to stand apart from the two rows it sums up. */
function RestRecoveryMeterRow({ label, bucket, emphasized = false }: { label: string; bucket: PartyRestRecoveryBucket; emphasized?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs leading-none">
      <span
        className={`w-20 shrink-0 whitespace-nowrap uppercase tracking-wide ${emphasized ? "font-bold text-slate-300" : "font-semibold text-slate-500"}`}
      >
        {label}
      </span>
      <InfoTooltip hoverOnly panel={<RestRecoveryHintPanel label={label} bucket={bucket} />}>
        <div className="h-3.5 w-36 overflow-hidden rounded-full bg-slate-800 sm:w-48">
          <div className={`h-full rounded-full ${tierBgClass(bucket.percent)}`} style={{ width: `${bucket.percent}%` }} />
        </div>
      </InfoTooltip>
      <span className={`shrink-0 font-semibold tabular-nums ${tierTextClass(bucket.percent)}`}>{bucket.percent}%</span>
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
 * `lg:`) — this histogram sits in two very differently-sized places: the
 * full-width "Resources & Coverage" card (~1400px) and the half-width
 * "Spell Slots & Resources" card, which sits in a 2-column grid next to
 * Skills and measures only ~680px even on a wide desktop viewport. A
 * viewport breakpoint like `sm:`/`lg:` can't tell those two apart — it only
 * knows the browser window is wide, not that *this* box only got half of
 * it — and confirmed exactly that: 9 columns fit fine in the full-width
 * card but overflowed in the half-width one at the very same viewport
 * width. `@container` on `SpellChartsRow`'s own root (below) is what makes
 * `@[512px]` mean "*this chart's own space* is ≥512px," not "the window
 * is." `shrink-0` still matters alongside it — a flex item with any
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
 *
 * The two boxes rendered side by side (Rest Recovery, Spell Slots) naturally
 * want different heights — the histogram's tall bars make Spell Slots the
 * taller of the two. The `items-stretch` on `SpellChartsRow`'s own row (once
 * it goes side by side) stretches both boxes to that same height; the
 * `flex-1 justify-center` wrapper here is what makes the *shorter* box's
 * content actually use that extra height instead of sitting cramped under
 * the caption with dead space below it. `@[1024px]:w-auto` — a container
 * query, same reasoning as `SpellSlotHistogram`'s own — only shrinks a box
 * to its own content width once `SpellChartsRow`'s container is actually
 * roomy enough for that to look intentional rather than cramped.
 */
function ChartBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex w-full flex-col items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-4 @[1024px]:w-auto @[1024px]:px-8">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{title}</span>
      <div className="flex w-full flex-1 flex-col items-center justify-center">{children}</div>
    </div>
  );
}

/**
 * Rest Recovery + Spell Slots charts, side by side — shared by every panel
 * that shows the party's resting/casting readiness (`SpellSlotsResourcesPanel`,
 * `ResourceCoveragePanel`) so both read as the same instrument instead of
 * drifting into two different chart styles over time. `null` when neither
 * chart has anything to show, so the caller can skip the wrapper entirely
 * instead of rendering empty chrome.
 *
 * `@container` here is what makes every `@[…]:` query in this file (here and
 * in `ChartBox`/`SpellSlotHistogram`) measure *this component's own*
 * rendered width — not the browser viewport's. That distinction matters
 * because this exact component renders inside two very differently-sized
 * places: the full-width "Resources & Coverage" card and the half-width
 * "Spell Slots & Resources" card (paired with Skills in a 2-column grid,
 * confirmed ~680px wide even on a 1500px-wide desktop viewport) — a `lg:`
 * viewport breakpoint can't distinguish those, only a container query can.
 * The side-by-side switch itself waits for `@[1024px]` (not the `@[512px]`
 * `SpellSlotHistogram` uses) because *two* boxes need to fit at once here,
 * not one.
 */
export function SpellChartsRow({ restRecovery, spellSlots }: { restRecovery: PartyRestRecoveryGauge; spellSlots: PartySpellSlotSummary | null }) {
  const hasRestMeters = Boolean(restRecovery.shortRest || restRecovery.longRest);
  if (!hasRestMeters && !spellSlots) return null;
  return (
    <div className="@container mt-2 flex flex-col items-center gap-4 @[1024px]:flex-row @[1024px]:items-stretch @[1024px]:justify-center @[1024px]:gap-6">
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
  );
}
