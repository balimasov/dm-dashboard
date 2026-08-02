import { describe, expect, test } from "vitest";
import { assistantSuggestSchema } from "@/lib/schemas";
import { QUICK_QUESTIONS } from "./AiAssistantModal";

/**
 * Regression guard for the exact bug that shipped in v1.87.0: a chip's
 * `query` is sent as `situation` (see `submit("ask", q)` in
 * `AiAssistantModal.tsx`), bypassing the input textarea's own 500-char
 * `maxLength` entirely — so a long, carefully-worded chip query can pass
 * every local check and still fail server-side schema validation with a
 * generic "Invalid request body." the first time someone actually clicks
 * it. This test would have caught the improvised-actions chip (876 chars)
 * before it shipped.
 */
describe("QUICK_QUESTIONS", () => {
  test("every chip's query fits within assistantSuggestSchema's situation limit", () => {
    for (const q of QUICK_QUESTIONS) {
      const result = assistantSuggestSchema.safeParse({
        campaignId: "campaign-1",
        characterId: "char-1",
        intent: "ask",
        situation: q.query,
      });
      expect(result.success, `"${q.label}" query is ${q.query.length} chars: ${JSON.stringify(!result.success && result.error.issues)}`).toBe(
        true
      );
    }
  });
});
