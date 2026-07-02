import { Character, extractDndBeyondCharacterId } from "./types";
import { demoCharacters } from "./mockData";

const STORAGE_KEY = "dm-dashboard:characters";

type Listener = () => void;

let cache: Character[] | null = null;
const listeners = new Set<Listener>();

function readFromStorage(): Character[] {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return demoCharacters;
  try {
    const parsed = JSON.parse(raw) as Character[];
    return Array.isArray(parsed) ? parsed : demoCharacters;
  } catch {
    return demoCharacters;
  }
}

function notify() {
  for (const listener of listeners) listener();
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): Character[] {
  if (cache === null) cache = readFromStorage();
  return cache;
}

export function getServerSnapshot(): Character[] {
  return demoCharacters;
}

function setCharacters(next: Character[]): void {
  cache = next;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  notify();
}

export function createBlankCharacter(url: string): Character {
  const id = extractDndBeyondCharacterId(url);
  return {
    id: `char-${id ?? Date.now()}`,
    name: id ? `Character #${id}` : "New Character",
    race: "",
    className: "",
    level: 1,
    role: "",
    heroicInspiration: false,
    initiative: 0,
    combat: {
      hp: 0,
      maxHp: 0,
      tempHp: 0,
      ac: 10,
      speed: 30,
      passivePerception: 10,
      conditions: [],
      exhaustion: 0,
    },
    stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    resources: [],
    spellSlots: [],
    notes: "",
    dndBeyondUrl: url,
    synced: false,
  };
}

export function addCharacterFromUrl(url: string): Character {
  const character = createBlankCharacter(url);
  setCharacters([...getSnapshot(), character]);
  return character;
}

export function removeCharacterById(id: string): void {
  setCharacters(getSnapshot().filter((c) => c.id !== id));
}

export function updateCharacterById(id: string, updates: Partial<Character>): void {
  setCharacters(getSnapshot().map((c) => (c.id === id ? { ...c, ...updates } : c)));
}
