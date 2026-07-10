"use client";

import { useCallback, useState } from "react";
import { Character } from "@/lib/types";
import { patchCharacter } from "@/lib/characterApi";
import { apiFetch, parseJsonOrThrow } from "@/lib/apiClient";

export function useCharacters(initialCharacters: Character[]) {
  const [characters, setCharacters] = useState<Character[]>(initialCharacters);

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
    const updated = await patchCharacter(id, updates);
    setCharacters((prev) => prev.map((c) => (c.id === id ? updated : c)));
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
