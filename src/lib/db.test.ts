import fs from "fs";
import os from "os";
import path from "path";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

/**
 * `db.ts` reads `DATA_DIR` at module-evaluation time (its top-level
 * `DB_DIR` constant), so it must be set before the module is first
 * imported, not just before the first function call — hence the dynamic
 * `import()` here instead of a static one. Vitest isolates each test file
 * into its own module registry, so this only needs to happen once per file,
 * not per test.
 */
let db: typeof import("./db");

beforeAll(async () => {
  process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "dm-dashboard-db-test-"));
  db = await import("./db");
});

/** Every session/entry id is `<prefix>-${Date.now()}` — two created in the same millisecond collide (`UNIQUE` constraint). A `beforeEach` tick guarantees every test starts in a fresh millisecond relative to whatever the previous test did (this actually happened on faster CI hardware — tests here run fast enough that consecutive `it` blocks landed in the same millisecond); a test that also creates more than one session/entry back-to-back needs its own extra tick between them. */
function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 2));
}

beforeEach(tick);

describe("resolveOrCreateSessionForDate", () => {
  it("creates a session when none exists yet", () => {
    const session = db.resolveOrCreateSessionForDate("campaign-resolve-1", "2026-01-01");
    expect(session.campaignId).toBe("campaign-resolve-1");
    expect(session.archived).toBeFalsy();
  });

  it("reuses the same session across repeated calls for the same day", () => {
    const first = db.resolveOrCreateSessionForDate("campaign-resolve-2", "2026-01-01");
    const second = db.resolveOrCreateSessionForDate("campaign-resolve-2", "2026-01-01");
    expect(second.id).toBe(first.id);
  });

  it("starts a new session for a different calendar day instead of reusing today's — one session per day", async () => {
    const campaignId = "campaign-resolve-3";
    const day1 = db.resolveOrCreateSessionForDate(campaignId, "2026-01-01");
    await tick();
    const day2 = db.resolveOrCreateSessionForDate(campaignId, "2026-01-02");
    expect(day2.id).not.toBe(day1.id);
    expect(day2.dateKey).toBe("2026-01-02");
  });

  it("ignores an archived session for today even if it's the only one — creates a fresh one instead of writing into it", async () => {
    const campaignId = "campaign-resolve-4";
    const today = db.resolveOrCreateSessionForDate(campaignId, "2026-01-01");
    db.updateJournalSession(today.id, { archived: true });
    await tick();

    const resolved = db.resolveOrCreateSessionForDate(campaignId, "2026-01-01");
    expect(resolved.id).not.toBe(today.id);
    expect(resolved.archived).toBeFalsy();
  });

  it("writes into today's non-archived session even with an unrelated archived session from another day present", async () => {
    const campaignId = "campaign-resolve-5";
    const yesterday = db.resolveOrCreateSessionForDate(campaignId, "2026-01-01");
    db.updateJournalSession(yesterday.id, { archived: true });
    await tick();
    const today = db.resolveOrCreateSessionForDate(campaignId, "2026-01-02");

    const resolvedAgain = db.resolveOrCreateSessionForDate(campaignId, "2026-01-02");
    expect(resolvedAgain.id).toBe(today.id);
  });

  it("two calls with the same dateKey land in the same session regardless of what timezone computed it — the actual cross-device guarantee lives in always passing one canonical dateKey, not in this function", () => {
    // Simulates two devices in different real timezones whose *caller*
    // (entries/route.ts) both resolve "today" to the same canonical UTC
    // day before calling this — from this function's own point of view
    // that's just "the same dateKey twice".
    const campaignId = "campaign-resolve-6";
    const fromDeviceA = db.resolveOrCreateSessionForDate(campaignId, "2026-01-01");
    const fromDeviceB = db.resolveOrCreateSessionForDate(campaignId, "2026-01-01");
    expect(fromDeviceB.id).toBe(fromDeviceA.id);
  });
});

describe("createJournalSession", () => {
  it("always inserts a fresh session, unlike resolveOrCreateSessionForDate, even with an active session present", async () => {
    const campaignId = "campaign-manual-1";
    const active = db.resolveOrCreateSessionForDate(campaignId, "2026-01-01");
    await tick();
    const manual = db.createJournalSession(campaignId, "2026-01-01");
    expect(manual.id).not.toBe(active.id);
  });
});

describe("updateJournalSession", () => {
  it("persists a rename", () => {
    const campaignId = "campaign-update-1";
    const session = db.resolveOrCreateSessionForDate(campaignId, "2026-01-01");
    const updated = db.updateJournalSession(session.id, { title: "Session Zero" });
    expect(updated?.title).toBe("Session Zero");
    expect(db.getJournalSession(session.id)?.title).toBe("Session Zero");
  });

  it("persists archive and unarchive", () => {
    const campaignId = "campaign-update-2";
    const session = db.resolveOrCreateSessionForDate(campaignId, "2026-01-01");
    db.updateJournalSession(session.id, { archived: true });
    expect(db.getJournalSession(session.id)?.archived).toBe(true);
    db.updateJournalSession(session.id, { archived: false });
    expect(db.getJournalSession(session.id)?.archived).toBe(false);
  });

  it("returns null for an id that doesn't exist", () => {
    expect(db.updateJournalSession("no-such-session", { title: "x" })).toBeNull();
  });
});

describe("updateJournalEntryText — conflict detection", () => {
  it("saves unconditionally when no expectedUpdatedAt is given", () => {
    const campaignId = "campaign-conflict-1";
    const session = db.resolveOrCreateSessionForDate(campaignId, "2026-01-01");
    const entry = db.createJournalEntry({
      campaignId,
      sessionId: session.id,
      dateKeyForAutoSession: "2026-01-01",
      text: "<p>hi</p>",
      audience: "dm",
      authorRole: "dm",
    });

    const result = db.updateJournalEntryText(entry.id, "<p>edited</p>", "dm");
    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.entry.text).toBe("<p>edited</p>");
  });

  it("saves when expectedUpdatedAt matches the entry's current updatedAt", () => {
    const campaignId = "campaign-conflict-2";
    const session = db.resolveOrCreateSessionForDate(campaignId, "2026-01-01");
    const entry = db.createJournalEntry({
      campaignId,
      sessionId: session.id,
      dateKeyForAutoSession: "2026-01-01",
      text: "<p>hi</p>",
      audience: "dm",
      authorRole: "dm",
    });

    const result = db.updateJournalEntryText(entry.id, "<p>edited</p>", "dm", entry.updatedAt);
    expect(result.status).toBe("ok");
  });

  it("reports a conflict when expectedUpdatedAt is stale, without applying the write", async () => {
    const campaignId = "campaign-conflict-3";
    const session = db.resolveOrCreateSessionForDate(campaignId, "2026-01-01");
    const entry = db.createJournalEntry({
      campaignId,
      sessionId: session.id,
      dateKeyForAutoSession: "2026-01-01",
      text: "<p>original</p>",
      audience: "dm",
      authorRole: "dm",
    });
    const staleExpectedUpdatedAt = entry.updatedAt;
    await tick();
    // Someone else saves first, moving updatedAt on.
    db.updateJournalEntryText(entry.id, "<p>someone else's edit</p>", "player");

    const result = db.updateJournalEntryText(entry.id, "<p>my stale edit</p>", "dm", staleExpectedUpdatedAt);
    expect(result.status).toBe("conflict");
    if (result.status === "conflict") expect(result.entry.text).toBe("<p>someone else's edit</p>");
    // The stale write must not have landed.
    expect(db.getJournalEntry(entry.id)?.text).toBe("<p>someone else's edit</p>");
  });

  it("returns not_found for a missing entry regardless of expectedUpdatedAt", () => {
    const result = db.updateJournalEntryText("no-such-entry", "<p>x</p>", "dm");
    expect(result.status).toBe("not_found");
  });
});

describe("removeJournalSession", () => {
  it("cascades to delete the session's own entries along with it", () => {
    const campaignId = "campaign-remove-1";
    const session = db.resolveOrCreateSessionForDate(campaignId, "2026-01-01");
    const entry = db.createJournalEntry({
      campaignId,
      sessionId: session.id,
      dateKeyForAutoSession: "2026-01-01",
      text: "<p>hi</p>",
      audience: "dm",
      authorRole: "dm",
    });

    db.removeJournalSession(session.id);

    expect(db.getJournalSession(session.id)).toBeNull();
    expect(db.getJournalEntry(entry.id)).toBeNull();
  });

  it("leaves other sessions and their entries untouched", async () => {
    const campaignId = "campaign-remove-2";
    const keep = db.resolveOrCreateSessionForDate(campaignId, "2026-01-01");
    await tick();
    const doomed = db.createJournalSession(campaignId, "2026-01-02");

    db.removeJournalSession(doomed.id);

    expect(db.getJournalSession(keep.id)).not.toBeNull();
  });
});

describe("listJournalSessions", () => {
  it("only counts party entries and hides archived sessions for a non-dm role", async () => {
    const campaignId = "campaign-list-1";
    const session = db.resolveOrCreateSessionForDate(campaignId, "2026-01-01");
    db.createJournalEntry({
      campaignId,
      sessionId: session.id,
      dateKeyForAutoSession: "2026-01-01",
      text: "<p>dm note</p>",
      audience: "dm",
      authorRole: "dm",
    });
    await tick();
    db.createJournalEntry({
      campaignId,
      sessionId: session.id,
      dateKeyForAutoSession: "2026-01-01",
      text: "<p>party note</p>",
      audience: "party",
      authorRole: "player",
    });

    const dmView = db.listJournalSessions(campaignId, "dm");
    expect(dmView).toHaveLength(1);
    expect(dmView[0].entryCount).toBe(2);

    const playerView = db.listJournalSessions(campaignId, "player");
    expect(playerView).toHaveLength(1);
    expect(playerView[0].entryCount).toBe(1);

    db.updateJournalSession(session.id, { archived: true });
    expect(db.listJournalSessions(campaignId, "dm")).toHaveLength(1);
    expect(db.listJournalSessions(campaignId, "player")).toHaveLength(0);
  });
});

describe("listAllJournalSessions / listAllJournalEntries", () => {
  it("include archived sessions and every audience — unlike the role-scoped listers, for a full-campaign export", async () => {
    const campaignId = "campaign-export-1";
    const session = db.resolveOrCreateSessionForDate(campaignId, "2026-01-01");
    db.createJournalEntry({
      campaignId,
      sessionId: session.id,
      dateKeyForAutoSession: "2026-01-01",
      text: "<p>dm-only note</p>",
      audience: "dm",
      authorRole: "dm",
    });
    await tick();
    db.createJournalEntry({
      campaignId,
      sessionId: session.id,
      dateKeyForAutoSession: "2026-01-01",
      text: "<p>party note</p>",
      audience: "party",
      authorRole: "player",
    });
    db.updateJournalSession(session.id, { archived: true });

    const sessions = db.listAllJournalSessions(campaignId);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].archived).toBe(true);

    const entries = db.listAllJournalEntries(campaignId);
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.audience).sort()).toEqual(["dm", "party"]);
  });

  it("scope strictly to the given campaign", async () => {
    const campaignA = "campaign-export-2a";
    const campaignB = "campaign-export-2b";
    const sessionA = db.resolveOrCreateSessionForDate(campaignA, "2026-01-01");
    db.createJournalEntry({
      campaignId: campaignA,
      sessionId: sessionA.id,
      dateKeyForAutoSession: "2026-01-01",
      text: "<p>only in A</p>",
      audience: "dm",
      authorRole: "dm",
    });
    await tick();
    db.resolveOrCreateSessionForDate(campaignB, "2026-01-01");

    expect(db.listAllJournalSessions(campaignB)).toHaveLength(1);
    expect(db.listAllJournalEntries(campaignB)).toHaveLength(0);
    expect(db.listAllJournalEntries(campaignA)).toHaveLength(1);
  });
});

describe("createJournalEntry", () => {
  it("passes audience/authorRole through instead of hardcoding them", () => {
    const campaignId = "campaign-entry-1";
    const session = db.resolveOrCreateSessionForDate(campaignId, "2026-01-01");
    const entry = db.createJournalEntry({
      campaignId,
      sessionId: session.id,
      dateKeyForAutoSession: "2026-01-01",
      text: "<p>hi</p>",
      audience: "party",
      authorRole: "player",
    });
    expect(entry.audience).toBe("party");
    expect(entry.authorRole).toBe("player");
    expect(entry.updatedByRole).toBe("player");
  });
});

describe("updateJournalEntryText", () => {
  it("stamps the passed updatedByRole instead of always dm", () => {
    const campaignId = "campaign-entry-2";
    const session = db.resolveOrCreateSessionForDate(campaignId, "2026-01-01");
    const entry = db.createJournalEntry({
      campaignId,
      sessionId: session.id,
      dateKeyForAutoSession: "2026-01-01",
      text: "<p>hi</p>",
      audience: "dm",
      authorRole: "dm",
    });
    const result = db.updateJournalEntryText(entry.id, "<p>edited</p>", "player");
    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.entry.updatedByRole).toBe("player");
  });
});

const BLANK_STATS = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };

describe("createCreature / updateCreature — createdAt/updatedAt stamping", () => {
  it("stamps both createdAt and updatedAt to the same value on creation, ignoring any input", () => {
    const creature = db.createCreature({
      campaignId: "campaign-creature-1",
      category: "companion",
      templateName: "Otherworldly Steed",
      name: "Thunder",
      ac: 13,
      hp: 20,
      maxHp: 20,
      tempHp: 0,
      speed: 40,
      stats: BLANK_STATS,
      traits: [],
      conditions: [],
      exhaustion: 0,
    });
    expect(creature.createdAt).toBeTruthy();
    expect(creature.updatedAt).toBe(creature.createdAt);
  });

  it("bumps updatedAt on update but leaves createdAt untouched, even if the caller tries to change it", async () => {
    const created = db.createCreature({
      campaignId: "campaign-creature-2",
      category: "enemy",
      templateName: "Bandit",
      name: "Bandit",
      ac: 12,
      hp: 11,
      maxHp: 11,
      tempHp: 0,
      speed: 30,
      stats: BLANK_STATS,
      traits: [],
      conditions: [],
      exhaustion: 0,
    });
    await tick();
    const updated = db.updateCreature(created.id, { hp: 5, createdAt: "2000-01-01T00:00:00.000Z" });
    expect(updated?.createdAt).toBe(created.createdAt);
    expect(updated?.updatedAt).not.toBe(created.updatedAt);
    expect(updated?.hp).toBe(5);
  });

  it("backfills createdAt on first update for a creature saved before this field existed", async () => {
    const created = db.createCreature({
      campaignId: "campaign-creature-3",
      category: "enemy",
      templateName: "Goblin",
      name: "Goblin",
      ac: 15,
      hp: 7,
      maxHp: 7,
      tempHp: 0,
      speed: 30,
      stats: BLANK_STATS,
      traits: [],
      conditions: [],
      exhaustion: 0,
    });

    // Simulate a row saved before `createdAt`/`updatedAt` existed — directly
    // strip them from the stored JSON, bypassing `updateCreature` (which
    // would otherwise refuse to ever unset them).
    const Database = (await import("better-sqlite3")).default;
    const rawDb = new Database(path.join(process.env.DATA_DIR!, "dm-dashboard.sqlite"));
    const row = rawDb.prepare("SELECT data FROM creatures WHERE id = ?").get(created.id) as { data: string };
    const legacy = JSON.parse(row.data);
    delete legacy.createdAt;
    delete legacy.updatedAt;
    rawDb.prepare("UPDATE creatures SET data = ? WHERE id = ?").run(JSON.stringify(legacy), created.id);
    rawDb.close();

    await tick();
    const firstEdit = db.updateCreature(created.id, { hp: 4 });
    // Neither timestamp existed yet — this first tracked edit anchors both
    // to the same value, so it still reads as "Created", not "Edited".
    expect(firstEdit?.createdAt).toBeTruthy();
    expect(firstEdit?.updatedAt).toBe(firstEdit?.createdAt);

    await tick();
    const secondEdit = db.updateCreature(created.id, { hp: 3 });
    // From here on, createdAt stays anchored and updatedAt keeps advancing —
    // this is the "Edited" case the timestamp badge should now show.
    expect(secondEdit?.createdAt).toBe(firstEdit?.createdAt);
    expect(secondEdit?.updatedAt).not.toBe(firstEdit?.updatedAt);
  });
});

describe("updateCreature — hpHistory", () => {
  function createBasicCreature(campaignId: string) {
    return db.createCreature({
      campaignId,
      category: "enemy",
      templateName: "Goblin",
      name: "Goblin",
      ac: 15,
      hp: 7,
      maxHp: 7,
      tempHp: 0,
      speed: 30,
      stats: BLANK_STATS,
      traits: [],
      conditions: [],
      exhaustion: 0,
    });
  }

  it("appends an hp entry when a PATCH changes hp, whether the caller sent a delta-resolved or absolute number", () => {
    const created = createBasicCreature("campaign-hp-history-1");
    const updated = db.updateCreature(created.id, { hp: 4 });
    expect(updated?.hpHistory).toEqual([
      expect.objectContaining({ field: "hp", previous: 7, next: 4, delta: -3 }),
    ]);
  });

  it("does not append an entry when hp is sent but unchanged, or not sent at all", () => {
    const created = createBasicCreature("campaign-hp-history-2");
    const sameValue = db.updateCreature(created.id, { hp: 7 });
    expect(sameValue?.hpHistory).toEqual([]);
    const unrelatedField = db.updateCreature(created.id, { concentrating: true });
    expect(unrelatedField?.hpHistory).toEqual([]);
  });

  it("appends both an hp and a tempHp entry when a single PATCH changes both at once", () => {
    const created = createBasicCreature("campaign-hp-history-3");
    const updated = db.updateCreature(created.id, { hp: 2, tempHp: 5 });
    expect(updated?.hpHistory).toEqual([
      expect.objectContaining({ field: "hp", previous: 7, next: 2, delta: -5 }),
      expect.objectContaining({ field: "tempHp", previous: 0, next: 5, delta: 5 }),
    ]);
    // Distinct ids even though both entries were stamped in the same call.
    expect(updated!.hpHistory![0].id).not.toBe(updated!.hpHistory![1].id);
  });

  it("keeps accumulating across repeated updates instead of overwriting the log", () => {
    const created = createBasicCreature("campaign-hp-history-4");
    db.updateCreature(created.id, { hp: 5 });
    db.updateCreature(created.id, { hp: 2 });
    const third = db.updateCreature(created.id, { hp: 6 });
    expect(third?.hpHistory).toHaveLength(3);
    expect(third?.hpHistory?.map((e) => [e.previous, e.next])).toEqual([
      [7, 5],
      [5, 2],
      [2, 6],
    ]);
  });

  it("a healing (positive) change and a damage (negative) change both record the correct sign of delta", () => {
    const created = createBasicCreature("campaign-hp-history-5");
    const damaged = db.updateCreature(created.id, { hp: 1 });
    expect(damaged?.hpHistory?.at(-1)?.delta).toBe(-6);
    const healed = db.updateCreature(created.id, { hp: 7 });
    expect(healed?.hpHistory?.at(-1)?.delta).toBe(6);
  });
});
