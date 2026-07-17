import { Attack } from "./types";

/** D&D Beyond's own "Notes" column, condensed: extra granted damage, weapon category, properties, and mastery name — all as one comma list, matching its wording so the hint reads familiar to a DM who already knows that sheet. */
export function attackNotes(attack: Attack): string | undefined {
  const parts = [attack.extraDamage, attack.category, ...attack.properties, attack.mastery].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : undefined;
}
