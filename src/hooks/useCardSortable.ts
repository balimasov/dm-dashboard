"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/**
 * One card's `useSortable` wiring, shared identically between
 * `CharacterCard` and `CreatureCard` — the same "one shared hook instead of
 * two hand-rolled copies" call already made for `RosterRow` (the Settings
 * roster editor's own drag-to-reorder rows). The difference from
 * `RosterRow`: there's no separate "⠿" handle button here — the returned
 * `dragHandleProps` is meant to be spread onto the card's own header button
 * (`CharacterHeader`/`CreatureHeader`), so a press-and-hold *there* starts
 * the drag while a quick tap still opens the details modal as before. That
 * distinction isn't hand-rolled either — it's `PointerSensor`'s own
 * `activationConstraint: { delay, tolerance }` (configured once, where the
 * `DndContext` is set up), the same built-in dnd-kit mechanism that already
 * separates "clicking the card" from "clicking a handle" elsewhere in this
 * app, just applied to a delay instead of a distance.
 *
 * `enabled=false` (a non-DM viewer, or a context where reordering doesn't
 * apply) still calls `useSortable` — required inside a `SortableContext`,
 * hooks can't be conditional — but passes dnd-kit's own `disabled` option
 * through, so the drag handle is inert without every caller needing to
 * remember to gate `dragHandleProps` itself.
 */
export function useCardSortable(id: string, enabled: boolean) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !enabled,
  });
  return {
    setNodeRef,
    style: { transform: CSS.Transform.toString(transform), transition },
    dragHandleProps: enabled ? { ...attributes, ...listeners } : undefined,
    isDragging,
  };
}
