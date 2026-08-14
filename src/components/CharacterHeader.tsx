import { Character } from "@/lib/types";
import { characterInfoLine } from "@/lib/format";
import { characterSyncIssue } from "@/lib/sync";
import { CharacterAvatar } from "@/components/CharacterAvatar";
import { ClickableCardHeader } from "@/components/ui/ClickableCardHeader";
import { CARD_META_CLS, CARD_SUBTITLE_CLS, CARD_TITLE_CLS } from "@/components/ui/typography";

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
  const syncIssue = characterSyncIssue(c);
  return (
    <ClickableCardHeader onClick={onClick} dragHandleProps={dragHandleProps}>
      <div className="relative shrink-0">
        <CharacterAvatar character={c} size="md" />
        {/* Same "unmissable at a glance across a full roster" reasoning as
            the status rail's own badges is why this lives on the avatar
            itself rather than only in the toolbar pill below: a DM
            scrolling a long party list catches this corner before reading
            any card's actual text. `characterSyncIssue` is the one place
            deciding "sync failed" vs. "never synced" — this dot doesn't
            care which, just that there's *something* to look at. */}
        {syncIssue && (
          <span
            aria-hidden="true"
            title={syncIssue.label}
            className="pointer-events-none absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-slate-950 bg-red-600 text-[9px] font-bold leading-none text-white"
          >
            !
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h2 title={c.name} className={CARD_TITLE_CLS}>
          {c.name}
        </h2>
        <p title={characterInfoLine(c)} className={CARD_SUBTITLE_CLS}>
          {characterInfoLine(c)}
        </p>
        {/* D&D Beyond now lives in the kebab menu's "Open D&D Beyond"
            item (see `EntityActionsMenu`) instead of an inline link here —
            keeps this line plain text, same size/color tier as the
            race/class line above via `CARD_META_CLS`. */}
        <p className={CARD_META_CLS}>Lvl {c.level}</p>
      </div>
    </ClickableCardHeader>
  );
}
