/**
 * The 15 standard actions every 2024 PHB character can take, regardless of
 * class/race/feats — D&D Beyond's own character sheet lists these as a
 * fixed reference block under Actions (not derived from this character's
 * own data the way attacks/features are), so this is a static table rather
 * than something `ddbParser` computes. `description` uses the same `\n\n`
 * paragraph-break convention `RichText` already expects from parsed rules
 * text, so the hint panel renders identically to every other rules-text
 * hint in the app.
 */
export interface StandardAction {
  name: string;
  /** One-line summary, shown in italics above the divider — mirrors D&D Beyond's own reference-card layout for these same 15 actions. */
  summary: string;
  description: string;
}

export const STANDARD_ACTIONS: StandardAction[] = [
  {
    name: "Attack",
    summary: "Make one attack with a weapon or an Unarmed Strike.",
    description:
      "The most common action in combat — you make one attack, whether with a weapon or an Unarmed Strike.\n\nSome features let you make more than one attack when you take this action.",
  },
  {
    name: "Dash",
    summary: "For the rest of the turn, give yourself extra movement equal to your Speed.",
    description:
      "The increase equals your Speed after modifiers. With a Speed of 30 feet, you can move up to 60 feet this turn.\n\nIf you have a special speed, such as a Fly or Swim Speed, you can use that instead of your Speed — you choose which, each time.",
  },
  {
    name: "Disengage",
    summary: "Your movement doesn't provoke Opportunity Attacks for the rest of the turn.",
    description: "Lets you back away from melee without giving an adjacent foe a free swing as you go.",
  },
  {
    name: "Dodge",
    summary: "Attack rolls against you have Disadvantage, and your Dexterity saves have Advantage, until your next turn.",
    description: "You lose this benefit if you're Incapacitated or if your Speed drops to 0.",
  },
  {
    name: "Grapple",
    summary: "Use an Unarmed Strike to grab a creature instead of dealing damage.",
    description:
      "A contested check: your Athletics vs. the target's Athletics or Acrobatics.\n\nOn a success, the target has the Grappled condition. A creature two sizes larger than you can't be grappled this way.",
  },
  {
    name: "Help",
    summary: "Aid another creature's task, or distract a foe so an ally hits more easily.",
    description:
      "Help a creature you can see or reach make an ability check, or help an ally's attack — the next attack roll against a foe you're helping distract has Advantage.",
  },
  {
    name: "Hide",
    summary: "Make a Dexterity (Stealth) check to become Unseen.",
    description:
      "You can't hide from a creature that can already see you clearly, and hiding ends the moment you're spotted or do something that gives you away.",
  },
  {
    name: "Improvise",
    summary: "Try something not covered by another action — the DM sets the DC and the effect.",
    description: "Describe what you want to do; the DM decides whether an ability check is required and, if so, which one.",
  },
  {
    name: "Influence",
    summary: "Make a Charisma check to persuade, deceive, or intimidate a creature.",
    description:
      "Attempt to sway a creature's attitude or actions through words or gestures — Persuasion, Deception, or Intimidation, as fits your approach.",
  },
  {
    name: "Magic",
    summary: "Cast a spell, use a magic item, or activate a magical feature that requires an action.",
    description:
      "Covers casting a spell with a casting time of an action, plus using a magic item or other magical effect that calls for this action.",
  },
  {
    name: "Ready",
    summary: "Prepare to act on a trigger you define, using your Reaction when it happens.",
    description:
      "Choose the trigger and the action (or move) you'll take; you use your Reaction to carry it out the moment the trigger occurs before the start of your next turn.",
  },
  {
    name: "Search",
    summary: "Make a Wisdom (Perception or Insight) check to find something.",
    description: "Used to spot a hidden creature, find a hidden object, or discern whether a creature is telling the truth.",
  },
  {
    name: "Shove",
    summary: "Use an Unarmed Strike to push a creature 5 feet or knock it Prone.",
    description:
      "A contested check: your Athletics vs. the target's Athletics or Acrobatics.\n\nOn a success, choose to push the target 5 feet away or give it the Prone condition.",
  },
  {
    name: "Study",
    summary: "Make an Intelligence check to recall or reason out lore.",
    description:
      "Used to remember or logically work out information about history, nature, arcana, or another field of knowledge.",
  },
  {
    name: "Utilize",
    summary: "Use a nonmagical object in a way that requires an action, such as picking a lock.",
    description:
      "Covers using an object that isn't already covered by a more specific action — the DM determines what check, if any, is needed.",
  },
];
