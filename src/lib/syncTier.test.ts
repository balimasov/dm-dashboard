import { describe, expect, it } from "vitest";
import { syncTier } from "./syncTier";

const NOW = new Date("2026-08-09T12:00:00.000Z").getTime();
const hoursAgo = (h: number) => new Date(NOW - h * 60 * 60 * 1000).toISOString();

describe("syncTier", () => {
  it("is fresh with no timestamp at all", () => {
    expect(syncTier(undefined, NOW)).toBe("fresh");
  });

  it("is fresh just after syncing", () => {
    expect(syncTier(hoursAgo(0), NOW)).toBe("fresh");
  });

  it("is fresh right up to the 24h boundary", () => {
    expect(syncTier(hoursAgo(23.9), NOW)).toBe("fresh");
  });

  it("is aging exactly at 24h", () => {
    expect(syncTier(hoursAgo(24), NOW)).toBe("aging");
  });

  it("is aging right up to the 3-day boundary", () => {
    expect(syncTier(hoursAgo(71.9), NOW)).toBe("aging");
  });

  it("is stale exactly at 3 days", () => {
    expect(syncTier(hoursAgo(72), NOW)).toBe("stale");
  });

  it("is stale well past 3 days", () => {
    expect(syncTier(hoursAgo(24 * 14), NOW)).toBe("stale");
  });
});
