import { Character, extractDndBeyondCharacterId } from "./types";
import { parseDdbCharacter } from "./ddbParser";

export async function fetchAndParseDdbCharacter(character: Character): Promise<Character> {
  const ddbId = character.dndBeyondUrl ? extractDndBeyondCharacterId(character.dndBeyondUrl) : null;
  if (!ddbId) {
    throw new Error("This character doesn't have a valid D&D Beyond link.");
  }

  const res = await fetch(`/api/ddb/${ddbId}`);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || `Sync error (${res.status}).`);
  }

  return parseDdbCharacter(json, character);
}
