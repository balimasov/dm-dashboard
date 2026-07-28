/**
 * The AC/Speed/Initiative/Prof-bonus hover hints shown next to `IconStat` —
 * `CharacterCard.tsx` and `CharacterDetailsModal.tsx` used to hand-type the
 * same four strings independently (a real, byte-identical duplication, per a
 * UI-kit audit); both now import these instead. `CreatureStatBlock.tsx`'s
 * own AC/Speed/Prof wording is genuinely different (a creature is "it", not
 * "you"; a creature has no skill checks to earn proficiency in) rather than
 * a near-duplicate worth forcing into one string — only Initiative's wording
 * happens to be identical for both, so that one constant is shared as-is.
 */
export const INITIATIVE_HINT_PANEL = (
  <p>Initiative — added to a d20 roll at the start of combat to determine turn order.</p>
);

export const AC_HINT_PANEL = <p>Armor Class — the number an attack roll must meet or beat to hit you.</p>;
export const SPEED_HINT_PANEL = <p>Speed — how many feet you can move on your turn.</p>;
export const PROFICIENCY_HINT_PANEL = (
  <p>Proficiency Bonus — added to attack rolls, saving throws, and skill checks you&apos;re proficient in.</p>
);

export const CREATURE_AC_HINT_PANEL = <p>Armor Class — the number an attack roll must meet or beat to hit it.</p>;
export const CREATURE_SPEED_HINT_PANEL = <p>Speed — how many feet it can move on its turn.</p>;
export const CREATURE_PROFICIENCY_HINT_PANEL = (
  <p>Proficiency Bonus — added to attacks/saving throws where applicable.</p>
);
