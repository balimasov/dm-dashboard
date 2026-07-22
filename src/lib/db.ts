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
  JournalEntryAudience,
  JournalSession,
  JournalSessionSummary,
} from "./types";
import type { UserRole } from "./auth";
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

export function createCreature(input: Omit<Creature, "id" | "createdAt" | "updatedAt">): Creature {
  const db = getDb();
  const now = new Date().toISOString();
  const creature: Creature = { ...input, id: `creature-${Date.now()}`, createdAt: now, updatedAt: now };
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
  const now = new Date().toISOString();
  const updated: Creature = {
    ...existing,
    ...updates,
    id: existing.id,
    // A creature saved before this field existed has neither timestamp —
    // `existing.createdAt` alone would stay permanently undefined, which
    // made `CreatureTimestampStatus` fall back to `updatedAt` and label
    // every future edit "Created" instead of "Edited" (no `createdAt` to
    // differ from). Backfilling from whatever timestamp we DO have on
    // record — the creature's last known `updatedAt`, or `now` if it has
    // neither — anchors `createdAt` on this update so every edit after this
    // one reads correctly; reusing the single `now` for both fields in the
    // "neither exists yet" case keeps them equal so this first tracked edit
    // still shows as "Created", same as a brand-new creature would.
    createdAt: existing.createdAt ?? existing.updatedAt ?? now,
    updatedAt: now,
  };
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

/**
 * Newest-first, with a per-session entry count. `audience` lives inside
 * `journal_entries.data` (JSON), not a real column, so it can't be filtered
 * in the SQL `COUNT` itself — one JOIN pulls every (session, entry) pair
 * and the counting happens in JS, same "load then reduce" approach already
 * used elsewhere in this file (`resolveOrCreateSessionForDate`,
 * `listJournalEntries`). `role` controls both what counts get included (a
 * player's count only ever reflects `"party"` entries — a `"dm"` entry
 * count would leak that DM-private notes exist) and which sessions are
 * returned at all (an archived session is dropped entirely for a
 * non-`"dm"` caller, not just marked — same "invisible, not just
 * restricted" rule the archived-session guard on the entries routes uses).
 */
export function listJournalSessions(campaignId: string, role: UserRole): JournalSessionSummary[] {
  const rows = getDb()
    .prepare(
      `SELECT s.data AS sessionData, e.data AS entryData
       FROM journal_sessions s
       LEFT JOIN journal_entries e ON e.session_id = s.id
       WHERE s.campaign_id = ?`
    )
    .all(campaignId) as Array<{ sessionData: string; entryData: string | null }>;

  const bySession = new Map<string, { session: JournalSession; entryCount: number }>();
  for (const row of rows) {
    const session = JSON.parse(row.sessionData) as JournalSession;
    if (!bySession.has(session.id)) bySession.set(session.id, { session, entryCount: 0 });
    if (row.entryData) {
      const entry = JSON.parse(row.entryData) as JournalEntry;
      if (role === "dm" || entry.audience === "party") bySession.get(session.id)!.entryCount += 1;
    }
  }

  return [...bySession.values()]
    .filter(({ session }) => role === "dm" || !session.archived)
    .map(({ session, entryCount }) => ({ ...session, entryCount }))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export function getJournalSession(id: string): JournalSession | null {
  const row = getDb().prepare("SELECT data FROM journal_sessions WHERE id = ?").get(id) as { data: string } | undefined;
  return row ? rowToJournalSession(row) : null;
}

function insertJournalSession(campaignId: string, dateKey: string): JournalSession {
  const session: JournalSession = {
    id: `journal-session-${Date.now()}`,
    campaignId,
    dateKey,
    title: formatSessionTitle(dateKey),
    startedAt: new Date().toISOString(),
  };
  getDb()
    .prepare("INSERT INTO journal_sessions (id, campaign_id, date_key, data) VALUES (?, ?, ?, ?)")
    .run(session.id, session.campaignId, session.dateKey, JSON.stringify(session));
  return session;
}

/**
 * Auto-resolution's entire logic: one session per calendar day. Reuses the
 * most-recently-created NON-archived session whose `dateKey` matches the
 * one given, creating a new one when none matches — including when today's
 * own session exists but is archived (an archived session is closed; it
 * never receives new auto-resolved entries regardless of how many entries
 * it already has). This function itself is timezone-agnostic — it just
 * compares `dateKey` strings — the cross-device guarantee lives entirely in
 * the caller always passing the *same* canonical value (see
 * `entries/route.ts`, which fixes it to a single UTC day rather than
 * trusting each request's own reported IANA zone) rather than in any logic
 * here. This is the *implicit* way a new session starts (nothing existed
 * for today, or today's own session was archived); `createJournalSession`
 * below is the *explicit* one (a DM manually starting a new one even though
 * an active session for today already exists).
 */
export function resolveOrCreateSessionForDate(campaignId: string, dateKey: string): JournalSession {
  const rows = getDb().prepare("SELECT data FROM journal_sessions WHERE campaign_id = ?").all(campaignId) as Array<{
    data: string;
  }>;
  const activeToday = rows.map(rowToJournalSession).filter((s) => !s.archived && s.dateKey === dateKey);
  if (activeToday.length > 0) {
    return activeToday.sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  }
  return insertJournalSession(campaignId, dateKey);
}

/** DM-only manual "start a new session" (enforced by the route, not here) — always inserts a fresh row, unlike `resolveOrCreateSessionForDate`, which never reuses anything even if an active session already exists. This is what lets a DM split a session within the same day on purpose. */
export function createJournalSession(campaignId: string, dateKey: string): JournalSession {
  return insertJournalSession(campaignId, dateKey);
}

/** DM-only rename/archive/unarchive (enforced by the route, not here) — same spread-update convention as `updateCampaign`/`updateCreature`. */
export function updateJournalSession(
  id: string,
  updates: Partial<Pick<JournalSession, "title" | "archived">>
): JournalSession | null {
  const existing = getJournalSession(id);
  if (!existing) return null;
  const updated: JournalSession = { ...existing, ...updates };
  getDb().prepare("UPDATE journal_sessions SET data = ? WHERE id = ?").run(JSON.stringify(updated), id);
  return updated;
}

/** DM-only cascade delete (enforced by the route, not here) — mirrors `deleteCampaign`'s cascade: a session's entries have nowhere else to belong once the session itself is gone. */
export function removeJournalSession(id: string): void {
  const db = getDb();
  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM journal_entries WHERE session_id = ?").run(id);
    db.prepare("DELETE FROM journal_sessions WHERE id = ?").run(id);
  });
  transaction();
}

/** Chronological (oldest first, like a log) — sorted in JS since `createdAt` lives in the JSON blob, not a real column, same "load then sort" approach used elsewhere in this file for anything not covered by a real column. */
export function listJournalEntries(sessionId: string): JournalEntry[] {
  const rows = getDb().prepare("SELECT data FROM journal_entries WHERE session_id = ?").all(sessionId) as Array<{
    data: string;
  }>;
  return rows.map(rowToJournalEntry).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Every session for a campaign, unfiltered — unlike `listJournalSessions`, includes archived sessions and isn't role-scoped. Used only by the full-campaign export: a DM backup needs everything, not the UI's "hide archived / audience-filtered" view. */
export function listAllJournalSessions(campaignId: string): JournalSession[] {
  const rows = getDb().prepare("SELECT data FROM journal_sessions WHERE campaign_id = ?").all(campaignId) as Array<{
    data: string;
  }>;
  return rows.map(rowToJournalSession).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

/** Every entry across every session of a campaign, unfiltered by audience — same "DM backup needs everything" rationale as `listAllJournalSessions`. */
export function listAllJournalEntries(campaignId: string): JournalEntry[] {
  const rows = getDb().prepare("SELECT data FROM journal_entries WHERE campaign_id = ?").all(campaignId) as Array<{
    data: string;
  }>;
  return rows.map(rowToJournalEntry).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function getJournalEntry(id: string): JournalEntry | null {
  const row = getDb().prepare("SELECT data FROM journal_entries WHERE id = ?").get(id) as { data: string } | undefined;
  return row ? rowToJournalEntry(row) : null;
}

/**
 * `sessionId` omitted → auto-resolves the campaign's current session via
 * `resolveOrCreateSessionForDate` (Quick Note's path). `sessionId` given →
 * attaches to that exact session instead (the full Journal modal's "add to
 * the session I'm currently viewing" path). Both paths go through this one
 * function so there's a single place that stamps `createdAt`/`updatedAt` —
 * `audience`/`authorRole` are the caller's responsibility (the API route
 * derives them from the request's own session role, never trusting a
 * client-sent value for a player — see `entries/route.ts`).
 */
export function createJournalEntry(input: {
  campaignId: string;
  sessionId?: string;
  dateKeyForAutoSession: string;
  text: string;
  audience: JournalEntryAudience;
  authorRole: UserRole;
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
    audience: input.audience,
    authorRole: input.authorRole,
    createdAt: now,
    updatedAt: now,
    updatedByRole: input.authorRole,
  };
  db.prepare("INSERT INTO journal_entries (id, campaign_id, session_id, data) VALUES (?, ?, ?, ?)").run(
    entry.id,
    entry.campaignId,
    entry.sessionId,
    JSON.stringify(entry)
  );
  return entry;
}

export type UpdateJournalEntryResult =
  | { status: "not_found" }
  | { status: "conflict"; entry: JournalEntry }
  | { status: "ok"; entry: JournalEntry };

/**
 * Only `text`/`expectedUpdatedAt` are ever accepted from a client (see
 * `journalEntryUpdateSchema`) — `updatedAt` is stamped by this function
 * itself, `updatedByRole` comes from the caller's own verified session role,
 * never trusted from the request body in any other sense.
 *
 * `expectedUpdatedAt` omitted → unconditional overwrite, same behavior as
 * before conflict detection existed. Given → compare-and-swap: if the
 * entry's current `updatedAt` no longer matches, someone else saved in
 * between and this write is rejected with `"conflict"` (carrying the fresh
 * entry, so the caller doesn't need a second round-trip to see what
 * changed) instead of silently clobbering it. better-sqlite3 is
 * synchronous, so the read-then-write below is already atomic within this
 * single call — no transaction needed.
 */
export function updateJournalEntryText(
  id: string,
  text: string,
  updatedByRole: UserRole,
  expectedUpdatedAt?: string
): UpdateJournalEntryResult {
  const existing = getJournalEntry(id);
  if (!existing) return { status: "not_found" };
  if (expectedUpdatedAt !== undefined && existing.updatedAt !== expectedUpdatedAt) {
    return { status: "conflict", entry: existing };
  }
  const updated: JournalEntry = { ...existing, text, updatedAt: new Date().toISOString(), updatedByRole };
  getDb().prepare("UPDATE journal_entries SET data = ? WHERE id = ?").run(JSON.stringify(updated), id);
  return { status: "ok", entry: updated };
}

export function removeJournalEntry(id: string): void {
  getDb().prepare("DELETE FROM journal_entries WHERE id = ?").run(id);
}
