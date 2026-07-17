import { Attack } from "./types";

/** D&D Beyond's own "Notes" column, condensed: extra granted damage, weapon category, and properties — as one comma list, matching its wording so the hint reads familiar to a DM who already knows that sheet. Mastery is deliberately excluded — it gets its own labeled line (with its rules blurb) in `AttackHintPanel` instead of being buried mid-list. */
export function attackNotes(attack: Attack): string | undefined {
  const parts = [attack.extraDamage, attack.category, ...attack.properties].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : undefined;
}
