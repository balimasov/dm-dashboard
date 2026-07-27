export type ItemRarity =
  | "Common"
  | "Uncommon"
  | "Rare"
  | "Very Rare"
  | "Legendary"
  | "Artifact"
  | "Varies"
  | "Unknown";

/** Canonical rarity order, low to high (used for the edit-form dropdown and rarity text-color lookups). */
export const RARITY_ORDER: ItemRarity[] = [
  "Common",
  "Uncommon",
  "Rare",
  "Very Rare",
  "Legendary",
  "Artifact",
  "Varies",
  "Unknown",
];

/** Shared rarity → text-color lookup — an inventory item and a magic weapon's `Attack` entry both get colored the same way, so this lives here rather than duplicated per component. */
export const RARITY_COLOR: Record<ItemRarity, string> = {
  Common: "text-slate-300",
  Uncommon: "text-emerald-400",
  Rare: "text-blue-400",
  "Very Rare": "text-violet-400",
  Legendary: "text-amber-400",
  Artifact: "text-red-400",
  Varies: "text-slate-500",
  Unknown: "text-slate-500",
};

export type ItemCategory = "Weapon" | "Armor" | "Consumable" | "Magic Item" | "Gear";

/** Display order for grouping the party inventory. */
/** Alphabetical by label (Armor, Consumables, Gear, Magic Items, Weapons). */
export const CATEGORY_ORDER: ItemCategory[] = ["Armor", "Consumable", "Gear", "Magic Item", "Weapon"];

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  Weapon: "Weapons",
  Armor: "Armor",
  Consumable: "Consumables",
  "Magic Item": "Magic Items",
  Gear: "Gear",
};

/**
 * The eight 2024 PHB weapon mastery properties. A weapon's own `properties`
 * list (from D&D Beyond) always includes its one canonical mastery property
 * alongside its other tags (Finesse/Light/Thrown/...) — this is what
 * `computeAttacks` uses to split `Attack.mastery` out from `Attack.properties`.
 */
export const WEAPON_MASTERY_PROPERTIES = ["Cleave", "Graze", "Nick", "Push", "Sap", "Slow", "Topple", "Vex"];

/**
 * A single weapon attack a character can make right now — everything on the
 * "Combat" tab is one of these. Deliberately scoped to equipped weapons only
 * (see `computeAttacks`'s own doc comment for why natural weapons/Unarmed
 * Strike aren't covered).
 */
export interface Attack {
  id: string;
  name: string;
  attackType: "melee" | "ranged";
  /** To-hit modifier, proficiency (if any) already folded in. */
  attackBonus: number;
  /** Dice plus flat bonus already combined into one string, e.g. "1d12 +4". */
  damage: string;
  damageType?: string;
  /** Weapon properties other than its mastery — Finesse, Light, Thrown, Versatile, Heavy, Reach, Two-Handed, Ammunition... — shown in the hover hint (D&D Beyond's own "Notes"), not inline. */
  properties: string[];
  /** This weapon's 2024 mastery property (one of `WEAPON_MASTERY_PROPERTIES`), when it has one. */
  mastery?: string;
  /** "Simple" or "Martial" — omitted for Unarmed Strike, which has no weapon category. */
  category?: "Simple" | "Martial";
  /** Bonus damage a magic property grants beyond the weapon's own dice (e.g. a poisoned blade's "+2d10 Poison") — D&D Beyond's own `grantedModifiers` entries of `type: "damage"`. Rare; most weapons have none. */
  extraDamage?: string;
  /** e.g. "5 ft." (melee) or "150/600 ft." (ranged/thrown) — always set, matching D&D Beyond's own Range column showing a melee weapon's reach too. */
  range?: string;
  /** An unproficient attack still gets an ability-mod-only bonus, so this is shown as a caveat rather than hidden. */
  proficient: boolean;
  /** The weapon's base type (e.g. "Shortsword", "Rapier") — omitted for Unarmed Strike. Only shown in the hint for a non-Common weapon, since a mundane Greataxe's own name already says everything its type would. */
  weaponType?: string;
  /** Uncommon+ for a magic weapon, "Common" for mundane gear — drives both the hint's "is this special" block and the row's rarity-colored name (same `RARITY_COLOR` an inventory item uses). Omitted (never colored/expanded) for Unarmed Strike. */
  rarity?: ItemRarity;
  /** A magic weapon's own rules text (D&D Beyond's item description/snippet) — shown in the hint alongside `weaponType`/`rarity`, same as `InventoryItem.description`. Absent for mundane weapons. */
  description?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  rarity: ItemRarity;
  category: ItemCategory;
  quantity: number;
  /** D&D Beyond's own item subtype (e.g. "Potion", "Scroll", "Rapier") — finer-grained than `category`, absent for anything manually added (no D&D Beyond definition to read it from). */
  type?: string;
  /** Pounds, from D&D Beyond's own item definition — absent for a manually-added item. */
  weight?: number;
  /** GP, from D&D Beyond's own item definition — absent when D&D Beyond itself has no price on file for it (common for consumables) or the item was added manually. */
  cost?: number;
  /** Short rules blurb shown as a hover tooltip (from D&D Beyond, or typed manually). */
  description?: string;
}

export interface Currency {
  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;
}
