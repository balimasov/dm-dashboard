import { ItemRarity, RARITY_COLOR } from "@/lib/types";
import { AbilityHintPanel } from "./AbilityHintPanel";

function formatWeight(weight?: number): string | undefined {
  return weight !== undefined ? `${weight} lb` : undefined;
}

function formatCost(cost?: number): string | undefined {
  return cost !== undefined ? `${cost} gp` : undefined;
}

/**
 * The hover hint for any inventory item — same "name / meta / description"
 * shape `AbilityHintPanel` already gives every spell/feature, so an item's
 * hint reads the same as everything else that hovers to explain itself
 * instead of showing bare rules text with no title. `weight`/`cost` come
 * straight from D&D Beyond's own item definition and are simply omitted
 * (not shown as "unknown") when it has neither on file — common for
 * consumables, and for anything added manually with no D&D Beyond
 * definition behind it at all.
 */
export function ItemHintPanel({
  name,
  rarity,
  weight,
  cost,
  description,
}: {
  name: string;
  rarity: ItemRarity;
  weight?: number;
  cost?: number;
  description?: string;
}) {
  const metaLine = [formatWeight(weight), formatCost(cost)].filter(Boolean).join(" · ");
  return (
    <AbilityHintPanel
      name={<span className={RARITY_COLOR[rarity]}>{name}</span>}
      metaLines={metaLine ? [metaLine] : undefined}
      description={description}
    />
  );
}
