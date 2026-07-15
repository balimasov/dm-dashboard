import { ReactNode } from "react";

/**
 * The shared shape behind every simple hover-hint panel in the app: a title,
 * an optional description (rules text or a short explainer), then an
 * optional `<ul>` of rows — same "description first, then who has it" order
 * used everywhere this shows up. `emptyText` covers the few panels that show
 * a fallback line instead of an empty list ("No one currently has it.").
 *
 * Every row defaults to plain white text (`<li>`'s own color, inherited by
 * any span inside that doesn't set its own) — noticeably brighter than the
 * panel's dim `text-slate-300` description/prose, so a character name stays
 * scannable at a glance instead of blending into the surrounding text. A
 * `renderRow` callback only needs its own color class for an actual
 * semantic override (proficient → green, low resource → amber/red).
 *
 * This is the "minimally-varying label" hint (a skill, a passive score, a
 * language/tool count, a condition, "who has it") — a spell/feature/resource
 * needing school/source/components/recovery/availability on top of this same
 * title+description shape uses `AbilityHintPanel` instead, which composes
 * those extra fields into this component's own `description` slot rather
 * than duplicating the title/rows layout again.
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
