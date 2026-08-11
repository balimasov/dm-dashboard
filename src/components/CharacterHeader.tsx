import { Character } from "@/lib/types";
import { characterInfoLine } from "@/lib/format";
import { CharacterAvatar } from "@/components/CharacterAvatar";
import { ExternalLinkIcon } from "@/components/ui/icons";
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
        {/* D&D Beyond link lives here now (was its own full-width `DdbSyncStatus`
            row below the card header) — same line as "Lvl N" instead of a
            separate row, so linking a character costs no extra card height.
            Nested `<a>` inside this header's own clickable `<button>`
            (see below) isn't strict HTML nesting, but it's the only way to
            keep the link's real anchor behavior (middle-click, ctrl-click,
            right-click "open in new tab", native keyboard focus/activation)
            — `stopPropagation` is what keeps a click here from *also*
            opening the details modal underneath it. */}
        <p className={`flex min-w-0 items-center gap-1 ${MUTED_LABEL_CLS}`}>
          <span className="shrink-0">Lvl {c.level}</span>
          {c.dndBeyondUrl && (
            <>
              <span className="shrink-0">·</span>
              <a
                href={c.dndBeyondUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex min-w-0 shrink items-center gap-0.5 truncate text-sky-400 hover:underline"
              >
                D&amp;D Beyond <ExternalLinkIcon className="h-3 w-3 shrink-0" />
              </a>
            </>
          )}
        </p>
      </div>
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
