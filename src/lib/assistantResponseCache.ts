import { createHash } from "crypto";
import { AiTacticalResponse } from "./schemas";

/**
 * Short-TTL in-memory cache for `/api/assistant/suggest` — avoids paying for
 * a fresh LLM call when a DM reopens the panel or asks the exact same "Best
 * move" question seconds after the last answer, with nothing on the sheet
 * having changed in between. Safe to keep this in a plain module-level `Map`
 * (not Redis or the SQLite `db.ts`) because the app runs as one long-lived
 * Node process (Railway), not stateless serverless functions that would
 * lose it between invocations.
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
  response: AiTacticalResponse;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();

/**
 * `previousSummary` (the prior answer a follow-up request builds on — see
 * the prompt's FOLLOW-UP REQUESTS section) is part of the key for the same
 * reason `situation`/`context` are: it's real input the model conditions
 * its answer on, so a follow-up and a plain repeat of the same question
 * must never collide on the same cache entry.
 */
export function assistantCacheKey(
  entityId: string,
  responseMode: string,
  situation: string | undefined,
  context: string,
  previousSummary?: string
): string {
  return createHash("sha256")
    .update(`${entityId} ${responseMode} ${situation ?? ""} ${previousSummary ?? ""} ${context}`)
    .digest("hex");
}

export function getCachedAssistantResponse(key: string): AiTacticalResponse | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    store.delete(key);
    return undefined;
  }
  return entry.response;
}

/** Evicts the single oldest entry (`Map` preserves insertion order) once the cache is full — a cheap enough approximation of LRU for a cache this size, without pulling in a real LRU library for it. */
export function setCachedAssistantResponse(key: string, response: AiTacticalResponse): void {
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
