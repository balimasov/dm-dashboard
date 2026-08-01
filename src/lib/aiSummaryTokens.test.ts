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
});
