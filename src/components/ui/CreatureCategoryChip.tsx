import { CREATURE_CATEGORY_CHIP_COLOR, CREATURE_CATEGORY_SINGULAR_LABELS, CreatureCategory } from "@/lib/types";

/** A small, bright tag showing which of the three dashboard sections a creature belongs to — shown on `CreatureHeader` (shared by the card and its details modal) and on the roster row in Settings, so the category reads at a glance in both places. */
export function CreatureCategoryChip({ category }: { category: CreatureCategory }) {
  return (
    <span
      className={`inline-flex w-fit shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${CREATURE_CATEGORY_CHIP_COLOR[category]}`}
    >
      {CREATURE_CATEGORY_SINGULAR_LABELS[category]}
    </span>
  );
}
