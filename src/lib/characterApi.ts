import { Character } from "./types";

async function parseJsonOrThrow(res: Response, fallbackMessage: string): Promise<unknown> {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data as { error?: string } | null)?.error || fallbackMessage);
  }
  return data;
}

export async function patchCharacter(id: string, updates: Partial<Character>): Promise<Character> {
  const res = await fetch(`/api/characters/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  return (await parseJsonOrThrow(res, "Не вдалося зберегти персонажа.")) as Character;
}
