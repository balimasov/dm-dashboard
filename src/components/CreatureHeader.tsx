import { Character, Creature, creatureInfoLine } from "@/lib/types";
import { Avatar } from "./Avatar";
import { InfoTooltip } from "./InfoTooltip";
import { CreatureCategoryChip } from "./ui/CreatureCategoryChip";

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
}: {
  creature: Creature;
  owner?: Character;
  onClick?: () => void;
}) {
  const infoLine = [creatureInfoLine(creature), creature.alignment].filter(Boolean).join(", ");

  const content = (
    <>
      <Avatar src={creature.avatarUrl} label={creature.name} size="md" />
      <div className="min-w-0 flex-1">
        <div className="mb-0.5">
          <CreatureCategoryChip category={creature.category} />
        </div>
        <p
          title={creature.name}
          className="truncate text-lg font-semibold text-slate-50 transition-colors group-hover:text-white"
        >
          {creature.name}
        </p>
        {infoLine && (
          <p
            title={infoLine}
            className="truncate text-sm text-slate-400 transition-colors group-hover:text-slate-200"
          >
            {infoLine}
          </p>
        )}
        {creature.challengeRating && <p className="text-xs text-slate-500">CR {creature.challengeRating}</p>}
      </div>
    </>
  );

  const ownerTag = owner && (
    <InfoTooltip hoverOnly panel={<p>Owner: {owner.name}</p>}>
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
      <button type="button" onClick={onClick} className="group flex min-w-0 flex-1 items-start gap-3 text-left">
        {content}
      </button>
      {ownerTag}
    </div>
  );
}
