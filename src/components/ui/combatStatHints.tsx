/**
 * The AC/Speed/Initiative/Prof-bonus hover hints shown next to `IconStat` —
 * `CharacterCard.tsx` and `CharacterDetailsModal.tsx` used to hand-type the
 * same four strings independently (a real, byte-identical duplication, per a
 * UI-kit audit); both now import these instead. `CreatureStatBlock.tsx`'s
 * own AC/Speed wording is genuinely different (a creature is "it", not
 * "you") rather than a near-duplicate worth forcing into one string — only
 * Initiative's wording happens to be identical for both, so that one
 * constant is shared as-is. Proficiency Bonus isn't shown on a creature's
 * card/details at all (it rarely matters at a glance the way it does for a
 * player's own skill checks — still editable/importable, just not surfaced
 * here), so there's no creature-specific Prof hint to pair with the
 * character one below.
 */
export const INITIATIVE_HINT_PANEL = (
  <p>Initiative — added to a d20 roll at the start of combat to determine turn order.</p>
);

export const AC_HINT_PANEL = <p>Armor Class — the number an attack roll must meet or beat to hit you.</p>;
export const SPEED_HINT_PANEL = <p>Speed — how many feet you can move on your turn.</p>;
export const PROFICIENCY_HINT_PANEL = (
  <p>Proficiency Bonus — added to attack rolls, saving throws, and skill checks you&apos;re proficient in.</p>
);
export const LANGUAGES_HINT_PANEL = <p>Languages — the languages you can speak, read, or understand.</p>;
export const TOOLS_HINT_PANEL = <p>Tools — the tool, kit, or vehicle proficiencies you have.</p>;

export const CREATURE_AC_HINT_PANEL = <p>Armor Class — the number an attack roll must meet or beat to hit it.</p>;
export const CREATURE_SPEED_HINT_PANEL = <p>Speed — how many feet it can move on its turn.</p>;

/**
 * Same duplication, found one layer down in the same three files: the
 * Passive Perception/Investigation/Insight hints under Senses, and the
 * Resist/Immune/Vulnerable hints passed into `DamageInfoList`.
 * Investigation/Insight and all three damage-type hints turned out to have
 * no "you"/"it" wording at all — genuinely one string each, not just a
 * near-duplicate — so only Perception needs a creature-specific variant, the
 * same way AC/Speed/Prof did above. `CreatureStatBlock.tsx`'s own 4th damage
 * entry, Condition Immunity, has no character equivalent (only creatures
 * have that field) — not a duplicate to unify, just a creature-only extra.
 */
export const PASSIVE_PERCEPTION_HINT_PANEL = (
  <p>Passive Perception — the score a hidden creature or object must beat to avoid your notice; also what Stealth checks are rolled against.</p>
);
export const PASSIVE_INVESTIGATION_HINT_PANEL = (
  <p>Passive Investigation — used to notice details or work out clues without an active search.</p>
);
export const PASSIVE_INSIGHT_HINT_PANEL = <p>Passive Insight — used to sense deception or read intentions without rolling.</p>;

export const CREATURE_PASSIVE_PERCEPTION_HINT_PANEL = (
  <p>Passive Perception — the score a hidden creature or object must beat to avoid its notice; also what Stealth checks are rolled against.</p>
);

export const RESIST_HINT_PANEL = <p>Resistance — takes half damage from this damage type.</p>;
export const IMMUNE_HINT_PANEL = <p>Immunity — takes no damage from this damage type.</p>;
export const VULNERABLE_HINT_PANEL = <p>Vulnerability — takes double damage from this damage type.</p>;
