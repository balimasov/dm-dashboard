/**
 * The 15 standard actions every 2024 PHB character can take, regardless of
 * class/race/feats — D&D Beyond's own character sheet lists these as a
 * fixed reference block under Actions (not derived from this character's
 * own data the way attacks/features are), so this is a static table rather
 * than something `ddbParser` computes. `description` uses the same `\n\n`
 * paragraph-break and `**bold**` markdown-lite `RichText` already expects
 * from parsed rules text, so the hint panel renders identically to every
 * other rules-text hint in the app. Condensed from the 2024 PHB text (some
 * multi-paragraph rules folded down, reference tables turned into a single
 * bolded-term line) with the key checks/DCs/conditions bolded, rather than
 * quoted in full — this is a quick-reference hint, not a rulebook reprint.
 */
export interface StandardAction {
  name: string;
  description: string;
}

export const STANDARD_ACTIONS: StandardAction[] = [
  {
    name: "Attack",
    description:
      "Make one attack roll with a weapon or an Unarmed Strike.\n\n" +
      "**Equipping and Unequipping Weapons.** You can equip or unequip one weapon as part of this action, before or after your attack — drawing, picking up, sheathing, stowing, or dropping it.\n\n" +
      "**Moving between Attacks.** If a feature such as Extra Attack gives you more than one attack, you can split your movement between those attacks.",
  },
  {
    name: "Dash",
    description:
      "Gain extra movement for the rest of the turn equal to your Speed.\n\n" +
      "With a Speed of 30 feet, you can move up to 60 feet this turn.\n\n" +
      "If you have a special speed, such as a **Fly** or **Swim** Speed, you can use that instead — you choose which, each time.",
  },
  {
    name: "Disengage",
    description: "Your movement doesn't provoke Opportunity Attacks for the rest of the turn.",
  },
  {
    name: "Dodge",
    description:
      "Until the start of your next turn, attack rolls against you have **Disadvantage** (if you can see the attacker), and you make **Dexterity saving throws** with **Advantage**.\n\n" +
      "You lose these benefits if you have the **Incapacitated** condition or your Speed is 0.",
  },
  {
    name: "Grapple",
    description:
      "Use an Unarmed Strike to try to grab a creature.\n\n" +
      "**Grapple.** The target makes a **Strength or Dexterity saving throw** (its choice) or gains the **Grappled** condition. **DC = 8 + your Strength modifier + Proficiency Bonus.** Only possible if the target is no more than one size larger than you and you have a hand free.\n\n" +
      "**One Grapple per Hand.** Each hand (or grasping body part) can grapple only one creature at a time.\n\n" +
      "**Escaping a Grapple.** The target can use its action to make a **Strength (Athletics) or Dexterity (Acrobatics)** check against the grapple's escape DC, ending the condition on a success. It also ends if you're Incapacitated or the target moves beyond the grapple's range.",
  },
  {
    name: "Help",
    description:
      "Help an ally's ability check or attack roll.\n\n" +
      "**Assist an Ability Check.** Choose a skill or tool you're proficient with and an ally near enough to assist. That ally has **Advantage** on their next check with it, until the start of your next turn.\n\n" +
      "**Assist an Attack Roll.** Distract an enemy within 5 feet of you — the next attack roll against it by one of your allies has **Advantage**, until the start of your next turn.",
  },
  {
    name: "Hide",
    description:
      "Make a **Dexterity (Stealth)** check to become Unseen.\n\n" +
      "Requires being **Heavily Obscured** or behind **Three-Quarters/Total Cover**, and out of every enemy's line of sight. **DC 15**, unless a feature says otherwise.\n\n" +
      "On a success, you gain the **Invisible** condition — your check's total becomes the DC for a creature trying to find you with a **Wisdom (Perception)** check.\n\n" +
      "Ends immediately if you make a sound louder than a whisper, an enemy finds you, you make an attack roll, or you cast a spell with a Verbal component.",
  },
  {
    name: "Improvise",
    description: "Try something not covered by another action — the DM decides what check, if any, is needed.",
  },
  {
    name: "Influence",
    description:
      "Make a **Charisma or Wisdom check** to alter a creature's attitude.\n\n" +
      "Describe how you're communicating — deceiving, intimidating, amusing, or persuading. The DM judges the creature's reaction:\n" +
      "**Willing** — no check, it complies.\n" +
      "**Unwilling** — no check, it refuses.\n" +
      "**Hesitant** — you make a check; **DC = 15 or the creature's Intelligence score, whichever is higher.**\n\n" +
      "**Deception** (deceiving), **Intimidation** (intimidating), **Performance** (amusing), **Persuasion** (persuading), or **Animal Handling** (coaxing a Beast/Monstrosity) — as fits your approach.\n\n" +
      "On a failure, you must wait 24 hours (or as the DM sets) before trying the same request again.",
  },
  {
    name: "Magic",
    description:
      "Cast a spell, use a magic item, or activate a magical feature that requires this action.\n\n" +
      "Casting a spell with a casting time of 1 minute or longer requires taking the Magic action on every turn of the casting while maintaining **Concentration** — if Concentration breaks, the spell fails but no slot is expended.",
  },
  {
    name: "Ready",
    description:
      "Prepare to act on a trigger you define, using your Reaction when it happens.\n\n" +
      "Choose the trigger, then the action (or a move up to your Speed) you'll take in response. When the trigger occurs, use your Reaction to act, or ignore it.\n\n" +
      "**Readying a spell**: cast it as normal (expending its resources) but hold the energy with **Concentration** until you release it with your Reaction — lost Concentration means the spell dissipates with no effect.",
  },
  {
    name: "Search",
    description:
      "Make a **Wisdom check** to discern something that isn't obvious.\n\n" +
      "**Insight** — a creature's state of mind.\n" +
      "**Medicine** — an ailment or cause of death.\n" +
      "**Perception** — a concealed creature or object.\n" +
      "**Survival** — tracks or food.",
  },
  {
    name: "Shove",
    description:
      "Use an Unarmed Strike to push a creature away or knock it down.\n\n" +
      "The target makes a **Strength or Dexterity saving throw** (its choice); on a failure you push it 5 feet or give it the **Prone** condition. **DC = 8 + your Strength modifier + Proficiency Bonus.** Only possible if the target is no more than one size larger than you.",
  },
  {
    name: "Study",
    description:
      "Make an **Intelligence check** to recall or reason out lore.\n\n" +
      "**Arcana** — spells, magic items, planes, related creatures.\n" +
      "**History** — historic events, civilizations, related creatures.\n" +
      "**Investigation** — traps, ciphers, gadgetry.\n" +
      "**Nature** — terrain, flora, weather, related creatures.\n" +
      "**Religion** — deities, rites, related creatures.",
  },
  {
    name: "Utilize",
    description: "Use a nonmagical object in a way that requires an action, when no more specific action already applies.",
  },
];
