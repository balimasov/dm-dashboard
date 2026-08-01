/**
 * Stable-within-one-request synthetic ids for the two entity kinds that
 * don't already carry their own `.id` on the data model — `CreatureTrait`
 * and a creature's spellcasting spell names (plain strings in
 * `CreatureSpellGroup.spells`). `Feature`/`KnownSpell`/`Attack`/`Resource`
 * already have a real `.id` (see `types/character.ts`/`types/item.ts`) and
 * should be referenced by that directly instead of going through here.
 *
 * These ids are deliberately NOT persisted anywhere — they only need to
 * agree between `assistantContext.ts` (embeds the id into the LLM-facing
 * sheet text) and `aiGlossary.tsx` (keys the hover-hint lookup table), both
 * of which are computed fresh from the exact same `Creature` object within
 * the same AI-assistant request, so a plain array-position formula is
 * enough — no cross-request/cross-sync stability is required.
 */
export function creatureTraitSourceId(index: number): string {
  return `trait-${index}`;
}

export function creatureSpellSourceId(groupIndex: number, spellIndex: number): string {
  return `spell-${groupIndex}-${spellIndex}`;
}
