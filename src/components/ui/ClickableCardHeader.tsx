import { ReactNode } from "react";

/**
 * The click/non-click branch shared by `CharacterHeader`/`CreatureHeader` —
 * a plain flex row when there's nothing to click, or the same pressable
 * button (hover/press feedback, optional press-and-hold card dragging)
 * wrapping identical content, byte-identical between the two before this
 * (confirmed by a UI-kit audit). Each caller still builds its own
 * avatar+name+subtitle content — only this click-affordance wrapper is
 * shared.
 */
export function ClickableCardHeader({
  onClick,
  dragHandleProps,
  children,
}: {
  onClick?: () => void;
  /**
   * Spread from `useCardSortable` — press-and-hold *here* (not a separate
   * handle button elsewhere on the card) is what starts a card drag; a
   * quick tap still fires `onClick` as before.
   */
  dragHandleProps?: Record<string, unknown>;
  children: ReactNode;
}) {
  if (!onClick) {
    return <div className="flex items-start gap-3">{children}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      {...dragHandleProps}
      className="group -m-2 flex items-start gap-3 rounded-lg p-2 text-left transition hover:bg-slate-800/50 active:scale-[0.985] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
    >
      {children}
    </button>
  );
}
