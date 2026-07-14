import { describe, expect, it } from "vitest";
import { demoCharacters } from "./mockData";
import { campaignUpdateSchema, characterUpdateSchema, creatureUpdateSchema } from "./schemas";
import { Campaign, Creature } from "./types";

/** `id` is intentionally not part of the PATCH schema — routes always force `id: existing.id` themselves, so a body carrying one is expected to have it stripped. */
function keysExceptId(obj: object): string[] {
  return Object.keys(obj)
    .filter((k) => k !== "id")
    .sort();
}

describe("characterUpdateSchema", () => {
  it("accepts every field on the real demo characters without dropping any", () => {
    for (const character of demoCharacters) {
      const result = characterUpdateSchema.safeParse(character);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(keysExceptId(result.data)).toEqual(keysExceptId(character));
      }
    }
  });

  it("rejects a body with the wrong type for a known field", () => {
    const result = characterUpdateSchema.safeParse({ level: "five" });
    expect(result.success).toBe(false);
  });
});

describe("creatureUpdateSchema", () => {
  const sampleCreature: Creature = {
    id: "creature-1",
    campaignId: "campaign-1",
    category: "companion",
    templateName: "Otherworldly Steed",
    name: "Thunder",
    creatureType: "Celestial",
    size: "Large",
    ac: 13,
    armorDesc: "natural armor",
    hp: 20,
    maxHp: 25,
    hitDice: "3d10",
    tempHp: 0,
    speed: 60,
    speedDetail: "60 ft., fly 60 ft.",
    initiativeBonus: 1,
    stats: { str: 18, dex: 12, con: 14, int: 6, wis: 12, cha: 8 },
    savingThrows: { str: 4, dex: 1 },
    senses: "Passive Perception 11",
    languages: "Telepathy 1 mile",
    challengeRating: "None",
    skills: "Perception +1",
    traits: [{ name: "Life Bond", description: "Regains HP with you.", group: "trait" }],
    conditions: [],
    exhaustion: 0,
    concentrating: false,
    deathSaves: { successes: 0, failures: 0 },
    ownerCharacterId: "demo-lilith",
    source: "Find Steed",
    notes: "Summoned mount.",
    quickNotes: [{ id: "qn-1", text: "Watch its HP", createdAt: "2026-07-05T10:00:00.000Z" }],
    flaggedTraits: ["Life Bond"],
    hidden: false,
  };

  it("accepts every field on a realistic full creature", () => {
    const result = creatureUpdateSchema.safeParse(sampleCreature);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(keysExceptId(result.data)).toEqual(keysExceptId(sampleCreature));
    }
  });

  it("accepts a small partial update like a card would send", () => {
    const result = creatureUpdateSchema.safeParse({ hp: 15, deathSaves: { successes: 0, failures: 0 } });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid category", () => {
    const result = creatureUpdateSchema.safeParse({ category: "villain" });
    expect(result.success).toBe(false);
  });
});

describe("campaignUpdateSchema", () => {
  const sampleCampaign: Campaign = {
    id: "campaign-1",
    name: "Curse of the Ember Crown",
    notes: "A homebrew campaign about a cursed royal line.",
    createdAt: "2026-01-01T00:00:00.000Z",
    logoUrl: "data:image/png;base64,abc",
    quickLinks: [{ id: "link-1", label: "House rules", url: "https://example.com/rules" }],
  };

  it("accepts every field on a realistic full campaign", () => {
    const result = campaignUpdateSchema.safeParse(sampleCampaign);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(keysExceptId(result.data)).toEqual(keysExceptId(sampleCampaign));
    }
  });

  it("rejects a body that isn't an object", () => {
    const result = campaignUpdateSchema.safeParse("not an object");
    expect(result.success).toBe(false);
  });
});
