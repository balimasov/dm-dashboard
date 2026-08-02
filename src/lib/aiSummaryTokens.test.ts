import { describe, expect, test } from "vitest";
import { parseSummaryTokens } from "./aiSummaryTokens";

describe("parseSummaryTokens", () => {
  test("returns a single text token when there are no ability references", () => {
    expect(parseSummaryTokens("Just plain prose.")).toEqual([{ type: "text", text: "Just plain prose." }]);
  });

  test("parses a token in the middle of the text into text/ability/text", () => {
    const tokens = parseSummaryTokens("Cast [[ability:spell_fireball|Fireball]] now.");
    expect(tokens).toEqual([
      { type: "text", text: "Cast " },
      { type: "ability", sourceId: "spell_fireball", displayName: "Fireball" },
      { type: "text", text: " now." },
    ]);
  });

  test("parses a token at the very start with no leading text token", () => {
    const tokens = parseSummaryTokens("[[ability:spell_bless|Bless]] first, then attack.");
    expect(tokens).toEqual([
      { type: "ability", sourceId: "spell_bless", displayName: "Bless" },
      { type: "text", text: " first, then attack." },
    ]);
  });

  test("parses a token at the very end with no trailing text token", () => {
    const tokens = parseSummaryTokens("The best option is [[ability:trait-2|Multiattack]]");
    expect(tokens).toEqual([
      { type: "text", text: "The best option is " },
      { type: "ability", sourceId: "trait-2", displayName: "Multiattack" },
    ]);
  });

  test("parses multiple tokens in one string", () => {
    const tokens = parseSummaryTokens("Open with [[ability:spell_bless|Bless]], then [[ability:spell_fireball|Fireball]].");
    expect(tokens).toEqual([
      { type: "text", text: "Open with " },
      { type: "ability", sourceId: "spell_bless", displayName: "Bless" },
      { type: "text", text: ", then " },
      { type: "ability", sourceId: "spell_fireball", displayName: "Fireball" },
      { type: "text", text: "." },
    ]);
  });

  test("returns an empty array for an empty string", () => {
    expect(parseSummaryTokens("")).toEqual([]);
  });

  test("drops a stray shorthand token (no ability: prefix, no display name) instead of leaking it as text", () => {
    const tokens = parseSummaryTokens("через [[feature-0]] Blinded і [[feature-0]] Exhaustion ти просідаєш.");
    expect(tokens).toEqual([
      { type: "text", text: "через " },
      { type: "text", text: "Blinded і " },
      { type: "text", text: "Exhaustion ти просідаєш." },
    ]);
  });

  test("drops a stray shorthand token at the very start", () => {
    const tokens = parseSummaryTokens("[[spell-7]] Faerie Fire допомагає влучати.");
    expect(tokens).toEqual([{ type: "text", text: "Faerie Fire допомагає влучати." }]);
  });

  test("still parses a well-formed token when a stray shorthand one appears alongside it", () => {
    const tokens = parseSummaryTokens("Спробуй [[feature-0]] Blinded, а потім [[ability:spell-3|Command]].");
    expect(tokens).toEqual([
      { type: "text", text: "Спробуй " },
      { type: "text", text: "Blinded, а потім " },
      { type: "ability", sourceId: "spell-3", displayName: "Command" },
      { type: "text", text: "." },
    ]);
  });
});
