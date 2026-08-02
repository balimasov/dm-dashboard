import { describe, expect, test } from "vitest";
import { AI_OPTION_JSON_SCHEMA, AI_REPLY_JSON_SCHEMA, AI_TACTICAL_RESPONSE_JSON_SCHEMA } from "./aiOptionContract";
import { aiOptionSchema, aiReplySchema, aiTacticalResponseSchema } from "./schemas";

/**
 * `route.ts` sends `AI_TACTICAL_RESPONSE_JSON_SCHEMA` to OpenAI; `schemas.ts`
 * re-validates the model's response with the zod schemas below — both build
 * off the same enum/limit constants in `aiOptionContract.ts` now, but the
 * *field names* themselves are still two separate hand-typed lists (a JSON
 * Schema's `properties`/`required` vs a zod object's `.shape` keys), since
 * nothing forces those to be generated from one another. This is the
 * regression check for that: if a field gets added/renamed/removed on one
 * side and not the other, one of these fails instead of silently drifting.
 */
describe("AI option/response JSON Schema stays in sync with its zod counterpart", () => {
  test("aiOptionSchema's fields exactly match AI_OPTION_JSON_SCHEMA's properties and required list", () => {
    const zodKeys = Object.keys(aiOptionSchema.shape).sort();
    const jsonPropertyKeys = Object.keys(AI_OPTION_JSON_SCHEMA.properties).sort();
    const jsonRequiredKeys = [...AI_OPTION_JSON_SCHEMA.required].sort();

    expect(jsonPropertyKeys).toEqual(zodKeys);
    expect(jsonRequiredKeys).toEqual(zodKeys);
  });

  test("aiTacticalResponseSchema's top-level fields exactly match AI_TACTICAL_RESPONSE_JSON_SCHEMA's", () => {
    const zodKeys = Object.keys(aiTacticalResponseSchema.shape).sort();
    const jsonPropertyKeys = Object.keys(AI_TACTICAL_RESPONSE_JSON_SCHEMA.properties).sort();
    const jsonRequiredKeys = [...AI_TACTICAL_RESPONSE_JSON_SCHEMA.required].sort();

    expect(jsonPropertyKeys).toEqual(zodKeys);
    expect(jsonRequiredKeys).toEqual(zodKeys);
  });

  test("game_plan's own field (summary) matches between the two schemas", () => {
    const zodKeys = Object.keys(aiTacticalResponseSchema.shape.game_plan.shape).sort();
    const jsonPropertyKeys = Object.keys(AI_TACTICAL_RESPONSE_JSON_SCHEMA.properties.game_plan.properties).sort();
    const jsonRequiredKeys = [...AI_TACTICAL_RESPONSE_JSON_SCHEMA.properties.game_plan.required].sort();

    expect(jsonPropertyKeys).toEqual(zodKeys);
    expect(jsonRequiredKeys).toEqual(zodKeys);
  });

  test("aiReplySchema's fields exactly match AI_REPLY_JSON_SCHEMA's properties and required list", () => {
    const zodKeys = Object.keys(aiReplySchema.shape).sort();
    const jsonPropertyKeys = Object.keys(AI_REPLY_JSON_SCHEMA.properties).sort();
    const jsonRequiredKeys = [...AI_REPLY_JSON_SCHEMA.required].sort();

    expect(jsonPropertyKeys).toEqual(zodKeys);
    expect(jsonRequiredKeys).toEqual(zodKeys);
  });
});
