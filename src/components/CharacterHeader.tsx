import { Character } from "@/lib/types";
import { characterInfoLine } from "@/lib/format";
import { CharacterAvatar } from "@/components/CharacterAvatar";
import { InfoTooltip } from "@/components/InfoTooltip";
import { CARD_SUBTITLE_CLS, CARD_TITLE_CLS, MUTED_LABEL_CLS } from "@/components/ui/typography";

/**
 * Shared between the compact card and the Character Details modal (clicking
 * this header is what opens that modal) so both stay visually identical by
 * construction rather than by copy-pasted markup drifting apart over time.
 */
export function CharacterHeader({
  character,
  onClick,
  dragHandleProps,
}: {
  character: Character;
  onClick?: () => void;
  /**
   * Spread from `useCardSortable` — press-and-hold *here* (not a separate
   * handle button elsewhere on the card) is what starts a card drag; a
   * quick tap still fires `onClick` as before. `active:scale-[0.985]` below
   * is the only visual cue for either case: it's the same plain "pressed"
   * feedback any button already gives, so a normal click never shows
   * anything that reads as a loading state, and a hold that turns into a
   * drag simply continues past it into the card's own lifted/dragging look
   * (set by the caller on the outer card, not here).
   */
  dragHandleProps?: Record<string, unknown>;
}) {
  const c = character;
  const content = (
    <>
      <CharacterAvatar character={c} size="md" />
      <div className="min-w-0 flex-1">
        <h2 title={c.name} className={CARD_TITLE_CLS}>
          {c.name}
        </h2>
        <p title={characterInfoLine(c)} className={CARD_SUBTITLE_CLS}>
          {characterInfoLine(c)}
        </p>
        <p className={MUTED_LABEL_CLS}>Lvl {c.level}</p>
      </div>
      <InfoTooltip
        hoverOnly
        disableTap
        desktopOnly
        panel={
          <p>
            <span className="font-semibold text-amber-400">Heroic Inspiration</span> — lets you reroll one d20 roll,
            keeping the better result. Currently {c.heroicInspiration ? "available" : "not available"}.
          </p>
        }
      >
        <span
          className={`shrink-0 text-3xl leading-none ${
            c.heroicInspiration ? "inspiration-star text-amber-400" : "text-slate-700"
          }`}
        >
          ★
        </span>
      </InfoTooltip>
    </>
  );

  if (!onClick) {
    return <div className="flex items-start gap-3">{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      {...dragHandleProps}
      className="group -m-2 flex items-start gap-3 rounded-lg p-2 text-left transition hover:bg-slate-800/50 active:scale-[0.985] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
    >
      {content}
    </button>
  );
}
