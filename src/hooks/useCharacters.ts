"use client";

import { useCallback, useRef, useState } from "react";
import { Character } from "@/lib/types";
import { patchCharacter } from "@/lib/characterApi";
import { apiFetch, parseJsonOrThrow } from "@/lib/apiClient";

export function useCharacters(initialCharacters: Character[]) {
  const [characters, setCharacters] = useState<Character[]>(initialCharacters);
  // One PATCH chain per character id — two `updateCharacter` calls close
  // together for the *same* character (e.g. flag a quick note, then remove
  // it moments later) used to fire two independent requests with no
  // ordering guarantee: whichever one's response happened to arrive last
  // won, even if it was the *older* of the two (a slower first request
  // landing after a faster second one silently un-does the second). Queuing
  // each id's requests one after another — not sending the next until the
  // previous has actually round-tripped — makes the server (and this local
  // state) always settle on whichever update was issued *last*, matching
  // what the user actually did. Different characters' queues are
  // independent, so this never serializes unrelated updates.
  const pendingByIdRef = useRef<Map<string, Promise<void>>>(new Map());

  const addFromUrl = useCallback(async (url: string, campaignId: string): Promise<Character> => {
    const res = await apiFetch("/api/characters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, campaignId }),
    });
    const character = await parseJsonOrThrow<Character>(res, "Failed to add character.");
    setCharacters((prev) => [...prev, character]);
    return character;
  }, []);

  const updateCharacter = useCallback(async (id: string, updates: Partial<Character>) => {
    setCharacters((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    const previous = pendingByIdRef.current.get(id) ?? Promise.resolve();
    const next = previous
      .catch(() => {}) // an earlier failed request must not block this one from ever sending
      .then(() => patchCharacter(id, updates))
      .then((updated) => {
        setCharacters((prev) => prev.map((c) => (c.id === id ? updated : c)));
      });
    pendingByIdRef.current.set(id, next);
    await next;
  }, []);

  const removeCharacter = useCallback(async (id: string) => {
    setCharacters((prev) => prev.filter((c) => c.id !== id));
    await apiFetch(`/api/characters/${id}`, { method: "DELETE" });
  }, []);

  const reorderCharacters = useCallback(async (orderedIds: string[]) => {
    setCharacters((prev) => {
      const byId = new Map(prev.map((c) => [c.id, c]));
      return orderedIds.map((id) => byId.get(id)).filter((c): c is Character => Boolean(c));
    });
    await apiFetch("/api/characters/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds }),
    });
  }, []);

  return {
    characters,
    addFromUrl,
    updateCharacter,
    removeCharacter,
    reorderCharacters,
  };
}
