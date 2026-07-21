import { describe, expect, it } from "vitest";
import { dateKeyForTimeZone, formatSessionTitle, htmlToMarkdown, plainTextToParagraphHtml } from "./journal";

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

describe("htmlToMarkdown", () => {
  it("converts a plain paragraph as-is", () => {
    expect(htmlToMarkdown("<p>Hello world</p>")).toBe("Hello world");
  });

  it("joins multiple paragraphs with a blank line", () => {
    expect(htmlToMarkdown("<p>First</p><p>Second</p>")).toBe("First\n\nSecond");
  });

  it("converts headings 1-6 to '#' runs", () => {
    expect(htmlToMarkdown("<h1>Title</h1>")).toBe("# Title");
    expect(htmlToMarkdown("<h3>Subheading</h3>")).toBe("### Subheading");
  });

  it("converts bold and italic, including nested/overlapping marks", () => {
    expect(htmlToMarkdown("<p><strong>bold</strong> and <em>italic</em></p>")).toBe("**bold** and *italic*");
    expect(htmlToMarkdown("<p><strong><em>both</em></strong></p>")).toBe("***both***");
  });

  it("converts a link to Markdown syntax", () => {
    expect(htmlToMarkdown('<p>See <a href="https://example.com">here</a>.</p>')).toBe("See [here](https://example.com).");
  });

  it("converts a bullet list", () => {
    expect(htmlToMarkdown("<ul><li><p>One</p></li><li><p>Two</p></li></ul>")).toBe("- One\n- Two");
  });

  it("converts an ordered list with real numbering", () => {
    expect(htmlToMarkdown("<ol><li><p>First</p></li><li><p>Second</p></li></ol>")).toBe("1. First\n2. Second");
  });

  it("indents a nested list under its parent item", () => {
    const html = "<ul><li><p>Outer</p><ul><li><p>Inner</p></li></ul></li></ul>";
    expect(htmlToMarkdown(html)).toBe("- Outer\n  - Inner");
  });

  it("converts a blockquote by prefixing every line with '>'", () => {
    expect(htmlToMarkdown("<blockquote><p>Wise words</p></blockquote>")).toBe("> Wise words");
  });

  it("drops empty paragraphs instead of leaving stray blank lines — Tiptap's document model freely allows them (double Enter, trailing paragraph)", () => {
    expect(htmlToMarkdown("<h2>Title</h2><p></p><p>Body</p><p></p>")).toBe("## Title\n\nBody");
  });

  it("decodes HTML entities in text content", () => {
    expect(htmlToMarkdown("<p>Tom &amp; Jerry &lt;3</p>")).toBe("Tom & Jerry <3");
  });

  it("round-trips a realistic multi-block entry", () => {
    const html =
      "<h2>Session recap</h2><p>The party reached <strong>Nightstone</strong> under a <em>blood-red</em> moon.</p><ul><li><p>Met the innkeeper</p></li><li><p>Found a <a href=\"https://example.com/map\">map</a></p></li></ul>";
    expect(htmlToMarkdown(html)).toBe(
      "## Session recap\n\nThe party reached **Nightstone** under a *blood-red* moon.\n\n- Met the innkeeper\n- Found a [map](https://example.com/map)"
    );
  });
});
