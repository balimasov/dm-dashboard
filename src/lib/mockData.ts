import { Character } from "./types";

export const demoCharacters: Character[] = [
  {
    "id": "demo-ragnar",
    "campaignId": "demo-campaign",
    "name": "Ragnar \"Black Rage\"",
    "race": "Orc",
    "className": "Barbarian",
    "level": 5,
    "role": "Frontline damage / rage tank",
    "heroicInspiration": true,
    "initiative": 2,
    "combat": {
      "hp": 45,
      "maxHp": 55,
      "tempHp": 0,
      "ac": 15,
      "speed": 40,
      "passivePerception": 10,
      "passiveInvestigation": 9,
      "passiveInsight": 10,
      "conditions": [],
      "exhaustion": 0
    },
    "stats": {
      "str": 19,
      "dex": 15,
      "con": 16,
      "int": 8,
      "wis": 10,
      "cha": 12
    },
    "resources": [
      {
        "id": "action-race-0",
        "name": "Adrenaline Rush",
        "current": 3,
        "max": 3,
        "recovery": "short-rest",
        "source": "Race",
        "description": "As a Bonus Action, you can take the Dash action. When you do, you gain 3 Temporary HP. You can use this trait 3 times, and you regain all uses after a Short or Long Rest."
      },
      {
        "id": "action-race-1",
        "name": "Relentless Endurance",
        "current": 1,
        "max": 1,
        "recovery": "long-rest",
        "source": "Race",
        "description": "Once per Long Rest, when you’re reduced to 0 HP but not killed outright, you can drop to 1 HP instead."
      },
      {
        "id": "action-class-0",
        "name": "Rage (Enter)",
        "current": 3,
        "max": 3,
        "recovery": "long-rest",
        "source": "Class",
        "description": "You can enter Rage if you aren’t wearing Heavy Armor. You can use Rage 3 times per Long Rest, and regain one expended use when you finish a Short Rest."
      }
    ],
    "spellSlots": [],
    "savingThrowProficiencies": [
      "str",
      "con"
    ],
    "skillProficiencies": [
      {
        "name": "athletics",
        "proficient": true,
        "expertise": false
      },
      {
        "name": "intimidation",
        "proficient": true,
        "expertise": false
      },
      {
        "name": "perception",
        "proficient": true,
        "expertise": false
      },
      {
        "name": "stealth",
        "proficient": true,
        "expertise": false
      },
      {
        "name": "survival",
        "proficient": true,
        "expertise": false
      }
    ],
    "resistances": [],
    "immunities": [],
    "vulnerabilities": [],
    "advantages": [
      "Advantage: Dexterity Saving Throws — unless you are Incapacitated."
    ],
    "senses": [
      {
        "name": "Darkvision",
        "range": 120
      }
    ],
    "languages": ["Common", "Orc"],
    "toolProficiencies": ["Vehicles (Land)"],
    "inventory": [
      {
        "id": "item-0",
        "name": "Pike, +1",
        "rarity": "Uncommon",
        "category": "Weapon",
        "quantity": 1,
        "description": "You have a +1 bonus to attack and damage rolls made with this magic weapon."
      },
      {
        "id": "item-1",
        "name": "Handaxe",
        "rarity": "Common",
        "category": "Weapon",
        "quantity": 1,
        "description": "Proficiency with a Handaxe allows you to add your proficiency bonus to the attack roll for any attack you make with it. This weapon has the following mastery property. To use this property, you must have a feature that lets you use it. **Vex.** If you hit a creature with this weapon and deal damage to the creature, you have Advantage on your next attack roll against that creature before the end of your next turn."
      },
      {
        "id": "item-2",
        "name": "Greataxe",
        "rarity": "Common",
        "category": "Weapon",
        "quantity": 1,
        "description": "Proficiency with a Greataxe allows you to add your proficiency bonus to the attack roll for any attack you make with it. This weapon has the following mastery property. To use this property, you must have a feature that lets you use it. **Cleave.** If you hit a creature with a melee attack roll using this weapon, you can make a melee attack roll with the weapon against a second creature within 5 feet of the first that is also within your reach. On a hit, the second creature takes the weapon’s damage, but don’t add your ability modifier to that damage unless that modifier is negative. You can make this extra attack only once per turn."
      },
      {
        "id": "item-3",
        "name": "Backpack",
        "rarity": "Common",
        "category": "Gear",
        "quantity": 1,
        "description": "A Backpack holds up to 30 pounds within 1 cubic foot. It can also serve as a saddlebag."
      },
      {
        "id": "item-4",
        "name": "Oil",
        "rarity": "Common",
        "category": "Gear",
        "quantity": 2,
        "description": "You can douse a creature, object, or space with Oil or use it as fuel, as detailed below. **Dousing a Creature or an Object.** When you take the Attack action, you can replace one of your attacks with throwing an Oil flask. Target one creature or object within 20 feet of yourself. The target must succeed on a Dexterity saving throw (DC 8 plus your Dexterity modifier and Proficiency Bonus) or be covered in oil. If the target takes Fire damage before the oil dries (after 1 minute), the target takes an extra 5 Fire damage from burning oil. **Dousing a Space.** You can take the Utilize action to pour an Oil flask on level ground to cover a 5-foot-square area within 5 feet of yourself. If lit, the oil burns until the end of the turn 2 rounds from when the oil was lit (or 12 seconds) and deals 5 Fire damage to any creature that enters the area or ends its turn there. A creature can take this damage only once per turn. **Fuel.** Oil serves as fuel for Lamps and Lanterns. Once lit, a flask of Oil burns for 6 hours in a Lamp or Lantern. That duration doesn’t need to be consecutive; you can extinguish the burning Oil (as a Utilize action) and rekindle it again until it has burned for a total of 6 hours."
      },
      {
        "id": "item-5",
        "name": "Rations",
        "rarity": "Common",
        "category": "Gear",
        "quantity": 10,
        "description": "Rations consist of travel-ready food, including jerky, dried fruit, hardtack, and nuts. See “Malnutrition” for the risks of not eating."
      },
      {
        "id": "item-6",
        "name": "Rope",
        "rarity": "Common",
        "category": "Gear",
        "quantity": 1,
        "description": "As a Utilize action, you can tie a knot with Rope if you succeed on a DC 10 Dexterity (Sleight of Hand) check. The Rope can be burst with a successful DC 20 Strength (Athletics) check. You can bind an unwilling creature with the Rope only if the creature has the Grappled, Incapacitated, or Restrained condition. If the creature’s legs are bound, the creature has the Restrained condition until it escapes. Escaping the Rope requires the creature to make a successful DC 15 Dexterity (Acrobatics) check as an action."
      },
      {
        "id": "item-7",
        "name": "Bedroll",
        "rarity": "Common",
        "category": "Gear",
        "quantity": 1,
        "description": "A Bedroll sleeps one Small or Medium creature. While in a Bedroll, you automatically succeed on saving throws against extreme cold (see the *Dungeon Master’s Guide*)."
      },
      {
        "id": "item-8",
        "name": "Tinderbox",
        "rarity": "Common",
        "category": "Gear",
        "quantity": 1,
        "description": "A Tinderbox is a small container holding flint, fire steel, and tinder (usually dry cloth soaked in light oil) used to kindle a fire. Using it to light a Candle, Lamp, Lantern, or Torch&mdash;or anything else with exposed fuel&mdash;takes a Bonus Action. Lighting any other fire takes 1 minute."
      },
      {
        "id": "item-9",
        "name": "Torch",
        "rarity": "Common",
        "category": "Gear",
        "quantity": 10,
        "description": "A Torch burns for 1 hour, casting Bright Light in a 20-foot radius and Dim Light for an additional 20 feet. When you take the Attack action, you can attack with the Torch, using it as a Simple Melee weapon. On a hit, the target takes 1 Fire damage."
      },
      {
        "id": "item-10",
        "name": "Waterskin",
        "rarity": "Common",
        "category": "Gear",
        "quantity": 1,
        "description": "A Waterskin holds up to 4 pints. If you don’t drink sufficient water, you risk dehydration."
      }
    ],
    "currency": {
      "cp": 0,
      "sp": 0,
      "ep": 0,
      "gp": 165,
      "pp": 0
    },
    "knownSpells": [],
    "features": [
      {
        "id": "feature-0",
        "name": "Adrenaline Rush",
        "source": "Adrenaline Rush",
        "group": "bonusAction",
        "originType": "species",
        "description": "As a Bonus Action, you can take the Dash action. When you do, you gain 3 Temporary HP. You can use this trait 3 times, and you regain all uses after a Short or Long Rest.",
        "current": 3,
        "max": 3,
        "recovery": "short-rest"
      },
      {
        "id": "feature-1",
        "name": "Relentless Endurance",
        "source": "Relentless Endurance",
        "group": "special",
        "originType": "species",
        "description": "Once per Long Rest, when you’re reduced to 0 HP but not killed outright, you can drop to 1 HP instead.",
        "current": 1,
        "max": 1,
        "recovery": "long-rest"
      },
      {
        "id": "feature-2",
        "name": "Rage (Enter)",
        "source": "Rage",
        "group": "bonusAction",
        "originType": "class",
        "description": "You can enter Rage if you aren’t wearing Heavy Armor. You can use Rage 3 times per Long Rest, and regain one expended use when you finish a Short Rest.",
        "current": 3,
        "max": 3,
        "recovery": "long-rest"
      },
      {
        "id": "feature-3",
        "name": "Hew",
        "source": "Great Weapon Master",
        "group": "bonusAction",
        "originType": "feat",
        "description": "Immediately after you score a Critical Hit with a Melee weapon or reduce a creature to 0 Hit Points with one, you can make one attack with the same weapon as a Bonus Action."
      },
      {
        "id": "feature-4",
        "name": "Heavy Weapon Mastery",
        "source": "Great Weapon Master",
        "group": "action",
        "originType": "feat",
        "description": "When you hit a creature with a weapon that has the Heavy property as part of the Attack action on your turn, you can cause the weapon to deal extra 3 damage to the target."
      },
      {
        "id": "feature-5",
        "name": "Vex (Handaxe)",
        "source": "Weapon Mastery",
        "group": "action",
        "originType": "class",
        "description": "**Vex.** If you hit a creature with a Handaxe and deal damage to it, you have Advantage on your next attack roll against that creature before the end of your next turn."
      },
      {
        "id": "feature-6",
        "name": "Cleave (Greataxe)",
        "source": "Weapon Mastery",
        "group": "action",
        "originType": "class",
        "description": "**Cleave.** Once per turn, if you hit a creature with a melee attack using a Greataxe, you can make another melee attack with it against a second creature within 5 ft. of the first that’s within your reach. On a hit, the second creature takes the Greataxe’s damage, but without your ability modifier (unless the modifier is negative)."
      },
      {
        "id": "feature-7",
        "name": "Push (Pike)",
        "source": "4: Weapon Mastery",
        "group": "action",
        "originType": "class",
        "description": "**Push.** If you hit a creature with Pike, you can push the creature up to 10 ft. straight away from you if it’s Large or smaller."
      },
      {
        "id": "feature-8",
        "name": "Darkvision",
        "source": "Race",
        "group": "other",
        "originType": "species",
        "description": "You have Darkvision with a range of 120 ft."
      },
      {
        "id": "feature-9",
        "name": "Creature Type",
        "source": "Race",
        "group": "other",
        "originType": "species",
        "description": "You're a Humanoid."
      },
      {
        "id": "feature-10",
        "name": "Size",
        "source": "Race",
        "group": "other",
        "originType": "species",
        "description": "Your Size is Medium."
      },
      {
        "id": "feature-11",
        "name": "Speed",
        "source": "Race",
        "group": "other",
        "originType": "species",
        "description": "Your Speed is 30 ft."
      },
      {
        "id": "feature-12",
        "name": "Ability Score Increases",
        "source": "Race",
        "group": "other",
        "originType": "species",
        "description": "When determining your character’s ability scores, increase one score by 2 and a different one by 1, or increase three scores by 1."
      },
      {
        "id": "feature-13",
        "name": "Frenzy",
        "source": "Path of the Berserker",
        "group": "other",
        "originType": "class",
        "description": "If you use Reckless Attack while Rage is active, you deal an additional **2d6** damage (the same damage type as the weapon or Unarmed Strike used) to the first target you hit on your turn with a Strength-based attack."
      },
      {
        "id": "feature-14",
        "name": "Unarmored Defense",
        "source": "Barbarian",
        "group": "other",
        "originType": "class",
        "description": "While not wearing armor, your base AC equals 15 + any Shield bonus."
      },
      {
        "id": "feature-15",
        "name": "Weapon Mastery",
        "source": "Barbarian",
        "group": "other",
        "originType": "class",
        "description": "You are able to use the mastery properties of kinds of Simple or Martial Melee weapons of your choice. Whenever you finish a Long Rest, you can change one of those weapon choices."
      },
      {
        "id": "feature-16",
        "name": "Danger Sense",
        "source": "Barbarian",
        "group": "other",
        "originType": "class",
        "description": "You have Advantage on Dex. saving throws unless you have the Incapacitated condition."
      },
      {
        "id": "feature-17",
        "name": "Reckless Attack",
        "source": "Barbarian",
        "group": "other",
        "originType": "class",
        "description": "When you make your first attack roll on your turn, you can decide to attack recklessly, giving you Advantage on attack rolls using Str. until the start of your next turn, but attacks against you have Advantage during that time."
      },
      {
        "id": "feature-18",
        "name": "Barbarian Subclass",
        "source": "Barbarian",
        "group": "other",
        "originType": "class",
        "description": "You gain a Barbarian subclass of your choice. A subclass is a specialization that grants you features at certain Barbarian levels. For the rest of your career, you gain each of your subclass’s features that are of your Barbarian level or lower."
      },
      {
        "id": "feature-19",
        "name": "Primal Knowledge",
        "source": "Barbarian",
        "group": "other",
        "originType": "class",
        "description": "You gain proficiency in another Barbarian skill of your choice. While Raging, whenever you make an ability check using one of the following skills, you can make it as a Str. check even if it normally uses a different ability: Acrobatics, Intimidation, Perception, Stealth, or Survival."
      },
      {
        "id": "feature-20",
        "name": "Ability Score Improvement",
        "source": "Barbarian",
        "group": "other",
        "originType": "class",
        "description": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify. You gain this feature again at Barbarian levels 8, 12, and 16."
      },
      {
        "id": "feature-21",
        "name": "Extra Attack",
        "source": "Barbarian",
        "group": "other",
        "originType": "class",
        "description": "You can attack twice instead of once whenever you take the Attack action on your turn."
      },
      {
        "id": "feature-22",
        "name": "Fast Movement",
        "source": "Barbarian",
        "group": "other",
        "originType": "class",
        "description": "Your speed increases by 10 ft. while you aren’t wearing Heavy armor."
      },
      {
        "id": "feature-23",
        "name": "Core Barbarian Traits",
        "source": "Barbarian",
        "group": "other",
        "originType": "class",
        "description": "As a Level 1 Character: Gain all the traits in the Core Barbarian Traits table. Gain the Barbarian’s level 1 features. Core Barbarian Traits Primary Ability Strength Hit Point Die D12 per Barbarian level Saving Throw Proficiencies Strength and Constitution Skill Proficiencies *Choose 2:* Animal Handling, Athletics, Intimidation, Nature, Perception, or Survival Weapon Proficiencies Simple and Martial weapons Armor Training Light and Medium armor and Shields Starting Equipment *Choose A or B:* (A) Greataxe, 4 Handaxes, Explorer’s Pack, and 15 GP; or (B) 75 GP"
      },
      {
        "id": "feature-24",
        "name": "Rage",
        "source": "Barbarian",
        "group": "other",
        "originType": "class",
        "description": "You can take a Bonus action to enter Rage if you aren’t wearing Heavy Armor. You can use Rage 3 times per Long Rest, and regain one expended use when you finish a Short Rest. *Activate Rage by clicking on this feature and selecting the drop down called Activate Rage. Deselect it to stop Raging.*",
        "current": 3,
        "max": 3,
        "recovery": "long-rest"
      },
      {
        "id": "feature-25",
        "name": "4: Weapon Mastery",
        "source": "Barbarian",
        "group": "other",
        "originType": "class",
        "description": "Your training with weapons allows you to use the mastery properties of two kinds of Simple or Martial Melee weapons of your choice, such as Greataxes and Handaxes. Whenever you finish a Long Rest, you can practice weapon drills and change one of those weapon choices. When you reach certain Barbarian levels, you gain the ability to use the mastery properties of more kinds of weapons, as shown in the Weapon Mastery column of the Barbarian Features table."
      },
      {
        "id": "feature-26",
        "name": "Great Weapon Master",
        "source": "Feat",
        "group": "other",
        "originType": "feat",
        "description": "**Ability Score Increase.** * Your Str. is increased by 1. *** Heavy Weapon Mastery.** When you hit a creature with a weapon that has the Heavy property as part of the Attack action on your turn, you can cause the weapon to deal an extra 3 damage to the target. ** Hew.** Immediately after you score a Critical Hit with a Melee weapon or reduce a creature to 0 HP with one, you can make one attack with the same weapon as a Bonus Action."
      },
      {
        "id": "feature-27",
        "name": "Savage Attacker",
        "source": "Feat",
        "group": "other",
        "originType": "feat",
        "description": "Once per turn when you hit a target with a weapon, you can roll the weapon’s damage dice twice and use either roll against the target."
      },
      {
        "id": "feature-28",
        "name": "Soldier Ability Score Improvements",
        "source": "Feat",
        "group": "other",
        "originType": "feat",
        "description": "The Soldier Background allows you to choose between Strength, Dexterity, and Constitution. Increase one of these scores by 2 and another one by 1, or increase all three by 1. None of these increases can raise a score above 20."
      },
      {
        "id": "feature-29",
        "name": "Increase two scores (+2 / +1)",
        "source": "Savage Attacker",
        "group": "other",
        "originType": "background",
        "description": "Increase one of these scores by 2 and a different score by 1."
      }
    ],
    "attacks": [
      {
        "id": "attack-unarmed",
        "name": "Unarmed Strike",
        "attackType": "melee",
        "attackBonus": 7,
        "damage": "5",
        "damageType": "Bludgeoning",
        "properties": [],
        "range": "5 ft.",
        "proficient": true
      },
      {
        "id": "attack-0",
        "name": "Greataxe",
        "attackType": "melee",
        "attackBonus": 7,
        "damage": "1d12 +4",
        "damageType": "Slashing",
        "properties": ["Heavy", "Two-Handed"],
        "mastery": "Cleave",
        "category": "Martial",
        "range": "5 ft.",
        "proficient": true
      },
      {
        "id": "attack-1",
        "name": "Handaxe",
        "attackType": "melee",
        "attackBonus": 7,
        "damage": "1d6 +4",
        "damageType": "Slashing",
        "properties": ["Light", "Thrown"],
        "mastery": "Vex",
        "category": "Simple",
        "range": "20/60 ft.",
        "proficient": true
      }
    ],
    "notes": "A Berserker who trades caution for raw damage output — Frenzy and Reckless Attack turn every Rage into an all-in swing. Give him enemies worth hitting hard and consequences (exhaustion, no room to retreat) for going all-in every fight.",
    "quickNotes": [
      {
        "id": "qn-ragnar-1",
        "text": "Owes 20gp to the blacksmith in Nightstone",
        "createdAt": "2026-07-05T10:00:00.000Z"
      }
    ],
    "subclass": "Path of the Berserker",
    "avatarUrl": "https://www.dndbeyond.com/avatars/17/208/636377840332911633.jpeg?width=150&height=150&fit=crop&quality=95&auto=webp",
    "synced": false
  },
  {
    "id": "demo-lilith",
    "campaignId": "demo-campaign",
    "name": "Lilith",
    "race": "Elf",
    "className": "Paladin",
    "level": 5,
    "role": "Frontline support / heroic burst",
    "heroicInspiration": true,
    "initiative": 4,
    "combat": {
      "hp": 41,
      "maxHp": 49,
      "tempHp": 0,
      "ac": 16,
      "speed": 30,
      "passivePerception": 11,
      "passiveInvestigation": 9,
      "passiveInsight": 11,
      "conditions": [],
      "exhaustion": 2
    },
    "stats": {
      "str": 13,
      "dex": 18,
      "con": 16,
      "int": 9,
      "wis": 12,
      "cha": 16
    },
    "resources": [
      {
        "id": "action-class-0",
        "name": "Lay On Hands: Healing Pool",
        "current": 10,
        "max": 25,
        "recovery": "long-rest",
        "source": "Class",
        "description": "You have a pool of healing power that replenishes when you finish a Long Rest. With that pool, you can restore a total of 25 HP."
      },
      {
        "id": "action-class-4",
        "name": "Channel Divinity",
        "current": 1,
        "max": 2,
        "recovery": "long-rest",
        "source": "Class",
        "description": "You can channel energy directly from the Outer Planes to fuel magical effects. Each time you use this class’s Channel Divinity, you can choose which effect to create. You can use this class’s Channel Divinity 2 times per Long Rest, but can regain one expended use after finishing a Short Rest. If your Channel Divinity requires a saving throw, the DC equals your Paladin spell save DC (DC 14)."
      },
      {
        "id": "action-feat-0",
        "name": "Luck Points",
        "current": 3,
        "max": 3,
        "recovery": "long-rest",
        "source": "Feat",
        "description": "You have 3 Luck Points that you can spend on the benefits below. You regain expended Luck Points after a Long Rest. **Advantage.** When you roll a d20 for a D20 Test, you can spend 1 Luck Point to give yourself Advantage on the roll. **Disadvantage.** When a creature rolls a d20 for an attack roll against you, you can spend 1 Luck Point to impose Disadvantage on that roll."
      }
    ],
    "spellSlots": [
      {
        "level": 1,
        "current": 0,
        "max": 2
      }
    ],
    "savingThrowProficiencies": [
      "wis",
      "cha"
    ],
    "skillProficiencies": [
      {
        "name": "insight",
        "proficient": true,
        "expertise": false
      },
      {
        "name": "intimidation",
        "proficient": true,
        "expertise": false
      },
      {
        "name": "perception",
        "proficient": true,
        "expertise": false
      },
      {
        "name": "persuasion",
        "proficient": true,
        "expertise": false
      },
      {
        "name": "stealth",
        "proficient": true,
        "expertise": false,
        "advantage": "disadvantage",
        "advantageNote": "Wearing armor that imposes disadvantage on Stealth checks."
      }
    ],
    "resistances": [],
    "immunities": [
      "Magical Sleep"
    ],
    "vulnerabilities": [],
    "advantages": [
      "Advantage: Saving Throws — Made to avoid or end the Charmed condition"
    ],
    "senses": [
      {
        "name": "Darkvision",
        "range": 60
      }
    ],
    "languages": ["Common", "Elvish"],
    "toolProficiencies": ["Herbalism Kit"],
    "inventory": [
      {
        "id": "item-0",
        "name": "Shield",
        "rarity": "Common",
        "category": "Armor",
        "quantity": 1,
        "description": "Shields require the Utilize action to Don or Doff. You gain the Armor Class benefit of a Shield only if you have training with it."
      },
      {
        "id": "item-1",
        "name": "Chain Mail",
        "rarity": "Common",
        "category": "Armor",
        "quantity": 1,
        "description": "Made of interlocking metal rings, chain mail includes a layer of quilted fabric worn underneath the mail to prevent chafing and to cushion the impact of blows. The suit includes gauntlets."
      },
      {
        "id": "item-2",
        "name": "Crossbow, Hand",
        "rarity": "Common",
        "category": "Weapon",
        "quantity": 1,
        "description": "Proficiency with a Hand Crossbow allows you to add your proficiency bonus to the attack roll for any attack you make with it. This weapon has the following mastery property. To use this property, you must have a feature that lets you use it. **Vex.** If you hit a creature with this weapon and deal damage to the creature, you have Advantage on your next attack roll against that creature before the end of your next turn."
      },
      {
        "id": "item-3",
        "name": "Longsword",
        "rarity": "Common",
        "category": "Weapon",
        "quantity": 1,
        "description": "Proficiency with a Longsword allows you to add your proficiency bonus to the attack roll for any attack you make with it. This weapon has the following mastery property. To use this property, you must have a feature that lets you use it. **Sap.** If you hit a creature with this weapon, that creature has Disadvantage on its next attack roll before the start of your next turn."
      },
      {
        "id": "item-4",
        "name": "Greatsword",
        "rarity": "Common",
        "category": "Weapon",
        "quantity": 1,
        "description": "Proficiency with a Greatsword allows you to add your proficiency bonus to the attack roll for any attack you make with it. This weapon has the following mastery property. To use this property, you must have a feature that lets you use it. **Graze.** If your attack roll with this weapon misses a creature, you can deal damage to that creature equal to the ability modifier you used to make the attack roll. This damage is the same type dealt by the weapon, and the damage can be increased only by increasing the ability modifier."
      },
      {
        "id": "item-5",
        "name": "Scimitar",
        "rarity": "Common",
        "category": "Weapon",
        "quantity": 1,
        "description": "Proficiency with a Scimitar allows you to add your proficiency bonus to the attack roll for any attack you make with it. This weapon has the following mastery property. To use this property, you must have a feature that lets you use it. **Nick.** When you make the extra attack of the Light property, you can make it as part of the Attack action instead of as a Bonus Action. You can make this extra attack only once per turn."
      },
      {
        "id": "item-6",
        "name": "Shortsword",
        "rarity": "Common",
        "category": "Weapon",
        "quantity": 1,
        "description": "Proficiency with a Shortsword allows you to add your proficiency bonus to the attack roll for any attack you make with it. This weapon has the following mastery property. To use this property, you must have a feature that lets you use it. **Vex.** If you hit a creature with this weapon and deal damage to the creature, you have Advantage on your next attack roll against that creature before the end of your next turn."
      },
      {
        "id": "item-7",
        "name": "Backpack",
        "rarity": "Common",
        "category": "Gear",
        "quantity": 1,
        "description": "A backpack is a leather pack carried on the back, typically with straps to secure it. A backpack can hold 1 cubic foot/ 30 pounds of gear. You can also strap items, such as a bedroll or a coil of rope, to the outside of a backpack."
      },
      {
        "id": "item-8",
        "name": "Clothes, Common",
        "rarity": "Common",
        "category": "Gear",
        "quantity": 1,
        "description": "This set of clothes could consist of a loose shirt and baggy breeches, or a loose shirt and skirt or overdress. Cloth wrappings are used for shoes."
      },
      {
        "id": "item-9",
        "name": "Component Pouch",
        "rarity": "Common",
        "category": "Gear",
        "quantity": 1,
        "description": "A component pouch is a small, watertight leather belt pouch that has compartments to hold all the material components and other special items you need to cast your spells, except for those components that have a specific cost (as indicated in a spell's description)."
      },
      {
        "id": "item-10",
        "name": "Holy Symbol",
        "rarity": "Common",
        "category": "Gear",
        "quantity": 1,
        "description": "A Holy Symbol takes one of the forms in the Holy Symbol table and is bejeweled or painted to channel divine magic. A Cleric or Paladin can use a Holy Symbol as a Spellcasting Focus. The table indicates whether a Holy Symbol needs to be held, worn, or borne on fabric (such as a tabard or banner) or a Shield. Holy Symbols Symbol Weight Cost Amulet (worn or held) 1 lb. 5 GP Emblem (borne on fabric or a Shield) &mdash; 5 GP Reliquary (held) 2 lb. 5 GP"
      },
      {
        "id": "item-11",
        "name": "Blade of the First Dawn",
        "rarity": "Rare",
        "category": "Weapon",
        "quantity": 1,
        "description": "This item appears to be a sword hilt. **Blade of Radiance.** While grasping the hilt, you can take a Bonus Action to cause a blade of pure radiance to spring into existence or make the blade disappear. While the blade exists, this magic weapon functions as a Shortsword with the Finesse property. If you are proficient with Longswords or Shortswords, you are proficient with the *Sun Blade*. You gain a +2 bonus to attack rolls and damage rolls made with this weapon, which deals Radiant damage instead of Slashing damage. When you hit an Undead with it, that target takes an extra 1d6 Radiant damage. **Sunlight.** The sword’s luminous blade emits Bright Light in a 15-foot radius and Dim Light for an additional 15 feet. The light is sunlight. While the blade persists, you can take a Magic action to expand or reduce its radius of Bright Light and Dim Light by 5 feet each, to a maximum of 30 feet each or a minimum of 10 feet each."
      },
      {
        "id": "item-12",
        "name": "Book",
        "rarity": "Common",
        "category": "Gear",
        "quantity": 1,
        "description": "A book might contain poetry, historical accounts, information pertaining to a particular field of lore, diagrams and notes on gnomish contraptions, or just about anything else that can be represented using text or pictures. A book of spells is a spellbook."
      },
      {
        "id": "item-13",
        "name": "Ink (1 ounce bottle)",
        "rarity": "Common",
        "category": "Gear",
        "quantity": 2,
        "description": "Ink is typically used with an ink pen to write."
      },
      {
        "id": "item-14",
        "name": "Ink Pen",
        "rarity": "Common",
        "category": "Gear",
        "quantity": 1,
        "description": "An ink pen is a wooden stick with a special tip on the end. The tip draws ink in when dipped in a vial and leaves an ink trail when drawn across a surface."
      },
      {
        "id": "item-15",
        "name": "Parchment (one sheet)",
        "rarity": "Common",
        "category": "Gear",
        "quantity": 10,
        "description": "A sheet of parchment is a piece of goat hide or sheepskin that has been prepared for writing on."
      },
      {
        "id": "item-16",
        "name": "Little Bag of Sand",
        "rarity": "Common",
        "category": "Gear",
        "quantity": 1,
        "description": "A small bag of sand, typically found in a scholar's pack."
      },
      {
        "id": "item-17",
        "name": "Small Knife",
        "rarity": "Common",
        "category": "Gear",
        "quantity": 1,
        "description": "A small knife, typically found in a scholar's pack."
      },
      {
        "id": "item-18",
        "name": "Rations",
        "rarity": "Common",
        "category": "Gear",
        "quantity": 7,
        "description": "Rations consist of travel-ready food, including jerky, dried fruit, hardtack, and nuts. See “Malnutrition” for the risks of not eating."
      },
      {
        "id": "item-19",
        "name": "Robe",
        "rarity": "Common",
        "category": "Gear",
        "quantity": 1,
        "description": "A Robe has vocational or ceremonial significance. Some events and locations admit only people wearing a Robe bearing certain colors or symbols."
      },
      {
        "id": "item-20",
        "name": "Bedroll",
        "rarity": "Common",
        "category": "Gear",
        "quantity": 1,
        "description": "A Bedroll sleeps one Small or Medium creature. While in a Bedroll, you automatically succeed on saving throws against extreme cold (see the *Dungeon Master’s Guide*)."
      },
      {
        "id": "item-21",
        "name": "Blanket",
        "rarity": "Common",
        "category": "Gear",
        "quantity": 1,
        "description": "While wrapped in a blanket, you have Advantage on saving throws against extreme cold (see the *Dungeon Master’s Guide*)."
      },
      {
        "id": "item-22",
        "name": "Tinderbox",
        "rarity": "Common",
        "category": "Gear",
        "quantity": 1,
        "description": "A Tinderbox is a small container holding flint, fire steel, and tinder (usually dry cloth soaked in light oil) used to kindle a fire. Using it to light a Candle, Lamp, Lantern, or Torch&mdash;or anything else with exposed fuel&mdash;takes a Bonus Action. Lighting any other fire takes 1 minute."
      },
      {
        "id": "item-23",
        "name": "Lamp",
        "rarity": "Common",
        "category": "Gear",
        "quantity": 1,
        "description": "A Lamp burns Oil as fuel to cast Bright Light in a 15-foot radius and Dim Light for an additional 30 feet."
      },
      {
        "id": "item-24",
        "name": "Holy Water",
        "rarity": "Common",
        "category": "Gear",
        "quantity": 1,
        "description": "When you take the Attack action, you can replace one of your attacks with throwing a flask of Holy Water. Target one creature you can see within 20 feet of yourself. The target must succeed on a Dexterity saving throw (DC 8 plus your Dexterity modifier and Proficiency Bonus) or take 2d8 Radiant damage if it is a Fiend or an Undead."
      }
    ],
    "currency": {
      "cp": 0,
      "sp": 5,
      "ep": 0,
      "gp": 18,
      "pp": 0
    },
    "knownSpells": [
      {
        "id": "spell-0",
        "name": "Thunderous Smite",
        "level": 1,
        "school": "Evocation",
        "description": "Your strike rings with thunder that is audible within 300 feet of you, and the target takes an extra 2d6 Thunder damage from the attack. Additionally, if the target is a creature, it must succeed on a Strength saving throw or be pushed 10 feet away from you and have the Prone condition. **Using a Higher-Level Spell Slot.** The damage increases by 1d6 for each spell slot level above 1.",
        "source": "Class",
        "components": "V"
      },
      {
        "id": "spell-1",
        "name": "Divine Favor",
        "level": 1,
        "school": "Transmutation",
        "description": "Until the spell ends, your attacks with weapons deal an extra 1d4 Radiant damage on a hit.",
        "source": "Class",
        "components": "V, S"
      },
      {
        "id": "spell-2",
        "name": "Bless",
        "level": 1,
        "school": "Enchantment",
        "description": "You bless up to three creatures within range. Whenever a target makes an attack roll or a saving throw before the spell ends, the target adds 1d4 to the attack roll or save. **Using a Higher-Level Spell Slot.** You can target one additional creature for each spell slot level above 1.",
        "source": "Class",
        "components": "V, S, M",
        "materialComponent": "a Holy Symbol worth 5+ GP"
      },
      {
        "id": "spell-3",
        "name": "Command",
        "level": 1,
        "school": "Enchantment",
        "description": "You speak a one-word command to a creature you can see within range. The target must succeed on a Wisdom saving throw or follow the command on its next turn. Choose the command from these options: **Approach.** The target moves toward you by the shortest and most direct route, ending its turn if it moves within 5 feet of you. **Drop.** The target drops whatever it is holding and then ends its turn. **Flee.** The target spends its turn moving away from you by the fastest available means. **Grovel.** The target has the Prone condition and then ends its turn. **Halt.** On its turn, the target doesn’t move and takes no action or Bonus Action. **Using a Higher-Level Spell Slot.** You can affect one additional creature for each spell slot level above 1.",
        "source": "Class",
        "components": "V"
      },
      {
        "id": "spell-4",
        "name": "Find Steed",
        "level": 2,
        "school": "Conjuration",
        "description": "You summon an otherworldly being that appears as a loyal steed in an unoccupied space of your choice within range. This creature uses the **Otherworldly Steed** stat block. If you already have a steed from this spell, the steed is replaced by the new one. The steed resembles a Large, rideable animal of your choice, such as a horse, a camel, a dire wolf, or an elk. Whenever you cast the spell, choose the steed’s creature type&mdash;Celestial, Fey, or Fiend&mdash;which determines certain traits in the stat block. **Combat.** The steed is an ally to you and your allies. In combat, it shares your Initiative count, and it functions as a controlled mount while you ride it (as defined in the rules on mounted combat). If you have the Incapacitated condition, the steed takes its turn immediately after yours and acts independently, focusing on protecting you. **Disappearance of the Steed.** The steed disappears if it drops to 0 Hit Points or if you die. When it disappears, it leaves behind anything it was wearing or carrying. If you cast this spell again, you decide whether you summon the steed that disappeared or a different one. **Using a Higher-Level Spell Slot.** Use the spell slot’s level for the spell’s level in the stat block. Otherworldly Steed Large Celestial, Fey, or Fiend (Your Choice), Neutral **AC** 10 + 1 per spell level **HP** 5 + 10 per spell level (the steed has a number of Hit Dice [d10s] equal to the spell’s level) **Speed** 60 ft., Fly 60 ft. (requires level 4+ spell) Mod Save STR 18 +4 +4 DEX 12 +1 +1 CON 14 +2 +2 Mod Save INT 6 &minus;2 &minus;2 WIS 12 +1 +1 CHA 8 &minus;1 &minus;1 **Senses** Passive Perception 11 **Languages** Telepathy 1 mile (works only with you) **CR** None (XP 0; PB equals your Proficiency Bonus) Traits **Life Bond.** When you regain Hit Points from a level 1+ spell, the steed regains the same number of Hit Points if you’re within 5 feet of it. Actions **Otherworldly Slam.** *Melee Attack Roll:* Bonus equals your spell attack modifier, reach 5 ft. *Hit:* 1d8 plus the spell’s level of Radiant (Celestial), Psychic (Fey), or Necrotic (Fiend) damage. Bonus Actions **Fell Glare (Fiend Only; Recharges after a Long Rest).** *Wisdom Saving Throw:* DC equals your spell save DC, one creature within 60 feet the steed can see. *Failure:* The target has the Frightened condition until the end of your next turn. **Fey Step (Fey Only; Recharges after a Long Rest).** The steed teleports, along with its rider, to an unoccupied space of your choice up to 60 feet away from itself. **Healing Touch (Celestial Only; Recharges after a Long Rest).** One creature within 5 feet of the steed regains a number of Hit Points equal to 2d8 plus the spell’s level.",
        "source": "Class",
        "components": "V, S",
        "current": 0,
        "max": 1,
        "recovery": "long-rest"
      },
      {
        "id": "spell-5",
        "name": "Aid",
        "level": 2,
        "school": "Abjuration",
        "description": "Choose up to three creatures within range. Each target’s Hit Point maximum and current Hit Points increase by 5 for the duration. **Using a Higher-Level Spell Slot.** Each target’s Hit Points increase by 5 for each spell slot level above 2.",
        "source": "Class",
        "components": "V, S, M",
        "materialComponent": "a strip of white cloth"
      },
      {
        "id": "spell-6",
        "name": "Dancing Lights",
        "level": 0,
        "school": "Illusion",
        "description": "You create up to four torch-size lights within range, making them appear as torches, lanterns, or glowing orbs that hover for the duration. Alternatively, you combine the four lights into one glowing Medium form that is vaguely humanlike. Whichever form you choose, each light sheds Dim Light in a 10-foot radius. As a Bonus Action, you can move the lights up to 60 feet to a space within range. A light must be within 20 feet of another light created by this spell, and a light vanishes if it exceeds the spell’s range.",
        "source": "Race",
        "components": "V, S, M",
        "materialComponent": "a bit of phosphorus"
      },
      {
        "id": "spell-7",
        "name": "Faerie Fire",
        "level": 1,
        "school": "Evocation",
        "description": "Objects in a 20-foot Cube within range are outlined in blue, green, or violet light (your choice). Each creature in the Cube is also outlined if it fails a Dexterity saving throw. For the duration, objects and affected creatures shed Dim Light in a 10-foot radius and can’t benefit from the Invisible condition. Attack rolls against an affected creature or object have Advantage if the attacker can see it.",
        "source": "Race",
        "components": "V",
        "current": 1,
        "max": 1,
        "recovery": "long-rest"
      },
      {
        "id": "spell-8",
        "name": "Darkness",
        "level": 2,
        "school": "Evocation",
        "description": "For the duration, magical Darkness spreads from a point within range and fills a 15-foot-radius Sphere. Darkvision can’t see through it, and nonmagical light can’t illuminate it. Alternatively, you cast the spell on an object that isn’t being worn or carried, causing the Darkness to fill a 15-foot Emanation originating from that object. Covering that object with something opaque, such as a bowl or helm, blocks the Darkness. If any of this spell’s area overlaps with an area of Bright Light or Dim Light created by a spell of level 2 or lower, that other spell is dispelled.",
        "source": "Race",
        "components": "V, M",
        "materialComponent": "bat fur and a piece of coal",
        "current": 0,
        "max": 1,
        "recovery": "long-rest"
      },
      {
        "id": "spell-9",
        "name": "Divine Smite",
        "level": 1,
        "school": "Evocation",
        "description": "The target takes an extra 2d8 Radiant damage from the attack. The damage increases by 1d8 if the target is a Fiend or an Undead. **Using a Higher-Level Spell Slot.** The damage increases by 1d8 for each spell slot level above 1.",
        "source": "Class",
        "components": "V",
        "current": 0,
        "max": 1,
        "recovery": "long-rest"
      },
      {
        "id": "spell-10",
        "name": "Guiding Bolt",
        "level": 1,
        "school": "Evocation",
        "description": "You hurl a bolt of light toward a creature within range. Make a ranged spell attack against the target. On a hit, it takes 4d6 Radiant damage, and the next attack roll made against it before the end of your next turn has Advantage. **Using a Higher-Level Spell Slot.** The damage increases by 1d6 for each spell slot level above 1.",
        "source": "Class",
        "components": "V, S"
      },
      {
        "id": "spell-11",
        "name": "Heroism",
        "level": 1,
        "school": "Enchantment",
        "description": "A willing creature you touch is imbued with bravery. Until the spell ends, the creature is immune to the Frightened condition and gains Temporary Hit Points equal to your spellcasting ability modifier at the start of each of its turns. **Using a Higher-Level Spell Slot.** You can target one additional creature for each spell slot level above 1.",
        "source": "Class",
        "components": "V, S"
      },
      {
        "id": "spell-12",
        "name": "Enhance Ability",
        "level": 2,
        "school": "Transmutation",
        "description": "You touch a creature and choose Strength, Dexterity, Intelligence, Wisdom, or Charisma. For the duration, the target has Advantage on ability checks using the chosen ability. **Using a Higher-Level Spell Slot.** You can target one additional creature for each spell slot level above 2. You can choose a different ability for each target.",
        "source": "Class",
        "components": "V, S, M",
        "materialComponent": "fur or a feather"
      },
      {
        "id": "spell-13",
        "name": "Magic Weapon",
        "level": 2,
        "school": "Transmutation",
        "description": "You touch a nonmagical weapon. Until the spell ends, that weapon becomes a magic weapon with a +1 bonus to attack rolls and damage rolls. The spell ends early if you cast it again. **Using a Higher-Level Spell Slot.** The bonus increases to +2 with a level 3&ndash;5 spell slot. The bonus increases to +3 with a level 6+ spell slot.",
        "source": "Class",
        "components": "V, S"
      }
    ],
    "features": [
      {
        "id": "feature-0",
        "name": "Lay On Hands: Healing Pool",
        "source": "Lay On Hands",
        "group": "bonusAction",
        "originType": "class",
        "description": "You have a pool of healing power that replenishes when you finish a Long Rest. With that pool, you can restore a total of 25 HP.",
        "current": 10,
        "max": 25,
        "recovery": "long-rest"
      },
      {
        "id": "feature-1",
        "name": "Lay On Hands: Heal",
        "source": "Lay On Hands",
        "group": "bonusAction",
        "originType": "class",
        "description": "As a Bonus Action, you can touch a creature (which could be yourself) and restore a number HP to that creature, up to the maximum amount remaining in the pool."
      },
      {
        "id": "feature-2",
        "name": "Lay On Hands: Purify Poison",
        "source": "Lay On Hands",
        "group": "bonusAction",
        "originType": "class",
        "description": "You can expend 5 HP from the pool of healing to remove the Poisoned condition from the creature; those points don’t also restore HP to the creature."
      },
      {
        "id": "feature-3",
        "name": "Channel Divinity: Divine Sense",
        "source": "Channel Divinity",
        "group": "bonusAction",
        "originType": "class",
        "description": "For the next 10 min. or until you have the Incapacitated condition, you know the location of any Celestials, Fiends, and Undead within 60 ft., and you know its creature type. In the same radius, you also detect the presence of any place/object that has been consecrated or desecrated, as with the *Hallow* spell."
      },
      {
        "id": "feature-4",
        "name": "Channel Divinity",
        "source": "Channel Divinity",
        "group": "action",
        "originType": "class",
        "description": "You can channel energy directly from the Outer Planes to fuel magical effects. Each time you use this class’s Channel Divinity, you can choose which effect to create. You can use this class’s Channel Divinity 2 times per Long Rest, but can regain one expended use after finishing a Short Rest. If your Channel Divinity requires a saving throw, the DC equals your Paladin spell save DC (DC 14).",
        "current": 1,
        "max": 2,
        "recovery": "long-rest"
      },
      {
        "id": "feature-5",
        "name": "Inspiring Smite",
        "source": "Inspiring Smite",
        "group": "special",
        "originType": "class",
        "description": "Immediately after you cast Divine Smite, you can expend one use of Channel Divinity and distribute **2d8**+5 Temporary HP to creatures of your choice within 30 ft., including yourself."
      },
      {
        "id": "feature-6",
        "name": "Initiate a Circle Spell",
        "source": "Class",
        "group": "action",
        "originType": "class",
        "description": "You take a Magic action to initiate casting a Circle spell. When you do so, choose which Circle casting option you’re using for this casting; you must also meet any of the other requirements described in that option’s text. Until the Circle spell’s casting is complete, you must maintain Concentration on the spell."
      },
      {
        "id": "feature-7",
        "name": "Circle Spell: Augment",
        "source": "Class",
        "group": "special",
        "originType": "class",
        "description": "When you cast a spell with a range of at least 5 ft., you can increase the range of the spell by 1,000 ft. per secondary caster contributing to the spell, up to a max of a 1-mile increase."
      },
      {
        "id": "feature-8",
        "name": "Circle Spell: Distribute",
        "source": "Class",
        "group": "special",
        "originType": "class",
        "description": "When you cast a spell that requires Concentration, you can distribute the mental load of the spell among you and the secondary casters. Once the casting is complete, you and all secondary casters can maintain Concentration on this spell. As long as at least one caster who contributed to the spell maintains this Concentration, the spell’s effects remain active."
      },
      {
        "id": "feature-9",
        "name": "Circle Spell: Expand",
        "source": "Class",
        "group": "special",
        "originType": "class",
        "description": "When you cast a spell that creates an area of effect, you can increase one dimension of the spell’s area of effect for this casting by 10 ft. per secondary caster contributing to the spell. Each secondary caster contributing to the spell must expend a spell slot (no action required). If the spell fails, these spell slots aren’t expended."
      },
      {
        "id": "feature-10",
        "name": "Circle Spell: Prolong",
        "source": "Class",
        "group": "special",
        "originType": "class",
        "description": "When you cast a spell that has a duration of 1 min or longer, you can increase the duration of the spell depending on the number of secondary casters contributing to the spell. Each secondary caster contributing to the spell must expend a spell slot (no action required). If the spell fails, these spell slots aren’t expended."
      },
      {
        "id": "feature-11",
        "name": "Circle Spell: Safeguard",
        "source": "Class",
        "group": "special",
        "originType": "class",
        "description": "When you cast a spell that creates an area of effect, you can carve out a safe zone within that area of effect that is unaffected by the spell for its duration. This safe zone consists of a number of 5-ft. Cubes equal to **3 + the number of secondary casters** contributing to the spell (min of 1 Cube). You can arrange the Cubes as you like, but each Cube must be contiguous with at least one other Cube. If the spell’s area of effect can be moved, the safe zone moves with it."
      },
      {
        "id": "feature-12",
        "name": "Circle Spell: Supplant",
        "source": "Class",
        "group": "special",
        "originType": "class",
        "description": "When you cast a spell that requires at least one Material component with a specified cost that is consumed by the spell, you can reduce the min cost of one such Material component by 50 GP per each secondary caster contributing to the spell. Each secondary caster contributing to the spell must expend a spell slot of a level greater than or equal to the spell’s level (no action required). If the spell fails, these spell slots aren’t expended."
      },
      {
        "id": "feature-13",
        "name": "Luck Points",
        "source": "Lucky",
        "group": "special",
        "originType": "background",
        "description": "You have 3 Luck Points that you can spend on the benefits below. You regain expended Luck Points after a Long Rest. **Advantage.** When you roll a d20 for a D20 Test, you can spend 1 Luck Point to give yourself Advantage on the roll. **Disadvantage.** When a creature rolls a d20 for an attack roll against you, you can spend 1 Luck Point to impose Disadvantage on that roll.",
        "current": 3,
        "max": 3,
        "recovery": "long-rest"
      },
      {
        "id": "feature-14",
        "name": "Bolstering Performance",
        "source": "Inspiring Leader",
        "group": "action",
        "originType": "feat",
        "description": "After a Short or Long Rest, give a performance. When you do, up to six allies (which can include yourself) within 30 ft. of yourself gain 6 Temporary HP."
      },
      {
        "id": "feature-15",
        "name": "Vex (Shortsword)",
        "source": "Weapon Mastery",
        "group": "action",
        "originType": "class",
        "description": "**Vex.** If you hit a creature with a Shortsword and deal damage to it, you have Advantage on your next attack roll against that creature before the end of your next turn."
      },
      {
        "id": "feature-16",
        "name": "Nick (Scimitar)",
        "source": "Weapon Mastery",
        "group": "action",
        "originType": "class",
        "description": "**Nick.** When you make the extra attack of the Light property, you can make it as part of the Attack action instead of as a Bonus Action. This extra attack can only be made once per turn."
      },
      {
        "id": "feature-17",
        "name": "Creature Type",
        "source": "Race",
        "group": "other",
        "originType": "species",
        "description": "You are a Humanoid."
      },
      {
        "id": "feature-18",
        "name": "Size",
        "source": "Race",
        "group": "other",
        "originType": "species",
        "description": "You are Medium."
      },
      {
        "id": "feature-19",
        "name": "Speed",
        "source": "Race",
        "group": "other",
        "originType": "species",
        "description": "Your speed is 30 ft."
      },
      {
        "id": "feature-20",
        "name": "Darkvision",
        "source": "Race",
        "group": "other",
        "originType": "species",
        "description": "You have Darkvision with a range of 60 ft."
      },
      {
        "id": "feature-21",
        "name": "Elven Lineage",
        "source": "Race",
        "group": "other",
        "originType": "species",
        "description": "Choose a lineage from the Elven Lineages table. You gain the level 1 benefit of that lineage."
      },
      {
        "id": "feature-22",
        "name": "Fey Ancestry",
        "source": "Race",
        "group": "other",
        "originType": "species",
        "description": "You have Advantage on saving throws you make to avoid or end the Charmed condition."
      },
      {
        "id": "feature-23",
        "name": "Keen Senses",
        "source": "Race",
        "group": "other",
        "originType": "species",
        "description": "You have proficiency in the Insight, Perception, or Survival skill."
      },
      {
        "id": "feature-24",
        "name": "Trance",
        "source": "Race",
        "group": "other",
        "originType": "species",
        "description": "You don’t need to sleep, and magic can’t put you to sleep. You can finish a Long Rest in 4 hours if you spend those hours in a trancelike meditation, during which you retain consciousness."
      },
      {
        "id": "feature-25",
        "name": "Elven Lineage Spells",
        "source": "Race",
        "group": "other",
        "originType": "species",
        "description": "When you choose your Elven Lineage, and at character levels 3 and 5, you learn a spell as shown on the table. You always have that spell prepared. You can cast it once without a spell slot, and you regain the ability to cast it in that way when you finish a Long Rest. You can also cast the spell using any spell slots you have of the appropriate level. Intelligence, Wisdom, or Charisma is your spellcasting ability for the spells you cast with this trait (choose the ability when you select the lineage)."
      },
      {
        "id": "feature-26",
        "name": "Ability Score Increases",
        "source": "Race",
        "group": "other",
        "originType": "species",
        "description": "When determining your character’s ability scores, increase one score by 2 and a different one by 1, or increase three scores by 1."
      },
      {
        "id": "feature-27",
        "name": "Oath of Glory Spells",
        "source": "Oath of Glory",
        "group": "other",
        "originType": "class",
        "description": "When you reach a Paladin level specified in the Oath of Glory Spells table, you thereafter always have the listed spells prepared."
      },
      {
        "id": "feature-28",
        "name": "Peerless Athlete",
        "source": "Oath of Glory",
        "group": "other",
        "originType": "class",
        "description": "As a Bonus Action, you can expend one use of Channel Divinity to augment your athleticism. For 1 hour, you have Advantage on Strength (Athletics) and Dexterity (Acrobatics) checks, and the distance of your Long and High Jumps increases by 10 ft. (this extra distance costs movement as normal)."
      },
      {
        "id": "feature-29",
        "name": "Core Paladin Traits",
        "source": "Paladin",
        "group": "other",
        "originType": "class",
        "description": "As a Level 1 Character: Gain all the traits in the Core Paladin Traits table. Gain the Paladin’s level 1 features, which are listed in the Paladin Features table. Core Paladin Traits Primary Ability Strength and Charisma Hit Point Die D10 per Paladin level Saving Throw Proficiencies Wisdom and Charisma Skill Proficiencies *Choose 2:* Athletics, Insight, Intimidation, Medicine, Persuasion, or Religion Weapon Proficiencies Simple and Martial weapons Armor Training Light, Medium, and Heavy armor and Shields Starting Equipment *Choose A or B:* (A) Chain Mail, Shield, Longsword, 6 Javelins, Holy Symbol, Priest’s Pack, and 9 GP; or (B) 150 GP"
      },
      {
        "id": "feature-30",
        "name": "Lay On Hands",
        "source": "Paladin",
        "group": "other",
        "originType": "class",
        "description": "You have a pool of healing power that replenishes when you finish a Long Rest. With that pool, you can restore a total of 25 HP. As a Bonus Action, you can touch a creature (which could be yourself) and restore a number HP to that creature, up to the maximum amount remaining in the pool. You can also expend 5 HP from the pool of healing to remove the Poisoned condition from the creature; those points don’t also restore HP to the creature.",
        "current": 10,
        "max": 25,
        "recovery": "long-rest"
      },
      {
        "id": "feature-31",
        "name": "Spellcasting",
        "source": "Paladin",
        "group": "other",
        "originType": "class",
        "description": "You have learned to cast spells through prayer and meditation. **Spell Slots.** The Paladin Features table shows how many spell slots you have to cast your level 1+ spells. You regain all expended slots when you finish a Long Rest. **Prepared Spells of Level 1+**. You prepare the list of level 1+ spells that are available for you to cast with this feature. To start, choose two level 1 Paladin spells. The number of spells on your list increases as you gain Paladin levels, as shown in the Prepared Spells column of the Paladin Features table. Whenever that number increases, choose additional Paladin spells until the number of spells on your list matches the number in the Paladin Features table. The chosen spells must be of a level for which you have spell slots. For example, if you’re a level 5 Paladin, your list of prepared spells can include six Paladin spells of level 1 or 2 in any combination. If another Paladin feature gives you spells that you always have prepared, those spells don’t count against the number of spells you can prepare with this feature, but those spells otherwise count as Paladin spells for you. **Changing Your Prepared Spells.** Whenever you finish a Long Rest, you can replace one spell on your list with another Paladin spell for which you have spell slots. **Spellcasting Ability.** Charisma is your spellcasting ability for your Paladin spells. **Spellcasting Focus.** You can use a Holy Symbol as a Spellcasting Focus for your Paladin spells."
      },
      {
        "id": "feature-32",
        "name": "Weapon Mastery",
        "source": "Paladin",
        "group": "other",
        "originType": "class",
        "description": "Your training with weapons allows you to use the mastery properties of two kinds of weapons of your choice with which you have proficiency, such as Longswords and Javelins. Whenever you finish a Long Rest, you can change the kinds of weapons you chose. For example, you could switch to using the mastery properties of Halberds and Flails."
      },
      {
        "id": "feature-33",
        "name": "Fighting Style",
        "source": "Paladin",
        "group": "other",
        "originType": "class",
        "description": "You gain a Fighting Style feat of your choice. Instead of choosing one of those feats, you can choose the option below."
      },
      {
        "id": "feature-34",
        "name": "Paladin’s Smite",
        "source": "Paladin",
        "group": "other",
        "originType": "class",
        "description": "You always have *Divine Smite* prepared and cast it without expending a spell slot once per Long Rest."
      },
      {
        "id": "feature-35",
        "name": "Paladin Subclass",
        "source": "Paladin",
        "group": "other",
        "originType": "class",
        "description": "You gain a Paladin subclass of your choice. A subclass is a specialization that grants you features at certain Paladin levels. For the rest of your career, you gain each of your subclass’s features that are of your Paladin level or lower."
      },
      {
        "id": "feature-36",
        "name": "Ability Score Improvement",
        "source": "Paladin",
        "group": "other",
        "originType": "class",
        "description": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify. You gain this feature again at Paladin levels 8, 12, and 16."
      },
      {
        "id": "feature-37",
        "name": "Extra Attack",
        "source": "Paladin",
        "group": "other",
        "originType": "class",
        "description": "You can attack twice instead of once whenever you take the Attack action on your turn."
      },
      {
        "id": "feature-38",
        "name": "Faithful Steed",
        "source": "Paladin",
        "group": "other",
        "originType": "class",
        "description": "You always have *Find Steed* prepared, and can cast it once per Long Rest without expending a spell slot."
      },
      {
        "id": "feature-39",
        "name": "Inspiring Leader",
        "source": "Feat",
        "group": "other",
        "originType": "feat",
        "description": "**Ability Score Increase.** Wisdom or Charisma increased by 1. ** Bolstering Performance.** After a Short or Long Rest, give a performance. When you do, up to six allies (which can include yourself) within 30 ft. of yourself gain Temporary HP equal to your character level plus the modifier of the ability you increased with this feat."
      },
      {
        "id": "feature-40",
        "name": "Lucky",
        "source": "Feat",
        "group": "other",
        "originType": "feat",
        "description": "**Luck Points.** You have 3 Luck Points that you can spend on the benefits below. You regain expended Luck Points after a Long Rest. **Advantage.** When you roll a d20 for a D20 Test, you can spend 1 Luck Point to give yourself Advantage on the roll. **Disadvantage.** When a creature rolls a d20 for an attack roll against you, you can spend 1 Luck Point to impose Disadvantage on that roll.",
        "current": 3,
        "max": 3,
        "recovery": "long-rest"
      },
      {
        "id": "feature-41",
        "name": "Two-Weapon Fighting",
        "source": "Feat",
        "group": "other",
        "originType": "feat",
        "description": "When you make an extra attack as a result of using a weapon that has the Light property, you can add your ability modifier to the damage of that attack if you aren’t already adding it to the damage."
      },
      {
        "id": "feature-42",
        "name": "Wayfarer Ability Score Improvements",
        "source": "Feat",
        "group": "other",
        "originType": "feat",
        "description": "The Wayfarer Background allows you to choose between Dexterity, Wisdom, and Charisma. Increase one of these scores by 2 and another one by 1, or increase all three by 1. None of these increases can raise a score above 20."
      },
      {
        "id": "feature-43",
        "name": "Drow Lineage",
        "source": "Elven Lineage",
        "group": "other",
        "originType": "species",
        "description": "The range of your Darkvision increases to 120 ft. and you gain the spells outlined in the Elven Lineages table."
      },
      {
        "id": "feature-44",
        "name": "Drow Lineage - Charisma",
        "source": "Elven Lineage Spells",
        "group": "other",
        "originType": "species",
        "description": "Your Drow Lineage spells use Charisma."
      },
      {
        "id": "feature-45",
        "name": "Fighting Style feat",
        "source": "Fighting Style",
        "group": "other",
        "originType": "class",
        "description": "You gain a Fighting Style feat of your choice."
      },
      {
        "id": "feature-46",
        "name": "Wisdom",
        "source": "Inspiring Leader",
        "group": "other",
        "originType": "feat",
        "description": "Wisdom is your ability score increased by this feat and used in Bolstering Performance."
      },
      {
        "id": "feature-47",
        "name": "Increase two scores (+2 / +1)",
        "source": "Lucky",
        "group": "other",
        "originType": "background",
        "description": "Increase one of these scores by 2 and a different score by 1."
      }
    ],
    "attacks": [
      {
        "id": "attack-unarmed",
        "name": "Unarmed Strike",
        "attackType": "melee",
        "attackBonus": 4,
        "damage": "2",
        "damageType": "Bludgeoning",
        "properties": [],
        "range": "5 ft.",
        "proficient": true
      }
    ],
    "notes": "An Oath of Glory paladin chasing legendary deeds — Inspiring Smite and Peerless Athlete reward big, showy moments. Scenes with an audience, a rival to outshine, or a feat of athletics/glory work well for her.",
    "quickNotes": [
      {
        "id": "qn-lilith-1",
        "text": "Recognized the crest on the assassin's dagger",
        "createdAt": "2026-07-05T10:00:00.000Z"
      }
    ],
    "subclass": "Oath of Glory",
    "spellcasting": {
      "modifier": 3,
      "attack": 6,
      "saveDc": 14
    },
    "avatarUrl": "https://www.dndbeyond.com/avatars/56275/822/1581111423-139992128.jpeg?width=150&height=150&fit=crop&quality=95&auto=webp",
    "synced": false
  },
  {
    "id": "demo-yorun",
    "campaignId": "demo-campaign",
    "name": "Yorun (Runa) Dabrace",
    "race": "Elf",
    "className": "Sorcerer",
    "level": 5,
    "role": "Blaster / battlefield control",
    "heroicInspiration": true,
    "initiative": 1,
    "combat": {
      "hp": 30,
      "maxHp": 32,
      "tempHp": 0,
      "ac": 14,
      "speed": 30,
      "passivePerception": 10,
      "passiveInvestigation": 12,
      "passiveInsight": 10,
      "conditions": [],
      "exhaustion": 3
    },
    "stats": {
      "str": 8,
      "dex": 12,
      "con": 14,
      "int": 15,
      "wis": 10,
      "cha": 17
    },
    "resources": [
      {
        "id": "action-class-0",
        "name": "Innate Sorcery",
        "current": 1,
        "max": 2,
        "recovery": "long-rest",
        "source": "Class",
        "description": "Twice per Long Rest, you can take a Bonus Action to unleash the simmering magic within you for 1 minute."
      },
      {
        "id": "action-class-1",
        "name": "Font of Magic: Sorcery Points",
        "current": 4,
        "max": 5,
        "recovery": "long-rest",
        "source": "Class",
        "description": "You can tap into the wellspring of magic within yourself, which is represented by Sorcery Points (SP). Sorcery Points fuel various magical effects. You have 5 SP and regain all expended points when you finish a Long Rest."
      },
      {
        "id": "action-class-6",
        "name": "Sorcerous Restoration",
        "current": 0,
        "max": 1,
        "recovery": "long-rest",
        "source": "Class",
        "description": "When you finish a Short Rest, you can regain up to 2 Sorcery Points. Once used, you can’t use this feature again until you finish a Long Rest."
      },
      {
        "id": "item-0",
        "name": "Ferol’s Staff of Acid",
        "current": 6,
        "max": 6,
        "recovery": "manual",
        "source": "Item",
        "description": "Description:** This staff, crafted from porous, strange wood, is topped with a glass vial where a green fluid perpetually churns. The staff has 6 charges and regains 1d6 expended charges daily at dawn. Spells.** You can expend 1 charge to cast Melf's Acid Arrow as a 3rd-level spell from the staff (using your **spell attack bonus or +7**, whichever is higher). Corrosive Reagents.** The acid produced by this staff is exceptionally potent. When you hit a creature with an attack roll using this staff, the acid not only deals damage but also temporarily degrades the target's defenses. The target suffers a -1 penalty to its Armor Class** until the start of your next turn. Volatile Core.** The alchemical mixture inside is unstable. If you roll a 1 on the d20 for a spell attack roll with this staff, the staff leaks hazardous fluids, and you take **2**d4 acid damage**. Fragile Magic.** If you expend the last charge, roll a d20. On a 1, the glass vial shatters, the fluid evaporates, and the staff becomes a nonmagical quarterstaff."
      }
    ],
    "spellSlots": [
      {
        "level": 1,
        "current": 3,
        "max": 4
      },
      {
        "level": 2,
        "current": 2,
        "max": 3
      },
      {
        "level": 3,
        "current": 1,
        "max": 2
      }
    ],
    "savingThrowProficiencies": [
      "con",
      "cha"
    ],
    "skillProficiencies": [
      {
        "name": "arcana",
        "proficient": true,
        "expertise": false
      },
      {
        "name": "deception",
        "proficient": true,
        "expertise": false
      },
      {
        "name": "history",
        "proficient": true,
        "expertise": false
      },
      {
        "name": "insight",
        "proficient": true,
        "expertise": false
      },
      {
        "name": "intimidation",
        "proficient": true,
        "expertise": false
      },
      {
        "name": "investigation",
        "proficient": true,
        "expertise": false
      },
      {
        "name": "medicine",
        "proficient": true,
        "expertise": false
      },
      {
        "name": "persuasion",
        "proficient": true,
        "expertise": false
      }
    ],
    "resistances": [],
    "immunities": [
      "Magical Sleep"
    ],
    "vulnerabilities": [],
    "advantages": [
      "Advantage: Saving Throws — Made to avoid or end the Charmed condition",
      "Advantage: Constitution Saving Throws — saving throws that you make to maintain Concentration."
    ],
    "senses": [
      {
        "name": "Darkvision",
        "range": 60
      }
    ],
    "languages": ["Common", "Elvish", "Draconic"],
    "toolProficiencies": [],
    "inventory": [
      {
        "id": "item-0",
        "name": "Ferol’s Staff of Acid",
        "rarity": "Rare",
        "category": "Magic Item",
        "quantity": 1,
        "description": "Description:** This staff, crafted from porous, strange wood, is topped with a glass vial where a green fluid perpetually churns. The staff has 6 charges and regains 1d6 expended charges daily at dawn. Spells.** You can expend 1 charge to cast Melf's Acid Arrow as a 3rd-level spell from the staff (using your **spell attack bonus or +7**, whichever is higher). Corrosive Reagents.** The acid produced by this staff is exceptionally potent. When you hit a creature with an attack roll using this staff, the acid not only deals damage but also temporarily degrades the target's defenses. The target suffers a -1 penalty to its Armor Class** until the start of your next turn. Volatile Core.** The alchemical mixture inside is unstable. If you roll a 1 on the d20 for a spell attack roll with this staff, the staff leaks hazardous fluids, and you take **2**d4 acid damage**. Fragile Magic.** If you expend the last charge, roll a d20. On a 1, the glass vial shatters, the fluid evaporates, and the staff becomes a nonmagical quarterstaff."
      },
      {
        "id": "item-1",
        "name": "Dagger",
        "rarity": "Common",
        "category": "Weapon",
        "quantity": 1,
        "description": "Proficiency with a Dagger allows you to add your proficiency bonus to the attack roll for any attack you make with it. This weapon has the following mastery property. To use this property, you must have a feature that lets you use it. **Nick.** When you make the extra attack of the Light property, you can make it as part of the Attack action instead of as a Bonus Action. You can make this extra attack only once per turn."
      },
      {
        "id": "item-2",
        "name": "Dagger",
        "rarity": "Common",
        "category": "Weapon",
        "quantity": 1,
        "description": "Proficiency with a Dagger allows you to add your proficiency bonus to the attack roll for any attack you make with it. This weapon has the following mastery property. To use this property, you must have a feature that lets you use it. **Nick.** When you make the extra attack of the Light property, you can make it as part of the Attack action instead of as a Bonus Action. You can make this extra attack only once per turn."
      },
      {
        "id": "item-3",
        "name": "Quarterstaff",
        "rarity": "Common",
        "category": "Weapon",
        "quantity": 1,
        "description": "Proficiency with a Quarterstaff allows you to add your proficiency bonus to the attack roll for any attack you make with it. This weapon has the following mastery property. To use this property, you must have a feature that lets you use it. **Topple.** If you hit a creature with this weapon, you can force the creature to make a Constitution saving throw (DC 8 plus the ability modifier used to make the attack roll and your Proficiency Bonus). On a failed save, the creature has the Prone condition."
      },
      {
        "id": "item-4",
        "name": "Spellbook",
        "rarity": "Common",
        "category": "Gear",
        "quantity": 1,
        "description": "Essential for wizards, a spellbook is a leather-bound tome with 100 blank vellum pages suitable for recording spells."
      },
      {
        "id": "item-5",
        "name": "Backpack",
        "rarity": "Common",
        "category": "Gear",
        "quantity": 1,
        "description": "A Backpack holds up to 30 pounds within 1 cubic foot. It can also serve as a saddlebag."
      },
      {
        "id": "item-6",
        "name": "Robe",
        "rarity": "Common",
        "category": "Gear",
        "quantity": 1,
        "description": "A Robe has vocational or ceremonial significance. Some events and locations admit only people wearing a Robe bearing certain colors or symbols."
      },
      {
        "id": "item-7",
        "name": "Enspelled Staff",
        "rarity": "Varies",
        "category": "Magic Item",
        "quantity": 1,
        "description": "Bound into this staff is a spell of level 8 or lower. The spell is determined when the staff is created and can be of any school of magic. The staff has 6 charges and regains 1d6 expended charges daily at dawn. While holding the staff, you can expend 1 charge to cast its spell. If you expend the staff ’s last charge, roll 1d20. On a 1, the staff loses its properties and becomes a nonmagical Quarterstaff. The level of the spell bound into the staff determines the spell’s saving throw DC and attack bonus, as well as the staff’s rarity, as shown in the following table. Spell Level Rarity Save DC Attack Bonus Cantrip Uncommon 13 +5 1 Uncommon 13 +5 2 Rare 13 +5 3 Rare 15 +7 4 Very Rare 15 +7 5 Very Rare 17 +9 6 Legendary 17 +9 7 Legendary 18 +10 8 Legendary 18 +10"
      },
      {
        "id": "item-8",
        "name": "Oil",
        "rarity": "Common",
        "category": "Gear",
        "quantity": 10,
        "description": "You can douse a creature, object, or space with Oil or use it as fuel, as detailed below. **Dousing a Creature or an Object.** When you take the Attack action, you can replace one of your attacks with throwing an Oil flask. Target one creature or object within 20 feet of yourself. The target must succeed on a Dexterity saving throw (DC 8 plus your Dexterity modifier and Proficiency Bonus) or be covered in oil. If the target takes Fire damage before the oil dries (after 1 minute), the target takes an extra 5 Fire damage from burning oil. **Dousing a Space.** You can take the Utilize action to pour an Oil flask on level ground to cover a 5-foot-square area within 5 feet of yourself. If lit, the oil burns until the end of the turn 2 rounds from when the oil was lit (or 12 seconds) and deals 5 Fire damage to any creature that enters the area or ends its turn there. A creature can take this damage only once per turn. **Fuel.** Oil serves as fuel for Lamps and Lanterns. Once lit, a flask of Oil burns for 6 hours in a Lamp or Lantern. That duration doesn’t need to be consecutive; you can extinguish the burning Oil (as a Utilize action) and rekindle it again until it has burned for a total of 6 hours."
      },
      {
        "id": "item-9",
        "name": "Parchment",
        "rarity": "Common",
        "category": "Gear",
        "quantity": 10,
        "description": "One sheet of Parchment can hold about 250 handwritten words."
      },
      {
        "id": "item-10",
        "name": "Tinderbox",
        "rarity": "Common",
        "category": "Gear",
        "quantity": 1,
        "description": "A Tinderbox is a small container holding flint, fire steel, and tinder (usually dry cloth soaked in light oil) used to kindle a fire. Using it to light a Candle, Lamp, Lantern, or Torch&mdash;or anything else with exposed fuel&mdash;takes a Bonus Action. Lighting any other fire takes 1 minute."
      },
      {
        "id": "item-11",
        "name": "Book",
        "rarity": "Common",
        "category": "Gear",
        "quantity": 1,
        "description": "A Book contains fiction or nonfiction. If you consult an accurate nonfiction Book about its topic, you gain a +5 bonus to Intelligence (Arcana, History, Nature, or Religion) checks you make about that topic."
      },
      {
        "id": "item-12",
        "name": "Lamp",
        "rarity": "Common",
        "category": "Gear",
        "quantity": 1,
        "description": "A Lamp burns Oil as fuel to cast Bright Light in a 15-foot radius and Dim Light for an additional 30 feet."
      },
      {
        "id": "item-13",
        "name": "Ink Pen",
        "rarity": "Common",
        "category": "Gear",
        "quantity": 1,
        "description": "Using Ink, an Ink Pen is used to write or draw."
      },
      {
        "id": "item-14",
        "name": "Ink",
        "rarity": "Common",
        "category": "Gear",
        "quantity": 1,
        "description": "Ink comes in a 1-ounce bottle, which provides enough ink to write about 500 pages."
      }
    ],
    "currency": {
      "cp": 0,
      "sp": 0,
      "ep": 0,
      "gp": 5,
      "pp": 0
    },
    "knownSpells": [
      {
        "id": "spell-0",
        "name": "Fire Bolt",
        "level": 0,
        "school": "Evocation",
        "description": "You hurl a mote of fire at a creature or an object within range. Make a ranged spell attack against the target. On a hit, the target takes 1d10 Fire damage. A flammable object hit by this spell starts burning if it isn’t being worn or carried. **Cantrip Upgrade.** The damage increases by 1d10 when you reach levels 5 (2d10), 11 (3d10), and 17 (4d10).",
        "source": "Class",
        "components": "V, S"
      },
      {
        "id": "spell-1",
        "name": "Prestidigitation",
        "level": 0,
        "school": "Transmutation",
        "description": "You create a magical effect within range. Choose the effect from the options below. If you cast this spell multiple times, you can have up to three of its non-instantaneous effects active at a time. **Sensory Effect.** You create an instantaneous, harmless sensory effect, such as a shower of sparks, a puff of wind, faint musical notes, or an odd odor. **Fire Play.** You instantaneously light or snuff out a candle, a torch, or a small campfire. **Clean or Soil.** You instantaneously clean or soil an object no larger than 1 cubic foot. **Minor Sensation.** You chill, warm, or flavor up to 1 cubic foot of nonliving material for 1 hour. **Magic Mark.** You make a color, a small mark, or a symbol appear on an object or a surface for 1 hour. **Minor Creation.** You create a nonmagical trinket or an illusory image that can fit in your hand. It lasts until the end of your next turn. A trinket can deal no damage and has no monetary worth.",
        "source": "Class",
        "components": "V, S"
      },
      {
        "id": "spell-2",
        "name": "Burning Hands",
        "level": 1,
        "school": "Evocation",
        "description": "A thin sheet of flames shoots forth from you. Each creature in a 15-foot Cone makes a Dexterity saving throw, taking 3d6 Fire damage on a failed save or half as much damage on a successful one. Flammable objects in the Cone that aren’t being worn or carried start burning. **Using a Higher-Level Spell Slot.** The damage increases by 1d6 for each spell slot level above 1.",
        "source": "Class",
        "components": "V, S"
      },
      {
        "id": "spell-3",
        "name": "Control Flames",
        "level": 0,
        "school": "Transmutation",
        "description": "You choose nonmagical flame that you can see within range and that fits within a 5-foot cube. You affect it in one of the following ways: You instantaneously expand the flame 5 feet in one direction, provided that wood or other fuel is present in the new location. You instantaneously extinguish the flames within the cube. You double or halve the area of bright light and dim light cast by the flame, change its color, or both. The change lasts for 1 hour. You cause simple shapes&mdash;such as the vague form of a creature, an inanimate object, or a location&mdash;to appear within the flames and animate as you like. The shapes last for 1 hour. If you cast this spell multiple times, you can have up to three of its non-instantaneous effects active at a time, and you can dismiss such an effect as an action.",
        "source": "Class",
        "components": "S"
      },
      {
        "id": "spell-4",
        "name": "Minor Illusion",
        "level": 0,
        "school": "Illusion",
        "description": "You create a sound or an image of an object within range that lasts for the duration. See the descriptions below for the effects of each. The illusion ends if you cast this spell again. If a creature takes a Study action to examine the sound or image, the creature can determine that it is an illusion with a successful Intelligence (Investigation) check against your spell save DC. If a creature discerns the illusion for what it is, the illusion becomes faint to the creature. **Sound.** If you create a sound, its volume can range from a whisper to a scream. It can be your voice, someone else’s voice, a lion’s roar, a beating of drums, or any other sound you choose. The sound continues unabated throughout the duration, or you can make discrete sounds at different times before the spell ends. **Image.** If you create an image of an object&mdash;such as a chair, muddy footprints, or a small chest&mdash;it must be no larger than a 5-foot Cube. The image can’t create sound, light, smell, or any other sensory effect. Physical interaction with the image reveals it to be an illusion, since things can pass through it.",
        "source": "Class",
        "components": "S, M",
        "materialComponent": "a bit of fleece"
      },
      {
        "id": "spell-5",
        "name": "Mage Armor",
        "level": 1,
        "school": "Abjuration",
        "description": "You touch a willing creature who isn’t wearing armor. Until the spell ends, the target’s base AC becomes 13 plus its Dexterity modifier. The spell ends early if the target dons armor.",
        "source": "Class",
        "components": "V, S, M",
        "materialComponent": "a piece of cured leather"
      },
      {
        "id": "spell-6",
        "name": "Misty Step",
        "level": 2,
        "school": "Conjuration",
        "description": "Briefly surrounded by silvery mist, you teleport up to 30 feet to an unoccupied space you can see.",
        "source": "Class",
        "components": "V",
        "current": 1,
        "max": 1,
        "recovery": "long-rest"
      },
      {
        "id": "spell-7",
        "name": "Mirror Image",
        "level": 2,
        "school": "Illusion",
        "description": "Three illusory duplicates of yourself appear in your space. Until the spell ends, the duplicates move with you and mimic your actions, shifting position so it’s impossible to track which image is real. Each time a creature hits you with an attack roll during the spell’s duration, roll a d6 for each of your remaining duplicates. If any of the d6s rolls a 3 or higher, one of the duplicates is hit instead of you, and the duplicate is destroyed. The duplicates otherwise ignore all other damage and effects. The spell ends when all three duplicates are destroyed. A creature is unaffected by this spell if it has the Blinded condition, Blindsight, or Truesight.",
        "source": "Class",
        "components": "V, S"
      },
      {
        "id": "spell-8",
        "name": "Shield",
        "level": 1,
        "school": "Abjuration",
        "description": "An imperceptible barrier of magical force protects you. Until the start of your next turn, you have a +5 bonus to AC, including against the triggering attack, and you take no damage from Magic Missile.",
        "source": "Class",
        "components": "V, S"
      },
      {
        "id": "spell-9",
        "name": "Cloud of Daggers",
        "level": 2,
        "school": "Conjuration",
        "description": "You conjure spinning daggers in a 5-foot Cube centered on a point within range. Each creature in that area takes 4d4 Slashing damage. A creature also takes this damage if it enters the Cube or ends its turn there or if the Cube moves into its space. A creature takes this damage only once per turn. On your later turns, you can take a Magic action to teleport the Cube up to 30 feet. **Using a Higher-Level Spell Slot.** The damage increases by 2d4 for each spell slot level above 2.",
        "source": "Class",
        "components": "V, S, M",
        "materialComponent": "a sliver of glass"
      },
      {
        "id": "spell-10",
        "name": "Web",
        "level": 2,
        "school": "Conjuration",
        "description": "You conjure a mass of sticky webbing at a point within range. The webs fill a 20-foot Cube there for the duration. The webs are Difficult Terrain, and the area within them is Lightly Obscured. If the webs aren’t anchored between two solid masses (such as walls or trees) or layered across a floor, wall, or ceiling, the web collapses on itself, and the spell ends at the start of your next turn. Webs layered over a flat surface have a depth of 5 feet. The first time a creature enters the webs on a turn or starts its turn there, it must succeed on a Dexterity saving throw or have the Restrained condition while in the webs or until it breaks free. A creature Restrained by the webs can take an action to make a Strength (Athletics) check against your spell save DC. If it succeeds, it is no longer Restrained. The webs are flammable. Any 5-foot Cube of webs exposed to fire burns away in 1 round, dealing 2d4 Fire damage to any creature that starts its turn in the fire.",
        "source": "Class",
        "components": "V, S, M",
        "materialComponent": "a bit of spiderweb"
      },
      {
        "id": "spell-11",
        "name": "Blade Ward",
        "level": 0,
        "school": "Abjuration",
        "description": "Whenever a creature makes an attack roll against you before the spell ends, the attacker subtracts 1d4 from the attack roll.",
        "source": "Class",
        "components": "V, S"
      },
      {
        "id": "spell-12",
        "name": "Fireball",
        "level": 3,
        "school": "Evocation",
        "description": "A bright streak flashes from you to a point you choose within range and then blossoms with a low roar into a fiery explosion. Each creature in a 20-foot-radius Sphere centered on that point makes a Dexterity saving throw, taking 8d6 Fire damage on a failed save or half as much damage on a successful one. Flammable objects in the area that aren’t being worn or carried start burning. **Using a Higher-Level Spell Slot.** The damage increases by 1d6 for each spell slot level above 3.",
        "source": "Class",
        "components": "V, S, M",
        "materialComponent": "a ball of bat guano and sulfur"
      },
      {
        "id": "spell-13",
        "name": "Counterspell",
        "level": 3,
        "school": "Abjuration",
        "description": "You attempt to interrupt a creature in the process of casting a spell. The creature makes a Constitution saving throw. On a failed save, the spell dissipates with no effect, and the action, Bonus Action, or Reaction used to cast it is wasted. If that spell was cast with a spell slot, the slot isn’t expended.",
        "source": "Class",
        "components": "S"
      },
      {
        "id": "spell-14",
        "name": "Detect Magic",
        "level": 1,
        "school": "Divination",
        "description": "For the duration, you sense the presence of magical effects within 30 feet of yourself. If you sense such effects, you can take the Magic action to see a faint aura around any visible creature or object in the area that bears the magic, and if an effect was created by a spell, you learn the spell’s school of magic. The spell is blocked by 1 foot of stone, dirt, or wood; 1 inch of metal; or a thin sheet of lead.",
        "source": "Race",
        "components": "V, S",
        "current": 1,
        "max": 1,
        "recovery": "long-rest"
      },
      {
        "id": "spell-15",
        "name": "Cure Wounds",
        "level": 1,
        "school": "Abjuration",
        "description": "A creature you touch regains a number of Hit Points equal to 2d8 plus your spellcasting ability modifier. **Using a Higher-Level Spell Slot.** The healing increases by 2d8 for each spell slot level above 1.",
        "source": "Class",
        "components": "V, S"
      },
      {
        "id": "spell-16",
        "name": "Guiding Bolt",
        "level": 1,
        "school": "Evocation",
        "description": "You hurl a bolt of light toward a creature within range. Make a ranged spell attack against the target. On a hit, it takes 4d6 Radiant damage, and the next attack roll made against it before the end of your next turn has Advantage. **Using a Higher-Level Spell Slot.** The damage increases by 1d6 for each spell slot level above 1.",
        "source": "Class",
        "components": "V, S"
      },
      {
        "id": "spell-17",
        "name": "Lesser Restoration",
        "level": 2,
        "school": "Abjuration",
        "description": "You touch a creature and end one condition on it: Blinded, Deafened, Paralyzed, or Poisoned.",
        "source": "Class",
        "components": "V, S"
      },
      {
        "id": "spell-18",
        "name": "Scorching Ray",
        "level": 2,
        "school": "Evocation",
        "description": "You hurl three fiery rays. You can hurl them at one target within range or at several. Make a ranged spell attack for each ray. On a hit, the target takes 2d6 Fire damage. **Using a Higher-Level Spell Slot.** You create one additional ray for each spell slot level above 2.",
        "source": "Class",
        "components": "V, S"
      },
      {
        "id": "spell-19",
        "name": "Aura of Vitality",
        "level": 3,
        "school": "Abjuration",
        "description": "An aura radiates from you in a 30-foot Emanation for the duration. When you create the aura and at the start of each of your turns while it persists, you can restore 2d6 Hit Points to one creature in it.",
        "source": "Class",
        "components": "V"
      },
      {
        "id": "spell-20",
        "name": "Dispel Magic",
        "level": 3,
        "school": "Abjuration",
        "description": "Choose one creature, object, or magical effect within range. Any ongoing spell of level 3 or lower on the target ends. For each ongoing spell of level 4 or higher on the target, make an ability check using your spellcasting ability (DC 10 plus that spell’s level). On a successful check, the spell ends. **Using a Higher-Level Spell Slot.** You automatically end a spell on the target if the spell’s level is equal to or less than the level of the spell slot you use.",
        "source": "Class",
        "components": "V, S"
      },
      {
        "id": "spell-21",
        "name": "Melf's Acid Arrow",
        "level": 2,
        "school": "Evocation",
        "description": "A shimmering green arrow streaks toward a target within range and bursts in a spray of acid. Make a ranged spell attack against the target. On a hit, the target takes 4d4 Acid damage and 2d4 Acid damage at the end of its next turn. On a miss, the arrow splashes the target with acid for half as much of the initial damage only. **Using a Higher-Level Spell Slot.** The damage (both initial and later) increases by 1d4 for each spell slot level above 2.",
        "source": "Item",
        "components": "V, S, M",
        "materialComponent": "powdered rhubarb leaf"
      }
    ],
    "features": [
      {
        "id": "feature-0",
        "name": "Innate Sorcery",
        "source": "Innate Sorcery",
        "group": "bonusAction",
        "originType": "class",
        "description": "Twice per Long Rest, you can take a Bonus Action to unleash the simmering magic within you for 1 minute.",
        "current": 1,
        "max": 2,
        "recovery": "long-rest"
      },
      {
        "id": "feature-1",
        "name": "Font of Magic: Sorcery Points",
        "source": "Font of Magic",
        "group": "special",
        "originType": "class",
        "description": "You can tap into the wellspring of magic within yourself, which is represented by Sorcery Points (SP). Sorcery Points fuel various magical effects. You have 5 SP and regain all expended points when you finish a Long Rest.",
        "current": 4,
        "max": 5,
        "recovery": "long-rest"
      },
      {
        "id": "feature-2",
        "name": "Font of Magic: Convert Spell Slots",
        "source": "Font of Magic",
        "group": "action",
        "originType": "class",
        "description": "You can expend a spell slot to gain a number of Sorcery Points equal to the slot’s level (no action required)."
      },
      {
        "id": "feature-3",
        "name": "Font of Magic: Create Spell Slot Level 1",
        "source": "Font of Magic",
        "group": "bonusAction",
        "originType": "class",
        "description": "You can transform 2 unexpended Sorcery Points into a level 1 spell slot, which vanishes when you finish a Long Rest."
      },
      {
        "id": "feature-4",
        "name": "Font of Magic: Create Spell Slot Level 2",
        "source": "Font of Magic",
        "group": "bonusAction",
        "originType": "class",
        "description": "You can transform 3 unexpended Sorcery Points into a level 2 spell slot, which vanishes when you finish a Long Rest."
      },
      {
        "id": "feature-5",
        "name": "Font of Magic: Create Spell Slot Level 3",
        "source": "Font of Magic",
        "group": "bonusAction",
        "originType": "class",
        "description": "You can transform 5 unexpended Sorcery Points into a level 3 spell slot, which vanishes when you finish a Long Rest."
      },
      {
        "id": "feature-6",
        "name": "Sorcerous Restoration",
        "source": "Sorcerous Restoration",
        "group": "special",
        "originType": "class",
        "description": "When you finish a Short Rest, you can regain up to 2 Sorcery Points. Once used, you can’t use this feature again until you finish a Long Rest.",
        "current": 0,
        "max": 1,
        "recovery": "long-rest"
      },
      {
        "id": "feature-7",
        "name": "Initiate a Circle Spell",
        "source": "Class",
        "group": "action",
        "originType": "class",
        "description": "You take a Magic action to initiate casting a Circle spell. When you do so, choose which Circle casting option you’re using for this casting; you must also meet any of the other requirements described in that option’s text. Until the Circle spell’s casting is complete, you must maintain Concentration on the spell."
      },
      {
        "id": "feature-8",
        "name": "Circle Spell: Augment",
        "source": "Class",
        "group": "special",
        "originType": "class",
        "description": "When you cast a spell with a range of at least 5 ft., you can increase the range of the spell by 1,000 ft. per secondary caster contributing to the spell, up to a max of a 1-mile increase."
      },
      {
        "id": "feature-9",
        "name": "Circle Spell: Distribute",
        "source": "Class",
        "group": "special",
        "originType": "class",
        "description": "When you cast a spell that requires Concentration, you can distribute the mental load of the spell among you and the secondary casters. Once the casting is complete, you and all secondary casters can maintain Concentration on this spell. As long as at least one caster who contributed to the spell maintains this Concentration, the spell’s effects remain active."
      },
      {
        "id": "feature-10",
        "name": "Circle Spell: Expand",
        "source": "Class",
        "group": "special",
        "originType": "class",
        "description": "When you cast a spell that creates an area of effect, you can increase one dimension of the spell’s area of effect for this casting by 10 ft. per secondary caster contributing to the spell. Each secondary caster contributing to the spell must expend a spell slot (no action required). If the spell fails, these spell slots aren’t expended."
      },
      {
        "id": "feature-11",
        "name": "Circle Spell: Prolong",
        "source": "Class",
        "group": "special",
        "originType": "class",
        "description": "When you cast a spell that has a duration of 1 min or longer, you can increase the duration of the spell depending on the number of secondary casters contributing to the spell. Each secondary caster contributing to the spell must expend a spell slot (no action required). If the spell fails, these spell slots aren’t expended."
      },
      {
        "id": "feature-12",
        "name": "Circle Spell: Safeguard",
        "source": "Class",
        "group": "special",
        "originType": "class",
        "description": "When you cast a spell that creates an area of effect, you can carve out a safe zone within that area of effect that is unaffected by the spell for its duration. This safe zone consists of a number of 5-ft. Cubes equal to **3 + the number of secondary casters** contributing to the spell (min of 1 Cube). You can arrange the Cubes as you like, but each Cube must be contiguous with at least one other Cube. If the spell’s area of effect can be moved, the safe zone moves with it."
      },
      {
        "id": "feature-13",
        "name": "Circle Spell: Supplant",
        "source": "Class",
        "group": "special",
        "originType": "class",
        "description": "When you cast a spell that requires at least one Material component with a specified cost that is consumed by the spell, you can reduce the min cost of one such Material component by 50 GP per each secondary caster contributing to the spell. Each secondary caster contributing to the spell must expend a spell slot of a level greater than or equal to the spell’s level (no action required). If the spell fails, these spell slots aren’t expended."
      },
      {
        "id": "feature-14",
        "name": "Metamagic: Careful Spell",
        "source": "Class",
        "group": "special",
        "originType": "class",
        "description": "When you cast a spell that forces other creatures to make a saving throw, you can spend 1 Sorcery Point and choose up to 3 creatures to automatically succeed on its saving throw, and it takes no damage if it would normally take half damage on a success."
      },
      {
        "id": "feature-15",
        "name": "Metamagic: Seeking Spell",
        "source": "Class",
        "group": "special",
        "originType": "class",
        "description": "If you make an attack roll for a spell and miss, you can spend 1 Sorcery Point to reroll the d20, and you must use the new roll. You can use Seeking Spell, even if you’ve already used a different Metamagic option."
      },
      {
        "id": "feature-16",
        "name": "Spellfire Burst: Bolstering Flames",
        "source": "Spellfire Burst",
        "group": "special",
        "originType": "class",
        "description": "Once per turn, when you spend at least 1 Sorcery Point as part of a Magic action or a Bonus Action on your turn, you or one creature you can see within 30 ft. of yourself gains **1d4** Temp HP."
      },
      {
        "id": "feature-17",
        "name": "Spellfire Burst: Radiant Fire (Fire)",
        "source": "Spellfire Burst",
        "group": "special",
        "originType": "class",
        "description": "Once per turn, when you spend at least 1 Sorcery Point as part of a Magic action or a Bonus Action on your turn, one creature you can see within 30 ft. of yourself takes **1d4** Fire damage."
      },
      {
        "id": "feature-18",
        "name": "Spellfire Burst: Radiant Fire (Radiant)",
        "source": "Spellfire Burst",
        "group": "special",
        "originType": "class",
        "description": "Once per turn, when you spend at least 1 Sorcery Point as part of a Magic action or a Bonus Action on your turn, one creature you can see within 30 ft. of yourself takes **1d4** Radiant damage."
      },
      {
        "id": "feature-19",
        "name": "Reactive Spell",
        "source": "War Caster",
        "group": "reaction",
        "originType": "feat",
        "description": "When a creature provokes an Opportunity Attack from you, you can take a Reaction to cast a spell at the creature rather than making an Opportunity Attack. The spell must have a casting time of one action and must target only that creature."
      },
      {
        "id": "feature-20",
        "name": "Darkvision",
        "source": "Race",
        "group": "other",
        "originType": "species",
        "description": "You have Darkvision with a range of 60 ft."
      },
      {
        "id": "feature-21",
        "name": "Elven Lineage",
        "source": "Race",
        "group": "other",
        "originType": "species",
        "description": "Choose a lineage from the Elven Lineages table. You gain the level 1 benefit of that lineage."
      },
      {
        "id": "feature-22",
        "name": "Fey Ancestry",
        "source": "Race",
        "group": "other",
        "originType": "species",
        "description": "You have Advantage on saving throws you make to avoid or end the Charmed condition."
      },
      {
        "id": "feature-23",
        "name": "Keen Senses",
        "source": "Race",
        "group": "other",
        "originType": "species",
        "description": "You have proficiency in the Insight, Perception, or Survival skill."
      },
      {
        "id": "feature-24",
        "name": "Trance",
        "source": "Race",
        "group": "other",
        "originType": "species",
        "description": "You don’t need to sleep, and magic can’t put you to sleep. You can finish a Long Rest in 4 hours if you spend those hours in a trancelike meditation, during which you retain consciousness."
      },
      {
        "id": "feature-25",
        "name": "Spellfire Burst",
        "source": "Spellfire Sorcery",
        "group": "other",
        "originType": "class",
        "description": "Once per turn, when you spend at least 1 Sorcery Point as part of a Magic action or a Bonus Action on your turn, you can unleash one of the following magical effects of your choice. **Bolstering Flames.** You or one creature you can see within 30 ft. of yourself gains **1d4** Temp HP. **Radiant Fire.** One creature you can see within 30 ft. of yourself takes **1d4** Fire or Radiant damage (your choice)."
      },
      {
        "id": "feature-26",
        "name": "Spellfire Spells",
        "source": "Spellfire Sorcery",
        "group": "other",
        "originType": "class",
        "description": "When you reach a Sorcerer level specified in the Spellfire Spells table, you thereafter always have the listed spells prepared."
      },
      {
        "id": "feature-27",
        "name": "Core Sorcerer Traits",
        "source": "Sorcerer",
        "group": "other",
        "originType": "class",
        "description": "As a Level 1 Character: Gain all the traits in the Core Sorcerer Traits table. Gain the Sorcerer’s level 1 features. Core Sorcerer Traits Primary Ability Charisma Hit Point Die D6 per Sorcerer level Saving Throw Proficiencies Constitution and Charisma Skill Proficiencies *Choose 2:* Arcana, Deception, Insight, Intimidation, Persuasion, or Religion Weapon Proficiencies Simple weapons Armor Training None Starting Equipment *Choose A or B:* (A) Spear, 2 Daggers, Arcane Focus (crystal), Dungeoneer’s Pack, and 28 GP; or (B) 50 GP"
      },
      {
        "id": "feature-28",
        "name": "Spellcasting",
        "source": "Sorcerer",
        "group": "other",
        "originType": "class",
        "description": "Drawing from your innate magic, you can cast spells. **Cantrips.** You know four Sorcerer cantrips of your choice. Whenever you gain a Sorcerer level, you can replace one of your cantrips from this feature with another Sorcerer cantrip of your choice. When you reach Sorcerer levels 4 and 10, you learn another Sorcerer cantrip of your choice, as shown in the Cantrips column of the Sorcerer Features table. **Spell Slots.** The Sorcerer Features table shows how many spell slots you have to cast your level 1+ spells. You regain all expended slots when you finish a Long Rest. **Prepared Spells of Level 1+.** You prepare the list of level 1+ spells that are available for you to cast with this feature. To start, choose two level 1 Sorcerer spells. The number of spells on your list increases as you gain Sorcerer levels, as shown in the Prepared Spells column of the Sorcerer Features table. Whenever that number increases, choose additional Sorcerer spells until the number of spells on your list matches the number in the Sorcerer Features table. The chosen spells must be of a level for which you have spell slots. For example, if you’re a level 3 Sorcerer, your list of prepared spells can include six Sorcerer spells of level 1 or 2 in any combination. If another Sorcerer feature gives you spells that you always have prepared, those spells don’t count against the number of spells you can prepare with this feature, but those spells otherwise count as Sorcerer spells for you. **Changing Your Prepared Spells.** Whenever you gain a Sorcerer level, you can replace one spell on your list with another Sorcerer spell for which you have spell slots. **Spellcasting Ability.** Charisma is your spellcasting ability for your Sorcerer spells. **Spellcasting Focus.** You can use an Arcane Focus as a Spellcasting Focus for your Sorcerer spells."
      },
      {
        "id": "feature-29",
        "name": "Font of Magic",
        "source": "Sorcerer",
        "group": "other",
        "originType": "class",
        "description": "You can tap into the wellspring of magic within yourself, which is represented by Sorcery Points (SP). You have 5 SP and regain all expended points when you finish a Long Rest. In addition to fueling effects such as Metamagic, you can use your SP to fuel the options below: **Converting Spell Slots to Sorcery Points.** You can expend a spell slot to gain a number of SP equal to the slot’s level (no action required). **Creating Spell Slots.** As a Bonus Action, you can transform unexpended SP into one spell slot, creating a spell slot no higher than level 5. Any spell slot you create with this feature vanishes when you finish a Long Rest. The conversion is as follows:\n• **Sorcerer Level 2** | 2 SP -> Spell Slot Level 1\n• **Sorcerer Level 3** | 3 SP -> Spell Slot Level 2\n• **Sorcerer Level 5** | 5 SP -> Spell Slot Level 3\n• **Sorcerer Level 7** | 6 SP -> Spell Slot Level 4\n• **Sorcerer Level 9** | 7 SP -> Spell Slot Level 5",
        "current": 4,
        "max": 5,
        "recovery": "long-rest"
      },
      {
        "id": "feature-30",
        "name": "Metamagic",
        "source": "Sorcerer",
        "group": "other",
        "originType": "class",
        "description": "You can alter spells to suit your needs; you know Metamagic options which can be used to temporarily modify spells you cast."
      },
      {
        "id": "feature-31",
        "name": "Sorcerer Subclass",
        "source": "Sorcerer",
        "group": "other",
        "originType": "class",
        "description": "You gain a Sorcerer subclass of your choice. A subclass is a specialization that grants you features at certain Sorcerer levels. For the rest of your career, you gain each of your subclass’s features that are of your Sorcerer level or lower."
      },
      {
        "id": "feature-32",
        "name": "Ability Score Improvement",
        "source": "Sorcerer",
        "group": "other",
        "originType": "class",
        "description": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify. You gain this feature again at Sorcerer levels 8, 12, and 16."
      },
      {
        "id": "feature-33",
        "name": "Metamagic Options",
        "source": "Sorcerer",
        "group": "other",
        "originType": "class",
        "description": "The following options are available to your Metamagic feature. The options are presented in alphabetical order."
      },
      {
        "id": "feature-34",
        "name": "Noble Ability Score Improvements",
        "source": "Feat",
        "group": "other",
        "originType": "feat",
        "description": "The Noble Background allows you to choose between Strength, Intelligence, and Charisma. Increase one of these scores by 2 and another one by 1, or increase all three by 1. None of these increases can raise a score above 20."
      },
      {
        "id": "feature-35",
        "name": "Skilled",
        "source": "Feat",
        "group": "other",
        "originType": "feat",
        "description": "You gain proficiency in any combination of three skills or tools of your choice. **Repeatable.** You can take this feat more than once."
      },
      {
        "id": "feature-36",
        "name": "War Caster",
        "source": "Feat",
        "group": "other",
        "originType": "feat",
        "description": "**Ability Score Increase.** Increase your Int., Wis., or Cha. by 1. **Concentration.** You have Advantage on Con. saving throws to maintain Concentration. **Reactive Spell.** When a creature provokes an Opportunity Attack from you by leaving your reach, you can take a Reaction to cast a spell at the creature rather than making an Opportunity Attack. This spell must have a casting time of one action and must target only that creature. **Somatic Components.** You can perform the Somatic components of spells even when you have weapons or a Shield in one or both hands."
      },
      {
        "id": "feature-37",
        "name": "High Elf Lineage",
        "source": "Elven Lineage",
        "group": "other",
        "originType": "species",
        "description": "You gain the spells outlined in the Elven Lineages table, and whenever you finish a Long Rest, you can replace the cantrip at level 1 with a different cantrip from the Wizard spell list."
      },
      {
        "id": "feature-38",
        "name": "High Elf - Intelligence",
        "source": "Elven Lineage Spells",
        "group": "other",
        "originType": "species",
        "description": "Your High Elf Lineage spells use Intelligence."
      },
      {
        "id": "feature-39",
        "name": "Increase two scores (+2 / +1)",
        "source": "Skilled",
        "group": "other",
        "originType": "background",
        "description": "Increase one of these scores by 2 and a different score by 1."
      }
    ],
    "attacks": [
      {
        "id": "attack-unarmed",
        "name": "Unarmed Strike",
        "attackType": "melee",
        "attackBonus": 2,
        "damage": "0",
        "damageType": "Bludgeoning",
        "properties": [],
        "range": "5 ft.",
        "proficient": true
      }
    ],
    "notes": "A Spellfire Sorcerer built around Metamagic-twisted blasts and Sorcery Point economy. Fights that reward creative spell-slot management (or punish burning through Sorcery Points too early) suit her best.",
    "quickNotes": [
      {
        "id": "qn-yorun-1",
        "text": "Suspicious of the innkeeper's extra questions",
        "createdAt": "2026-07-05T10:00:00.000Z"
      }
    ],
    "subclass": "Spellfire Sorcery",
    "spellcasting": {
      "modifier": 3,
      "attack": 6,
      "saveDc": 14
    },
    "avatarUrl": "https://www.dndbeyond.com/avatars/54062/147/1581111423-158958304.jpeg?width=150&height=150&fit=crop&quality=95&auto=webp",
    "synced": false
  },
  {
    "id": "demo-esmeralda",
    "campaignId": "demo-campaign",
    "name": "Цінотижка aka Есмеральда фон Пуппікс",
    "race": "Tiefling",
    "className": "Bard",
    "level": 5,
    "role": "Face / mobile skirmisher",
    "heroicInspiration": false,
    "initiative": 2,
    "combat": {
      "hp": 37,
      "maxHp": 38,
      "tempHp": 0,
      "ac": 17,
      "speed": 30,
      "passivePerception": 10,
      "passiveInvestigation": 11,
      "passiveInsight": 10,
      "conditions": [],
      "exhaustion": 0
    },
    "stats": {
      "str": 9,
      "dex": 15,
      "con": 14,
      "int": 12,
      "wis": 10,
      "cha": 20
    },
    "resources": [
      {
        "id": "action-class-2",
        "name": "Bardic Inspiration",
        "current": 5,
        "max": 5,
        "recovery": "short-rest",
        "source": "Class",
        "description": "As a Bonus Action, you can inspire another creature within 60 ft. that can see or hear you. That creature gains one of your Bardic Inspiration dice (5). Once within the next hour, when the creature fails a D20 Test, the creature can roll the Bardic Inspiration die and add the number rolled to the total, potentially turning the failure into a success. You can confer your Bardic Inspiration die 5 times per Short or Long Rest."
      },
      {
        "id": "action-feat-0",
        "name": "Lucky",
        "current": 2,
        "max": 3,
        "recovery": "long-rest",
        "source": "Feat",
        "description": "You have 3 luck points per long rest. Whenever you make an attack roll, an ability check, or a saving throw (or when an attack roll is made against you), you can spend one to roll an additional d20 and you choose which die to use. You can choose to spend luck points after you roll the die, but before the outcome is determined."
      }
    ],
    "spellSlots": [
      {
        "level": 1,
        "current": 4,
        "max": 4
      },
      {
        "level": 2,
        "current": 3,
        "max": 3
      },
      {
        "level": 3,
        "current": 2,
        "max": 2
      }
    ],
    "savingThrowProficiencies": [
      "dex",
      "cha"
    ],
    "skillProficiencies": [
      {
        "name": "acrobatics",
        "proficient": true,
        "expertise": false
      },
      {
        "name": "animal-handling",
        "proficient": false,
        "expertise": false,
        "halfProficiency": true
      },
      {
        "name": "arcana",
        "proficient": true,
        "expertise": true
      },
      {
        "name": "athletics",
        "proficient": false,
        "expertise": false,
        "halfProficiency": true
      },
      {
        "name": "deception",
        "proficient": true,
        "expertise": false
      },
      {
        "name": "history",
        "proficient": false,
        "expertise": false,
        "halfProficiency": true
      },
      {
        "name": "insight",
        "proficient": false,
        "expertise": false,
        "halfProficiency": true
      },
      {
        "name": "intimidation",
        "proficient": false,
        "expertise": false,
        "halfProficiency": true
      },
      {
        "name": "investigation",
        "proficient": false,
        "expertise": false,
        "halfProficiency": true
      },
      {
        "name": "medicine",
        "proficient": false,
        "expertise": false,
        "halfProficiency": true
      },
      {
        "name": "nature",
        "proficient": false,
        "expertise": false,
        "halfProficiency": true
      },
      {
        "name": "perception",
        "proficient": false,
        "expertise": false,
        "halfProficiency": true
      },
      {
        "name": "performance",
        "proficient": true,
        "expertise": true,
        "advantage": "advantage",
        "advantageNote": "that involves you dancing."
      },
      {
        "name": "persuasion",
        "proficient": false,
        "expertise": false,
        "halfProficiency": true
      },
      {
        "name": "religion",
        "proficient": false,
        "expertise": false,
        "halfProficiency": true
      },
      {
        "name": "sleight-of-hand",
        "proficient": false,
        "expertise": false,
        "halfProficiency": true
      },
      {
        "name": "stealth",
        "proficient": true,
        "expertise": false
      },
      {
        "name": "survival",
        "proficient": false,
        "expertise": false,
        "halfProficiency": true
      }
    ],
    "resistances": [
      "Fire"
    ],
    "immunities": [],
    "vulnerabilities": [],
    "advantages": [
      "Advantage: Performance — that involves you dancing."
    ],
    "senses": [
      {
        "name": "Darkvision",
        "range": 60
      }
    ],
    "languages": ["Common", "Infernal"],
    "toolProficiencies": [],
    "inventory": [
      {
        "id": "item-0",
        "name": "Rapier, +1",
        "rarity": "Uncommon",
        "category": "Weapon",
        "quantity": 1,
        "description": "You have a +1 bonus to attack and damage rolls made with this magic weapon."
      },
      {
        "id": "item-1",
        "name": "Armor of Gleaming, Chain Shirt",
        "rarity": "Common",
        "category": "Armor",
        "quantity": 1,
        "description": "This armor never gets dirty."
      },
      {
        "id": "item-2",
        "name": "Breastplate",
        "rarity": "Common",
        "category": "Armor",
        "quantity": 1,
        "description": "This armor consists of a fitted metal chest piece worn with supple leather. Although it leaves the legs and arms relatively unprotected, this armor provides good protection for the wearer's vital organs while leaving the wearer relatively unencumbered."
      },
      {
        "id": "item-3",
        "name": "Crossbow, Hand",
        "rarity": "Common",
        "category": "Weapon",
        "quantity": 1,
        "description": "Proficiency with a Hand Crossbow allows you to add your proficiency bonus to the attack roll for any attack you make with it. This weapon has the following mastery property. To use this property, you must have a feature that lets you use it. **Vex.** If you hit a creature with this weapon and deal damage to the creature, you have Advantage on your next attack roll against that creature before the end of your next turn."
      },
      {
        "id": "item-4",
        "name": "Dagger",
        "rarity": "Common",
        "category": "Weapon",
        "quantity": 1,
        "description": "Proficiency with a Dagger allows you to add your proficiency bonus to the attack roll for any attack you make with it. This weapon has the following mastery property. To use this property, you must have a feature that lets you use it. **Nick.** When you make the extra attack of the Light property, you can make it as part of the Attack action instead of as a Bonus Action. You can make this extra attack only once per turn."
      }
    ],
    "currency": {
      "cp": 0,
      "sp": 0,
      "ep": 0,
      "gp": 0,
      "pp": 0
    },
    "knownSpells": [
      {
        "id": "spell-0",
        "name": "Mage Hand",
        "level": 0,
        "school": "Conjuration",
        "description": "A spectral, floating hand appears at a point you choose within range. The hand lasts for the duration. The hand vanishes if it is ever more than 30 feet away from you or if you cast this spell again. When you cast the spell, you can use the hand to manipulate an object, open an unlocked door or container, stow or retrieve an item from an open container, or pour the contents out of a vial. As a Magic action on your later turns, you can control the hand thus again. As part of that action, you can move the hand up to 30 feet. The hand can’t attack, activate magic items, or carry more than 10 pounds.",
        "source": "Class",
        "components": "V, S"
      },
      {
        "id": "spell-1",
        "name": "Message",
        "level": 0,
        "school": "Transmutation",
        "description": "You point toward a creature within range and whisper a message. The target (and only the target) hears the message and can reply in a whisper that only you can hear. You can cast this spell through solid objects if you are familiar with the target and know it is beyond the barrier. Magical silence; 1 foot of stone, metal, or wood; or a thin sheet of lead blocks the spell.",
        "source": "Class",
        "components": "S, M",
        "materialComponent": "a copper wire"
      },
      {
        "id": "spell-2",
        "name": "Dissonant Whispers",
        "level": 1,
        "school": "Enchantment",
        "description": "One creature of your choice that you can see within range hears a discordant melody in its mind. The target makes a Wisdom saving throw. On a failed save, it takes 3d6 Psychic damage and must immediately use its Reaction, if available, to move as far away from you as it can, using the safest route. On a successful save, the target takes half as much damage only. **Using a Higher-Level Spell Slot.** The damage increases by 1d6 for each spell slot level above 1.",
        "source": "Class",
        "components": "V"
      },
      {
        "id": "spell-3",
        "name": "Thunderwave",
        "level": 1,
        "school": "Evocation",
        "description": "You unleash a wave of thunderous energy. Each creature in a 15-foot Cube originating from you makes a Constitution saving throw. On a failed save, a creature takes 2d8 Thunder damage and is pushed 10 feet away from you. On a successful save, a creature takes half as much damage only. In addition, unsecured objects that are entirely within the Cube are pushed 10 feet away from you, and a thunderous boom is audible within 300 feet. **Using a Higher-Level Spell Slot.** The damage increases by 1d8 for each spell slot level above 1.",
        "source": "Class",
        "components": "V, S"
      },
      {
        "id": "spell-4",
        "name": "Vicious Mockery",
        "level": 0,
        "school": "Enchantment",
        "description": "You unleash a string of insults laced with subtle enchantments at one creature you can see or hear within range. The target must succeed on a Wisdom saving throw or take 1d6 Psychic damage and have Disadvantage on the next attack roll it makes before the end of its next turn. **Cantrip Upgrade.** The damage increases by 1d6 when you reach levels 5 (2d6), 11 (3d6), and 17 (4d6).",
        "source": "Class",
        "components": "V"
      },
      {
        "id": "spell-5",
        "name": "Detect Magic",
        "level": 1,
        "school": "Divination",
        "description": "For the duration, you sense the presence of magical effects within 30 feet of yourself. If you sense such effects, you can take the Magic action to see a faint aura around any visible creature or object in the area that bears the magic, and if an effect was created by a spell, you learn the spell’s school of magic. The spell is blocked by 1 foot of stone, dirt, or wood; 1 inch of metal; or a thin sheet of lead.",
        "source": "Class",
        "components": "V, S"
      },
      {
        "id": "spell-6",
        "name": "Healing Word",
        "level": 1,
        "school": "Abjuration",
        "description": "A creature of your choice that you can see within range regains Hit Points equal to 2d4 plus your spellcasting ability modifier. **Using a Higher-Level Spell Slot.** The healing increases by 2d4 for each spell slot level above 1.",
        "source": "Class",
        "components": "V"
      },
      {
        "id": "spell-7",
        "name": "Invisibility",
        "level": 2,
        "school": "Illusion",
        "description": "A creature you touch has the Invisible condition until the spell ends. The spell ends early immediately after the target makes an attack roll, deals damage, or casts a spell. **Using a Higher-Level Spell Slot.** You can target one additional creature for each spell slot level above 2.",
        "source": "Class",
        "components": "V, S, M",
        "materialComponent": "an eyelash in gum arabic"
      },
      {
        "id": "spell-8",
        "name": "Comprehend Languages",
        "level": 1,
        "school": "Divination",
        "description": "For the duration, you understand the literal meaning of any language that you hear or see signed. You also understand any written language that you see, but you must be touching the surface on which the words are written. It takes about 1 minute to read one page of text. This spell doesn’t decode symbols or secret messages.",
        "source": "Class",
        "components": "V, S, M",
        "materialComponent": "a pinch of soot and salt"
      },
      {
        "id": "spell-9",
        "name": "Heat Metal",
        "level": 2,
        "school": "Transmutation",
        "description": "Choose a manufactured metal object, such as a metal weapon or a suit of Heavy or Medium metal armor, that you can see within range. You cause the object to glow red-hot. Any creature in physical contact with the object takes 2d8 Fire damage when you cast the spell. Until the spell ends, you can take a Bonus Action on each of your later turns to deal this damage again if the object is within range. If a creature is holding or wearing the object and takes the damage from it, the creature must succeed on a Constitution saving throw or drop the object if it can. If it doesn’t drop the object, it has Disadvantage on attack rolls and ability checks until the start of your next turn. **Using a Higher-Level Spell Slot.** The damage increases by 1d8 for each spell slot level above 2.",
        "source": "Class",
        "components": "V, S, M",
        "materialComponent": "a piece of iron and a flame"
      },
      {
        "id": "spell-10",
        "name": "Blindness/Deafness",
        "level": 2,
        "school": "Transmutation",
        "description": "One creature that you can see within range must succeed on a Constitution saving throw, or it has the Blinded or Deafened condition (your choice) for the duration. At the end of each of its turns, the target repeats the save, ending the spell on itself on a success. **Using a Higher-Level Spell Slot.** You can target one additional creature for each spell slot level above 2.",
        "source": "Class",
        "components": "V"
      },
      {
        "id": "spell-11",
        "name": "Plant Growth",
        "level": 3,
        "school": "Transmutation",
        "description": "This spell channels vitality into plants. The casting time you use determines whether the spell has the Overgrowth or the Enrichment effect below. **Overgrowth.** Choose a point within range. All normal plants in a 100-foot-radius Sphere centered on that point become thick and overgrown. A creature moving through that area must spend 4 feet of movement for every 1 foot it moves. You can exclude one or more areas of any size within the spell’s area from being affected. **Enrichment.** All plants in a half-mile radius centered on a point within range become enriched for 365 days. The plants yield twice the normal amount of food when harvested. They can benefit from only one *Plant Growth* per year.",
        "source": "Class",
        "components": "V, S"
      },
      {
        "id": "spell-12",
        "name": "Thaumaturgy",
        "level": 0,
        "school": "Transmutation",
        "description": "You manifest a minor wonder, a sign of supernatural power, within range. You create one of the following magical effects within range: Your voice booms up to three times as loud as normal for 1 minute. You cause flames to flicker, brighten, dim, or change color for 1 minute. You cause harmless tremors in the ground for 1 minute. You create an instantaneous sound that originates from a point of your choice within range, such as a rumble of thunder, the cry of a raven, or ominous whispers. You instantaneously cause an unlocked door or window to fly open or slam shut. You alter the appearance of your eyes for 1 minute. If you cast this spell multiple times, you can have up to three of its 1-minute effects active at a time, and you can dismiss such an effect as an action.",
        "source": "Race",
        "components": "V"
      },
      {
        "id": "spell-13",
        "name": "Hellish Rebuke",
        "level": 1,
        "school": "Evocation",
        "description": "You point your finger, and the creature that damaged you is momentarily surrounded by hellish flames. The creature must make a Dexterity saving throw. It takes 2d10 fire damage on a failed save, or half as much damage on a successful one. **At Higher Levels.** When you cast this spell using a spell slot of 2nd level or higher, the damage increases by 1d10 for each slot level above 1st.",
        "source": "Race",
        "components": "V, S",
        "current": 1,
        "max": 1,
        "recovery": "long-rest"
      },
      {
        "id": "spell-14",
        "name": "Darkness",
        "level": 2,
        "school": "Evocation",
        "description": "Magical darkness spreads from a point you choose within range to fill a 15-foot-radius sphere for the duration. The darkness spreads around corners. A creature with darkvision can't see through this darkness, and nonmagical light can't illuminate it. If the point you choose is on an object you are holding or one that isn't being worn or carried, the darkness emanates from the object and moves with it. Completely covering the source of the darkness with an opaque object, such as a bowl or a helm, blocks the darkness. If any of this spell's area overlaps with an area of light created by a spell of 2nd level or lower, the spell that created the light is dispelled.",
        "source": "Race",
        "components": "V, M",
        "materialComponent": "bat fur and a drop of pitch or piece of coal",
        "current": 1,
        "max": 1,
        "recovery": "long-rest"
      },
      {
        "id": "spell-15",
        "name": "Spider Climb",
        "level": 2,
        "school": "Transmutation",
        "description": "Until the spell ends, one willing creature you touch gains the ability to move up, down, and across vertical surfaces and along ceilings, while leaving its hands free. The target also gains a Climb Speed equal to its Speed. **Using a Higher-Level Spell Slot.** You can target one additional creature for each spell slot level above 2.",
        "source": "Feat",
        "components": "V, S, M",
        "materialComponent": "a drop of bitumen and a spider",
        "current": 1,
        "max": 1,
        "recovery": "long-rest"
      }
    ],
    "features": [
      {
        "id": "feature-0",
        "name": "Bardic Inspiration",
        "source": "Bardic Inspiration",
        "group": "bonusAction",
        "originType": "class",
        "description": "As a Bonus Action, you can inspire another creature within 60 ft. that can see or hear you. That creature gains one of your Bardic Inspiration dice (5). Once within the next hour, when the creature fails a D20 Test, the creature can roll the Bardic Inspiration die and add the number rolled to the total, potentially turning the failure into a success. You can confer your Bardic Inspiration die 5 times per Long Rest.",
        "current": 3,
        "max": 5,
        "recovery": "short-rest"
      },
      {
        "id": "feature-1",
        "name": "Regain Bardic Inspiration",
        "source": "Font of Inspiration",
        "group": "special",
        "originType": "class",
        "description": "You can expend a spell slot (no action required) to regain one expended use of Bardic Inspiration."
      },
      {
        "id": "feature-2",
        "name": "Bardic Damage",
        "source": "Dazzling Footwork",
        "group": "action",
        "originType": "class",
        "description": "You can use Dex. instead of Str. for the attack rolls of your Unarmed Strike. When you deal damage with it, you can deal +2 Bludgeoning damage."
      },
      {
        "id": "feature-3",
        "name": "Bardic Inspiration: Agile Strikes",
        "source": "Dazzling Footwork",
        "group": "bonusAction",
        "originType": "class",
        "description": "When you expend a use of your Bardic Inspiration as part of an action, Bonus Action, or Reaction, you can make an Unarmed Strike as part of the same action."
      },
      {
        "id": "feature-4",
        "name": "Initiate a Circle Spell",
        "source": "Class",
        "group": "action",
        "originType": "class",
        "description": "You take a Magic action to initiate casting a Circle spell. When you do so, choose which Circle casting option you’re using for this casting; you must also meet any of the other requirements described in that option’s text. Until the Circle spell’s casting is complete, you must maintain Concentration on the spell."
      },
      {
        "id": "feature-5",
        "name": "Circle Spell: Augment",
        "source": "Class",
        "group": "special",
        "originType": "class",
        "description": "When you cast a spell with a range of at least 5 ft., you can increase the range of the spell by 1,000 ft. per secondary caster contributing to the spell, up to a max of a 1-mile increase."
      },
      {
        "id": "feature-6",
        "name": "Circle Spell: Distribute",
        "source": "Class",
        "group": "special",
        "originType": "class",
        "description": "When you cast a spell that requires Concentration, you can distribute the mental load of the spell among you and the secondary casters. Once the casting is complete, you and all secondary casters can maintain Concentration on this spell. As long as at least one caster who contributed to the spell maintains this Concentration, the spell’s effects remain active."
      },
      {
        "id": "feature-7",
        "name": "Circle Spell: Expand",
        "source": "Class",
        "group": "special",
        "originType": "class",
        "description": "When you cast a spell that creates an area of effect, you can increase one dimension of the spell’s area of effect for this casting by 10 ft. per secondary caster contributing to the spell. Each secondary caster contributing to the spell must expend a spell slot (no action required). If the spell fails, these spell slots aren’t expended."
      },
      {
        "id": "feature-8",
        "name": "Circle Spell: Prolong",
        "source": "Class",
        "group": "special",
        "originType": "class",
        "description": "When you cast a spell that has a duration of 1 min or longer, you can increase the duration of the spell depending on the number of secondary casters contributing to the spell. Each secondary caster contributing to the spell must expend a spell slot (no action required). If the spell fails, these spell slots aren’t expended."
      },
      {
        "id": "feature-9",
        "name": "Circle Spell: Safeguard",
        "source": "Class",
        "group": "special",
        "originType": "class",
        "description": "When you cast a spell that creates an area of effect, you can carve out a safe zone within that area of effect that is unaffected by the spell for its duration. This safe zone consists of a number of 5-ft. Cubes equal to **5 + the number of secondary casters** contributing to the spell (min of 1 Cube). You can arrange the Cubes as you like, but each Cube must be contiguous with at least one other Cube. If the spell’s area of effect can be moved, the safe zone moves with it."
      },
      {
        "id": "feature-10",
        "name": "Circle Spell: Supplant",
        "source": "Class",
        "group": "special",
        "originType": "class",
        "description": "When you cast a spell that requires at least one Material component with a specified cost that is consumed by the spell, you can reduce the min cost of one such Material component by 50 GP per each secondary caster contributing to the spell. Each secondary caster contributing to the spell must expend a spell slot of a level greater than or equal to the spell’s level (no action required). If the spell fails, these spell slots aren’t expended."
      },
      {
        "id": "feature-11",
        "name": "Lucky",
        "source": "Lucky",
        "group": "action",
        "originType": "feat",
        "description": "You have 3 luck points per long rest. Whenever you make an attack roll, an ability check, or a saving throw (or when an attack roll is made against you), you can spend one to roll an additional d20 and you choose which die to use. You can choose to spend luck points after you roll the die, but before the outcome is determined.",
        "current": 2,
        "max": 3,
        "recovery": "long-rest"
      },
      {
        "id": "feature-12",
        "name": "Darkvision",
        "source": "Race",
        "group": "other",
        "originType": "species",
        "description": "You can see in darkness (shades of gray) up to 60 ft."
      },
      {
        "id": "feature-13",
        "name": "Hellish Resistance",
        "source": "Race",
        "group": "other",
        "originType": "species",
        "description": "You have resistance to fire damage."
      },
      {
        "id": "feature-14",
        "name": "Infernal Legacy",
        "source": "Race",
        "group": "other",
        "originType": "species",
        "description": "You know the thaumaturgy cantrip. [3rd] You can cast hellish rebuke (2nd) once per long rest. [5th] You can cast darkness once per long rest. CHA is your spellcasting ability."
      },
      {
        "id": "feature-15",
        "name": "Ability Score Increase",
        "source": "Race",
        "group": "other",
        "originType": "species",
        "description": "Your Intelligence score increases by 1, and your Charisma score increases by 2."
      },
      {
        "id": "feature-16",
        "name": "Dazzling Footwork",
        "source": "College of Dance",
        "group": "other",
        "originType": "class",
        "description": "While you aren’t wearing armor or a Shield, you gain the following benefits:\n• You have Advantage on Charisma (Performance) checks that involves you dancing.\n• Your base AC is 17 (10 + Dex. modifier + Cha. modifier).\n• When you expend a use of your Bardic Inspiration as part of an action, Bonus Action, or Reaction, you can make an Unarmed Strike as part of the same action.\n• You can use Dex. instead of Str. for the attack rolls of your Unarmed Strike. When you deal damage with it, you can deal +2 Bludgeoning damage."
      },
      {
        "id": "feature-17",
        "name": "Core Bard Traits",
        "source": "Bard",
        "group": "other",
        "originType": "class",
        "description": "As a Level 1 Character you gain: Gain all the traits in the Core Bard Traits table. Gain the Bard’s level 1 features. Core Bard Traits Primary Ability Charisma Hit Point Die D8 per Bard level Saving Throw Proficiencies Dexterity and Charisma Skill Proficiencies *Choose any 3 skills* (see chapter 1 of the *Player’s Handbook*) Weapon Proficiencies Simple weapons Tool Proficiencies *Choose 3 Musical Instruments* (see chapter 6 of the *Player’s Handbook*) Armor Training Light armor Starting Equipment *Choose A or B:* (A) Leather Armor, 2 Daggers, Musical Instrument of your choice, Entertainer’s Pack, and 19 GP; or (B) 90 GP"
      },
      {
        "id": "feature-18",
        "name": "Spellcasting",
        "source": "Bard",
        "group": "other",
        "originType": "class",
        "description": "You can cast spells through your bardic arts. Charisma is your spellcasting ability for your Bard spells (Spell DC 16, Spell Attack 8). You can use a Musical Instrument as a Spellcasting Focus for your Bard spells."
      },
      {
        "id": "feature-19",
        "name": "Expertise",
        "source": "Bard",
        "group": "other",
        "originType": "class",
        "description": "You gain Expertise in two skill proficiencies of your choice."
      },
      {
        "id": "feature-20",
        "name": "Jack of All Trades",
        "source": "Bard",
        "group": "other",
        "originType": "class",
        "description": "You can add half your Proficiency Bonus (1) to ability checks you make that uses a skill proficiency you lack and that doesn’t otherwise use your Proficiency Bonus."
      },
      {
        "id": "feature-21",
        "name": "Bard Subclass",
        "source": "Bard",
        "group": "other",
        "originType": "class",
        "description": "You gain a Bard subclass of your choice. A subclass is a specialization that grants you features at certain Bard levels. For the rest of your career, you gain each of your subclass’s features that are of your Bard level or lower."
      },
      {
        "id": "feature-22",
        "name": "Ability Score Improvement",
        "source": "Bard",
        "group": "other",
        "originType": "class",
        "description": "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify. You gain this feature again at Bard levels 8, 12, and 16."
      },
      {
        "id": "feature-23",
        "name": "Font of Inspiration",
        "source": "Bard",
        "group": "other",
        "originType": "class",
        "description": "You now regain all expended uses of Bardic Inspiration when you finish a Short or Long Rest. In addition, you can expend a spell slot (no action required) to regain one expended use of Bardic Inspiration."
      },
      {
        "id": "feature-24",
        "name": "Grappler",
        "source": "Feat",
        "group": "other",
        "originType": "feat",
        "description": "**Ability Score Increase.** Increase your Str. or Dex. by 1. **Punch and Grab.** On your turn, when you hit a creature with an Unarmed Strike you can use both the Damage and the Grapple option. You can use this benefit only once per turn. **Attack Advantage.** You have Advantage on attack rolls against a creature Grappled by you. **Fast Wrestler.** You don't have to spend extra movement to move a creature Grappled by you if the creature is your size or smaller."
      },
      {
        "id": "feature-25",
        "name": "Vampire Touched",
        "source": "Feat",
        "group": "other",
        "originType": "feat",
        "description": "**Ability Score Increase.** Increase your Intelligence, Wisdom, or Charisma score by 1, to a maximum of 20. **Vampire Magic.** Choose one level 1 spell from the Enchantment or Illusion school of magic. You always have that spell and the Spider Climb spell prepared. You can cast each of these spells without expending a spell slot, but when you cast Spider Climb this way, you must target yourself, and you must finish a Long Rest before you can cast each spell in this way again. You can also cast either spell using spell slots you have of the appropriate level. Your spellcasting ability for the spells is the ability increased by this feat."
      },
      {
        "id": "feature-26",
        "name": "Charisma",
        "source": "Vampire Touched",
        "group": "other",
        "originType": "feat",
        "description": "Charisma is the ability score you use for this feat."
      },
      {
        "id": "feature-27",
        "name": "Criminal Contact",
        "source": "Background",
        "group": "other",
        "originType": "background",
        "description": "You have a reliable and trustworthy contact who acts as your liaison to a network of other criminals. You know how to get messages to and from your contact, even over great distances; specifically, you know the local messengers, corrupt caravan masters, and seedy sailors who can deliver messages for you."
      }
    ],
    "attacks": [
      {
        "id": "attack-unarmed",
        "name": "Unarmed Strike",
        "attackType": "melee",
        "attackBonus": 2,
        "damage": "0",
        "damageType": "Bludgeoning",
        "properties": [],
        "range": "5 ft.",
        "proficient": true
      },
      {
        "id": "attack-0",
        "name": "Rapier, +1",
        "attackType": "melee",
        "attackBonus": 3,
        "damage": "1d8 +3",
        "damageType": "Piercing",
        "properties": ["Finesse"],
        "category": "Martial",
        "range": "5 ft.",
        "proficient": false
      },
      {
        "id": "attack-1",
        "name": "Crossbow, Hand",
        "attackType": "ranged",
        "attackBonus": 2,
        "damage": "1d6 +2",
        "damageType": "Piercing",
        "properties": ["Ammunition", "Light", "Loading"],
        "category": "Martial",
        "range": "30/120 ft.",
        "proficient": false
      }
    ],
    "notes": "A College of Dance bard who fights unarmored and up close — Dazzling Footwork and Bardic Inspiration make her as much a battlefield conductor as a performer. Social scenes and chances to show off both work.",
    "quickNotes": [
      {
        "id": "qn-esmeralda-1",
        "text": "Promised a song to the tavern owner's daughter",
        "createdAt": "2026-07-05T10:00:00.000Z"
      }
    ],
    "subclass": "College of Dance",
    "spellcasting": {
      "modifier": 5,
      "attack": 8,
      "saveDc": 16
    },
    "avatarUrl": "https://www.dndbeyond.com/avatars/46249/732/1581111423-138454566.jpeg?width=150&height=150&fit=crop&quality=95&auto=webp",
    "synced": false
  }
];
