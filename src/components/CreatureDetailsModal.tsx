"use client";

import { useEffect } from "react";
import { Character, Creature } from "@/lib/types";
import { CreatureHeader } from "./CreatureHeader";
import { CreatureStatBlock } from "./CreatureStatBlock";
import { NotesSection } from "./ui/NotesSection";
import { QuickNotesSection } from "./ui/QuickNotesSection";
import { StatusRail } from "./ui/StatusRail";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";

/**
 * Same shape as `CharacterDetailsModal` — opened by clicking a creature's
 * header, same shell (top-aligned scroll container, Escape-to-close,
 * backdrop-scroll lock). Unlike the character modal, the stat-block part
 * isn't a superset of the compact card's content: a creature's card already
 * shows its full stat block with nothing hidden, so `CreatureStatBlock` is
 * the exact same shared body in both places — this modal just gives it more
 * room. Notes/Quick Notes do appear in both places (same as
 * `CharacterDetailsModal`) — the compact card keeps its own copies (Notes
 * read-only, Quick Notes editable) for a quick glance/jot without opening
 * anything, while this modal makes Notes itself editable too, a faster path
 * than the full `/creatures/[id]/edit` page for a quick mid-session update.
 */
export function CreatureDetailsModal({
  creature,
  owner,
  onClose,
  onUpdate,
}: {
  creature: Creature;
  owner?: Character;
  onClose: () => void;
  onUpdate?: (id: string, updates: Partial<Creature>) => void;
}) {
  useEscapeToClose(onClose);

  // Without this, touch-scrolling the modal's backdrop on mobile also scrolls
  // the dashboard page underneath it — the backdrop is `fixed`, but the body
  // behind it is still a normal scrollable document as far as the browser's
  // touch-scroll gesture is concerned.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div
      // Deliberately not `items-center` — see the same note in
      // `CharacterDetailsModal`: a long stat block (many traits/legendary
      // actions) would otherwise clip its top above the viewport with no way
      // to scroll back up to it.
      className="scrollbar-themed fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 [scrollbar-gutter:stable]"
      onClick={onClose}
    >
      <div
        className={`relative my-4 flex w-full max-w-lg flex-col gap-4 rounded-xl border p-4 shadow-2xl shadow-black/40 ${
          creature.concentrating
            ? "concentrating-ring border-violet-500 bg-slate-950 bg-gradient-to-b from-violet-950/60 to-slate-950"
            : "border-slate-800 bg-slate-950"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <StatusRail
          conditions={creature.conditions}
          exhaustion={creature.exhaustion}
          concentrating={Boolean(creature.concentrating)}
          onToggleConcentration={onUpdate ? () => onUpdate(creature.id, { concentrating: !creature.concentrating }) : undefined}
          onConditionsChange={onUpdate ? (conditions) => onUpdate(creature.id, { conditions }) : undefined}
          onExhaustionChange={onUpdate ? (exhaustion) => onUpdate(creature.id, { exhaustion }) : undefined}
        />

        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <CreatureHeader creature={creature} owner={owner} />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-md p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <CreatureStatBlock creature={creature} onUpdate={onUpdate} />

        <NotesSection
          notes={creature.notes ?? ""}
          onChange={onUpdate ? (notes) => onUpdate(creature.id, { notes }) : undefined}
        />
        <QuickNotesSection
          notes={creature.quickNotes ?? []}
          onChange={onUpdate ? (quickNotes) => onUpdate(creature.id, { quickNotes }) : undefined}
        />
      </div>
    </div>
  );
}
