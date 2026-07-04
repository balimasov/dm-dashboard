import "server-only";
import path from "path";
import fs from "fs";
import Database from "better-sqlite3";
import { Character, extractDndBeyondCharacterId } from "./types";
import { demoCharacters } from "./mockData";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "dm-dashboard.sqlite");

function openDb(): Database.Database {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      position INTEGER NOT NULL,
      data TEXT NOT NULL
    )
  `);
  return db;
}

// Reused across hot-reloads in dev so we don't reopen the file on every request.
declare global {
  var __dmDashboardDb: Database.Database | undefined;
}

function getDb(): Database.Database {
  if (!global.__dmDashboardDb) {
    const db = openDb();
    const count = db.prepare("SELECT COUNT(*) AS count FROM characters").get() as { count: number };
    if (count.count === 0) {
      const insert = db.prepare("INSERT INTO characters (id, position, data) VALUES (?, ?, ?)");
      demoCharacters.forEach((character, index) => {
        insert.run(character.id, index, JSON.stringify(character));
      });
    }
    global.__dmDashboardDb = db;
  }
  return global.__dmDashboardDb;
}

/**
 * Rows saved before fields like senses/saving throws/passive skills existed
 * won't have them in their stored JSON — backfill safe defaults on read so
 * older characters don't crash the UI (which assumes these are always
 * arrays/numbers, never undefined) instead of requiring a DB migration.
 */
function rowToCharacter(row: { data: string }): Character {
  const parsed = JSON.parse(row.data) as Character;
  return {
    ...parsed,
    savingThrowProficiencies: parsed.savingThrowProficiencies ?? [],
    skillProficiencies: (parsed.skillProficiencies ?? []).map((s) => ({ ...s, proficient: s.proficient ?? true })),
    resistances: parsed.resistances ?? [],
    immunities: parsed.immunities ?? [],
    vulnerabilities: parsed.vulnerabilities ?? [],
    advantages: parsed.advantages ?? [],
    senses: parsed.senses ?? [],
    combat: {
      ...parsed.combat,
      passiveInvestigation: parsed.combat?.passiveInvestigation ?? 10,
      passiveInsight: parsed.combat?.passiveInsight ?? 10,
    },
  };
}

export function listCharacters(): Character[] {
  const rows = getDb()
    .prepare("SELECT data FROM characters ORDER BY position ASC")
    .all() as Array<{ data: string }>;
  return rows.map(rowToCharacter);
}

export function getCharacter(id: string): Character | null {
  const row = getDb().prepare("SELECT data FROM characters WHERE id = ?").get(id) as
    | { data: string }
    | undefined;
  return row ? rowToCharacter(row) : null;
}

export function createBlankCharacter(url: string): Character {
  const ddbId = extractDndBeyondCharacterId(url);
  return {
    id: `char-${ddbId ?? Date.now()}`,
    name: ddbId ? `Character #${ddbId}` : "New Character",
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
      passiveInvestigation: 10,
      passiveInsight: 10,
      conditions: [],
      exhaustion: 0,
    },
    stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    resources: [],
    spellSlots: [],
    savingThrowProficiencies: [],
    skillProficiencies: [],
    resistances: [],
    immunities: [],
    vulnerabilities: [],
    advantages: [],
    senses: [],
    notes: "",
    dndBeyondUrl: url,
    synced: false,
  };
}

export function addCharacterFromUrl(url: string): Character {
  const db = getDb();
  const character = createBlankCharacter(url);
  const maxPosition = db.prepare("SELECT MAX(position) AS maxPosition FROM characters").get() as {
    maxPosition: number | null;
  };
  const position = (maxPosition.maxPosition ?? -1) + 1;
  db.prepare("INSERT INTO characters (id, position, data) VALUES (?, ?, ?)").run(
    character.id,
    position,
    JSON.stringify(character)
  );
  return character;
}

export function updateCharacter(id: string, updates: Partial<Character>): Character | null {
  const existing = getCharacter(id);
  if (!existing) return null;
  const updated: Character = { ...existing, ...updates, id: existing.id };
  getDb().prepare("UPDATE characters SET data = ? WHERE id = ?").run(JSON.stringify(updated), id);
  return updated;
}

export function removeCharacter(id: string): void {
  getDb().prepare("DELETE FROM characters WHERE id = ?").run(id);
}

export function reorderCharacters(orderedIds: string[]): Character[] {
  const db = getDb();
  const update = db.prepare("UPDATE characters SET position = ? WHERE id = ?");
  const transaction = db.transaction((ids: string[]) => {
    ids.forEach((id, index) => update.run(index, id));
  });
  transaction(orderedIds);
  return listCharacters();
}
