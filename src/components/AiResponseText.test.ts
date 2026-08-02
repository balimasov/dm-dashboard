import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { AiGlossary } from "@/lib/aiGlossary";
import { AiChatReply } from "./AiResponseText";

/**
 * Regression coverage for `scanTermLayers`/`plainTextTermLayers` — the
 * single generic engine that replaced four near-identical hand-copied
 * `renderXSegment` functions (one per vocabulary: universal conditions/
 * ability-scores/senses/exhaustion, this entity's own sheet terms, Weapon
 * Mastery property names, universal action names). Nothing in this file
 * had any test before, so this only asserts the one behavior that actually
 * matters here — a plain-text mention of a term from any of the four
 * vocabularies gets exactly one hint-tooltip trigger (rendered as an
 * `InfoTooltip` carrying `INLINE_HINT_ALIGN_CLS`, i.e. an `align-baseline`
 * class in the static HTML) — rather than re-testing each vocabulary's own
 * lookup table (`conditionInfo.ts`/`masteryInfo.ts`/... already do that).
 */
function renderReply(text: string, glossaryByName: AiGlossary = {}): string {
  return renderToStaticMarkup(createElement(AiChatReply, { text, glossaryByName }));
}

function hintCount(html: string): number {
  return (html.match(/align-baseline/g) || []).length;
}

describe("AiChatReply term-layer scan", () => {
  test("hints a universal condition term (case-insensitive)", () => {
    expect(hintCount(renderReply("Being Blinded is bad this turn."))).toBe(1);
  });

  test("hints a Weapon Mastery property name only when capitalized", () => {
    expect(hintCount(renderReply("Vex helps you land the next hit, but vex lowercase should not."))).toBe(1);
  });

  test("hints a universal action name only when capitalized", () => {
    expect(hintCount(renderReply("Use Dash to close the gap, don't dash randomly lowercase."))).toBe(1);
  });

  test("hints this entity's own sheet term via glossaryByName", () => {
    expect(hintCount(renderReply("Cast Fireball now.", { fireball: "hint-for-fireball" }))).toBe(1);
  });

  test("resolves all four vocabularies together in one paragraph", () => {
    const html = renderReply("Being Blinded, cast Fireball, then Vex with Dash.", { fireball: "hint" });
    expect(hintCount(html)).toBe(4);
  });

  test("never hints an ordinary English word that only coincidentally shares spelling with a mastery/action name", () => {
    expect(hintCount(renderReply("help me search the room, I need a push and a slow walk."))).toBe(0);
  });
});
