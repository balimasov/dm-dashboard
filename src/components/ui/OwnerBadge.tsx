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
 * "who's associated with this" spot in the app already uses) and
 * `HintPanel` (the same title+description shape every other hover hint
 * uses) rather than hand-rolled markup, so this reads as the exact same
 * recipe as everywhere else, not a one-off.
 *
 * Sized `lg` (28px, up from the default 20px) and given a soft white border
 * plus a heavy drop shadow instead of `CharacterChip`'s default neutral
 * border — a thin slate border reads fine on a flat placeholder but
 * disappears against a dark, busy creature photo (companion avatars are
 * painted portraits, not flat icons); the shadow keeps the chip legible
 * regardless of what's directly behind it. Chosen from a real-image
 * prototype comparing border/shadow treatments against an actual dark
 * companion photo.
 */
export function OwnerBadge({ owner }: { owner: Character }) {
  return (
    <InfoTooltip
      hoverOnly
      disableTap
      panel={<HintPanel title={owner.name} description={`${characterInfoLine(owner)}, Lvl ${owner.level}`} />}
    >
      <CharacterChip
        name={owner.name}
        avatarUrl={owner.avatarUrl}
        showTitle={false}
        size="lg"
        borderClassName="border-white/30"
        className="shadow-[0_4px_12px_rgba(0,0,0,0.95),0_0_0_1.5px_rgba(0,0,0,0.8)]"
      />
    </InfoTooltip>
  );
}
