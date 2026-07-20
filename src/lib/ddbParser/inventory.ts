import { Currency, InventoryItem, ItemCategory, ItemRarity } from "../types";
import { rarityFromDdb, shortDescription } from "./shared";
import { RawDdbData } from "./rawTypes";

const CATEGORY_MAP: Record<string, ItemCategory> = {
  weapon: "Weapon",
  armor: "Armor",
  potion: "Consumable",
  scroll: "Consumable",
  ammunition: "Consumable",
  wand: "Magic Item",
  ring: "Magic Item",
  rod: "Magic Item",
  staff: "Magic Item",
  "wondrous item": "Magic Item",
};

/**
 * D&D Beyond's `filterType` covers the common physical categories (Weapon,
 * Armor, Potion, Scroll, Ammunition, Wand, Ring, Rod, Staff, Wondrous Item —
 * per the standard equipment-category convention), but not every item type
 * has been seen in a real export to confirm the exact string. Anything
 * unmapped falls back to a rarity-based guess: above-Common items are
 * usually magic items even when the specific filterType isn't recognized,
 * while Common unknowns are almost always mundane adventuring gear.
 */
function computeItemCategory(filterType: string | undefined, rarity: ItemRarity): ItemCategory {
  const mapped = CATEGORY_MAP[String(filterType ?? "").toLowerCase()];
  if (mapped) return mapped;
  return rarity !== "Common" && rarity !== "Unknown" ? "Magic Item" : "Gear";
}

export function computeInventory(data: RawDdbData): InventoryItem[] {
  return (data.inventory ?? []).map((item, idx) => {
    const rarity: ItemRarity = rarityFromDdb(item.definition?.rarity);
    const description = shortDescription(item.definition?.snippet, item.definition?.description);
    const type = item.definition?.type;
    const weight = item.definition?.weight;
    const cost = item.definition?.cost;
    return {
      id: `item-${idx}`,
      name: item.definition?.name || "Item",
      rarity,
      category: computeItemCategory(item.definition?.filterType, rarity),
      quantity: item.quantity ?? 1,
      ...(typeof type === "string" && type ? { type } : {}),
      ...(typeof weight === "number" ? { weight } : {}),
      ...(typeof cost === "number" ? { cost } : {}),
      ...(description ? { description } : {}),
    };
  });
}

export function computeCurrency(data: RawDdbData): Currency {
  return {
    cp: data.currencies?.cp ?? 0,
    sp: data.currencies?.sp ?? 0,
    ep: data.currencies?.ep ?? 0,
    gp: data.currencies?.gp ?? 0,
    pp: data.currencies?.pp ?? 0,
  };
}
