import { ReactNode } from "react";
import { ordinalLevel } from "@/lib/format";
import { tierTextClass } from "@/lib/tierColor";
import { CoverageHolder, NamedCoverageEntry, PartyResourceGauge, PartyRestRecoveryGauge, PartySpellSlotHolder } from "@/lib/partyToolkit";
import { InfoTooltip } from "../InfoTooltip";

/** Shared green/amber/red usage-danger palette (same tiers `HpBar` uses) — full or better reads plain white, half or less reads amber, empty reads red. Applied to every current/max value across the Party Toolkit panels: spell slots, Heroic Inspiration, and limited-use resources. */
export function usageColorClass(current: number, max: number): string {
  if (max <= 0 || current <= 0) return "text-red-400";
  if (current <= max / 2) return "text-amber-400";
  return "text-white";
}

/**
 * The shared shape behind every hover-hint panel in the Party Toolkit: a
 * title, an optional description (rules text or a short explainer), then an
 * optional `<ul>` of rows — same "description first, then who has it" order
 * the DM asked for everywhere. `emptyText` covers the few panels that show a
 * fallback line instead of an empty list ("No one currently has it.").
 *
 * Every row defaults to plain white text (`<li>`'s own color, inherited by
 * any span inside that doesn't set its own) — noticeably brighter than the
 * panel's dim `text-slate-300` description/prose, so a character name stays
 * scannable at a glance instead of blending into the surrounding text. A
 * `renderRow` callback only needs its own color class for an actual
 * semantic override (proficient → green, low resource → amber/red).
 */
export function HintPanel<T>({
  title,
  description,
  rows = [],
  rowKey,
  renderRow,
  rowClassName = "",
  emptyText,
}: {
  title: ReactNode;
  description?: ReactNode;
  rows?: T[];
  rowKey?: (row: T) => string;
  renderRow?: (row: T) => ReactNode;
  rowClassName?: string;
  emptyText?: string;
}) {
  return (
    <div className="space-y-1">
      <p className="font-medium text-white">{title}</p>
      {description && <p className="text-slate-300">{description}</p>}
      {rows.length > 0 ? (
        <ul className="space-y-0.5 pt-1">
          {rows.map((row) => (
            <li key={rowKey!(row)} className={`text-white ${rowClassName}`}>
              {renderRow!(row)}
            </li>
          ))}
        </ul>
      ) : (
        emptyText && <p className="text-white">{emptyText}</p>
      )}
    </div>
  );
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

/**
 * Semicircular "fuel gauge" arc — shared by the single party-wide dial and
 * the smaller Short Rest/Long Rest pair below it, so both read as the same
 * visual language at different sizes. `pathLength={100}` makes the fill a
 * plain 0-100 `strokeDasharray` regardless of the arc's actual pixel length
 * — no trig needed to convert a percentage into an angle — and every other
 * dimension (stroke width, font size) is expressed in the same SVG user
 * units, so shrinking just the container's CSS width (`widthClassName`)
 * scales the whole dial proportionally instead of needing a second set of
 * hand-tuned sizes. Colored with the same emerald/amber/red danger tiers
 * `HpBar` uses, so "how worried should I be" reads the same everywhere.
 *
 * The gap value in `strokeDasharray` is deliberately way bigger than
 * `100 - percent` needs to be, not the exact remainder — a dash+gap that
 * sums to exactly `pathLength` wraps back to position 0 right at the
 * path's own endpoint, and with `strokeLinecap="round"` that seam paints
 * a stray round dot at the arc's tip (confirmed: visible at the 100% end
 * regardless of `percent`). An oversized gap means the pattern never
 * completes a second cycle, so there's nothing at the seam to draw.
 */
export function ResourceGaugeArc({ percent, subtitle, widthClassName = "w-52" }: { percent: number; subtitle: string; widthClassName?: string }) {
  const tierClass = tierTextClass(percent);
  const arcPath = "M 16 100 A 84 84 0 0 1 184 100";

  return (
    <svg viewBox="0 0 200 118" className={widthClassName}>
      <path d={arcPath} fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" className="text-slate-800" />
      <path
        d={arcPath}
        fill="none"
        strokeWidth="16"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray={`${percent} 1000`}
        stroke="currentColor"
        className={tierClass}
      />
      <text x="100" y="88" textAnchor="middle" className={`text-3xl font-bold tabular-nums ${tierClass}`} fill="currentColor">
        {percent}%
      </text>
      <text x="100" y="110" textAnchor="middle" className="text-[11px] fill-slate-500">
        {subtitle}
      </text>
    </svg>
  );
}

/** Same idea as `AbilitySkillRadarHint` — the gauge's own hover hint, since "74%" means nothing without knowing it's an average of equally-weighted pools, not a sum. */
export function PartyResourcesHint({ resourceCount }: { resourceCount: number }) {
  return (
    <HintPanel
      title="Party Resources"
      description={
        <>
          Average of every individually-tracked pool&apos;s own remaining % — each spell slot level, Heroic
          Inspiration, and every character resource ({resourceCount} total) counts as one equal vote, regardless of
          its size. A small fully-drained resource (e.g. Rage at 0/2) pulls this down just as much as a big one like
          spell slots, instead of getting lost next to it.
        </>
      }
    />
  );
}

export function PartyResourceGaugeDisplay({ gauge }: { gauge: PartyResourceGauge }) {
  return (
    <div className="flex flex-col items-center">
      <ResourceGaugeArc percent={gauge.percent} subtitle={`${gauge.resourceCount} resources tracked`} />
    </div>
  );
}

/**
 * The same average-per-resource gauge, split into a Short Rest and a Long
 * Rest dial — answers "if we rest right now, how much of what's running
 * low actually comes back" more directly than one blended number, since
 * that's the DM's actual mid-encounter decision. Either side is omitted
 * (not just empty) when the party has no resources of that kind at all, so
 * a party with zero short-rest resources doesn't get an empty 0% dial that
 * reads as "you have nothing," which would be misleading.
 */
export function PartyRestRecoveryDisplay({ recovery }: { recovery: PartyRestRecoveryGauge }) {
  if (!recovery.shortRest && !recovery.longRest) return null;
  return (
    <div className="mt-2 flex items-start justify-center gap-10">
      {recovery.shortRest && (
        <div className="flex flex-col items-center">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">Short Rest</p>
          <ResourceGaugeArc percent={recovery.shortRest.percent} subtitle={`${recovery.shortRest.resourceCount} resources`} widthClassName="w-32" />
        </div>
      )}
      {recovery.longRest && (
        <div className="flex flex-col items-center">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">Long Rest</p>
          <ResourceGaugeArc percent={recovery.longRest.percent} subtitle={`${recovery.longRest.resourceCount} resources`} widthClassName="w-32" />
        </div>
      )}
    </div>
  );
}
