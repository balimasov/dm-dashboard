/* eslint-disable @typescript-eslint/no-explicit-any */
import { Currency, InventoryItem, ItemCategory, ItemRarity } from "../types";
import { shortDescription } from "./shared";

const RARITY_MAP: Record<string, ItemRarity> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  "very rare": "Very Rare",
  legendary: "Legendary",
  artifact: "Artifact",
  varies: "Varies",
};

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

export function computeInventory(data: any): InventoryItem[] {
  return (data.inventory ?? []).map((item: any, idx: number) => {
    const rarity: ItemRarity = RARITY_MAP[String(item.definition?.rarity ?? "").toLowerCase()] ?? "Unknown";
    const description = shortDescription(item.definition?.snippet, item.definition?.description);
    return {
      id: `item-${idx}`,
      name: item.definition?.name || "Item",
      rarity,
      category: computeItemCategory(item.definition?.filterType, rarity),
      quantity: item.quantity ?? 1,
      ...(description ? { description } : {}),
    };
  });
}

export function computeCurrency(data: any): Currency {
  return {
    cp: data.currencies?.cp ?? 0,
    sp: data.currencies?.sp ?? 0,
    ep: data.currencies?.ep ?? 0,
    gp: data.currencies?.gp ?? 0,
    pp: data.currencies?.pp ?? 0,
  };
}
