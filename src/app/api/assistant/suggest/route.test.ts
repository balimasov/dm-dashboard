import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Campaign, Character, Creature } from "@/lib/types";
import { _clearAssistantResponseCacheForTests } from "@/lib/assistantResponseCache";

/**
 * Mocks the two real I/O boundaries `route.ts` talks to — SQLite (`db.ts`)
 * and the network call to OpenAI (`fetchWithRetry`) — so every test below
 * drives the actual `POST` handler's own branching (entity resolution,
 * plan-vs-ask, cache hit/miss, previous-turn derivation, and every upstream-
 * error shape `callAssistantModel` maps to a response) without a real
 * database file or network access. Nothing here was covered by any existing
 * test before this file: `assistantContext.test.ts`/`assistantResponseCache.
 * test.ts` cover the pieces `route.ts` calls, never the orchestration that
 * wires them together.
 */
vi.mock("@/lib/db", () => ({
  getCampaign: vi.fn(),
  getCharacter: vi.fn(),
  getCreature: vi.fn(),
  listAssistantMessages: vi.fn(),
  listCharacters: vi.fn(),
  listCreatures: vi.fn(),
  createAssistantMessage: vi.fn(),
}));
vi.mock("@/lib/fetchWithRetry", () => ({ fetchWithRetry: vi.fn() }));

import * as db from "@/lib/db";
import { fetchWithRetry } from "@/lib/fetchWithRetry";
import { POST } from "./route";

function makeCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return { id: "camp", name: "Camp", notes: "", createdAt: "2024-01-01T00:00:00.000Z", ...overrides };
}

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

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/assistant/suggest", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** A minimal OpenAI chat-completions response carrying `content` as the model's raw (already-JSON-stringified) structured output. */
function openAiSuccess(content: unknown, status = 200): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const VALID_PLAN = { game_plan: { summary: "Attack the nearest enemy for solid damage." }, options: [] };
const VALID_REPLY = { reply: "You have 8 HP left." };

describe("POST /api/assistant/suggest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _clearAssistantResponseCacheForTests();
    process.env.OPENAI_API_KEY = "test-key";
    vi.mocked(db.createAssistantMessage).mockImplementation(
      (input) => ({ id: "msg-1", createdAt: "2024-01-02T00:00:00.000Z", ...input }) as never
    );
    vi.mocked(db.listCharacters).mockReturnValue([]);
    vi.mocked(db.listCreatures).mockReturnValue([]);
    vi.mocked(db.listAssistantMessages).mockReturnValue([]);
  });

  test("404s when the campaign doesn't exist", async () => {
    vi.mocked(db.getCampaign).mockReturnValue(null);
    const res = await POST(postRequest({ campaignId: "camp", characterId: "char-1" }));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/Campaign not found/);
    expect(fetchWithRetry).not.toHaveBeenCalled();
  });

  test("404s when the character doesn't exist", async () => {
    vi.mocked(db.getCampaign).mockReturnValue(makeCampaign());
    vi.mocked(db.getCharacter).mockReturnValue(null);
    const res = await POST(postRequest({ campaignId: "camp", characterId: "char-1" }));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/Character not found/);
  });

  test("404s when the character belongs to a different campaign", async () => {
    vi.mocked(db.getCampaign).mockReturnValue(makeCampaign());
    vi.mocked(db.getCharacter).mockReturnValue(makeCharacter({ name: "Elowen", campaignId: "other-camp" }));
    const res = await POST(postRequest({ campaignId: "camp", characterId: "char-1" }));
    expect(res.status).toBe(404);
  });

  test("404s when the creature doesn't exist", async () => {
    vi.mocked(db.getCampaign).mockReturnValue(makeCampaign());
    vi.mocked(db.getCreature).mockReturnValue(null);
    const res = await POST(postRequest({ campaignId: "camp", creatureId: "cr-1" }));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/Creature not found/);
  });

  test("500s with a setup hint when OPENAI_API_KEY is unset", async () => {
    delete process.env.OPENAI_API_KEY;
    vi.mocked(db.getCampaign).mockReturnValue(makeCampaign());
    vi.mocked(db.getCharacter).mockReturnValue(makeCharacter({ name: "Elowen" }));
    const res = await POST(postRequest({ campaignId: "camp", characterId: "char-1" }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/OPENAI_API_KEY/);
  });

  test("returns a plan message on success and sends response_mode/output_language to the model", async () => {
    vi.mocked(db.getCampaign).mockReturnValue(makeCampaign());
    vi.mocked(db.getCharacter).mockReturnValue(makeCharacter({ name: "Elowen" }));
    vi.mocked(fetchWithRetry).mockResolvedValue(openAiSuccess(VALID_PLAN));

    const res = await POST(postRequest({ campaignId: "camp", characterId: "char-1", intent: "plan", response_mode: "focused", situation: "a dragon is near" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message.kind).toBe("plan");
    expect(json.message.plan).toEqual(VALID_PLAN);

    const [, init] = vi.mocked(fetchWithRetry).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.messages[1].content).toContain("response_mode: focused");
    expect(body.messages[1].content).toContain("output_language: Ukrainian");
    expect(body.messages[1].content).toContain("user_request: a dragon is near");

    expect(db.createAssistantMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "plan", entityKind: "character", responseMode: "focused", plan: VALID_PLAN })
    );
  });

  test("returns a reply message on success for an ask, and derives previous_summary from the last plan", async () => {
    vi.mocked(db.getCampaign).mockReturnValue(makeCampaign());
    vi.mocked(db.getCharacter).mockReturnValue(makeCharacter({ name: "Elowen" }));
    vi.mocked(db.listAssistantMessages).mockReturnValue([
      {
        id: "m1",
        campaignId: "camp",
        entityId: "char-1",
        entityKind: "character",
        entityName: "Elowen",
        query: "assume I already used Action Surge",
        createdAt: "2024-01-01T00:00:00.000Z",
        kind: "plan",
        responseMode: "overview",
        plan: { game_plan: { summary: "Cast Fireball on the group." }, options: [] },
      },
    ]);
    vi.mocked(fetchWithRetry).mockResolvedValue(openAiSuccess(VALID_REPLY));

    const res = await POST(postRequest({ campaignId: "camp", characterId: "char-1", intent: "ask", situation: "why is that best?" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message.kind).toBe("reply");
    expect(json.message.reply).toBe(VALID_REPLY.reply);

    const [, init] = vi.mocked(fetchWithRetry).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.messages[1].content).toContain("assume I already used Action Surge");
    expect(body.messages[1].content).toContain("Cast Fireball on the group.");
  });

  test("derives previous_summary from a prior reply, not just a prior plan", async () => {
    vi.mocked(db.getCampaign).mockReturnValue(makeCampaign());
    vi.mocked(db.getCharacter).mockReturnValue(makeCharacter({ name: "Elowen" }));
    vi.mocked(db.listAssistantMessages).mockReturnValue([
      {
        id: "m1",
        campaignId: "camp",
        entityId: "char-1",
        entityKind: "character",
        entityName: "Elowen",
        query: "how much HP do I have?",
        createdAt: "2024-01-01T00:00:00.000Z",
        kind: "reply",
        reply: "You have 8 out of 20 HP.",
      },
    ]);
    vi.mocked(fetchWithRetry).mockResolvedValue(openAiSuccess(VALID_REPLY));

    await POST(postRequest({ campaignId: "camp", characterId: "char-1", intent: "ask", situation: "is that bad?" }));

    const [, init] = vi.mocked(fetchWithRetry).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.messages[1].content).toContain("You have 8 out of 20 HP.");
  });

  test("resolves a creature's owner name from the party roster", async () => {
    vi.mocked(db.getCampaign).mockReturnValue(makeCampaign());
    vi.mocked(db.getCreature).mockReturnValue(makeCreature({ name: "Rosatar", ownerCharacterId: "char-1" }));
    vi.mocked(db.listCharacters).mockReturnValue([makeCharacter({ name: "Lilith", id: "char-1" })]);
    vi.mocked(fetchWithRetry).mockResolvedValue(openAiSuccess(VALID_PLAN));

    await POST(postRequest({ campaignId: "camp", creatureId: "cr-1" }));

    const [, init] = vi.mocked(fetchWithRetry).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.messages[1].content).toContain("Owned/commanded by: Lilith");
  });

  test("skips a second model call for the exact same question, but still logs a fresh conversation turn", async () => {
    vi.mocked(db.getCampaign).mockReturnValue(makeCampaign());
    vi.mocked(db.getCharacter).mockReturnValue(makeCharacter({ name: "Elowen" }));
    vi.mocked(fetchWithRetry).mockResolvedValue(openAiSuccess(VALID_REPLY));

    const body = { campaignId: "camp", characterId: "char-1", intent: "ask", situation: "how much HP do I have?" };
    await POST(postRequest(body));
    await POST(postRequest(body));

    expect(fetchWithRetry).toHaveBeenCalledTimes(1);
    expect(db.createAssistantMessage).toHaveBeenCalledTimes(2);
  });

  test("surfaces the model's own refusal message", async () => {
    vi.mocked(db.getCampaign).mockReturnValue(makeCampaign());
    vi.mocked(db.getCharacter).mockReturnValue(makeCharacter({ name: "Elowen" }));
    vi.mocked(fetchWithRetry).mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { refusal: "I can't help with that." } }] }), { status: 200 })
    );

    const res = await POST(postRequest({ campaignId: "camp", characterId: "char-1" }));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("I can't help with that.");
  });

  test("502s when the model returns empty content", async () => {
    vi.mocked(db.getCampaign).mockReturnValue(makeCampaign());
    vi.mocked(db.getCharacter).mockReturnValue(makeCharacter({ name: "Elowen" }));
    vi.mocked(fetchWithRetry).mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: {} }] }), { status: 200 }));

    const res = await POST(postRequest({ campaignId: "camp", characterId: "char-1" }));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/empty response/);
  });

  test("502s when the model's content isn't valid JSON", async () => {
    vi.mocked(db.getCampaign).mockReturnValue(makeCampaign());
    vi.mocked(db.getCharacter).mockReturnValue(makeCharacter({ name: "Elowen" }));
    vi.mocked(fetchWithRetry).mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: "not json{" } }] }), { status: 200 })
    );

    const res = await POST(postRequest({ campaignId: "camp", characterId: "char-1" }));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/malformed data/);
  });

  test("502s when the model's JSON doesn't match the expected schema", async () => {
    vi.mocked(db.getCampaign).mockReturnValue(makeCampaign());
    vi.mocked(db.getCharacter).mockReturnValue(makeCharacter({ name: "Elowen" }));
    vi.mocked(fetchWithRetry).mockResolvedValue(openAiSuccess({ nonsense: true }));

    const res = await POST(postRequest({ campaignId: "camp", characterId: "char-1" }));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/didn't match the expected format/);
  });

  test("maps a non-ok upstream response to 502, using OpenAI's own error message", async () => {
    vi.mocked(db.getCampaign).mockReturnValue(makeCampaign());
    vi.mocked(db.getCharacter).mockReturnValue(makeCharacter({ name: "Elowen" }));
    vi.mocked(fetchWithRetry).mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "Rate limit exceeded." } }), { status: 429 })
    );

    const res = await POST(postRequest({ campaignId: "camp", characterId: "char-1" }));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("Rate limit exceeded.");
  });

  test("maps a 401/403 upstream response (bad API key) to 500, not 502", async () => {
    vi.mocked(db.getCampaign).mockReturnValue(makeCampaign());
    vi.mocked(db.getCharacter).mockReturnValue(makeCharacter({ name: "Elowen" }));
    vi.mocked(fetchWithRetry).mockResolvedValue(new Response(JSON.stringify({ error: { message: "Invalid API key." } }), { status: 401 }));

    const res = await POST(postRequest({ campaignId: "camp", characterId: "char-1" }));
    expect(res.status).toBe(500);
  });

  test("502s with a connectivity message when the upstream call throws", async () => {
    vi.mocked(db.getCampaign).mockReturnValue(makeCampaign());
    vi.mocked(db.getCharacter).mockReturnValue(makeCharacter({ name: "Elowen" }));
    vi.mocked(fetchWithRetry).mockRejectedValue(new Error("network down"));

    const res = await POST(postRequest({ campaignId: "camp", characterId: "char-1" }));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/Couldn't reach/);
  });

  test("502s with a timeout-specific message when the upstream call aborts on timeout", async () => {
    vi.mocked(db.getCampaign).mockReturnValue(makeCampaign());
    vi.mocked(db.getCharacter).mockReturnValue(makeCharacter({ name: "Elowen" }));
    vi.mocked(fetchWithRetry).mockRejectedValue(new DOMException("timed out", "TimeoutError"));

    const res = await POST(postRequest({ campaignId: "camp", characterId: "char-1" }));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/taking too long/);
  });

  test("400s on a request body that fails schema validation (e.g. neither characterId nor creatureId)", async () => {
    const res = await POST(postRequest({ campaignId: "camp" }));
    expect(res.status).toBe(400);
    expect(db.getCampaign).not.toHaveBeenCalled();
  });
});
