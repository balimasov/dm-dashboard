import "server-only";
import path from "path";
import fs from "fs";
import Database from "better-sqlite3";
import {
  Campaign,
  CampaignSummary,
  Character,
  Creature,
  CreatureTemplate,
  extractDndBeyondCharacterId,
  ItemCategory,
  ItemRarity,
} from "./types";
import { demoCharacters } from "./mockData";

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
  // The shared bestiary — reusable stat-block templates, deliberately not
  // scoped to a campaign (that's the entire point: enter "Unicorn" once and
  // it's available for any future character/campaign too). Looked up by
  // name, hence the dedicated indexed column instead of reading it back out
  // of `data` on every search.
  db.exec(`
    CREATE TABLE IF NOT EXISTS bestiary_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      data TEXT NOT NULL
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_bestiary_templates_name ON bestiary_templates (name)`);

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
    inventory: (parsed.inventory ?? []).map((i) => ({ ...i, category: i.category ?? legacyItemCategory(i.rarity) })),
    currency: parsed.currency ?? { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    knownSpells: parsed.knownSpells ?? [],
    features: (parsed.features ?? []).map((f) => ({ ...f, group: f.group ?? "other", originType: f.originType ?? "class" })),
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

/** Cascades: a campaign's characters and creatures have nowhere else to belong, so removing it takes its whole roster with it. Bestiary templates are untouched — they're shared across campaigns, not owned by any one of them. */
export function deleteCampaign(id: string): void {
  const db = getDb();
  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM characters WHERE campaign_id = ?").run(id);
    db.prepare("DELETE FROM creatures WHERE campaign_id = ?").run(id);
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
    inventory: [],
    currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    knownSpells: [],
    features: [],
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

/** Rows saved before `conditions`/`exhaustion`/`tempHp`/`templateName` existed on Creature won't have them in their stored JSON. */
function rowToCreature(row: { data: string }): Creature {
  const parsed = JSON.parse(row.data) as Creature;
  return {
    ...parsed,
    tempHp: parsed.tempHp ?? 0,
    conditions: parsed.conditions ?? [],
    exhaustion: parsed.exhaustion ?? 0,
    traits: parsed.traits ?? [],
    templateName: parsed.templateName ?? parsed.name,
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

/**
 * Also purges the shared bestiary entry for this creature's `templateName`
 * once no other creature (in any campaign) references it any more —
 * otherwise a stale/incorrect cached stat block (e.g. from an early,
 * wrongly-parsed import) would sit in the bestiary forever, permanently
 * shadowing a fresh re-import of the same name with no way to fix it short
 * of manually editing the saved entry.
 */
export function removeCreature(id: string): void {
  const db = getDb();
  const existing = getCreature(id);
  db.prepare("DELETE FROM creatures WHERE id = ?").run(id);
  if (!existing) return;

  const remaining = db.prepare("SELECT data FROM creatures").all() as Array<{ data: string }>;
  const stillReferenced = remaining.some(
    (row) => (JSON.parse(row.data) as Creature).templateName?.toLowerCase() === existing.templateName.toLowerCase()
  );
  if (!stillReferenced) {
    db.prepare("DELETE FROM bestiary_templates WHERE name = ? COLLATE NOCASE").run(existing.templateName);
  }
}

export function reorderCreatures(orderedIds: string[]): void {
  const db = getDb();
  const update = db.prepare("UPDATE creatures SET position = ? WHERE id = ?");
  const transaction = db.transaction((ids: string[]) => {
    ids.forEach((id, index) => update.run(index, id));
  });
  transaction(orderedIds);
}

export function getBestiaryTemplateById(id: string): CreatureTemplate | null {
  const row = getDb().prepare("SELECT data FROM bestiary_templates WHERE id = ?").get(id) as
    | { data: string }
    | undefined;
  return row ? (JSON.parse(row.data) as CreatureTemplate) : null;
}

/** Case-insensitive substring match on name, most-recently-added first (a DM re-searching mid-session is more likely after the one they just added than an old unrelated entry). */
export function searchBestiary(query: string): CreatureTemplate[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const rows = getDb()
    .prepare("SELECT data FROM bestiary_templates WHERE name LIKE ? COLLATE NOCASE ORDER BY rowid DESC LIMIT 20")
    .all(`%${trimmed}%`) as Array<{ data: string }>;
  return rows.map((row) => JSON.parse(row.data) as CreatureTemplate);
}

/**
 * Keyed by name (case-insensitive) rather than id — the point of the shared
 * bestiary is that entering/importing "Unicorn" once is enough, regardless
 * of whether the next character to use it came from a fresh SRD search or
 * picked the saved entry, so a second save under the same name overwrites
 * the existing template instead of creating a duplicate.
 */
export function upsertBestiaryTemplate(input: Omit<CreatureTemplate, "id">): CreatureTemplate {
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM bestiary_templates WHERE name = ? COLLATE NOCASE")
    .get(input.name) as { id: string } | undefined;
  const template: CreatureTemplate = { ...input, id: existing?.id ?? `bestiary-${Date.now()}` };
  if (existing) {
    db.prepare("UPDATE bestiary_templates SET data = ? WHERE id = ?").run(JSON.stringify(template), existing.id);
  } else {
    db.prepare("INSERT INTO bestiary_templates (id, name, data) VALUES (?, ?, ?)").run(
      template.id,
      template.name,
      JSON.stringify(template)
    );
  }
  return template;
}
