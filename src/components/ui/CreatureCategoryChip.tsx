import { CREATURE_CATEGORY_CHIP_COLOR, CREATURE_CATEGORY_SINGULAR_LABELS, CreatureCategory } from "@/lib/types";

/**
 * A small, bright tag showing which of the three dashboard sections a
 * creature belongs to — shown on `CreatureHeader` (shared by the card and
 * its details modal) and on the roster row in Settings, so the category
 * reads at a glance in both places. `size="sm"` is for the roster row, whose
 * avatar (56px) is smaller than the card's (64px) and needs a tighter chip
 * to still fit comfortably astride it.
 */
export function CreatureCategoryChip({
  category,
  size = "md",
}: {
  category: CreatureCategory;
  size?: "sm" | "md";
}) {
  const sizeCls = size === "sm" ? "px-1.5 py-px text-[8px]" : "px-2 py-0.5 text-[10px]";
  return (
    <span
      className={`inline-flex w-fit shrink-0 items-center rounded-full font-bold uppercase tracking-wide ${sizeCls} ${CREATURE_CATEGORY_CHIP_COLOR[category]}`}
    >
      {CREATURE_CATEGORY_SINGULAR_LABELS[category]}
    </span>
  );
}
