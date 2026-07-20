import { describe, expect, it } from "vitest";
import { demoCharacters } from "./mockData";
import {
  campaignUpdateSchema,
  characterUpdateSchema,
  creatureUpdateSchema,
  journalEntryCreateSchema,
  journalEntryUpdateSchema,
  journalSessionCreateSchema,
  journalSessionUpdateSchema,
} from "./schemas";
import { Campaign, Creature } from "./types";

/** `id` is intentionally not part of the PATCH schema — routes always force `id: existing.id` themselves, so a body carrying one is expected to have it stripped. */
function keysExceptId(obj: object): string[] {
  return Object.keys(obj)
    .filter((k) => k !== "id")
    .sort();
}

/** Same `id`-stripping exception as `keysExceptId`, but for a full deep-equality comparison instead of just a key list. */
function withoutId<T extends { id?: unknown }>(obj: T): Omit<T, "id"> {
  const rest = { ...obj };
  delete rest.id;
  return rest;
}

describe("characterUpdateSchema", () => {
  it("accepts every field on the real demo characters without dropping any", () => {
    for (const character of demoCharacters) {
      const result = characterUpdateSchema.safeParse(character);
      expect(result.success).toBe(true);
      if (result.success) {
        // Deep equality, not just top-level keys — a nested schema (e.g.
        // `knownSpellSchema`) silently strips any field on the spell/feature/
        // resource object it doesn't know about, and a top-level key
        // comparison alone can't see that (confirmed: this test still
        // passed with `tags`/`isAreaEffect`/`isReaction` missing from
        // `knownSpellSchema` for weeks after `KnownSpell` itself gained
        // them, since the demo characters never carried those fields to
        // begin with — see the dedicated regression test below).
        expect(result.data).toEqual(withoutId(character));
      }
    }
  });

  it("rejects a body with the wrong type for a known field", () => {
    const result = characterUpdateSchema.safeParse({ level: "five" });
    expect(result.success).toBe(false);
  });

  it("doesn't silently strip a spell's D&D Beyond tags/isAreaEffect/isReaction — a real sync PATCH carries these", () => {
    const character = {
      ...demoCharacters[0],
      knownSpells: [
        { id: "s1", name: "Fireball", level: 3, source: "Class", tags: ["Damage"], isAreaEffect: true, isReaction: false },
      ],
    };
    const result = characterUpdateSchema.safeParse(character);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.knownSpells).toEqual(character.knownSpells);
    }
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

describe("journalEntryCreateSchema", () => {
  it("accepts a minimal valid body with no sessionId", () => {
    const result = journalEntryCreateSchema.safeParse({ campaignId: "campaign-1", text: "<p>Hello</p>" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ campaignId: "campaign-1", text: "<p>Hello</p>" });
    }
  });

  it("accepts a body with an explicit sessionId", () => {
    const result = journalEntryCreateSchema.safeParse({ campaignId: "campaign-1", sessionId: "session-1", text: "<p>Hi</p>" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty text", () => {
    const result = journalEntryCreateSchema.safeParse({ campaignId: "campaign-1", text: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing campaignId", () => {
    const result = journalEntryCreateSchema.safeParse({ text: "<p>Hi</p>" });
    expect(result.success).toBe(false);
  });

  it("accepts a client-supplied timeZone alongside no sessionId", () => {
    const result = journalEntryCreateSchema.safeParse({
      campaignId: "campaign-1",
      timeZone: "America/New_York",
      text: "<p>Hi</p>",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ campaignId: "campaign-1", timeZone: "America/New_York", text: "<p>Hi</p>" });
    }
  });

  it("accepts an explicit audience", () => {
    const result = journalEntryCreateSchema.safeParse({ campaignId: "campaign-1", text: "<p>Hi</p>", audience: "party" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.audience).toBe("party");
    }
  });

  it("still accepts a body with no audience at all — Quick Note's exact request shape", () => {
    const result = journalEntryCreateSchema.safeParse({ campaignId: "campaign-1", text: "<p>Hi</p>" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.audience).toBeUndefined();
    }
  });

  it("rejects an invalid audience", () => {
    const result = journalEntryCreateSchema.safeParse({ campaignId: "campaign-1", text: "<p>Hi</p>", audience: "everyone" });
    expect(result.success).toBe(false);
  });
});

describe("journalEntryUpdateSchema", () => {
  it("accepts a valid text-only body", () => {
    const result = journalEntryUpdateSchema.safeParse({ text: "<p>Updated</p>" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ text: "<p>Updated</p>" });
    }
  });

  it("rejects an empty text", () => {
    const result = journalEntryUpdateSchema.safeParse({ text: "" });
    expect(result.success).toBe(false);
  });

  it("strips fields that must never be client-editable", () => {
    const result = journalEntryUpdateSchema.safeParse({
      text: "<p>Hi</p>",
      sessionId: "session-2",
      campaignId: "campaign-2",
      authorRole: "player",
      audience: "party",
      createdAt: "2020-01-01T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ text: "<p>Hi</p>" });
    }
  });
});

describe("journalSessionCreateSchema", () => {
  it("accepts a minimal valid body", () => {
    const result = journalSessionCreateSchema.safeParse({ campaignId: "campaign-1" });
    expect(result.success).toBe(true);
  });

  it("accepts an explicit timeZone", () => {
    const result = journalSessionCreateSchema.safeParse({ campaignId: "campaign-1", timeZone: "America/New_York" });
    expect(result.success).toBe(true);
  });

  it("rejects a missing campaignId", () => {
    const result = journalSessionCreateSchema.safeParse({ timeZone: "UTC" });
    expect(result.success).toBe(false);
  });
});

describe("journalSessionUpdateSchema", () => {
  it("accepts a title-only update", () => {
    const result = journalSessionUpdateSchema.safeParse({ title: "Session Zero" });
    expect(result.success).toBe(true);
  });

  it("accepts an archived-only update", () => {
    const result = journalSessionUpdateSchema.safeParse({ archived: true });
    expect(result.success).toBe(true);
  });

  it("accepts an empty body — both fields are optional", () => {
    const result = journalSessionUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects an empty title", () => {
    const result = journalSessionUpdateSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });
});
