import { Character, Creature } from "@/lib/types";
import { creatureInfoLine } from "@/lib/format";
import { Avatar } from "./Avatar";
import { InfoTooltip } from "./InfoTooltip";
import { CreatureCategoryChip } from "./ui/CreatureCategoryChip";
import { CARD_SUBTITLE_CLS, CARD_TITLE_CLS, MUTED_LABEL_CLS } from "./ui/typography";

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
        {creature.challengeRating &&
          (creature.experiencePoints != null ? (
            <InfoTooltip disableTap className={MUTED_LABEL_CLS} panel={<p>{creature.experiencePoints.toLocaleString()} XP</p>}>
              CR {creature.challengeRating}
            </InfoTooltip>
          ) : (
            <p className={MUTED_LABEL_CLS}>CR {creature.challengeRating}</p>
          ))}
      </div>
    </>
  );

  const ownerTag = owner && (
    <InfoTooltip hoverOnly disableTap panel={<p>Owner: {owner.name}</p>}>
      <Avatar src={owner.avatarUrl} label={owner.name} size="xs" />
    </InfoTooltip>
  );

  if (!onClick) {
    return (
      <div className="flex items-start gap-3">
        {content}
        {ownerTag}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        onClick={onClick}
        {...dragHandleProps}
        className="group -m-2 flex min-w-0 flex-1 items-start gap-3 rounded-lg p-2 text-left transition hover:bg-slate-800/50 active:scale-[0.985] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
      >
        {content}
      </button>
      {ownerTag}
    </div>
  );
}
