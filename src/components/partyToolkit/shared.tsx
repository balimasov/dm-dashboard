import { ReactNode } from "react";
import { CoverageHolder, NamedCoverageEntry } from "@/lib/partyToolkit";
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
