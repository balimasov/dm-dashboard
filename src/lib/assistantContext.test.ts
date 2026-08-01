import { describe, expect, test } from "vitest";
import { characterAssistantContext, creatureAssistantContext, partyTeammatesContext } from "./assistantContext";
import { Character, Creature } from "./types";

function makeCharacter(overrides: Partial<Character> & { name: string }): Character {
  return {
    id: overrides.name,
    campaignId: "camp",
    race: "Human",
    className: "Wizard",
    level: 5,
    role: "",
    heroicInspiration: false,
    initiative: 0,
    combat: {
      hp: 10,
      maxHp: 20,
      tempHp: 0,
      ac: 12,
      speed: 30,
      passivePerception: 10,
      passiveInvestigation: 10,
      passiveInsight: 10,
      conditions: [],
      exhaustion: 0,
    },
    stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    resources: [],
    spellSlots: [],
    knownSpells: [],
    features: [],
    attacks: [],
    savingThrowProficiencies: [],
    skillProficiencies: [],
    resistances: [],
    immunities: [],
    vulnerabilities: [],
    advantages: [],
    senses: [],
    languages: [],
    toolProficiencies: [],
    inventory: [],
    currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    notes: "",
    quickNotes: [],
    ...overrides,
  } as Character;
}

function makeCreature(overrides: Partial<Creature> & { name: string }): Creature {
  return {
    id: overrides.name,
    campaignId: "camp",
    category: "enemy",
    templateName: overrides.name,
    ac: 15,
    hp: 20,
    maxHp: 40,
    tempHp: 0,
    speed: 30,
    stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    traits: [],
    conditions: [],
    exhaustion: 0,
    ...overrides,
  } as Creature;
}

describe("characterAssistantContext", () => {
  test("reports HP, conditions, and remaining spell slots", () => {
    const character = makeCharacter({
      name: "Elowen",
      combat: {
        hp: 8,
        maxHp: 20,
        tempHp: 3,
        ac: 14,
        speed: 30,
        passivePerception: 10,
        passiveInvestigation: 10,
        passiveInsight: 10,
        conditions: ["Poisoned"],
        exhaustion: 1,
      },
      spellSlots: [
        { level: 1, current: 0, max: 4 },
        { level: 2, current: 2, max: 2 },
      ],
    });

    const context = characterAssistantContext(character);

    expect(context).toContain("HP: 8/20 (+3 temp)");
    expect(context).toContain("- Poisoned: Disadvantage on attack rolls and ability checks.");
    expect(context).toContain("Exhaustion: level 1 (−2 to every d20 roll");
    expect(context).toContain("Level 1: 0/4");
    expect(context).toContain("Level 2: 2/2");
  });

  test("marks a used-up resource as 0 of its max, not omitted", () => {
    const character = makeCharacter({
      name: "Bram",
      resources: [{ id: "second-wind", name: "Second Wind", current: 0, max: 1, recovery: "short-rest" }],
    });

    const context = characterAssistantContext(character);

    expect(context).toContain("[second-wind] Second Wind: 0/1 (recovers: Short Rest)");
  });

  test("shows a spell's own charge pool when it has one, otherwise no charge suffix", () => {
    const character = makeCharacter({
      name: "Nyra",
      knownSpells: [
        { id: "s1", name: "Fireball", level: 3, source: "Class" },
        { id: "s2", name: "Detect Magic", level: 1, source: "Race", current: 0, max: 1, recovery: "long-rest" },
      ],
    });

    const context = characterAssistantContext(character);

    expect(context).toContain("[s1] Fireball (level 3)");
    expect(context).toContain("[s2] Detect Magic (level 1, own charges 0/1 (recovers: Long Rest))");
  });

  test("tags a spell as concentration from its own isConcentration field, not left for the model to guess", () => {
    const character = makeCharacter({
      name: "Nyra",
      knownSpells: [
        { id: "s1", name: "Hold Person", level: 2, source: "Class", isConcentration: true, duration: "Concentration, 1 minute" },
        { id: "s2", name: "Magic Missile", level: 1, source: "Class", duration: "Instantaneous" },
      ],
    });

    const context = characterAssistantContext(character);

    expect(context).toContain("[s1] Hold Person (level 2, concentration)");
    expect(context).toContain("[s2] Magic Missile (level 1)");
  });

  test("flags an active concentration so the assistant knows a new concentration spell would end it", () => {
    const concentrating = characterAssistantContext(makeCharacter({ name: "Nyra", concentrating: true }));
    const notConcentrating = characterAssistantContext(makeCharacter({ name: "Nyra", concentrating: false }));

    expect(concentrating).toContain("Concentrating on a spell right now");
    expect(notConcentrating).not.toContain("Concentrating");
  });

  test("computes the exact 2024 d20/speed penalty for the current exhaustion level instead of leaving it to the model", () => {
    const level2 = characterAssistantContext(makeCharacter({ name: "Bram", combat: { ...makeCharacter({ name: "x" }).combat, exhaustion: 2 } }));
    expect(level2).toContain("Exhaustion: level 2 (−4 to every d20 roll — ability checks, attacks, saves; speed −10 ft)");
  });

  test("includes a passive ('other'-group) feature like Extra Attack, not just action-economy ones", () => {
    const character = makeCharacter({
      name: "Alor",
      features: [
        { id: "f1", name: "Extra Attack", source: "Fighter", group: "other", originType: "class", description: "You can attack twice, instead of once, whenever you take the Attack action." },
      ],
    });

    const context = characterAssistantContext(character);

    expect(context).toContain("[f1] Extra Attack: You can attack twice, instead of once, whenever you take the Attack action.");
  });

  test("includes a spell's casting time/range/damage/DC detail alongside its level", () => {
    const character = makeCharacter({
      name: "Nyra",
      knownSpells: [
        {
          id: "s1",
          name: "Fireball",
          level: 3,
          source: "Class",
          castingTime: "1 action",
          range: "150 ft.",
          effect: "8d6",
          effectType: "Fire",
          hitOrDc: "DC 15 DEX",
        },
      ],
    });

    const context = characterAssistantContext(character);

    expect(context).toContain("[s1] Fireball (level 3) — 1 action, 150 ft., 8d6 Fire, DC 15 DEX");
  });

  test("tags a weapon attack with its own [id] so the assistant can reference it exactly", () => {
    const character = makeCharacter({
      name: "Bram",
      attacks: [{ id: "attack-0", name: "Longsword", attackType: "melee", attackBonus: 5, damage: "1d8+3", damageType: "slashing", properties: [], proficient: true }],
    });

    const context = characterAssistantContext(character);

    expect(context).toContain("[attack-0] Longsword: +5 to hit, 1d8+3 slashing");
  });

  test("lists a weapon's properties so the model can spot a Light off-hand pair for two-weapon fighting", () => {
    const character = makeCharacter({
      name: "Tarah",
      attacks: [
        { id: "attack-0", name: "Shortsword", attackType: "melee", attackBonus: 6, damage: "1d6+3", damageType: "piercing", properties: ["Light", "Finesse"], proficient: true },
      ],
    });

    const context = characterAssistantContext(character);

    expect(context).toContain("[attack-0] Shortsword: +6 to hit, 1d6+3 piercing [Light, Finesse]");
  });

  test("includes a weapon's mastery property and its mechanical effect, since the model has no other way to know it applies", () => {
    const character = makeCharacter({
      name: "Bram",
      attacks: [
        {
          id: "attack-0",
          name: "Greatsword",
          attackType: "melee",
          attackBonus: 7,
          damage: "2d6+4",
          damageType: "slashing",
          properties: [],
          proficient: true,
          mastery: "Graze",
        },
      ],
    });

    const context = characterAssistantContext(character);

    expect(context).toContain("Mastery (Graze): On a miss, still deal damage equal to your ability modifier.");
  });

  test("reports senses (darkvision etc.) so the assistant can reason about vision in the dark or against hidden/invisible targets", () => {
    const character = makeCharacter({
      name: "Bram",
      senses: [{ name: "Darkvision", range: 60 }],
    });

    const context = characterAssistantContext(character);

    expect(context).toContain("Senses: Darkvision 60 ft");
  });

  test("lists Consumable inventory items (potions, scrolls) with their own [id] and remaining quantity, but not other item categories", () => {
    const character = makeCharacter({
      name: "Bram",
      inventory: [
        { id: "potion-1", name: "Potion of Healing", rarity: "Common", category: "Consumable", quantity: 2, description: "Regain 2d4+2 hit points." },
        { id: "scroll-1", name: "Scroll of Fireball", rarity: "Rare", category: "Consumable", quantity: 0 },
        { id: "shield-1", name: "Shield", rarity: "Common", category: "Armor", quantity: 1 },
      ],
    });

    const context = characterAssistantContext(character);

    expect(context).toContain("[potion-1] Potion of Healing (qty 2): Regain 2d4+2 hit points.");
    expect(context).toContain("[scroll-1] Scroll of Fireball (qty 0)");
    expect(context).not.toContain("Shield");
  });

  test("reports ability scores with their modifier, and saving throws with proficiency already folded in and marked", () => {
    const character = makeCharacter({
      name: "Alor",
      level: 5,
      stats: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
      savingThrowProficiencies: ["con", "wis"],
    });

    const context = characterAssistantContext(character);

    expect(context).toContain("Ability scores: STR 16 (+3), DEX 14 (+2), CON 14 (+2), INT 10 (+0), WIS 12 (+1), CHA 8 (-1)");
    expect(context).toContain("Saving throws: STR +3, DEX +2, CON +5 (proficient), INT +0, WIS +4 (proficient), CHA -1");
  });

  test("lists only trained/notable skills with their full bonus (proficiency/expertise/half-proficiency/advantage already folded in), not the other ~15", () => {
    const character = makeCharacter({
      name: "Tarah",
      level: 5,
      stats: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
      skillProficiencies: [
        { name: "athletics", proficient: true, expertise: false },
        { name: "stealth", proficient: true, expertise: true },
        { name: "performance", proficient: false, expertise: false, advantage: "advantage", advantageNote: "while dancing" },
        { name: "insight", proficient: false, expertise: false },
      ],
    });

    const context = characterAssistantContext(character);

    expect(context).toContain("- Athletics: +6 (proficient)");
    expect(context).toContain("- Stealth: +8 (expertise)");
    expect(context).toContain("- Performance: -1 (advantage — while dancing)");
    expect(context).not.toContain("Insight");
  });

  test("reports resistances/immunities/vulnerabilities, omitting a category with none", () => {
    const character = makeCharacter({
      name: "Bram",
      resistances: ["Fire", "Cold"],
      immunities: ["Poison"],
      vulnerabilities: [],
    });

    const context = characterAssistantContext(character);

    expect(context).toContain("Damage resistances: Fire, Cold");
    expect(context).toContain("Damage immunities: Poison");
    expect(context).not.toContain("Damage vulnerabilities");
  });

  test("flags available Heroic Inspiration, and omits the line entirely when unavailable", () => {
    const available = characterAssistantContext(makeCharacter({ name: "Bram", heroicInspiration: true }));
    const unavailable = characterAssistantContext(makeCharacter({ name: "Bram", heroicInspiration: false }));

    expect(available).toContain("Heroic Inspiration: available");
    expect(unavailable).not.toContain("Heroic Inspiration");
  });
});

describe("creatureAssistantContext", () => {
  test("names the party member this creature is summoned/commanded by, when given one", () => {
    const withOwner = creatureAssistantContext(makeCreature({ name: "Otherworldly Steed" }), "Lilith");
    expect(withOwner).toContain("Owned/commanded by: Lilith");

    const withoutOwner = creatureAssistantContext(makeCreature({ name: "Young Red Dragon" }));
    expect(withoutOwner).not.toContain("Owned/commanded by");
  });

  test("reports HP/AC and passes trait recharge text through unstructured", () => {
    const creature = makeCreature({
      name: "Young Red Dragon",
      hp: 50,
      maxHp: 178,
      ac: 18,
      conditions: ["Frightened"],
      traits: [
        { name: "Fire Breath", group: "action", recharge: "Recharge 5-6" },
        { name: "Multiattack", group: "action" },
      ],
    });

    const context = creatureAssistantContext(creature);

    expect(context).toContain("HP: 50/178");
    expect(context).toContain("AC: 18");
    expect(context).toContain("- Frightened: Disadvantage on ability checks and attack rolls");
    expect(context).toContain("[trait-0] (action) Fire Breath [Recharge 5-6]");
    expect(context).toContain("[trait-1] (action) Multiattack");
  });

  test("passes a trait's free-text description through, since structured fields alone don't cover Multiattack's own effect", () => {
    const creature = makeCreature({
      name: "Young Red Dragon",
      traits: [
        {
          name: "Multiattack",
          group: "action",
          description: "The dragon makes three attacks: one bite and two claws.",
        },
      ],
    });

    const context = creatureAssistantContext(creature);

    expect(context).toContain("The dragon makes three attacks: one bite and two claws.");
  });

  test("includes attack bonus/damage and save DC when a trait has them", () => {
    const creature = makeCreature({
      name: "Ogre",
      traits: [
        {
          name: "Greatclub",
          group: "action",
          attack: { attackType: "melee", attackBonus: 6, damage: [{ dice: "2d8 +4", damageType: "bludgeoning" }] },
        },
        {
          name: "Frightful Presence",
          group: "action",
          save: { ability: "wis", dc: 13 },
        },
      ],
    });

    const context = creatureAssistantContext(creature);

    expect(context).toContain("+6 to hit, 2d8 +4 bludgeoning");
    expect(context).toContain("DC 13 WIS save");
  });

  test("flags an active concentration the same way a character's does", () => {
    const context = creatureAssistantContext(makeCreature({ name: "Cultist Priest", concentrating: true }));
    expect(context).toContain("Concentrating on a spell right now");
  });

  test("passes a creature's free-text Senses line through unstructured", () => {
    const creature = makeCreature({ name: "Owlbear", senses: "Darkvision 60 ft., Passive Perception 13" });
    const context = creatureAssistantContext(creature);
    expect(context).toContain("Senses: Darkvision 60 ft., Passive Perception 13");
  });

  test("tags each spellcasting spell with its own group/index [id], since spell names alone have no id on the data model", () => {
    const creature = makeCreature({
      name: "Cultist Priest",
      spellcasting: {
        ability: "wis",
        saveDc: 13,
        attackBonus: 5,
        spellGroups: [
          { label: "At will", spells: ["Fire Bolt", "Mage Hand"] },
          { label: "3/Day each", spells: ["Fireball"] },
        ],
      },
    });

    const context = creatureAssistantContext(creature);

    expect(context).toContain("- At will:");
    expect(context).toContain("- [spell-0-0] Fire Bolt");
    expect(context).toContain("- [spell-0-1] Mage Hand");
    expect(context).toContain("- 3/Day each:");
    expect(context).toContain("- [spell-1-0] Fireball");
  });

  test("reports ability scores, and falls back a saving throw to the plain modifier when no explicit trained save is set — same convention CreatureStatBlock.tsx displays", () => {
    const creature = makeCreature({
      name: "Ogre",
      stats: { str: 19, dex: 8, con: 16, int: 5, wis: 7, cha: 7 },
      savingThrows: { str: 6 },
    });

    const context = creatureAssistantContext(creature);

    expect(context).toContain("Ability scores: STR 19 (+4), DEX 8 (-1), CON 16 (+3), INT 5 (-3), WIS 7 (-2), CHA 7 (-2)");
    expect(context).toContain("Saving throws: STR +6, DEX -1, CON +3, INT -3, WIS -2, CHA -2");
  });

  test("passes a creature's free-text Skills line and damage resistances/immunities/vulnerabilities/condition immunities through unstructured", () => {
    const creature = makeCreature({
      name: "Owlbear",
      skills: "Perception +5, Stealth +3",
      damageResistances: "Bludgeoning, Piercing, and Slashing from Nonmagical Attacks",
      damageImmunities: "Poison",
      damageVulnerabilities: "Radiant",
      conditionImmunities: "Poisoned, Frightened",
    });

    const context = creatureAssistantContext(creature);

    expect(context).toContain("Skills: Perception +5, Stealth +3");
    expect(context).toContain("Damage resistances: Bludgeoning, Piercing, and Slashing from Nonmagical Attacks");
    expect(context).toContain("Damage immunities: Poison");
    expect(context).toContain("Damage vulnerabilities: Radiant");
    expect(context).toContain("Condition immunities: Poisoned, Frightened");
  });
});

describe("partyTeammatesContext", () => {
  test("summarizes HP, conditions, exhaustion, concentration, spell slots, and limited-use spells for every other party member", () => {
    const self = makeCharacter({ name: "Nyra" });
    const cleric = makeCharacter({
      name: "Durgin",
      race: "Dwarf",
      className: "Cleric",
      level: 5,
      combat: { ...self.combat, hp: 4, maxHp: 38, conditions: ["Poisoned"], exhaustion: 1 },
      concentrating: true,
      spellSlots: [{ level: 1, current: 0, max: 4 }],
      knownSpells: [{ id: "s1", name: "Healing Word", level: 1, source: "Class", current: 1, max: 2, recovery: "long-rest" }],
    });

    const context = partyTeammatesContext([self, cleric], self.id);

    expect(context).not.toContain("Nyra");
    expect(context).toContain("Durgin (Dwarf Cleric, level 5)");
    expect(context).toContain("HP 4/38");
    expect(context).toContain("conditions: Poisoned");
    expect(context).toContain("exhaustion 1");
    expect(context).toContain("concentrating");
    expect(context).toContain("spell slots: L1 0/4");
    expect(context).toContain("limited-use spells: Healing Word 1/2");
  });

  test("omits a hidden character from the summary", () => {
    const self = makeCharacter({ name: "Nyra" });
    const hidden = makeCharacter({ name: "NPC Ally", hidden: true });

    const context = partyTeammatesContext([self, hidden], self.id);

    expect(context).not.toContain("NPC Ally");
  });

  test("returns an empty string when there are no other party members", () => {
    const self = makeCharacter({ name: "Nyra" });
    expect(partyTeammatesContext([self], self.id)).toBe("");
  });
});
