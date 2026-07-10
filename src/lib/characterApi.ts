import { Character } from "./types";
import { apiFetch, parseJsonOrThrow } from "./apiClient";

export async function patchCharacter(id: string, updates: Partial<Character>): Promise<Character> {
  const res = await apiFetch(`/api/characters/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  return parseJsonOrThrow<Character>(res, "Failed to save character.");
}
