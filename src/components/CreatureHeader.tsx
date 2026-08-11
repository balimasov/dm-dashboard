import { Character, Creature } from "@/lib/types";
import { creatureInfoLine } from "@/lib/format";
import { Avatar } from "./Avatar";
import { InfoTooltip } from "./InfoTooltip";
import { CreatureCategoryChip } from "./ui/CreatureCategoryChip";
import { OwnerBadge } from "./ui/OwnerBadge";
import { CARD_META_CLS, CARD_SUBTITLE_CLS, CARD_TITLE_CLS } from "./ui/typography";

/**
 * Shared between the compact `CreatureCard` and `CreatureDetailsModal`
 * (clicking this header is what opens that modal) — same convention as
 * `CharacterHeader`, so both stay visually identical by construction rather
 * than by copy-pasted markup drifting apart over time.
 */
export function CreatureHeader({
  creature,
  owner,
  onClick,
  dragHandleProps,
}: {
  creature: Creature;
  owner?: Character;
  onClick?: () => void;
  /** Spread from `useCardSortable` — same convention as `CharacterHeader`'s own `dragHandleProps`, see its doc comment. */
  dragHandleProps?: Record<string, unknown>;
}) {
  const infoLine = [creatureInfoLine(creature), creature.alignment].filter(Boolean).join(", ");

  const content = (
    <>
      <div className="relative shrink-0">
        <Avatar src={creature.avatarUrl} label={creature.name} size="md" />
        {/* Half-overlaps the avatar's bottom edge (same "floating marker"
            convention as `StatusRail`'s own badges) instead of sitting inline
            with the name — that read as clutter competing with the name for
            attention right in the header's first line. */}
        <div className="absolute inset-x-0 bottom-0 flex translate-y-1/2 justify-center">
          <CreatureCategoryChip category={creature.category} />
        </div>
        {/* Same floating-marker idea, opposite corner — peeks from behind
            the avatar's top-left rather than sitting as its own element off
            to the side (the previous layout), so it costs zero header width
            and lives inside this same clickable area instead of shrinking
            it. See `OwnerBadge`'s own doc comment for why. */}
        {owner && (
          <div className="absolute -left-2 -top-2">
            <OwnerBadge owner={owner} />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p title={creature.name} className={CARD_TITLE_CLS}>
          {creature.name}
        </p>
        {infoLine && (
          <p title={infoLine} className={CARD_SUBTITLE_CLS}>
            {infoLine}
          </p>
        )}
        {/* Reference now lives in the kebab menu's "Open Reference" item
            (see `EntityActionsMenu`) instead of an inline link here — this
            line is just "CR N", same size/color tier as the size/type line
            above via `CARD_META_CLS`. */}
        {creature.challengeRating != null && (
          <p className={CARD_META_CLS}>
            {creature.experiencePoints != null ? (
              <InfoTooltip disableTap inline panel={<p>{creature.experiencePoints.toLocaleString()} XP</p>}>
                CR {creature.challengeRating}
              </InfoTooltip>
            ) : (
              `CR ${creature.challengeRating}`
            )}
          </p>
        )}
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
