"use client";

import { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/**
 * One draggable row in a roster list — shared shape for both the character
 * and creature lists inside `CampaignFormModal`, so the two lists stay
 * visually identical and can be developed together going forward. Callers
 * supply the avatar, the name/info block (`children`), and the row-end
 * action buttons; drag-and-drop wiring lives here once instead of twice.
 */
export function RosterRow({
  id,
  avatar,
  actions,
  children,
  singleRow,
}: {
  id: string;
  avatar: ReactNode;
  actions: ReactNode;
  children: ReactNode;
  /**
   * Keeps the row on one line at every width instead of stacking the
   * actions onto their own line below `sm` — for rows whose `children` is
   * already a single flex line meant to shrink (like Quick Links' label+url
   * inputs), where wrapping just pushes the delete button onto a lonely
   * second row instead of anything actually getting more room.
   */
  singleRow?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-3 ${
        singleRow
          ? "flex-row items-center gap-3"
          : "flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
      } ${isDragging ? "opacity-50" : ""}`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none px-1 text-slate-600 hover:text-slate-300 active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          ⠿
        </button>
        {avatar}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      <div className="flex shrink-0 items-center justify-end gap-3 text-sm">{actions}</div>
    </li>
  );
}
