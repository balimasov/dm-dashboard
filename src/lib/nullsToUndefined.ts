/**
 * Strips every `null`-valued key back to `undefined` in a shallow copy of
 * `obj`. `formValueToCreatureUpdates` (`creatureForm.ts`) sends an explicit
 * `null` for a creature field the edit form left blank — the only value
 * that survives `JSON.stringify` over the wire as a "clear this field"
 * signal (see that function's own doc comment). Anything that spreads such
 * an updates object onto a real `Creature` — the PATCH route's
 * `updateCreature` in `db.ts`, *and* `useCreatures.ts`'s own optimistic
 * local-state update before the server even responds — needs this
 * normalization first: the `Creature` type never has `| null`, and code
 * across the app checks `!== undefined` to mean "this field is set,"
 * assuming it never has to also rule out `null`. Skipping it client-side
 * once caused exactly that crash: `CreatureHeader.tsx` read a stray
 * `experiencePoints: null` from the optimistic merge as "set" and called
 * `null.toLocaleString()`.
 */
export function nullsToUndefined<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = { ...obj };
  for (const key of Object.keys(result)) {
    if (result[key] === null) result[key] = undefined;
  }
  return result as T;
}
