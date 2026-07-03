"use client";

import { useCallback, useState } from "react";
import { Character } from "@/lib/types";
import { patchCharacter } from "@/lib/characterApi";

async function parseJsonOrThrow(res: Response, fallbackMessage: string): Promise<unknown> {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data as { error?: string } | null)?.error || fallbackMessage);
  }
  return data;
}

export function useCharacters(initialCharacters: Character[]) {
  const [characters, setCharacters] = useState<Character[]>(initialCharacters);

  const addFromUrl = useCallback(async (url: string): Promise<Character> => {
    const res = await fetch("/api/characters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const character = (await parseJsonOrThrow(res, "Не вдалося додати персонажа.")) as Character;
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
    await fetch(`/api/characters/${id}`, { method: "DELETE" });
  }, []);

  const reorderCharacters = useCallback(async (orderedIds: string[]) => {
    setCharacters((prev) => {
      const byId = new Map(prev.map((c) => [c.id, c]));
      return orderedIds.map((id) => byId.get(id)).filter((c): c is Character => Boolean(c));
    });
    await fetch("/api/characters/reorder", {
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
