import { Character, extractDndBeyondCharacterId } from "./types";
import { parseDdbCharacter } from "./ddbParser";

export async function fetchAndParseDdbCharacter(character: Character): Promise<Character> {
  const ddbId = character.dndBeyondUrl ? extractDndBeyondCharacterId(character.dndBeyondUrl) : null;
  if (!ddbId) {
    throw new Error("У персонажа немає коректного лінка на D&D Beyond.");
  }

  const res = await fetch(`/api/ddb/${ddbId}`);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || `Помилка синхронізації (${res.status}).`);
  }

  return parseDdbCharacter(json, character);
}
