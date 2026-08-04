import { createHash } from "crypto";

/**
 * Short-TTL in-memory cache for `/api/assistant/suggest` — avoids paying for
 * a fresh LLM call when a DM reopens the panel or asks the exact same "Best
 * move" question (or the exact same "Запитати" question) seconds after the
 * last answer, with nothing on the sheet having changed in between. Safe to
 * keep this in a plain module-level `Map` (not Redis or the SQLite `db.ts`)
 * because the app runs as one long-lived Node process (Railway), not
 * stateless serverless functions that would lose it between invocations.
 *
 * Generic over the cached value's shape (`AiTacticalResponse` for a
 * `"plan"` intent, `AiReply` for an `"ask"` intent) — this module only ever
 * stores/returns whatever `route.ts` gives it, it doesn't need to know
 * which shape that is.
 *
 * The key is a hash of the *exact* sheet context text the request would
 * build, not just the character/creature id — the moment anything relevant
 * changes (HP, a spent spell slot, a new condition, an item's quantity),
 * `characterAssistantContext`/`creatureAssistantContext` produce different
 * text, which changes the hash and misses the cache automatically. No
 * separate invalidation logic to keep correct as new fields get added to
 * that context text later.
 */
const TTL_MS = 60_000;
const MAX_ENTRIES = 500;

interface CacheEntry {
  response: unknown;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();

/**
 * `intent` ("plan"/"ask") and `mode` (`response_mode` for a plan, or the
 * literal `"ask"` for a chat reply) are both part of the key so the two
 * request shapes never collide on the same entry even when `situation`
 * happens to match. `previousContext` (the prior turn's summary/reply a
 * follow-up builds on — see the prompt's FOLLOW-UP REQUESTS section) is
 * part of the key for the same reason: it's real input the model
 * conditions its answer on, so a follow-up and a plain repeat of the same
 * question must never collide on the same cache entry.
 *
 * `reasoningEffort` (plan only — see `route.ts`'s own comment) is part of
 * the key for the same reason as everything else here: it's a real input
 * that changes what the model actually returns, not just bookkeeping. Left
 * out of the key, a DM comparing effort levels by re-asking the identical
 * situation seconds apart would silently get back the *first* level's
 * cached answer relabeled as the second — exactly defeating the comparison
 * this parameter exists for.
 */
export function assistantCacheKey(
  entityId: string,
  intent: string,
  mode: string,
  situation: string | undefined,
  context: string,
  previousContext?: string,
  reasoningEffort?: string
): string {
  return createHash("sha256")
    .update(`${entityId} ${intent} ${mode} ${situation ?? ""} ${previousContext ?? ""} ${context} ${reasoningEffort ?? ""}`)
    .digest("hex");
}

export function getCachedAssistantResponse<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    store.delete(key);
    return undefined;
  }
  return entry.response as T;
}

/** Evicts the single oldest entry (`Map` preserves insertion order) once the cache is full — a cheap enough approximation of LRU for a cache this size, without pulling in a real LRU library for it. */
export function setCachedAssistantResponse<T>(key: string, response: T): void {
  if (store.size >= MAX_ENTRIES && !store.has(key)) {
    const oldestKey = store.keys().next().value;
    if (oldestKey !== undefined) store.delete(oldestKey);
  }
  store.set(key, { response, expiresAt: Date.now() + TTL_MS });
}

/** Test-only escape hatch — the module-level `store` would otherwise leak entries between unrelated test cases. */
export function _clearAssistantResponseCacheForTests(): void {
  store.clear();
}
