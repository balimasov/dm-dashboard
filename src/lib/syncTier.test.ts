import { describe, expect, it } from "vitest";
import { syncTier } from "./syncTier";

const NOW = new Date("2026-08-09T12:00:00.000Z").getTime();
const minutesAgo = (m: number) => new Date(NOW - m * 60 * 1000).toISOString();

describe("syncTier", () => {
  it("is fresh with no timestamp at all", () => {
    expect(syncTier(undefined, NOW)).toBe("fresh");
  });

  it("is fresh just after syncing", () => {
    expect(syncTier(minutesAgo(0), NOW)).toBe("fresh");
  });

  it("is fresh right up to the 1h boundary", () => {
    expect(syncTier(minutesAgo(59.9), NOW)).toBe("fresh");
  });

  it("is aging exactly at 1h", () => {
    expect(syncTier(minutesAgo(60), NOW)).toBe("aging");
  });

  it("is aging right up to the 24h boundary", () => {
    expect(syncTier(minutesAgo(24 * 60 - 0.1), NOW)).toBe("aging");
  });

  it("is stale exactly at 24h", () => {
    expect(syncTier(minutesAgo(24 * 60), NOW)).toBe("stale");
  });

  it("is stale well past 24h", () => {
    expect(syncTier(minutesAgo(24 * 60 * 5), NOW)).toBe("stale");
  });
});
