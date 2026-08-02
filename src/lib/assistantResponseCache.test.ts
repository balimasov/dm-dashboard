import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  _clearAssistantResponseCacheForTests,
  assistantCacheKey,
  getCachedAssistantResponse,
  setCachedAssistantResponse,
} from "./assistantResponseCache";
import { AiTacticalResponse } from "./schemas";

function makeResponse(summary: string): AiTacticalResponse {
  return { game_plan: { summary }, options: [] };
}

beforeEach(() => {
  _clearAssistantResponseCacheForTests();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("assistantCacheKey", () => {
  test("produces the same key for identical inputs", () => {
    const a = assistantCacheKey("char-1", "overview", undefined, "sheet text");
    const b = assistantCacheKey("char-1", "overview", undefined, "sheet text");
    expect(a).toBe(b);
  });

  test("produces a different key when the entity id, mode, situation, or context text differs", () => {
    const base = assistantCacheKey("char-1", "overview", undefined, "sheet text");
    expect(assistantCacheKey("char-2", "overview", undefined, "sheet text")).not.toBe(base);
    expect(assistantCacheKey("char-1", "focused", undefined, "sheet text")).not.toBe(base);
    expect(assistantCacheKey("char-1", "overview", "flank the archer", "sheet text")).not.toBe(base);
    expect(assistantCacheKey("char-1", "overview", undefined, "sheet text", "earlier plan summary")).not.toBe(base);
    // The character's *current state* (HP, slots, conditions) lives inside
    // the context text — changing it must miss the cache, since the old
    // answer may no longer be legal or optimal.
    expect(assistantCacheKey("char-1", "overview", undefined, "sheet text, HP 3/20")).not.toBe(base);
  });
});

describe("getCachedAssistantResponse / setCachedAssistantResponse", () => {
  test("returns undefined for a key that was never set", () => {
    expect(getCachedAssistantResponse("missing")).toBeUndefined();
  });

  test("returns what was set for that exact key", () => {
    const key = assistantCacheKey("char-1", "overview", undefined, "sheet text");
    setCachedAssistantResponse(key, makeResponse("Attack with your longsword."));

    expect(getCachedAssistantResponse(key)).toEqual(makeResponse("Attack with your longsword."));
  });

  test("expires an entry after its TTL", () => {
    vi.useFakeTimers();
    const key = assistantCacheKey("char-1", "overview", undefined, "sheet text");
    setCachedAssistantResponse(key, makeResponse("Attack with your longsword."));

    vi.advanceTimersByTime(59_000);
    expect(getCachedAssistantResponse(key)).toBeDefined();

    vi.advanceTimersByTime(2_000);
    expect(getCachedAssistantResponse(key)).toBeUndefined();
  });

  test("evicts the oldest entry once the cache is full, keeping the newest ones", () => {
    for (let i = 0; i < 501; i++) {
      setCachedAssistantResponse(assistantCacheKey(`char-${i}`, "overview", undefined, "sheet text"), makeResponse(`plan ${i}`));
    }

    expect(getCachedAssistantResponse(assistantCacheKey("char-0", "overview", undefined, "sheet text"))).toBeUndefined();
    expect(getCachedAssistantResponse(assistantCacheKey("char-500", "overview", undefined, "sheet text"))).toEqual(makeResponse("plan 500"));
  });
});
