import { Character } from "@/lib/types";
import { characterInfoLine } from "@/lib/format";
import { InfoTooltip } from "@/components/InfoTooltip";
import { CharacterChip } from "./CharacterChip";
import { HintPanel } from "./HintPanel";

/**
 * Which player character owns/controls a companion creature — a small chip
 * peeking from behind the creature's own avatar (same "floating marker"
 * convention `CreatureCategoryChip` already uses on the opposite corner),
 * not a separate element competing with the header for width. Built from
 * `CharacterChip` (the same avatar-or-initial-in-a-circle piece every other
 * "who's associated with this" spot in the app already uses, default border
 * included) and `HintPanel` (the same title+description shape every other
 * hover hint uses) rather than hand-rolled markup, so this reads as the
 * exact same recipe as everywhere else, not a one-off.
 */
export function OwnerBadge({ owner }: { owner: Character }) {
  return (
    <InfoTooltip
      hoverOnly
      disableTap
      panel={<HintPanel title={owner.name} description={`${characterInfoLine(owner)}, Lvl ${owner.level}`} />}
    >
      <CharacterChip name={owner.name} avatarUrl={owner.avatarUrl} showTitle={false} />
    </InfoTooltip>
  );
}
