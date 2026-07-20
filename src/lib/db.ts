import "server-only";
import path from "path";
import fs from "fs";
import Database from "better-sqlite3";
import {
  Campaign,
  CampaignSummary,
  Character,
  Creature,
  ItemCategory,
  ItemRarity,
  JournalEntry,
  JournalSession,
  JournalSessionSummary,
} from "./types";
import { extractDndBeyondCharacterId } from "./dndBeyondUrl";
import { demoCharacters } from "./mockData";
import { formatSessionTitle } from "./journal";

// `DATA_DIR` lets a Railway (or any host's) persistent volume live at
// whatever path it was actually mounted at — without it, the sqlite file
// always lands in `<working dir>/data`, which is fine for local dev but
// silently writes to the container's ephemeral filesystem in production if
// the volume was mounted somewhere else, losing all data on every redeploy.
const DB_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "dm-dashboard.sqlite");

const DEMO_CAMPAIGN_ID = "demo-campaign";

function openDb(): Database.Database {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL DEFAULT '',
      position INTEGER NOT NULL,
      data TEXT NOT NULL
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      position INTEGER NOT NULL,
      data TEXT NOT NULL
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS creatures (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      position INTEGER NOT NULL,
      data TEXT NOT NULL
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS journal_sessions (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      date_key TEXT NOT NULL,
      data TEXT NOT NULL
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      data TEXT NOT NULL
    )
  `);
  // The shared cross-campaign bestiary this project shipped earlier turned
  // out to cause more problems than it solved: an invisible cache with no
  // way to view/edit it directly, silently drifting from a creature's actual
  // stats the moment that creature was edited (only adding one wrote back to
  // it). Dropped in favor of just re-searching Open5e or re-importing a
  // saved YAML file for something reused — both are explicit, DM-controlled
  // actions instead of a hidden synced table.
  db.exec(`DROP TABLE IF EXISTS bestiary_templates`);

  // `characters` predates campaigns — `CREATE TABLE IF NOT EXISTS` above
  // doesn't retrofit a column onto an already-existing table, so an existing
  // DB needs an explicit migration instead.
  const characterColumns = db.prepare("PRAGMA table_info(characters)").all() as Array<{ name: string }>;
  if (!characterColumns.some((c) => c.name === "campaign_id")) {
    db.exec("ALTER TABLE characters ADD COLUMN campaign_id TEXT NOT NULL DEFAULT ''");
  }

  return db;
}

// Reused across hot-reloads in dev so we don't reopen the file on every request.
declare global {
  var __dmDashboardDb: Database.Database | undefined;
}

function getDb(): Database.Database {
  if (!global.__dmDashboardDb) {
    const db = openDb();

    const campaignCount = db.prepare("SELECT COUNT(*) AS count FROM campaigns").get() as { count: number };
    if (campaignCount.count === 0) {
      const campaign: Campaign = {
        id: DEMO_CAMPAIGN_ID,
        name: "The Sundered Vale",
        notes: "",
        createdAt: new Date().toISOString(),
      };
      db.prepare("INSERT INTO campaigns (id, position, data) VALUES (?, ?, ?)").run(
        campaign.id,
        0,
        JSON.stringify(campaign)
      );
    }

    // Backfills any character saved before campaigns existed onto the demo
    // campaign — covers upgrading an existing single-tenant DB, not just a
    // fresh install (which seeds characters already carrying this id below).
    db.prepare("UPDATE characters SET campaign_id = ? WHERE campaign_id = ''").run(DEMO_CAMPAIGN_ID);

    const count = db.prepare("SELECT COUNT(*) AS count FROM characters").get() as { count: number };
    if (count.count === 0) {
      const insert = db.prepare(
        "INSERT INTO characters (id, campaign_id, position, data) VALUES (?, ?, ?, ?)"
      );
      demoCharacters.forEach((character, index) => {
        insert.run(character.id, character.campaignId, index, JSON.stringify(character));
      });
    }
    global.__dmDashboardDb = db;
  }
  return global.__dmDashboardDb;
}

/** Legacy items (saved before ItemCategory existed) get a rarity-based guess instead of a DB migration. */
function legacyItemCategory(rarity: ItemRarity): ItemCategory {
  return rarity !== "Common" && rarity !== "Unknown" ? "Magic Item" : "Gear";
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
    languages: parsed.languages ?? [],
    toolProficiencies: parsed.toolProficiencies ?? [],
    inventory: (parsed.inventory ?? []).map((i) => ({ ...i, category: i.category ?? legacyItemCategory(i.rarity) })),
    currency: parsed.currency ?? { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    knownSpells: parsed.knownSpells ?? [],
    features: (parsed.features ?? []).map((f) => ({ ...f, group: f.group ?? "other", originType: f.originType ?? "class" })),
    attacks: parsed.attacks ?? [],
    quickNotes: parsed.quickNotes ?? [],
    combat: {
      ...parsed.combat,
      passiveInvestigation: parsed.combat?.passiveInvestigation ?? 10,
      passiveInsight: parsed.combat?.passiveInsight ?? 10,
    },
  };
}

export function listCampaigns(): CampaignSummary[] {
  const rows = getDb()
    .prepare(
      `SELECT c.data AS data, COUNT(ch.id) AS characterCount
       FROM campaigns c
       LEFT JOIN characters ch ON ch.campaign_id = c.id
       GROUP BY c.id
       ORDER BY c.position ASC`
    )
    .all() as Array<{ data: string; characterCount: number }>;
  return rows.map((row) => ({ ...(JSON.parse(row.data) as Campaign), characterCount: row.characterCount }));
}

export function getCampaign(id: string): Campaign | null {
  const row = getDb().prepare("SELECT data FROM campaigns WHERE id = ?").get(id) as { data: string } | undefined;
  return row ? (JSON.parse(row.data) as Campaign) : null;
}

export function createCampaign(input: { name: string; notes?: string; logoUrl?: string }): Campaign {
  const db = getDb();
  const campaign: Campaign = {
    id: `campaign-${Date.now()}`,
    name: input.name,
    notes: input.notes ?? "",
    createdAt: new Date().toISOString(),
    ...(input.logoUrl ? { logoUrl: input.logoUrl } : {}),
  };
  const maxPosition = db.prepare("SELECT MAX(position) AS maxPosition FROM campaigns").get() as {
    maxPosition: number | null;
  };
  const position = (maxPosition.maxPosition ?? -1) + 1;
  db.prepare("INSERT INTO campaigns (id, position, data) VALUES (?, ?, ?)").run(
    campaign.id,
    position,
    JSON.stringify(campaign)
  );
  return campaign;
}

export function updateCampaign(id: string, updates: Partial<Campaign>): Campaign | null {
  const existing = getCampaign(id);
  if (!existing) return null;
  const updated: Campaign = { ...existing, ...updates, id: existing.id };
  getDb().prepare("UPDATE campaigns SET data = ? WHERE id = ?").run(JSON.stringify(updated), id);
  return updated;
}

/** Cascades: a campaign's characters, creatures, and journal both have nowhere else to belong, so removing it takes its whole roster (and journal) with it. */
export function deleteCampaign(id: string): void {
  const db = getDb();
  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM characters WHERE campaign_id = ?").run(id);
    db.prepare("DELETE FROM creatures WHERE campaign_id = ?").run(id);
    db.prepare("DELETE FROM journal_entries WHERE campaign_id = ?").run(id);
    db.prepare("DELETE FROM journal_sessions WHERE campaign_id = ?").run(id);
    db.prepare("DELETE FROM campaigns WHERE id = ?").run(id);
  });
  transaction();
}

export function listCharacters(campaignId: string): Character[] {
  const rows = getDb()
    .prepare("SELECT data FROM characters WHERE campaign_id = ? ORDER BY position ASC")
    .all(campaignId) as Array<{ data: string }>;
  return rows.map(rowToCharacter);
}

export function getCharacter(id: string): Character | null {
  const row = getDb().prepare("SELECT data FROM characters WHERE id = ?").get(id) as
    | { data: string }
    | undefined;
  return row ? rowToCharacter(row) : null;
}

export function createBlankCharacter(url: string, campaignId: string): Character {
  const ddbId = extractDndBeyondCharacterId(url);
  return {
    id: `char-${ddbId ?? Date.now()}`,
    campaignId,
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
    languages: [],
    toolProficiencies: [],
    inventory: [],
    currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    knownSpells: [],
    features: [],
    attacks: [],
    notes: "",
    quickNotes: [],
    dndBeyondUrl: url,
    synced: false,
  };
}

export function addCharacterFromUrl(url: string, campaignId: string): Character {
  const db = getDb();
  const character = createBlankCharacter(url, campaignId);
  const maxPosition = db
    .prepare("SELECT MAX(position) AS maxPosition FROM characters WHERE campaign_id = ?")
    .get(campaignId) as { maxPosition: number | null };
  const position = (maxPosition.maxPosition ?? -1) + 1;
  db.prepare("INSERT INTO characters (id, campaign_id, position, data) VALUES (?, ?, ?, ?)").run(
    character.id,
    campaignId,
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

export function reorderCharacters(orderedIds: string[]): void {
  const db = getDb();
  const update = db.prepare("UPDATE characters SET position = ? WHERE id = ?");
  const transaction = db.transaction((ids: string[]) => {
    ids.forEach((id, index) => update.run(index, id));
  });
  transaction(orderedIds);
}

/** Rows saved before `conditions`/`exhaustion`/`tempHp`/`templateName`/`category` existed on Creature won't have them in their stored JSON. */
function rowToCreature(row: { data: string }): Creature {
  const parsed = JSON.parse(row.data) as Creature;
  return {
    ...parsed,
    tempHp: parsed.tempHp ?? 0,
    conditions: parsed.conditions ?? [],
    exhaustion: parsed.exhaustion ?? 0,
    traits: parsed.traits ?? [],
    templateName: parsed.templateName ?? parsed.name,
    // Historically this whole block was used only for player-controlled
    // summons/companions, so that's the least surprising default for
    // creatures saved before the category split existed.
    category: parsed.category ?? "companion",
  };
}

export function listCreatures(campaignId: string): Creature[] {
  const rows = getDb()
    .prepare("SELECT data FROM creatures WHERE campaign_id = ? ORDER BY position ASC")
    .all(campaignId) as Array<{ data: string }>;
  return rows.map(rowToCreature);
}

export function getCreature(id: string): Creature | null {
  const row = getDb().prepare("SELECT data FROM creatures WHERE id = ?").get(id) as { data: string } | undefined;
  return row ? rowToCreature(row) : null;
}

export function createCreature(input: Omit<Creature, "id">): Creature {
  const db = getDb();
  const creature: Creature = { ...input, id: `creature-${Date.now()}` };
  const maxPosition = db
    .prepare("SELECT MAX(position) AS maxPosition FROM creatures WHERE campaign_id = ?")
    .get(creature.campaignId) as { maxPosition: number | null };
  const position = (maxPosition.maxPosition ?? -1) + 1;
  db.prepare("INSERT INTO creatures (id, campaign_id, position, data) VALUES (?, ?, ?, ?)").run(
    creature.id,
    creature.campaignId,
    position,
    JSON.stringify(creature)
  );
  return creature;
}

export function updateCreature(id: string, updates: Partial<Creature>): Creature | null {
  const existing = getCreature(id);
  if (!existing) return null;
  const updated: Creature = { ...existing, ...updates, id: existing.id };
  getDb().prepare("UPDATE creatures SET data = ? WHERE id = ?").run(JSON.stringify(updated), id);
  return updated;
}

export function removeCreature(id: string): void {
  getDb().prepare("DELETE FROM creatures WHERE id = ?").run(id);
}

export function reorderCreatures(orderedIds: string[]): void {
  const db = getDb();
  const update = db.prepare("UPDATE creatures SET position = ? WHERE id = ?");
  const transaction = db.transaction((ids: string[]) => {
    ids.forEach((id, index) => update.run(index, id));
  });
  transaction(orderedIds);
}

function rowToJournalSession(row: { data: string }): JournalSession {
  return JSON.parse(row.data) as JournalSession;
}

function rowToJournalEntry(row: { data: string }): JournalEntry {
  return JSON.parse(row.data) as JournalEntry;
}

/** Newest-first, with a per-session entry count via LEFT JOIN — same shape `listCampaigns` already uses for `characterCount`. */
export function listJournalSessions(campaignId: string): JournalSessionSummary[] {
  const rows = getDb()
    .prepare(
      `SELECT s.data AS data, COUNT(e.id) AS entryCount
       FROM journal_sessions s
       LEFT JOIN journal_entries e ON e.session_id = s.id
       WHERE s.campaign_id = ?
       GROUP BY s.id`
    )
    .all(campaignId) as Array<{ data: string; entryCount: number }>;
  return rows
    .map((row) => ({ ...(JSON.parse(row.data) as JournalSession), entryCount: row.entryCount }))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export function getJournalSession(id: string): JournalSession | null {
  const row = getDb().prepare("SELECT data FROM journal_sessions WHERE id = ?").get(id) as { data: string } | undefined;
  return row ? rowToJournalSession(row) : null;
}

/**
 * Iteration 1's entire session-resolution logic: finds the existing session
 * row for `campaignId`/`dateKey`, or creates one. Naive lookup — any row
 * matching `dateKey` wins, since only one can exist per day yet. A later
 * iteration's "manually start a new session within the same day" feature
 * must change the *selection* rule here (e.g. latest `startedAt` among rows
 * without an `endedAt`), not the schema — `dateKey` is deliberately not a
 * uniqueness constraint for exactly this reason.
 */
export function resolveOrCreateSessionForDate(campaignId: string, dateKey: string): JournalSession {
  const db = getDb();
  const existing = db
    .prepare("SELECT data FROM journal_sessions WHERE campaign_id = ? AND date_key = ?")
    .get(campaignId, dateKey) as { data: string } | undefined;
  if (existing) return rowToJournalSession(existing);

  const session: JournalSession = {
    id: `journal-session-${Date.now()}`,
    campaignId,
    dateKey,
    title: formatSessionTitle(dateKey),
    startedAt: new Date().toISOString(),
  };
  db.prepare("INSERT INTO journal_sessions (id, campaign_id, date_key, data) VALUES (?, ?, ?, ?)").run(
    session.id,
    session.campaignId,
    session.dateKey,
    JSON.stringify(session)
  );
  return session;
}

/** Chronological (oldest first, like a log) — sorted in JS since `createdAt` lives in the JSON blob, not a real column, same "load then sort" approach used elsewhere in this file for anything not covered by a real column. */
export function listJournalEntries(sessionId: string): JournalEntry[] {
  const rows = getDb().prepare("SELECT data FROM journal_entries WHERE session_id = ?").all(sessionId) as Array<{
    data: string;
  }>;
  return rows.map(rowToJournalEntry).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function getJournalEntry(id: string): JournalEntry | null {
  const row = getDb().prepare("SELECT data FROM journal_entries WHERE id = ?").get(id) as { data: string } | undefined;
  return row ? rowToJournalEntry(row) : null;
}

/**
 * `sessionId` omitted → auto-resolves "today's" session via
 * `resolveOrCreateSessionForDate` (Quick Note's path). `sessionId` given →
 * attaches to that exact session instead (the full Journal modal's "add to
 * the session I'm currently viewing" path). Both paths go through this one
 * function so there's a single place that stamps
 * `createdAt`/`updatedAt`/`authorRole`/`audience` — iteration 1 always
 * "dm"/"dm" since both entry points are DM-only.
 */
export function createJournalEntry(input: {
  campaignId: string;
  sessionId?: string;
  dateKeyForAutoSession: string;
  text: string;
}): JournalEntry {
  const db = getDb();
  const session = input.sessionId
    ? getJournalSession(input.sessionId)
    : resolveOrCreateSessionForDate(input.campaignId, input.dateKeyForAutoSession);
  if (!session) throw new Error(`Journal session not found: ${input.sessionId}`);

  const now = new Date().toISOString();
  const entry: JournalEntry = {
    id: `journal-entry-${Date.now()}`,
    campaignId: input.campaignId,
    sessionId: session.id,
    text: input.text,
    audience: "dm",
    authorRole: "dm",
    createdAt: now,
    updatedAt: now,
    updatedByRole: "dm",
  };
  db.prepare("INSERT INTO journal_entries (id, campaign_id, session_id, data) VALUES (?, ?, ?, ?)").run(
    entry.id,
    entry.campaignId,
    entry.sessionId,
    JSON.stringify(entry)
  );
  return entry;
}

/** Only `text` is ever accepted here (see `journalEntryUpdateSchema`) — `updatedAt`/`updatedByRole` are stamped by this function itself, never trusted from the caller. */
export function updateJournalEntryText(id: string, text: string): JournalEntry | null {
  const existing = getJournalEntry(id);
  if (!existing) return null;
  const updated: JournalEntry = { ...existing, text, updatedAt: new Date().toISOString(), updatedByRole: "dm" };
  getDb().prepare("UPDATE journal_entries SET data = ? WHERE id = ?").run(JSON.stringify(updated), id);
  return updated;
}

export function removeJournalEntry(id: string): void {
  getDb().prepare("DELETE FROM journal_entries WHERE id = ?").run(id);
}
