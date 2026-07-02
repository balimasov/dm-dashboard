"use client";

import { useSyncExternalStore } from "react";
import { Character } from "@/lib/types";
import {
  subscribe,
  getSnapshot,
  getServerSnapshot,
  addCharacterFromUrl,
  removeCharacterById,
  updateCharacterById,
} from "@/lib/storage";

export function useCharacters() {
  const characters = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return {
    characters,
    addFromUrl: (url: string): Character => addCharacterFromUrl(url),
    removeCharacter: (id: string) => removeCharacterById(id),
    updateCharacter: (id: string, updates: Partial<Character>) =>
      updateCharacterById(id, updates),
  };
}
