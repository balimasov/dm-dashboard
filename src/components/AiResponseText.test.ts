import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { AiGlossary } from "@/lib/aiGlossary";
import { AiTacticalResponse } from "@/lib/schemas";
import { AiChatReply, AiResponseText } from "./AiResponseText";

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
function renderReply(text: string, glossaryByName: AiGlossary = {}, flaggedNames?: Set<string>): string {
  return renderToStaticMarkup(createElement(AiChatReply, { text, glossaryByName, flaggedNames }));
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

function makeResponse(optionName: string, summary = "Do the thing."): AiTacticalResponse {
  return {
    game_plan: { summary },
    options: [
      {
        category: "action",
        source_id: null,
        name: optionName,
        kind: "universal",
        priority: "best",
        status: "available",
        description: "Does the thing.",
        conditions: [],
      },
    ],
  };
}

function renderPlan(optionName: string, flaggedNames?: Set<string>, summary?: string): string {
  return renderToStaticMarkup(createElement(AiResponseText, { response: makeResponse(optionName, summary), flaggedNames }));
}

describe("AiResponseText — flagged-ability flame prefix", () => {
  test("prefixes an option's name with 🔥 when it matches an entry in flaggedNames, done app-side rather than left for the model to know about", () => {
    const html = renderPlan("Reckless Attack", new Set(["Reckless Attack"]));
    expect(html).toContain("🔥Reckless Attack");
  });

  test("leaves an unflagged option's name alone", () => {
    const html = renderPlan("Reckless Attack", new Set(["Some Other Ability"]));
    expect(html).not.toContain("🔥");
    expect(html).toContain("Reckless Attack");
  });

  test("defaults to no flame prefix at all when flaggedNames is omitted", () => {
    const html = renderPlan("Reckless Attack");
    expect(html).not.toContain("🔥");
  });

  test("also flame-prefixes a flagged name mentioned in the game plan summary, not just in a matching option's own name", () => {
    const html = renderPlan("Dash", new Set(["Reckless Attack"]), "Open with Reckless Attack for the extra damage.");
    expect(html).toContain("🔥Reckless Attack");
  });
});

describe("AiChatReply — flagged-ability flame prefix", () => {
  test("flame-prefixes a flagged name mentioned in an ordinary chat reply", () => {
    const html = renderReply("You should use Reckless Attack this turn.", {}, new Set(["Reckless Attack"]));
    expect(html).toContain("🔥Reckless Attack");
  });

  test("leaves the reply alone when no name matches", () => {
    const html = renderReply("You should use Reckless Attack this turn.", {}, new Set(["Something Else"]));
    expect(html).not.toContain("🔥");
  });
});
