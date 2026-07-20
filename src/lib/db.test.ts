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

  it("reuses the same session across repeated calls for the same campaign", () => {
    const first = db.resolveOrCreateSessionForDate("campaign-resolve-2", "2026-01-01");
    const second = db.resolveOrCreateSessionForDate("campaign-resolve-2", "2026-01-01");
    expect(second.id).toBe(first.id);
  });

  it("ignores an archived session even if it's the most recently created one", async () => {
    const campaignId = "campaign-resolve-3";
    const active = db.resolveOrCreateSessionForDate(campaignId, "2026-01-01");
    await tick();
    const archivedLater = db.createJournalSession(campaignId, "2026-01-02");
    db.updateJournalSession(archivedLater.id, { archived: true });

    const resolved = db.resolveOrCreateSessionForDate(campaignId, "2026-01-03");
    expect(resolved.id).toBe(active.id);
  });

  it("creates a new session when every existing one is archived", async () => {
    const campaignId = "campaign-resolve-4";
    const original = db.resolveOrCreateSessionForDate(campaignId, "2026-01-01");
    db.updateJournalSession(original.id, { archived: true });
    await tick();

    const resolved = db.resolveOrCreateSessionForDate(campaignId, "2026-01-02");
    expect(resolved.id).not.toBe(original.id);
    expect(resolved.archived).toBeFalsy();
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
    const updated = db.updateJournalEntryText(entry.id, "<p>edited</p>", "player");
    expect(updated?.updatedByRole).toBe("player");
  });
});
