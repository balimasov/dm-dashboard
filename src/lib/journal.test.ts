import { describe, expect, it } from "vitest";
import { dateKeyForTimeZone, formatSessionTitle, plainTextToParagraphHtml } from "./journal";

describe("dateKeyForTimeZone", () => {
  it("returns YYYY-MM-DD for UTC", () => {
    expect(dateKeyForTimeZone("UTC", new Date("2026-07-20T12:00:00Z"))).toBe("2026-07-20");
  });

  it("uses the DM's local day, not UTC's, when they differ", () => {
    // 2026-07-20 23:30 UTC is still 2026-07-20 in New York (UTC-4 in July),
    // but already 2026-07-21 in a UTC+something zone — confirms this reads
    // the given IANA zone's wall-clock day, not the instant's UTC day.
    const instant = new Date("2026-07-20T23:30:00Z");
    expect(dateKeyForTimeZone("America/New_York", instant)).toBe("2026-07-20");
    expect(dateKeyForTimeZone("Pacific/Auckland", instant)).toBe("2026-07-21");
  });

  it("a session that runs past midnight UTC stays 'yesterday' in a western timezone", () => {
    // The exact scenario dateKey exists for: a game running late into the
    // night for the DM shouldn't split into two date-sessions just because
    // UTC's own calendar day rolled over first.
    const justAfterUtcMidnight = new Date("2026-07-21T02:00:00Z");
    expect(dateKeyForTimeZone("America/Los_Angeles", justAfterUtcMidnight)).toBe("2026-07-20");
  });
});

describe("formatSessionTitle", () => {
  it("formats a date key as a full readable date", () => {
    expect(formatSessionTitle("2026-07-20")).toBe("July 20, 2026");
  });
});

describe("plainTextToParagraphHtml", () => {
  it("wraps a single line in a paragraph", () => {
    expect(plainTextToParagraphHtml("Hello world")).toBe("<p>Hello world</p>");
  });

  it("turns each Shift+Enter-separated line into its own paragraph", () => {
    expect(plainTextToParagraphHtml("First line\nSecond line")).toBe("<p>First line</p><p>Second line</p>");
  });

  it("drops blank lines", () => {
    expect(plainTextToParagraphHtml("First\n\n\nSecond")).toBe("<p>First</p><p>Second</p>");
  });

  it("escapes reserved HTML characters", () => {
    expect(plainTextToParagraphHtml("<script>alert('hi')</script> & co")).toBe(
      "<p>&lt;script&gt;alert('hi')&lt;/script&gt; &amp; co</p>"
    );
  });
});
